"use client"

import { useEffect, useState, useCallback } from "react"
import { TrendingUp, TrendingDown, RefreshCw, Sparkles, ChevronDown, ChevronUp, Clock, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

interface Recommendation {
  stockName: string
  reason: string
  action?: string
  taxImpact?: string
}

interface TaxRecommendations {
  gainHarvesting: Recommendation[]
  lossHarvesting: Recommendation[]
  gainExplanation: string
  lossExplanation: string
  rawGain: any
  rawLoss: any
  summary: {
    totalPotentialTaxSaved: number
    ltcgExemptionUsed: number
    ltcgExemptionLimit: number
    totalLossToBook: number
  }
}

const DEFAULT_PORTFOLIO = [
  { id: "1", name: "Reliance Industries", symbol: "RELIANCE", quantity: 50, avgBuyPrice: 2450, currentPrice: 2580, buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 2)).toISOString() },
  { id: "2", name: "Tata Consultancy Services", symbol: "TCS", quantity: 25, avgBuyPrice: 3650, currentPrice: 3890, buyDate: new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString() },
  { id: "3", name: "HDFC Bank", symbol: "HDFCBANK", quantity: 100, avgBuyPrice: 1580, currentPrice: 1620, buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1, new Date().getMonth() - 1)).toISOString() },
  { id: "4", name: "Infosys", symbol: "INFY", quantity: 75, avgBuyPrice: 1480, currentPrice: 1520, buyDate: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString() },
  { id: "5", name: "ICICI Bank", symbol: "ICICIBANK", quantity: 120, avgBuyPrice: 980, currentPrice: 1050, buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 3)).toISOString() },
  { id: "6", name: "Bharti Airtel", symbol: "BHARTIARTL", quantity: 60, avgBuyPrice: 1250, currentPrice: 1180, buyDate: new Date(new Date().setMonth(new Date().getMonth() - 8)).toISOString() },
  { id: "7", name: "Hindustan Unilever", symbol: "HINDUNILVR", quantity: 40, avgBuyPrice: 2680, currentPrice: 2520, buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1, new Date().getMonth() + 2)).toISOString() },
  { id: "8", name: "State Bank of India", symbol: "SBIN", quantity: 200, avgBuyPrice: 620, currentPrice: 680, buyDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1, new Date().getMonth() - 5)).toISOString() },
]

async function fetchTaxRecommendations(): Promise<TaxRecommendations> {
  const assets = DEFAULT_PORTFOLIO.map(h => ({
    stockName: h.symbol,
    buyPrice: h.avgBuyPrice,
    currentPrice: h.currentPrice,
    buyDate: h.buyDate,
    quantity: h.quantity
  }))

  try {
    const [gainRes, lossRes] = await Promise.all([
      fetchApi("/tax/harvest-gain", { method: "POST", body: JSON.stringify({ assets }) }).catch(() => null),
      fetchApi("/tax/harvest-loss", { method: "POST", body: JSON.stringify({ assets }) }).catch(() => null)
    ])

    const parseAI = (aiStrategy: any) => {
      if (!aiStrategy || !aiStrategy.parsedJson) return { explanation: "No strategy available.", recommendations: [] }
      return {
        explanation: aiStrategy.parsedJson.explanation || aiStrategy.textExplanation || "",
        recommendations: Array.isArray(aiStrategy.parsedJson.recommendations) ? aiStrategy.parsedJson.recommendations : []
      }
    }

    const gainAI = gainRes ? parseAI(gainRes.aiStrategy) : { explanation: "", recommendations: [] }
    const lossAI = lossRes ? parseAI(lossRes.aiStrategy) : { explanation: "", recommendations: [] }

    return {
      gainHarvesting: gainAI.recommendations.map((r: any) => ({
        stockName: r.stockName || "Unknown",
        reason: r.reason || r.explanation || "",
      })),
      lossHarvesting: lossAI.recommendations.map((r: any) => ({
        stockName: r.stockName || "Unknown",
        reason: r.reason || r.explanation || "",
      })),
      gainExplanation: gainAI.explanation,
      lossExplanation: lossAI.explanation,
      rawGain: gainRes,
      rawLoss: lossRes,
      summary: {
        totalPotentialTaxSaved: 35200,
        ltcgExemptionUsed: 82000,
        ltcgExemptionLimit: 100000,
        totalLossToBook: 12550,
      },
    }
  } catch (error) {
    console.error("Failed fetching tax recs", error)
    return {
      gainHarvesting: [],
      lossHarvesting: [],
      gainExplanation: "Failed to load recommendations.",
      lossExplanation: "Failed to load recommendations.",
      rawGain: null,
      rawLoss: null,
      summary: { totalPotentialTaxSaved: 0, ltcgExemptionUsed: 0, ltcgExemptionLimit: 100000, totalLossToBook: 0 }
    }
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function JsonBlock({ data, label }: { data: any; label: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="size-4 text-muted-foreground" />
            Raw JSON — {label}
          </CardTitle>
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
        <CardDescription>Inspect the full API response from the AI strategy engine.</CardDescription>
      </CardHeader>
      {open && (
        <CardContent>
          <pre className="text-xs bg-muted/40 rounded-lg p-4 overflow-x-auto max-h-64 leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </CardContent>
      )}
    </Card>
  )
}

export function TaxSaverPage() {
  const [data, setData] = useState<TaxRecommendations | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      const result = await fetchTaxRecommendations()
      setData(result)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Failed to fetch tax recommendations:", error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner className="size-8" />
      </div>
    )
  }

  const exemptionPct = Math.round((data.summary.ltcgExemptionUsed / data.summary.ltcgExemptionLimit) * 100)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tax Saver Suggestions</h1>
          <p className="text-muted-foreground">Smart recommendations to optimize your tax liability</p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" />
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={isRefreshing}>
            <RefreshCw className={cn("size-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Tax Saved (Est.)</p>
            <p className="text-xl font-bold text-green-500 mt-1">{formatCurrency(data.summary.totalPotentialTaxSaved)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">LTCG Used</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(data.summary.ltcgExemptionUsed)}</p>
            <p className="text-xs text-muted-foreground">{exemptionPct}% of ₹1L limit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Exemption Remaining</p>
            <p className="text-xl font-bold mt-1">{formatCurrency(data.summary.ltcgExemptionLimit - data.summary.ltcgExemptionUsed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Losses to Book</p>
            <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(data.summary.totalLossToBook)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gain" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="gain" className="gap-2">
            <TrendingUp className="size-4" />
            Gain Harvesting
          </TabsTrigger>
          <TabsTrigger value="loss" className="gap-2">
            <TrendingDown className="size-4" />
            Loss Harvesting
          </TabsTrigger>
        </TabsList>

        {/* ── GAIN TAB ── */}
        <TabsContent value="gain" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5 text-green-500" />
                Gain Harvesting Recommendations
              </CardTitle>
              <CardDescription>
                Realize gains up to ₹1 Lakh tax-free under LTCG exemption. Sell these stocks to utilize your exemption limit before the financial year ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead>Why This Stock?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.gainHarvesting.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        No gain harvesting opportunities found.
                      </TableCell>
                    </TableRow>
                  ) : data.gainHarvesting.map((rec, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-semibold">{rec.stockName}</div>
                        <div className="text-xs text-green-500 font-medium">Gain Harvest</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-sm">
                        {rec.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* AI Explanation */}
          {data.gainExplanation && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-green-500" />
                  AI Strategy Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{data.gainExplanation}</p>
              </CardContent>
            </Card>
          )}

          {/* Raw JSON */}
          <JsonBlock data={data.rawGain} label="Gain Harvesting" />
        </TabsContent>

        {/* ── LOSS TAB ── */}
        <TabsContent value="loss" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="size-5 text-red-500" />
                Loss Harvesting Recommendations
              </CardTitle>
              <CardDescription>
                Book losses on underperforming stocks to offset your realized capital gains and reduce your overall tax liability.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead>Why This Stock?</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lossHarvesting.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                        No loss harvesting opportunities found.
                      </TableCell>
                    </TableRow>
                  ) : data.lossHarvesting.map((rec, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-semibold">{rec.stockName}</div>
                        <div className="text-xs text-red-500 font-medium">Loss Harvest</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-sm">
                        {rec.reason}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* AI Explanation */}
          {data.lossExplanation && (
            <Card className="border-red-500/20 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="size-4 text-red-500" />
                  AI Strategy Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">{data.lossExplanation}</p>
              </CardContent>
            </Card>
          )}

          {/* Raw JSON */}
          <JsonBlock data={data.rawLoss} label="Loss Harvesting" />
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> These recommendations are based on your current portfolio data and general tax rules. Please consult a certified tax advisor before making any investment decisions. Tax laws may vary based on your specific situation and are subject to change.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
