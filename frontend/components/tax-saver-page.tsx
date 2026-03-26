"use client"

import { useEffect, useState, useCallback } from "react"
import { TrendingUp, TrendingDown, RefreshCw, Sparkles, AlertTriangle, IndianRupee, Clock } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface GainHarvestingRecommendation {
  stockName: string
  action: string
  reason: string
  taxImpact: string
}

interface LossHarvestingRecommendation {
  stockName: string
  action: string
  reason: string
  taxImpact: string
}

interface TaxRecommendations {
  gainHarvesting: GainHarvestingRecommendation[]
  lossHarvesting: LossHarvestingRecommendation[]
  gainExplanation: string
  lossExplanation: string
  summary: {
    totalPotentialTaxSaved: number
    ltcgExemptionUsed: number
    ltcgExemptionLimit: number
    totalLossToBook: number
  }
}

import { fetchApi } from "@/lib/api"

// We use the same DEFAULT_PORTFOLIO constructed similarly to portfolio-page
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


// Simulates an API call to fetch tax recommendations by calling real backend
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
        action: r.action || "HOLD",
        reason: r.reason || r.explanation || "",
        taxImpact: r.taxImpact || r.estimatedBenefit || ""
      })),
      lossHarvesting: lossAI.recommendations.map((r: any) => ({
        stockName: r.stockName || "Unknown",
        action: r.action || "HOLD",
        reason: r.reason || r.explanation || "",
        taxImpact: r.taxImpact || r.estimatedBenefit || ""
      })),
      gainExplanation: gainAI.explanation,
      lossExplanation: lossAI.explanation,
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
      gainExplanation: "Failed to load",
      lossExplanation: "Failed to load",
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

  const exemptionPercentUsed = (data.summary.ltcgExemptionUsed / data.summary.ltcgExemptionLimit) * 100

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tax Saver Suggestions</h1>
          <p className="text-muted-foreground">
            Smart recommendations to optimize your tax liability
          </p>
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



      {/* Tabs for Gain/Loss Harvesting */}
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

        <TabsContent value="gain">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5 text-profit" />
                Gain Harvesting Recommendations
              </CardTitle>
              <CardDescription>
                Realize gains up to ₹1 Lakh tax-free under LTCG exemption. Sell these
                stocks to utilize your exemption limit before the financial year ends.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                    <TableHead className="text-right">Reason</TableHead>
                    <TableHead className="text-right">Tax Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.gainHarvesting.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No gain harvesting opportunities found.
                      </TableCell>
                    </TableRow>
                  ) : data.gainHarvesting.map((rec, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-medium">{rec.stockName}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{rec.action}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {rec.reason}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-profit">
                        {rec.taxImpact}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.gainExplanation && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg text-sm">
                  <strong>AI Strategy Insight:</strong> {data.gainExplanation}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loss">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="size-5 text-loss" />
                Loss Harvesting Recommendations
              </CardTitle>
              <CardDescription>
                Book losses on underperforming stocks to offset your realized capital
                gains and reduce your overall tax liability for the financial year.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                    <TableHead className="text-right">Reason</TableHead>
                    <TableHead className="text-right">Tax Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lossHarvesting.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No loss harvesting opportunities found.
                      </TableCell>
                    </TableRow>
                  ) : data.lossHarvesting.map((rec, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="font-medium">{rec.stockName}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <Badge variant="secondary">{rec.action}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {rec.reason}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-loss">
                        {rec.taxImpact}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.lossExplanation && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg text-sm">
                  <strong>AI Strategy Insight:</strong> {data.lossExplanation}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Disclaimer:</strong> These recommendations are based on your
            current portfolio data and general tax rules. Please consult a certified
            tax advisor before making any investment decisions. Tax laws may vary
            based on your specific situation and are subject to change.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
