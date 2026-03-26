const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const portfolioController = require('../controllers/portfolio.controller');

// @route   POST /api/portfolio/sync
// @desc    Sync portfolio from broker data
// @access  Private
router.post('/sync', auth, portfolioController.syncPortfolio);

// @route   GET /api/portfolio
// @desc    Get user's saved portfolio
// @access  Private
router.get('/', auth, portfolioController.getPortfolio);

module.exports = router;
