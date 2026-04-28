const aiService = require('../services/ai.service');

exports.explainAction = async (req, res) => {
  const { stockData, action } = req.body;
  if (!stockData || !action) {
    return res.status(400).json({ message: 'stockData and action are required' });
  }

  try {
    const prompt = `Explain why the action "${action}" is beneficial for this stock. Respond in plain text, 2-3 sentences.`;
    const explanation = await aiService.getAIText(prompt, stockData);
    return res.status(200).json({ success: true, explanation });
  } catch (err) {
    console.error('explainAction error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
