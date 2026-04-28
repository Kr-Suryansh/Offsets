"use client"

import { useEffect, useState } from "react"
import {
  ExternalLink, RefreshCw, Link2, Link2Off, ShieldCheck,
  Clock, CheckCircle2, AlertCircle, Info, Eye, EyeOff,
} from "lucide-react"
import { Button }      from "@/components/ui/button"
import { Input }       from "@/components/ui/input"
import { Label }       from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge }       from "@/components/ui/badge"
import { Separator }   from "@/components/ui/separator"
import { toast }       from "sonner"
import { fetchApi }    from "@/lib/api"
import { cn }          from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

interface GrowwStatus {
  linked:       boolean
  isActive?:    boolean
  tokenMask?:   string
  lastSyncedAt?: string
  linkedAt?:    string
}

interface SyncResult {
  success:  boolean
  message:  string
  portfolio?: { holdings: unknown[] }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GrowwConnectPage() {
  const [status, setStatus]         = useState<GrowwStatus | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(true)

  const [token, setToken]           = useState("")
  const [showToken, setShowToken]   = useState(false)
  const [linking, setLinking]       = useState(false)
  const [syncing, setSyncing]       = useState(false)
  const [unlinking, setUnlinking]   = useState(false)

  // ── Load status on mount ──
  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    setLoadingStatus(true)
    try {
      const data = await fetchApi("/groww/status")
      setStatus(data)
    } catch {
      setStatus({ linked: false })
    } finally {
      setLoadingStatus(false)
    }
  }

  // ── Link account ──
  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      toast.error("Please enter your Groww access token")
      return
    }

    setLinking(true)
    try {
      const data = await fetchApi("/groww/link", {
        method: "POST",
        body: JSON.stringify({ accessToken: token.trim() }),
      })
      toast.success(data.message || "Groww account linked!")
      setToken("")
      await loadStatus()
    } catch (err: any) {
      if (err.message?.includes("expired") || err.message?.includes("invalid")) {
        toast.error("Token invalid or expired. Generate a fresh token from Groww dashboard.")
      } else {
        toast.error(err.message || "Failed to link account")
      }
    } finally {
      setLinking(false)
    }
  }

  // ── Sync portfolio ──
  const handleSync = async () => {
    setSyncing(true)
    try {
      const data: SyncResult = await fetchApi("/groww/sync", { method: "POST" })
      const count = data.portfolio?.holdings?.length ?? 0
      if (count > 0) {
        toast.success(`✓ Synced ${count} holdings from Groww. Go to Portfolio to view them.`)
      } else {
        toast.info(data.message || "Sync complete — no holdings found in your DEMAT account")
      }
      await loadStatus()
    } catch (err: any) {
      if (err.message?.includes("expired") || err.message?.includes("TOKEN_EXPIRED")) {
        toast.error("Token expired. Groww tokens expire daily at 6 AM — please re-link.")
        setStatus((s) => s ? { ...s, isActive: false } : s)
      } else {
        toast.error(err.message || "Sync failed")
      }
    } finally {
      setSyncing(false)
    }
  }

  // ── Unlink ──
  const handleUnlink = async () => {
    if (!confirm("Remove your linked Groww account? Your cached portfolio data will remain.")) return
    setUnlinking(true)
    try {
      await fetchApi("/groww/unlink", { method: "DELETE" })
      toast.success("Groww account unlinked")
      setStatus({ linked: false })
    } catch (err: any) {
      toast.error(err.message || "Failed to unlink")
    } finally {
      setUnlinking(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Connect Groww Account</h1>
        <p className="text-muted-foreground">
          Link your Groww DEMAT account to automatically sync your equity holdings.
        </p>
      </div>

      {/* Status card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingStatus ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <RefreshCw className="size-4 animate-spin" /> Checking...
            </div>
          ) : status?.linked ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {status.isActive ? (
                  <CheckCircle2 className="size-5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="size-5 text-yellow-500 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Groww Account</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        status.isActive
                          ? "border-green-500/40 text-green-500"
                          : "border-yellow-500/40 text-yellow-500"
                      )}
                    >
                      {status.isActive ? "Active" : "Token Expired"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Token: {status.tokenMask}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Linked on</p>
                  <p className="font-medium">{formatDate(status.linkedAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" /> Last synced
                  </p>
                  <p className="font-medium">{formatDate(status.lastSyncedAt)}</p>
                </div>
              </div>

              {!status.isActive && (
                <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>
                    Your Groww token has expired. Groww tokens expire daily at 6:00 AM IST.
                    Generate a new token and re-link below.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Link2Off className="size-4" />
              No Groww account linked
            </div>
          )}
        </CardContent>

        {status?.linked && (
          <CardFooter className="flex gap-2 border-t pt-4">
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing || !status.isActive}
            >
              <RefreshCw className={cn("size-4 mr-2", syncing && "animate-spin")} />
              {syncing ? "Syncing..." : "Sync Portfolio"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={handleUnlink}
              disabled={unlinking}
            >
              <Link2Off className="size-4 mr-2" />
              {unlinking ? "Unlinking..." : "Unlink"}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Link form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="size-4" />
            {status?.linked ? "Update Token" : "Link Groww Account"}
          </CardTitle>
          <CardDescription>
            Paste your Groww access token below. The token is validated live and stored encrypted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Groww Access Token</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? "text" : "password"}
                  placeholder="Paste your Bearer access token here"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="pr-10 font-mono text-sm"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showToken ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={linking || !token.trim()} className="w-full">
              <Link2 className="size-4 mr-2" />
              {linking ? "Validating & Linking..." : status?.linked ? "Update Token" : "Link Account"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* How to get token */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
            <Info className="size-4" />
            How to get your Groww Access Token
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <ol className="list-decimal list-inside space-y-1.5">
            <li>Log in to your Groww account at groww.in</li>
            <li>Click your profile icon → Settings</li>
            <li>Navigate to <span className="font-medium text-foreground">Trading APIs</span></li>
            <li>Click <span className="font-medium text-foreground">Generate API Keys</span> → Access Token</li>
            <li>Copy the generated token and paste it above</li>
          </ol>
          <div className="flex items-center gap-1.5 pt-1 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="size-3.5 shrink-0" />
            <span className="text-xs">Tokens expire daily at 6:00 AM IST. You&apos;ll need to re-link each day.</span>
          </div>
          <div className="pt-1">
            <a
              href="https://groww.in/trade-api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Open Groww Trading API Dashboard
              <ExternalLink className="size-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
