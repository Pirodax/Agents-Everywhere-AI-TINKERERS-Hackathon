/**
 * The cards, in Channels JSX.
 *
 * These are plain functions, not `defineChannelComponent`, and that is the
 * important decision in this file: the card is rendered from the data the
 * coherence check returned, never from props the model retyped. The model
 * chooses *when* to check; it cannot author a citation, a confidence number, or
 * a source link. Anything on the card can be traced back to a record id.
 *
 * One tree, every platform: Block Kit on Slack, Adaptive Cards on Teams.
 */
import type { InteractionContext } from "@copilotkit/channels";
import {
  Actions,
  Button,
  Context,
  Divider,
  Field,
  Fields,
  Header,
  Markdown,
  Message,
  Section,
} from "@copilotkit/channels";
import {
  SOURCE_LABELS,
  type Citation,
  type ClientContext,
  type CoherenceReport,
} from "agent-core/sales";

const STATUS = {
  conflict: { accent: "#C4145F", label: "CONFLICT", verb: "Do not send as written" },
  needs_check: { accent: "#8A5C10", label: "NEEDS A CHECK", verb: "Confirm one thing first" },
  aligned: { accent: "#2E7D5B", label: "ALIGNED", verb: "Consistent with what we know" },
} as const;

const SEVERITY_MARK = { blocker: "🚫", warning: "⚠️", info: "•" } as const;

/** A five-cell bar reads faster than "0.72" in a thread moving at speed. */
function confidenceBar(confidence: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(confidence * 5)));
  return `${"▰".repeat(filled)}${"▱".repeat(5 - filled)} ${Math.round(confidence * 100)}%`;
}

function citationLine(citation: Citation): string {
  return `${SOURCE_LABELS[citation.source]} · ${citation.title} · ${citation.date}`;
}

/**
 * A quote is evidence, not the record. An analyst that hands back half a CRM
 * entry would push the verdict off the first screen, so the card shows the
 * opening line and leaves the rest to the source button.
 */
function shortQuote(quote: string): string {
  const firstLine = quote.split("\n")[0]?.trim() ?? quote;
  return firstLine.length > 180 ? `${firstLine.slice(0, 177)}…` : firstLine;
}

function coverageLine(report: CoherenceReport): string {
  return report.coverage
    .map((entry) =>
      entry.status === "ok"
        ? `${SOURCE_LABELS[entry.source]} ✓`
        : `${SOURCE_LABELS[entry.source]} ✗`,
    )
    .join("  ·  ");
}

export interface CoherenceCardHandlers {
  onAdopt: (ctx: InteractionContext<string>) => Promise<void>;
  onDismiss: (ctx: InteractionContext<string>) => Promise<void>;
}

/**
 * The verdict card: profile, verdict, findings with sources, counter-proposal,
 * and the two buttons that leave the decision with the human.
 */
export function coherenceCard(
  report: CoherenceReport,
  handlers?: CoherenceCardHandlers,
) {
  const status = STATUS[report.verdict.status];
  const { verdict } = report;
  // A link button with no URL renders as a dead control, so only cited records
  // that actually resolve somewhere become buttons.
  const linkable = report.citations.filter((citation) => Boolean(citation.url)).slice(0, 5);

  return (
    <Message accent={status.accent}>
      <Header>{`${status.label} · ${report.clientName}`}</Header>
      <Context>{`Proposal under review: ${report.proposal.action}${
        report.proposal.detail ? ` — ${report.proposal.detail}` : ""
      }`}</Context>
      <Section>
        <Markdown>{`*${status.verb}.* ${verdict.headline}`}</Markdown>
      </Section>
      <Fields>
        <Field label="Confidence">{confidenceBar(verdict.confidence)}</Field>
        <Field label="Sources">{coverageLine(report)}</Field>
      </Fields>

      {verdict.profileSummary.length > 0 && (
        <Section>
          <Markdown>
            {`*Client profile, aggregated*\n${verdict.profileSummary
              .map((line) => `• ${line}`)
              .join("\n")}`}
          </Markdown>
        </Section>
      )}

      {verdict.findings.length > 0 && <Divider />}
      {verdict.findings.map((finding) => (
        <Section>
          <Markdown>
            {`${SEVERITY_MARK[finding.severity]} *${finding.statement}*\n${finding.why}\n${finding.sourceIds
              .map((id) => {
                const citation = report.citations.find((entry) => entry.sourceId === id);
                return citation ? `> ${citationLine(citation)}\n> "${shortQuote(citation.quote)}"` : "";
              })
              .filter(Boolean)
              .join("\n")}`}
          </Markdown>
        </Section>
      ))}

      {linkable.length > 0 && (
        <Actions>
          {linkable.map((citation, index) => (
            <Button url={citation.url}>
              {`${index + 1}. ${SOURCE_LABELS[citation.source]} — ${citation.title}`}
            </Button>
          ))}
        </Actions>
      )}

      {verdict.counterProposal && (
        <Section>
          <Markdown>{`*Instead, you could say*\n${verdict.counterProposal}`}</Markdown>
        </Section>
      )}

      {report.degraded && (
        <Context>
          {`Degraded check: ${report.coverage
            .filter((entry) => entry.status !== "ok")
            .map((entry) => `${SOURCE_LABELS[entry.source]} — ${entry.note ?? "no answer"}`)
            .join(" · ")} Confidence is reduced accordingly.`}
        </Context>
      )}

      {handlers && (
        <Actions>
          <Button value="adopt" style="primary" onClick={handlers.onAdopt}>
            Use the counter-proposal
          </Button>
          <Button value="dismiss" onClick={handlers.onDismiss}>
            Dismiss this flag
          </Button>
        </Actions>
      )}
      <Context>
        Sample CRM, mailbox and docs data. Nothing here was sent to the client, and clicking
        records a decision in this thread only.
      </Context>
    </Message>
  );
}

/** The account, with no verdict attached. For "who are these people again?". */
export function clientProfileCard(context: ClientContext) {
  const reachable = context.reports.filter((report) => report.status === "ok");
  const down = context.reports.filter((report) => report.status !== "ok");

  return (
    <Message accent="#3C6BD9">
      <Header>{context.clientName}</Header>
      <Fields>
        <Field label="Account">{context.headline.industry}</Field>
        <Field label="Value">{context.headline.arr}</Field>
        <Field label="Stage">{context.headline.stage}</Field>
        <Field label="Owner">{context.headline.owner}</Field>
        <Field label="Key date">{context.headline.renewalDate}</Field>
      </Fields>
      <Divider />
      {reachable.map((report) => (
        <Section>
          <Markdown>
            {`*${SOURCE_LABELS[report.source]}* — ${report.records.length} record(s)\n${report.records
              .slice(0, 3)
              .map((record) => `• ${record.title} _(${record.date})_`)
              .join("\n")}`}
          </Markdown>
        </Section>
      ))}
      {down.length > 0 && (
        <Context>
          {`Unavailable: ${down
            .map((report) => `${SOURCE_LABELS[report.source]} — ${report.error ?? "no answer"}`)
            .join(" · ")}`}
        </Context>
      )}
      <Context>
        Sample data. Propose an action in this thread and I will check it against all of this.
      </Context>
    </Message>
  );
}

/** Asked about a client nobody has heard of: say so, and say who is known. */
export function unknownClientMessage(query: string, candidates: string[]) {
  return (
    <Message accent="#8A5C10">
      <Header>No client matched that name</Header>
      <Section>
        <Markdown>
          {`I could not resolve *${query}* to an account, so I did not run a check — a coherence verdict against the wrong client is worse than none.`}
        </Markdown>
      </Section>
      <Context>{`Accounts I can read: ${candidates.join(", ")}`}</Context>
    </Message>
  );
}

/** Said once, when the app is installed. A silent bot looks broken. */
export function welcomeMessage(platform: string) {
  return (
    <Message accent="#3C6BD9">
      <Header>Deal desk, in the thread</Header>
      <Section>
        <Markdown>
          {`Before you send a price, a discount, or a commitment to a client, say it here and mention me. I read this ${platform} thread, then the CRM, the email history and our own policy, and I tell you whether the three of them agree with you — with the sources, before it leaves the room.`}
        </Markdown>
      </Section>
      <Fields>
        <Field label="I will">Check a proposal, cite what I found, suggest an alternative</Field>
        <Field label="I won't">Contact the client, or decide for you</Field>
      </Fields>
    </Message>
  );
}
