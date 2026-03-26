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
  id: string
  stockName: string
  symbol: string
  suggestedSellQty: number
  currentPrice: number
  buyPrice: number
  expectedTaxSaved: number
  holdingPeriod: string
}

interface LossHarvestingRecommendation {
  id: string
  stockName: string
  symbol: string
  suggestedSellQty: number
  currentPrice: number
  buyPrice: number
  lossToBook: number
  potentialOffset: number
}

interface TaxRecommendations {
  gainHarvesting: GainHarvestingRecommendation[]
  lossHarvesting: LossHarvestingRecommendation[]
  summary: {
    totalPotentialTaxSaved: number
    ltcgExemptionUsed: number
    ltcgExemptionLimit: number
    totalLossToBook: number
  }
}

// Simulates an API call to fetch tax recommendations
async function fetchTaxRecommendations(): Promise<TaxRecommendations> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    gainHarvesting: [
      {
        id: "1",
        stockName: "HDFC Bank",
        symbol: "HDFCBANK",
        suggestedSellQty: 40,
        currentPrice: 1650,
        buyPrice: 1420,
        expectedTaxSaved: 9200,
        holdingPeriod: "18 months",
      },
      {
        id: "2",
        stockName: "State Bank of India",
        symbol: "SBIN",
        suggestedSellQty: 100,
        currentPrice: 695,
        buyPrice: 580,
        expectedTaxSaved: 11500,
        holdingPeriod: "24 months",
      },
      {
        id: "3",
        stockName: "ICICI Bank",
        symbol: "ICICIBANK",
        suggestedSellQty: 60,
        currentPrice: 1075,
        buyPrice: 920,
        expectedTaxSaved: 9300,
        holdingPeriod: "15 months",
      },
      {
        id: "4",
        stockName: "Tata Consultancy Services",
        symbol: "TCS",
        suggestedSellQty: 10,
        currentPrice: 3920,
        buyPrice: 3400,
        expectedTaxSaved: 5200,
        holdingPeriod: "20 months",
      },
    ],
    lossHarvesting: [
      {
        id: "1",
        stockName: "Bharti Airtel",
        symbol: "BHARTIARTL",
        suggestedSellQty: 30,
        currentPrice: 1165,
        buyPrice: 1280,
        lossToBook: 3450,
        potentialOffset: 3450,
      },
      {
        id: "2",
        stockName: "Hindustan Unilever",
        symbol: "HINDUNILVR",
        suggestedSellQty: 20,
        currentPrice: 2490,
        buyPrice: 2720,
        lossToBook: 4600,
        potentialOffset: 4600,
      },
      {
        id: "3",
        stockName: "Asian Paints",
        symbol: "ASIANPAINT",
        suggestedSellQty: 15,
        currentPrice: 2850,
        buyPrice: 3150,
        lossToBook: 4500,
        potentialOffset: 4500,
      },
    ],
    summary: {
      totalPotentialTaxSaved: 35200,
      ltcgExemptionUsed: 82000,
      ltcgExemptionLimit: 100000,
      totalLossToBook: 12550,
    },
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Potential Tax Saved
            </CardTitle>
            <IndianRupee className="size-4 text-profit" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-profit">
              {formatCurrency(data.summary.totalPotentialTaxSaved)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              By following all suggestions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              LTCG Exemption Used
            </CardTitle>
            <Sparkles className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.ltcgExemptionUsed)}
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{exemptionPercentUsed.toFixed(0)}% used</span>
                <span>{formatCurrency(data.summary.ltcgExemptionLimit)}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-profit transition-all"
                  style={{ width: `${Math.min(exemptionPercentUsed, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Exemption
            </CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.summary.ltcgExemptionLimit - data.summary.ltcgExemptionUsed)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Tax-free LTCG remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Loss to Book
            </CardTitle>
            <AlertTriangle className="size-4 text-loss" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-loss">
              {formatCurrency(data.summary.totalLossToBook)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              To offset realized gains
            </p>
          </CardContent>
        </Card>
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
                    <TableHead className="text-right">Sell Qty</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Holding Period</TableHead>
                    <TableHead className="text-right">Tax Saved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.gainHarvesting.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{rec.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {rec.stockName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {rec.suggestedSellQty}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rec.buyPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rec.currentPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{rec.holdingPeriod}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-profit">
                        {formatCurrency(rec.expectedTaxSaved)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                    <TableHead className="text-right">Sell Qty</TableHead>
                    <TableHead className="text-right">Buy Price</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Loss to Book</TableHead>
                    <TableHead className="text-right">Potential Offset</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lossHarvesting.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{rec.symbol}</div>
                          <div className="text-xs text-muted-foreground">
                            {rec.stockName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {rec.suggestedSellQty}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rec.buyPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(rec.currentPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-loss">
                        -{formatCurrency(rec.lossToBook)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-profit">
                        {formatCurrency(rec.potentialOffset)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
