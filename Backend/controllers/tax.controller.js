/**
 * tax.controller.js
 * Core controller logic mapping requests to services.
 */
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

📄 Explanation:
[Write 2-3 concise paragraphs of human-readable financial reasoning explaining why harvesting these specific losses is beneficial and how it reduces immediate tax liability.]

📊 Structured Data:
\`\`\`json
[
  {
    "stockName": "[Name]",
    "action": "SELL / HOLD",
    "reason": "[1-sentence strategic reason, e.g., 'Harvesting this -$500 loss will offset your recent STCG']",
    "taxImpact": "[Expected tax benefit, e.g., 'Reduces overall taxable gains']"
  }
]
\`\`\`
`;

const GAIN_HARVESTING_PROMPT = `
### 2. Tax-Gain Harvesting System Prompt

**When to trigger:** Backend detects highly profitable assets and the user wants to optimize profit booking against tax brackets.

**Prompt Template:**
\`\`\`text
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
You must return exactly TWO sections. Do not include any extra conversational filler.

📄 Explanation:
[Write 2-3 concise paragraphs explaining the strategy, specifically focusing on the tax rate differences between STCG and LTCG, and why waiting or selling now makes financial sense.]

📊 Structured Data:
\`\`\`json
[
  {
    "stockName": "[Name]",
    "action": "SELL / HOLD / WAIT",
    "reason": "[1-sentence strategic reason, e.g., 'Hold for 15 more days to qualify for the lower LTCG tax rate']",
    "taxImpact": "[Expected tax benefit, e.g., 'Drops tax liability from 30% to 10%']"
  }
]
\`\`\`
(Ensure the JSON block is perfectly formatted and valid).
`;

const GENERAL_ANALYSIS_PROMPT = `
You are an expert tax advisor. 
Analyze the overall portfolio and provide a summary of the tax implications (STCG vs LTCG exposure and overall unrealized profit/loss).
Return exactly TWO parts in JSON format: 
1. "explanation": a string explanation of the portfolio's general status.
2. "recommendations": a JSON array of general recommendations to improve tax efficiency.
`;

exports.analyzePortfolio = async (req, res) => {
  try {
    const rawAssets = req.body.assets;
    if (!rawAssets || rawAssets.length === 0) {
      return res.status(400).json({ message: "No assets provided for analysis" });
    }

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    
    // We remove some unnecessary metadata to save token costs
    const cleanAssets = processedAssets.map(asset => ({
      symbol: asset.symbol,
      unrealizedPnL: asset.unrealizedPnL,
      classification: asset.classification,
      holdingDays: asset.holdingDays
    }));

    const aiStrategy = await aiService.getAIStrategy(GENERAL_ANALYSIS_PROMPT, cleanAssets);

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

exports.harvestLoss = async (req, res) => {
  try {
    const rawAssets = req.body.assets; 
    if (!rawAssets) return res.status(400).json({ message: "No assets provided" });

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    const lossAssets = processedAssets.filter(asset => asset.unrealizedPnL < 0);
    
    if (lossAssets.length === 0) {
      return res.status(200).json({
        success: true,
        eligibleAssets: [],
        message: "No loss-making assets available for tax-loss harvesting.",
        aiStrategy: { textExplanation: "No losses to harvest.", parsedJson: [] }
      });
    }

    const cleanAssets = lossAssets.map(asset => ({
      symbol: asset.symbol,
      unrealizedPnL: asset.unrealizedPnL,
      classification: asset.classification,
      holdingDays: asset.holdingDays
    }));

    const aiStrategy = await aiService.getAIStrategy(LOSS_HARVESTING_PROMPT, cleanAssets);

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

exports.harvestGain = async (req, res) => {
  try {
    const rawAssets = req.body.assets;
    if (!rawAssets) return res.status(400).json({ message: "No assets provided" });

    const processedAssets = taxCalculatorService.calculateTaxParameters(rawAssets);
    const profitableLTCGAssets = processedAssets.filter(asset => asset.classification === 'LTCG' && asset.unrealizedPnL > 0);
    
    if (profitableLTCGAssets.length === 0) {
      return res.status(200).json({
        success: true,
        eligibleAssets: [],
        message: "No profitable LTCG assets available for tax-gain harvesting.",
        aiStrategy: { textExplanation: "No eligible LTCG profits to harvest.", parsedJson: [] }
      });
    }

    const cleanAssets = profitableLTCGAssets.map(asset => ({
      symbol: asset.symbol,
      unrealizedPnL: asset.unrealizedPnL,
      classification: asset.classification,
      holdingDays: asset.holdingDays
    }));

    const aiStrategy = await aiService.getAIStrategy(GAIN_HARVESTING_PROMPT, cleanAssets);

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
