const mongoose = require('mongoose');

const toJSON = {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};
const { ObjectId } = mongoose.Schema.Types;

// Sessions and messages are separate collections: messages grow unbounded, sessions are listed often.
const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, required: true },
    title: { type: String, required: true, maxlength: 120 },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: Date,
    usage: { promptTokens: { type: Number, default: 0 }, completionTokens: { type: Number, default: 0 } },
  },
  { timestamps: true, toJSON },
);
chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const chatMessageSchema = new mongoose.Schema(
  {
    sessionId: { type: ObjectId, required: true },
    userId: { type: ObjectId, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    status: { type: String, enum: ['complete', 'error'], default: 'complete' },
    usage: { promptTokens: Number, completionTokens: Number },
    model: String,
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON },
);
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = {
  ChatSession: mongoose.model('ChatSession', chatSessionSchema),
  ChatMessage: mongoose.model('ChatMessage', chatMessageSchema),
  toJSON,
};
