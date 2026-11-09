"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Cloud,
  Check,
  ExternalLink,
  Globe,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
  Box,
  ArrowRight,
  Copy,
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

export interface CloudflareTunnelRoute {
  domain: string;
  subdomain: string;
  base_domain: string;
  target_node_id: string;
  target_node_name: string;
  target_ip: string;
  port: number;
  upstream: string;
  container_id?: string;
  container_name?: string;
  container_image?: string;
  dns_configured: boolean;
  dns_message?: string;
  created_at: string;
  updated_at: string;
}

export interface CloudflareTunnelStatus {
  installed: boolean;
  authenticated: boolean;
  running: boolean;
  login_in_process: boolean;
  login_url?: string;
  login_error?: string;
  mode: string;
  tunnel_id: string;
  tunnel_name: string;
  base_domain: string;
  quick_tunnel_url?: string;
  master_node_id?: string;
  master_hostname?: string;
  routes: CloudflareTunnelRoute[];
  recent_logs?: string[];
}

// Extract published host port from container status string (e.g. "Up 2 hours [8096:8096/tcp]")
// or infer from common self-hosted container images.
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
    ["emby", 8096],
    ["grafana", 3000],
    ["prometheus", 9090],
    ["portainer", 9000],
    ["nextcloud", 8080],
    ["homeassistant", 8123],
    ["home-assistant", 8123],
    ["vaultwarden", 80],
    ["bitwarden", 80],
    ["immich", 2283],
    ["paperless", 8000],
    ["sonarr", 8989],
    ["radarr", 7878],
    ["prowlarr", 9696],
    ["qbittorrent", 8080],
    ["transmission", 9091],
    ["bazarr", 6767],
    ["overseerr", 5055],
    ["jellyseerr", 5055],
    ["uptime-kuma", 3001],
    ["kuma", 3001],
    ["gitea", 3000],
    ["gitlab", 80],
    ["n8n", 5678],
    ["ollama", 11434],
    ["open-webui", 8080],
    ["pihole", 80],
    ["adguard", 3000],
    ["syncthing", 8384],
    ["navidrome", 4533],
    ["audiobookshelf", 13378],
    ["calibre", 8083],
    ["mealie", 9000],
    ["ghost", 2368],
    ["wordpress", 80],
    ["nginx", 80],
    ["caddy", 80],
    ["traefik", 8080],
    ["autohost-cloud-lite", 3000],
    ["autohost-cloud-api", 8080],
  ];

  for (const [key, port] of knownPorts) {
    if (combined.includes(key)) return port;
  }
  return 8080;
}

function cleanSubdomainSuggestion(containerName: string): string {
  return containerName
    .toLowerCase()
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface CloudflareTunnelCardProps {
  defaultNodeId: string;
}

export function CloudflareTunnelCard({ defaultNodeId }: CloudflareTunnelCardProps) {
  const { allNodes } = useNodes();

  const [status, setStatus] = useState<CloudflareTunnelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Base domain state
  const [baseDomainInput, setBaseDomainInput] = useState("");
  const [savingDomain, setSavingDomain] = useState(false);

  // Route builder state
  const [selectedNodeId, setSelectedNodeId] = useState<string>(defaultNodeId);
  const [selectedContainerId, setSelectedContainerId] = useState<string>("");
  const [subdomain, setSubdomain] = useState<string>("");
  const [port, setPort] = useState<string>("8080");
  const [savingRoute, setSavingRoute] = useState(false);
  const [routeSaved, setRouteSaved] = useState(false);
  const [deletingDomain, setDeletingDomain] = useState<string | null>(null);

  // Live containers on the currently selected target node
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
    const raw = selectedNode.ipVpn || (selectedNode.isLocal ? "127.0.0.1" : selectedNode.ipLocal) || "127.0.0.1";
    return raw.split("/")[0];
  }, [selectedNode]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/cloudflare-tunnel", { method: "GET" });
      if (!res.ok) return;
      const data: CloudflareTunnelStatus = await res.json();
      setStatus(data);
      setBaseDomainInput((prev) => (prev === "" && data.base_domain ? data.base_domain : prev));
    } catch {
      // ignore transient poll errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll faster while waiting for 1-click browser login to finish
  useEffect(() => {
    if (!status?.login_in_process) return;
    const interval = setInterval(fetchStatus, 2500);
    return () => clearInterval(interval);
  }, [status?.login_in_process, fetchStatus]);

  // When user selects a container, auto-fill port and suggest subdomain
  const handleSelectContainer = (containerId: string) => {
    setSelectedContainerId(containerId);
    if (!containerId) return;
    const found = containers.find((c) => c.id === containerId || c.name === containerId);
    if (!found) return;

    const inferredPort = inferContainerPort(found);
    setPort(String(inferredPort));

    const suggestedSub = cleanSubdomainSuggestion(found.name);
    if (suggestedSub) {
      setSubdomain(suggestedSub);
    }
  };

  // Start 1-Click Cloudflare Login
  const handleStartLogin = async () => {
    setActionLoading("login");
    setError(null);
    try {
      const res = await fetchWithAuth("/api/cloudflare-tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo iniciar Cloudflare Login");
      }
      if (data.login_url) {
        window.open(data.login_url, "_blank", "noopener,noreferrer");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión con Cloudflare");
    } finally {
      setActionLoading(null);
    }
  };

  // Start Quick Tunnel (*.trycloudflare.com)
  const handleStartQuickTunnel = async () => {
    setActionLoading("quick");
    setError(null);
    try {
      const res = await fetchWithAuth("/api/cloudflare-tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quick-tunnel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo iniciar Quick Tunnel");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar Quick Tunnel");
    } finally {
      setActionLoading(null);
    }
  };

  // Save base domain
  const handleSaveBaseDomain = async () => {
    setSavingDomain(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/cloudflare-tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "config",
          base_domain: baseDomainInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar el dominio base");
      }
      setBaseDomainInput(data.base_domain || "");
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar dominio base");
    } finally {
      setSavingDomain(false);
    }
  };

  // Disconnect tunnel
  const handleDisconnect = async () => {
    setActionLoading("disconnect");
    setError(null);
    try {
      await fetchWithAuth("/api/cloudflare-tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al desconectar túnel");
    } finally {
      setActionLoading(null);
    }
  };

  const effectiveBaseDomain = (baseDomainInput || status?.base_domain || "").trim().toLowerCase();
  const cleanSub = subdomain.trim().toLowerCase();
  const previewDomain = useMemo(() => {
    if (effectiveBaseDomain) {
      if (!cleanSub || cleanSub === "@") return effectiveBaseDomain;
      return `${cleanSub}.${effectiveBaseDomain}`;
    }
    if (status?.quick_tunnel_url) {
      return status.quick_tunnel_url.replace(/^https?:\/\//, "");
    }
    return cleanSub ? `${cleanSub}.tudominio.com` : "app.tudominio.com";
  }, [cleanSub, effectiveBaseDomain, status?.quick_tunnel_url]);

  // Publish Multi-Node Route
  const handleUpsertRoute = async () => {
    const portNum = parseInt(port, 10);
    if (!selectedNodeId || isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      setError("Selecciona un nodo válido y un puerto entre 1 y 65535.");
      return;
    }
    if (!effectiveBaseDomain && !status?.quick_tunnel_url && !cleanSub) {
      setError("Ingresa un dominio base (ej. tudominio.com) o un subdominio.");
      return;
    }

    const chosenContainer = containers.find(
      (c) => c.id === selectedContainerId || c.name === selectedContainerId
    );

    setSavingRoute(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/cloudflare-tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert-route",
          subdomain: cleanSub || "@",
          base_domain: effectiveBaseDomain,
          target_node_id: selectedNodeId,
          port: portNum,
          container_id: chosenContainer?.id ?? "",
          container_name: chosenContainer?.name ?? "",
          container_image: chosenContainer?.image ?? "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo publicar la ruta en el túnel");
      }
      setRouteSaved(true);
      setTimeout(() => setRouteSaved(false), 2500);
      setSubdomain("");
      setSelectedContainerId("");
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar la ruta");
    } finally {
      setSavingRoute(false);
    }
  };

  const handleDeleteRoute = async (domain: string) => {
    setDeletingDomain(domain);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/cloudflare-tunnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-route", domain }),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al eliminar ruta");
      }
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar ruta");
    } finally {
      setDeletingDomain(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <Card className="border-orange-500/30 bg-gradient-to-b from-orange-500/[0.04] to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2.5 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30">
                <Cloud className="h-4 w-4" />
              </div>
              Cloudflare Tunnel Gateway &amp; Multi-Node Reverse Proxy
              {status?.authenticated ? (
                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Conectado
                </Badge>
              ) : status?.quick_tunnel_url ? (
                <Badge className="bg-sky-500/15 text-sky-400 border-sky-500/30 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Quick Tunnel Activo
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Sin autenticar
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Conecta el nodo Master (<code>{status?.master_hostname || "m-storage"}</code>) con tu cuenta de Cloudflare en 1 clic (sin API keys manuales) y enruta subdominios hacia contenedores Docker de cualquier nodo a través de Tailscale.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchStatus}
              className="gap-1.5 text-xs text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </Button>
            {(status?.authenticated || status?.running) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={actionLoading === "disconnect"}
                className="gap-1.5 text-xs border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                {actionLoading === "disconnect" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unplug className="h-3.5 w-3.5" />
                )}
                Desconectar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* 1. Connection & Authentication Panel */}
            {!status?.authenticated ? (
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Cloud className="h-4 w-4 text-orange-400" />
                      Paso 1: Vincula tu dominio de Cloudflare (1-Click OAuth)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Al hacer clic se abrirá la página oficial de Cloudflare donde solo eliges tu dominio y pulsas <strong>Authorize</strong>. El nodo Master descargará el certificado y creará el túnel automáticamente.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <Button
                      onClick={handleStartLogin}
                      disabled={actionLoading !== null}
                      className="bg-orange-500 hover:bg-orange-600 text-white gap-2"
                    >
                      {actionLoading === "login" || status?.login_in_process ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="h-4 w-4" />
                      )}
                      {status?.login_in_process
                        ? "Esperando autorización…"
                        : "Conectar con Cloudflare (1-Click)"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleStartQuickTunnel}
                      disabled={actionLoading !== null}
                      className="gap-2 text-xs"
                    >
                      {actionLoading === "quick" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                      )}
                      Quick Tunnel (.trycloudflare.com)
                    </Button>
                  </div>
                </div>

                {status?.login_url && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-500/40 bg-background/80 px-3.5 py-2.5 text-xs">
                    <div className="truncate flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400 shrink-0" />
                      <span className="text-muted-foreground">
                        Si no se abrió la ventana emergente, autoriza aquí:
                      </span>
                      <a
                        href={status.login_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-orange-400 underline truncate"
                      >
                        {status.login_url}
                      </a>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-7 text-xs shrink-0 gap-1"
                      onClick={() => window.open(status.login_url, "_blank", "noopener,noreferrer")}
                    >
                      Abrir enlace
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                {status?.quick_tunnel_url && (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Sparkles className="h-4 w-4 text-sky-400 shrink-0" />
                      <span className="text-sky-200 font-medium">URL Pública Temporal Activa:</span>
                      <a
                        href={status.quick_tunnel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-sky-300 underline truncate"
                      >
                        {status.quick_tunnel_url}
                      </a>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      onClick={() => copyToClipboard(status.quick_tunnel_url!)}
                    >
                      {copiedUrl === status.quick_tunnel_url ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      Copiar
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Authenticated Status & Base Domain Bar */
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end rounded-xl border bg-card/60 p-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="cf-base-domain" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Dominio Base Autorizado en Cloudflare
                    </Label>
                    {status.tunnel_id && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        Tunnel: {status.tunnel_name} ({status.tunnel_id.slice(0, 8)}…)
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="cf-base-domain"
                      placeholder="tudominio.com"
                      value={baseDomainInput}
                      onChange={(e) => setBaseDomainInput(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="secondary"
                      onClick={handleSaveBaseDomain}
                      disabled={savingDomain}
                      className="shrink-0 gap-1.5"
                    >
                      {savingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Guardar Dominio
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Multi-Node Container Route Builder */}
            <div className="rounded-xl border bg-card/40 p-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Network className="h-4 w-4 text-orange-400" />
                    Crear Ruta Reverse Proxy Multi-Nodo (Master → Tailscale → Contenedor)
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Selecciona el nodo, elige una imagen Docker levantada y crea el subdominio automáticamente.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                {/* Step A: Target Node */}
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
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {allNodes.map((n) => {
                      const tailscaleIP = (n.ipVpn || n.ipLocal || "127.0.0.1").split("/")[0];
                      return (
                        <option key={n.id} value={n.id}>
                          {n.name} {n.isLocal ? "(Master)" : ""} — {tailscaleIP}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Step B: Running Container on that Node */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Box className="h-3.5 w-3.5 text-muted-foreground" />
                    2. Contenedor / Imagen Activa
                  </Label>
                  <select
                    value={selectedContainerId}
                    onChange={(e) => handleSelectContainer(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">
                      {runningContainers.length > 0
                        ? `Seleccionar contenedor (${runningContainers.length} activos)…`
                        : containersConnected
                        ? "Sin contenedores activos (puerto manual)"
                        : "Cargando contenedores del nodo…"}
                    </option>
                    {runningContainers.map((c) => {
                      const guessedPort = inferContainerPort(c);
                      return (
                        <option key={c.id} value={c.id}>
                          🟢 {c.name} ({c.image}) → :{guessedPort}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Step C: Subdomain + Base domain */}
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    3. Subdominio (o @ para raíz)
                  </Label>
                  <div className="flex items-center">
                    <Input
                      placeholder="jellyfin, api, @"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value)}
                      className="rounded-r-none font-mono text-sm"
                    />
                    <span className="inline-flex h-9 items-center rounded-r-md border border-l-0 border-input bg-muted px-2.5 text-xs font-mono text-muted-foreground truncate max-w-[140px]">
                      .{effectiveBaseDomain || "tudominio.com"}
                    </span>
                  </div>
                </div>

                {/* Step D: Port & Submit */}
                <div className="space-y-1.5">
                  <Label className="text-xs">4. Puerto del Contenedor</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={65535}
                      value={port}
                      onChange={(e) => setPort(e.target.value)}
                      className="font-mono text-sm w-24 shrink-0"
                    />
                    <Button
                      onClick={handleUpsertRoute}
                      disabled={savingRoute}
                      className="flex-1 gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {savingRoute ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : routeSaved ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      {savingRoute ? "Creando…" : routeSaved ? "¡Listo!" : "Publicar"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Live Route Flow Preview */}
              <div className="flex items-center gap-2 flex-wrap rounded-lg bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground">
                <span className="text-orange-400 font-semibold">https://{previewDomain}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span>Master Tunnel</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-emerald-400">
                  Tailscale ({selectedNode?.name ?? "Nodo"}: http://{selectedNodeIP}:{port || "8080"})
                </span>
              </div>

              {error && <p className="text-xs text-destructive font-medium">{error}</p>}
            </div>

            {/* 3. Configured Multi-Node Routes List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rutas Activas en el Túnel ({status?.routes?.length ?? 0})
                </h4>
              </div>

              {status?.routes && status.routes.length > 0 ? (
                <div className="rounded-xl border divide-y bg-card/30">
                  {status.routes.map((rt) => (
                    <div
                      key={rt.domain}
                      className="flex items-center justify-between gap-4 px-4 py-3 flex-wrap sm:flex-nowrap"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`https://${rt.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold font-mono text-orange-400 hover:underline flex items-center gap-1"
                          >
                            https://{rt.domain}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <Badge variant="outline" className="text-[11px] gap-1 font-normal">
                            <Server className="h-3 w-3 text-sky-400" />
                            {rt.target_node_name}
                          </Badge>
                          {rt.container_name && (
                            <Badge variant="secondary" className="text-[11px] gap-1 font-mono">
                              <Box className="h-3 w-3 text-emerald-400" />
                              {rt.container_name}
                              {rt.container_image ? ` (${rt.container_image})` : ""}
                            </Badge>
                          )}
                          {rt.dns_configured && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                              DNS CNAME Activo
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs font-mono text-muted-foreground">
                          Tailscale Upstream: <code>http://{rt.upstream}</code>
                        </p>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingDomain === rt.domain}
                        onClick={() => handleDeleteRoute(rt.domain)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                      >
                        {deletingDomain === rt.domain ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-1.5 rounded-xl border border-dashed text-muted-foreground">
                  <Cloud className="h-7 w-7 opacity-40" />
                  <p className="text-sm">Aún no hay subdominios configurados en el túnel</p>
                  <p className="text-xs text-muted-foreground/70">
                    Selecciona un nodo y un contenedor arriba para exponerlo con HTTPS automático.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
