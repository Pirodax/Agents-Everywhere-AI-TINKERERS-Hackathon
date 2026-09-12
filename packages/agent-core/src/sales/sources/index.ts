/**
 * getClientContext — the single seam between the agents and the outside world.
 *
 * Everything downstream (the source agents, the synthesis, the Slack card) only
 * ever sees a ClientContext. Replace the three connectors with real MCP calls
 * and nothing else in this project has to know.
 *
 * The three sources are fetched in parallel and settled independently: one dead
 * connector degrades the answer, it does not fail the check. The caller is told
 * which sources answered so the card can say so out loud.
 */
import { resolveClient } from "../data";
import type { ClientContext, SourceReport } from "../schemas";
import { getCrmRecords } from "./crm";
import { getDocsRecords } from "./docs";
import { getEmailRecords } from "./email";
import { unavailable, type SourceConnector } from "./types";

export { resolveClient } from "../data";
export type { SourceConnector } from "./types";

export const DEFAULT_CONNECTORS = {
  crm: getCrmRecords,
  email: getEmailRecords,
  docs: getDocsRecords,
} satisfies Record<"crm" | "email" | "docs", SourceConnector>;

/** The injectable set of connectors — one per source. */
export type SourceConnectorSet = typeof DEFAULT_CONNECTORS;

export type ClientContextResult =
  | { status: "ok"; context: ClientContext }
  | { status: "unknown" | "ambiguous"; candidates: string[] };

/**
 * @param clientRef what the rep typed: an id, a name, or something close.
 */
export async function getClientContext(
  clientRef: string,
  connectors: SourceConnectorSet = DEFAULT_CONNECTORS,
): Promise<ClientContextResult> {
  const resolution = resolveClient(clientRef);
  if (resolution.status !== "ok" || !resolution.client) {
    // `resolveClient` only reports "ok" together with a client, so this branch
    // is the not-found case even when the narrowing cannot see it.
    const status = resolution.status === "ok" ? "unknown" : resolution.status;
    return { status, candidates: resolution.candidates };
  }
  const client = resolution.client;

  const settled = await Promise.allSettled([
    connectors.crm(client.id),
    connectors.email(client.id),
    connectors.docs(client.id),
  ]);
  const order = ["crm", "email", "docs"] as const;
  const reports: SourceReport[] = settled.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : unavailable(
          order[index] ?? "crm",
          result.reason instanceof Error ? result.reason.message : String(result.reason),
        ),
  );

  return {
    status: "ok",
    context: {
      clientId: client.id,
      clientName: client.name,
      headline: client.headline,
      reports,
    },
  };
}
