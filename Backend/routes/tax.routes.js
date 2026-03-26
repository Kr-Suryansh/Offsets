const express = require('express');
const router = express.Router();
const taxController = require('../controllers/tax.controller');
const strategyController = require('../controllers/strategy.controller');

// @route   POST /api/tax/analyze
// @desc    Analyze portfolio
// @access  Public
router.post('/analyze', taxController.analyzePortfolio);

// @route   POST /api/tax/harvest-loss
// @desc    Get Tax-Loss Harvesting Strategy
// @access  Public
router.post('/harvest-loss', taxController.harvestLoss);

// @route   POST /api/tax/harvest-gain
// @desc    Get Tax-Gain Harvesting Strategy
// @access  Public
router.post('/harvest-gain', taxController.harvestGain);

// @route   POST /api/tax/gifting-analysis
// @desc    Evaluate gifting strategy
router.post('/gifting-analysis', strategyController.giftingAnalysis);

// @route   POST /api/tax/strategy-optimize
// @desc    Full Strategy Engine
router.post('/strategy-optimize', strategyController.strategyOptimize);

// @route   POST /api/ai/explain
// @desc    Get AI standalone action explanation
router.post('/explain', strategyController.explainAction);

module.exports = router;
