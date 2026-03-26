"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw, TrendingDown, TrendingUp, Wallet, BarChart3, Clock, ArrowDownUp } from "lucide-react"
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
  _id: string
  tradingSymbol: string
  exchange: string
  isin: string
  quantity: number
  product: "Delivered" | "Not Delivered"
  averagePrice: number
  profitandloss: number
  pnlpercentage: number
  dateOfPurchase: string
}

interface PortfolioResponse {
  success: boolean
  source: string
  warning?: string
  apiError?: string
  message?: string
  portfolio?: {
    _id: string
    user: string
    holdings: Holding[]
    lastSyncedAt: string
    updatedAt: string
  }
  holdings?: Holding[]
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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [source, setSource] = useState<string>("")
  const [warning, setWarning] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      const data: PortfolioResponse = await fetchApi("/portfolio")

      if (data.portfolio && data.portfolio.holdings) {
        setHoldings(data.portfolio.holdings)
      } else if (data.holdings) {
        setHoldings(data.holdings)
      } else {
        setHoldings([])
      }

      setSource(data.source || "")
      setWarning(data.warning || data.apiError || "")
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to fetch portfolio:", error)
      setWarning(error instanceof Error ? error.message : "Failed to fetch portfolio")
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    setWarning("")
    try {
      const data: PortfolioResponse = await fetchApi("/portfolio/sync", {
        method: "POST",
      })

      if (data.portfolio && data.portfolio.holdings) {
        setHoldings(data.portfolio.holdings)
      } else {
        setHoldings([])
      }

      setSource("angelone")
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Sync failed:", error)
      setWarning(error instanceof Error ? error.message : "Sync failed")
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRefresh = () => {
    loadData(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    )
  }

  // Calculate totals from holdings
  const totalInvestment = holdings.reduce(
    (sum, h) => sum + h.quantity * h.averagePrice,
    0
  )
  const totalPL = holdings.reduce(
    (sum, h) => sum + h.profitandloss,
    0
  )
  const totalCurrentValue = totalInvestment + totalPL
  const totalPLPercent = totalInvestment > 0 ? (totalPL / totalInvestment) * 100 : 0

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
          {source && (
            <span className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              source === "cache" ? "bg-green-500/10 text-green-500" :
              source === "angelone" ? "bg-blue-500/10 text-blue-500" :
              source === "cache_stale" ? "bg-yellow-500/10 text-yellow-500" :
              "bg-gray-500/10 text-gray-500"
            )}>
              {source === "cache" ? "From Cache" :
               source === "angelone" ? "Live" :
               source === "cache_stale" ? "Stale Cache" :
               source === "empty" ? "No Data" : source}
            </span>
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
          <Button
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <ArrowDownUp className={cn("size-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync from Broker"}
          </Button>
        </div>
      </div>

      {/* Warning banner */}
      {warning && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 rounded-lg px-4 py-3 text-sm">
          ⚠️ {warning}
        </div>
      )}

      {/* Empty state */}
      {holdings.length === 0 && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Portfolio Data</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              Connect your AngelOne account by clicking &quot;Sync from Broker&quot; to import your holdings.
              Make sure your AngelOne credentials are configured in the backend .env file.
            </p>
            <Button onClick={handleSync} disabled={isSyncing}>
              <ArrowDownUp className={cn("size-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync from Broker"}
            </Button>
          </CardContent>
        </Card>
      )}

      {holdings.length > 0 && (
        <>
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
                  Across {holdings.length} stocks
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

          {/* Section B: Holdings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Current Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead>Exchange</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Avg. Price</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">P&L %</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Purchase Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((holding) => (
                    <TableRow key={holding._id || holding.isin || holding.tradingSymbol}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{holding.tradingSymbol}</div>
                          {holding.isin && (
                            <div className="text-xs text-muted-foreground">{holding.isin}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs px-2 py-0.5 rounded bg-muted font-medium">
                          {holding.exchange}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {holding.quantity}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(holding.averagePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={cn(
                            "font-mono font-medium",
                            holding.profitandloss >= 0 ? "text-profit" : "text-loss"
                          )}
                        >
                          {formatCurrency(holding.profitandloss)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={cn(
                            "font-mono font-medium",
                            holding.pnlpercentage >= 0 ? "text-profit" : "text-loss"
                          )}
                        >
                          {formatPercent(holding.pnlpercentage)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded font-medium",
                          holding.product === "Delivered"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-orange-500/10 text-orange-500"
                        )}>
                          {holding.product}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(holding.dateOfPurchase)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
