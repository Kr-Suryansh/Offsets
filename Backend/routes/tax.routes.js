const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const taxController = require('../controllers/tax.controller');

// @route   POST /api/tax/analyze
// @desc    Run full portfolio analysis (reads from DB if authenticated)
router.post('/analyze', auth, taxController.analyzePortfolio);

// @route   POST /api/tax/harvest-loss
// @desc    Run Tax-Loss Harvesting AI analysis
router.post('/harvest-loss', auth, taxController.harvestLoss);

// @route   POST /api/tax/harvest-gain
// @desc    Run Tax-Gain Harvesting AI analysis
router.post('/harvest-gain', auth, taxController.harvestGain);

// @route   GET /api/tax/results
// @desc    Get latest stored AI analysis results from DB (no AI call)
router.get('/results', auth, taxController.getResults);

module.exports = router;
