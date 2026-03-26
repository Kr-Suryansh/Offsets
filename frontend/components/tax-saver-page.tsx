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

// Fetch stored AI results from DB (no AI call)
async function fetchStoredResults(): Promise<TaxRecommendations> {
  try {
    const res = await fetchApi("/tax/results")

    const mapRecs = (recs: any[]) => (recs || []).map((r: any) => ({
      stockName: r.stockName || "Unknown",
      reason: r.reason || "",
      action: r.action || "",
      taxImpact: r.taxImpact || "",
    }))

    return {
      gainHarvesting: mapRecs(res.gainHarvesting?.recommendations),
      lossHarvesting: mapRecs(res.lossHarvesting?.recommendations),
      gainExplanation: res.gainHarvesting?.explanation || "",
      lossExplanation: res.lossHarvesting?.explanation || "",
      rawGain: res.gainHarvesting,
      rawLoss: res.lossHarvesting,
      summary: {
        totalPotentialTaxSaved: res.gainHarvesting?.summary?.totalPotentialTaxSaved || 0,
        ltcgExemptionUsed: res.gainHarvesting?.summary?.ltcgExemptionUsed || 0,
        ltcgExemptionLimit: res.gainHarvesting?.summary?.ltcgExemptionLimit || 100000,
        totalLossToBook: res.lossHarvesting?.summary?.totalLossToBook || 0,
      },
    }
  } catch (error) {
    console.error("Failed fetching stored results", error)
    return {
      gainHarvesting: [], lossHarvesting: [],
      gainExplanation: "", lossExplanation: "",
      rawGain: null, rawLoss: null,
      summary: { totalPotentialTaxSaved: 0, ltcgExemptionUsed: 0, ltcgExemptionLimit: 100000, totalLossToBook: 0 }
    }
  }
}

// Trigger AI analysis (reads portfolio from DB on the backend)
async function runAnalysis(): Promise<void> {
  await Promise.all([
    fetchApi("/tax/harvest-gain", { method: "POST", body: JSON.stringify({}) }).catch(console.error),
    fetchApi("/tax/harvest-loss", { method: "POST", body: JSON.stringify({}) }).catch(console.error),
  ])
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
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      const result = await fetchStoredResults()
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
          <Button
            variant="default"
            size="sm"
            disabled={isAnalyzing}
            onClick={async () => {
              setIsAnalyzing(true)
              try {
                await runAnalysis()
                await loadData(true)
              } finally {
                setIsAnalyzing(false)
              }
            }}
          >
            <Sparkles className={cn("size-4 mr-2", isAnalyzing && "animate-pulse")} />
            {isAnalyzing ? "Analyzing..." : "Run Analysis"}
          </Button>
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
