// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Bell, KeyRound, User } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileDetails } from "@/components/features/profile/ProfileDetails"
import { EmailReportsCard } from "@/components/features/settings/EmailReportsCard"
import { TelegramBotsCard } from "@/components/features/settings/TelegramBotsCard"
import { ApiTokensCard } from "@/components/features/settings/ApiTokensCard"

const TABS = ["profile", "notifications", "api"] as const
type Tab = (typeof TABS)[number]

/** My account: everything that belongs to the signed-in user (any role). Tabs can be linked with ?tab=. */
function AccountTabs() {
  const router = useRouter()
  const params = useSearchParams()
  const requested = params.get("tab") as Tab | null
  const tab: Tab = requested && TABS.includes(requested) ? requested : "profile"

  return (
    <Tabs value={tab} onValueChange={(v) => router.replace(v === "profile" ? "/profile" : `/profile?tab=${v}`, { scroll: false })}>
      <TabsList>
        <TabsTrigger value="profile">
          <User className="mr-1.5 h-4 w-4" /> Profile
        </TabsTrigger>
        <TabsTrigger value="notifications">
          <Bell className="mr-1.5 h-4 w-4" /> Notifications
        </TabsTrigger>
        <TabsTrigger value="api">
          <KeyRound className="mr-1.5 h-4 w-4" /> API access
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="mt-6">
        <ProfileDetails />
      </TabsContent>
      <TabsContent value="notifications" className="mt-6 space-y-6">
        <EmailReportsCard />
        <TelegramBotsCard />
      </TabsContent>
      <TabsContent value="api" className="mt-6 space-y-6">
        <ApiTokensCard />
      </TabsContent>
    </Tabs>
  )
}

export default function AccountPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My account</h1>
        <p className="text-sm text-muted-foreground">Your profile, notifications and API access</p>
      </div>
      <Suspense>
        <AccountTabs />
      </Suspense>
    </div>
  )
}
