/**
 * One structured model call, used by every specialist agent.
 *
 * Why not the shared `makeAgent` factory: that one builds a conversational
 * BuiltInAgent for a surface. The source and synthesis agents are not
 * conversational — each is a single request that must come back as a specific
 * JSON shape, so they use the provider's structured-output mode directly and
 * hand the result to zod.
 *
 * Everything is behind `StructuredCaller` so tests inject a fake and run with no
 * network and no API key.
 */

export type JsonSchema = Record<string, unknown>;

export interface StructuredRequest {
  system: string;
  user: string;
  /** Names the schema for the provider; also used in error messages. */
  schemaName: string;
  schema: JsonSchema;
  maxOutputTokens?: number;
}

export type StructuredCaller = (
  request: StructuredRequest,
  signal?: AbortSignal,
) => Promise<unknown>;

interface ProviderConfig {
  provider: "openai" | "openrouter";
  model: string;
  apiKey: string;
}

function providerConfig(): ProviderConfig {
  const provider = (
    process.env.MODEL_PROVIDER || (process.env.OPENROUTER_API_KEY ? "openrouter" : "openai")
  )
    .trim()
    .toLowerCase();
  const configured = (process.env.MODEL || "gpt-5.6-sol").trim();

  if (provider === "openrouter") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is required for MODEL_PROVIDER=openrouter.");
    // OpenRouter wants publisher/model; a bare id is assumed to be OpenAI's.
    const model = configured.includes("/") ? configured : `openai/${configured.replace(/^openai:/, "")}`;
    return { provider: "openrouter", model, apiKey };
  }
  if (provider !== "openai") {
    throw new Error(
      `The coherence agents support MODEL_PROVIDER=openai or openrouter; got '${provider}'.`,
    );
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "stub-replace-me") {
    throw new Error("OPENAI_API_KEY is required for the coherence agents.");
  }
  return { provider: "openai", model: configured.replace(/^openai:/, ""), apiKey };
}

function parseJson(text: string, schemaName: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Model returned non-JSON output for ${schemaName}: ${text.slice(0, 200)}`);
  }
}

/** The real caller. Replaced wholesale in tests. */
export const callStructured: StructuredCaller = async (request, signal) => {
  const { provider, model, apiKey } = providerConfig();
  const max = request.maxOutputTokens ?? 2000;

  if (provider === "openrouter") {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: max,
        messages: [
          { role: "system", content: request.system },
          { role: "user", content: request.user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: request.schemaName, strict: true, schema: request.schema },
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenRouter request failed: HTTP ${response.status} ${await response.text()}`);
    }
    const result = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = result.choices?.[0]?.message?.content ?? "";
    return parseJson(text, request.schemaName);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    signal,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_output_tokens: max,
      input: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      text: {
        format: {
          type: "json_schema",
          name: request.schemaName,
          strict: true,
          schema: request.schema,
        },
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`OpenAI request failed: HTTP ${response.status} ${await response.text()}`);
  }
  const result = (await response.json()) as {
    output?: { content?: { type: string; text?: string }[] }[];
  };
  const text = (result.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((part) => part.type === "output_text")
    .map((part) => part.text ?? "")
    .join("");
  if (!text) {
    throw new Error(`OpenAI returned no text for ${request.schemaName}.`);
  }
  return parseJson(text, request.schemaName);
};

/** Hand-written because strict structured output needs every field required. */
export const SIGNALS_JSON_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["signals"],
  properties: {
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["claim", "stance", "severity", "relevance", "sourceId", "quote"],
        properties: {
          claim: { type: "string" },
          stance: { type: "string", enum: ["supports", "contradicts", "context"] },
          severity: { type: "string", enum: ["blocker", "warning", "info"] },
          relevance: { type: "number" },
          sourceId: { type: "string" },
          quote: { type: "string" },
        },
      },
    },
  },
};

export const VERDICT_JSON_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status", "confidence", "headline", "profileSummary", "findings", "counterProposal"],
  properties: {
    status: { type: "string", enum: ["aligned", "needs_check", "conflict"] },
    confidence: { type: "number" },
    headline: { type: "string" },
    profileSummary: { type: "array", items: { type: "string" } },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "statement", "why", "sourceIds"],
        properties: {
          severity: { type: "string", enum: ["blocker", "warning", "info"] },
          statement: { type: "string" },
          why: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
      },
    },
    counterProposal: { type: "string" },
  },
};
