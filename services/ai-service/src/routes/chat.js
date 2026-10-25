const express = require('express');
const { createChatSessionSchema, renameChatSessionSchema, sendMessageSchema, objectIdSchema } = require('@careerpilot/shared');
const { validate, requireRole, errors } = require('@careerpilot/service-kit');
const { ChatSession, ChatMessage } = require('../models/chat');
const llm = require('../llm');
const env = require('../config');
const { aiLimiter } = require('../limits');

const router = express.Router();
router.use(requireRole('USER', 'ADMIN'));

const SYSTEM_PROMPT =
  'You are CareerPilot, a practical and encouraging career coach. Give concise, specific, actionable advice ' +
  'about resumes, interviews, job search, salary negotiation and career growth. Use short paragraphs or lists. ' +
  'If a question is unrelated to careers, briefly steer back to career topics.';

const idParam = validate({ params: require('zod').z.object({ id: objectIdSchema }) });

// Every query is scoped by userId, so users can only reach their own sessions.
async function ownSession(req) {
  const session = await ChatSession.findOne({ _id: req.params.id, userId: req.user.id });
  if (!session) throw errors.notFound('Chat session not found');
  return session;
}

router.get('/sessions', async (req, res) => {
  const items = await ChatSession.find({ userId: req.user.id }).sort({ updatedAt: -1 }).limit(100);
  res.json({ items });
});

router.post('/sessions', validate({ body: createChatSessionSchema }), async (req, res) => {
  const session = await ChatSession.create({ userId: req.user.id, title: req.body.title || 'New conversation' });
  res.status(201).json({ session });
});

router.get('/sessions/:id', idParam, async (req, res) => {
  const session = await ownSession(req);
  const messages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 }).limit(500);
  res.json({ session, messages });
});

router.patch('/sessions/:id', idParam, validate({ body: renameChatSessionSchema }), async (req, res) => {
  const session = await ownSession(req);
  session.title = req.body.title;
  await session.save();
  res.json({ session });
});

router.delete('/sessions/:id', idParam, async (req, res) => {
  const session = await ownSession(req);
  await Promise.all([ChatMessage.deleteMany({ sessionId: session._id }), session.deleteOne()]);
  res.status(204).end();
});

// Send a message and stream the reply as Server-Sent Events:
// save user msg -> load context -> call LLM (stream) -> save assistant msg + usage -> "done" event.
router.post('/sessions/:id/messages', idParam, aiLimiter, validate({ body: sendMessageSchema }), async (req, res) => {
  const session = await ownSession(req);
  const userMessage = await ChatMessage.create({ sessionId: session._id, userId: req.user.id, role: 'user', content: req.body.content });

  const history = await ChatMessage.find({ sessionId: session._id, status: 'complete' })
    .sort({ createdAt: -1 })
    .limit(env.CHAT_CONTEXT_MESSAGES);
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.reverse().map((m) => ({ role: m.role, content: m.content })),
  ];

  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no', Connection: 'keep-alive' });
  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  send({ type: 'user_message', message: userMessage });

  const abort = new AbortController();
  res.on('close', () => abort.abort());
  let text = '';
  let usage = { promptTokens: 0, completionTokens: 0 };
  try {
    for await (const ev of llm.streamChat(messages, { signal: abort.signal })) {
      if (ev.type === 'delta') {
        text += ev.content;
        send(ev);
      } else usage = ev.usage;
    }
    if (!text.trim()) throw errors.badRequest('The AI returned an empty response.');
    const assistant = await ChatMessage.create({
      sessionId: session._id, userId: req.user.id, role: 'assistant', content: text, usage, model: llm.model(),
    });
    const update = {
      $inc: { messageCount: 2, 'usage.promptTokens': usage.promptTokens, 'usage.completionTokens': usage.completionTokens },
      $set: { lastMessageAt: new Date() },
    };
    if (session.messageCount === 0 && session.title === 'New conversation') update.$set.title = req.body.content.slice(0, 60);
    const updated = await ChatSession.findByIdAndUpdate(session._id, update, { new: true });
    send({ type: 'done', message: assistant, session: updated });
  } catch (err) {
    req.log.warn({ err: err.message }, 'Chat completion failed');
    // Keep the user's message but mark it so it is excluded from future context.
    await ChatMessage.updateOne({ _id: userMessage._id }, { status: 'error' });
    await ChatSession.updateOne({ _id: session._id }, { $inc: { messageCount: 1 }, $set: { lastMessageAt: new Date() } });
    send({ type: 'error', code: err.code || 'AI_ERROR', message: err.status ? err.message : 'The AI assistant failed. Please try again.' });
  }
  res.end();
});

module.exports = router;
