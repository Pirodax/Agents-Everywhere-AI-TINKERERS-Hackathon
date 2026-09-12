/**
 * Thread context.
 *
 * `read_thread` is inherited from the starter kit and kept deliberately: the
 * whole premise of this agent is that the proposal, the client name, and what
 * the team already decided are already in the conversation. Its description is
 * retuned for the sales workflow; the capability-gated degradation is the kit's.
 *
 * The return value is what the *agent* reads back, not what the user sees.
 */
import { defineChannelTool } from "@copilotkit/channels";
export { searchTheWeb } from "./search";
import { z } from "zod";

export const readThread = defineChannelTool({
  name: "read_thread",
  description:
    "Read the recent messages in this conversation. Call this FIRST on any question about a deal — the thread almost certainly already names the client, the proposal, and what the team has already agreed. Never ask a rep to retype what they just wrote.",
  parameters: z.object({}),
  async handler(_args, { thread }) {
    const messages = await thread.getMessages();
    if (messages.length === 0) {
      return "This surface does not expose conversation history, or the thread is empty. Say that you cannot see earlier messages and ask for the client name and the proposal in one line.";
    }
    return messages;
  },
});
