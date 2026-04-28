/**
 * taxCalculator.service.js
 * Pure utility — computes holding period, STCG/LTCG classification, and unrealized PnL.
 * No side effects, no external dependencies.
 */

const LTCG_THRESHOLD_DAYS = 365;

/**
 * @param {Array<{ stockName, buyPrice, currentPrice, buyDate, quantity }>} assets
 * @returns {Array} assets enriched with holdingPeriod, classification, unrealizedPnL
 */
exports.calculateTaxParameters = (assets) => {
  if (!Array.isArray(assets) || assets.length === 0) return [];

  const today = Date.now();

  return assets.map((asset) => {
    const holdingPeriod = Math.floor(
      (today - new Date(asset.buyDate).getTime()) / 86_400_000
    );
    const classification = holdingPeriod >= LTCG_THRESHOLD_DAYS ? 'LTCG' : 'STCG';
    const unrealizedPnL  = (asset.currentPrice - asset.buyPrice) * asset.quantity;

    return {
      stockName: asset.stockName,
      buyPrice: asset.buyPrice,
      currentPrice: asset.currentPrice,
      buyDate: asset.buyDate,
      quantity: asset.quantity,
      holdingPeriod,
      classification,
      unrealizedPnL,
    };
  });
};
