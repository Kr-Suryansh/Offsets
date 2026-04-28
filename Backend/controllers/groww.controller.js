/**
 * groww.controller.js
 *
 * POST /api/groww/link       — save encrypted Groww access token
 * GET  /api/groww/status     — check if token is linked + active
 * POST /api/groww/sync       — fetch holdings from Groww, store in Portfolio
 * GET  /api/groww/portfolio  — return cached Groww portfolio
 * GET  /api/groww/price      — live LTP for a symbol (?symbol=NSE_RELIANCE)
 * DELETE /api/groww/unlink   — remove linked account
 */
const GrowwAccount = require('../models/GrowwAccount');
const Portfolio    = require('../models/Portfolio');
const cryptoSvc    = require('../services/crypto.service');
const growwSvc     = require('../services/groww.service');

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isFresh(date) {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < CACHE_TTL_MS;
}

// ─── Link / update token ──────────────────────────────────────────────────────

/**
 * POST /api/groww/link
 * Body: { accessToken: string }
 *
 * Validates the token by making a live holdings call, then stores it encrypted.
 */
exports.linkAccount = async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken || typeof accessToken !== 'string' || accessToken.trim().length < 10) {
    return res.status(400).json({ message: 'A valid Groww access token is required' });
  }

  const token = accessToken.trim();

  // Validate token by making a real API call
  try {
    await growwSvc.fetchHoldings(token);
  } catch (err) {
    if (err.code === 'GROWW_UNAUTHORIZED') {
      return res.status(401).json({
        message: 'Token validation failed. Please generate a fresh token from your Groww dashboard.',
        code: 'INVALID_TOKEN',
      });
    }
    return res.status(502).json({
      message: 'Could not reach Groww API. Please try again.',
      code: 'GROWW_UNREACHABLE',
    });
  }

  try {
    const accessTokenEnc = cryptoSvc.encrypt(token);
    const tokenMask      = cryptoSvc.maskToken(token);

    const account = await GrowwAccount.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        accessTokenEnc,
        tokenMask,
        isActive: true,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Groww account linked successfully',
      account: {
        tokenMask: account.tokenMask,
        isActive:  account.isActive,
        linkedAt:  account.linkedAt,
      },
    });
  } catch (err) {
    console.error('linkAccount error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── Status ───────────────────────────────────────────────────────────────────

/**
 * GET /api/groww/status
 */
exports.getStatus = async (req, res) => {
  try {
    const account = await GrowwAccount.findOne({ user: req.user.id });

    if (!account) {
      return res.status(200).json({ linked: false });
    }

    return res.status(200).json({
      linked:       true,
      isActive:     account.isActive,
      tokenMask:    account.tokenMask,
      lastSyncedAt: account.lastSyncedAt,
      linkedAt:     account.linkedAt,
    });
  } catch (err) {
    console.error('getStatus error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── Sync ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/groww/sync
 * Fetches live holdings from Groww, enriches with LTP, stores in Portfolio.
 */
exports.syncPortfolio = async (req, res) => {
  try {
    const account = await GrowwAccount.findOne({ user: req.user.id });
    if (!account) {
      return res.status(404).json({
        message: 'No Groww account linked. Please link your account first.',
        code: 'NOT_LINKED',
      });
    }

    let accessToken;
    try {
      accessToken = cryptoSvc.decrypt(account.accessTokenEnc);
    } catch {
      return res.status(500).json({ message: 'Failed to decrypt stored token' });
    }

    // 1. Fetch raw holdings
    let rawHoldings;
    try {
      rawHoldings = await growwSvc.fetchHoldings(accessToken);
      console.log(`Groww sync: fetched ${rawHoldings.length} raw holdings for user ${req.user.id}`);
    } catch (err) {
      console.error('Groww fetchHoldings error:', err.code, err.message);
      if (err.code === 'GROWW_UNAUTHORIZED') {
        await GrowwAccount.findOneAndUpdate(
          { user: req.user.id },
          { isActive: false }
        );
        return res.status(401).json({
          message: 'Groww token has expired (tokens expire daily at 6 AM). Please re-link your account.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(502).json({
        message: `Groww API error: ${err.message}`,
        code: err.code || 'GROWW_ERROR',
      });
    }

    if (rawHoldings.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No holdings found in your Groww DEMAT account',
        holdings: [],
      });
    }

    // 2. Fetch live prices for all symbols
    const exchangeSymbols = rawHoldings
      .filter((h) => h.trading_symbol)
      .map((h) => `NSE_${h.trading_symbol}`);

    let ltpMap = {};
    try {
      ltpMap = await growwSvc.fetchLTP(accessToken, exchangeSymbols);
    } catch {
      // Non-fatal — proceed without live prices
      console.error('LTP fetch failed, proceeding without live prices');
    }

    // 3. Normalize
    const holdings = growwSvc.normalizeHoldings(rawHoldings, ltpMap);

    // 4. Upsert into Portfolio
    const portfolio = await Portfolio.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        holdings,
        lastSyncedAt: new Date(),
        updatedAt:    new Date(),
      },
      { upsert: true, new: true }
    );

    // 5. Update lastSyncedAt on GrowwAccount
    await GrowwAccount.findOneAndUpdate(
      { user: req.user.id },
      { lastSyncedAt: new Date(), isActive: true }
    );

    return res.status(200).json({
      success: true,
      message: `Synced ${holdings.length} holdings from Groww`,
      portfolio,
    });
  } catch (err) {
    console.error('syncPortfolio error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── Get cached portfolio ─────────────────────────────────────────────────────

/**
 * GET /api/groww/portfolio
 */
exports.getPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ user: req.user.id });

    if (!portfolio || portfolio.holdings.length === 0) {
      return res.status(200).json({
        success: true,
        source: 'empty',
        message: 'No portfolio data. Click "Sync Portfolio" to fetch from Groww.',
        holdings: [],
      });
    }

    const growwHoldings = portfolio.holdings.filter((h) => h.source === 'GROWW');

    return res.status(200).json({
      success: true,
      source: isFresh(portfolio.lastSyncedAt) ? 'cache' : 'cache_stale',
      portfolio: {
        ...portfolio.toObject(),
        holdings: growwHoldings.length > 0 ? growwHoldings : portfolio.holdings,
      },
    });
  } catch (err) {
    console.error('getPortfolio error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── Live price ───────────────────────────────────────────────────────────────

/**
 * GET /api/groww/price?symbol=RELIANCE&exchange=NSE
 */
exports.getLivePrice = async (req, res) => {
  const { symbol, exchange = 'NSE' } = req.query;

  if (!symbol) {
    return res.status(400).json({ message: 'symbol query param is required' });
  }

  try {
    const account = await GrowwAccount.findOne({ user: req.user.id });
    if (!account) {
      return res.status(404).json({ message: 'No Groww account linked', code: 'NOT_LINKED' });
    }

    const accessToken = cryptoSvc.decrypt(account.accessTokenEnc);
    const quote = await growwSvc.fetchQuote(accessToken, exchange.toUpperCase(), symbol.toUpperCase());

    return res.status(200).json({
      success: true,
      symbol,
      exchange,
      ltp:        quote.last_price,
      dayChange:  quote.day_change,
      dayChangePct: quote.day_change_perc,
      high:       quote.high,
      low:        quote.low,
      open:       quote.open,
      close:      quote.close,
    });
  } catch (err) {
    if (err.code === 'GROWW_UNAUTHORIZED') {
      return res.status(401).json({ message: 'Token expired. Please re-link your Groww account.' });
    }
    console.error('getLivePrice error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};

// ─── Unlink ───────────────────────────────────────────────────────────────────

/**
 * DELETE /api/groww/unlink
 */
exports.unlinkAccount = async (req, res) => {
  try {
    await GrowwAccount.findOneAndDelete({ user: req.user.id });
    return res.status(200).json({ success: true, message: 'Groww account unlinked' });
  } catch (err) {
    console.error('unlinkAccount error:', err.message);
    return res.status(500).json({ message: 'Server error' });
  }
};
