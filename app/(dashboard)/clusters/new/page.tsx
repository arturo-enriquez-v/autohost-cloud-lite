"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClusters } from "@/lib/features/clusters/hooks/useClusters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Server, ArrowLeft, ShieldCheck, Check, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

interface NodeItem {
  id: string;
  hostname?: string;
  name?: string;
  ip?: string;
  ipLocal?: string;
  ip_local?: string;
  ipVpn?: string;
  ip_vpn?: string;
  status?: string;
}

export default function NewClusterPage() {
  const router = useRouter();
  const { createCluster } = useClusters();

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(true);
  const [name, setName] = useState("");
  const [managerNodeId, setManagerNodeId] = useState<string>("");
  const [workerNodeIds, setWorkerNodeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNodes() {
      try {
        const res = await fetch("/api/nodes");
        if (res.ok) {
          const data = await res.json();
          const list: NodeItem[] = Array.isArray(data) ? data : data.nodes || [];
          setNodes(list);
          // Auto-select first node with VPN as manager
          const firstWithVPN = list.find((n) => n.ipVpn || n.ip_vpn);
          if (firstWithVPN) {
            setManagerNodeId(firstWithVPN.id);
          } else if (list.length > 0) {
            setManagerNodeId(list[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch nodes", err);
      } finally {
        setLoadingNodes(false);
      }
    }
    fetchNodes();
  }, []);

  const toggleWorker = (id: string) => {
    if (workerNodeIds.includes(id)) {
      setWorkerNodeIds(workerNodeIds.filter((item) => item !== id));
    } else {
      setWorkerNodeIds([...workerNodeIds, id]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Por favor ingresa un nombre para el cluster.");
      return;
    }
    if (!managerNodeId) {
      setError("Debes seleccionar al menos un nodo Manager.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createCluster(name.trim(), managerNodeId, workerNodeIds);
      router.push(`/clusters/${created.cluster.id}`);
    } catch (err: any) {
      setError(err.message || "Error al crear el cluster");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link href="/clusters" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-3 gap-1">
          <ArrowLeft className="h-4 w-4" />
          Volver a Clusters
        </Link>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Layers className="h-7 w-7 text-primary" />
          Crear Nuevo Cluster Docker Swarm
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura un cluster sobre la red privada VPN de AutoHost para ejecutar servicios stateless con balanceo de carga nativo.
        </p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Basic Info */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">1. Información General</CardTitle>
            <CardDescription>Nombre identificador para tu nuevo cluster.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cluster-name">Nombre del Cluster</Label>
              <Input
                id="cluster-name"
                placeholder="ej: produccion-cluster, microservicios-core"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Manager Node Selection */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              2. Seleccionar Nodo Manager (Líder del Swarm)
            </CardTitle>
            <CardDescription>
              Este nodo inicializará el Swarm y mantendrá el control plane. Debe tener la VPN de AutoHost conectada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingNodes ? (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando servidores...
              </div>
            ) : nodes.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No tienes servidores enrolados. Enrola al menos un servidor primero.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {nodes.map((node) => {
                  const isSelected = managerNodeId === node.id;
                  const vpnIP = node.ipVpn || node.ip_vpn;
                  const hasVPN = Boolean(vpnIP);
                  const nodeName = node.name || node.hostname || node.id.slice(0, 8);
                  const localIP = node.ipLocal || node.ip_local || node.ip || "N/A";

                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        if (hasVPN) {
                          setManagerNodeId(node.id);
                          // remove from workers if selected as manager
                          setWorkerNodeIds(workerNodeIds.filter((w) => w !== node.id));
                        }
                      }}
                      className={`relative flex flex-col justify-between p-4 rounded-lg border text-left transition-all ${
                        !hasVPN
                          ? "opacity-50 cursor-not-allowed border-border/40 bg-muted/20"
                          : isSelected
                          ? "border-primary bg-primary/10 shadow-sm cursor-pointer"
                          : "border-border/60 hover:border-border cursor-pointer bg-card/60"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="font-semibold text-sm truncate">{nodeName}</div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div>IP Local: {localIP}</div>
                        <div className="flex items-center gap-1.5">
                          IP VPN:
                          {hasVPN ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0">
                              {vpnIP}
                            </Badge>
                          ) : (
                            <span className="text-destructive">VPN no conectada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Worker Nodes Selection */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-5 w-5 text-emerald-500" />
              3. Seleccionar Nodos Workers (Opcional)
            </CardTitle>
            <CardDescription>
              Servidores que ejecutarán réplicas de tus contenedores. Puedes agregar más nodos después.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingNodes ? (
              <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando servidores...
              </div>
            ) : nodes.filter((n) => n.id !== managerNodeId).length === 0 ? (
              <div className="py-4 text-sm text-muted-foreground">
                No hay otros servidores disponibles para añadir como workers. El cluster se creará con el nodo Manager (puedes añadir workers más adelante).
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {nodes
                  .filter((n) => n.id !== managerNodeId)
                  .map((node) => {
                    const isSelected = workerNodeIds.includes(node.id);
                    const vpnIP = node.ipVpn || node.ip_vpn;
                    const hasVPN = Boolean(vpnIP);
                    const nodeName = node.name || node.hostname || node.id.slice(0, 8);
                    const localIP = node.ipLocal || node.ip_local || node.ip || "N/A";

                    return (
                      <div
                        key={node.id}
                        onClick={() => hasVPN && toggleWorker(node.id)}
                        className={`relative flex flex-col justify-between p-4 rounded-lg border text-left transition-all ${
                          !hasVPN
                            ? "opacity-50 cursor-not-allowed border-border/40 bg-muted/20"
                            : isSelected
                            ? "border-emerald-500 bg-emerald-500/10 shadow-sm cursor-pointer"
                            : "border-border/60 hover:border-border cursor-pointer bg-card/60"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="font-semibold text-sm truncate">{nodeName}</div>
                          {isSelected && <Check className="h-4 w-4 text-emerald-500" />}
                        </div>

                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div>IP Local: {localIP}</div>
                          <div className="flex items-center gap-1.5">
                            IP VPN:
                            {hasVPN ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] py-0">
                                {vpnIP}
                              </Badge>
                            ) : (
                              <span className="text-destructive">VPN no conectada</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/clusters">
            <Button variant="outline" type="button">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={submitting || !name || !managerNodeId} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Inicializar Cluster
          </Button>
        </div>
      </form>
    </div>
  );
}
