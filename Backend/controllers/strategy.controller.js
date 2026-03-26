const aiService = require('../services/ai.service');

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
