/**
 * portfolio.controller.js
 *
 * Portfolio data is sourced exclusively from the AA backend.
 * This controller reads from the local MongoDB cache (populated by AA sync)
 * and exposes it to the frontend.
 *
 * POST /api/portfolio/sync  — accepts AA-normalized holdings and upserts into DB
 * GET  /api/portfolio       — returns cached portfolio
 */
const Portfolio = require('../models/Portfolio');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function isFresh(portfolio) {
  if (!portfolio?.lastSyncedAt) return false;
  return Date.now() - new Date(portfolio.lastSyncedAt).getTime() < CACHE_TTL_MS;
}

/**
 * GET /api/portfolio
 * Returns the user's cached portfolio from DB.
 */
exports.getPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user.id });

    if (!portfolio || portfolio.holdings.length === 0) {
      return res.status(200).json({
        success: true,
        source: 'empty',
        message: 'No portfolio data. Sync via the AA backend first.',
        holdings: [],
      });
    }

    return res.status(200).json({
      success: true,
      source: isFresh(portfolio) ? 'cache' : 'cache_stale',
      portfolio,
    });
  } catch (err) {
    console.error('getPortfolio error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * POST /api/portfolio/sync
 * Accepts AA-normalized holdings payload and upserts into DB.
 * Called by the AA backend (or manually) after a successful data fetch.
 *
 * Body: { holdings: NormalizedHolding[] }
 */
exports.syncPortfolio = async (req, res) => {
  const { holdings } = req.body;

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return res.status(400).json({ message: 'holdings array is required' });
  }

  // Validate required fields on each holding
  for (const h of holdings) {
    if (!h.isin || h.quantity == null || !h.dateOfPurchase) {
      return res.status(400).json({
        message: 'Each holding must have isin, quantity, and dateOfPurchase',
      });
    }
  }

  try {
    const portfolio = await Portfolio.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        holdings,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: `Portfolio synced: ${portfolio.holdings.length} holdings`,
      portfolio,
    });
  } catch (err) {
    console.error('syncPortfolio error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
