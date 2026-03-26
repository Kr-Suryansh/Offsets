/**
 * taxCalculator.service.js
 * Pure utility service to map and sanitize raw portfolio assets.
 */

/**
 * Maps a generic portfolio array and calculates tax parameters.
 * @param {Array} assets - Array of asset objects
 * @returns {Array} - Sanitized array with holding Period, Classification, Unrealized PnL
 */
exports.calculateTaxParameters = (assets) => {
  if (!assets || !Array.isArray(assets)) return [];

  const today = new Date();

  return assets.map(asset => {
    const buyDate = new Date(asset.buyDate);
    // Difference in milliseconds
    const diffTime = today.getTime() - buyDate.getTime();
    // Difference in days
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    // Total days held
    const holdingPeriod = diffDays;
    
    // Classification (STCG < 365, LTCG >= 365)
    const classification = holdingPeriod >= 365 ? 'LTCG' : 'STCG';
    
    // Unrealized PnL = (Current - Buy) * Quantity
    const unrealizedPnL = (asset.currentPrice - asset.buyPrice) * asset.quantity;

    return {
      stockName: asset.stockName,
      buyPrice: asset.buyPrice,
      currentPrice: asset.currentPrice,
      buyDate: asset.buyDate,
      quantity: asset.quantity,
      holdingPeriod,
      classification,
      unrealizedPnL
    };
  });
};
