"use client";

import { useEffect, useState } from "react";
import {
  X, Globe, Lock, Cpu, MemoryStick, ArrowDownToLine, ArrowUpFromLine,
  AlertTriangle, Box, Network, Loader2,
} from "lucide-react";
import type { Node, DockerContainer } from "@/lib/features/nodes/types";
import type { NodeNetworkStats } from "@/lib/features/nodes/api";
import { fetchNodeNetworkStats, fetchContainers } from "@/lib/features/nodes/api";

interface NodeNetworkDrawerProps {
  node: Node | null;
  onClose: () => void;
}

type DrawerTab = "ports" | "containers" | "health";

function formatBytes(b: number): string {
  if (!b) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let val = b;
  while (val >= 1024 && i < units.length - 1) { val /= 1024; i++; }
  return `${val.toFixed(1)} ${units[i]}`;
}

function isPublicBind(addr: string) {
  return addr === "0.0.0.0" || addr === "::" || addr === "*";
}

function isMeshBind(addr: string) {
  return addr.startsWith("100.64.");
}

function isLocalBind(addr: string) {
  return addr === "127.0.0.1" || addr === "::1";
}

function PortRow({ port, proto, bind, service }: { port: number; proto: string; bind: string; service?: string }) {
  const isPublic = isPublicBind(bind);
  const isMesh = isMeshBind(bind);
  const isLocal = isLocalBind(bind);

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2">
        {isPublic && <Globe size={11} className="text-red-400 shrink-0" />}
        {isMesh && <Lock size={11} className="text-green-400 shrink-0" />}
        {isLocal && <Cpu size={11} className="text-slate-400 shrink-0" />}
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#e2e8f0" }}>
          :{port}/{proto}
        </span>
        {service && (
          <span style={{ fontSize: 10, color: "rgba(148,163,184,0.6)" }}>{service}</span>
        )}
      </div>
      <span
        style={{
          fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 8,
          backgroundColor: isPublic ? "rgba(239,68,68,0.12)" : isMesh ? "rgba(34,197,94,0.12)" : "rgba(100,116,139,0.2)",
          color: isPublic ? "#f87171" : isMesh ? "#4ade80" : "#94a3b8",
          border: `1px solid ${isPublic ? "rgba(239,68,68,0.25)" : isMesh ? "rgba(34,197,94,0.25)" : "rgba(100,116,139,0.2)"}`,
        }}
      >
        {isPublic ? "Public" : isMesh ? "Mesh" : "Localhost"}
      </span>
    </div>
  );
}

export function NodeNetworkDrawer({ node, onClose }: NodeNetworkDrawerProps) {
  const [tab, setTab] = useState<DrawerTab>("ports");
  const [stats, setStats] = useState<NodeNetworkStats | null>(null);
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingContainers, setLoadingContainers] = useState(false);

  useEffect(() => {
    if (!node) return;
    setStats(null);
    setContainers([]);
    setLoading(true);
    setLoadingContainers(true);

    fetchNodeNetworkStats(node.id)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));

    fetchContainers(node.id)
      .then((res) => setContainers(res ?? []))
      .catch(() => setContainers([]))
      .finally(() => setLoadingContainers(false));
  }, [node?.id]);

  if (!node) return null;

  const ports = stats?.ports ?? [];
  const publicPorts = ports.filter((p) => isPublicBind(p.bind_addr));
  const meshPorts = ports.filter((p) => isMeshBind(p.bind_addr));
  const localPorts = ports.filter((p) => isLocalBind(p.bind_addr));
  const otherPorts = ports.filter((p) => !isPublicBind(p.bind_addr) && !isMeshBind(p.bind_addr) && !isLocalBind(p.bind_addr));

  const totalDrops = (stats?.rx_dropped ?? 0) + (stats?.tx_dropped ?? 0);
  const totalErrors = (stats?.rx_errors ?? 0) + (stats?.tx_errors ?? 0);
  const dropRate = stats && (stats.rx_bytes + stats.tx_bytes) > 0
    ? ((totalDrops / Math.max(1, (stats.rx_bytes + stats.tx_bytes) / 1500)) * 100).toFixed(2)
    : "0.00";

  const tabStyle = (active: boolean) => ({
    fontSize: 11, fontWeight: 600, padding: "5px 12px", borderRadius: 8, cursor: "pointer",
    backgroundColor: active ? "rgba(112,174,255,0.15)" : "transparent",
    color: active ? "#70AEFF" : "rgba(148,163,184,0.7)",
    border: active ? "1px solid rgba(112,174,255,0.2)" : "1px solid transparent",
    transition: "all 0.15s",
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-20"
        style={{ background: "transparent" }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-30 flex flex-col"
        style={{
          width: 380,
          background: "linear-gradient(180deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.96) 100%)",
          backdropFilter: "blur(16px)",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
          animation: "slideInRight 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 16px 14px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", marginBottom: 3 }}>
                {node.hostname ?? node.name}
              </h2>
              <div className="flex items-center gap-2">
                <div
                  style={{
                    width: 7, height: 7, borderRadius: "50%",
                    backgroundColor: node.status === "online" ? "#22c55e" : "#ef4444",
                    boxShadow: node.status === "online" ? "0 0 5px rgba(34,197,94,0.7)" : "0 0 5px rgba(239,68,68,0.7)",
                  }}
                />
                <span style={{ fontSize: 11, color: node.status === "online" ? "#4ade80" : "#f87171" }}>
                  {node.status === "online" ? "Online" : "Offline"}
                </span>
                {node.ipVpn && (
                  <span style={{ fontSize: 10, color: "#70AEFF", fontFamily: "monospace" }}>
                    {node.ipVpn}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                padding: 6, borderRadius: 8, color: "rgba(148,163,184,0.6)",
                background: "transparent", border: "none", cursor: "pointer",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = "#70AEFF"}
              onMouseLeave={(e) => e.currentTarget.style.color = "rgba(148,163,184,0.6)"}
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 mt-3">
            <button style={tabStyle(tab === "ports")} onClick={() => setTab("ports")}>
              Ports
            </button>
            <button style={tabStyle(tab === "containers")} onClick={() => setTab("containers")}>
              Containers
            </button>
            <button style={tabStyle(tab === "health")} onClick={() => setTab("health")}>
              Network Health
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: "14px 16px" }}>
          {loading ? (
            <div className="flex justify-center pt-8">
              <Loader2 size={20} className="animate-spin text-[#70AEFF]" />
            </div>
          ) : (
            <>
              {/* ── Ports Tab ────────────────────────────────── */}
              {tab === "ports" && (
                <div>
                  {ports.length === 0 ? (
                    <div className="text-center py-8" style={{ color: "rgba(148,163,184,0.5)", fontSize: 12 }}>
                      <Network size={28} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                      No port data yet.<br />
                      <span style={{ fontSize: 10 }}>Agent will report on the next 30s cycle.</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {publicPorts.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#f87171", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <Globe size={10} /> Public (0.0.0.0)
                          </div>
                          {publicPorts.map((p) => (
                            <PortRow key={`${p.port}-${p.protocol}`} port={p.port} proto={p.protocol} bind={p.bind_addr} />
                          ))}
                        </div>
                      )}
                      {meshPorts.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <Lock size={10} /> Mesh VPN (100.64.x.x)
                          </div>
                          {meshPorts.map((p) => (
                            <PortRow key={`${p.port}-${p.protocol}`} port={p.port} proto={p.protocol} bind={p.bind_addr} />
                          ))}
                        </div>
                      )}
                      {localPorts.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                            <Cpu size={10} /> Localhost (127.0.0.1)
                          </div>
                          {localPorts.map((p) => (
                            <PortRow key={`${p.port}-${p.protocol}`} port={p.port} proto={p.protocol} bind={p.bind_addr} />
                          ))}
                        </div>
                      )}
                      {otherPorts.length > 0 && (
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Other</div>
                          {otherPorts.map((p) => (
                            <PortRow key={`${p.port}-${p.protocol}`} port={p.port} proto={p.protocol} bind={p.bind_addr} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Containers Tab ──────────────────────────── */}
              {tab === "containers" && (
                <div>
                  {loadingContainers ? (
                    <div className="flex justify-center pt-8">
                      <Loader2 size={20} className="animate-spin text-[#70AEFF]" />
                    </div>
                  ) : containers.length === 0 ? (
                    <div className="text-center py-8" style={{ color: "rgba(148,163,184,0.5)", fontSize: 12 }}>
                      <Box size={28} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                      No containers running.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {containers.map((c) => (
                        <div
                          key={c.id || c.name}
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 10,
                            padding: "10px 12px",
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{c.name}</span>
                            <span
                              style={{
                                fontSize: 10, fontWeight: 600, padding: "1px 7px", borderRadius: 8,
                                backgroundColor: (c.state === "running" || c.status?.includes("Up")) ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                                color: (c.state === "running" || c.status?.includes("Up")) ? "#4ade80" : "#f87171",
                                border: `1px solid ${(c.state === "running" || c.status?.includes("Up")) ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                              }}
                            >
                              {c.state || c.status}
                            </span>
                          </div>
                          {(c.cpu || c.mem) && (
                            <div className="flex items-center gap-3 mt-1.5" style={{ fontSize: 10, color: "rgba(148,163,184,0.7)" }}>
                              {c.cpu && <span>CPU: <strong style={{ color: "#e2e8f0" }}>{c.cpu}</strong></span>}
                              {c.mem && <span>RAM: <strong style={{ color: "#e2e8f0" }}>{c.mem}</strong></span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Network Health Tab ──────────────────────── */}
              {tab === "health" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {!stats ? (
                    <div className="text-center py-8" style={{ color: "rgba(148,163,184,0.5)", fontSize: 12 }}>
                      <Network size={28} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                      No network health data yet.<br />
                      <span style={{ fontSize: 10 }}>Agent reports every 30 seconds.</span>
                    </div>
                  ) : (
                    <>
                      {/* Traffic */}
                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.7)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>Traffic</div>
                        <div style={{ display: "flex", gap: 12 }}>
                          <div style={{ flex: 1, textAlign: "center" }}>
                            <ArrowDownToLine size={16} color="#38bdf8" style={{ margin: "0 auto 4px" }} />
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#38bdf8" }}>{formatBytes(stats.rx_bytes)}</div>
                            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.5)" }}>Received</div>
                          </div>
                          <div style={{ flex: 1, textAlign: "center" }}>
                            <ArrowUpFromLine size={16} color="#70AEFF" style={{ margin: "0 auto 4px" }} />
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#70AEFF" }}>{formatBytes(stats.tx_bytes)}</div>
                            <div style={{ fontSize: 10, color: "rgba(148,163,184,0.5)" }}>Transmitted</div>
                          </div>
                        </div>
                      </div>

                      {/* Errors & Drops */}
                      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.7)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>Reliability</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {[
                            { label: "RX Dropped", val: stats.rx_dropped },
                            { label: "TX Dropped", val: stats.tx_dropped },
                            { label: "RX Errors", val: stats.rx_errors },
                            { label: "TX Errors", val: stats.tx_errors },
                          ].map(({ label, val }) => (
                            <div key={label} className="flex items-center justify-between">
                              <span style={{ fontSize: 11, color: "rgba(148,163,184,0.7)" }}>{label}</span>
                              <span
                                style={{
                                  fontSize: 12, fontWeight: 600,
                                  color: val > 0 ? "#f59e0b" : "#4ade80",
                                }}
                              >
                                {val.toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                        {totalDrops > 0 && (
                          <div className="flex items-center gap-2 mt-3" style={{ fontSize: 11, color: "#fbbf24", background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)", borderRadius: 8, padding: "6px 10px" }}>
                            <AlertTriangle size={12} />
                            Estimated drop rate: {dropRate}%
                          </div>
                        )}
                      </div>

                      {/* Per-interface */}
                      {(stats.interfaces ?? []).length > 0 && (
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(148,163,184,0.7)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.07em" }}>Interfaces</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {stats.interfaces.map((iface) => (
                              <div key={iface.interface}>
                                <div style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 600, marginBottom: 4, fontFamily: "monospace" }}>{iface.interface}</div>
                                <div className="flex justify-between" style={{ fontSize: 10, color: "rgba(148,163,184,0.6)" }}>
                                  <span>↓ {formatBytes(iface.rx_bytes)}</span>
                                  <span>↑ {formatBytes(iface.tx_bytes)}</span>
                                  {(iface.rx_dropped + iface.tx_dropped) > 0 && (
                                    <span style={{ color: "#f59e0b" }}>⚠ {iface.rx_dropped + iface.tx_dropped} drops</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
