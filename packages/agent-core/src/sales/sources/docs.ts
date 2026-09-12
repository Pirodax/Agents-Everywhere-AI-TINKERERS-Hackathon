/**
 * Internal docs connector.
 *
 * Policies, playbooks, meeting notes — the things a rep is assumed to have read
 * and has not. A real implementation searches the docs workspace for this
 * account plus the standing commercial policies that apply to every account.
 */
import { CLIENTS } from "../data";
import type { SourceReport } from "../schemas";
import { isSourceDown, unavailable, type SourceConnector } from "./types";

export const getDocsRecords: SourceConnector = async (clientId): Promise<SourceReport> => {
  if (isSourceDown("docs")) {
    return unavailable("docs", "Docs workspace connector is unreachable (simulated outage).");
  }
  const client = CLIENTS.find((entry) => entry.id === clientId);
  return {
    source: "docs",
    status: "ok",
    records: client?.docs ?? [],
    fetchedAt: new Date().toISOString(),
  };
};
