/**
 * aa.mapper.ts
 *
 * Converts raw decrypted AA FI documents → internal normalized schema.
 * This is the only place that knows about AA's data shape.
 */

import type { DecryptedFIDocument, RawHolding, RawTransaction } from "@types/aa.types";
import type { NormalizedHolding, NormalizedTransaction } from "@types/portfolio.types";
import { logger } from "@infra/logger";

// ─── ISIN → Symbol mapping ────────────────────────────────────────────────────
// In production, replace with a live market data API (e.g. NSE/BSE data feed)
// or a pre-seeded database table.

const ISIN_SYMBOL_MAP: Record<string, string> = {
  INE009A01021: "INFOSYS",
  INE040A01034: "HDFCBANK",
  INE002A01018: "RELIANCE",
  INE467B01029: "TCS",
  INE062A01020: "SBIN",
  // ... extend via DB lookup in production
};

export function isinToSymbol(isin: string): string {
  return ISIN_SYMBOL_MAP[isin] ?? isin; // fallback to ISIN itself
}

// ─── Holding mapper ───────────────────────────────────────────────────────────

function mapHolding(
  raw: RawHolding,
  accountId: string,
  fipId: string
): NormalizedHolding | null {
  if (!raw.isin || raw.units == null) {
    logger.warn({ raw }, "Skipping holding with missing ISIN or units");
    return null;
  }

  const avgPrice = raw.purchasePrice ?? raw.NAV ?? 0;
  const currentPrice = raw.lastTradedPrice ?? raw.closingPrice ?? raw.NAV ?? null;

  return {
    isin: raw.isin,
    symbol: isinToSymbol(raw.isin),
    name: raw.isinDescription ?? raw.isin,
    quantity: Number(raw.units),
    avgPrice: Number(avgPrice),
    currentPrice: currentPrice !== null ? Number(currentPrice) : null,
    source: "AA",
    accountId,
    fipId,
  };
}

// ─── Transaction mapper ───────────────────────────────────────────────────────

function mapTransaction(raw: RawTransaction): NormalizedTransaction | null {
  if (!raw.isin || !raw.tradeDate) {
    logger.warn({ raw }, "Skipping transaction with missing ISIN or date");
    return null;
  }

  return {
    isin: raw.isin,
    symbol: isinToSymbol(raw.isin),
    txType: raw.type,
    quantity: Number(raw.units),
    price: Number(raw.price),
    amount: Number(raw.amount),
    txDate: new Date(raw.tradeDate),
    source: "AA",
  };
}

// ─── Document mapper ──────────────────────────────────────────────────────────

export interface MappedFIData {
  holdings: NormalizedHolding[];
  transactions: NormalizedTransaction[];
  accountId: string;
  fipId: string;
}

export function mapFIDocument(
  doc: DecryptedFIDocument,
  fipId: string
): MappedFIData {
  const accountId = doc.account.linkedAccRef;
  const holdings: NormalizedHolding[] = [];
  const transactions: NormalizedTransaction[] = [];

  // ── Holdings from Summary ──
  const holdingList =
    doc.account.Summary?.Investment?.Holdings?.Holding ?? [];

  for (const raw of holdingList) {
    const mapped = mapHolding(raw, accountId, fipId);
    if (mapped) holdings.push(mapped);
  }

  // ── Transactions ──
  const txList = doc.account.Transactions?.Transaction ?? [];

  for (const raw of txList) {
    const mapped = mapTransaction(raw);
    if (mapped) transactions.push(mapped);
  }

  logger.debug(
    { accountId, fipId, holdings: holdings.length, transactions: transactions.length },
    "Mapped FI document"
  );

  return { holdings, transactions, accountId, fipId };
}
