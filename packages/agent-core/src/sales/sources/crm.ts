/**
 * CRM connector.
 *
 * Reads the sample account book. A real implementation calls the CRM's MCP
 * server (or REST API) here and maps its records onto SourceRecord — the
 * signature and the failure contract stay exactly as they are.
 */
import { CLIENTS } from "../data";
import type { SourceReport } from "../schemas";
import { isSourceDown, unavailable, type SourceConnector } from "./types";

export const getCrmRecords: SourceConnector = async (clientId): Promise<SourceReport> => {
  if (isSourceDown("crm")) {
    return unavailable("crm", "CRM connector is unreachable (simulated outage).");
  }
  const client = CLIENTS.find((entry) => entry.id === clientId);
  return {
    source: "crm",
    status: "ok",
    records: client?.crm ?? [],
    fetchedAt: new Date().toISOString(),
  };
};
