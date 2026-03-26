"use client"

import { Bell, LogOut, Moon, Settings, Sun, TrendingUp, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

interface NavbarProps {
  currentView: "portfolio" | "tax-saver" | "profile" | "settings"
  onViewChange: (view: "portfolio" | "tax-saver" | "profile" | "settings") => void
  onLogout: () => void
}

export function Navbar({ currentView, onViewChange, onLogout }: NavbarProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary">
              <TrendingUp className="size-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg hidden sm:inline-block">InvestWise</span>
          </div>
          
          <nav className="flex items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => onViewChange("portfolio")}
              className={cn(
                "text-sm font-medium",
                currentView === "portfolio" 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Portfolio
            </Button>
            <Button
              variant="ghost"
              onClick={() => onViewChange("tax-saver")}
              className={cn(
                "text-sm font-medium",
                currentView === "tax-saver" 
                  ? "bg-accent text-accent-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Tax Saver
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
            <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-loss" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    JD
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
              <DropdownMenuItem onClick={onLogout} className="text-loss focus:text-loss">
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
