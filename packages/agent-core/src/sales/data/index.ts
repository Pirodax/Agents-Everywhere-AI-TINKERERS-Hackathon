/**
 * The sample client book, and the name resolution a thread needs.
 *
 * A rep types "acme", "Acme Industries", or "the Acme renewal". Resolution has
 * to be forgiving in one direction and strict in the other: never guess a
 * client when the match is ambiguous, because a coherence check against the
 * wrong account is worse than no check at all.
 */
import { acme } from "./acme";
import { northwind } from "./northwind";
import type { ClientDataset } from "./types";

export type { ClientDataset } from "./types";

export const CLIENTS: ClientDataset[] = [acme, northwind];

export interface ClientResolution {
  status: "ok" | "unknown" | "ambiguous";
  client?: ClientDataset;
  candidates: string[];
}

export function resolveClient(query: string): ClientResolution {
  const needle = query.trim().toLowerCase();
  const names = CLIENTS.map((client) => client.name);
  if (!needle) return { status: "unknown", candidates: names };

  const exact = CLIENTS.filter(
    (client) => client.id === needle || client.aliases.includes(needle),
  );
  if (exact.length === 1) return { status: "ok", client: exact[0], candidates: names };

  const partial = CLIENTS.filter((client) =>
    client.aliases.some((alias) => needle.includes(alias) || alias.includes(needle)),
  );
  if (partial.length === 1) return { status: "ok", client: partial[0], candidates: names };
  if (partial.length > 1) {
    return { status: "ambiguous", candidates: partial.map((client) => client.name) };
  }
  return { status: "unknown", candidates: names };
}
