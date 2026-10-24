"use client"

import { useState } from "react"
import { Cpu, HardDrive, Layers, Server, Key, User, PlusCircle, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { CreateVMRequest } from "@/lib/features/nodes/types"

interface CreateVMDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateVMRequest) => Promise<void>
}

const OS_OPTIONS = [
  { id: "ubuntu-24.04", name: "Ubuntu 24.04 LTS (Noble)", desc: "Latest LTS cloud image with cloud-init", recommended: true },
  { id: "ubuntu-22.04", name: "Ubuntu 22.04 LTS (Jammy)", desc: "Stable production cloud image" },
  { id: "debian-12", name: "Debian 12 (Bookworm)", desc: "Minimal and robust genericcloud image" },
]

export function CreateVMDialog({ open, onOpenChange, onSubmit }: CreateVMDialogProps) {
  const [name, setName] = useState("")
  const [image, setImage] = useState("ubuntu-24.04")
  const [vcpus, setVcpus] = useState(2)
  const [ramMB, setRamMB] = useState(2048)
  const [diskGB, setDiskGB] = useState(20)
  const [cloudInitUser, setCloudInitUser] = useState("autohost")
  const [sshKey, setSshKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Please provide a VM name.")
      return
    }
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(trimmedName)) {
      setError("Name must start with alphanumeric character and contain only letters, numbers, hyphens or underscores.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      await onSubmit({
        name: trimmedName,
        image,
        vcpus,
        ram_mb: ramMB,
        disk_gb: diskGB,
        cloud_init_user: cloudInitUser.trim() || "autohost",
        ssh_keys: sshKey.trim() ? [sshKey.trim()] : [],
      })
      onOpenChange(false)
      setName("")
      setSshKey("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create VM")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Server className="h-5 w-5 text-indigo-500" />
            Provision Virtual Machine
          </DialogTitle>
          <DialogDescription>
            Deploy an isolated KVM micro-instance on this host. It will automatically enroll as a child node in AutoHost via Cloud-Init.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="p-3 text-sm rounded-lg bg-destructive/15 text-destructive border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          {/* VM Name */}
          <div className="space-y-2">
            <Label htmlFor="vm-name" className="text-sm font-medium">
              VM Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vm-name"
              placeholder="e.g. dev-worker-01"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          {/* OS Image Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-muted-foreground" /> Base Operating System
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {OS_OPTIONS.map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setImage(opt.id)}
                  className={`cursor-pointer rounded-lg border p-3 transition-all flex items-center justify-between ${
                    image === opt.id
                      ? "border-indigo-500/80 bg-indigo-500/10 shadow-sm"
                      : "border-border hover:border-muted-foreground/30 bg-card"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{opt.name}</span>
                      {opt.recommended && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                  <div
                    className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                      image === opt.id ? "border-indigo-500 bg-indigo-500" : "border-muted-foreground/40"
                    }`}
                  >
                    {image === opt.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resource Sliders / Selectors */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5" /> vCPUs
              </Label>
              <select
                value={vcpus}
                onChange={(e) => setVcpus(Number(e.target.value))}
                disabled={loading}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={1} className="bg-popover text-popover-foreground">1 Core</option>
                <option value={2} className="bg-popover text-popover-foreground">2 Cores</option>
                <option value={4} className="bg-popover text-popover-foreground">4 Cores</option>
                <option value={8} className="bg-popover text-popover-foreground">8 Cores</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" /> RAM
              </Label>
              <select
                value={ramMB}
                onChange={(e) => setRamMB(Number(e.target.value))}
                disabled={loading}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={1024} className="bg-popover text-popover-foreground">1 GB</option>
                <option value={2048} className="bg-popover text-popover-foreground">2 GB</option>
                <option value={4096} className="bg-popover text-popover-foreground">4 GB</option>
                <option value={8192} className="bg-popover text-popover-foreground">8 GB</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <HardDrive className="h-3.5 w-3.5" /> Disk (CoW)
              </Label>
              <select
                value={diskGB}
                onChange={(e) => setDiskGB(Number(e.target.value))}
                disabled={loading}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={10} className="bg-popover text-popover-foreground">10 GB</option>
                <option value={20} className="bg-popover text-popover-foreground">20 GB</option>
                <option value={40} className="bg-popover text-popover-foreground">40 GB</option>
                <option value={80} className="bg-popover text-popover-foreground">80 GB</option>
              </select>
            </div>
          </div>

          {/* Cloud-Init User & SSH Key */}
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-1.5">
              <Label htmlFor="vm-user" className="text-xs font-medium flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-muted-foreground" /> Sudo User
              </Label>
              <Input
                id="vm-user"
                value={cloudInitUser}
                onChange={(e) => setCloudInitUser(e.target.value)}
                placeholder="autohost"
                disabled={loading}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="vm-ssh-key" className="text-xs font-medium flex items-center gap-1">
                <Key className="h-3.5 w-3.5 text-muted-foreground" /> SSH Authorized Key (Optional)
              </Label>
              <Input
                id="vm-ssh-key"
                value={sshKey}
                onChange={(e) => setSshKey(e.target.value)}
                placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5... user@host"
                disabled={loading}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Provisioning…
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4" /> Provision VM
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
