const Portfolio = require('../models/Portfolio');
const angeloneService = require('../services/angelone.service');

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // milliseconds

/**
 * Helper: Check if portfolio data is fresh (< 24 hours old)
 */
function isDataFresh(portfolio) {
  if (!portfolio || !portfolio.lastSyncedAt) return false;
  const age = Date.now() - new Date(portfolio.lastSyncedAt).getTime();
  return age < TWENTY_FOUR_HOURS;
}

/**
 * Helper: Fetch from AngelOne, normalize, and upsert into DB
 */
async function fetchAndUpsert(userId) {
  // Fetch raw holdings from AngelOne API
  const rawHoldings = await angeloneService.fetchHoldings();

  // Normalize to our schema
  const normalizedHoldings = angeloneService.normalizeHoldings(rawHoldings);

  // Upsert into DB
  const portfolio = await Portfolio.findOneAndUpdate(
    { user: userId },
    {
      user: userId,
      holdings: normalizedHoldings,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return portfolio;
}

/**
 * GET /api/portfolio
 * Get user's portfolio with 24-hour cache logic.
 * - If data is < 24 hours old: return from DB
 * - If data is >= 24 hours old or doesn't exist: fetch from AngelOne, store, and return
 */
exports.getPortfolio = async (req, res) => {
  try {
    // Check if we have fresh data in DB
    const existing = await Portfolio.findOne({ user: req.user.id });

    if (existing && isDataFresh(existing)) {
      // Data is fresh — serve from DB
      return res.status(200).json({
        success: true,
        source: 'cache',
        portfolio: existing,
      });
    }

    // Data is stale or doesn't exist — fetch from AngelOne
    try {
      const portfolio = await fetchAndUpsert(req.user.id);
      return res.status(200).json({
        success: true,
        source: 'angelone',
        portfolio,
      });
    } catch (apiError) {
      // If AngelOne API fails but we have stale data, return stale data with a warning
      if (existing) {
        return res.status(200).json({
          success: true,
          source: 'cache_stale',
          warning: 'AngelOne API call failed. Showing cached data.',
          apiError: apiError.message,
          portfolio: existing,
        });
      }
      // No data at all
      return res.status(200).json({
        success: true,
        source: 'empty',
        holdings: [],
        message: 'No portfolio data found. Please configure your AngelOne credentials and sync.',
        apiError: apiError.message,
      });
    }
  } catch (error) {
    console.error('getPortfolio error:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * POST /api/portfolio/sync
 * Force-sync portfolio from AngelOne API (ignores cache age).
 * Always calls the API, upserts into DB, and returns fresh data.
 */
exports.syncPortfolio = async (req, res) => {
  try {
    const portfolio = await fetchAndUpsert(req.user.id);

    return res.status(200).json({
      success: true,
      message: `Portfolio synced with ${portfolio.holdings.length} holdings from AngelOne`,
      portfolio,
    });
  } catch (error) {
    console.error('syncPortfolio error:', error);
    res.status(500).json({ message: error.message });
  }
};
