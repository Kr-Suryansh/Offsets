import { prisma } from "@infra/db";
import { cacheGet, cacheSet } from "@infra/cache";
import { logger } from "@infra/logger";
import { AppError } from "@types/common.types";
import type { PortfolioSummary } from "@types/portfolio.types";

const PORTFOLIO_CACHE_TTL = 300; // 5 minutes

export async function getPortfolio(userId: string): Promise<PortfolioSummary> {
  const cacheKey = `portfolio:${userId}`;

  const cached = await cacheGet<PortfolioSummary>(cacheKey);
  if (cached) {
    logger.debug({ userId }, "Portfolio served from cache");
    return cached;
  }

  const [holdings, transactions] = await Promise.all([
    prisma.holding.findMany({ where: { userId } }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { txDate: "desc" },
      take: 500,
    }),
  ]);

  if (!holdings.length) {
    throw new AppError("No portfolio data found. Trigger a data fetch first.", 404, "NO_DATA");
  }

  const totalInvested = holdings.reduce(
    (sum, h) => sum + Number(h.avgPrice) * Number(h.quantity),
    0
  );
  const currentValue = holdings.reduce(
    (sum, h) =>
      sum + (Number(h.currentPrice ?? h.avgPrice)) * Number(h.quantity),
    0
  );

  const summary: PortfolioSummary = {
    userId,
    holdings: holdings.map((h) => ({
      isin: h.isin,
      symbol: h.symbol ?? h.isin,
      name: h.name ?? h.isin,
      quantity: Number(h.quantity),
      avgPrice: Number(h.avgPrice),
      currentPrice: h.currentPrice ? Number(h.currentPrice) : null,
      source: h.source as "AA" | "MANUAL",
      accountId: h.accountId,
      fipId: "",
    })),
    transactions: transactions.map((tx) => ({
      isin: tx.isin,
      symbol: tx.symbol ?? tx.isin,
      txType: tx.txType as "BUY" | "SELL" | "DIVIDEND" | "BONUS" | "SPLIT",
      quantity: Number(tx.quantity),
      price: Number(tx.price),
      amount: Number(tx.amount),
      txDate: tx.txDate,
      source: tx.source as "AA" | "MANUAL",
    })),
    totalInvested,
    currentValue,
    unrealizedPnL: currentValue - totalInvested,
    asOf: new Date(),
  };

  await cacheSet(cacheKey, summary, PORTFOLIO_CACHE_TTL);
  return summary;
}
