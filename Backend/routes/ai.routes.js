const express = require('express');
const router = express.Router();
const strategyController = require('../controllers/strategy.controller');

// @route   POST /api/ai/explain
// @desc    Get AI standalone action explanation
router.post('/explain', strategyController.explainAction);

module.exports = router;
