// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

"use client"

import { ConnectorsPanel } from "@/components/features/connectors/ConnectorsPanel"
import { useProjectContext } from "@/lib/context/project-context"

export default function ConnectorsPage() {
  const { selectedProject } = useProjectContext()
  return <ConnectorsPanel projectId={selectedProject?.id} />
}
