import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { readThread } from "./tools";

/** Only the methods these tools call; the rest of Thread is irrelevant here. */
const stubContext = (thread: Record<string, unknown>) =>
  ({
    thread,
    user: { id: "u1", name: "priya" },
    actor: { id: "a1" },
    platform: "slack",
  }) as never;

describe("read_thread", () => {
  it("returns the messages when the surface exposes history", async () => {
    const messages = [
      { id: "1", role: "user", content: "Acme wants a bigger discount" },
    ];
    const result = await readThread.handler(
      {},
      stubContext({ getMessages: mock.fn(async () => messages) }),
    );
    assert.deepEqual(result, messages);
  });

  it("degrades into an instruction, not an empty array, when history is unavailable", async () => {
    // getMessages() is capability-gated: it returns [] rather than throwing on
    // surfaces that cannot read history. Handing that [] straight to the model
    // reads as "the thread is empty", and the agent then answers confidently
    // about a deal it knows nothing about.
    const result = await readThread.handler(
      {},
      stubContext({ getMessages: mock.fn(async () => []) }),
    );
    assert.equal(typeof result, "string");
    assert.match(String(result), /could not see earlier messages/i);
  });
});
