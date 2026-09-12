/**
 * The two tools the agent can reach for.
 *
 * `check_proposal` is the whole product: it runs the multi-agent check and
 * posts the card itself, then hands the model a one-line summary. The model
 * decides WHEN to check and never gets to author what the card says — that is
 * why the citations on it can be trusted.
 *
 * A tool handler receives the LIVE thread, which is what makes this possible.
 */
import {
  defineChannelTool,
  Message,
  Header,
  Section,
  Markdown,
  Context,
} from "@copilotkit/channels";
import type { InteractionContext } from "@copilotkit/channels";
import {
  checkProposal,
  getClientContext,
  proposalSchema,
  SOURCE_LABELS,
  type CheckProposalDeps,
  type CoherenceReport,
} from "agent-core/sales";
import { z } from "zod";
import {
  clientProfileCard,
  coherenceCard,
  unknownClientMessage,
} from "./sales-components";

/** Injected in tests so the tool runs with no API key and no network. */
export function createCheckProposalTool(deps: CheckProposalDeps = {}) {
  return defineChannelTool({
    name: "check_proposal",
    description:
      "Check a proposed sales action against everything known about the client — CRM, email history, and internal docs — before the rep sends it. Call this as soon as someone proposes a price, a discount, a term, a commitment, or a next step. It posts the coherence card itself; after it returns, do not restate the findings.",
    parameters: proposalSchema,
    async handler(proposal, { thread, signal }) {
      const result = await checkProposal(proposal, { ...deps, signal });

      if (result.status !== "ok") {
        await thread.post(unknownClientMessage(proposal.client, result.candidates));
        return `No check was run: '${proposal.client}' did not resolve to a known account (${result.status}). Known accounts: ${result.candidates.join(", ")}. Ask which one is meant; do not guess.`;
      }

      const report = result.report;
      await thread.post(coherenceCard(report, decisionHandlers(report)));
      return summarize(report);
    },
  });
}

/**
 * A decision is recorded once, in the card itself.
 *
 * The SDK keeps inline handlers alive after a message is replaced, so clicks are
 * queued and the first one to land wins. A second click — or the opposite one —
 * cannot overwrite a decision that is already written, and a failed update stays
 * retryable rather than silently marking the card settled.
 */
function decisionHandlers(report: CoherenceReport) {
  let settled = false;
  let queue = Promise.resolve();

  const record = (adopted: boolean, ctx: InteractionContext<string>) => {
    const write = async () => {
      if (settled) return;
      const who = ctx.user?.name ?? "the rep";
      const decision = adopted
        ? `Counter-proposal adopted by ${who}. Recorded here only — nothing was sent to ${report.clientName}.`
        : `Flag dismissed by ${who}. The proposal stands as written; nothing was sent to ${report.clientName}.`;
      await ctx.thread.update(
        ctx.message.ref,
        <Message accent={adopted ? "#2E7D5B" : "#5B6478"}>
          <Header>{`Decision recorded · ${report.clientName}`}</Header>
          <Section>
            <Markdown>{`${decision}\n\n*Proposal:* ${report.proposal.action}${
              adopted && report.verdict.counterProposal
                ? `\n*Adopted instead:* ${report.verdict.counterProposal}`
                : ""
            }`}</Markdown>
          </Section>
          <Context>A human made this call. The check does not execute anything.</Context>
        </Message>,
      );
      settled = true;
    };
    queue = queue.then(write, write);
    return queue;
  };

  return {
    onAdopt: (ctx: InteractionContext<string>) => record(true, ctx),
    onDismiss: (ctx: InteractionContext<string>) => record(false, ctx),
  };
}

/** What the model reads back. Short, factual, and explicitly a stop sign. */
function summarize(report: CoherenceReport): string {
  const sources = report.coverage
    .map((entry) => `${SOURCE_LABELS[entry.source]}:${entry.status}`)
    .join(", ");
  return [
    `Coherence card posted for ${report.clientName}.`,
    `Verdict: ${report.verdict.status} at ${Math.round(report.verdict.confidence * 100)}% confidence,`,
    `${report.verdict.findings.length} finding(s), ${report.citations.length} cited record(s).`,
    `Sources: ${sources}.`,
    report.degraded ? "This check was degraded; say which source was missing." : "",
    "The card is already in the thread with the findings, the sources and the buttons.",
    "Add at most one short line, and only if it is not on the card. Do not restate the findings.",
  ]
    .filter(Boolean)
    .join(" ");
}

export const checkProposalTool = createCheckProposalTool();

/** The account, with no verdict attached. No model call, so it is instant. */
export const clientProfileTool = defineChannelTool({
  name: "client_profile",
  description:
    "Show the aggregated profile of a client — account facts plus what each source holds — without judging any proposal. Use it when someone asks who a client is or where the account stands.",
  parameters: z.object({
    client: z.string().describe("The client, as named in the thread."),
  }),
  async handler({ client }, { thread }) {
    const loaded = await getClientContext(client);
    if (loaded.status !== "ok") {
      await thread.post(unknownClientMessage(client, loaded.candidates));
      return `'${client}' did not resolve to a known account. Known accounts: ${loaded.candidates.join(", ")}.`;
    }
    await thread.post(clientProfileCard(loaded.context));
    const unreachable = loaded.context.reports.filter((report) => report.status !== "ok");
    return [
      `Profile card posted for ${loaded.context.clientName}.`,
      unreachable.length > 0
        ? `Unavailable sources: ${unreachable.map((report) => SOURCE_LABELS[report.source]).join(", ")} — say so.`
        : "All three sources answered.",
      "Do not restate the card.",
    ].join(" ");
  },
});
