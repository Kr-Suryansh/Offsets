"use client"

import { useEffect, useState, useCallback } from "react"
import { TrendingDown, RefreshCw, Sparkles, ChevronDown, ChevronUp, Clock, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { fetchApi } from "@/lib/api"

interface Recommendation {
  stockName: string
  reason: string
}



function JsonBlock({ data }: { data: any }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen(v => !v)}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Code2 className="size-4 text-muted-foreground" />
            Raw JSON Response
          </CardTitle>
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
        <CardDescription>Full API response from the AI strategy engine.</CardDescription>
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

export function TaxLossPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [explanation, setExplanation] = useState("")
  const [rawData, setRawData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true)
    try {
      // Send empty body — backend reads portfolio from DB for this user
      const res = await fetchApi("/tax/harvest-loss", { method: "POST", body: JSON.stringify({}) })
      setRawData(res)
      const ai = res?.aiStrategy
      if (ai?.parsedJson) {
        setExplanation(ai.parsedJson.explanation || ai.textExplanation || "")
        const recs = Array.isArray(ai.parsedJson.recommendations) ? ai.parsedJson.recommendations : []
        setRecommendations(recs.map((r: any) => ({ stockName: r.stockName || "Unknown", reason: r.reason || "" })))
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingDown className="size-6 text-red-500" />
            Loss Harvesting
          </h1>
          <p className="text-muted-foreground text-sm">
            Book losses to offset realized gains and reduce your overall tax liability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-4" />
              {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => loadData(true)} disabled={isRefreshing}>
            <RefreshCw className={cn("size-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-red-500/30 bg-red-500/5">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">What is Loss Harvesting?</strong> Tax-loss harvesting means selling investments that have declined in value to realize a capital loss, which offsets capital gains elsewhere in your portfolio. Under Indian tax law, short-term losses offset both STCG and LTCG; long-term losses can only offset LTCG.
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Spinner className="size-8" /></div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>Stocks from your portfolio identified for loss harvesting this financial year.</CardDescription>
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
                {recommendations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-12">
                      No loss harvesting opportunities identified at this time.
                    </TableCell>
                  </TableRow>
                ) : recommendations.map((rec, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="font-semibold">{rec.stockName}</div>
                      <div className="text-xs text-red-500 font-medium">Loss Harvest</div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-sm">{rec.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* AI Explanation */}
      {explanation && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-red-500" />
              AI Strategy Explanation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">{explanation}</p>
          </CardContent>
        </Card>
      )}

      {/* Raw JSON */}
      <JsonBlock data={rawData} />

      {/* Disclaimer */}
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-5 pb-5">
          <p className="text-xs text-muted-foreground">
            <strong>Disclaimer:</strong> These AI recommendations are for informational purposes only. Consult a certified tax advisor before making investment decisions.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
