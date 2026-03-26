"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw, TrendingDown, TrendingUp, Wallet, BarChart3, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { fetchApi } from "@/lib/api"

interface Holding {
  id: string
  name: string
  symbol: string
  quantity: number
  avgBuyPrice: number
  currentPrice: number
  buyDate?: string // Added for tax calculation
}

interface PortfolioData {
  holdings: Holding[]
  realizedPL: {
    stcg: number
    ltcg: number
  }
}

// Default portfolio to send for analysis
const DEFAULT_PORTFOLIO: Holding[] = [
  {
    id: "1",
    name: "Reliance Industries",
    symbol: "RELIANCE",
    quantity: 50,
    avgBuyPrice: 2450,
    currentPrice: 2580,
    buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString(), // 2 years ago (LTCG)
  },
  {
    id: "2",
    name: "Tata Consultancy Services",
    symbol: "TCS",
    quantity: 25,
    avgBuyPrice: 3650,
    currentPrice: 3890,
    buyDate: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString(), // 6 months ago (STCG)
  },
  {
    id: "3",
    name: "HDFC Bank",
    symbol: "HDFCBANK",
    quantity: 100,
    avgBuyPrice: 1580,
    currentPrice: 1620,
    buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1, new Date().getMonth() - 1)).toISOString(), // 13 months ago (LTCG)
  },
  {
    id: "4",
    name: "Infosys",
    symbol: "INFY",
    quantity: 75,
    avgBuyPrice: 1480,
    currentPrice: 1520,
    buyDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString(), // 3 months ago
  },
  {
    id: "5",
    name: "ICICI Bank",
    symbol: "ICICIBANK",
    quantity: 120,
    avgBuyPrice: 980,
    currentPrice: 1050,
    buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString(), // 3 years ago
  },
  {
    id: "6",
    name: "Bharti Airtel",
    symbol: "BHARTIARTL",
    quantity: 60,
    avgBuyPrice: 1250,
    currentPrice: 1180, // Loss making
    buyDate: new Date(new Date().setMonth(new Date().getMonth() - 8)).toISOString(), // 8 months ago
  },
  {
    id: "7",
    name: "Hindustan Unilever",
    symbol: "HINDUNILVR",
    quantity: 40,
    avgBuyPrice: 2680,
    currentPrice: 2520, // Loss making
    buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1, new Date().getMonth() + 2)).toISOString(), // 10 months ago
  },
  {
    id: "8",
    name: "State Bank of India",
    symbol: "SBIN",
    quantity: 200,
    avgBuyPrice: 620,
    currentPrice: 680,
    buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1, new Date().getMonth() - 5)).toISOString(), // 17 months ago
  },
]

// Fetch market and tax analysis data from backend
async function fetchMarketData(): Promise<PortfolioData> {
  try {
    // Convert to backend format
    const assets = DEFAULT_PORTFOLIO.map(h => ({
      stockName: h.symbol,
      buyPrice: h.avgBuyPrice,
      currentPrice: h.currentPrice,
      buyDate: h.buyDate || new Date().toISOString(),
      quantity: h.quantity
    }))

    const data = await fetchApi("/tax/analyze", {
      method: "POST",
      body: JSON.stringify({ assets })
    })

    // Map backend response back if needed, or just use the passed DEFAULT_PORTFOLIO
    // For now, we use our local portfolio UI, but we could merge data.
    return {
      holdings: DEFAULT_PORTFOLIO,
      realizedPL: {
        stcg: 45680, // Keeping realized PL mock since it's historical
        ltcg: 82450,
      },
    }
  } catch (err) {
    console.error("Error fetching tax analysis", err)
    return {
      holdings: DEFAULT_PORTFOLIO,
      realizedPL: { stcg: 0, ltcg: 0 }
    }
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatPercent(percent: number): string {
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`
}

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      const result = await fetchMarketData()
      setData(result)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to fetch market data:", error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadData()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadData])

  const handleRefresh = () => {
    loadData(true)
  }

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    )
  }

  // Calculate totals
  const totalInvestment = data.holdings.reduce(
    (sum, h) => sum + h.quantity * h.avgBuyPrice,
    0
  )
  const totalCurrentValue = data.holdings.reduce(
    (sum, h) => sum + h.quantity * h.currentPrice,
    0
  )
  const totalPL = totalCurrentValue - totalInvestment
  const totalPLPercent = (totalPL / totalInvestment) * 100

  return (
    <div className="flex flex-col gap-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">Track your investments in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" />
              <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("size-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Section A: Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Investment
            </CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvestment)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {data.holdings.length} stocks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Value
            </CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Market value today</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unrealized P&L
            </CardTitle>
            {totalPL >= 0 ? (
              <TrendingUp className="size-4 text-profit" />
            ) : (
              <TrendingDown className="size-4 text-loss" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                totalPL >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatCurrency(totalPL)}
            </div>
            <p
              className={cn(
                "text-sm font-medium mt-1",
                totalPL >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatPercent(totalPLPercent)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section B: Realized P&L */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Short-Term Capital Gains (STCG)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                data.realizedPL.stcg >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatCurrency(data.realizedPL.stcg)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current Financial Year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Long-Term Capital Gains (LTCG)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                data.realizedPL.ltcg >= 0 ? "text-profit" : "text-loss"
              )}
            >
              {formatCurrency(data.realizedPL.ltcg)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current Financial Year
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section C: Holdings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Holdings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stock Name</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Avg. Buy Price</TableHead>
                <TableHead className="text-right">LTP</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
                <TableHead className="text-right">P&L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.holdings.map((holding) => {
                const totalValue = holding.quantity * holding.currentPrice
                const totalCost = holding.quantity * holding.avgBuyPrice
                const pl = totalValue - totalCost
                const plPercent = (pl / totalCost) * 100

                return (
                  <TableRow key={holding.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{holding.symbol}</div>
                        <div className="text-xs text-muted-foreground">{holding.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {holding.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(holding.avgBuyPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(holding.currentPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className={cn(
                          "font-mono font-medium",
                          pl >= 0 ? "text-profit" : "text-loss"
                        )}
                      >
                        {formatCurrency(pl)}
                      </div>
                      <div
                        className={cn(
                          "text-xs font-mono",
                          pl >= 0 ? "text-profit" : "text-loss"
                        )}
                      >
                        {formatPercent(plPercent)}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
