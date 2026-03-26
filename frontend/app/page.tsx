"use client"

import { useState } from "react"
import { AuthPage } from "@/components/auth-page"
import { Navbar } from "@/components/navbar"
import { PortfolioPage } from "@/components/portfolio-page"
import { TaxSaverPage } from "@/components/tax-saver-page"
import { ProfilePage } from "@/components/profile-page"
import { SettingsPage } from "@/components/settings-page"

type View = "auth" | "portfolio" | "tax-saver" | "profile" | "settings"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("auth")

  const handleLogin = () => {
    setCurrentView("portfolio")
  }

  const handleLogout = () => {
    setCurrentView("auth")
  }

  const handleViewChange = (view: Exclude<View, "auth">) => {
    setCurrentView(view)
  }

  if (currentView === "auth") {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        currentView={currentView as Exclude<View, "auth">}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {currentView === "portfolio" && <PortfolioPage />}
        {currentView === "tax-saver" && <TaxSaverPage />}
        {currentView === "profile" && <ProfilePage />}
        {currentView === "settings" && <SettingsPage />}
      </main>
    </div>
  )
}
