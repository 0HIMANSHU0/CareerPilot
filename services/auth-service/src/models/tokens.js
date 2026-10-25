const mongoose = require('mongoose');

// Rotating refresh tokens. Only a SHA-256 hash is stored; `family` links rotations for reuse detection.
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// One-time tokens for password reset and email verification.
const userTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, enum: ['RESET_PASSWORD', 'VERIFY_EMAIL'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
userTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = {
  RefreshToken: mongoose.model('RefreshToken', refreshTokenSchema),
  UserToken: mongoose.model('UserToken', userTokenSchema),
};
