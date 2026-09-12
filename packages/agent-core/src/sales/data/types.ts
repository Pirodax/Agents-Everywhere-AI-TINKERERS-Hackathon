import type { ClientContext, SourceRecord } from "../schemas";

/**
 * One client's world, as three source systems would return it.
 *
 * Shaped like the answers, not like a database: when `sources/crm.ts` is
 * repointed at a real CRM through MCP, only that file changes.
 */
export interface ClientDataset {
  id: string;
  name: string;
  /** Lowercase strings a rep might type in a thread. Used by resolveClient. */
  aliases: string[];
  headline: ClientContext["headline"];
  crm: SourceRecord[];
  email: SourceRecord[];
  docs: SourceRecord[];
}
