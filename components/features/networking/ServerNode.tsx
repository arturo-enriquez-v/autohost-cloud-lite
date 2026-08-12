"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Cpu, MemoryStick, Wifi, WifiOff, AlertTriangle, Globe, Lock } from "lucide-react";

export interface PortEntry {
  port: number;
  protocol?: string;
  bind_addr: string;
  service?: string;
}

export interface ServerNodeData {
  label: string;
  hostname: string;
  status: "online" | "offline";
  ipVpn?: string;
  ipLocal?: string;
  cpu: number;
  ram: number;
  // network stats (populated after agent starts reporting)
  rxDropped?: number;
  txDropped?: number;
  ports?: PortEntry[];
  // for drawer click
  nodeId?: string;
}

function MetricBar({ value, color }: { value: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}

function metricColor(v: number): string {
  if (v >= 85) return "#ef4444";
  if (v >= 65) return "#f59e0b";
  return "#22c55e";
}

function isPublicBind(addr: string): boolean {
  return addr === "0.0.0.0" || addr === "::" || addr === "*";
}

export function ServerNode({ data }: NodeProps) {
  const d = data as unknown as ServerNodeData;
  const isOnline = d.status === "online";

  const publicPorts = (d.ports ?? []).filter((p) => isPublicBind(p.bind_addr));
  const hasDrops = (d.rxDropped ?? 0) + (d.txDropped ?? 0) > 0;

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(30,41,59,0.88) 100%)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${isOnline ? "rgba(112,174,255,0.25)" : "rgba(239,68,68,0.3)"}`,
        borderRadius: 14,
        minWidth: 230,
        boxShadow: isOnline
          ? "0 4px 24px rgba(112,174,255,0.08), 0 0 0 1px rgba(112,174,255,0.06)"
          : "0 4px 24px rgba(239,68,68,0.08)",
      }}
      className="select-none"
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: "#70AEFF", border: "2px solid #0f172a", width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: "#70AEFF", border: "2px solid #0f172a", width: 8, height: 8 }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ background: "#70AEFF", border: "2px solid #0f172a", width: 8, height: 8 }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right"
        style={{ background: "#70AEFF", border: "2px solid #0f172a", width: 8, height: 8 }}
      />

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 12px 8px" }}>
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              style={{
                width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                backgroundColor: isOnline ? "#22c55e" : "#ef4444",
                boxShadow: isOnline ? "0 0 6px rgba(34,197,94,0.8)" : "0 0 6px rgba(239,68,68,0.8)",
              }}
            />
            <span
              style={{
                fontSize: 12, fontWeight: 600, color: "#e2e8f0",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {d.label || d.hostname}
            </span>
          </div>
          <span
            style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              backgroundColor: isOnline ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
              color: isOnline ? "#4ade80" : "#f87171",
              border: `1px solid ${isOnline ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              whiteSpace: "nowrap", flexShrink: 0,
            }}
          >
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Mesh IP */}
        {d.ipVpn ? (
          <div className="flex items-center gap-1.5 mt-1.5" style={{ color: "#70AEFF", fontSize: 10 }}>
            <Wifi size={10} />
            <span style={{ fontFamily: "monospace" }}>{d.ipVpn}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 mt-1.5" style={{ color: "rgba(148,163,184,0.5)", fontSize: 10 }}>
            <WifiOff size={10} />
            <span>Not in mesh</span>
          </div>
        )}
      </div>

      {/* Port exposure badges */}
      <div style={{ padding: "7px 12px 0", display: "flex", gap: 5, flexWrap: "wrap" }}>
        {publicPorts.length > 0 ? (
          <span
            style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171",
              border: "1px solid rgba(239,68,68,0.25)",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <Globe size={9} />
            {publicPorts.length} Public Port{publicPorts.length > 1 ? "s" : ""}
          </span>
        ) : d.ports && d.ports.length > 0 ? (
          <span
            style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              backgroundColor: "rgba(34,197,94,0.12)", color: "#4ade80",
              border: "1px solid rgba(34,197,94,0.25)",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <Lock size={9} />
            Mesh Isolated
          </span>
        ) : null}

        {hasDrops && (
          <span
            style={{
              fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
              backgroundColor: "rgba(251,191,36,0.12)", color: "#fbbf24",
              border: "1px solid rgba(251,191,36,0.25)",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <AlertTriangle size={9} />
            Drop Rate &gt; 0%
          </span>
        )}
      </div>

      {/* Metrics */}
      <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div>
          <div className="flex items-center justify-between mb-1" style={{ fontSize: 10, color: "rgba(148,163,184,0.8)" }}>
            <div className="flex items-center gap-1"><Cpu size={9} /><span>CPU</span></div>
            <span style={{ color: metricColor(d.cpu), fontWeight: 600 }}>{d.cpu.toFixed(1)}%</span>
          </div>
          <MetricBar value={d.cpu} color={metricColor(d.cpu)} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1" style={{ fontSize: 10, color: "rgba(148,163,184,0.8)" }}>
            <div className="flex items-center gap-1"><MemoryStick size={9} /><span>RAM</span></div>
            <span style={{ color: metricColor(d.ram), fontWeight: 600 }}>{d.ram.toFixed(1)}%</span>
          </div>
          <MetricBar value={d.ram} color={metricColor(d.ram)} />
        </div>
        {(d.cpu >= 85 || d.ram >= 85) && (
          <div
            style={{
              fontSize: 10, color: "#fbbf24", backgroundColor: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.15)", borderRadius: 6, padding: "3px 7px",
            }}
            className="flex items-center gap-1.5 mt-0.5"
          >
            <AlertTriangle size={9} />
            <span>High Load</span>
          </div>
        )}
      </div>
    </div>
  );
}
