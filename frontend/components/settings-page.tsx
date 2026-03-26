"use client"

import { useState } from "react"
import { Moon, Sun, Paintbrush, Shield, BellRing, Download, Trash2, IndianRupee, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { fetchApi } from "@/lib/api"

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  // Display Preferences
  const [showPortfolioValue, setShowPortfolioValue] = useState(true)
  const [indianNumberFormat, setIndianNumberFormat] = useState(true)

  // Notification Preferences
  const [notifications, setNotifications] = useState({
    harvestingAlerts: true,
    weeklySummary: true,
    taxLawChanges: true,
    priceAlerts: false,
    monthlyReport: false,
  })

  // Security
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const handleNotificationToggle = (key: keyof typeof notifications, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }))
    toast.info(value ? `${notificationLabels[key]} enabled` : `${notificationLabels[key]} disabled`)
  }

  const notificationLabels: Record<keyof typeof notifications, string> = {
    harvestingAlerts: "Harvesting Alerts",
    weeklySummary: "Weekly Portfolio Summary",
    taxLawChanges: "Tax Law Changes",
    priceAlerts: "Price Alerts",
    monthlyReport: "Monthly Report",
  }

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved!")
  }

  const handleExportCSV = () => {
    toast.success("Portfolio data exported as CSV!")
  }

  const handleClearSession = () => {
    toast.success("Session data cleared!")
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }
    setIsChangingPassword(true)
    try {
      await fetchApi("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })
      toast.success("Password changed successfully")
      setIsPasswordDialogOpen(false)
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error: any) {
      toast.error(error.message || "Failed to change password")
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and application settings.</p>
      </div>

      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="preferences" className="gap-2">
            <Paintbrush className="size-4" />
            Preferences
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <BellRing className="size-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="size-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* ── PREFERENCES TAB ── */}
        <TabsContent value="preferences" className="space-y-4">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how TaxSmart AI looks on your device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark themes.</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Sun className="size-4 text-muted-foreground" />
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                  <Moon className="size-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="size-5" />
                Display Preferences
              </CardTitle>
              <CardDescription>Control how portfolio data and numbers are displayed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Show Portfolio Value</Label>
                  <p className="text-sm text-muted-foreground">Display total portfolio value in the dashboard header.</p>
                </div>
                <div className="flex items-center gap-2">
                  {showPortfolioValue ? (
                    <Eye className="size-4 text-muted-foreground" />
                  ) : (
                    <EyeOff className="size-4 text-muted-foreground" />
                  )}
                  <Switch
                    checked={showPortfolioValue}
                    onCheckedChange={setShowPortfolioValue}
                  />
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Indian Number Format</Label>
                  <p className="text-sm text-muted-foreground">
                    Display numbers in Indian format (e.g., <span className="font-mono">₹12,34,567</span> instead of <span className="font-mono">₹1,234,567</span>).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {indianNumberFormat ? "₹12,34,567" : "₹1,234,567"}
                  </Badge>
                  <Switch
                    checked={indianNumberFormat}
                    onCheckedChange={setIndianNumberFormat}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={() => toast.success("Display preferences saved!")}>Save Preferences</Button>
            </CardFooter>
          </Card>

          {/* Data & Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="size-5" />
                Data &amp; Export
              </CardTitle>
              <CardDescription>Export your portfolio data or clear local session information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Export Portfolio as CSV</Label>
                  <p className="text-sm text-muted-foreground">Download all your holdings data as a spreadsheet.</p>
                </div>
                <Button variant="outline" onClick={handleExportCSV} className="gap-2">
                  <Download className="size-4" />
                  Export CSV
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Clear Session Data</Label>
                  <p className="text-sm text-muted-foreground">Remove cached recommendation data stored locally.</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleClearSession}
                  className="gap-2 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                  Clear Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NOTIFICATIONS TAB ── */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what updates you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                {
                  key: "harvestingAlerts" as const,
                  label: "Harvesting Alerts",
                  desc: "Get notified when a profitable tax-harvesting opportunity arises.",
                },
                {
                  key: "weeklySummary" as const,
                  label: "Weekly Portfolio Summary",
                  desc: "Receive a weekly digest of your portfolio performance.",
                },
                {
                  key: "taxLawChanges" as const,
                  label: "Tax Law Changes",
                  desc: "Alerts about new budget or tax policies affecting your investments.",
                },
                {
                  key: "priceAlerts" as const,
                  label: "Price Alerts",
                  desc: "Get notified when a stock in your portfolio crosses a key price level.",
                },
                {
                  key: "monthlyReport" as const,
                  label: "Monthly Report",
                  desc: "A detailed monthly tax-efficiency report delivered to your inbox.",
                },
              ].map((item, index, arr) => (
                <div key={item.key}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(val) => handleNotificationToggle(item.key, val)}
                    />
                  </div>
                  {index < arr.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleSaveNotifications}>Save Notification Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── SECURITY TAB ── */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your security preferences and connected services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Change Password</Label>
                  <p className="text-sm text-muted-foreground">Update your account password for better security.</p>
                </div>
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Change Password</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handlePasswordChange}>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                        <DialogDescription>
                          Enter your current password and your new password below.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="current">Current Password</Label>
                          <Input
                            id="current"
                            type="password"
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="new">New Password</Label>
                          <Input
                            id="new"
                            type="password"
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="confirm">Confirm New Password</Label>
                          <Input
                            id="confirm"
                            type="password"
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={isChangingPassword}>
                          {isChangingPassword ? "Saving..." : "Save changes"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Connected Broker</Label>
                  <p className="text-sm text-muted-foreground">Manage your Zerodha API integration.</p>
                </div>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10">Disconnect Broker</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
