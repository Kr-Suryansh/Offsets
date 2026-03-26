"use client"

import { useState } from "react"
import { Bell, Moon, Sun, User, Paintbrush, Shield, BellRing, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

export function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const [strategy, setStrategy] = useState("moderate")
  
  const handleSave = () => {
    toast.success("Settings saved successfully!")
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

        <TabsContent value="preferences" className="space-y-4">
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

          <Card>
            <CardHeader>
              <CardTitle>Tax-Saving Strategy</CardTitle>
              <CardDescription>Adjust how aggressive the AI should be when suggesting trades.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "conservative", name: "Conservative", desc: "Minimal trades, focus on long-term hold." },
                  { id: "moderate", name: "Moderate", desc: "Balanced approach to tax harvesting." },
                  { id: "aggressive", name: "Aggressive", desc: "Maximize short-term tax benefits frequently." }
                ].map((s) => (
                  <div 
                    key={s.id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${strategy === s.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setStrategy(s.id)}
                  >
                    <h3 className="font-semibold">{s.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what updates you want to receive.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Harvesting Alerts</Label>
                  <p className="text-sm text-muted-foreground">Get notified when a profitable tax-harvesting opportunity arises.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Weekly Portfolio Summary</Label>
                  <p className="text-sm text-muted-foreground">Receive a weekly digest of your portfolio performance.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Changes in Tax Laws</Label>
                  <p className="text-sm text-muted-foreground">Alerts about new budget or tax policies affecting your investments.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your security preferences and connected devices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Two-Factor Authentication (2FA)</Label>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                </div>
                <Button variant="outline">Enable 2FA</Button>
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
      
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline">Reset Defaults</Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  )
}
