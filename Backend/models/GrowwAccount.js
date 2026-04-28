const mongoose = require('mongoose');

/**
 * Stores the user's Groww access token (encrypted at rest).
 * One account per user — upserted on each link/refresh.
 *
 * Token auth flow (Groww docs):
 *   - User generates a Bearer access token from Groww dashboard
 *   - Token expires daily at 6:00 AM IST
 *   - User must re-paste token after expiry
 */
const GrowwAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  // AES-256-CBC encrypted: "iv_hex:ciphertext_hex"
  accessTokenEnc: {
    type: String,
    required: true,
  },
  // Masked token shown in UI: "••••••••••••abcd"
  tokenMask: {
    type: String,
    default: '',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastSyncedAt: {
    type: Date,
    default: null,
  },
  linkedAt:  { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

GrowwAccountSchema.index({ user: 1 });

module.exports = mongoose.model('GrowwAccount', GrowwAccountSchema);
