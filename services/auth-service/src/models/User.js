const mongoose = require('mongoose');
const { ROLES } = require('@careerpilot/shared/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true, select: false },
    emailVerified: { type: Boolean, default: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.USER, index: true },
    profile: {
      headline: { type: String, maxlength: 120 },
      bio: { type: String, maxlength: 2000 },
      location: { type: String, maxlength: 120 },
      linkedinUrl: { type: String },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

module.exports = mongoose.model('User', userSchema);
