# DealGuard — the deal desk that lives in the thread

**OpenAI + CopilotKit Channels + Exa**

A Slack agent that checks a sales proposal against everything the company already knows about the client — the CRM, the email history, and the internal commercial policy — before the rep sends it.

The rep never leaves the conversation. They type the proposal the way they always do, mention the agent, and get one card back: the aggregated client profile, a coherence verdict with a confidence score, each finding quoted from the record it rests on, and a counter-proposal. A human clicks; nothing reaches the client.

> Built for the Agents, Everywhere hackathon on the kit's Slack template. What was inherited and what was built during the event is itemized in [SUBMISSION.md](../../SUBMISSION.md).

## How it works

```
Slack thread
  └─ read_thread                    the proposal is already in the conversation
  └─ check_proposal
       └─ getClientContext(client)  one seam over three sources, Promise.allSettled
            ├─ CRM connector        ─┐
            ├─ Email connector       ├─ sample data today, MCP tomorrow
            └─ Docs connector       ─┘
       └─ three specialist agents in parallel, one per source
            each returns signals pinned to a record id
       └─ synthesis agent
            merge → rank against THIS proposal → verdict + confidence + counter-proposal
       └─ the tool posts the card
Human clicks "Use the counter-proposal" or "Dismiss this flag" — decision recorded, nothing executed
```

Two decisions are worth knowing about before reading the code:

**The model never authors the card.** `check_proposal` posts it from the data the check returned, so a citation, a confidence number and a source link cannot be invented by the model writing the final message. The agent chooses *when* to check, not what the verdict says. That is why there is no `components: [...]` array on the Channel.

**Guards run after the model, not instead of it.** A signal citing a record that does not exist is dropped. A finding left with no resolvable citation is dropped. A surviving blocker cannot coexist with an "aligned" verdict. Confidence is multiplied by how many sources actually answered. Each of those is a test.

## Get started

Complete the [root clone/install steps](../../README.md#get-started), then configure `.env` with [OpenAI](../../using-sponsor-tools.md#openai) and [CopilotKit Intelligence](../../using-sponsor-tools.md#copilotkit):

```dotenv
MODEL_PROVIDER=openai
OPENAI_API_KEY=your-key
MODEL=gpt-5.6-sol
CHANNEL_CODE=your-channel-code
INTELLIGENCE_API_KEY=your-project-key
# optional — public context on a client, kept separate from the coherence check
EXA_API_KEY=your-key
EXA_SEARCH_TYPE=fast
```

Node.js 22+ is required. Start the official onboarding handoff:

```bash
npm run channel:setup -- --no-clipboard
```

This installs the maintained `channels-setup` skill and prints a prompt. Give that prompt to your coding agent in this checkout and specify **Slack**, using the existing `apps/channel` app. The command alone does not create the Channel.

```bash
npm run dev:slack
```

Invite the bot to a Slack channel and mention it in a thread. CopilotKit Intelligence manages the Slack connection; this listener needs no public tunnel or Slack app token.

## Try the flow

Two sample accounts exist: **Acme Industries**, a contested renewal, and **Northwind Logistics**, where the obvious proposal is fine.

1. Put two or three real-looking messages in a Slack thread about the Acme renewal.
2. Post the proposal and mention the agent: *"@DealGuard I'll offer Acme 15% off if they sign before the end of the month."*
3. Read the card. Expect a **CONFLICT**: we already committed in writing to no further discount this fiscal year, the account carries a most-favoured-pricing clause, the client's own legal review takes 45 days, and the champion the deal is mapped to has left. Open a citation button and read the record the finding quotes.
4. Click **Dismiss this flag** or **Use the counter-proposal**. The card is replaced by the decision, attributed to whoever clicked. Click again: the first decision stands.
5. Now the aligned case: *"For Northwind, I want to propose a three-year term with volume pricing."* The verdict should be **ALIGNED** — the check is a judgement, not a reflex.
6. Ask *"who is Acme again?"* to get the profile card with no verdict attached.

**Show the failure path on purpose.** Stop the listener, then:

```bash
MOCK_UNAVAILABLE_SOURCES=crm npm run dev:slack
```

Run the same check. The card now says the CRM could not be read, names what was missing, and the confidence drops — the verdict does not silently pretend it saw three sources.

## Without Slack

The same code path, in a terminal, with the intermediate signals printed:

```bash
npm run coherence -- acme "Offer 15% off if they sign before the end of the month"
npm run coherence -- northwind "Propose a three-year term with volume pricing"
MOCK_UNAVAILABLE_SOURCES=crm,email npm run coherence -- acme "Offer 15% off"
```

It needs `OPENAI_API_KEY` only. Use it to tell a model problem from a Slack problem.

## The files

| Piece | File |
|---|---|
| Data access — the one seam to swap for real MCP connectors | [packages/agent-core/src/sales/sources/](../../packages/agent-core/src/sales/sources/) |
| Sample CRM, mailbox and internal docs | [packages/agent-core/src/sales/data/](../../packages/agent-core/src/sales/data/) |
| The three specialist agents | [sales/agents/source-agent.ts](../../packages/agent-core/src/sales/agents/source-agent.ts) |
| Merge, rank, verdict, confidence | [sales/agents/synthesis.ts](../../packages/agent-core/src/sales/agents/synthesis.ts) |
| Structured model calls (OpenAI / OpenRouter), injectable | [sales/agents/llm.ts](../../packages/agent-core/src/sales/agents/llm.ts) |
| Orchestration | [sales/check-proposal.ts](../../packages/agent-core/src/sales/check-proposal.ts) |
| Slack tools and the decision flow | [src/sales-tools.tsx](src/sales-tools.tsx) |
| Slack cards | [src/sales-components.tsx](src/sales-components.tsx) |
| Channel lifecycle: mention, subscribe, follow along | [src/channel.tsx](src/channel.tsx) |
| Prompt | [sales/prompt.ts](../../packages/agent-core/src/sales/prompt.ts) |

## Wiring it to real systems

`getClientContext` is the only function that knows where client data comes from. Each connector takes a client id and returns a `SourceReport`, and is contractually forbidden from throwing — an unreachable system is an answer, not a crash. Replace the body of [crm.ts](../../packages/agent-core/src/sales/sources/crm.ts) with an MCP or REST call, map the result onto `SourceRecord`, and nothing above it changes. The kit's [shared MCP connection](../../packages/agent-core/src/capabilities/workplace.ts) is the pattern to follow.

Every `SourceRecord` needs a stable `id` and a `url`: the id is the citation key the agents must quote, and the url is what the card turns into a button.

## Verify and limits

```bash
npm run verify   # typecheck across the workspaces + 100 offline tests
```

The tests inject the model, so they run with no API key, no network and no Slack. Seven of them drive the real managed Slack adapter through the kit's offline gateway harness and assert on the Block Kit that comes out.

Live Slack delivery, the OpenAI calls and Exa search require your own accounts and are documented separately in [SUBMISSION.md](../../SUBMISSION.md). CRM, email and docs are **sample data**; the cards say so, and no decision taken on a card is written anywhere but the thread.

Keep the pinned Channels/runtime pair and the `@ag-ui/client` override. The [Channels skill](../../.agents/skills/build-channels-agent/SKILL.md) supplies the verified API vocabulary. [Channels guide](https://copilotkit.ai/channels-guide.md)
