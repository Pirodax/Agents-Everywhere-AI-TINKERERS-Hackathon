# Submission checklist — DealGuard

Choose your city on the [global event page](https://aitinkerers.org/hackathons/global/agents-everywhere). Use that city's participant portal for the submission deadline and published judging criteria, and its handbook for eligibility and required deliverables. See [hackathon-rules.md](hackathon-rules.md) for the agent-readable summary.

## Build eligibility

- [x] Our submitted project is a net-new build created during the official hackathon period (September 12, 2026)
- [x] Its core functionality was built during the event; we are not resubmitting or extending a pre-existing project and entering it as new
- [x] We identify inherited templates, libraries, prompts, components, and starter code separately from our event work

**What we inherited**

The `agents-everywhere-starter-kit` Slack template, unchanged in substance:

| Inherited piece | Where |
|---|---|
| Managed Channels transport and runtime lifecycle | [apps/channel/src/server.ts](apps/channel/src/server.ts), [apps/channel/src/env.ts](apps/channel/src/env.ts) |
| `ChannelRunAgent` per-turn run facade | [apps/channel/src/agent.ts](apps/channel/src/agent.ts) (we swapped the prompt only) |
| `read_thread` tool | [apps/channel/src/tools.tsx](apps/channel/src/tools.tsx) (kept; description retuned for sales) |
| Exa `search_web` tool | [apps/channel/src/search.tsx](apps/channel/src/search.tsx) (kept; description retuned, optional) |
| Offline gateway test harness | [apps/channel/src/testing/managed-gateway.ts](apps/channel/src/testing/managed-gateway.ts) |
| Model adapter, agent factory, `SURFACE_RULES` prompt half | [packages/agent-core/src](packages/agent-core/src) |
| `@ag-ui/client` override and the pinned Channels/runtime pair | [package.json](package.json) |

We also **removed** the kit's incident demo: `apps/channel/src/components.tsx` (incident card, timeline), `propose_action` in `tools.tsx`, and their tests. The kit's `ONCALL_ROLE` prompt is no longer used by the Slack app.

**What we built during the hackathon**

The entire coherence workflow — a multi-agent check over three client data sources, and the Slack card it produces.

| Built today | Where |
|---|---|
| Data-access layer, shaped like real connectors (`getClientContext`) | [packages/agent-core/src/sales/sources/](packages/agent-core/src/sales/sources/) |
| Sample CRM / mailbox / internal-docs corpora with planted contradictions | [packages/agent-core/src/sales/data/](packages/agent-core/src/sales/data/) |
| Three specialist source agents (one brief per source, citation-checked) | [packages/agent-core/src/sales/agents/source-agent.ts](packages/agent-core/src/sales/agents/source-agent.ts) |
| Synthesis agent: merge, rank, verdict, confidence, counter-proposal | [packages/agent-core/src/sales/agents/synthesis.ts](packages/agent-core/src/sales/agents/synthesis.ts) |
| Structured-output model client (OpenAI Responses / OpenRouter), injectable | [packages/agent-core/src/sales/agents/llm.ts](packages/agent-core/src/sales/agents/llm.ts) |
| Orchestrator: context → three agents in parallel → synthesis | [packages/agent-core/src/sales/check-proposal.ts](packages/agent-core/src/sales/check-proposal.ts) |
| Schemas and the sales role prompt | [packages/agent-core/src/sales/schemas.ts](packages/agent-core/src/sales/schemas.ts), [prompt.ts](packages/agent-core/src/sales/prompt.ts) |
| Slack cards: coherence verdict, client profile, unknown client, welcome | [apps/channel/src/sales-components.tsx](apps/channel/src/sales-components.tsx) |
| Slack tools `check_proposal` / `client_profile` and the decision flow | [apps/channel/src/sales-tools.tsx](apps/channel/src/sales-tools.tsx) |
| Channel rewiring: tools, context, welcome, prompt | [apps/channel/src/channel.tsx](apps/channel/src/channel.tsx) |
| Terminal check for the same code path, without Slack | [packages/agent-core/src/sales/cli.ts](packages/agent-core/src/sales/cli.ts) |
| Tests: 50 in `agent-core/sales`, 7 through the real managed adapter | [sales.test.ts](packages/agent-core/src/sales/sales.test.ts), [sales-tools.test.tsx](apps/channel/src/sales-tools.test.tsx) |

## Title and description

**Project title:** DealGuard — the deal desk that lives in the thread

**What you built**

A Slack agent that checks a sales proposal against everything the company already knows about the client, before the rep sends it.

A rep types the proposal in the deal channel the way they always do — "I'll offer Acme 15% if they sign before month end" — and mentions the agent. It reads the thread, then runs three specialist agents in parallel, one per source: the CRM, the email history with the client, and the internal commercial policy and playbooks. Each returns signals pinned to a specific record. A synthesis agent merges them, ranks them against this proposal, and returns a verdict with a confidence score, the findings, the quoted sources, and a counter-proposal.

The result is one Slack card in the thread: aggregated client profile, verdict, each finding with the record it rests on and a link to it, an alternative to say instead, and two buttons. The human decides — the card records the decision and nothing is ever sent to the client.

**Who it is for**

Dana, an account executive three weeks into a renewal negotiation, about to answer a client in the ten minutes before her next call. The email where she promised no further discount this fiscal year is three weeks old, the MFN clause is on page four of the contract, the discount policy is a doc she read in January, and the client's champion left the company last Friday. All four of those facts matter to the sentence she is about to type. None of them are in her head.

**Why the context matters**

The proposal is only ever stated in the conversation. It appears as a half-sentence, mid-thread, in the rep's own words, minutes before it is sent — there is no form, no CRM field, and no moment where anyone would think to open a separate tool. Living in the thread is what lets the agent see it at all, and see it in time.

Take the surface away and the product stops working, not just gets less convenient: a standalone chatbox would require the rep to know they should check, stop, switch tools, and retype the proposal and the client name. The people most likely to send an incoherent offer are exactly the ones who will not do that. The thread also supplies who is asking, what the team already agreed above, and an audience — the flag and the decision are visible to the whole deal team, which is what makes it a deal desk rather than a private assistant.

**Sponsor technologies used**

| Sponsor | Visible contribution |
|---|---|
| **OpenAI** | Every agent in the chain. Three source specialists and the synthesis agent each run one structured-output call through the Responses API; the conversational Slack agent runs on the same model through CopilotKit's built-in agent. |
| **CopilotKit** | Channels SDK and managed Intelligence: the Slack connection, thread context (`read_thread`), the tool loop, and the native Block Kit cards rendered from Channels JSX. No Slack token or tunnel in our process. |
| **Exa** | Optional `search_web`, registered only when `EXA_API_KEY` is set, for public context on a client. Kept explicitly separate from the coherence check: public sources say nothing about what we promised. |

## Evidence for the judging criteria

| Official criterion | What we show |
|---|---|
| Core Requirements & Functionality | The complete workflow in Slack: proposal in a thread → `read_thread` → `check_proposal` → three agents in parallel → synthesis → card with verdict, citations and counter-proposal → a human clicks → the decision is written into the card. The same chain runs in a terminal via `npm run coherence` for anyone who wants to see the intermediate signals. |
| Innovation & Theme Alignment | The trigger is a sentence a rep was going to type anyway. See "Why the context matters" above for what is lost without the surface. |
| Technical Execution & Integration | Three sources behind one `getClientContext` seam, fetched with `Promise.allSettled`; a dead source degrades the verdict instead of failing it, and the card names the missing source and lowers the confidence. Signals citing a record that does not exist are dropped before the card is built. 100 tests, 7 of them through the real managed Slack adapter. |
| Usefulness & Agentic Experience | The agent flags and proposes; it never contacts the client and never decides. Both buttons record a decision once — a duplicate or opposite click cannot overwrite it, and clicking resumes no agent and executes nothing. |

- [x] We can point to visible evidence for every criterion
- [x] We distinguish live services, sample data, session-only state, and standalone recipes
- [x] Sponsor technologies contribute to the workflow; their count is not a judging criterion

**Live vs. sample, stated plainly**

| Piece | Status |
|---|---|
| Slack delivery, thread reading, cards, buttons | **Live** — CopilotKit managed Channel against a real Slack workspace |
| The four model calls | **Live** — OpenAI, with your key |
| CRM, email, internal docs | **Sample data** in `packages/agent-core/src/sales/data/`, behind a connector layer shaped like a real one. Nothing is fetched from a real system, and the cards say so |
| Decisions on the card | **Recorded in the thread only.** Nothing is written to a CRM and nothing is sent to a client |
| Source outage | **Simulated on purpose** with `MOCK_UNAVAILABLE_SOURCES=crm` |

## Public repository

- [x] A new participant can run the quickstart from a clean clone
- [x] The README lists the credentials and separate processes required
- [x] `npm run verify` passes — 100 tests, typecheck clean on all three workspaces
- [x] `.env`, tokens, generated traces with sensitive data, and account secrets are excluded
- [x] Sample data, session-only state, and unimplemented integrations are clearly labeled

## Two-minute demo video

- [ ] Show the thread with its existing messages before mentioning the agent
- [ ] One complete interaction: the proposal, the card, the sources, the click
- [ ] Open a citation link to show the record the finding rests on
- [ ] Show the honest failure: `MOCK_UNAVAILABLE_SOURCES=crm`, then the degraded card naming the missing source and the lower confidence
- [ ] Show the aligned case (Northwind) so the verdict is visibly a judgement, not a reflex
- [ ] Name OpenAI, CopilotKit and Exa and what each one does here
- [ ] Keep the video within the event's limit and check audio

## Social post and final submission

- [ ] Follow the organizer's posting and sponsor-tagging instructions
- [ ] Link the public repository and video
- [ ] Credit the sponsors used and applicable local partners
- [ ] Check the live integration once more before recording or submitting
- [ ] Inspect the repository, video and screenshots for secrets
