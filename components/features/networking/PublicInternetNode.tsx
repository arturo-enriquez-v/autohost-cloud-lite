"use client";

import { Handle, Position } from "@xyflow/react";
import { Globe } from "lucide-react";

export function PublicInternetNode() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(14,165,233,0.15) 0%, rgba(6,182,212,0.1) 100%)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(56,189,248,0.3)",
        borderRadius: 16,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow:
          "0 0 0 1px rgba(56,189,248,0.08), 0 4px 24px rgba(56,189,248,0.15)",
        minWidth: 220,
        justifyContent: "center",
      }}
    >
      {/* No top handle — internet is the source */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "#38bdf8",
          border: "2px solid #0f172a",
          width: 10,
          height: 10,
        }}
      />

      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "rgba(56,189,248,0.15)",
          border: "1px solid rgba(56,189,248,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Globe size={16} color="#38bdf8" />
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "#38bdf8",
            letterSpacing: "0.02em",
          }}
        >
          Public Internet
        </div>
        <div style={{ fontSize: 10, color: "rgba(56,189,248,0.6)" }}>
          Ingress Gateway
        </div>
      </div>
    </div>
  );
}
