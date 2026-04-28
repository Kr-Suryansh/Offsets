/**
 * tax.controller.js
 * Reads portfolio from DB, runs tax calculations, calls AI, persists results.
 * No broker-specific logic — data comes from AA-synced portfolio.
 */
const Portfolio     = require('../models/Portfolio');
const TaxAnalysis   = require('../models/TaxAnalysis');
const taxCalculator = require('../services/taxCalculator.service');
const aiService     = require('../services/ai.service');

// ─── AI Prompts ───────────────────────────────────────────────────────────────

const PROMPTS = {
  general: `You are an expert tax advisor. Analyze the portfolio and summarize STCG vs LTCG exposure and overall unrealized profit/loss. Return valid JSON with "explanation" (string) and "recommendations" (array of { stockName, action, reason, taxImpact }).`,

  lossHarvest: `You are a Senior Tax Strategist. The user wants to execute Tax-Loss Harvesting to offset taxable capital gains.
INPUT: JSON array of loss-making investments with holding periods and loss amounts.
RULES:
1. Do NOT recalculate numbers — use the provided data.
2. Recommend specific assets to SELL to harvest losses.
3. Prioritize Short-Term losses to offset Short-Term gains first.
4. Mention the Wash Sale Rule as a standard risk warning.
Return valid JSON with "explanation" (string) and "recommendations" (array of { stockName, action, reason, taxImpact }).`,

  gainHarvest: `You are an Elite Wealth Management AI specializing in Capital Gains Optimization.
INPUT: JSON array of profitable LTCG investments.
RULES:
1. Do NOT recalculate numbers — use the provided data.
2. Apply: WAIT if near LTCG threshold (340+ days), SELL if already LTCG, HOLD if strictly STCG.
3. Explain timing from a tax-efficiency standpoint only.
Return valid JSON with "explanation" (string) and "recommendations" (array of { stockName, action, reason, taxImpact }).`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getPortfolioAssets(userId) {
  const portfolio = await Portfolio.findOne({ user: userId });
  if (!portfolio?.holdings?.length) return null;

  return portfolio.holdings.map((h) => {
    // Support both AA/Groww schema (avgPrice, currentPrice) and legacy (averagePrice)
    const avgPrice     = h.avgPrice ?? h.averagePrice ?? 0;
    const currentPrice = h.currentPrice ?? (avgPrice + (h.profitandloss ?? 0) / (h.quantity || 1));
    return {
      stockName:    h.symbol || h.tradingSymbol || h.isin || 'UNKNOWN',
      buyPrice:     avgPrice,
      currentPrice: currentPrice,
      buyDate:      h.dateOfPurchase,
      quantity:     h.quantity,
    };
  });
}

async function saveAnalysis(userId, type, data) {
  return TaxAnalysis.findOneAndUpdate(
    { user: userId, type },
    { user: userId, type, createdAt: new Date(), ...data },
    { upsert: true, new: true }
  );
}

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.analyzePortfolio = async (req, res) => {
  try {
    const assets = await getPortfolioAssets(req.user.id);
    if (!assets) {
      return res.status(400).json({ message: 'No portfolio data. Sync via AA backend first.' });
    }

    const processed = taxCalculator.calculateTaxParameters(assets);
    const clean = processed.map(({ stockName, unrealizedPnL, classification, holdingPeriod }) => ({
      symbol: stockName, unrealizedPnL, classification, holdingDays: holdingPeriod,
    }));

    const aiResult = await aiService.getAIStrategy(PROMPTS.general, clean);

    await saveAnalysis(req.user.id, 'general', {
      eligibleAssets:    processed,
      aiExplanation:     aiResult.textExplanation,
      aiRecommendations: aiResult.parsedJson,
    });

    return res.status(200).json({ success: true, data: processed, aiStrategy: aiResult });
  } catch (err) {
    console.error('analyzePortfolio error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.harvestLoss = async (req, res) => {
  try {
    const assets = await getPortfolioAssets(req.user.id);
    if (!assets) {
      return res.status(400).json({ message: 'No portfolio data. Sync via AA backend first.' });
    }

    const processed  = taxCalculator.calculateTaxParameters(assets);
    const lossAssets = processed.filter((a) => a.unrealizedPnL < 0);

    if (lossAssets.length === 0) {
      await saveAnalysis(req.user.id, 'loss-harvest', {
        eligibleAssets: [], aiExplanation: 'No losses to harvest.', aiRecommendations: [],
      });
      return res.status(200).json({
        success: true, eligibleAssets: [],
        message: 'No loss-making assets available for tax-loss harvesting.',
      });
    }

    const clean = lossAssets.map(({ stockName, unrealizedPnL, classification, holdingPeriod }) => ({
      symbol: stockName, unrealizedPnL, classification, holdingDays: holdingPeriod,
    }));

    const aiResult   = await aiService.getAIStrategy(PROMPTS.lossHarvest, clean);
    const totalLoss  = lossAssets.reduce((s, a) => s + Math.abs(a.unrealizedPnL), 0);

    await saveAnalysis(req.user.id, 'loss-harvest', {
      eligibleAssets:    lossAssets,
      aiExplanation:     aiResult.textExplanation,
      aiRecommendations: aiResult.parsedJson,
      summary:           { totalLossToBook: totalLoss },
    });

    return res.status(200).json({ success: true, eligibleAssets: lossAssets, aiStrategy: aiResult });
  } catch (err) {
    console.error('harvestLoss error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.harvestGain = async (req, res) => {
  try {
    const assets = await getPortfolioAssets(req.user.id);
    if (!assets) {
      return res.status(400).json({ message: 'No portfolio data. Sync via AA backend first.' });
    }

    const processed      = taxCalculator.calculateTaxParameters(assets);
    const profitableAssets = processed.filter(
      (a) => a.classification === 'LTCG' && a.unrealizedPnL > 0
    );

    if (profitableAssets.length === 0) {
      await saveAnalysis(req.user.id, 'gain-harvest', {
        eligibleAssets: [], aiExplanation: 'No eligible LTCG profits to harvest.', aiRecommendations: [],
      });
      return res.status(200).json({
        success: true, eligibleAssets: [],
        message: 'No profitable LTCG assets available for tax-gain harvesting.',
      });
    }

    const clean = profitableAssets.map(({ stockName, unrealizedPnL, classification, holdingPeriod }) => ({
      symbol: stockName, unrealizedPnL, classification, holdingDays: holdingPeriod,
    }));

    const aiResult  = await aiService.getAIStrategy(PROMPTS.gainHarvest, clean);
    const totalGain = profitableAssets.reduce((s, a) => s + a.unrealizedPnL, 0);
    const exemptionUsed = Math.min(totalGain, 100_000);

    await saveAnalysis(req.user.id, 'gain-harvest', {
      eligibleAssets:    profitableAssets,
      aiExplanation:     aiResult.textExplanation,
      aiRecommendations: aiResult.parsedJson,
      summary: {
        ltcgExemptionUsed:      exemptionUsed,
        ltcgExemptionLimit:     100_000,
        totalPotentialTaxSaved: exemptionUsed * 0.1,
      },
    });

    return res.status(200).json({ success: true, eligibleAssets: profitableAssets, aiStrategy: aiResult });
  } catch (err) {
    console.error('harvestGain error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

exports.getResults = async (req, res) => {
  try {
    const results = await TaxAnalysis.find({ user: req.user.id }).sort({ createdAt: -1 });

    const pick = (type) => {
      const r = results.find((x) => x.type === type);
      return {
        explanation:     r?.aiExplanation     || '',
        recommendations: r?.aiRecommendations || [],
        eligibleAssets:  r?.eligibleAssets    || [],
        summary:         r?.summary           || {},
        analyzedAt:      r?.createdAt         || null,
      };
    };

    return res.status(200).json({
      success: true,
      gainHarvesting: pick('gain-harvest'),
      lossHarvesting: pick('loss-harvest'),
    });
  } catch (err) {
    console.error('getResults error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
