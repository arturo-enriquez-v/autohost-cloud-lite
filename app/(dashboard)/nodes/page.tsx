"use client"

import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useNodes } from "@/lib/hooks/useNodes"
import { getTimeSinceLastSeen } from "@/lib/utils/node-status"
import { Loader2 } from "lucide-react"

export default function NodesPage() {
  const router = useRouter()
  const { nodes, isLoading, error } = useNodes()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Nodes</h2>
        <p className="text-sm text-muted-foreground">Manage your server infrastructure</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Nodes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Operating System</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.id} className="cursor-pointer hover:bg-accent/50" onClick={() => router.push(`/node/${node.id}`)}>
                  <TableCell className="font-medium">{node.name}</TableCell>
                  <TableCell className="font-mono text-sm">{node.ipLocal || "N/A"}</TableCell>
                  <TableCell>{node.os || "N/A"}</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell className="text-muted-foreground">{getTimeSinceLastSeen(node.lastSeenAt)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={node.status === "online" ? "default" : "destructive"}
                      className={node.status === "online" ? "bg-success text-black" : ""}
                    >
                      {node.status === "online" ? "🟢" : "🔴"} {node.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
