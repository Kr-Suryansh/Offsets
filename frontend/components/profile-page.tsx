"use client"

import { LogOut, User, Activity, Edit3, Briefcase, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export function ProfilePage() {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      {/* Header Profile Section */}
      <Card className="overflow-hidden border-none shadow-md">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-800" />
        <CardContent className="relative pt-0 pb-6 px-6 flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
          <Avatar className="size-24 border-4 border-background -mt-12 bg-muted text-muted-foreground shadow-sm">
            <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">JD</AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold">John Doe</h1>
            <p className="text-muted-foreground">Premium Member • Joined March 2024</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
            <Button variant="outline" className="w-full sm:w-auto">
              <Edit3 className="size-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Info & Stats */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                  <User className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="text-sm font-medium">john.doe@example.com</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Award className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subscription Plan</p>
                  <p className="text-sm font-medium">TaxSmart Elite</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <Briefcase className="size-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Connected Broker</p>
                  <p className="text-sm font-medium">Zerodha Kite (Active)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Tax Optimization Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Total Tax Saved (YTD)</span>
                    <span className="font-semibold text-profit">₹ 45,200</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-profit w-[65%]" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 text-right">Target: ₹ 70,000</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">LTCG Limit Utilized</span>
                    <span className="font-semibold px-2 bg-secondary rounded-sm">₹ 82,000 / 1L</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="md:col-span-2 space-y-6">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Recent AI Insights & Activity</CardTitle>
                <CardDescription>Your latest tax-saving steps.</CardDescription>
              </div>
              <Activity className="size-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Harvested Loss in HINDUNILVR</TableCell>
                    <TableCell><span className="text-xs bg-loss/10 text-loss px-2 py-1 rounded-md">Loss Harvesting</span></TableCell>
                    <TableCell className="text-right text-muted-foreground">Today</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Booked ₹45k LTCG in HDFCBANK</TableCell>
                    <TableCell><span className="text-xs bg-profit/10 text-profit px-2 py-1 rounded-md">Gain Harvesting</span></TableCell>
                    <TableCell className="text-right text-muted-foreground">2 Days Ago</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">AI Strategy Check: Conservative</TableCell>
                    <TableCell><span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md">System Update</span></TableCell>
                    <TableCell className="text-right text-muted-foreground">1 Week Ago</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Connected Zerodha Account</TableCell>
                    <TableCell><span className="text-xs bg-secondary px-2 py-1 rounded-md text-secondary-foreground">Integration</span></TableCell>
                    <TableCell className="text-right text-muted-foreground">1 Month Ago</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 mt-auto flex justify-center py-4">
              <Button variant="link" className="text-sm text-primary">View Full Activity Log</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
