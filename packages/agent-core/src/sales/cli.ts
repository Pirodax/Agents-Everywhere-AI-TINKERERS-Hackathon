/**
 * The coherence check without Slack.
 *
 *   npm run coherence -- acme "Offer 15% off if they sign before month end"
 *
 * Same code path the Slack tool runs, printed to a terminal. It exists because
 * the multi-agent chain and the Slack connection fail for completely different
 * reasons, and debugging them together is how an afternoon disappears. It is
 * also the fastest way to see which specialist produced which signal.
 */
import { checkProposal } from "./check-proposal";
import { SOURCE_LABELS, type CoherenceReport } from "./schemas";
import { CLIENTS } from "./data";

const [client, ...rest] = process.argv.slice(2);
const action = rest.join(" ");

if (!client || !action) {
  console.error(
    [
      "Usage: npm run coherence -- <client> <proposed action>",
      "",
      `Known accounts: ${CLIENTS.map((entry) => entry.name).join(", ")}`,
      "",
      'Example: npm run coherence -- acme "Offer 15% off if they sign before month end"',
      "",
      "Set MOCK_UNAVAILABLE_SOURCES=crm,email to see the degraded path.",
    ].join("\n"),
  );
  process.exit(1);
}

const STATUS_MARK = { conflict: "✗", needs_check: "!", aligned: "✓" } as const;

function print(report: CoherenceReport) {
  const { verdict } = report;
  console.log(`\n${STATUS_MARK[verdict.status]} ${verdict.status.toUpperCase()} — ${report.clientName}`);
  console.log(`  ${verdict.headline}`);
  console.log(`  confidence ${Math.round(verdict.confidence * 100)}%${report.degraded ? " (degraded)" : ""}`);

  console.log("\n  sources");
  for (const entry of report.coverage) {
    console.log(
      `    ${entry.status === "ok" ? "✓" : "✗"} ${SOURCE_LABELS[entry.source].padEnd(14)} ${entry.signals} signal(s)${
        entry.note ? ` — ${entry.note}` : ""
      }`,
    );
  }

  if (verdict.profileSummary.length > 0) {
    console.log("\n  client profile");
    for (const line of verdict.profileSummary) console.log(`    • ${line}`);
  }

  console.log("\n  findings");
  if (verdict.findings.length === 0) console.log("    (none)");
  for (const finding of verdict.findings) {
    console.log(`    [${finding.severity}] ${finding.statement}`);
    console.log(`      ${finding.why}`);
    for (const id of finding.sourceIds) {
      const citation = report.citations.find((entry) => entry.sourceId === id);
      if (citation) {
        console.log(`      ← ${SOURCE_LABELS[citation.source]} · ${citation.title} · ${citation.date}`);
        console.log(`        "${citation.quote}"`);
      }
    }
  }

  if (verdict.counterProposal) console.log(`\n  instead: ${verdict.counterProposal}`);
  console.log("");
}

const result = await checkProposal({ client, action, detail: "" });
if (result.status !== "ok") {
  console.error(
    `\nNo check was run: '${client}' did not resolve to a known account (${result.status}).` +
      `\nKnown accounts: ${result.candidates.join(", ")}\n`,
  );
  process.exit(2);
}
print(result.report);
