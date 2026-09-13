"use client";

import { useClusters } from "@/lib/features/clusters/hooks/useClusters";
import { Button } from "@/components/ui/button";
import { Layers, Plus, Server, Cpu, RefreshCw, ArrowRight, ShieldCheck, Activity } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ClustersPage() {
  const { clusters, loading, error, refresh } = useClusters();

  const totalNodes = clusters.reduce((acc, c) => acc + (c.nodes?.length || 0), 0);
  const totalServices = clusters.reduce((acc, c) => acc + (c.services?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" />
            Clusters Docker Swarm
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Orquestación de microservicios stateless sobre la red privada VPN con autoescalado predictivo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refrescar
          </Button>
          <Link href="/clusters/new">
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Cluster
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clusters Activos</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clusters.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Red Overlay mesh WireGuard</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Servidores en Clusters</CardTitle>
            <Server className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNodes}</div>
            <p className="text-xs text-muted-foreground mt-1">Managers y Workers conectados</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/60 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Servicios Stateless</CardTitle>
            <Cpu className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalServices}</div>
            <p className="text-xs text-muted-foreground mt-1">Con Autoescalado activo</p>
          </CardContent>
        </Card>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Cluster List */}
      {loading && clusters.length === 0 ? (
        <div className="flex justify-center items-center py-16 text-muted-foreground">
          <RefreshCw className="h-6 w-6 animate-spin mr-2" />
          Cargando clusters...
        </div>
      ) : clusters.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-card/30">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-primary/10 p-4 mb-4">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No tienes clusters creados</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
              Agrupa 2 o más servidores de AutoHost para balancear tráfico de forma homogénea y autoescalar tus APIs automáticamente.
            </p>
            <Link href="/clusters/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Crear tu primer Cluster
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {clusters.map((item) => {
            const manager = item.nodes.find((n) => n.role === "manager");
            const workers = item.nodes.filter((n) => n.role === "worker");

            return (
              <Card
                key={item.cluster.id}
                className="group relative overflow-hidden border-border/60 bg-gradient-to-br from-card/80 via-card/40 to-background hover:border-primary/50 transition-all duration-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold flex items-center gap-2">
                        {item.cluster.name}
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs">
                          {item.cluster.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        Red Overlay: <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.cluster.overlay_network}</code>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Topología breve */}
                  <div className="rounded-md bg-muted/40 p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Manager:
                      </span>
                      <span className="font-medium truncate max-w-[140px]">
                        {manager?.node_hostname || manager?.node_id?.slice(0, 8) || "N/A"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Server className="h-3.5 w-3.5 text-muted-foreground" /> Nodos:
                      </span>
                      <span className="font-medium">
                        1 Manager + {workers.length} Worker{workers.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-blue-400" /> Servicios:
                      </span>
                      <span className="font-medium">
                        {item.services?.length || 0} servicio{item.services?.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Botón de acción */}
                  <Link href={`/clusters/${item.cluster.id}`} className="block">
                    <Button variant="secondary" className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Administrar Cluster
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
