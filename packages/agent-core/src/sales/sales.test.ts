/**
 * Tests for the coherence check.
 *
 * Every model call is injected, so this suite runs with no API key, no network
 * and no Slack. What is asserted here is the part that must hold even when the
 * model is having a bad day: a citation that does not resolve never reaches the
 * card, a blocker cannot be filed under "aligned", and a missing source lowers
 * the confidence instead of being quietly ignored.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkProposal } from "./check-proposal";
import { getClientContext, resolveClient } from "./sources";
import { runSourceAgent } from "./agents/source-agent";
import { coverageFactor, synthesizeVerdict } from "./agents/synthesis";
import type { StructuredCaller } from "./agents/llm";
import type { ClientContext, Proposal, SourceAgentResult } from "./schemas";

const PROPOSAL: Proposal = {
  client: "Acme",
  action: "Offer 15% off if they sign before the end of the month",
  detail: "15% discount, signature by 2026-09-30",
};

/** Runs one env override and always puts the variable back. */
async function withEnv(value: string | undefined, body: () => Promise<void>) {
  const previous = process.env.MOCK_UNAVAILABLE_SOURCES;
  if (value === undefined) delete process.env.MOCK_UNAVAILABLE_SOURCES;
  else process.env.MOCK_UNAVAILABLE_SOURCES = value;
  try {
    await body();
  } finally {
    if (previous === undefined) delete process.env.MOCK_UNAVAILABLE_SOURCES;
    else process.env.MOCK_UNAVAILABLE_SOURCES = previous;
  }
}

describe("client resolution", () => {
  it("matches the way a rep actually types a client name", () => {
    assert.equal(resolveClient("acme").client?.id, "acme");
    assert.equal(resolveClient("Acme Industries").client?.id, "acme");
    assert.equal(resolveClient("what about the acme renewal?").client?.id, "acme");
    assert.equal(resolveClient("northwind").client?.id, "northwind");
  });

  it("refuses to guess, because a check against the wrong account is worse than none", () => {
    const unknown = resolveClient("Globex");
    assert.equal(unknown.status, "unknown");
    assert.ok(unknown.candidates.includes("Acme Industries"));
  });
});

describe("getClientContext", () => {
  it("returns all three sources for a known client", async () => {
    const result = await getClientContext("acme");
    assert.equal(result.status, "ok");
    assert.ok(result.status === "ok");
    assert.deepEqual(
      result.context.reports.map((report) => report.source),
      ["crm", "email", "docs"],
    );
    assert.ok(result.context.reports.every((report) => report.status === "ok"));
    assert.ok(result.context.reports[0]!.records.length > 0);
  });

  it("degrades one dead source instead of failing the whole lookup", async () => {
    await withEnv("crm", async () => {
      const result = await getClientContext("acme");
      assert.ok(result.status === "ok");
      const crm = result.context.reports.find((report) => report.source === "crm")!;
      assert.equal(crm.status, "unavailable");
      assert.match(String(crm.error), /unreachable/i);
      const email = result.context.reports.find((report) => report.source === "email")!;
      assert.equal(email.status, "ok");
    });
  });
});

describe("source agent", () => {
  const context = async (): Promise<ClientContext> => {
    const loaded = await getClientContext("acme");
    assert.ok(loaded.status === "ok");
    return loaded.context;
  };

  it("drops a signal whose citation does not resolve to a real record", async () => {
    const ctx = await context();
    const crm = ctx.reports.find((report) => report.source === "crm")!;
    const call: StructuredCaller = async () => ({
      signals: [
        {
          claim: "Standing discount is already 12%",
          stance: "contradicts",
          severity: "warning",
          relevance: 0.9,
          sourceId: "crm:account:ACME",
          quote: "Standing negotiated discount: 12% off list",
        },
        {
          claim: "Invented record",
          stance: "contradicts",
          severity: "blocker",
          relevance: 1,
          sourceId: "crm:account:DOES-NOT-EXIST",
          quote: "made up",
        },
      ],
    });
    const result = await runSourceAgent(
      { clientName: "Acme Industries", proposal: PROPOSAL, report: crm },
      { call },
    );
    assert.equal(result.signals.length, 1);
    assert.equal(result.signals[0]!.sourceId, "crm:account:ACME");
    assert.match(String(result.note), /dropped/);
  });

  it("does not call the model at all when its source is down", async () => {
    await withEnv("email", async () => {
      const ctx = await context();
      const email = ctx.reports.find((report) => report.source === "email")!;
      let called = 0;
      const result = await runSourceAgent(
        { clientName: "Acme Industries", proposal: PROPOSAL, report: email },
        {
          call: async () => {
            called += 1;
            return { signals: [] };
          },
        },
      );
      assert.equal(called, 0);
      assert.equal(result.status, "unavailable");
      assert.equal(result.signals.length, 0);
    });
  });

  it("reports a model failure as a source note rather than throwing", async () => {
    const ctx = await context();
    const docs = ctx.reports.find((report) => report.source === "docs")!;
    const result = await runSourceAgent(
      { clientName: "Acme Industries", proposal: PROPOSAL, report: docs },
      {
        call: async () => {
          throw new Error("HTTP 429 rate limited");
        },
      },
    );
    assert.equal(result.status, "error");
    assert.match(String(result.note), /429/);
  });
});

describe("synthesis", () => {
  const baseSignals: SourceAgentResult[] = [
    {
      source: "crm",
      status: "ok",
      signals: [
        {
          claim: "Acme already has a 12% standing discount with an MFN clause",
          stance: "contradicts",
          severity: "warning",
          relevance: 0.8,
          sourceId: "crm:account:ACME",
          quote: "Standing negotiated discount: 12% off list",
        },
      ],
    },
    {
      source: "email",
      status: "ok",
      signals: [
        {
          claim: "We committed in writing to no further discount this fiscal year",
          stance: "contradicts",
          severity: "blocker",
          relevance: 0.95,
          sourceId: "email:thread:8821",
          quote: "there will be no further discount this fiscal year",
        },
      ],
    },
    { source: "docs", status: "ok", signals: [] },
  ];

  const loadContext = async (): Promise<ClientContext> => {
    const loaded = await getClientContext("acme");
    assert.ok(loaded.status === "ok");
    return loaded.context;
  };

  it("will not file a blocker under 'aligned', whatever the model says", async () => {
    const context = await loadContext();
    const call: StructuredCaller = async () => ({
      status: "aligned",
      confidence: 0.9,
      headline: "Looks fine to me",
      profileSummary: ["Enterprise renewal in progress"],
      findings: [
        {
          severity: "blocker",
          statement: "We already promised no further discount",
          why: "Dana confirmed it in writing on 2026-08-21",
          sourceIds: ["email:thread:8821"],
        },
      ],
      counterProposal: "Re-offer the onboarding sessions instead of a discount.",
    });
    const report = await synthesizeVerdict(
      { context, proposal: PROPOSAL, results: baseSignals },
      { call },
    );
    assert.equal(report.verdict.status, "conflict");
    assert.equal(report.citations.length, 1);
    assert.equal(report.citations[0]!.source, "email");
    assert.match(report.citations[0]!.quote, /no further discount/);
  });

  it("drops a finding that cites nothing we can show the reader", async () => {
    const context = await loadContext();
    const call: StructuredCaller = async () => ({
      status: "conflict",
      confidence: 0.8,
      headline: "Trust me",
      profileSummary: [],
      findings: [
        {
          severity: "warning",
          statement: "Something I heard somewhere",
          why: "no source",
          sourceIds: ["email:thread:doesnotexist"],
        },
      ],
      counterProposal: "",
    });
    const report = await synthesizeVerdict(
      { context, proposal: PROPOSAL, results: baseSignals },
      { call },
    );
    assert.equal(report.verdict.findings.length, 0);
    assert.equal(report.citations.length, 0);
    // With nothing left to show, "conflict" is not a claim we can stand behind.
    assert.equal(report.verdict.status, "needs_check");
  });

  it("lowers confidence when a source could not be read, and says which", async () => {
    const context = await loadContext();
    const degradedSignals: SourceAgentResult[] = [
      baseSignals[0]!,
      { source: "email", status: "unavailable", signals: [], note: "Mailbox connector is unreachable" },
      baseSignals[2]!,
    ];
    const call: StructuredCaller = async () => ({
      status: "needs_check",
      confidence: 1,
      headline: "Partial picture",
      profileSummary: [],
      findings: [
        {
          severity: "warning",
          statement: "A standing discount already applies",
          why: "The account carries an MFN clause",
          sourceIds: ["crm:account:ACME"],
        },
      ],
      counterProposal: "Confirm the email history before quoting a number.",
    });
    const report = await synthesizeVerdict(
      { context, proposal: PROPOSAL, results: degradedSignals },
      { call },
    );
    assert.equal(report.degraded, true);
    assert.ok(report.verdict.confidence < 1, "a two-source check cannot score full confidence");
    assert.equal(report.verdict.confidence, Number(coverageFactor(degradedSignals).toFixed(2)));
    const missing = report.coverage.find((entry) => entry.source === "email")!;
    assert.equal(missing.status, "unavailable");
    assert.match(String(missing.note), /unreachable/);
  });

  it("returns an honest non-answer when every source is down", async () => {
    const context = await loadContext();
    let called = 0;
    const report = await synthesizeVerdict(
      {
        context,
        proposal: PROPOSAL,
        results: [
          { source: "crm", status: "unavailable", signals: [] },
          { source: "email", status: "unavailable", signals: [] },
          { source: "docs", status: "unavailable", signals: [] },
        ],
      },
      {
        call: async () => {
          called += 1;
          return {};
        },
      },
    );
    assert.equal(called, 0, "no sources means nothing to synthesize");
    assert.equal(report.verdict.confidence, 0);
    assert.match(report.verdict.headline, /not checked/i);
  });
});

describe("checkProposal end to end", () => {
  /** One fake model standing in for all four agents. */
  const call: StructuredCaller = async (request) => {
    if (request.schemaName === "email_signals") {
      return {
        signals: [
          {
            claim: "No further discount was promised in writing",
            stance: "contradicts",
            severity: "blocker",
            relevance: 0.95,
            sourceId: "email:thread:8821",
            quote: "there will be no further discount this fiscal year",
          },
        ],
      };
    }
    if (request.schemaName.endsWith("_signals")) return { signals: [] };
    return {
      status: "conflict",
      confidence: 0.8,
      headline: "This contradicts a commitment already made by email.",
      profileSummary: ["Enterprise renewal, 12% standing discount, MFN clause"],
      findings: [
        {
          severity: "blocker",
          statement: "We already told Acme there would be no further discount",
          why: "Dana put it in writing on 2026-08-21 in exchange for onboarding sessions",
          sourceIds: ["email:thread:8821"],
        },
      ],
      counterProposal: "Hold at 12% and re-offer the two onboarding sessions.",
    };
  };

  it("produces a cited verdict for a known client", async () => {
    const result = await checkProposal(PROPOSAL, { call });
    assert.ok(result.status === "ok");
    assert.equal(result.report.clientName, "Acme Industries");
    assert.equal(result.report.verdict.status, "conflict");
    assert.equal(result.report.citations.length, 1);
    assert.equal(result.report.citations[0]!.url, "https://mail.internal.example/threads/8821");
    assert.equal(result.report.degraded, false);
  });

  it("refuses to check an account it cannot resolve", async () => {
    const result = await checkProposal({ ...PROPOSAL, client: "Globex" }, { call });
    assert.equal(result.status, "unknown_client");
    assert.ok(result.status === "unknown_client" && result.candidates.length > 0);
  });
});
