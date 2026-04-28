"use client"

import { useEffect, useState } from "react"
import { AuthPage }         from "@/components/auth-page"
import { Navbar }           from "@/components/navbar"
import { PortfolioPage }    from "@/components/portfolio-page"
import { TaxSaverPage }     from "@/components/tax-saver-page"
import { TaxGainPage }      from "@/components/tax-gain-page"
import { TaxLossPage }      from "@/components/tax-loss-page"
import { ProfilePage }      from "@/components/profile-page"
import { SettingsPage }     from "@/components/settings-page"
import { GrowwConnectPage } from "@/components/groww-connect-page"
import { fetchApi }         from "@/lib/api"
import { Spinner }          from "@/components/ui/spinner"

type View = "auth" | "portfolio" | "tax-saver" | "tax-gain" | "tax-loss" | "profile" | "settings" | "groww"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("auth")
  const [user, setUser] = useState<any>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          const userData = await fetchApi("/auth/me")
          setUser(userData)
          setCurrentView("portfolio")
        } catch (error) {
          console.error("Token invalid", error)
          localStorage.removeItem("token")
        }
      }
      setIsInitializing(false)
    }
    checkAuth()
  }, [])

  const handleLogin = (userData: any) => {
    setUser(userData)
    setCurrentView("portfolio")
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    setUser(null)
    setCurrentView("auth")
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (currentView === "auth" || !user) {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        currentView={currentView as any}
        onViewChange={(view) => setCurrentView(view as View)}
        onLogout={handleLogout}
        user={user}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {currentView === "portfolio" && <PortfolioPage />}
        {currentView === "tax-saver" && <TaxSaverPage />}
        {currentView === "tax-gain" && <TaxGainPage />}
        {currentView === "tax-loss" && <TaxLossPage />}
        {currentView === "profile" && <ProfilePage user={user} />}
        {currentView === "settings" && <SettingsPage />}
        {currentView === "groww" && <GrowwConnectPage />}
      </main>
    </div>
  )
}
