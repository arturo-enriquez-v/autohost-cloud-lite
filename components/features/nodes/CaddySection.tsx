// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { useEffect } from "react"
import { useCaddyStatus } from "@/lib/features/nodes/caddy/hooks/useCaddyStatus"
import { CaddyStatusBanner } from "@/components/features/nodes/CaddyStatusBanner"
import { CaddyRoutesCard } from "@/components/features/nodes/CaddyRoutesCard"

/** Caddy status and routes of one node. Give it `key={nodeId}` when the node can change. */
export function CaddySection({ nodeId }: { nodeId: string }) {
  const { status, check, liveRoutes } = useCaddyStatus(nodeId)

  useEffect(() => {
    check()
  }, [check])

  return (
    <>
      <CaddyStatusBanner status={status} onRetry={check} />
      <CaddyRoutesCard nodeId={nodeId} caddyStatus={status} liveRoutes={liveRoutes} />
    </>
  )
}
