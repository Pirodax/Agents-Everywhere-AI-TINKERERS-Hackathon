/**
 * The sales-coherence workflow. Built for this hackathon.
 *
 * Nothing in here imports a messaging SDK: the surface binds to it, it does not
 * bind to a surface.
 */
export { checkProposal, type CheckProposalResult, type CheckProposalDeps } from "./check-proposal";
export { getClientContext, resolveClient, DEFAULT_CONNECTORS } from "./sources";
export type { ClientContextResult, SourceConnectorSet } from "./sources";
export { runSourceAgent } from "./agents/source-agent";
export { synthesizeVerdict, coverageFactor } from "./agents/synthesis";
export { callStructured, type StructuredCaller } from "./agents/llm";
export { SALES_COHERENCE_ROLE, SALES_SYSTEM_PROMPT } from "./prompt";
export { CLIENTS } from "./data";
export * from "./schemas";
