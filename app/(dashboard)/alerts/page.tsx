"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, Wifi, ChevronLeft, ChevronRight, X } from "lucide-react"
import { useAlertEvents } from "@/lib/hooks"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { AlertItem } from "@/components/features/alerts/AlertItem"
import type { AlertFilters } from "@/lib/features/alerts/hooks/useAlertEvents"

export default function AlertsPage() {
  const {
    events,
    total,
    isLoading,
    error,
    refresh,
    page,
    setPage,
    totalPages,
    filters,
    applyFilters,
  } = useAlertEvents()

  const { nodes } = useNodes()

  // Local state for the filter form (applied on button click)
  const [localNodeId, setLocalNodeId] = useState(filters.nodeId ?? "")
  const [localFrom, setLocalFrom] = useState(filters.from ?? "")
  const [localTo, setLocalTo] = useState(filters.to ?? "")

  const hasActiveFilters = !!(filters.nodeId || filters.from || filters.to)

  function handleApply() {
    const next: AlertFilters = {}
    if (localNodeId) next.nodeId = localNodeId
    if (localFrom) next.from = localFrom
    if (localTo) next.to = localTo
    applyFilters(next)
  }

  function handleClear() {
    setLocalNodeId("")
    setLocalFrom("")
    setLocalTo("")
    applyFilters({})
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Alerts</h2>
          <p className="text-sm text-muted-foreground">Recent system alerts and notifications</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Node filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Node</label>
              <Select
                value={localNodeId || "_all"}
                onValueChange={(v) => setLocalNodeId(v === "_all" ? "" : v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All nodes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All nodes</SelectItem>
                  {nodes.map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.hostname ?? n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">From</label>
              <Input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className="w-40"
              />
            </div>

            {/* To */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                className="w-40"
              />
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2 pb-px">
              <Button size="sm" onClick={handleApply} disabled={isLoading}>
                Apply
              </Button>
              {hasActiveFilters && (
                <Button size="sm" variant="ghost" onClick={handleClear} disabled={isLoading}>
                  <X className="mr-1 h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Alerts</CardTitle>
          {!isLoading && total > 0 && (
            <span className="text-sm text-muted-foreground">{total} total</span>
          )}
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading alerts…
            </div>
          )}

          {!isLoading && error && (
            <p className="py-8 text-center text-sm text-destructive">{error}</p>
          )}

          {!isLoading && !error && events.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Wifi className="h-8 w-8" />
              <p className="text-sm">No alerts found.</p>
            </div>
          )}

          {!isLoading && !error && events.length > 0 && (
            <div className="space-y-3">
              {events.map((event) => (
                <AlertItem key={event.id} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
