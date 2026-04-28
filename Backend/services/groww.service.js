/**
 * groww.service.js — Groww Trading API v1 client
 * Docs: https://groww.in/trade-api/docs/curl
 */
const axios = require('axios');

const GROWW_BASE = 'https://api.groww.in/v1';
const TIMEOUT_MS = 12_000;

function buildClient(accessToken) {
  return axios.create({
    baseURL: GROWW_BASE,
    timeout: TIMEOUT_MS,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'X-API-VERSION': '1.0',
    },
  });
}

function handleGrowwError(err) {
  if (err.response) {
    const status = err.response.status;
    const body   = err.response.data || {};
    console.error('Groww API error:', status, JSON.stringify(body).slice(0, 400));

    if (status === 401 || status === 403) {
      const e = new Error(body.error?.message || body.message || 'Groww token invalid or expired');
      e.statusCode = 401;
      e.code = 'GROWW_UNAUTHORIZED';
      throw e;
    }
    const e = new Error(body.error?.message || body.message || `Groww API error (${status})`);
    e.statusCode = status;
    e.code = 'GROWW_API_ERROR';
    throw e;
  }
  console.error('Groww network error:', err.message);
  const e = new Error('Groww API unreachable: ' + err.message);
  e.statusCode = 502;
  e.code = 'GROWW_UNREACHABLE';
  throw e;
}

// ─── Holdings ─────────────────────────────────────────────────────────────────

exports.fetchHoldings = async (accessToken) => {
  try {
    const client = buildClient(accessToken);
    const res = await client.get('/holdings/user');

    console.log('Holdings status:', res.data?.status);

    if (res.data?.status !== 'SUCCESS') {
      throw Object.assign(
        new Error(`Holdings fetch failed: ${JSON.stringify(res.data)}`),
        { statusCode: 502 }
      );
    }

    const payload = res.data.payload;
    if (Array.isArray(payload))                    return payload;
    if (payload && Array.isArray(payload.holdings)) return payload.holdings;
    if (payload && typeof payload === 'object')     return Object.values(payload);
    return [];
  } catch (err) {
    if (err.code) throw err;
    handleGrowwError(err);
  }
};

// ─── LTP ──────────────────────────────────────────────────────────────────────

/**
 * Groww LTP endpoint accepts exchange_symbols as repeated query params:
 *   ?segment=CASH&exchange_symbols=NSE_RELIANCE&exchange_symbols=NSE_INFY
 *
 * The payload is a map keyed by the exchange_symbol string:
 *   { "NSE_RELIANCE": { "ltp": 1234.5 }, ... }
 */
exports.fetchLTP = async (accessToken, exchangeSymbols) => {
  if (!exchangeSymbols || exchangeSymbols.length === 0) return {};

  const result = {};

  // Max 50 per call
  for (let i = 0; i < exchangeSymbols.length; i += 50) {
    const chunk = exchangeSymbols.slice(i, i + 50);
    try {
      const client = buildClient(accessToken);

      // Build URLSearchParams with repeated keys
      const params = new URLSearchParams();
      params.append('segment', 'CASH');
      for (const sym of chunk) params.append('exchange_symbols', sym);

      const res = await client.get('/live-data/ltp', { params });

      console.log('LTP status:', res.data?.status);
      console.log('LTP payload sample:', JSON.stringify(res.data?.payload)?.slice(0, 300));

      if (res.data?.status === 'SUCCESS' && res.data.payload) {
        Object.assign(result, res.data.payload);
      }
    } catch (err) {
      console.error('LTP fetch error for chunk:', chunk, err.message);
      // Non-fatal — continue without prices for this chunk
    }
  }

  console.log('LTP result keys:', Object.keys(result));
  return result;
};

// ─── Quote ────────────────────────────────────────────────────────────────────

exports.fetchQuote = async (accessToken, exchange, tradingSymbol) => {
  try {
    const client = buildClient(accessToken);
    const res = await client.get('/live-data/quote', {
      params: { exchange, segment: 'CASH', trading_symbol: tradingSymbol },
    });

    if (res.data?.status !== 'SUCCESS') {
      throw Object.assign(new Error('Quote fetch failed'), { statusCode: 502 });
    }
    return res.data.payload;
  } catch (err) {
    if (err.code) throw err;
    handleGrowwError(err);
  }
};

// ─── Normalize ────────────────────────────────────────────────────────────────

/**
 * LTP map keys from Groww: "NSE_AMBUJACEM", "BSE_AMBUJACEM", etc.
 * Each value: { ltp: number } or just a number depending on API version.
 */
exports.normalizeHoldings = (rawHoldings, ltpMap = {}) => {
  return rawHoldings
    .filter((h) => Number(h.quantity) > 0)
    .map((h) => {
      const symbol = h.trading_symbol || '';
      const avgPrice = Number(h.average_price || 0);

      // Try all possible key formats Groww might use
      const ltpEntry =
        ltpMap[`NSE_${symbol}`] ||
        ltpMap[`BSE_${symbol}`] ||
        ltpMap[symbol] ||
        null;

      // ltpEntry can be { ltp: number } or just a number
      let currentPrice = avgPrice; // fallback
      if (ltpEntry !== null) {
        if (typeof ltpEntry === 'object' && ltpEntry.ltp != null) {
          currentPrice = Number(ltpEntry.ltp);
        } else if (typeof ltpEntry === 'number') {
          currentPrice = ltpEntry;
        }
      }

      console.log(`  ${symbol}: avgPrice=${avgPrice}, ltpEntry=${JSON.stringify(ltpEntry)}, currentPrice=${currentPrice}`);

      return {
        isin:           h.isin || '',
        symbol,
        name:           h.trading_symbol || '',
        quantity:       Number(h.quantity || 0),
        avgPrice,
        currentPrice,
        dateOfPurchase: new Date(),
        source:         'GROWW',
      };
    });
};
