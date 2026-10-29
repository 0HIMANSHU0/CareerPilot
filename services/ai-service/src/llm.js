// LLM client for the Google Gemini API (@google/genai), with MOCK mode, timeouts, retries and model fallback.
const { GoogleGenAI } = require("@google/genai");
const { AppError } = require("@careerpilot/service-kit");
const env = require("./config");

const MOCK = !env.GEMINI_API_KEY;
const ai = MOCK ? null : new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

// LLM_MODEL can be a comma-separated list: first = preferred, rest = fallbacks.
const MODELS = String(env.LLM_MODEL || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const OPEN_TIMEOUT_MS = Number(env.LLM_OPEN_TIMEOUT_MS) || 15000; // max wait for the FIRST response
const MAX_RETRIES = Number(env.LLM_MAX_RETRIES) || 1; // extra tries per model for 429/5xx
let lastUsedModel = MODELS[0];

function providerError(status) {
  if (status === 429)
    return new AppError(429, "AI_RATE_LIMITED", "The AI provider is busy. Please try again in a moment.");
  if (status === 401 || status === 403 || status === 400)
    return new AppError(502, "AI_AUTH_FAILED", "The AI provider rejected our request or credentials.");
  return new AppError(502, "AI_PROVIDER_ERROR", "The AI provider failed to respond. Please try again.");
}

// Run fn(), retrying transient failures (429/5xx/network) with exponential backoff.
async function withRetry(fn, signal) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      console.error("[gemini] attempt", attempt, "status:", err.status, "message:", String(err.message).slice(0, 200));
      if (signal?.aborted) throw new AppError(504, "AI_TIMEOUT", "The AI took too long to respond. Please try again.");
      if (err instanceof AppError) throw err; // already normalised (e.g. open timeout): don't retry this model
      const status = err.status;
      const transient = status === undefined || RETRYABLE.has(status);
      if (!transient || attempt >= MAX_RETRIES) {
        throw status === undefined
          ? new AppError(502, "AI_UNREACHABLE", "Could not reach the AI provider.")
          : providerError(status);
      }
      await sleep(500 * 2 ** attempt);
    }
  }
}

// Try each model in order; move to the next if one is overloaded or unresponsive.
async function withFallback(run, signal) {
  let lastErr;
  for (const model of MODELS) {
    try {
      const result = await withRetry(() => run(model), signal);
      lastUsedModel = model;
      return result;
    } catch (err) {
      lastErr = err;
      if (signal.aborted || err.code === "AI_AUTH_FAILED") throw err; // no point trying other models
      console.warn(`[gemini] model ${model} failed (${err.code}), trying next`);
    }
  }
  throw lastErr;
}

// Open a stream, but give up if nothing arrives within OPEN_TIMEOUT_MS.
// The timer is cleared once the stream is open, so long answers are not cut off.
async function openStream(model, params, signal) {
  const ctl = new AbortController();
  let timedOut = false;
  signal.addEventListener("abort", () => ctl.abort(), { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    ctl.abort();
  }, OPEN_TIMEOUT_MS);
  try {
    return await ai.models.generateContentStream({
      model,
      ...params,
      config: { ...params.config, abortSignal: ctl.signal },
    });
  } catch (err) {
    if (timedOut) throw new AppError(504, "AI_OPEN_TIMEOUT", "The AI did not respond in time.");
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Convert our OpenAI-style messages into Gemini's shape:
//  - system prompt -> separate systemInstruction
//  - 'assistant'   -> 'model'
//  - each message  -> { role, parts: [{ text }] }
function toGemini(messages) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = [];
  for (const m of messages) {
    if (m.role === "system") continue;
    const role = m.role === "assistant" ? "model" : "user";
    const last = contents[contents.length - 1];
    if (last && last.role === role) last.parts[0].text += `\n\n${m.content}`; // merge same-role neighbours
    else contents.push({ role, parts: [{ text: m.content }] });
  }
  while (contents[0]?.role === "model") contents.shift(); // conversation must start with the user
  return { system, contents };
}

async function* mockStream(messages) {
  const last = messages[messages.length - 1]?.content || "";
  const text =
    `**[MOCK AI]** No LLM key is configured, so this is a canned reply.\n\nYou asked: "${last.slice(0, 120)}"\n\n` +
    "1. Clarify the role you are targeting.\n2. Quantify achievements in your resume.\n3. Practise answers with the STAR method.";
  for (const word of text.split(/(\s+)/)) {
    await sleep(15);
    yield { type: "delta", content: word };
  }
  yield { type: "usage", usage: { promptTokens: 0, completionTokens: 0 } };
}

// Async generator of { type: 'delta', content } and a final { type: 'usage', usage }.
async function* streamChat(messages, { signal: outer } = {}) {
  if (MOCK) return yield* mockStream(messages);
  const signal = AbortSignal.any([AbortSignal.timeout(env.LLM_TIMEOUT_MS), ...(outer ? [outer] : [])]);
  const { system, contents } = toGemini(messages);
  const params = { contents, config: { systemInstruction: system, maxOutputTokens: 2000 } };

  // Retry/fallback only wrap *opening* the stream; once text is flowing we must not restart.
  const stream = await withFallback((model) => openStream(model, params, signal), signal);

  let usage = { promptTokens: 0, completionTokens: 0 };
  try {
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) yield { type: "delta", content: text };
      if (chunk.usageMetadata) {
        usage = {
          promptTokens: chunk.usageMetadata.promptTokenCount || 0,
          completionTokens: chunk.usageMetadata.candidatesTokenCount || 0,
        };
      }
    }
  } catch (err) {
    if (signal.aborted) throw new AppError(504, "AI_TIMEOUT", "The AI response timed out.");
    throw err;
  }
  yield { type: "usage", usage };
}

// Non-streaming completion returning parsed JSON (used for structured resume content).
async function completeJSON(messages, mockValue) {
  if (MOCK) return mockValue();
  const signal = AbortSignal.timeout(env.LLM_TIMEOUT_MS);
  const { system, contents } = toGemini(messages);
  const res = await withFallback(
    (model) =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system,
          maxOutputTokens: 4000,
          responseMimeType: "application/json", // forces valid JSON, no regex needed
          abortSignal: AbortSignal.any([signal, AbortSignal.timeout(OPEN_TIMEOUT_MS * 2)]),
        },
      }),
    signal,
  );
  const text = res.text;
  if (typeof text !== "string" || !text)
    throw new AppError(502, "AI_BAD_RESPONSE", "The AI returned an empty response.");
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError(502, "AI_BAD_RESPONSE", "The AI returned malformed content. Please try again.");
  }
}

module.exports = {
  streamChat,
  completeJSON,
  MOCK,
  model: () => (MOCK ? "mock" : lastUsedModel),
};