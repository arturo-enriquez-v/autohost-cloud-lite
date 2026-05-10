"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CheckType, ServiceMonitor, UpsertServiceMonitorPayload } from "@/lib/types";
import { useContainers } from "@/lib/features/nodes/containers/hooks/useContainers";

interface Props {
  nodeId: string;
  open: boolean;
  monitor?: ServiceMonitor | null; // null = create mode
  onClose: () => void;
  onSave: (payload: UpsertServiceMonitorPayload) => Promise<void>;
}

const DEFAULT_FORM: UpsertServiceMonitorPayload = {
  nodeId: "",
  serviceName: "",
  checkType: "process",
  httpUrl: "",
  httpExpectedStatus: 200,
  tcpHost: "",
  tcpPort: 0,
  intervalSeconds: 30,
  failureThreshold: 3,
  notifyTelegram: false,
  enabled: true,
};

export function ServiceMonitorDialog({ nodeId, open, monitor, onClose, onSave }: Props) {
  const [form, setForm] = useState<UpsertServiceMonitorPayload>({ ...DEFAULT_FORM, nodeId });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const serviceInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { containers, refresh: refreshContainers } = useContainers(nodeId);

  // Fetch containers when the dialog opens so suggestions are ready
  useEffect(() => {
    if (open) refreshContainers();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (
        serviceInputRef.current?.contains(e.target as Node) ||
        suggestionsRef.current?.contains(e.target as Node)
      ) return;
      setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

  // Populate form when editing an existing monitor.
  useEffect(() => {
    if (monitor) {
      setForm({
        nodeId,
        serviceName: monitor.serviceName,
        checkType: monitor.checkType,
        httpUrl: monitor.httpUrl,
        httpExpectedStatus: monitor.httpExpectedStatus,
        tcpHost: monitor.tcpHost,
        tcpPort: monitor.tcpPort,
        intervalSeconds: monitor.intervalSeconds,
        failureThreshold: monitor.failureThreshold,
        notifyTelegram: monitor.notifyTelegram,
        enabled: monitor.enabled,
      });
    } else {
      setForm({ ...DEFAULT_FORM, nodeId });
    }
    setError(null);
  }, [monitor, open, nodeId]);

  const set = <K extends keyof UpsertServiceMonitorPayload>(
    key: K,
    value: UpsertServiceMonitorPayload[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    setError(null);
    if (!form.serviceName.trim()) {
      setError("Service name is required.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{monitor ? "Edit Monitor" : "Add Health Check"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Service name with autocomplete */}
          <div className="space-y-1">
            <Label htmlFor="sm-service-name">Service / Container name</Label>
            <div className="relative">
              <Input
                ref={serviceInputRef}
                id="sm-service-name"
                placeholder="e.g. api-ventas, postgres"
                autoComplete="off"
                value={form.serviceName}
                onChange={(e) => {
                  set("serviceName", e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
              />
              {showSuggestions && (() => {
                const q = form.serviceName.toLowerCase();
                const matches = containers.filter((c) =>
                  c.name.toLowerCase().includes(q)
                );
                if (matches.length === 0) return null;
                return (
                  <div
                    ref={suggestionsRef}
                    className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md overflow-hidden"
                  >
                    {matches.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
                        onMouseDown={(e) => {
                          e.preventDefault(); // prevent input blur before click
                          set("serviceName", c.name);
                          setShowSuggestions(false);
                        }}
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            c.state === "running" ? "bg-green-500" : "bg-gray-400"
                          }`}
                        />
                        <span className="font-medium">{c.name}</span>
                        <span className="ml-auto text-xs text-muted-foreground truncate max-w-[140px]">
                          {c.image}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Check type */}
          <div className="space-y-1">
            <Label>Check type</Label>
            <Select
              value={form.checkType}
              onValueChange={(v) => set("checkType", v as CheckType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="process">Process — Is the container running?</SelectItem>
                <SelectItem value="tcp">TCP — Does the port respond?</SelectItem>
                <SelectItem value="http">HTTP — Does the endpoint return 200?</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* HTTP options */}
          {form.checkType === "http" && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="sm-http-url">URL</Label>
                <Input
                  id="sm-http-url"
                  placeholder="http://localhost:8080/health"
                  value={form.httpUrl}
                  onChange={(e) => set("httpUrl", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sm-http-status">Expected status code</Label>
                <Input
                  id="sm-http-status"
                  type="number"
                  min={100}
                  max={599}
                  value={form.httpExpectedStatus}
                  onChange={(e) => set("httpExpectedStatus", Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* TCP options */}
          {form.checkType === "tcp" && (
            <div className="space-y-3 rounded-md border p-3">
              <div className="space-y-1">
                <Label htmlFor="sm-tcp-host">Host</Label>
                <Input
                  id="sm-tcp-host"
                  placeholder="localhost"
                  value={form.tcpHost}
                  onChange={(e) => set("tcpHost", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sm-tcp-port">Port</Label>
                <Input
                  id="sm-tcp-port"
                  type="number"
                  min={1}
                  max={65535}
                  value={form.tcpPort || ""}
                  onChange={(e) => set("tcpPort", Number(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* Interval & threshold */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sm-interval">Interval (seconds)</Label>
              <Input
                id="sm-interval"
                type="number"
                min={5}
                max={3600}
                value={form.intervalSeconds}
                onChange={(e) => set("intervalSeconds", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sm-threshold">Failure threshold</Label>
              <Input
                id="sm-threshold"
                type="number"
                min={1}
                max={20}
                value={form.failureThreshold}
                onChange={(e) => set("failureThreshold", Number(e.target.value))}
              />
            </div>
          </div>

          {/* Notify Telegram */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Telegram alert</p>
              <p className="text-xs text-muted-foreground">
                Send a message when the service goes down
              </p>
            </div>
            <Switch
              checked={form.notifyTelegram}
              onCheckedChange={(v) => set("notifyTelegram", v)}
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <p className="text-sm font-medium">Enable monitoring</p>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
