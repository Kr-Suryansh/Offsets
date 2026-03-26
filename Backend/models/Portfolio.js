const mongoose = require('mongoose');

const HoldingSchema = new mongoose.Schema({
  tradingSymbol: {
    type: String,
    required: true,
  },
  exchange: {
    type: String,
    default: 'NSE',
  },
  isin: {
    type: String,
    default: '',
  },
  quantity: {
    type: Number,
    required: true,
  },
  product: {
    type: String,
    enum: ['Delivered', 'Not Delivered'],
    default: 'Delivered',
  },
  averagePrice: {
    type: Number,
    default: 0,
  },
  profitandloss: {
    type: Number,
    default: 0,
  },
  pnlpercentage: {
    type: Number,
    default: 0,
  },
  dateOfPurchase: {
    type: Date,
    default: Date.now,
  },
});

const PortfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  holdings: [HoldingSchema],
  lastSyncedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Portfolio', PortfolioSchema);
