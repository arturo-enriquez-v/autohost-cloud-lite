"use client"

import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useNodes } from "@/lib/hooks/useNodes"
import { getTimeSinceLastSeen } from "@/lib/utils/node-status"
import { Loader2 } from "lucide-react"
import { NodeActions } from "@/components/features/nodes/NodeActions"

export default function NodesPage() {
  const router = useRouter()
  const { nodes, isLoading, isUpdating, error, updateNode, deleteNode } = useNodes()

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
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((node) => (
                <TableRow key={node.id} className="hover:bg-accent/50">
                  <TableCell
                    className="font-medium cursor-pointer"
                    onClick={() => router.push(`/node/${node.id}`)}
                  >
                    {node.hostname || node.name}
                  </TableCell>
                  <TableCell
                    className="font-mono text-sm cursor-pointer"
                    onClick={() => router.push(`/node/${node.id}`)}
                  >
                    {node.ipLocal || "N/A"}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => router.push(`/node/${node.id}`)}
                  >
                    {node.os || "N/A"}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => router.push(`/node/${node.id}`)}
                  >
                    N/A
                  </TableCell>
                  <TableCell
                    className="text-muted-foreground cursor-pointer"
                    onClick={() => router.push(`/node/${node.id}`)}
                  >
                    {getTimeSinceLastSeen(node.lastSeenAt)}
                  </TableCell>
                  <TableCell
                    className="cursor-pointer"
                    onClick={() => router.push(`/node/${node.id}`)}
                  >
                    <Badge
                      variant={node.status === "online" ? "default" : "destructive"}
                      className={node.status === "online" ? "bg-success text-black" : ""}
                    >
                      {node.status === "online" ? "🟢" : "🔴"} {node.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <NodeActions
                      node={node}
                      onUpdate={updateNode}
                      onDelete={deleteNode}
                      isUpdating={isUpdating}
                    />
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
