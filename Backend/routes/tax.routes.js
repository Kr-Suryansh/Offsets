const express = require('express');
const router = express.Router();
const taxController = require('../controllers/tax.controller');

// @route   POST /api/tax/analyze
// @desc    Analyze portfolio
router.post('/analyze', taxController.analyzePortfolio);

// @route   POST /api/tax/harvest-loss
// @desc    Get Tax-Loss Harvesting Strategy
router.post('/harvest-loss', taxController.harvestLoss);

// @route   POST /api/tax/harvest-gain
// @desc    Get Tax-Gain Harvesting Strategy
router.post('/harvest-gain', taxController.harvestGain);

module.exports = router;
