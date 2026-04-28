// ─── Internal normalized schema ───────────────────────────────────────────────

export interface NormalizedHolding {
  isin: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  source: "AA" | "MANUAL";
  accountId: string;
  fipId: string;
}

export interface NormalizedTransaction {
  isin: string;
  symbol: string;
  txType: "BUY" | "SELL" | "DIVIDEND" | "BONUS" | "SPLIT";
  quantity: number;
  price: number;
  amount: number;
  txDate: Date;
  source: "AA" | "MANUAL";
}

export interface PortfolioSummary {
  userId: string;
  holdings: NormalizedHolding[];
  transactions: NormalizedTransaction[];
  totalInvested: number;
  currentValue: number;
  unrealizedPnL: number;
  asOf: Date;
}
