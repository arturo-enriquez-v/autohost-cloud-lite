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
import type { CheckType, ServiceMonitor, UpsertServiceMonitorPayload, AutoHealConfig } from "@/lib/types";
import { useContainersLive } from "@/lib/features/nodes/containers/hooks/useContainersLive";
import { ShieldCheck, RefreshCw, Layers, ChevronDown, ChevronUp, Shield, Wrench } from "lucide-react";

interface Props {
  nodeId: string;
  open: boolean;
  monitor?: ServiceMonitor | null; // null = create mode
  onClose: () => void;
  onSave: (payload: UpsertServiceMonitorPayload) => Promise<void>;
}

const DEFAULT_AUTO_HEAL: AutoHealConfig = {
  enabled: false,
  consecutive_failures_threshold: 3,
  grace_period_seconds: 30,
  restart: {
    enabled: true,
    max_attempts: 3,
    window_seconds: 900,
  },
  recreate: {
    enabled: false,
    compose_file_path: "",
    service_name: "",
    max_attempts: 1,
  },
};

export function normalizeAutoHealConfig(
  raw?: Partial<AutoHealConfig> | null,
  fallbackServiceName = ""
): AutoHealConfig {
  return {
    enabled: Boolean(raw?.enabled),
    consecutive_failures_threshold:
      typeof raw?.consecutive_failures_threshold === "number" && raw.consecutive_failures_threshold > 0
        ? raw.consecutive_failures_threshold
        : DEFAULT_AUTO_HEAL.consecutive_failures_threshold,
    grace_period_seconds:
      typeof raw?.grace_period_seconds === "number" && raw.grace_period_seconds > 0
        ? raw.grace_period_seconds
        : DEFAULT_AUTO_HEAL.grace_period_seconds,
    restart: {
      enabled:
        typeof raw?.restart?.enabled === "boolean"
          ? raw.restart.enabled
          : DEFAULT_AUTO_HEAL.restart.enabled,
      max_attempts:
        typeof raw?.restart?.max_attempts === "number" && raw.restart.max_attempts > 0
          ? raw.restart.max_attempts
          : DEFAULT_AUTO_HEAL.restart.max_attempts,
      window_seconds:
        typeof raw?.restart?.window_seconds === "number" && raw.restart.window_seconds > 0
          ? raw.restart.window_seconds
          : DEFAULT_AUTO_HEAL.restart.window_seconds,
    },
    recreate: {
      enabled:
        typeof raw?.recreate?.enabled === "boolean"
          ? raw.recreate.enabled
          : DEFAULT_AUTO_HEAL.recreate.enabled,
      compose_file_path:
        typeof raw?.recreate?.compose_file_path === "string"
          ? raw.recreate.compose_file_path
          : DEFAULT_AUTO_HEAL.recreate.compose_file_path,
      service_name:
        typeof raw?.recreate?.service_name === "string" && raw.recreate.service_name.trim() !== ""
          ? raw.recreate.service_name
          : fallbackServiceName || DEFAULT_AUTO_HEAL.recreate.service_name,
      max_attempts:
        typeof raw?.recreate?.max_attempts === "number" && raw.recreate.max_attempts > 0
          ? raw.recreate.max_attempts
          : DEFAULT_AUTO_HEAL.recreate.max_attempts,
    },
  };
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
  autoHealConfig: DEFAULT_AUTO_HEAL,
};

export function ServiceMonitorDialog({ nodeId, open, monitor, onClose, onSave }: Props) {
  const [form, setForm] = useState<UpsertServiceMonitorPayload>({ ...DEFAULT_FORM, nodeId });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAutoHealSection, setShowAutoHealSection] = useState(false);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const serviceInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const { containers } = useContainersLive(open ? nodeId : "");

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
      const autoHeal = normalizeAutoHealConfig(monitor.autoHealConfig, monitor.serviceName);
      setForm({
        nodeId,
        serviceName: monitor.serviceName ?? "",
        checkType: monitor.checkType ?? "process",
        httpUrl: monitor.httpUrl ?? "",
        httpExpectedStatus: monitor.httpExpectedStatus ?? 200,
        tcpHost: monitor.tcpHost ?? "",
        tcpPort: monitor.tcpPort ?? 0,
        intervalSeconds: monitor.intervalSeconds ?? 30,
        failureThreshold: monitor.failureThreshold ?? 3,
        notifyTelegram: monitor.notifyTelegram ?? false,
        enabled: monitor.enabled ?? true,
        autoHealConfig: autoHeal,
      });
      setShowAutoHealSection(Boolean(autoHeal.enabled));
    } else {
      setForm({
        ...DEFAULT_FORM,
        nodeId,
        autoHealConfig: normalizeAutoHealConfig(null),
      });
      setShowAutoHealSection(false);
    }
    setError(null);
  }, [monitor, open, nodeId]);

  const set = <K extends keyof UpsertServiceMonitorPayload>(
    key: K,
    value: UpsertServiceMonitorPayload[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const setAutoHeal = (updater: (prev: AutoHealConfig) => AutoHealConfig) => {
    setForm((f) => {
      const current = normalizeAutoHealConfig(f.autoHealConfig, f.serviceName);
      return {
        ...f,
        autoHealConfig: updater(current),
      };
    });
  };

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

  const autoHeal = normalizeAutoHealConfig(form.autoHealConfig, form.serviceName);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{monitor ? "Edit Monitor & Auto-Healing" : "Add Health Check & Auto-Healing"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Service name with autocomplete */}
          <div className="space-y-1">
            <Label htmlFor="sm-service-name">Service / Container name</Label>
            <div className="relative">
              <Input
                ref={serviceInputRef}
                id="sm-service-name"
                placeholder="e.g. web-api, postgres"
                autoComplete="off"
                value={form.serviceName}
                onChange={(e) => {
                  const val = e.target.value;
                  set("serviceName", val);
                  setShowSuggestions(true);
                  if (!autoHeal.recreate.service_name) {
                    setAutoHeal((ah) => ({
                      ...ah,
                      recreate: { ...ah.recreate, service_name: val },
                    }));
                  }
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
                          e.preventDefault();
                          set("serviceName", c.name);
                          setAutoHeal((ah) => ({
                            ...ah,
                            recreate: { ...ah.recreate, service_name: c.name },
                          }));
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

          {/* AUTO-HEALING SECTION */}
          <div className="border rounded-xl p-3.5 space-y-3 bg-secondary/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#70AEFF]" />
                <span className="font-semibold text-sm text-foreground">Auto-Healing & Remediation</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoHeal.enabled}
                  onCheckedChange={(v) => {
                    setAutoHeal((ah) => ({ ...ah, enabled: v }));
                    if (v) setShowAutoHealSection(true);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowAutoHealSection((prev) => !prev)}
                  className="text-xs text-muted-foreground hover:text-foreground p-1"
                >
                  {showAutoHealSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {showAutoHealSection && (
              <div className="space-y-4 pt-2 border-t border-border">
                {/* General Thresholds */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Consecutive failures before action</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={autoHeal.consecutive_failures_threshold}
                      onChange={(e) =>
                        setAutoHeal((ah) => ({
                          ...ah,
                          consecutive_failures_threshold: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Grace period (seconds)</Label>
                    <Input
                      type="number"
                      min={5}
                      max={600}
                      value={autoHeal.grace_period_seconds}
                      onChange={(e) =>
                        setAutoHeal((ah) => ({
                          ...ah,
                          grace_period_seconds: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Strategy 1: Container Restart */}
                <div className="p-3 bg-background/60 rounded-lg border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-[#70AEFF]" />
                      Strategy 1: Restart Container (`docker restart`)
                    </span>
                    <Switch
                      checked={autoHeal.restart.enabled}
                      onCheckedChange={(v) =>
                        setAutoHeal((ah) => ({
                          ...ah,
                          restart: { ...ah.restart, enabled: v },
                        }))
                      }
                    />
                  </div>

                  {autoHeal.restart.enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Max Attempts</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={autoHeal.restart.max_attempts}
                          onChange={(e) =>
                            setAutoHeal((ah) => ({
                              ...ah,
                              restart: { ...ah.restart, max_attempts: Number(e.target.value) },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Time Window (sec)</Label>
                        <Input
                          type="number"
                          min={60}
                          max={86400}
                          value={autoHeal.restart.window_seconds}
                          onChange={(e) =>
                            setAutoHeal((ah) => ({
                              ...ah,
                              restart: { ...ah.restart, window_seconds: Number(e.target.value) },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Strategy 2: Docker Compose Recreate */}
                <div className="p-3 bg-background/60 rounded-lg border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-[#70AEFF]" />
                      Strategy 2: Compose Recreate (`docker compose up`)
                    </span>
                    <Switch
                      checked={autoHeal.recreate.enabled}
                      onCheckedChange={(v) =>
                        setAutoHeal((ah) => ({
                          ...ah,
                          recreate: { ...ah.recreate, enabled: v },
                        }))
                      }
                    />
                  </div>

                  {autoHeal.recreate.enabled && (
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">Path to docker-compose.yml</Label>
                        <Input
                          placeholder="/opt/apps/my-app/docker-compose.yml"
                          value={autoHeal.recreate.compose_file_path}
                          onChange={(e) =>
                            setAutoHeal((ah) => ({
                              ...ah,
                              recreate: { ...ah.recreate, compose_file_path: e.target.value },
                            }))
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">YAML Service Name</Label>
                          <Input
                            placeholder="e.g. web"
                            value={autoHeal.recreate.service_name}
                            onChange={(e) =>
                              setAutoHeal((ah) => ({
                                ...ah,
                                recreate: { ...ah.recreate, service_name: e.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Max Attempts per Incident</Label>
                          <Input
                            type="number"
                            min={1}
                            max={5}
                            value={autoHeal.recreate.max_attempts}
                            onChange={(e) =>
                              setAutoHeal((ah) => ({
                                ...ah,
                                recreate: { ...ah.recreate, max_attempts: Number(e.target.value) },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notify Telegram */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Telegram alert</p>
              <p className="text-xs text-muted-foreground">
                Send a message when the service goes down or enters critical state
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
