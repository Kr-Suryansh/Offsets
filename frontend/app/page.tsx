"use client"

import { useState } from "react"
import { AuthPage } from "@/components/auth-page"
import { Navbar } from "@/components/navbar"
import { PortfolioPage } from "@/components/portfolio-page"
import { TaxSaverPage } from "@/components/tax-saver-page"

type View = "auth" | "portfolio" | "tax-saver"

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("auth")

  const handleLogin = () => {
    setCurrentView("portfolio")
  }

  const handleLogout = () => {
    setCurrentView("auth")
  }

  const handleViewChange = (view: "portfolio" | "tax-saver") => {
    setCurrentView(view)
  }

  if (currentView === "auth") {
    return <AuthPage onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        currentView={currentView}
        onViewChange={handleViewChange}
        onLogout={handleLogout}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {currentView === "portfolio" && <PortfolioPage />}
        {currentView === "tax-saver" && <TaxSaverPage />}
      </main>
    </div>
  )
}
