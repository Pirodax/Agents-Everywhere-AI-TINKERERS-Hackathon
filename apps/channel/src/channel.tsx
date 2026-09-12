import { createChannel } from "@copilotkit/channels";
import { isSearchConfigured } from "agent-core";
import { CLIENTS } from "agent-core/sales";
import { makeChannelAgent } from "./agent";
import { required } from "./env";
import { welcomeMessage } from "./sales-components";
import { checkProposalTool, clientProfileTool } from "./sales-tools";
import { readThread, searchTheWeb } from "./tools";

// Tools are registered only when their credential is present, so the agent is
// never handed a tool that will fail when it calls it.
const tools = [
  readThread,
  checkProposalTool,
  clientProfileTool,
  ...(isSearchConfigured() ? [searchTheWeb] : []),
];

export const channel = createChannel({
  // Must equal the Channel Code in Intelligence, character for character. A
  // mismatch leaves the Channel at "Waiting for runtime" and is validated at
  // startup, not here.
  name: required("CHANNEL_CODE"),

  // Required. "platform" derives the canonical user from provider + workspace +
  // platform user id. Do NOT move this onto CopilotRuntime — that one is for
  // web requests and must be absent on a Channels-only runtime.
  identifyUser: "platform",

  agent: makeChannelAgent,
  tools,

  // No `components`: the cards in this project are posted by the tools that own
  // the data, not rendered by the model. The agent decides when to check, never
  // what the verdict says.

  // Injected into the agent's prompt on every run.
  context: [
    {
      description: "Accounts this deployment can read",
      value: CLIENTS.map((client) => client.name).join(", "),
    },
    {
      description: "Rendering",
      value:
        "check_proposal and client_profile post their own cards. After either returns, add at most one short line. Never restate a card in prose.",
    },
    {
      description: "Surface",
      value:
        "This is the channel where the sales team works a live deal. Others are reading, the client is not, and someone will act on what is said here within the hour.",
    },
    {
      description: "Data",
      value:
        "CRM, mailbox and internal docs are sample data behind a connector layer. Say so if asked; never claim to have contacted a client.",
    },
  ],
});

// A mention subscribes the conversation, so the agent then follows along instead
// of needing to be @-mentioned every single turn.
channel.onMention(async ({ thread }) => {
  await thread.subscribe();
  await thread.runAgent();
});

// Non-mentioned turns only ever reach onMessage — gate them on the flag or the
// agent will answer every message in every channel it has been invited to.
channel.onMessage(async ({ thread }) => {
  if (await thread.isSubscribed()) {
    await thread.runAgent();
  }
});

channel.onWelcome(async ({ thread, platform }) => {
  await thread.post(welcomeMessage(platform));
});
