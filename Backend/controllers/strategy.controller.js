const taxCalculatorService = require('../services/taxCalculator.service');
const aiService = require('../services/ai.service');

const GIFTING_PROMPT = `
You are an expert tax advisor.
Analyze the user's portfolio and identify assets suitable for gifting to dependents in lower tax brackets (e.g., 0% tax).
Return EXACTLY two parts in a JSON format:
1. "explanation": A detailed string explaining the strategy and tax bracket arbitrage.
2. "recommendations": A JSON array of specific assets to gift. Each must have stockName, action ("GIFT"), and taxImpact.
`;

const STRATEGY_ENGINE_PROMPT = `
You are an expert tax advisor and financial planner.
Analyze the user's total portfolio holding periods, profits, losses, and family setup.
Return EXACTLY two parts in a JSON format:
1. "explanation": A comprehensive strategy summary combining tax-loss harvesting, tax-gain harvesting, and intra-family gifting.
2. "recommendations": A JSON array of all selected optimal actions across the portfolio. Each must have stockName, action ("SELL", "HOLD", "WAIT", "GIFT"), reason, and estimated taxImpact.
`;

exports.giftingAnalysis = async (req, res) => {
  try {
    const rawAssets = req.body.assets;
    const family = req.body.family;

    if (!rawAssets || rawAssets.length === 0) {
      return res.status(400).json({ message: "No assets provided" });
    }
    if (!family || family.length === 0) {
      return res.status(400).json({ message: "No family members provided for gifting context" });
    }

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    
    // Pass family context directly into the AI execution
    const combinedData = { assets: processedAssets, family };
    const aiStrategy = await aiService.getAIStrategy(GIFTING_PROMPT, combinedData);

    return res.status(200).json({
      success: true,
      eligibleAssets: processedAssets,
      aiStrategy
    });
  } catch (error) {
    console.error("giftingAnalysis error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.strategyOptimize = async (req, res) => {
  try {
    const rawAssets = req.body.assets;
    if (!rawAssets) return res.status(400).json({ message: "No assets provided" });

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    const combinedData = { assets: processedAssets, family: req.body.family || [] };

    const aiStrategy = await aiService.getAIStrategy(STRATEGY_ENGINE_PROMPT, combinedData);

    return res.status(200).json({
      success: true,
      portfolio: processedAssets,
      aiStrategy
    });
  } catch (error) {
    console.error("strategyOptimize error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.explainAction = async (req, res) => {
  try {
    const { stockData, action } = req.body;
    if (!stockData || !action) return res.status(400).json({ message: "stockData and action required" });
    
    const prompt = `Explain why the suggested action "${action}" is beneficial for the following stock data. Provide a short, plain-text response (no JSON).`;
    
    const explanation = await aiService.getAIText(prompt, stockData);
    return res.status(200).json({ success: true, explanation });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
