// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 Arturo (AutoHost)

import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  /** The section's icon, the same one the sidebar shows for it. */
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** Buttons and badges shown on the right (below the title on small screens). */
  actions?: ReactNode
  className?: string
}

/**
 * The header every dashboard page starts with, so all sections look alike: icon, title and a one-line
 * description on the left, actions on the right.
 */
export function PageHeader({ icon: Icon, title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
          {Icon && <Icon className="h-6 w-6 shrink-0 text-[#70AEFF]" />}
          <span className="truncate">{title}</span>
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
