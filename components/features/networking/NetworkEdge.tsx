"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export interface NetworkEdgeData {
  sourceOnline?: boolean;
  targetOnline?: boolean;
  label?: string;
  edgeType?: "inbound" | "mesh";
}

export function NetworkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  animated,
}: EdgeProps) {
  const d = (data ?? {}) as NetworkEdgeData;
  const isInbound = d.edgeType === "inbound";
  const bothOnline = d.sourceOnline !== false && d.targetOnline !== false;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  // Inbound (from Public Internet): always cyan
  // Mesh: green if both online, red dashed if any offline
  const strokeColor = isInbound
    ? "#38bdf8"
    : bothOnline ? "#22c55e" : "#ef4444";
  const strokeDash = !isInbound && !bothOnline ? "6 4" : "none";
  const glowColor = isInbound
    ? "rgba(56,189,248,0.35)"
    : bothOnline ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)";

  const edgeLabel = d.label ?? (isInbound ? "Public Ingress" : bothOnline ? "Mesh" : "Offline");
  const labelBg = isInbound
    ? "rgba(56,189,248,0.12)"
    : bothOnline ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)";
  const labelColor = isInbound ? "#38bdf8" : bothOnline ? "#4ade80" : "#f87171";
  const labelBorder = isInbound
    ? "rgba(56,189,248,0.25)"
    : bothOnline ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)";

  return (
    <>
      {/* Glow layer */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: glowColor,
          strokeWidth: 6,
          strokeDasharray: strokeDash,
          filter: "blur(3px)",
          opacity: 0.45,
        }}
      />
      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: isInbound ? 2 : 1.5,
          strokeDasharray: strokeDash,
          opacity: 0.9,
        }}
      />
      {/* Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 10,
              backgroundColor: labelBg,
              color: labelColor,
              border: `1px solid ${labelBorder}`,
              backdropFilter: "blur(4px)",
              whiteSpace: "nowrap",
            }}
          >
            {edgeLabel}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
