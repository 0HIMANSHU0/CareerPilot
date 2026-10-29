const { GoogleGenAI } = require('@google/genai');
const model = process.argv[2] || 'gemini-flash-lite-latest';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const t0 = Date.now();
const ms = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;
const abort = () => ({ abortSignal: AbortSignal.timeout(60000) });

(async () => {
  console.log('model:', model);
  try {
    const r = await ai.models.generateContent({ model, contents: 'Reply with one short sentence.', config: abort() });
    console.log(ms(), 'NON-STREAM OK:', r.text);
  } catch (e) { console.log(ms(), 'NON-STREAM FAIL:', e.status, e.message); }
  try {
    const s = await ai.models.generateContentStream({ model, contents: 'Give 3 resume tips', config: abort() });
    console.log(ms(), 'stream opened');
    for await (const c of s) console.log(ms(), 'chunk:', JSON.stringify(c.text?.slice(0, 40)));
  } catch (e) { console.log(ms(), 'STREAM FAIL:', e.status, e.message); }
})();