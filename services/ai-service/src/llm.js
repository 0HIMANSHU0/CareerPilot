// LLM client for an OpenAI-compatible chat completions API, with MOCK mode, timeouts and retries.
const { AppError } = require('@careerpilot/service-kit');
const env = require('./config');

const MOCK = !env.EMERGENT_LLM_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);

function providerError(status) {
  if (status === 429) return new AppError(429, 'AI_RATE_LIMITED', 'The AI provider is busy. Please try again in a moment.');
  if (status === 401 || status === 403) return new AppError(502, 'AI_AUTH_FAILED', 'The AI provider rejected our credentials.');
  return new AppError(502, 'AI_PROVIDER_ERROR', 'The AI provider failed to respond. Please try again.');
}

// POST with retry/backoff on transient errors (only before any tokens are streamed).
async function request(body, signal) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.EMERGENT_LLM_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: env.LLM_MODEL, ...body }),
        signal,
      });
    } catch (err) {
      if (signal.aborted) throw new AppError(504, 'AI_TIMEOUT', 'The AI took too long to respond. Please try again.');
      if (attempt >= env.LLM_MAX_RETRIES) throw new AppError(502, 'AI_UNREACHABLE', 'Could not reach the AI provider.');
      await sleep(500 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res;
    if (!RETRYABLE.has(res.status) || attempt >= env.LLM_MAX_RETRIES) throw providerError(res.status);
    await sleep(Number(res.headers.get('retry-after')) * 1000 || 500 * 2 ** attempt);
  }
}

async function* mockStream(messages) {
  const last = messages[messages.length - 1]?.content || '';
  const text =
    `**[MOCK AI]** No LLM key is configured, so this is a canned reply.\n\nYou asked: "${last.slice(0, 120)}"\n\n` +
    '1. Clarify the role you are targeting.\n2. Quantify achievements in your resume.\n3. Practise answers with the STAR method.';
  for (const word of text.split(/(\s+)/)) {
    await sleep(15);
    yield { type: 'delta', content: word };
  }
  yield { type: 'usage', usage: { promptTokens: 0, completionTokens: 0 } };
}

// Async generator of { type: 'delta', content } and a final { type: 'usage', usage }.
async function* streamChat(messages, { signal: outer } = {}) {
  if (MOCK) return yield* mockStream(messages);
  const signal = AbortSignal.any([AbortSignal.timeout(env.LLM_TIMEOUT_MS), ...(outer ? [outer] : [])]);
  const res = await request({ messages, stream: true, stream_options: { include_usage: true }, max_tokens: 2000 }, signal);
  const decoder = new TextDecoder();
  let buffer = '';
  let usage = { promptTokens: 0, completionTokens: 0 };
  try {
    for await (const chunk of res.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let json;
        try {
          json = JSON.parse(payload);
        } catch {
          continue; // tolerate malformed chunks
        }
        const content = json.choices?.[0]?.delta?.content;
        if (content) yield { type: 'delta', content };
        if (json.usage) usage = { promptTokens: json.usage.prompt_tokens || 0, completionTokens: json.usage.completion_tokens || 0 };
      }
    }
  } catch (err) {
    if (signal.aborted) throw new AppError(504, 'AI_TIMEOUT', 'The AI response timed out.');
    throw err;
  }
  yield { type: 'usage', usage };
}

// Non-streaming completion returning parsed JSON (used for structured resume content).
async function completeJSON(messages, mockValue) {
  if (MOCK) return mockValue();
  const res = await request({ messages, max_tokens: 4000 }, AbortSignal.timeout(env.LLM_TIMEOUT_MS));
  const body = await res.json().catch(() => null);
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== 'string') throw new AppError(502, 'AI_BAD_RESPONSE', 'The AI returned an empty response.');
  const match = text.match(/\{[\s\S]*\}/);
  try {
    return JSON.parse(match ? match[0] : text);
  } catch {
    throw new AppError(502, 'AI_BAD_RESPONSE', 'The AI returned malformed content. Please try again.');
  }
}

module.exports = { streamChat, completeJSON, MOCK, model: () => (MOCK ? 'mock' : env.LLM_MODEL) };
