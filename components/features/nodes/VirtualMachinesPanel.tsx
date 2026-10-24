"use client"

import { useState } from "react"
import {
  Server,
  Cpu,
  Layers,
  HardDrive,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Network,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useVirtualMachines } from "@/lib/features/nodes/hooks/useVirtualMachines"
import { CreateVMDialog } from "./CreateVMDialog"
import type { VirtualMachine, VMStatus } from "@/lib/features/nodes/types"

interface VirtualMachinesPanelProps {
  nodeId: string
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 GB"
  const gb = bytes / (1024 * 1024 * 1024)
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(1)} TB`
  }
  return `${gb.toFixed(1)} GB`
}

function getStatusBadge(status: VMStatus) {
  switch (status) {
    case "running":
      return (
        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30 gap-1.5 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Running
        </Badge>
      )
    case "creating":
    case "provisioning":
      return (
        <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30 gap-1.5 font-medium">
          <RefreshCw className="h-3 w-3 animate-spin" />
          {status === "creating" ? "Creating" : "Provisioning"}
        </Badge>
      )
    case "stopped":
      return (
        <Badge variant="outline" className="bg-zinc-500/15 text-zinc-400 border-zinc-500/30 gap-1.5 font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Stopped
        </Badge>
      )
    case "error":
      return (
        <Badge variant="outline" className="bg-red-500/15 text-red-500 border-red-500/30 gap-1.5 font-medium">
          <AlertCircle className="h-3 w-3" />
          Error
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {status}
        </Badge>
      )
  }
}

export function VirtualMachinesPanel({ nodeId }: VirtualMachinesPanelProps) {
  const {
    hypervisor,
    vms,
    isLoading,
    refresh,
    createVM,
    actionVM,
    deleteVM,
  } = useVirtualMachines(nodeId)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, string | null>>({})

  const info = hypervisor?.info
  const isCapable = Boolean(info?.capable)

  const handleAction = async (vmId: string, action: "start" | "stop" | "reboot" | "destroy") => {
    setActionLoading((prev) => ({ ...prev, [vmId]: action }))
    try {
      if (action === "destroy") {
        if (!confirm("Are you sure you want to destroy this VM and all its storage volumes?")) {
          return
        }
      }
      await actionVM(vmId, action)
    } finally {
      setActionLoading((prev) => ({ ...prev, [vmId]: null }))
    }
  }

  return (
    <Card className="overflow-hidden border border-border/70 shadow-sm">
      <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 bg-muted/20">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <Server className="h-5 w-5 text-indigo-500" />
              Virtual Machines
            </CardTitle>

            {isCapable ? (
              <Badge variant="outline" className="bg-indigo-500/15 text-indigo-400 border-indigo-500/30 text-xs gap-1">
                <CheckCircle2 className="h-3 w-3 text-indigo-400" />
                KVM Hypervisor Active
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs gap-1">
                <AlertCircle className="h-3 w-3" />
                Hypervisor Inactive
              </Badge>
            )}

            {vms.length > 0 && (
              <Badge variant="secondary" className="text-xs font-semibold">
                {vms.length} {vms.length === 1 ? "VM" : "VMs"}
              </Badge>
            )}
          </div>
          <CardDescription className="mt-1 text-xs sm:text-sm text-muted-foreground">
            {isCapable
              ? `Hardware virtualization enabled via libvirt (${info?.libvirt_version || "ready"})`
              : "Provision hardware-isolated Linux guest instances on this node"}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          {isCapable && (
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="h-8 px-3 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Provision VM</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Hypervisor Specs or Inactive Guidance */}
        {isCapable ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-card/60 border border-border/60 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" /> Host CPU
              </span>
              <p className="font-semibold text-foreground text-sm">{info?.cpu_cores || 0} Cores</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-indigo-400" /> Total RAM
              </span>
              <p className="font-semibold text-foreground text-sm">{formatBytes(info?.ram_total_bytes || 0)}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5 text-indigo-400" /> Storage Pool
              </span>
              <p className="font-semibold text-foreground text-sm">
                {formatBytes(info?.storage_available_bytes || 0)} free
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1">
                <Network className="h-3.5 w-3.5 text-indigo-400" /> Virtual Network
              </span>
              <p className="font-semibold text-foreground text-sm font-mono">{info?.network_name || "virbr0"}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-semibold text-foreground">Hypervisor Not Configured</p>
                <p className="text-muted-foreground mt-0.5">
                  To provision VMs on this host, install KVM, QEMU and libvirt using the AutoHost CLI:
                </p>
                <code className="inline-block mt-2 px-2.5 py-1 rounded bg-black/40 text-emerald-400 font-mono text-xs border border-white/10">
                  autohost setup hypervisor
                </code>
              </div>
            </div>
          </div>
        )}

        {/* Virtual Machines List */}
        {vms.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-lg border border-dashed border-border/80">
            <Server className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <h4 className="text-sm font-semibold text-foreground">No Virtual Machines</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {isCapable
                ? "No guest VMs are currently running on this hypervisor host. Click 'Provision VM' to deploy an isolated instance with auto-enrollment."
                : "Once the hypervisor is active, you can provision and manage guest VMs right from this dashboard."}
            </p>
            {isCapable && (
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="mt-4 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Provision First VM
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {vms.map((vm) => {
              const currentAction = actionLoading[vm.id]
              return (
                <div
                  key={vm.id}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border/70 bg-card hover:border-indigo-500/40 transition-colors"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{vm.name}</span>
                      {getStatusBadge(vm.status)}
                      <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {vm.image}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 font-mono">
                        <Cpu className="h-3 w-3" /> {vm.vcpus} vCPU
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <Layers className="h-3 w-3" /> {(vm.ram_mb / 1024).toFixed(0)} GB RAM
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <HardDrive className="h-3 w-3" /> {vm.disk_gb} GB Disk
                      </span>
                      {vm.ip_address && (
                        <span className="flex items-center gap-1 font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <Network className="h-3 w-3" /> {vm.ip_address}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="h-3 w-3" /> {new Date(vm.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {vm.error_message && (
                      <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20 mt-1">
                        {vm.error_message}
                      </p>
                    )}
                  </div>

                  {/* VM Action Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                    {vm.status === "stopped" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction(vm.id, "start")}
                        disabled={Boolean(currentAction)}
                        className="h-8 px-2.5 text-xs gap-1 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
                        title="Start VM"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start</span>
                      </Button>
                    )}

                    {vm.status === "running" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(vm.id, "reboot")}
                          disabled={Boolean(currentAction)}
                          className="h-8 px-2 text-xs gap-1"
                          title="Reboot VM"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Reboot</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(vm.id, "stop")}
                          disabled={Boolean(currentAction)}
                          className="h-8 px-2 text-xs gap-1 text-amber-500 border-amber-500/40 hover:bg-amber-500/10"
                          title="Shutdown VM"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                          <span className="hidden sm:inline">Stop</span>
                        </Button>
                      </>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(vm.id, "destroy")}
                      disabled={Boolean(currentAction)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                      title="Destroy VM"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <CreateVMDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={async (data) => {
          await createVM(data)
        }}
      />
    </Card>
  )
}
