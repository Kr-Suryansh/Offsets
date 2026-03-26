/**
 * tax.controller.js
 * Core controller logic mapping requests to services.
 */
// const Portfolio = require('../models/Portfolio');
const taxCalculatorService = require('../services/taxCalculator.service');
const aiService = require('../services/ai.service');

// System prompts defined cleanly
const LOSS_HARVESTING_PROMPT = `
You are an expert tax advisor. 
You are provided with a portfolio of assets.
Identify stocks with negative unrealizedPnL. Suggest selling to lower the current year's tax liability (Tax-Loss Harvesting).
Return exactly TWO parts in JSON format: 
1. "explanation": a string explanation of the strategy.
2. "recommendations": a JSON array of specific actionable recommendations (each containing stockName, action, and estimatedBenefit).
`;

const GAIN_HARVESTING_PROMPT = `
You are an expert tax advisor. 
You are provided with a portfolio of assets.
Identify LTCG stocks with profit. Suggest selling and immediately rebuying to utilize the 1.25L tax-free limit (Cost-Basis Reset).
Return exactly TWO parts in JSON format: 
1. "explanation": a string explanation of the strategy.
2. "recommendations": a JSON array of specific actionable recommendations (each containing stockName, action, and estimatedBenefit).
`;

const GENERAL_ANALYSIS_PROMPT = `
You are an expert tax advisor. 
Analyze the overall portfolio and provide a summary of the tax implications (STCG vs LTCG exposure and overall unrealized profit/loss).
Return exactly TWO parts in JSON format: 
1. "explanation": a string explanation of the portfolio's general status.
2. "recommendations": a JSON array of general recommendations to improve tax efficiency.
`;

/**
 * Analyzes the portfolio and optionally asks AI for a summary
 */
exports.analyzePortfolio = async (req, res) => {
  try {
    const rawAssets = req.body.assets;

    if (!rawAssets || rawAssets.length === 0) {
      return res.status(400).json({ message: "No assets provided for analysis" });
    }

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    const aiStrategy = await aiService.getAIStrategy(GENERAL_ANALYSIS_PROMPT, processedAssets);

    return res.status(200).json({
      success: true,
      data: processedAssets,
      aiStrategy
    });
  } catch (error) {
    console.error("analyzePortfolio error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Recommends Tax-Loss Harvesting Strategy
 */
exports.harvestLoss = async (req, res) => {
  try {
    const rawAssets = req.body.assets; 
    if (!rawAssets) return res.status(400).json({ message: "No assets provided" });

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    
    // Filter only loss-making assets
    const lossAssets = processedAssets.filter(asset => asset.unrealizedPnL < 0);
    
    if (lossAssets.length === 0) {
      return res.status(200).json({
        success: true,
        eligibleAssets: [],
        message: "No loss-making assets available for tax-loss harvesting.",
        aiStrategy: { textExplanation: "No losses to harvest.", parsedJson: [] }
      });
    }

    const aiStrategy = {
      textExplanation: `Based on predefined analysis, selling these ${lossAssets.length} underperforming assets will help offset your capital gains and reduce your tax burden.`,
      parsedJson: {
        explanation: `Based on predefined analysis, selling these ${lossAssets.length} underperforming assets will help offset your capital gains and reduce your tax burden.`,
        recommendations: lossAssets.map(asset => ({
          stockName: asset.symbol,
          action: "SELL & BOOK LOSS",
          reason: `Asset is down by ₹${Math.abs(asset.unrealizedPnL).toFixed(2)}. Harvesting this loss will reduce your taxable capital gains.`,
          taxImpact: `Saves approx. ₹${(Math.abs(asset.unrealizedPnL) * 0.1).toFixed(2)} in taxes`
        }))
      }
    };

    return res.status(200).json({
      success: true,
      eligibleAssets: lossAssets,
      aiStrategy
    });
  } catch (error) {
    console.error("harvestLoss error:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Recommends Tax-Gain Harvesting Strategy
 */
exports.harvestGain = async (req, res) => {
  try {
    const rawAssets = req.body.assets;
    if (!rawAssets) return res.status(400).json({ message: "No assets provided" });

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    
    // Filter LTCG assets with profit
    const profitableLTCGAssets = processedAssets.filter(asset => asset.classification === 'LTCG' && asset.unrealizedPnL > 0);
    
    if (profitableLTCGAssets.length === 0) {
      return res.status(200).json({
        success: true,
        eligibleAssets: [],
        message: "No profitable LTCG assets available for tax-gain harvesting.",
        aiStrategy: { textExplanation: "No eligible LTCG profits to harvest.", parsedJson: [] }
      });
    }

    const aiStrategy = {
      textExplanation: `You have unrealized long-term capital gains on ${profitableLTCGAssets.length} assets. By selling and rebuying these assets, you can utilize the ₹1 Lakh tax-free limit without changing your portfolio.`,
      parsedJson: {
        explanation: `You have unrealized long-term capital gains on ${profitableLTCGAssets.length} assets. By selling and rebuying these assets, you can utilize the ₹1 Lakh tax-free limit without changing your portfolio.`,
        recommendations: profitableLTCGAssets.map(asset => ({
          stockName: asset.symbol,
          action: "SELL & REBUY",
          reason: `Unrealized LTCG is ₹${asset.unrealizedPnL.toFixed(2)}. Booking this profit falls under the tax-free limit.`,
          taxImpact: `Tax-free gain of ₹${asset.unrealizedPnL.toFixed(2)} realized`
        }))
      }
    };

    return res.status(200).json({
      success: true,
      eligibleAssets: profitableLTCGAssets,
      aiStrategy
    });
  } catch (error) {
    console.error("harvestGain error:", error);
    res.status(500).json({ message: error.message });
  }
};
