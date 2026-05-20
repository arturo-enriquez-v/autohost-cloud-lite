"use client";

import { useState, useRef } from "react";
import { Activity, Cpu, MemoryStick, Loader2, Download, RefreshCw, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchWithAuth } from "@/lib/api/fetch-client";

type ProfileType = "cpu" | "heap";

type ProfileState =
  | { status: "idle" }
  | { status: "collecting"; type: ProfileType; abortCtrl: AbortController }
  | { status: "ready"; type: ProfileType; sessionId: string; iframeSrc: string }
  | { status: "error"; message: string };

const CPU_DURATION_OPTIONS = [10, 30, 60] as const;

interface ProfilePanelProps {
  nodeId: string;
}

export function ProfilePanel({ nodeId }: ProfilePanelProps) {
  const [profileType, setProfileType] = useState<ProfileType>("cpu");
  const [cpuDuration, setCpuDuration] = useState<number>(30);
  const [state, setState] = useState<ProfileState>({ status: "idle" });
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const isCollecting = state.status === "collecting";

  async function collect() {
    const ctrl = new AbortController();
    setState({ status: "collecting", type: profileType, abortCtrl: ctrl });

    try {
      const res = await fetchWithAuth(`/api/nodes/${nodeId}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: profileType,
          duration: profileType === "cpu" ? cpuDuration : 0,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Profile collection failed" }));
        setState({ status: "error", message: (err as { error?: string }).error ?? "Unknown error" });
        return;
      }

      const data = await res.json() as { session_id: string; proxy_path: string };
      // Route pprof proxy through Next.js at /api/pprof/{sessionId}/ui/
      const iframeSrc = `/api/pprof/${data.session_id}/ui/`;
      setState({ status: "ready", type: profileType, sessionId: data.session_id, iframeSrc });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        setState({ status: "idle" });
        return;
      }
      setState({ status: "error", message: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  function cancel() {
    if (state.status === "collecting") {
      state.abortCtrl.abort();
    }
    setState({ status: "idle" });
  }

  function reset() {
    setState({ status: "idle" });
  }

  const downloadHref = `/api/nodes/${nodeId}/profile`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-purple-400" />
            On-demand Profiling
          </CardTitle>
          {state.status === "ready" && (
            <div className="flex items-center gap-2">
              <a
                href={downloadHref}
                download={`pprof-${nodeId}.pb.gz`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download .pb.gz
              </a>
              <Button variant="ghost" size="sm" onClick={reset} className="h-7 gap-1.5 text-xs">
                <RefreshCw className="h-3 w-3" />
                New
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ─── Controls ──────────────────────────────────────────────── */}
        {(state.status === "idle" || state.status === "error") && (
          <div className="flex flex-wrap items-end gap-3">
            {/* Profile type selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Profile type</span>
              <div className="flex rounded-md border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setProfileType("cpu")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                    profileType === "cpu"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  CPU
                </button>
                <button
                  type="button"
                  onClick={() => setProfileType("heap")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors border-l ${
                    profileType === "heap"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  <MemoryStick className="h-3.5 w-3.5" />
                  Heap
                </button>
              </div>
            </div>

            {/* Duration (CPU only) */}
            {profileType === "cpu" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-muted-foreground">Duration</span>
                <div className="flex rounded-md border overflow-hidden">
                  {CPU_DURATION_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCpuDuration(s)}
                      className={`px-3 py-1.5 text-sm border-l first:border-l-0 transition-colors ${
                        cpuDuration === s
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted"
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button onClick={collect} size="sm" className="h-9 gap-2">
              <Activity className="h-3.5 w-3.5" />
              Collect
            </Button>
          </div>
        )}

        {/* ─── Collecting state ──────────────────────────────────────── */}
        {state.status === "collecting" && (
          <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-3">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">
                  Collecting {state.type.toUpperCase()} profile…
                </p>
                <p className="text-xs text-muted-foreground">
                  {state.type === "cpu"
                    ? `Sampling for ${cpuDuration} s — do not close this tab`
                    : "Taking heap snapshot…"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={cancel} className="h-7 gap-1.5 text-xs text-muted-foreground">
              <X className="h-3 w-3" />
              Cancel
            </Button>
          </div>
        )}

        {/* ─── Error state ───────────────────────────────────────────── */}
        {state.status === "error" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
            <p className="text-sm font-medium text-destructive">Collection failed</p>
            <p className="mt-0.5 text-xs text-destructive/80">{state.message}</p>
          </div>
        )}

        {/* ─── pprof iframe ──────────────────────────────────────────── */}
        {state.status === "ready" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs gap-1.5 bg-purple-500/10 text-purple-500 border-purple-500/30">
                {state.type === "cpu" ? <Cpu className="h-3 w-3" /> : <MemoryStick className="h-3 w-3" />}
                {state.type.toUpperCase()} profile ready
              </Badge>
              <span className="text-xs text-muted-foreground">Session expires in 30 min</span>
            </div>
            <iframe
              ref={iframeRef}
              src={state.iframeSrc}
              title={`pprof ${state.type} profile — node ${nodeId}`}
              className="w-full rounded-lg border bg-white"
              style={{ height: "680px", minHeight: "400px" }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
