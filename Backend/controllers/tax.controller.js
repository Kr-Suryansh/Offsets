/**
 * tax.controller.js
 * Reads portfolio from DB, runs AI analysis, persists results.
 */
const Portfolio = require('../models/Portfolio');
const TaxAnalysis = require('../models/TaxAnalysis');
const taxCalculatorService = require('../services/taxCalculator.service');
const aiService = require('../services/ai.service');

const LOSS_HARVESTING_PROMPT = `
You are a Senior Tax Strategist and Portfolio Optimizer AI. 

CONTEXT: 
The user is looking to execute a "Tax-Loss Harvesting" strategy. Your backend system has already calculated all holding periods, profits, and losses. The user wants to offset their taxable capital gains by selling underperforming assets.

INPUT DATA: 
You will receive a JSON array of the user's current loss-making investments, including holding periods (STCG/LTCG) and exact loss amounts.

YOUR DIRECTIVES:
1. DO NOT perform any mathematical calculations. Rely entirely on the numbers provided in the input.
2. Analyze the provided portfolio and recommend specific assets to SELL to harvest losses.
3. Prioritize Short-Term losses to offset Short-Term gains first, if applicable.
4. Briefly mention the "Wash Sale Rule" (or regional equivalent) as a standard risk warning in your explanation.

OUTPUT FORMAT:
You must return exactly TWO sections. Do not include any extra conversational filler.

Explanation:
[Write 2-3 concise paragraphs of human-readable financial reasoning explaining why harvesting these specific losses is beneficial and how it reduces immediate tax liability.]

Structured Data:
Return valid JSON with "explanation" and "recommendations" array. Each recommendation must have stockName, action, reason, taxImpact.
`;

const GAIN_HARVESTING_PROMPT = `
You are an Elite Wealth Management AI specializing in Capital Gains Optimization.

CONTEXT:
The user wants to execute a "Tax-Gain Harvesting" strategy. Your backend system has already calculated holding periods and classified assets into Short-Term Capital Gains (STCG) and Long-Term Capital Gains (LTCG). The goal is to maximize retained profit by minimizing the tax rate applied to these gains.

INPUT DATA:
You will receive a JSON array of the user's profitable investments, including their STCG/LTCG classification, holding days, and unrealized profit. 

YOUR DIRECTIVES:
1. DO NOT perform any mathematical calculations. Rely entirely on the provided input data.
2. Apply the following decision rules:
   - WAIT: If an asset is near the LTCG threshold (e.g., 340+ days), advise waiting to unlock the lower long-term tax rate.
   - SELL: If an asset has already reached LTCG status and locking in profits aligns with lower tax bracket advantages (basis resetting).
   - HOLD: If an asset is strictly STCG with high tax implications, unless selling is strategically necessary.
3. Explain the logic of timing the market strictly from a tax-efficiency standpoint.

OUTPUT FORMAT:
Return valid JSON with "explanation" and "recommendations" array. Each recommendation must have stockName, action, reason, taxImpact.
`;

const GENERAL_ANALYSIS_PROMPT = `
You are an expert tax advisor. 
Analyze the overall portfolio and provide a summary of the tax implications (STCG vs LTCG exposure and overall unrealized profit/loss).
Return valid JSON with "explanation" and "recommendations" array.
`;

/**
 * Helper: get assets from DB for this user
 */
async function getUserAssets(userId) {
  const portfolio = await Portfolio.findOne({ user: userId });
  if (!portfolio || !portfolio.assets || portfolio.assets.length === 0) {
    return null;
  }
  return portfolio.assets.map(a => ({
    stockName: a.stockName,
    symbol: a.symbol,
    buyPrice: a.buyPrice,
    currentPrice: a.currentPrice,
    buyDate: a.buyDate,
    quantity: a.quantity,
  }));
}

/**
 * Run full portfolio analysis, save to DB
 */
exports.analyzePortfolio = async (req, res) => {
  try {
    // Support both: body assets (legacy) or DB read (pipeline)
    let rawAssets = req.body.assets;
    if (!rawAssets && req.user) {
      rawAssets = await getUserAssets(req.user.id);
    }
    if (!rawAssets || rawAssets.length === 0) {
      return res.status(400).json({ message: 'No assets found. Sync your portfolio first.' });
    }

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    const cleanAssets = processedAssets.map(a => ({
      symbol: a.stockName, unrealizedPnL: a.unrealizedPnL,
      classification: a.classification, holdingDays: a.holdingPeriod
    }));

    const aiStrategy = await aiService.getAIStrategy(GENERAL_ANALYSIS_PROMPT, cleanAssets);

    // Save to DB if user is authenticated
    if (req.user) {
      await TaxAnalysis.findOneAndUpdate(
        { user: req.user.id, type: 'general' },
        {
          user: req.user.id,
          type: 'general',
          eligibleAssets: processedAssets,
          aiExplanation: aiStrategy.textExplanation,
          aiRecommendations: Array.isArray(aiStrategy.parsedJson) ? aiStrategy.parsedJson : [],
          createdAt: Date.now(),
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({ success: true, data: processedAssets, aiStrategy });
  } catch (error) {
    console.error('analyzePortfolio error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Tax-Loss Harvesting: filter losses, run AI, save to DB
 */
exports.harvestLoss = async (req, res) => {
  try {
    let rawAssets = req.body.assets;
    if (!rawAssets && req.user) {
      rawAssets = await getUserAssets(req.user.id);
    }
    if (!rawAssets) return res.status(400).json({ message: 'No assets found. Sync your portfolio first.' });

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    const lossAssets = processedAssets.filter(a => a.unrealizedPnL < 0);

    if (lossAssets.length === 0) {
      // Save empty result
      if (req.user) {
        await TaxAnalysis.findOneAndUpdate(
          { user: req.user.id, type: 'loss-harvest' },
          { user: req.user.id, type: 'loss-harvest', eligibleAssets: [], aiExplanation: 'No losses to harvest.', aiRecommendations: [], createdAt: Date.now() },
          { upsert: true, new: true }
        );
      }
      return res.status(200).json({
        success: true, eligibleAssets: [],
        message: 'No loss-making assets available for tax-loss harvesting.',
        aiStrategy: { textExplanation: 'No losses to harvest.', parsedJson: [] }
      });
    }

    const cleanAssets = lossAssets.map(a => ({
      symbol: a.stockName, unrealizedPnL: a.unrealizedPnL,
      classification: a.classification, holdingDays: a.holdingPeriod
    }));

    const aiStrategy = await aiService.getAIStrategy(LOSS_HARVESTING_PROMPT, cleanAssets);

    // Persist AI results
    const totalLoss = lossAssets.reduce((sum, a) => sum + Math.abs(a.unrealizedPnL), 0);
    if (req.user) {
      await TaxAnalysis.findOneAndUpdate(
        { user: req.user.id, type: 'loss-harvest' },
        {
          user: req.user.id,
          type: 'loss-harvest',
          eligibleAssets: lossAssets,
          aiExplanation: aiStrategy.textExplanation,
          aiRecommendations: Array.isArray(aiStrategy.parsedJson) ? aiStrategy.parsedJson : [],
          summary: { totalLossToBook: totalLoss },
          createdAt: Date.now(),
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({ success: true, eligibleAssets: lossAssets, aiStrategy });
  } catch (error) {
    console.error('harvestLoss error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Tax-Gain Harvesting: filter LTCG profits, run AI, save to DB
 */
exports.harvestGain = async (req, res) => {
  try {
    let rawAssets = req.body.assets;
    if (!rawAssets && req.user) {
      rawAssets = await getUserAssets(req.user.id);
    }
    if (!rawAssets) return res.status(400).json({ message: 'No assets found. Sync your portfolio first.' });

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    const profitableAssets = processedAssets.filter(a => a.classification === 'LTCG' && a.unrealizedPnL > 0);

    if (profitableAssets.length === 0) {
      if (req.user) {
        await TaxAnalysis.findOneAndUpdate(
          { user: req.user.id, type: 'gain-harvest' },
          { user: req.user.id, type: 'gain-harvest', eligibleAssets: [], aiExplanation: 'No eligible LTCG profits to harvest.', aiRecommendations: [], createdAt: Date.now() },
          { upsert: true, new: true }
        );
      }
      return res.status(200).json({
        success: true, eligibleAssets: [],
        message: 'No profitable LTCG assets available for tax-gain harvesting.',
        aiStrategy: { textExplanation: 'No eligible LTCG profits to harvest.', parsedJson: [] }
      });
    }

    const cleanAssets = profitableAssets.map(a => ({
      symbol: a.stockName, unrealizedPnL: a.unrealizedPnL,
      classification: a.classification, holdingDays: a.holdingPeriod
    }));

    const aiStrategy = await aiService.getAIStrategy(GAIN_HARVESTING_PROMPT, cleanAssets);

    const totalGain = profitableAssets.reduce((sum, a) => sum + a.unrealizedPnL, 0);
    if (req.user) {
      await TaxAnalysis.findOneAndUpdate(
        { user: req.user.id, type: 'gain-harvest' },
        {
          user: req.user.id,
          type: 'gain-harvest',
          eligibleAssets: profitableAssets,
          aiExplanation: aiStrategy.textExplanation,
          aiRecommendations: Array.isArray(aiStrategy.parsedJson) ? aiStrategy.parsedJson : [],
          summary: { ltcgExemptionUsed: Math.min(totalGain, 100000), ltcgExemptionLimit: 100000, totalPotentialTaxSaved: Math.min(totalGain, 100000) * 0.1 },
          createdAt: Date.now(),
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({ success: true, eligibleAssets: profitableAssets, aiStrategy });
  } catch (error) {
    console.error('harvestGain error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET stored AI analysis results from DB (no AI call)
 */
exports.getResults = async (req, res) => {
  try {
    const results = await TaxAnalysis.find({ user: req.user.id }).sort({ createdAt: -1 });

    const gainResult = results.find(r => r.type === 'gain-harvest');
    const lossResult = results.find(r => r.type === 'loss-harvest');

    return res.status(200).json({
      success: true,
      gainHarvesting: {
        explanation: gainResult?.aiExplanation || '',
        recommendations: gainResult?.aiRecommendations || [],
        eligibleAssets: gainResult?.eligibleAssets || [],
        summary: gainResult?.summary || {},
        analyzedAt: gainResult?.createdAt || null,
      },
      lossHarvesting: {
        explanation: lossResult?.aiExplanation || '',
        recommendations: lossResult?.aiRecommendations || [],
        eligibleAssets: lossResult?.eligibleAssets || [],
        summary: lossResult?.summary || {},
        analyzedAt: lossResult?.createdAt || null,
      },
    });
  } catch (error) {
    console.error('getResults error:', error);
    res.status(500).json({ message: error.message });
  }
};
