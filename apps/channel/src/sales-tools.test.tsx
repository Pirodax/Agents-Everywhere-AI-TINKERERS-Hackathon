/**
 * The coherence card, rendered and clicked through the real managed adapter.
 *
 * The gateway harness is inherited from the starter kit; what is exercised is
 * ours: a card built from tool data, and a decision that stays with the human.
 * The model is injected, so this runs with no API key and no network.
 */
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { createChannel } from "@copilotkit/channels";
import { startChannelsWithGatewayControl } from "@copilotkit/channels-intelligence";
import { z } from "zod";
import type { StructuredCaller } from "agent-core/sales";
import {
  ManagedGateway,
  preparedDelivery,
  concreteThread,
} from "./testing/managed-gateway";
import { createCheckProposalTool } from "./sales-tools";

const PROPOSAL = {
  client: "Acme",
  action: "Offer 15% off if they sign before the end of the month",
  detail: "15% discount, signature by 2026-09-30",
};

/** One fake model for all four agents, keyed by the schema each one asks for. */
const fakeModel: StructuredCaller = async (request) => {
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
    confidence: 0.85,
    headline: "This contradicts a commitment already made by email.",
    profileSummary: ["Enterprise renewal, 12% standing discount, MFN clause"],
    findings: [
      {
        severity: "blocker",
        statement: "We already told Acme there would be no further discount",
        why: "Dana put it in writing on 2026-08-21, in exchange for onboarding sessions",
        sourceIds: ["email:thread:8821"],
      },
    ],
    counterProposal: "Hold at 12% and re-offer the two onboarding sessions.",
  };
};

interface Buttons {
  text: { text: string };
  action_id: string;
}

function actionButtons(card: unknown): Buttons[] {
  const parsed = z
    .object({ blocks: z.array(z.object({ type: z.string(), elements: z.array(z.unknown()).optional() })) })
    .parse(card);
  return parsed.blocks
    .flatMap((block) => (block.type === "actions" ? (block.elements ?? []) : []))
    .flatMap((element) => {
      const button = z
        .object({
          type: z.literal("button"),
          text: z.object({ text: z.string() }),
          action_id: z.string().optional(),
          url: z.string().optional(),
        })
        .safeParse(element);
      // Citation buttons open a URL; only the decision buttons dispatch a click.
      return button.success && button.data.action_id && !button.data.url
        ? [{ text: button.data.text, action_id: button.data.action_id }]
        : [];
    });
}

async function postCard(args: typeof PROPOSAL, model: StructuredCaller = fakeModel) {
  const gateway = new ManagedGateway();
  const channel = createChannel({ name: "deals", identifyUser: "platform" });
  const tool = createCheckProposalTool({ call: model });
  let toolResult: unknown;
  channel.onMessage(async ({ thread }) => {
    toolResult = await tool.handler(args, {
      thread: concreteThread(thread),
      user: { id: "u1", name: "Dana" },
      actor: { id: "a1", kind: "human" },
      platform: "slack",
    } as never);
  });
  const runCanonical = mock.fn();
  const handle = await startChannelsWithGatewayControl([channel], {
    session: gateway,
    scope: { projectId: 1, channelName: "deals" },
    runtimeInstanceId: "rti_deals",
    runCanonical: async (canonical) => {
      runCanonical();
      return canonical.execute({});
    },
    loadHistory: async () => [],
  });
  const delivery = preparedDelivery("proposal", "slack", {
    kind: "text",
    text: "I'll offer Acme 15% if they sign before month end",
  });
  await gateway.deliver(delivery);
  return { gateway, handle, delivery, toolResult, runCanonical };
}

describe("check_proposal", () => {
  it("posts a card carrying the verdict, the quote and the source link", async () => {
    const { gateway, handle, toolResult } = await postCard(PROPOSAL);
    try {
      const card = gateway.packets
        .map(({ payload }) => payload)
        .find((payload) => payload.kind === "slack.message.create");
      assert.ok(card, "the tool must post the card itself");
      const json = JSON.stringify(card);
      assert.match(json, /CONFLICT/);
      assert.match(json, /Acme Industries/);
      assert.match(json, /no further discount this fiscal year/);
      assert.match(json, /mail.internal.example\/threads\/8821/);
      assert.match(json, /Hold at 12%/);
      assert.match(json, /Sample CRM, mailbox and docs data/);

      // What the model reads back must not invite it to say all of that again.
      assert.match(String(toolResult), /Coherence card posted for Acme Industries/);
      assert.match(String(toolResult), /Do not restate the findings/);
    } finally {
      await handle.stop();
    }
  });

  it("says which source was missing instead of quietly checking two of three", async () => {
    process.env.MOCK_UNAVAILABLE_SOURCES = "crm";
    try {
      const { gateway, handle, toolResult } = await postCard(PROPOSAL);
      try {
        const card = gateway.packets
          .map(({ payload }) => payload)
          .find((payload) => payload.kind === "slack.message.create");
        const json = JSON.stringify(card);
        assert.match(json, /Degraded check/);
        assert.match(json, /CRM/);
        assert.match(json, /Confidence is reduced/);
        assert.match(String(toolResult), /degraded/i);
      } finally {
        await handle.stop();
      }
    } finally {
      delete process.env.MOCK_UNAVAILABLE_SOURCES;
    }
  });

  it("refuses to check an account it cannot resolve, and never posts a verdict", async () => {
    let modelCalls = 0;
    const { gateway, handle, toolResult } = await postCard(
      { ...PROPOSAL, client: "Globex" },
      async (request) => {
        modelCalls += 1;
        return fakeModel(request);
      },
    );
    try {
      const card = gateway.packets
        .map(({ payload }) => payload)
        .find((payload) => payload.kind === "slack.message.create");
      assert.match(JSON.stringify(card), /No client matched that name/);
      assert.ok(!JSON.stringify(card).includes("CONFLICT"));
      assert.equal(modelCalls, 0, "an unresolved client must not reach the model");
      assert.match(String(toolResult), /do not guess/i);
    } finally {
      await handle.stop();
    }
  });

  for (const choice of ["Use the counter-proposal", "Dismiss this flag"]) {
    it(`records "${choice}" once, and only the human's first decision`, { timeout: 10_000 }, async () => {
      const { gateway, handle, delivery, runCanonical } = await postCard(PROPOSAL);
      try {
        const card = gateway.packets
          .map(({ payload }) => payload)
          .find((payload) => payload.kind === "slack.message.create");
        const buttons = actionButtons(card);
        assert.deepEqual(
          buttons.map((button) => button.text.text),
          ["Use the counter-proposal", "Dismiss this flag"],
        );
        const chosen = buttons.find((button) => button.text.text === choice)!;
        const opposite = buttons.find((button) => button.text.text !== choice)!;

        for (const [index, actionId] of [chosen.action_id, chosen.action_id, opposite.action_id].entries()) {
          const click = preparedDelivery(`click_${index}`, "slack", {
            kind: "interaction",
            actionId,
            messageRef: { id: "pref_v1_deals_message_1" },
          });
          await gateway.deliver({
            ...delivery,
            deliveryId: click.deliveryId,
            turn: click.turn,
          });
        }

        const updates = gateway.packets
          .map(({ payload }) => payload)
          .filter((payload) => payload.kind === "slack.message.replace");
        assert.equal(updates.length, 1, "a duplicate or opposite click must not overwrite a decision");
        const json = JSON.stringify(updates[0]);
        assert.match(json, /Decision recorded/);
        assert.match(json, /nothing was sent to Acme Industries/);
        // The name on the decision is whoever clicked, not whoever proposed.
        assert.match(
          json,
          choice === "Use the counter-proposal"
            ? /Counter-proposal adopted by \w+/
            : /Flag dismissed by \w+/,
        );
        assert.equal(
          runCanonical.mock.callCount(),
          0,
          "recording a decision must not resume the agent or execute anything",
        );
      } finally {
        await handle.stop();
      }
    });
  }
});
