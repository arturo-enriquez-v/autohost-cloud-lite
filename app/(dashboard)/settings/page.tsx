// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"
import { AssistantSettingsCard } from "@/components/features/settings/AssistantSettingsCard"
import { useCurrentUser } from "@/lib/context/current-user-context"

/**
 * Platform settings (admins). What belongs to each user (notifications, API tokens) is in My account.
 */
export default function SettingsPage() {
  const { isAdmin, isLoading } = useCurrentUser()

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Platform settings for administrators. Your notifications and API tokens are in{" "}
          <Link href="/profile?tab=notifications" className="text-[#70AEFF] underline">
            My account
          </Link>
          .
        </p>
      </div>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : isAdmin ? (
        <AssistantSettingsCard />
      ) : (
        <p className="text-sm text-muted-foreground">Only administrators can change platform settings.</p>
      )}
    </div>
  )
}
