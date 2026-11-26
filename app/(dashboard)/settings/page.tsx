// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import Link from "next/link"
import { Loader2, Settings } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { AssistantSettingsCard } from "@/components/features/settings/AssistantSettingsCard"
import { useCurrentUser } from "@/lib/context/current-user-context"

/**
 * Platform settings (admins). What belongs to each user (notifications, API tokens) is in My account.
 */
export default function SettingsPage() {
  const { isAdmin, isLoading } = useCurrentUser()

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        icon={Settings}
        title="Settings"
        description={
          <>
            Platform settings for administrators. Your notifications and API tokens are in{" "}
            <Link href="/profile?tab=notifications" className="text-[#70AEFF] underline">
              My account
            </Link>
            .
          </>
        }
      />
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
