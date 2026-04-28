const mongoose = require('mongoose');

/**
 * Holdings are now sourced exclusively from the Account Aggregator (AA) backend.
 * Fields align with the AA normalized schema.
 */
const HoldingSchema = new mongoose.Schema({
  isin:          { type: String, required: true },
  symbol:        { type: String, default: '' },
  name:          { type: String, default: '' },
  quantity:      { type: Number, required: true },
  avgPrice:      { type: Number, default: 0 },
  currentPrice:  { type: Number, default: 0 },
  dateOfPurchase:{ type: Date, required: true },
  source:        { type: String, default: 'AA' },
}, { _id: false });

const PortfolioSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  holdings:    [HoldingSchema],
  lastSyncedAt:{ type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

PortfolioSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model('Portfolio', PortfolioSchema);
