const mongoose = require('mongoose');

const RecommendationSchema = new mongoose.Schema({
  stockName: { type: String, required: true },
  action: { type: String, required: true },
  reason: { type: String, default: '' },
  taxImpact: { type: String, default: '' },
}, { _id: false });

const TaxAnalysisSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['gain-harvest', 'loss-harvest', 'general'],
    required: true,
  },
  eligibleAssets: { type: Array, default: [] },
  aiExplanation: { type: String, default: '' },
  aiRecommendations: [RecommendationSchema],
  summary: {
    totalPotentialTaxSaved: { type: Number, default: 0 },
    ltcgExemptionUsed: { type: Number, default: 0 },
    ltcgExemptionLimit: { type: Number, default: 100000 },
    totalLossToBook: { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Keep only the latest analysis per user+type
TaxAnalysisSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('TaxAnalysis', TaxAnalysisSchema);
