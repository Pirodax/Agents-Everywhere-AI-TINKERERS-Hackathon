/**
 * Email connector.
 *
 * Reads the sample shared mailbox. A real implementation queries the mail
 * provider for threads involving this account's domain and maps them onto
 * SourceRecord. Everything above this file is unchanged by that swap.
 */
import { CLIENTS } from "../data";
import type { SourceReport } from "../schemas";
import { isSourceDown, unavailable, type SourceConnector } from "./types";

export const getEmailRecords: SourceConnector = async (clientId): Promise<SourceReport> => {
  if (isSourceDown("email")) {
    return unavailable("email", "Mailbox connector is unreachable (simulated outage).");
  }
  const client = CLIENTS.find((entry) => entry.id === clientId);
  return {
    source: "email",
    status: "ok",
    records: client?.email ?? [],
    fetchedAt: new Date().toISOString(),
  };
};
