"use client"

import { useState } from "react"
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  ShieldCheck,
  Building2,
  Landmark,
  Crown,
  BadgeCheck,
  Clock,
  AlertTriangle,
  Edit2,
  Check,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type KycStatus = "Verified" | "Pending" | "Action Required"

interface ProfileData {
  fullName: string
  email: string
  phone: string
  dob: string
  panCard: string
  kycStatus: KycStatus
  dematAccountNumber: string
  bankName: string
  bankAccountLast4: string
  subscriptionTier: "Free" | "Premium"
}

const profileData: ProfileData = {
  fullName: "Yash Agrawal",
  email: "yash.agrawal@example.com",
  phone: "+91 98765 43210",
  dob: "1998-03-15",
  panCard: "ABCDE1234F",
  kycStatus: "Verified",
  dematAccountNumber: "1234567890123456",
  bankName: "HDFC Bank",
  bankAccountLast4: "5678",
  subscriptionTier: "Premium",
}

function KycBadge({ status }: { status: KycStatus }) {
  if (status === "Verified") {
    return (
      <Badge className="gap-1.5 bg-profit/15 text-profit border-profit/30 hover:bg-profit/20">
        <BadgeCheck className="size-3.5" />
        Verified
      </Badge>
    )
  }
  if (status === "Pending") {
    return (
      <Badge className="gap-1.5 bg-chart-4/15 text-chart-4 border-chart-4/30 hover:bg-chart-4/20">
        <Clock className="size-3.5" />
        Pending
      </Badge>
    )
  }
  return (
    <Badge className="gap-1.5 bg-loss/15 text-loss border-loss/30 hover:bg-loss/20">
      <AlertTriangle className="size-3.5" />
      Action Required
    </Badge>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  editable = false,
  onSave,
  type = "text",
}: {
  icon: React.ElementType
  label: string
  value: string
  editable?: boolean
  onSave?: (val: string) => void
  type?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  const handleSave = () => {
    onSave?.(draft)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(value)
    setEditing(false)
  }

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        {editing ? (
          <div className="flex items-center gap-2">
            <Input
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="size-8 shrink-0 text-profit" onClick={handleSave}>
              <Check className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" className="size-8 shrink-0 text-loss" onClick={handleCancel}>
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{value}</p>
            {editable && (
              <Button
                size="icon"
                variant="ghost"
                className="size-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setEditing(true)}
              >
                <Edit2 className="size-3" />
              </Button>
            )}
          </div>
        )}
      </div>
      {editable && !editing && (
        <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => setEditing(true)}>
          <Edit2 className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(profileData)

  const updateField = (field: keyof ProfileData) => (val: string) => {
    setProfile((prev) => ({ ...prev, [field]: val }))
  }

  const initials = profile.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">Manage your identity and account information</p>
      </div>

      {/* Profile Hero Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-profit/5 pointer-events-none" />
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative">
              <Avatar className="size-20 ring-4 ring-background shadow-xl">
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {profile.kycStatus === "Verified" && (
                <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-profit shadow-md">
                  <BadgeCheck className="size-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold">{profile.fullName}</h2>
              <p className="text-muted-foreground text-sm">{profile.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
                <KycBadge status={profile.kycStatus} />
                <Badge
                  className={cn(
                    "gap-1.5",
                    profile.subscriptionTier === "Premium"
                      ? "bg-chart-4/15 text-chart-4 border-chart-4/30 hover:bg-chart-4/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {profile.subscriptionTier === "Premium" && <Crown className="size-3.5" />}
                  {profile.subscriptionTier}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="size-4" />
              Personal Information
            </CardTitle>
            <CardDescription>Your basic identity details</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <InfoRow
              icon={User}
              label="Full Name"
              value={profile.fullName}
              editable
              onSave={updateField("fullName")}
            />
            <InfoRow
              icon={Mail}
              label="Email Address"
              value={profile.email}
              editable
              onSave={updateField("email")}
              type="email"
            />
            <InfoRow
              icon={Phone}
              label="Phone Number"
              value={profile.phone}
              editable
              onSave={updateField("phone")}
              type="tel"
            />
            <InfoRow
              icon={Calendar}
              label="Date of Birth"
              value={new Date(profile.dob).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              editable
              onSave={updateField("dob")}
              type="date"
            />
          </CardContent>
        </Card>

        {/* Regulatory & Tax Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" />
              Regulatory &amp; Tax Details
            </CardTitle>
            <CardDescription>KYC and tax identification</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <InfoRow
              icon={CreditCard}
              label="PAN Card Number"
              value={profile.panCard}
            />
            <div className="flex items-start gap-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <BadgeCheck className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">KYC Status</p>
                <KycBadge status={profile.kycStatus} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="size-4" />
              Account Details
            </CardTitle>
            <CardDescription>Your brokerage and banking information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-0 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
              <div className="flex flex-col gap-1 py-3 sm:py-0 sm:px-4 first:pl-0 last:pr-0">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted mb-2">
                  <Building2 className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Demat Account Number</p>
                <p className="text-sm font-mono font-medium tracking-wide">
                  {profile.dematAccountNumber.replace(/(.{4})/g, "$1 ").trim()}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-3 sm:py-0 sm:px-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted mb-2">
                  <Landmark className="size-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Linked Bank Account</p>
                <p className="text-sm font-medium">{profile.bankName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  •••• •••• •••• {profile.bankAccountLast4}
                </p>
              </div>
              <div className="flex flex-col gap-1 py-3 sm:py-0 sm:px-4">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg mb-2",
                    profile.subscriptionTier === "Premium"
                      ? "bg-chart-4/15"
                      : "bg-muted"
                  )}
                >
                  <Crown
                    className={cn(
                      "size-4",
                      profile.subscriptionTier === "Premium"
                        ? "text-chart-4"
                        : "text-muted-foreground"
                    )}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Subscription Tier</p>
                <Badge
                  className={cn(
                    "w-fit mt-0.5 gap-1.5",
                    profile.subscriptionTier === "Premium"
                      ? "bg-chart-4/15 text-chart-4 border-chart-4/30 hover:bg-chart-4/20"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {profile.subscriptionTier === "Premium" && <Crown className="size-3" />}
                  {profile.subscriptionTier}
                </Badge>
                {profile.subscriptionTier === "Free" && (
                  <Button size="sm" variant="outline" className="mt-2 w-fit text-xs h-7">
                    Upgrade to Premium
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
