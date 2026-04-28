"use client"

import { Bell, LogOut, Moon, Settings, Sun, TrendingUp, TrendingDown, User, ChevronDown, BarChart3, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

type View = "portfolio" | "tax-saver" | "tax-gain" | "tax-loss" | "profile" | "settings" | "groww"

interface NavbarProps {
  currentView: View
  onViewChange: (view: View) => void
  onLogout: () => void
  user?: any
}

export function Navbar({ currentView, onViewChange, onLogout, user }: NavbarProps) {
  const { theme, setTheme } = useTheme()

  const isTaxView = currentView === "tax-saver" || currentView === "tax-gain" || currentView === "tax-loss"

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange("portfolio")}>
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary">
              <TrendingUp className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">InvestWise</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => onViewChange("portfolio")}
              className={cn(
                "text-sm font-medium gap-2",
                currentView === "portfolio"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BarChart3 className="size-4" />
              Portfolio
            </Button>

            {/* Tax Saver dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "text-sm font-medium gap-1",
                    isTaxView
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Tax Saver
                  <ChevronDown className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Strategies</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onViewChange("tax-saver")}
                  className={cn("cursor-pointer gap-2", currentView === "tax-saver" && "bg-accent")}
                >
                  <TrendingUp className="size-4 text-muted-foreground" />
                  Overview
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onViewChange("tax-gain")}
                  className={cn("cursor-pointer gap-2", currentView === "tax-gain" && "bg-accent")}
                >
                  <TrendingUp className="size-4 text-green-500" />
                  Gain Harvesting
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onViewChange("tax-loss")}
                  className={cn("cursor-pointer gap-2", currentView === "tax-loss" && "bg-accent")}
                >
                  <TrendingDown className="size-4 text-red-500" />
                  Loss Harvesting
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              onClick={() => onViewChange("groww")}
              className={cn(
                "text-sm font-medium gap-2",
                currentView === "groww"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Link2 className="size-4" />
              Groww
            </Button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
            <Bell className="size-5" />
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs uppercase">
                    {user?.name ? user.name.substring(0, 2) : "JD"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onViewChange("profile")} className="cursor-pointer">
                <User className="mr-2 size-4" />
                View Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewChange("settings")} className="cursor-pointer">
                <Settings className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="mr-2 size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
