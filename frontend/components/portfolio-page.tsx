"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw, TrendingDown, TrendingUp, Wallet, BarChart3, Clock, ArrowDownUp, AlertTriangle } from "lucide-react"
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
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

// Normalized holding — matches the AA/Groww schema stored in MongoDB
interface Holding {
  isin:           string
  symbol:         string
  name:           string
  quantity:       number
  avgPrice:       number
  currentPrice:   number
  dateOfPurchase: string
  source:         string
}

interface PortfolioResponse {
  success:  boolean
  source:   string
  warning?: string
  message?: string
  portfolio?: { holdings: Holding[]; lastSyncedAt: string }
  holdings?:  Holding[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 2,
  }).format(amount)
}

function formatPercent(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PortfolioPage() {
  const [holdings, setHoldings]       = useState<Holding[]>([])
  const [source, setSource]           = useState<string>("")
  const [warning, setWarning]         = useState<string>("")
  const [loading, setLoading]         = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSyncing, setIsSyncing]     = useState(false)
  const [growwLinked, setGrowwLinked] = useState(false)

  // Check if Groww is linked on mount
  useEffect(() => {
    fetchApi("/groww/status")
      .then((d) => setGrowwLinked(d.linked && d.isActive))
      .catch(() => setGrowwLinked(false))
  }, [])

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      // Try Groww portfolio first, fall back to AA portfolio
      let data: PortfolioResponse | null = null

      try {
        data = await fetchApi("/groww/portfolio")
      } catch (e: any) {
        console.warn("Groww portfolio fetch failed, trying AA:", e.message)
      }

      // Fall back to AA if Groww returned empty or failed
      if (!data || data.source === "empty") {
        try {
          const aa = await fetchApi("/portfolio")
          if (aa.source !== "empty") data = aa
        } catch (e: any) {
          console.warn("AA portfolio fetch failed:", e.message)
        }
      }

      if (!data) {
        setHoldings([])
        setSource("empty")
        setLastUpdated(new Date())
        return
      }

      const raw = data.portfolio?.holdings ?? data.holdings ?? []
      setHoldings(raw)
      setSource(data.source || "")
      setWarning(data.warning || "")
      setLastUpdated(new Date())
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to fetch portfolio"
      setWarning(msg)
      toast.error(msg)
      console.error("loadData error:", msg)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // "Sync Portfolio" — check Groww status live, trigger sync if linked, then reload
  const handleSync = async () => {
    setIsSyncing(true)
    setWarning("")
    try {
      // Always check live status — don't rely on stale state
      let isGrowwActive = false
      try {
        const status = await fetchApi("/groww/status")
        isGrowwActive = status.linked && status.isActive
        setGrowwLinked(isGrowwActive)
      } catch {
        // status check failed — proceed to load from DB
      }

      if (isGrowwActive) {
        await fetchApi("/groww/sync", { method: "POST" })
      }
      await loadData()
    } catch (err: any) {
      if (err.message?.includes("expired") || err.message?.includes("TOKEN_EXPIRED")) {
        setWarning("Groww token expired. Go to the Groww page to re-link your account.")
        setGrowwLinked(false)
      } else {
        setWarning(err.message || "Sync failed")
        toast.error(err.message || "Sync failed")
      }
    } finally {
      setIsSyncing(false)
    }
  }

  useEffect(() => { loadData() }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    )
  }

  // ── Derived totals ──
  const totalInvested     = holdings.reduce((s, h) => s + h.avgPrice * h.quantity, 0)
  const totalCurrentValue = holdings.reduce((s, h) => s + (h.currentPrice || h.avgPrice) * h.quantity, 0)
  const totalPL           = totalCurrentValue - totalInvested
  const totalPLPercent    = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0

  const sourceLabel: Record<string, string> = {
    cache:       "Cached",
    cache_stale: "Stale Cache",
    empty:       "No Data",
    GROWW:       "Groww Live",
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">Track your investments in real-time</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" />
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          {source && (
            <span className={cn(
              "text-xs px-2 py-1 rounded-full font-medium",
              source === "cache"       ? "bg-green-500/10 text-green-500" :
              source === "cache_stale" ? "bg-yellow-500/10 text-yellow-500" :
                                         "bg-gray-500/10 text-gray-500"
            )}>
              {sourceLabel[source] ?? source}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={isRefreshing}>
            <RefreshCw className={cn("size-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleSync} disabled={isSyncing}>
            <ArrowDownUp className={cn("size-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Portfolio"}
          </Button>
        </div>
      </div>

      {/* Warning */}
      {warning && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
          <AlertTriangle className="size-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p>{warning}</p>
            <p className="text-xs mt-1 opacity-70">API: {process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000/api"}</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {holdings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Wallet className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Portfolio Data</h3>
            <p className="text-muted-foreground mb-4 max-w-md">
              {growwLinked
                ? "Click \"Sync Portfolio\" to fetch your latest holdings from Groww."
                : "Go to the Groww page to link your account, then sync your portfolio."}
            </p>
            <Button onClick={handleSync} disabled={isSyncing}>
              <ArrowDownUp className={cn("size-4 mr-2", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync Portfolio"}
            </Button>
          </CardContent>
        </Card>
      )}

      {holdings.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
                <Wallet className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
                <p className="text-xs text-muted-foreground mt-1">Across {holdings.length} stocks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Value</CardTitle>
                <BarChart3 className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalCurrentValue)}</div>
                <p className="text-xs text-muted-foreground mt-1">Market value today</p>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2 lg:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unrealized P&L</CardTitle>
                {totalPL >= 0
                  ? <TrendingUp className="size-4 text-profit" />
                  : <TrendingDown className="size-4 text-loss" />}
              </CardHeader>
              <CardContent>
                <div className={cn("text-2xl font-bold", totalPL >= 0 ? "text-profit" : "text-loss")}>
                  {formatCurrency(totalPL)}
                </div>
                <p className={cn("text-sm font-medium mt-1", totalPL >= 0 ? "text-profit" : "text-loss")}>
                  {formatPercent(totalPLPercent)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Holdings table */}
          <Card>
            <CardHeader>
              <CardTitle>Current Holdings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Avg. Price</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">P&L</TableHead>
                    <TableHead className="text-right">P&L %</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holdings.map((h, i) => {
                    const pl     = (h.currentPrice - h.avgPrice) * h.quantity
                    const plPct  = h.avgPrice > 0 ? ((h.currentPrice - h.avgPrice) / h.avgPrice) * 100 : 0
                    return (
                      <TableRow key={h.isin || h.symbol || i}>
                        <TableCell>
                          <div className="font-medium">{h.symbol || h.name}</div>
                          {h.isin && <div className="text-xs text-muted-foreground">{h.isin}</div>}
                        </TableCell>
                        <TableCell className="text-right font-mono">{h.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(h.avgPrice)}</TableCell>
                        <TableCell className="text-right font-mono">
                          {h.currentPrice ? formatCurrency(h.currentPrice) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-mono font-medium", pl >= 0 ? "text-profit" : "text-loss")}>
                            {formatCurrency(pl)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-mono font-medium", plPct >= 0 ? "text-profit" : "text-loss")}>
                            {formatPercent(plPct)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded font-medium",
                            h.source === "GROWW"
                              ? "bg-blue-500/10 text-blue-500"
                              : "bg-gray-500/10 text-gray-500"
                          )}>
                            {h.source || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(h.dateOfPurchase)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
