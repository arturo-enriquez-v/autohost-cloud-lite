"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Cpu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes"
import { VirtualMachinesPanel } from "@/components/features/nodes/VirtualMachinesPanel"

export default function NodeVMsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nodeId } = use(params)
  const router = useRouter()
  const { node, isLoading: nodeLoading } = useNodes(nodeId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/node/${nodeId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Cpu className="h-6 w-6 text-indigo-500" />
            Hypervisor & Virtual Machines
          </h2>
          <p className="text-sm text-muted-foreground">
            {nodeLoading ? "Loading…" : node?.name ?? nodeId} · KVM Virtualization Management
          </p>
        </div>
      </div>

      <VirtualMachinesPanel nodeId={nodeId} />
    </div>
  )
}
