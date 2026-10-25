const mongoose = require('mongoose');
const { RESUME_TEMPLATES } = require('@careerpilot/shared/constants');
const { toJSON } = require('./chat');

const { ObjectId, Mixed } = mongoose.Schema.Types;
const templateEnum = Object.values(RESUME_TEMPLATES);

// Structured content only (validated by resumeDataSchema at the API boundary); templates are applied at render time.
const resumeSchema = new mongoose.Schema(
  {
    userId: { type: ObjectId, required: true },
    title: { type: String, required: true, maxlength: 120 },
    templateId: { type: String, enum: templateEnum, required: true },
    data: { type: Mixed, required: true },
    version: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, toJSON, minimize: false },
);
resumeSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 });

// Immutable snapshots for version history (separate collection keeps resume docs small).
const resumeVersionSchema = new mongoose.Schema(
  {
    resumeId: { type: ObjectId, required: true },
    userId: { type: ObjectId, required: true },
    version: { type: Number, required: true },
    title: String,
    templateId: { type: String, enum: templateEnum },
    data: { type: Mixed, required: true },
    note: { type: String, maxlength: 120 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON, minimize: false },
);
resumeVersionSchema.index({ resumeId: 1, version: -1 }, { unique: true });

module.exports = {
  Resume: mongoose.model('Resume', resumeSchema),
  ResumeVersion: mongoose.model('ResumeVersion', resumeVersionSchema),
};
