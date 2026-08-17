"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
  type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useNodesContext } from "@/lib/context/nodes-context";
import { useProjectContext } from "@/lib/context/project-context";
import type { Node as AutohostNode } from "@/lib/features/nodes/types";
import { fetchNodeNetworkStats } from "@/lib/features/nodes/api";

import { ServerNode, type ServerNodeData, type PortEntry } from "@/components/features/networking/ServerNode";
import { PublicInternetNode } from "@/components/features/networking/PublicInternetNode";
import { NetworkEdge } from "@/components/features/networking/NetworkEdge";
import { NodeNetworkDrawer } from "@/components/features/networking/NodeNetworkDrawer";
import { Network, Loader2, Circle, RotateCcw } from "lucide-react";

// ─── Custom node / edge type registrations ────────────────────────────────────
const nodeTypes = {
  serverNode: ServerNode,
  publicInternetNode: PublicInternetNode,
};
const edgeTypes = { networkEdge: NetworkEdge };

const PUBLIC_INTERNET_ID = "public-internet";
const POSITIONS_KEY = "autohost_topology_node_positions_v1";

function loadSavedPositions(): Record<string, { x: number; y: number }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePosition(id: string, pos: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  try {
    const current = loadSavedPositions();
    current[id] = pos;
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(current));
  } catch {}
}

// ─── Layout: circle around a center point ─────────────────────────────────────
function circleLayout(count: number, index: number): { x: number; y: number } {
  if (count === 0) return { x: 400, y: 300 };
  if (count === 1) return { x: 400, y: 300 };
  const radius = Math.max(200, count * 75);
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  return {
    x: 500 + radius * Math.cos(angle),
    y: 350 + radius * Math.sin(angle),
  };
}

// ─── Build all edges (inbound + mesh) ─────────────────────────────────────────
function buildAllEdges(
  serverNodes: Node[],
  publicNodeIds: Set<string>,
  networkStatsByNode: Record<string, { ports: PortEntry[]; rxDropped: number; txDropped: number; peers: import("@/lib/features/nodes/api").VPNPeer[] }>,
): Edge[] {
  const edges: Edge[] = [];

  // Inbound: Public Internet → nodes with public ports
  for (const n of serverNodes) {
    if (publicNodeIds.has(n.id)) {
      edges.push({
        id: `inbound-${n.id}`,
        source: PUBLIC_INTERNET_ID,
        target: n.id,
        type: "networkEdge",
        animated: true,
        data: {
          edgeType: "inbound",
          label: "Public Ingress",
          sourceOnline: true,
          targetOnline: (n.data as unknown as ServerNodeData).status === "online",
        },
      });
    }
  }

  // Mesh: check real active VPN peers reported by agents
  for (let i = 0; i < serverNodes.length; i++) {
    for (let j = i + 1; j < serverNodes.length; j++) {
      const a = serverNodes[i];
      const b = serverNodes[j];
      const aData = a.data as unknown as ServerNodeData;
      const bData = b.data as unknown as ServerNodeData;

      const aIpVpn = aData.ipVpn?.trim();
      const bIpVpn = bData.ipVpn?.trim();

      const aStats = networkStatsByNode[a.id];
      const bStats = networkStatsByNode[b.id];

      // Check if A sees B as a peer, or B sees A as a peer
      const aPeerB = aStats?.peers?.find((p) => p.ip === bIpVpn || p.hostname === bData.hostname);
      const bPeerA = bStats?.peers?.find((p) => p.ip === aIpVpn || p.hostname === aData.hostname);

      const realPeerFound = Boolean(aPeerB || bPeerA);
      const bothHaveIp = Boolean(aIpVpn && bIpVpn);

      // Connect if real peer found OR (as fallback) both have valid mesh IP
      if (realPeerFound || bothHaveIp) {
        const peerObj = aPeerB || bPeerA;
        const bothNodesOnline = aData.status === "online" && bData.status === "online";
        const peerActive = peerObj ? (peerObj.online || peerObj.relay === "direct") : true;
        const tunnelOnline = bothNodesOnline && peerActive;
        const latencyLabel = peerObj?.latency_ms ? `${peerObj.latency_ms.toFixed(0)}ms` : peerObj?.relay ? peerObj.relay : "Mesh";

        edges.push({
          id: `mesh-${a.id}-${b.id}`,
          source: a.id,
          target: b.id,
          type: "networkEdge",
          animated: tunnelOnline,
          data: {
            edgeType: "mesh",
            label: latencyLabel,
            sourceOnline: tunnelOnline,
            targetOnline: tunnelOnline,
          },
        });
      }
    }
  }

  return edges;
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function TopologyPage() {
  const { allNodes, isLoading } = useNodesContext();
  const { selectedProject } = useProjectContext();
  const [selectedNode, setSelectedNode] = useState<AutohostNode | null>(null);

  // Network stats map: nodeId → ports, drops, peers
  const [networkStatsByNode, setNetworkStatsByNode] = useState<
    Record<string, { ports: PortEntry[]; rxDropped: number; txDropped: number; peers: import("@/lib/features/nodes/api").VPNPeer[] }>
  >({});

  // Filter by project
  const visibleNodes = useMemo(() => {
    if (!selectedProject) return allNodes;
    return allNodes.filter((n) => n.projectId === selectedProject.id);
  }, [allNodes, selectedProject]);

  // Fetch network stats for all visible nodes
  useEffect(() => {
    if (visibleNodes.length === 0) return;
    const abort = new AbortController();
    const map: Record<string, { ports: PortEntry[]; rxDropped: number; txDropped: number; peers: import("@/lib/features/nodes/api").VPNPeer[] }> = {};

    Promise.all(
      visibleNodes.map(async (n) => {
        try {
          const s = await fetchNodeNetworkStats(n.id);
          if (s) {
            map[n.id] = {
              ports: (s.ports ?? []).map((p) => ({
                port: p.port,
                protocol: p.protocol,
                bind_addr: p.bind_addr,
              })),
              rxDropped: s.rx_dropped ?? 0,
              txDropped: s.tx_dropped ?? 0,
              peers: s.peers ?? [],
            };
          }
        } catch {/* silent */}
      })
    ).then(() => {
      if (!abort.signal.aborted) setNetworkStatsByNode({ ...map });
    });

    return () => abort.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleNodes.length, selectedProject?.id]);

  // Nodes that have public ports → will receive inbound edges
  const publicNodeIds = useMemo<Set<string>>(() => {
    const set = new Set<string>();
    for (const n of visibleNodes) {
      const ns = networkStatsByNode[n.id];
      if (ns && ns.ports.some((p) => p.bind_addr === "0.0.0.0" || p.bind_addr === "::")) {
        set.add(n.id);
      }
    }
    return set;
  }, [visibleNodes, networkStatsByNode]);

  // Build ReactFlow server nodes
  const serverFlowNodes: Node[] = useMemo(() => {
    const saved = loadSavedPositions();
    return visibleNodes.map((n, i) => {
      const ns = networkStatsByNode[n.id];
      const defaultPos = circleLayout(visibleNodes.length, i);
      const initialPos = saved[n.id] || defaultPos;

      return {
        id: n.id,
        type: "serverNode",
        position: initialPos,
        data: {
          label: n.hostname ?? n.name,
          hostname: n.hostname ?? n.name,
          status: n.status,
          ipVpn: n.ipVpn,
          ipLocal: n.ipLocal,
          cpu: n.cpu ?? 0,
          ram: n.ram ?? 0,
          ports: ns?.ports,
          rxDropped: ns?.rxDropped,
          txDropped: ns?.txDropped,
          nodeId: n.id,
        } satisfies ServerNodeData,
      };
    });
  }, [visibleNodes, networkStatsByNode]);

  // Public Internet synthetic node (fixed at top)
  const publicInternetNode: Node = useMemo(() => {
    const saved = loadSavedPositions();
    return {
      id: PUBLIC_INTERNET_ID,
      type: "publicInternetNode",
      position: saved[PUBLIC_INTERNET_ID] || { x: 400, y: 30 },
      data: { label: "Public Internet" },
      draggable: true,
      selectable: false,
    };
  }, []);

  const allFlowNodes = useMemo(
    () => [publicInternetNode, ...serverFlowNodes],
    [publicInternetNode, serverFlowNodes]
  );

  const allFlowEdges = useMemo(
    () => buildAllEdges(serverFlowNodes, publicNodeIds, networkStatsByNode),
    [serverFlowNodes, publicNodeIds, networkStatsByNode]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(allFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(allFlowEdges);

  // Sync ReactFlow nodes without resetting dragged positions
  useEffect(() => {
    setNodes((prevNodes) => {
      const prevMap = new Map(prevNodes.map((pn) => [pn.id, pn]));

      return allFlowNodes.map((newNode) => {
        const existing = prevMap.get(newNode.id);
        if (existing) {
          return {
            ...newNode,
            // Preserve the active position in ReactFlow state (where the user dragged it)
            position: existing.position,
          };
        }
        return newNode;
      });
    });
  }, [allFlowNodes, setNodes]);

  useEffect(() => {
    setEdges(allFlowEdges);
  }, [allFlowEdges, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick: NodeMouseHandler = useCallback(
    (_evt, rfNode) => {
      if (rfNode.id === PUBLIC_INTERNET_ID) return;
      const found = allNodes.find((n) => n.id === rfNode.id);
      if (found) setSelectedNode(found);
    },
    [allNodes]
  );

  const onNodeDragStop = useCallback((_evt: unknown, node: Node) => {
    savePosition(node.id, node.position);
  }, []);

  const handleResetLayout = useCallback(() => {
    try {
      localStorage.removeItem(POSITIONS_KEY);
    } catch {}

    setNodes((prevNodes) =>
      prevNodes.map((n, i) => {
        if (n.id === PUBLIC_INTERNET_ID) return { ...n, position: { x: 400, y: 30 } };
        const idx = visibleNodes.findIndex((vn) => vn.id === n.id);
        const resetPos = circleLayout(visibleNodes.length, idx >= 0 ? idx : i);
        return {
          ...n,
          position: resetPos,
        };
      })
    );
  }, [visibleNodes, setNodes]);

  // ─── Stats bar ──────────────────────────────────────────────────────────────
  const onlineCount = visibleNodes.filter((n) => n.status === "online").length;
  const offlineCount = visibleNodes.length - onlineCount;

  // ─── States ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#70AEFF]" />
      </div>
    );
  }

  if (visibleNodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <div
          style={{
            width: 56, height: 56, borderRadius: 14,
            background: "rgba(112,174,255,0.08)",
            border: "1px solid rgba(112,174,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Network className="h-7 w-7 text-[#70AEFF]" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {selectedProject ? `No nodes in project "${selectedProject.name}"` : "No nodes available"}
        </p>
        <p className="text-xs text-muted-foreground/60">
          Connect a node and assign it to a project to see the topology.
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", minHeight: "calc(100vh - 140px)", position: "relative" }}>
      {/* Status bar */}
      <div
        style={{
          position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
          zIndex: 10, display: "flex", gap: 8, alignItems: "center",
          background: "rgba(15,23,42,0.85)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24,
          padding: "5px 14px", pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#4ade80" }}>
          <Circle size={7} fill="#22c55e" stroke="none" />
          {onlineCount} online
        </div>
        {offlineCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#f87171" }}>
            <Circle size={7} fill="#ef4444" stroke="none" />
            {offlineCount} offline
          </div>
        )}
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.5)", paddingLeft: 4, paddingRight: 4 }}>
          {selectedProject ? selectedProject.name : "All nodes"}
        </div>
        <button
          type="button"
          onClick={handleResetLayout}
          style={{
            pointerEvents: "auto",
            cursor: "pointer",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12,
            padding: "2px 8px",
            fontSize: 10,
            color: "#94a3b8",
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.15s ease",
          }}
          className="hover:text-white hover:bg-white/15"
          title="Reset node positions to default layout"
        >
          <RotateCcw size={10} />
          Reset Layout
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.15}
        maxZoom={2.5}
        style={{ background: "#0d1117" }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={28}
          size={1}
          color="rgba(255,255,255,0.05)"
        />
        <Controls
          style={{
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
          }}
        />
        <MiniMap
          style={{
            background: "rgba(15,23,42,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
          }}
          nodeColor={(n) => {
            if (n.id === PUBLIC_INTERNET_ID) return "#38bdf8";
            const d = n.data as unknown as ServerNodeData;
            return d.status === "online" ? "#22c55e" : "#ef4444";
          }}
          maskColor="rgba(0,0,0,0.45)"
        />
      </ReactFlow>

      {/* Node detail drawer */}
      <NodeNetworkDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
