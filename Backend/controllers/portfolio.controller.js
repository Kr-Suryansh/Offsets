const Portfolio = require('../models/Portfolio');

/**
 * Sync portfolio from broker data (AngelOne, manual upload, etc.)
 * Accepts raw holdings array → normalizes → upserts into DB
 */
exports.syncPortfolio = async (req, res) => {
  try {
    const { assets } = req.body;
    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({ message: 'No assets provided for sync' });
    }

    // Normalize broker data into our schema
    const normalizedAssets = assets.map(a => ({
      stockName: a.stockName || a.tradingsymbol || a.symbol || a.name || 'Unknown',
      symbol: a.symbol || a.tradingsymbol || a.stockName || '',
      buyPrice: Number(a.buyPrice || a.averageprice || a.avgBuyPrice || 0),
      currentPrice: Number(a.currentPrice || a.ltp || a.lastprice || 0),
      buyDate: a.buyDate || a.orderdate || new Date().toISOString(),
      quantity: Number(a.quantity || a.qty || 0),
    }));

    // Upsert: replace the user's entire portfolio
    const portfolio = await Portfolio.findOneAndUpdate(
      { user: req.user.id },
      { user: req.user.id, assets: normalizedAssets, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Portfolio synced with ${normalizedAssets.length} assets`,
      portfolio
    });
  } catch (error) {
    console.error('syncPortfolio error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Get the user's saved portfolio from DB
 */
exports.getPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user.id });
    if (!portfolio) {
      return res.status(200).json({ success: true, assets: [], message: 'No portfolio found. Sync your broker data first.' });
    }
    return res.status(200).json({ success: true, portfolio });
  } catch (error) {
    console.error('getPortfolio error:', error);
    res.status(500).json({ message: error.message });
  }
};
