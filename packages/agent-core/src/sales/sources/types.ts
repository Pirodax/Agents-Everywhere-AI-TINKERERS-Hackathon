import type { SourceId, SourceReport } from "../schemas";

/**
 * The contract every source connector honours.
 *
 * Takes a client id, returns a report, never throws for an unreachable source —
 * an unavailable CRM is an answer ("I could not look"), not a crash. That is
 * also the shape a real MCP-backed connector would have, which is the point:
 * swapping the mock for the real system changes one file and nothing above it.
 */
export type SourceConnector = (clientId: string) => Promise<SourceReport>;

/**
 * Failure injection for the demo and the tests.
 *
 * `MOCK_UNAVAILABLE_SOURCES=crm,email` makes those connectors report
 * "unavailable". It exists so the degraded path can be shown on purpose in a
 * live demo instead of being described in a slide.
 */
export function isSourceDown(source: SourceId): boolean {
  return (process.env.MOCK_UNAVAILABLE_SOURCES ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .includes(source);
}

export function unavailable(source: SourceId, reason: string): SourceReport {
  return {
    source,
    status: "unavailable",
    records: [],
    error: reason,
    fetchedAt: new Date().toISOString(),
  };
}
