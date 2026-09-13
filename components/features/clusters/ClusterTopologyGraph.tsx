"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Handle,
  Position,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NetworkEdge } from "@/components/features/networking/NetworkEdge";
import type { ClusterWithDetails, ClusterService } from "@/lib/types/cluster";
import type { DockerContainer } from "@/lib/features/nodes/types";
import {
  ShieldCheck,
  Server,
  Cpu,
  Layers,
  Zap,
  Activity,
  Box,
  RefreshCw,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Custom Node Components ───────────────────────────────────────────────────

export interface ClusterNodeCardData {
  hostname: string;
  role: "manager" | "worker";
  ipVpn: string;
  status: string;
  cpu?: number;
  ram?: number;
  replicasCount: number;
}

export function ClusterNodeCard({ data }: NodeProps) {
  const d = data as unknown as ClusterNodeCardData;
  const isManager = d.role === "manager";

  return (
    <div
      style={{
        background: isManager
          ? "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(30,41,59,0.92) 100%)"
          : "linear-gradient(135deg, rgba(15,23,42,0.90) 0%, rgba(20,30,48,0.88) 100%)",
        backdropFilter: "blur(14px)",
        border: isManager
          ? "1.5px solid rgba(56,189,248,0.45)"
          : "1.5px solid rgba(34,197,94,0.35)",
        borderRadius: 14,
        minWidth: 240,
        boxShadow: isManager
          ? "0 8px 32px rgba(56,189,248,0.12), 0 0 0 1px rgba(56,189,248,0.1)"
          : "0 8px 32px rgba(34,197,94,0.10)",
      }}
      className="p-3.5 select-none text-left transition-all"
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: isManager ? "#38bdf8" : "#22c55e", width: 9, height: 9 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: isManager ? "#38bdf8" : "#22c55e", width: 9, height: 9 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ background: isManager ? "#38bdf8" : "#22c55e", width: 9, height: 9 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={{ background: isManager ? "#38bdf8" : "#22c55e", width: 9, height: 9 }}
      />

      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          {isManager ? (
            <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <ShieldCheck className="h-4 w-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Server className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-semibold text-xs text-white truncate max-w-[130px]">
              {d.hostname}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {d.ipVpn || "No VPN"}
            </div>
          </div>
        </div>

        <Badge
          variant="outline"
          className={`text-[10px] uppercase font-bold py-0.5 px-2 ${
            isManager
              ? "bg-sky-500/15 text-sky-400 border-sky-500/30"
              : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
          }`}
        >
          {d.role}
        </Badge>
      </div>

      {/* Replicas count summary */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-primary" />
          Réplicas activas:
        </span>
        <span className="font-bold text-foreground bg-white/5 px-2 py-0.5 rounded border border-white/10">
          {d.replicasCount}
        </span>
      </div>
    </div>
  );
}

export interface ReplicaCardData {
  serviceName: string;
  image: string;
  slot: number;
  ports?: string;
  state: string;
  containerId?: string;
}

export function ReplicaCard({ data }: NodeProps) {
  const d = data as unknown as ReplicaCardData;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(24,24,27,0.94) 0%, rgba(39,39,42,0.90) 100%)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(168,85,247,0.4)",
        borderRadius: 12,
        minWidth: 190,
        boxShadow: "0 4px 20px rgba(168,85,247,0.12)",
      }}
      className="p-3 select-none text-left transition-all hover:border-purple-400"
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#a855f7", width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#a855f7", width: 8, height: 8 }}
      />

      <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5 min-w-0">
          <Box className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          <span className="font-semibold text-xs text-white truncate">
            {d.serviceName}.{d.slot}
          </span>
        </div>
        <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px] py-0 px-1">
          {d.state || "running"}
        </Badge>
      </div>

      <div className="mt-2 space-y-1 text-[10px] text-muted-foreground">
        <div className="truncate font-mono text-zinc-300">
          <code>{d.image}</code>
        </div>
        {d.ports && (
          <div className="text-zinc-400">
            Puerto: <span className="font-mono text-purple-300">{d.ports}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const nodeTypes = {
  clusterNode: ClusterNodeCard,
  replicaCard: ReplicaCard,
};

const edgeTypes = {
  networkEdge: NetworkEdge,
};

// ─── Main Cluster Topology Graph Component ─────────────────────────────────────

interface ClusterTopologyGraphProps {
  clusterData: ClusterWithDetails;
  onRefresh?: () => void;
}

export function ClusterTopologyGraph({ clusterData, onRefresh }: ClusterTopologyGraphProps) {
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>("all");
  const [liveAutoRefresh, setLiveAutoRefresh] = useState(true);
  const [nodeContainersMap, setNodeContainersMap] = useState<Record<string, DockerContainer[]>>({});

  // Stabilize node IDs list to avoid reconnecting SSE on every render
  const nodeIdsStr = useMemo(() => {
    return (clusterData?.nodes || [])
      .map((n) => n.node_id || n.id)
      .filter(Boolean)
      .sort()
      .join(",");
  }, [clusterData?.nodes]);

  // Real-time SSE streaming for containers of all cluster nodes (opened once per node set)
  useEffect(() => {
    if (!nodeIdsStr) return;
    const nodeIds = nodeIdsStr.split(",").filter(Boolean);
    if (nodeIds.length === 0) return;

    const eventSources: EventSource[] = [];

    nodeIds.forEach((targetId) => {
      try {
        const es = new EventSource(`/api/nodes/${targetId}/containers/stream`, {
          withCredentials: true,
        });

        es.addEventListener("containers", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data);
            if (Array.isArray(data.containers)) {
              setNodeContainersMap((prev) => ({
                ...prev,
                [targetId]: data.containers,
              }));
            }
          } catch {
            // Ignore parse errors
          }
        });

        eventSources.push(es);
      } catch (err) {
        console.error(`Failed to subscribe to containers for node ${targetId}:`, err);
      }
    });

    return () => {
      eventSources.forEach((es) => es.close());
    };
  }, [nodeIdsStr]);

  // Periodic metadata refresh every 15 seconds if live is enabled
  useEffect(() => {
    if (!liveAutoRefresh || !onRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [liveAutoRefresh, onRefresh]);

  const { nodes, edges } = useMemo(() => {
    const rawNodes = clusterData?.nodes || [];
    const rawServices = clusterData?.services || [];

    if (rawNodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    // Filter services if a specific one is selected
    const activeServices =
      selectedServiceFilter === "all"
        ? rawServices
        : rawServices.filter((s) => s.name === selectedServiceFilter);

    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];

    const managerNode = rawNodes.find((n) => n.role === "manager") || rawNodes[0];
    const managerKey = managerNode?.node_id || managerNode?.id || "manager";
    const workerNodes = rawNodes.filter((n) => (n.node_id || n.id) !== managerKey);

    // Helper to find real Swarm replica containers running on a specific node
    const getReplicasForNode = (nodeId: string) => {
      const containers = nodeContainersMap[nodeId] || [];
      const replicas: Array<{
        serviceName: string;
        image: string;
        slot: number;
        ports?: string;
        state: string;
        containerId?: string;
      }> = [];

      activeServices.forEach((svc) => {
        containers.forEach((c) => {
          const cleanName = (c.name || "").replace(/^\//, "");
          // Matches real Docker Swarm task format: <service_name>.<slot>.<task_id>
          if (cleanName.startsWith(svc.name + ".")) {
            const remainder = cleanName.slice(svc.name.length + 1);
            const slotPart = remainder.split(".")[0];
            const slotNum = parseInt(slotPart, 10) || 1;
            replicas.push({
              serviceName: svc.name,
              image: c.image || svc.image,
              slot: slotNum,
              ports: svc.ports,
              state: c.state || "running",
              containerId: c.id,
            });
          }
        });
      });

      return replicas;
    };

    // 1. Position Manager Node
    if (managerNode) {
      const managerReplicas = getReplicasForNode(managerKey);

      graphNodes.push({
        id: `node-${managerKey}`,
        type: "clusterNode",
        position: { x: 200, y: 100 },
        data: {
          hostname: managerNode.node_hostname || "manager",
          role: "manager",
          ipVpn: managerNode.node_ip_vpn || "",
          status: managerNode.status || "active",
          replicasCount: managerReplicas.length,
        },
      });

      // Spawn replica nodes under manager
      managerReplicas.forEach((rep, repIndex) => {
        const replicaNodeId = `rep-${rep.serviceName}-${managerKey}-${rep.slot}-${rep.containerId?.slice(0, 6) || repIndex}`;
        graphNodes.push({
          id: replicaNodeId,
          type: "replicaCard",
          position: { x: 120 + repIndex * 210, y: 300 },
          data: {
            serviceName: rep.serviceName,
            image: rep.image,
            slot: rep.slot,
            ports: rep.ports,
            state: rep.state,
            containerId: rep.containerId,
          },
        });

        // Edge from manager node to replica
        graphEdges.push({
          id: `edge-${managerKey}-${replicaNodeId}`,
          source: `node-${managerKey}`,
          target: replicaNodeId,
          type: "networkEdge",
          animated: true,
          data: {
            edgeType: "mesh",
            label: "Task Replica",
            sourceOnline: true,
            targetOnline: rep.state === "running",
          },
        });
      });
    }

    // 2. Position Worker Nodes
    workerNodes.forEach((worker, wIdx) => {
      const workerKey = worker.node_id || worker.id || `worker-${wIdx + 1}`;
      const workerReplicas = getReplicasForNode(workerKey);
      const workerX = 620 + wIdx * 340;
      const workerY = 100;

      graphNodes.push({
        id: `node-${workerKey}`,
        type: "clusterNode",
        position: { x: workerX, y: workerY },
        data: {
          hostname: worker.node_hostname || `worker-${wIdx + 1}`,
          role: "worker",
          ipVpn: worker.node_ip_vpn || "",
          status: worker.status || "active",
          replicasCount: workerReplicas.length,
        },
      });

      // Animated Ingress Mesh Edge between Manager and Worker
      if (managerNode) {
        graphEdges.push({
          id: `mesh-${managerKey}-${workerKey}`,
          source: `node-${managerKey}`,
          target: `node-${workerKey}`,
          sourceHandle: "right",
          targetHandle: "left",
          type: "networkEdge",
          animated: true,
          data: {
            edgeType: "inbound",
            label: "WireGuard Overlay (1200 MTU)",
            sourceOnline: true,
            targetOnline: worker.status === "active",
          },
        });
      }

      // Spawn replica nodes under worker
      workerReplicas.forEach((rep, repIndex) => {
        const replicaNodeId = `rep-${rep.serviceName}-${workerKey}-${rep.slot}-${rep.containerId?.slice(0, 6) || repIndex}`;
        graphNodes.push({
          id: replicaNodeId,
          type: "replicaCard",
          position: { x: workerX - 40 + repIndex * 210, y: 300 },
          data: {
            serviceName: rep.serviceName,
            image: rep.image,
            slot: rep.slot,
            ports: rep.ports,
            state: rep.state,
            containerId: rep.containerId,
          },
        });

        // Edge from worker node to replica
        graphEdges.push({
          id: `edge-${workerKey}-${replicaNodeId}`,
          source: `node-${workerKey}`,
          target: replicaNodeId,
          type: "networkEdge",
          animated: true,
          data: {
            edgeType: "mesh",
            label: "Task Replica",
            sourceOnline: true,
            targetOnline: rep.state === "running",
          },
        });
      });
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [clusterData, selectedServiceFilter, nodeContainersMap]);

  const services = clusterData?.services || [];

  return (
    <div className="space-y-3">
      {/* Top Toolbar: Filter by Service & Auto-Refresh Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/60 p-3 rounded-lg border border-border/60 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Filtrar por Servicio:</span>
          <select
            value={selectedServiceFilter}
            onChange={(e) => setSelectedServiceFilter(e.target.value)}
            className="h-7 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">⚡ Todos los Servicios ({services.length})</option>
            {services.map((svc) => (
              <option key={svc.id} value={svc.name}>
                📦 {svc.name} ({svc.replicas} réplicas)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLiveAutoRefresh(!liveAutoRefresh)}
            className={`h-7 px-2 text-xs gap-1.5 ${
              liveAutoRefresh ? "text-emerald-400 bg-emerald-500/10" : "text-muted-foreground"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${liveAutoRefresh ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"}`} />
            {liveAutoRefresh ? "En Vivo (15s)" : "En Vivo Pausado"}
          </Button>

          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </Button>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div
        className="w-full rounded-xl overflow-hidden border border-border/80 relative"
        style={{
          height: "calc(100vh - 280px)",
          minHeight: "650px",
          background: "radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)",
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={1.6}
          defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="rgba(255,255,255,0.08)" />
          <Controls className="!bg-card/90 !border-border !text-foreground rounded-lg overflow-hidden" />
          <MiniMap
            nodeColor={(n) => (n.type === "clusterNode" ? "#38bdf8" : "#a855f7")}
            maskColor="rgba(0,0,0,0.6)"
            className="!bg-card/80 !border-border rounded-lg"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
