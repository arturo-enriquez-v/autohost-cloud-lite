"use client"

import { useState } from "react"
import { Pencil, Check, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useNode } from "../hooks"
import { useNodes } from "../hooks"

interface NodeRenameCardProps {
  nodeId: string
}

export function NodeRenameCard({ nodeId }: NodeRenameCardProps) {
  const { node, isLoading: nodeLoading } = useNode(nodeId)
  const { updateNode } = useNodes()

  const [value, setValue] = useState("")
  const [synced, setSynced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!nodeLoading && node && !synced) {
    setSynced(true)
    setValue(node.hostname || node.name || "")
  }

  const handleRename = async () => {
    if (!value.trim()) { setError("El nombre no puede estar vacío"); return }
    try {
      setLoading(true); setError(null)
      await updateNode(nodeId, value.trim())
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al renombrar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pencil className="h-5 w-5" />
          Rename node
        </CardTitle>
        <CardDescription>Change the display name for this node.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 max-w-md">
          <Input
            value={value}
            onChange={(e) => { setValue(e.target.value); setSaved(false) }}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            disabled={loading || nodeLoading}
            placeholder="Node name"
          />
          <Button onClick={handleRename} disabled={loading || nodeLoading} className="shrink-0 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
            {loading ? "Saving…" : saved ? "Saved!" : "Rename"}
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  )
}
