/**
 * The vocabulary of the coherence check, in one place.
 *
 * Three shapes matter, and they are deliberately separate:
 *
 *   SourceRecord   what an external system hands back. Dumb, quotable, dated.
 *   ClientSignal   what a source agent concluded, always pinned to a record id.
 *   CoherenceVerdict  what the synthesis agent decided about ONE proposal.
 *
 * Keeping the record separate from the signal is what makes a citation possible:
 * every signal carries the id of the record it came from, so the Slack card can
 * show the source rather than asking the reader to trust the model.
 *
 * Isomorphic: zod only, no Node imports.
 */
import { z } from "zod";

export const SOURCE_IDS = ["crm", "email", "docs"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  crm: "CRM",
  email: "Email",
  docs: "Internal docs",
};

/** One item as an external system returns it. `id` is the citation key. */
export interface SourceRecord {
  /** Stable, source-prefixed, e.g. "crm:opportunity:ACME-2231". Cited by signals. */
  id: string;
  title: string;
  /** ISO date. Recency is a ranking input, so it is never optional. */
  date: string;
  author?: string;
  body: string;
  /** Deep link back into the source system. Mocked here; real once wired. */
  url?: string;
}

/** One source's answer, including the honest failure case. */
export interface SourceReport {
  source: SourceId;
  status: "ok" | "unavailable";
  records: SourceRecord[];
  /** Present when status is "unavailable". Shown to the user, not hidden. */
  error?: string;
  fetchedAt: string;
}

/** Everything known about a client, one entry per source. */
export interface ClientContext {
  clientId: string;
  clientName: string;
  /** Short facts every card shows: stage, ARR, owner. From the CRM header. */
  headline: {
    industry: string;
    arr: string;
    stage: string;
    owner: string;
    renewalDate: string;
  };
  reports: SourceReport[];
}

/** The sales action under review, as the agent extracted it from the thread. */
export const proposalSchema = z.object({
  client: z
    .string()
    .describe("The client this proposal is about, as named in the thread."),
  action: z
    .string()
    .describe("The proposed sales action in one plain sentence, in the rep's own terms."),
  detail: z
    .string()
    .default("")
    .describe("Any numbers, dates, or conditions attached to it. Empty string if none."),
});
export type Proposal = z.infer<typeof proposalSchema>;

/** What one source agent concluded. `sourceId` MUST match a SourceRecord.id. */
export const clientSignalSchema = z.object({
  claim: z.string(),
  stance: z.enum(["supports", "contradicts", "context"]),
  severity: z.enum(["blocker", "warning", "info"]),
  relevance: z.number().min(0).max(1),
  sourceId: z.string(),
  quote: z.string(),
});
export type ClientSignal = z.infer<typeof clientSignalSchema>;

export const sourceAgentOutputSchema = z.object({
  signals: z.array(clientSignalSchema),
});

export interface SourceAgentResult {
  source: SourceId;
  status: "ok" | "unavailable" | "error";
  signals: ClientSignal[];
  /** Why this source contributed nothing, when it contributed nothing. */
  note?: string;
}

export const coherenceVerdictSchema = z.object({
  status: z.enum(["aligned", "needs_check", "conflict"]),
  confidence: z.number().min(0).max(1),
  headline: z.string(),
  profileSummary: z.array(z.string()),
  findings: z.array(
    z.object({
      severity: z.enum(["blocker", "warning", "info"]),
      statement: z.string(),
      why: z.string(),
      sourceIds: z.array(z.string()),
    }),
  ),
  counterProposal: z.string(),
});
export type CoherenceVerdict = z.infer<typeof coherenceVerdictSchema>;

/** A cited record, resolved for display next to the verdict. */
export interface Citation {
  sourceId: string;
  source: SourceId;
  title: string;
  date: string;
  author?: string;
  url?: string;
  quote: string;
}

/** What `checkProposal` returns: the verdict plus everything it rests on. */
export interface CoherenceReport {
  clientId: string;
  clientName: string;
  headline: ClientContext["headline"];
  proposal: Proposal;
  verdict: CoherenceVerdict;
  citations: Citation[];
  coverage: {
    source: SourceId;
    status: SourceAgentResult["status"];
    signals: number;
    note?: string;
  }[];
  /** True when at least one source could not be reached. Lowers confidence. */
  degraded: boolean;
}
