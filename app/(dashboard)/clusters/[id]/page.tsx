"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClusters } from "@/lib/features/clusters/hooks/useClusters";
import type { ClusterWithDetails, ClusterService, AutoscalePolicy } from "@/lib/types/cluster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchContainers } from "@/lib/features/nodes/api";
import type { DockerContainer } from "@/lib/features/nodes/types";
import {
  Layers,
  Server,
  Plus,
  Trash2,
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  ArrowLeft,
  RefreshCw,
  Sliders,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Info,
  Box,
  Check,
  Loader2,
  Network,
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ClusterTopologyGraph } from "@/components/features/clusters/ClusterTopologyGraph";

export default function ClusterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clusterId } = use(params);
  const router = useRouter();
  const { scaleService, createService, deleteService, configureAutoscaling, deleteCluster } = useClusters();

  const [clusterData, setClusterData] = useState<ClusterWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"services" | "topology" | "nodes">("topology");

  // Deploy Service Modal State
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [svcName, setSvcName] = useState("");
  const [svcImage, setSvcImage] = useState("");
  const [svcPorts, setSvcPorts] = useState("");
  const [svcReplicas, setSvcReplicas] = useState(1);
  const [svcEnvKey, setSvcEnvKey] = useState("");
  const [svcEnvVal, setSvcEnvVal] = useState("");
  const [svcEnvVars, setSvcEnvVars] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);

  // Container Selection from Manager / Nodes
  const [nodeContainers, setNodeContainers] = useState<DockerContainer[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [selectedSourceNodeId, setSelectedSourceNodeId] = useState<string>("");
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  // Autoscaling Modal / Panel State
  const [selectedService, setSelectedService] = useState<ClusterService | null>(null);
  const [autoScaleOpen, setAutoScaleOpen] = useState(false);
  const [policyEnabled, setPolicyEnabled] = useState(true);
  const [metricType, setMetricType] = useState<"cpu" | "ram">("cpu");
  const [upThreshold, setUpThreshold] = useState(75);
  const [downThreshold, setDownThreshold] = useState(30);
  const [upDuration, setUpDuration] = useState(300); // 5 min
  const [downDuration, setDownDuration] = useState(600); // 10 min
  const [minReplicas, setMinReplicas] = useState(1);
  const [maxReplicas, setMaxReplicas] = useState(4);
  const [cooldown, setCooldown] = useState(180); // 3 min
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchDetails = useCallback(async (isInitial?: boolean | unknown) => {
    const shouldShowLoading = isInitial === true;
    if (shouldShowLoading) setLoading(true);
    try {
      const res = await fetch(`/api/clusters/${clusterId}`);
      if (res.ok) {
        const data = await res.json();
        setClusterData(data);
      }
    } catch (err) {
      console.error("Failed to fetch cluster details:", err);
    } finally {
      if (shouldShowLoading) setLoading(false);
    }
  }, [clusterId]);

  useEffect(() => {
    fetchDetails(true);
  }, [fetchDetails]);

  // Preselect manager node when deploy modal opens
  useEffect(() => {
    if (deployModalOpen && clusterData?.nodes) {
      const managerNode = clusterData.nodes.find((n) => n.role === "manager");
      const defaultId = managerNode?.node_id || clusterData.nodes[0]?.node_id;
      if (defaultId && !selectedSourceNodeId) {
        setSelectedSourceNodeId(defaultId);
      }
    }
  }, [deployModalOpen, clusterData, selectedSourceNodeId]);

  // Fetch containers on selected node
  useEffect(() => {
    if (!deployModalOpen || !selectedSourceNodeId) return;
    let cancelled = false;
    async function loadContainers() {
      setLoadingContainers(true);
      try {
        const list = await fetchContainers(selectedSourceNodeId);
        if (!cancelled) {
          setNodeContainers(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error("Failed to load containers for node", err);
        if (!cancelled) setNodeContainers([]);
      } finally {
        if (!cancelled) setLoadingContainers(false);
      }
    }
    loadContainers();
    return () => {
      cancelled = true;
    };
  }, [deployModalOpen, selectedSourceNodeId]);

  const handleSelectContainer = (c: DockerContainer) => {
    setSelectedContainerId(c.id);
    const cleanName = c.name.replace(/^\//, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    setSvcName(cleanName);
    setSvcImage(c.image);
    if (c.image.includes("whoami") || c.image.includes("nginx") || c.image.includes("http-echo")) {
      setSvcPorts("8080:80");
    }
  };

  const handleClearSelectedContainer = () => {
    setSelectedContainerId(null);
    setSvcName("");
    setSvcImage("");
    setSvcPorts("");
  };

  const handleDeployService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!svcName || !svcImage) return;
    setDeploying(true);
    try {
      await createService(clusterId, {
        name: svcName.trim().toLowerCase(),
        image: svcImage.trim(),
        ports: svcPorts.trim(),
        env_vars: svcEnvVars,
        replicas: svcReplicas,
      });
      setDeployModalOpen(false);
      setSvcName("");
      setSvcImage("");
      setSvcPorts("");
      setSvcReplicas(1);
      setSvcEnvVars({});
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || "Error al desplegar servicio");
    } finally {
      setDeploying(false);
    }
  };

  const handleQuickScale = async (service: ClusterService, delta: number) => {
    const newReplicas = service.replicas + delta;
    if (newReplicas < 1) return;
    try {
      await scaleService(clusterId, service.id, newReplicas);
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || "Error al escalar servicio");
    }
  };

  const handleDeleteService = async (service: ClusterService) => {
    if (!confirm(`¿Estás seguro de eliminar el servicio ${service.name}?`)) return;
    try {
      await deleteService(clusterId, service.id);
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || "Error al eliminar servicio");
    }
  };

  const handleOpenAutoscaling = (service: ClusterService) => {
    setSelectedService(service);
    if (service.autoscaling) {
      setPolicyEnabled(service.autoscaling.enabled);
      setMetricType(service.autoscaling.metric_type);
      setUpThreshold(service.autoscaling.scale_up_threshold);
      setDownThreshold(service.autoscaling.scale_down_threshold);
      setUpDuration(service.autoscaling.scale_up_duration_sec || 30);
      setDownDuration(service.autoscaling.scale_down_duration_sec || 60);
      setMinReplicas(service.autoscaling.min_replicas);
      setMaxReplicas(service.autoscaling.max_replicas);
      setCooldown(service.autoscaling.cooldown_seconds || 30);
    } else {
      setPolicyEnabled(true);
      setMetricType("cpu");
      setUpThreshold(75);
      setDownThreshold(30);
      setUpDuration(30);
      setDownDuration(60);
      setMinReplicas(1);
      setMaxReplicas(4);
      setCooldown(30);
    }
    setAutoScaleOpen(true);
  };

  const handleSaveAutoscaling = async () => {
    if (!selectedService) return;
    setSavingPolicy(true);
    try {
      const policy: AutoscalePolicy = {
        enabled: policyEnabled,
        metric_type: metricType,
        scale_up_threshold: Number(upThreshold),
        scale_down_threshold: Number(downThreshold),
        scale_up_duration_sec: Number(upDuration),
        scale_down_duration_sec: Number(downDuration),
        min_replicas: Number(minReplicas),
        max_replicas: Number(maxReplicas),
        cooldown_seconds: Number(cooldown),
      };
      await configureAutoscaling(clusterId, selectedService.id, policy);
      setAutoScaleOpen(false);
      await fetchDetails();
    } catch (err: any) {
      alert(err.message || "Error al guardar política de autoescalado");
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeleteCluster = async () => {
    if (!confirm(`¿Estás seguro de eliminar el cluster "${clusterData?.cluster.name}"? Todos los servicios se detendrán y los nodos saldrán del Swarm.`)) {
      return;
    }
    try {
      await deleteCluster(clusterId);
      router.push("/clusters");
    } catch (err: any) {
      alert(err.message || "Error al eliminar cluster");
    }
  };

  if (loading && !clusterData) {
    return (
      <div className="flex justify-center items-center py-24 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Cargando detalles del cluster...
      </div>
    );
  }

  if (!clusterData) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-semibold">Cluster no encontrado</h2>
        <Link href="/clusters" className="text-primary mt-2 inline-block">
          Volver a la lista
        </Link>
      </div>
    );
  }

  const nodes = clusterData.nodes || [];
  const services = clusterData.services || [];
  const manager = nodes.find((n) => n.role === "manager");
  const workers = nodes.filter((n) => n.role === "worker");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/clusters" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground mb-2 gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a Clusters
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{clusterData.cluster.name}</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
              {clusterData.cluster.status}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
            Red Overlay: <code className="bg-muted px-1.5 py-0.5 rounded">{clusterData.cluster.overlay_network} (MTU 1200)</code>
            <span>•</span>
            Manager: <span className="font-medium text-foreground">{manager?.node_hostname || manager?.node_id.slice(0, 8)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDetails}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refrescar
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteCluster}>
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar Cluster
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab("topology")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "topology"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Network className="h-4 w-4 text-emerald-400" />
          Topología & Réplicas en Vivo
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "services"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Cpu className="h-4 w-4" />
          Servicios Stateless ({services.length})
        </button>

        <button
          onClick={() => setActiveTab("nodes")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "nodes"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Server className="h-4 w-4" />
          Nodos & Red Privada ({nodes.length})
        </button>
      </div>

      {/* TAB 1: Services */}
      {activeTab === "services" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Microservicios Desplegados</h3>
              <p className="text-xs text-muted-foreground">
                Servicios distribuidos y balanceados automáticamente por el Ingress Routing Mesh de Swarm.
              </p>
            </div>
            <Button size="sm" onClick={() => setDeployModalOpen(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Desplegar Servicio
            </Button>
          </div>

          {services.length === 0 ? (
            <Card className="border-dashed bg-card/40">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Cpu className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm font-medium">No hay servicios desplegados en este cluster.</p>
                <p className="text-xs mt-1">Haz clic en &quot;Desplegar Servicio&quot; para publicar una imagen Docker stateless.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {services.map((svc) => (

                <Card key={svc.id} className="border-border/60 bg-card/70 backdrop-blur-sm">
                  <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{svc.name}</span>
                        <Badge variant="outline" className="text-xs bg-muted">
                          {svc.image}
                        </Badge>
                        {svc.autoscaling?.enabled && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] gap-1">
                            <Zap className="h-3 w-3" /> Autoescalado Activo
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {svc.ports && (
                          <span>
                            Puertos: <code className="bg-muted px-1 rounded">{svc.ports}</code>
                          </span>
                        )}
                        <span>
                          ID Swarm: <code className="bg-muted px-1 rounded">{svc.id.slice(0, 8)}</code>
                        </span>
                        {svc.autoscaling && (
                          <span className="text-foreground/80 flex items-center gap-1">
                            Regla: {(svc.autoscaling.metric_type || "cpu").toUpperCase()} &gt; {svc.autoscaling.scale_up_threshold}% (min {svc.autoscaling.min_replicas}, max {svc.autoscaling.max_replicas})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Replicas Control */}
                      <div className="flex items-center bg-muted/60 border border-border/80 rounded-lg p-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          disabled={svc.replicas <= 1}
                          onClick={() => handleQuickScale(svc, -1)}
                        >
                          -
                        </Button>
                        <span className="px-3 text-xs font-semibold">
                          {svc.replicas} {svc.replicas === 1 ? "réplica" : "réplicas"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleQuickScale(svc, 1)}
                        >
                          +
                        </Button>
                      </div>

                      {/* Autoscaling Config Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAutoscaling(svc)}
                        className="gap-1.5"
                      >
                        <Sliders className="h-3.5 w-3.5 text-primary" />
                        Autoescalado
                      </Button>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                        onClick={() => handleDeleteService(svc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Nodes & Network */}
      {activeTab === "nodes" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Topología del Cluster y Red Privada</h3>
            <p className="text-xs text-muted-foreground">
              Nodos interconectados de forma segura mediante la red mesh WireGuard (Headscale).
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {nodes.map((node) => (
              <Card
                key={node.id}
                className={`border ${
                  node.role === "manager" ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card/60"
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {node.role === "manager" ? (
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      ) : (
                        <Server className="h-5 w-5 text-muted-foreground" />
                      )}
                      <CardTitle className="text-sm font-semibold truncate max-w-[180px]">
                        {node.node_hostname || node.node_id.slice(0, 8)}
                      </CardTitle>
                    </div>
                    <Badge variant={node.role === "manager" ? "default" : "outline"} className="text-xs capitalize">
                      {node.role}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>IP Pública:</span>
                    <span className="font-mono text-foreground">{node.node_ip || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>IP Privada VPN:</span>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-mono text-[11px]">
                      {node.node_ip_vpn || "N/A"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Estado en Cluster:</span>
                    <span className="text-emerald-500 font-medium capitalize">{node.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Real-Time Topology & Replicas Graph */}
      {activeTab === "topology" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Network className="h-5 w-5 text-emerald-400" />
              Topología y Distribución de Réplicas en Tiempo Real
            </h3>
            <p className="text-xs text-muted-foreground">
              Visualiza en vivo la interconexión entre tus nodos y las réplicas asignadas dinámicamente por Docker Swarm.
            </p>
          </div>

          <ClusterTopologyGraph clusterData={clusterData} onRefresh={fetchDetails} />
        </div>
      )}

      {/* Deploy Service Modal */}
      <Dialog open={deployModalOpen} onOpenChange={setDeployModalOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Desplegar Servicio Stateless en Cluster
            </DialogTitle>
            <DialogDescription>
              Selecciona un contenedor existente en tus nodos para convertirlo en servicio balanceado, o ingresa una nueva imagen Docker.
            </DialogDescription>
          </DialogHeader>

          {/* Section 1: Source Node & Running Containers */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                1. Contenedores en tus Servidores
              </Label>
              {selectedContainerId && (
                <button
                  type="button"
                  onClick={handleClearSelectedContainer}
                  className="text-xs text-primary hover:underline"
                >
                  Limpiar selección
                </button>
              )}
            </div>

            {/* Node Selector Pills */}
            <div className="flex flex-wrap gap-2">
              {nodes.map((n) => {
                const isSelected = (selectedSourceNodeId || manager?.node_id) === n.node_id;
                const nodeName = n.node_hostname || n.node_id.slice(0, 8);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setSelectedSourceNodeId(n.node_id);
                      setSelectedContainerId(null);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border/60 hover:border-border text-muted-foreground bg-card/60"
                    }`}
                  >
                    {n.role === "manager" ? (
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span>{nodeName}</span>
                    <span className="text-[10px] opacity-70">({n.role})</span>
                  </button>
                );
              })}
            </div>

            {/* Container Cards */}
            {loadingContainers ? (
              <div className="py-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2 bg-muted/20 rounded-lg border border-dashed border-border/60">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Obteniendo contenedores activos en el servidor...
              </div>
            ) : nodeContainers.length === 0 ? (
              <div className="py-4 px-3 text-xs text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-border/60 text-center">
                No se encontraron contenedores activos en este servidor. Puedes escribir la imagen manualmente abajo.
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 max-h-[180px] overflow-y-auto pr-1">
                {nodeContainers.map((c) => {
                  const isSelected = selectedContainerId === c.id;
                  const cName = c.name.replace(/^\//, "");
                  return (
                    <div
                      key={c.id}
                      onClick={() => handleSelectContainer(c)}
                      className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/15 shadow-sm"
                          : "border-border/60 hover:border-primary/50 bg-card/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs truncate">{cName}</span>
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        ) : (
                          <Badge variant="outline" className="text-[10px] py-0 px-1 text-emerald-500 bg-emerald-500/10 border-emerald-500/20">
                            {c.state || "activo"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate mt-1">
                        <code>{c.image}</code>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border/60 my-1" />

          {/* Section 2: Form Configuration */}
          <form onSubmit={handleDeployService} className="space-y-4">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              2. Configuración del Servicio Swarm
            </Label>

            <div className="space-y-1.5">
              <Label htmlFor="svc-name" className="text-xs">Nombre del Servicio</Label>
              <Input
                id="svc-name"
                placeholder="ej: demo-api, auth-service, webapp"
                value={svcName}
                onChange={(e) => setSvcName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="svc-image" className="text-xs">Imagen Docker</Label>
              <Input
                id="svc-image"
                placeholder="ej: traefik/whoami, nginx:alpine, tu-repo/app:latest"
                value={svcImage}
                onChange={(e) => setSvcImage(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="svc-ports" className="text-xs">Puertos (Publicado:Destino)</Label>
                <Input
                  id="svc-ports"
                  placeholder="ej: 8080:80 o 3000"
                  value={svcPorts}
                  onChange={(e) => setSvcPorts(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="svc-replicas" className="text-xs">Réplicas Iniciales</Label>
                <Input
                  id="svc-replicas"
                  type="number"
                  min={1}
                  max={10}
                  value={svcReplicas}
                  onChange={(e) => setSvcReplicas(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            {/* Environment Variables Editor */}
            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Variables de Entorno (Se inyectan a todas las réplicas)</Label>
                <span className="text-[10px] text-muted-foreground">{Object.keys(svcEnvVars).length} variables</span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  placeholder="CLAVE (ej: DB_HOST, PORT)"
                  value={svcEnvKey}
                  onChange={(e) => setSvcEnvKey(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <Input
                  placeholder="VALOR (ej: 100.64.0.1, 8080)"
                  value={svcEnvVal}
                  onChange={(e) => setSvcEnvVal(e.target.value)}
                  className="h-8 text-xs font-mono"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    if (!svcEnvKey.trim()) return;
                    setSvcEnvVars({ ...svcEnvVars, [svcEnvKey.trim()]: svcEnvVal.trim() });
                    setSvcEnvKey("");
                    setSvcEnvVal("");
                  }}
                  className="h-8 px-3 text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Añadir
                </Button>
              </div>

              {Object.keys(svcEnvVars).length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-card/60 border border-border/60 max-h-28 overflow-y-auto">
                  {Object.entries(svcEnvVars).map(([k, v]) => (
                    <Badge
                      key={k}
                      variant="outline"
                      className="gap-1.5 py-1 px-2 font-mono text-[11px] bg-background/80"
                    >
                      <span className="text-primary font-bold">{k}</span>=
                      <span className="text-foreground max-w-[120px] truncate">{v}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...svcEnvVars };
                          delete updated[k];
                          setSvcEnvVars(updated);
                        }}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" type="button" onClick={() => setDeployModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={deploying || !svcName || !svcImage}>
                {deploying ? "Desplegando en Swarm..." : "Desplegar Servicio"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Autoscaling Modal */}
      <Dialog open={autoScaleOpen} onOpenChange={setAutoScaleOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Autoescalado Predictivo: {selectedService?.name}
            </DialogTitle>
            <DialogDescription>
              Configura los umbrales de consumo y tiempos sostenidos para escalar hacia arriba y hacia abajo automáticamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/60">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold">Habilitar Autoescalado</div>
                <div className="text-xs text-muted-foreground">El API evaluará métricas cada 30 segundos</div>
              </div>
              <input
                type="checkbox"
                checked={policyEnabled}
                onChange={(e) => setPolicyEnabled(e.target.checked)}
                className="h-5 w-5 rounded border-border text-primary focus:ring-primary"
              />
            </div>

            {/* Metric Type */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setMetricType("cpu")}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                  metricType === "cpu" ? "border-primary bg-primary/10 font-semibold" : "border-border/60 hover:border-border"
                }`}
              >
                <Cpu className="h-4 w-4 mx-auto mb-1 text-primary" />
                <span className="text-xs">Métrica: CPU (%)</span>
              </div>

              <div
                onClick={() => setMetricType("ram")}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-colors ${
                  metricType === "ram" ? "border-primary bg-primary/10 font-semibold" : "border-border/60 hover:border-border"
                }`}
              >
                <Activity className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                <span className="text-xs">Métrica: RAM (%)</span>
              </div>
            </div>

            {/* Thresholds and Durations */}
            <div className="grid grid-cols-2 gap-4">
              {/* Scale-Up Card */}
              <div className="space-y-2.5 p-3 rounded-lg bg-card border border-border/60">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1 text-emerald-500">
                    <TrendingUp className="h-3.5 w-3.5" /> Scale-Up (Subir)
                  </span>
                  <span>{upThreshold}%</span>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Umbral de activación (%)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={95}
                    value={upThreshold}
                    onChange={(e) => setUpThreshold(Number(e.target.value))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Tiempo sostenido</Label>
                  <select
                    value={upDuration}
                    onChange={(e) => setUpDuration(Number(e.target.value))}
                    className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  >
                    <option value={15}>⚡ 15 segundos (Pruebas ultra rápidas)</option>
                    <option value={30}>⚡ 30 segundos (Pruebas)</option>
                    <option value={60}>⏱️ 1 minuto</option>
                    <option value={120}>⏱️ 2 minutos</option>
                    <option value={300}>🛡️ 5 minutos (Producción estándar)</option>
                    <option value={600}>🛡️ 10 minutos</option>
                  </select>
                </div>
              </div>

              {/* Scale-Down Card */}
              <div className="space-y-2.5 p-3 rounded-lg bg-card border border-border/60">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-1 text-blue-400">
                    <TrendingDown className="h-3.5 w-3.5" /> Scale-Down (Bajar)
                  </span>
                  <span>{downThreshold}%</span>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Umbral de reducción (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={downThreshold}
                    onChange={(e) => setDownThreshold(Number(e.target.value))}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Tiempo sostenido</Label>
                  <select
                    value={downDuration}
                    onChange={(e) => setDownDuration(Number(e.target.value))}
                    className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary mt-1"
                  >
                    <option value={30}>⚡ 30 segundos (Pruebas)</option>
                    <option value={60}>⏱️ 1 minuto</option>
                    <option value={120}>⏱️ 2 minutos</option>
                    <option value={300}>⏱️ 5 minutos</option>
                    <option value={600}>🛡️ 10 minutos (Producción estándar)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Replicas Bounds & Cooldown */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Mín. Réplicas</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxReplicas}
                  value={minReplicas}
                  onChange={(e) => setMinReplicas(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Máx. Réplicas</Label>
                <Input
                  type="number"
                  min={minReplicas}
                  max={15}
                  value={maxReplicas}
                  onChange={(e) => setMaxReplicas(Number(e.target.value))}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Cooldown</Label>
                <select
                  value={cooldown}
                  onChange={(e) => setCooldown(Number(e.target.value))}
                  className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={15}>15 seg</option>
                  <option value={30}>30 seg</option>
                  <option value={60}>1 min</option>
                  <option value={180}>3 min</option>
                </select>
              </div>
            </div>

            {/* Anti-Flapping Notice */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                <strong>Anti-Flapping Activo:</strong> Antes de apagar una réplica, el sistema calcula la carga proyectada para garantizar que las réplicas restantes no volverán a saturarse.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoScaleOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAutoscaling} disabled={savingPolicy}>
              {savingPolicy ? "Guardando..." : "Guardar Reglas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
