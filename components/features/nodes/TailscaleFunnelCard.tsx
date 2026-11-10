"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Server,
  Shield,
  Trash2,
  Box,
  ArrowRight,
  Radio,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/api/fetch-client";
import { useNodes } from "@/lib/features/nodes/nodes/hooks/useNodes";
import { useContainersLive } from "@/lib/features/nodes/containers/hooks/useContainersLive";
import type { DockerContainer } from "@/lib/features/nodes/types";

export interface TailscaleFunnelRoute {
  id: string;
  funnel_port: number;
  path_prefix: string;
  public_url: string;
  target_node_id: string;
  target_node_name: string;
  target_ip: string;
  container_port: number;
  upstream: string;
  container_id?: string;
  container_name?: string;
  container_image?: string;
  created_at: string;
}

interface TailscaleFunnelStatus {
  funnel_dns_name: string;
  allowed_ports: number[];
  routes: TailscaleFunnelRoute[];
}

function inferContainerPort(c: DockerContainer): number {
  const bracketMatch = c.status?.match(/\[(\d+):\d+\/(?:tcp|udp)/);
  if (bracketMatch?.[1]) {
    const parsed = parseInt(bracketMatch[1], 10);
    if (parsed > 0 && parsed <= 65535) return parsed;
  }
  const combined = `${c.name} ${c.image}`.toLowerCase();
  const knownPorts: Array<[string, number]> = [
    ["jellyfin", 8096],
    ["plex", 32400],
    ["grafana", 3000],
    ["prometheus", 9090],
    ["portainer", 9000],
    ["nextcloud", 8080],
    ["homeassistant", 8123],
    ["vaultwarden", 80],
    ["immich", 2283],
    ["sonarr", 8989],
    ["radarr", 7878],
    ["qbittorrent", 8080],
    ["uptime-kuma", 3001],
    ["gitea", 3000],
    ["n8n", 5678],
    ["ollama", 11434],
    ["open-webui", 8080],
    ["pihole", 80],
    ["adguard", 3000],
    ["syncthing", 8384],
    ["navidrome", 4533],
    ["nginx", 80],
    ["autohost-cloud-lite", 3000],
    ["autohost-cloud-api", 8080],
  ];
  for (const [key, port] of knownPorts) {
    if (combined.includes(key)) return port;
  }
  return 8080;
}

export function TailscaleFunnelCard({ defaultNodeId }: { defaultNodeId: string }) {
  const { allNodes } = useNodes();

  const [status, setStatus] = useState<TailscaleFunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dnsInput, setDnsInput] = useState("");
  const [savingDns, setSavingDns] = useState(false);

  // Route builder state
  const [selectedNodeId, setSelectedNodeId] = useState<string>(defaultNodeId);
  const [selectedContainerId, setSelectedContainerId] = useState<string>("");
  const [funnelPort, setFunnelPort] = useState<number>(8443);
  const [pathPrefix, setPathPrefix] = useState<string>("/");
  const [containerPort, setContainerPort] = useState<string>("8080");
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeSaved, setRouteSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { containers, connected: containersConnected } = useContainersLive(selectedNodeId);

  const runningContainers = useMemo(
    () => containers.filter((c) => c.state === "running"),
    [containers]
  );

  const selectedNode = useMemo(
    () => allNodes.find((n) => n.id === selectedNodeId) ?? null,
    [allNodes, selectedNodeId]
  );

  const selectedNodeIP = useMemo(() => {
    if (!selectedNode) return "127.0.0.1";
    const raw =
      selectedNode.ipVpn ||
      (selectedNode.isLocal ? "127.0.0.1" : selectedNode.ipLocal) ||
      "127.0.0.1";
    return raw.split("/")[0];
  }, [selectedNode]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/tailscale-funnel", { method: "GET" });
      if (!res.ok) return;
      const data: TailscaleFunnelStatus = await res.json();
      setStatus(data);
      setDnsInput((prev) => (prev === "" && data.funnel_dns_name ? data.funnel_dns_name : prev));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSelectContainer = (id: string) => {
    setSelectedContainerId(id);
    if (!id) return;
    const found = containers.find((c) => c.id === id || c.name === id);
    if (!found) return;
    setContainerPort(String(inferContainerPort(found)));
  };

  const handleSaveDns = async () => {
    setSavingDns(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/tailscale-funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "config",
          funnel_dns_name: dnsInput.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar el dominio MagicDNS");
      }
      setDnsInput(data.funnel_dns_name || "");
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar MagicDNS");
    } finally {
      setSavingDns(false);
    }
  };

  const handleUpsertRoute = async () => {
    const portNum = parseInt(containerPort, 10);
    if (!selectedNodeId || isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      setError("Selecciona un nodo y un puerto válido (1-65535).");
      return;
    }

    const chosen = containers.find(
      (c) => c.id === selectedContainerId || c.name === selectedContainerId
    );

    setSavingRoute(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/tailscale-funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert-route",
          funnel_port: funnelPort,
          path_prefix: pathPrefix.trim() || "/",
          target_node_id: selectedNodeId,
          container_port: portNum,
          container_id: chosen?.id ?? "",
          container_name: chosen?.name ?? "",
          container_image: chosen?.image ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "No se pudo publicar en Tailscale Funnel");
      }
      setRouteSaved(true);
      setTimeout(() => setRouteSaved(false), 2500);
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear ruta Funnel");
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (routeId: string) => {
    setDeletingId(routeId);
    setError(null);
    try {
      await fetchWithAuth("/api/tailscale-funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-route", route_id: routeId }),
      });
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar ruta");
    } finally {
      setDeletingId(null);
    }
  };

  const effectiveDns = (dnsInput || status?.funnel_dns_name || "m-storage.tail273b6e.ts.net").trim();
  const previewPort = funnelPort === 443 ? "" : `:${funnelPort}`;
  const cleanPrefix =
    pathPrefix.trim() === "" || pathPrefix.trim() === "/"
      ? ""
      : `/${pathPrefix.trim().replace(/^\/+/, "")}`;
  const previewUrl = `https://${effectiveDns}${previewPort}${cleanPrefix}`;

  return (
    <Card className="border-emerald-500/30 bg-gradient-to-b from-emerald-500/[0.04] to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Radio className="h-4 w-4" />
              </div>
              Tailscale Funnel — Exponer Contenedores Docker (*.ts.net)
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
                <Shield className="h-3 w-3" />
                Mesh + Funnel HTTPS
              </Badge>
            </CardTitle>
            <CardDescription>
              Expón contenedores Docker de cualquier nodo directamente hacia Internet usando tu dominio MagicDNS de Tailscale Funnel (puertos HTTPS <code>443</code>, <code>8443</code> o <code>10000</code>).
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchStatus}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualizar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* MagicDNS Hostname Bar */}
            <div className="rounded-xl border bg-card/60 p-4 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dominio MagicDNS de tu Nodo Tailscale Funnel
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="m-storage.tail273b6e.ts.net"
                  value={dnsInput}
                  onChange={(e) => setDnsInput(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  onClick={handleSaveDns}
                  disabled={savingDns}
                  className="shrink-0 gap-1.5"
                >
                  {savingDns ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Guardar DNS
                </Button>
              </div>
            </div>

            {/* Funnel Container Route Builder */}
            <div className="rounded-xl border bg-card/40 p-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Network className="h-4 w-4 text-emerald-400" />
                  Exponer Contenedor con Tailscale Funnel
                </h4>
                <p className="text-xs text-muted-foreground">
                  Selecciona el nodo, elige el contenedor activo y asigna el puerto HTTPS o sub-ruta de Funnel.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-5">
                {/* 1. Node */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    1. Nodo Destino
                  </Label>
                  <select
                    value={selectedNodeId}
                    onChange={(e) => {
                      setSelectedNodeId(e.target.value);
                      setSelectedContainerId("");
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                  >
                    {allNodes.map((n) => {
                      const tsIP = (n.ipVpn || n.ipLocal || "127.0.0.1").split("/")[0];
                      return (
                        <option key={n.id} value={n.id}>
                          {n.name} {n.isLocal ? "(Master)" : ""} — {tsIP}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Container */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Box className="h-3.5 w-3.5 text-muted-foreground" />
                    2. Contenedor Docker
                  </Label>
                  <select
                    value={selectedContainerId}
                    onChange={(e) => handleSelectContainer(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                  >
                    <option value="">
                      {runningContainers.length > 0
                        ? `Seleccionar (${runningContainers.length} activos)…`
                        : containersConnected
                        ? "Puerto manual"
                        : "Cargando…"}
                    </option>
                    {runningContainers.map((c) => (
                      <option key={c.id} value={c.id}>
                        🟢 {c.name} ({c.image}) → :{inferContainerPort(c)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Funnel HTTPS Port */}
                <div className="space-y-1.5">
                  <Label className="text-xs">3. Puerto HTTPS Funnel</Label>
                  <select
                    value={funnelPort}
                    onChange={(e) => setFunnelPort(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-xs"
                  >
                    <option value={443}>:443 (HTTPS Estándar)</option>
                    <option value={8443}>:8443 (HTTPS Alt 1)</option>
                    <option value={10000}>:10000 (HTTPS Alt 2)</option>
                  </select>
                </div>

                {/* 4. Path Prefix */}
                <div className="space-y-1.5">
                  <Label className="text-xs">4. Ruta (Path)</Label>
                  <Input
                    placeholder="/ o /app"
                    value={pathPrefix}
                    onChange={(e) => setPathPrefix(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>

                {/* 5. Container Port & Submit */}
                <div className="space-y-1.5">
                  <Label className="text-xs">5. Puerto Interno</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      value={containerPort}
                      onChange={(e) => setContainerPort(e.target.value)}
                      className="font-mono text-sm w-20 shrink-0"
                    />
                    <Button
                      onClick={handleUpsertRoute}
                      disabled={savingRoute}
                      className="flex-1 gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold"
                    >
                      {savingRoute ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : routeSaved ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {savingRoute ? "Creando…" : routeSaved ? "¡Listo!" : "Exponer"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-2 flex-wrap rounded-lg bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground">
                <span className="text-emerald-400 font-semibold">{previewUrl}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>Tailscale Funnel</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[#70AEFF]">
                  {selectedNode?.name ?? "Nodo"} (http://{selectedNodeIP}:{containerPort || "8080"})
                </span>
              </div>

              {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            </div>

            {/* Active Funnel Routes */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contenedores Expuestos en Tailscale Funnel ({status?.routes?.length ?? 0})
              </h4>

              {status?.routes && status.routes.length > 0 ? (
                <div className="rounded-xl border divide-y bg-card/30">
                  {status.routes.map((rt) => (
                    <div
                      key={rt.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap sm:flex-nowrap"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={rt.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold font-mono text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            {rt.public_url}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <Badge variant="outline" className="text-[11px] gap-1">
                            <Server className="h-3 w-3 text-[#70AEFF]" />
                            {rt.target_node_name}
                          </Badge>
                          {rt.container_name && (
                            <Badge variant="secondary" className="text-[11px] gap-1 font-mono">
                              <Box className="h-3 w-3 text-emerald-400" />
                              {rt.container_name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
                          Upstream Tailscale: <code>http://{rt.upstream}</code>
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(rt.public_url);
                            setCopiedUrl(rt.id);
                            setTimeout(() => setCopiedUrl(null), 2000);
                          }}
                          className="h-8 w-8 text-muted-foreground"
                          title="Copiar enlace Funnel"
                        >
                          {copiedUrl === rt.id ? (
                            <Check className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === rt.id}
                          onClick={() => handleDeleteRoute(rt.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          {deletingId === rt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 gap-1 rounded-xl border border-dashed text-muted-foreground text-xs">
                  <p>No hay contenedores expuestos por Tailscale Funnel todavía.</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
