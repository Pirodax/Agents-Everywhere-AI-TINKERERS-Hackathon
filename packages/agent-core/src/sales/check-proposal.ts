/**
 * The whole coherence check, in one call.
 *
 *   getClientContext  →  three specialists in parallel  →  synthesis  →  report
 *
 * Surface-agnostic on purpose: Slack binds this to a channel tool, but a web
 * app or a CRM sidebar would call exactly the same function.
 */
import {
  getClientContext,
  type ClientContextResult,
  type SourceConnectorSet,
} from "./sources";
import { runSourceAgent } from "./agents/source-agent";
import { synthesizeVerdict } from "./agents/synthesis";
import type { StructuredCaller } from "./agents/llm";
import type { CoherenceReport, Proposal, SourceAgentResult } from "./schemas";

export type CheckProposalResult =
  | { status: "ok"; report: CoherenceReport }
  | { status: "unknown_client" | "ambiguous_client"; candidates: string[] };

export interface CheckProposalDeps {
  call?: StructuredCaller;
  signal?: AbortSignal;
  connectors?: SourceConnectorSet;
  /** Injected in tests; defaults to the real context loader. */
  loadContext?: (clientRef: string) => Promise<ClientContextResult>;
}

export async function checkProposal(
  proposal: Proposal,
  deps: CheckProposalDeps = {},
): Promise<CheckProposalResult> {
  const load =
    deps.loadContext ??
    ((clientRef: string) => getClientContext(clientRef, deps.connectors));
  const loaded = await load(proposal.client);
  if (loaded.status !== "ok") {
    return {
      status: loaded.status === "ambiguous" ? "ambiguous_client" : "unknown_client",
      candidates: loaded.candidates,
    };
  }
  const context = loaded.context;

  // One specialist per source, in parallel. Each is already failure-tolerant,
  // so a rejected promise here would be a bug rather than a dead connector —
  // settle anyway so a bug in one specialist cannot sink the whole check.
  const settled = await Promise.allSettled(
    context.reports.map((report) =>
      runSourceAgent(
        { clientName: context.clientName, proposal, report },
        { call: deps.call, signal: deps.signal },
      ),
    ),
  );
  const results: SourceAgentResult[] = settled.map((outcome, index) => {
    if (outcome.status === "fulfilled") return outcome.value;
    const report = context.reports[index];
    return {
      source: report ? report.source : "crm",
      status: "error" as const,
      signals: [],
      note:
        outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
    };
  });

  const report = await synthesizeVerdict(
    { context, proposal, results },
    { call: deps.call, signal: deps.signal },
  );
  return { status: "ok", report };
}
