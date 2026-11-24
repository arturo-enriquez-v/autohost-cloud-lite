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
import { RefreshCw, ChevronDown, ChevronUp, Shield, Wrench } from "lucide-react";

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

const positive = (v: unknown, fallback: number) => (typeof v === "number" && v > 0 ? v : fallback);

/**
 * Fills in missing auto-heal settings. The recreate overrides stay empty unless set: the agent then reads the
 * compose project and service from the container's labels. Older versions of this form filled the service
 * name with the monitor's name; without a compose file that is the same as leaving it empty.
 */
export function normalizeAutoHealConfig(
  raw?: Partial<AutoHealConfig> | null,
  monitorName = ""
): AutoHealConfig {
  const composeFile = typeof raw?.recreate?.compose_file_path === "string" ? raw.recreate.compose_file_path : "";
  let serviceName = typeof raw?.recreate?.service_name === "string" ? raw.recreate.service_name.trim() : "";
  if (!composeFile && serviceName === monitorName) serviceName = "";

  return {
    enabled: Boolean(raw?.enabled),
    container: typeof raw?.container === "string" ? raw.container.trim() : "",
    consecutive_failures_threshold: positive(
      raw?.consecutive_failures_threshold,
      DEFAULT_AUTO_HEAL.consecutive_failures_threshold
    ),
    grace_period_seconds: positive(raw?.grace_period_seconds, DEFAULT_AUTO_HEAL.grace_period_seconds),
    restart: {
      enabled: typeof raw?.restart?.enabled === "boolean" ? raw.restart.enabled : DEFAULT_AUTO_HEAL.restart.enabled,
      max_attempts: positive(raw?.restart?.max_attempts, DEFAULT_AUTO_HEAL.restart.max_attempts),
      window_seconds: positive(raw?.restart?.window_seconds, DEFAULT_AUTO_HEAL.restart.window_seconds),
    },
    recreate: {
      enabled:
        typeof raw?.recreate?.enabled === "boolean" ? raw.recreate.enabled : DEFAULT_AUTO_HEAL.recreate.enabled,
      compose_file_path: composeFile,
      service_name: serviceName,
      max_attempts: positive(raw?.recreate?.max_attempts, DEFAULT_AUTO_HEAL.recreate.max_attempts),
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

const CHECK_TYPE_HELP: Record<CheckType, string> = {
  process: "Passes while the Docker container is running.",
  http: "The node requests the URL; passes when it answers with the expected status code.",
  tcp: "The node opens a connection to the host and port; passes when it is accepted.",
};

// Docker container names; the API rejects anything else as an auto-heal target.
const CONTAINER_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;

const NAME_LABEL: Record<CheckType, string> = {
  process: "Container",
  http: "Name",
  tcp: "Name",
};

export function ServiceMonitorDialog({ nodeId, open, monitor, onClose, onSave }: Props) {
  const [form, setForm] = useState<UpsertServiceMonitorPayload>({ ...DEFAULT_FORM, nodeId });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAutoHealSection, setShowAutoHealSection] = useState(false);
  const [showRecreateOverrides, setShowRecreateOverrides] = useState(false);

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
      // HTTP/TCP monitors saved before the auto-heal container existed acted on the container named like
      // the monitor: show it as the chosen container.
      if (
        monitor.checkType !== "process" &&
        autoHeal.enabled &&
        !autoHeal.container &&
        CONTAINER_NAME_RE.test(monitor.serviceName)
      ) {
        autoHeal.container = monitor.serviceName;
      }
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
      setShowAutoHealSection(autoHeal.enabled);
      setShowRecreateOverrides(Boolean(autoHeal.recreate.compose_file_path || autoHeal.recreate.service_name));
    } else {
      setForm({
        ...DEFAULT_FORM,
        nodeId,
        autoHealConfig: normalizeAutoHealConfig(null),
      });
      setShowAutoHealSection(false);
      setShowRecreateOverrides(false);
    }
    setError(null);
  }, [monitor, open, nodeId]);

  const set = <K extends keyof UpsertServiceMonitorPayload>(
    key: K,
    value: UpsertServiceMonitorPayload[K]
  ) => setForm((f) => ({ ...f, [key]: value }));

  const setAutoHeal = (updater: (prev: AutoHealConfig) => AutoHealConfig) => {
    setForm((f) => ({
      ...f,
      autoHealConfig: updater(normalizeAutoHealConfig(f.autoHealConfig)),
    }));
  };

  const handleSubmit = async () => {
    setError(null);
    if (!form.serviceName.trim()) {
      setError(form.checkType === "process" ? "Container is required." : "Name is required.");
      return;
    }
    const autoHealConfig = normalizeAutoHealConfig(form.autoHealConfig);
    const healsSomething =
      autoHealConfig.enabled && (autoHealConfig.restart.enabled || autoHealConfig.recreate.enabled);
    if (form.checkType !== "process" && healsSomething && !autoHealConfig.container) {
      setError("Choose the container auto-heal should restart, or turn auto-heal off.");
      setShowAutoHealSection(true);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        serviceName: form.serviceName.trim(),
        autoHealConfig: {
          ...autoHealConfig,
          // Container checks heal the container they check.
          container: form.checkType === "process" ? "" : autoHealConfig.container,
          // Auto-heal acts when the monitor is down: one threshold for both.
          consecutive_failures_threshold: form.failureThreshold,
        },
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const autoHeal = normalizeAutoHealConfig(form.autoHealConfig);
  const healTarget = form.checkType === "process" ? form.serviceName.trim() : autoHeal.container ?? "";
  // The saved container may not be in the live list (stopped, removed, or the node is offline).
  const containerOptions = Array.from(
    new Set([...containers.map((c) => c.name), ...(autoHeal.container ? [autoHeal.container] : [])])
  ).sort();
  const windowMinutes = Math.max(1, Math.round(autoHeal.restart.window_seconds / 60));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden pb-0">
        <DialogHeader>
          <DialogTitle>{monitor ? "Edit health check" : "Add health check"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Check type */}
          <div className="space-y-1">
            <Label>What to check</Label>
            <Select
              value={form.checkType}
              onValueChange={(v) => set("checkType", v as CheckType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="process">Container running</SelectItem>
                <SelectItem value="http">HTTP endpoint</SelectItem>
                <SelectItem value="tcp">TCP port</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{CHECK_TYPE_HELP[form.checkType]}</p>
          </div>

          {/* Container / name with autocomplete */}
          <div className="space-y-1">
            <Label htmlFor="sm-service-name">{NAME_LABEL[form.checkType]}</Label>
            <div className="relative">
              <Input
                ref={serviceInputRef}
                id="sm-service-name"
                placeholder={form.checkType === "process" ? "e.g. postgres" : "e.g. web-api"}
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
                          e.preventDefault();
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
            {form.checkType !== "process" && (
              <p className="text-xs text-muted-foreground">Shown in the panel.</p>
            )}
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
                <p className="text-xs text-muted-foreground">
                  Requested from the node, so <code>localhost</code> and VPN addresses work.
                </p>
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
              <Label htmlFor="sm-threshold">Failures before down</Label>
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
                <span className="font-semibold text-sm text-foreground">Auto-heal</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={autoHeal.enabled}
                  onCheckedChange={(v) => {
                    setAutoHeal((ah) => ({ ...ah, enabled: v }));
                    if (v) setShowAutoHealSection(true);
                  }}
                  aria-label="Enable auto-heal"
                />
                <button
                  type="button"
                  onClick={() => setShowAutoHealSection((prev) => !prev)}
                  className="text-xs text-muted-foreground hover:text-foreground p-1"
                  aria-label={showAutoHealSection ? "Hide auto-heal settings" : "Show auto-heal settings"}
                >
                  {showAutoHealSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              When the service is down ({form.failureThreshold} failed{" "}
              {form.failureThreshold === 1 ? "check" : "checks"}), the agent tries these steps in order
              {form.checkType === "process" ? " on this container." : " on a container of this node."}
            </p>

            {showAutoHealSection && (
              <div className="space-y-4 pt-2 border-t border-border">
                {form.checkType !== "process" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Container that serves it</Label>
                    {containerOptions.length > 0 ? (
                      <Select
                        value={autoHeal.container || undefined}
                        onValueChange={(v) => setAutoHeal((ah) => ({ ...ah, container: v }))}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose a container" />
                        </SelectTrigger>
                        <SelectContent>
                          {containerOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Container name"
                        value={autoHeal.container ?? ""}
                        onChange={(e) => setAutoHeal((ah) => ({ ...ah, container: e.target.value }))}
                      />
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Auto-heal only works when the service runs in a Docker container on this node. For an
                      external URL or a service outside Docker, leave auto-heal off.
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs">Wait after each step (seconds)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={600}
                    value={autoHeal.grace_period_seconds}
                    onChange={(e) =>
                      setAutoHeal((ah) => ({ ...ah, grace_period_seconds: Number(e.target.value) }))
                    }
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Time the service gets to start before the next check counts again.
                  </p>
                </div>

                {/* Step 1: Container Restart */}
                <div className="p-3 bg-background/60 rounded-lg border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-[#70AEFF]" />
                      1. Restart the container
                    </span>
                    <Switch
                      checked={autoHeal.restart.enabled}
                      onCheckedChange={(v) =>
                        setAutoHeal((ah) => ({ ...ah, restart: { ...ah.restart, enabled: v } }))
                      }
                      aria-label="Restart the container"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Runs <code>docker restart {healTarget || "<container>"}</code>.
                  </p>

                  {autoHeal.restart.enabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">At most (restarts)</Label>
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
                        <Label className="text-[11px] text-muted-foreground">Within (minutes)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={1440}
                          value={windowMinutes}
                          onChange={(e) =>
                            setAutoHeal((ah) => ({
                              ...ah,
                              restart: { ...ah.restart, window_seconds: Number(e.target.value) * 60 },
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Step 2: Docker Compose Recreate */}
                <div className="p-3 bg-background/60 rounded-lg border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Wrench className="h-3.5 w-3.5 text-[#70AEFF]" />
                      2. Recreate with Docker Compose
                    </span>
                    <Switch
                      checked={autoHeal.recreate.enabled}
                      onCheckedChange={(v) =>
                        setAutoHeal((ah) => ({ ...ah, recreate: { ...ah.recreate, enabled: v } }))
                      }
                      aria-label="Recreate with Docker Compose"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    If restarting is not enough, runs <code>docker compose up -d --force-recreate</code> for the
                    container&apos;s service. The project is found from the container&apos;s Compose labels.
                    Requires terminal access on the node.
                  </p>

                  {autoHeal.recreate.enabled && (
                    <div className="space-y-2 pt-1">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-muted-foreground">At most (per incident)</Label>
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
                      <button
                        type="button"
                        onClick={() => setShowRecreateOverrides((v) => !v)}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                        aria-expanded={showRecreateOverrides}
                      >
                        {showRecreateOverrides ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        Use a different compose file or service
                      </button>
                      {showRecreateOverrides && (
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Compose file</Label>
                            <Input
                              placeholder="Detected from the container"
                              value={autoHeal.recreate.compose_file_path}
                              onChange={(e) =>
                                setAutoHeal((ah) => ({
                                  ...ah,
                                  recreate: { ...ah.recreate, compose_file_path: e.target.value },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">Compose service</Label>
                            <Input
                              placeholder="Detected from the container"
                              value={autoHeal.recreate.service_name}
                              onChange={(e) =>
                                setAutoHeal((ah) => ({
                                  ...ah,
                                  recreate: { ...ah.recreate, service_name: e.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                  If every step fails, the monitor shows &quot;Auto-heal gave up&quot;. Each step and the outcome
                  are emailed to the node owner.
                </p>
              </div>
            )}
          </div>

          {/* Notify Telegram */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <p className="text-sm font-medium">Telegram alert</p>
              <p className="text-xs text-muted-foreground">
                One message when the service goes down, through the node&apos;s alert bot.
              </p>
            </div>
            <Switch
              checked={form.notifyTelegram}
              onCheckedChange={(v) => set("notifyTelegram", v)}
              aria-label="Telegram alert"
            />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <p className="text-sm font-medium">Enable monitoring</p>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => set("enabled", v)}
              aria-label="Enable monitoring"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Stays visible while the form scrolls. */}
        <DialogFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving…" : monitor ? "Save changes" : "Add health check"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
