"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  collectLogDiagnostic,
  pollDiagnosticPreview,
  approveLogDiagnostic,
  rejectLogDiagnostic,
  listLogDiagnostics,
  deleteLogDiagnostic,
} from "@/lib/features/diagnostics/api";
import {
  exportDiagnosticToPdf,
  exportDiagnosticLogsToTxt,
} from "@/lib/features/diagnostics/exportPdf";
import type {
  LogDiagnostic,
  DiagnosticReportJSON,
  DiagnosticIssue,
  SecurityInsight,
} from "@/lib/features/diagnostics/types";
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  Cpu,
  Download,
  FileCode2,
  FileText,
  History,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
} from "lucide-react";

type Step = "config" | "loading" | "preview" | "done";
type ViewMode = "scan" | "history" | "inspect";

interface LogDiagnosticModalProps {
  nodeId: string;
  isOpen: boolean;
  onClose: () => void;
  defaultUnit?: string;
  defaultSources?: string[];
}

export function LogDiagnosticModal({
  nodeId,
  isOpen,
  onClose,
  defaultUnit,
  defaultSources = ["autohost-agent"],
}: LogDiagnosticModalProps) {
  // Navigation & Step state
  const [viewMode, setViewMode] = useState<ViewMode>("scan");
  const [step, setStep] = useState<Step>("config");

  // Form config
  const initialSources = defaultUnit && defaultUnit !== "all" 
    ? [defaultUnit] 
    : defaultSources;
  const [sourcesInput, setSourcesInput] = useState(initialSources.join(", "));
  const [linesPerSource, setLinesPerSource] = useState(200);
  const [includeContainers, setIncludeContainers] = useState(true);

  // Active / Inspected diagnostic
  const [diagnostic, setDiagnostic] = useState<LogDiagnostic | null>(null);
  const [inspectedDiagnostic, setInspectedDiagnostic] = useState<LogDiagnostic | null>(null);
  const [historyList, setHistoryList] = useState<LogDiagnostic[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Feedback states
  const [loadingStep, setLoadingStep] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [activeLogTab, setActiveLogTab] = useState(0);
  const [planUsage, setPlanUsage] = useState<import("@/lib/features/plans/types").PlanUsage | null>(null);

  // Load history & plan usage
  const fetchHistoryAndUsage = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [histRes, usageRes] = await Promise.all([
        listLogDiagnostics({ nodeId, limit: 30 }),
        window.fetch("/api/plans/usage", { credentials: "include" }).then((r) => r.ok ? r.json() : null).catch(() => null),
      ]);
      setHistoryList(histRes.diagnostics || []);
      if (usageRes) setPlanUsage(usageRes);
    } catch (err: any) {
      console.error("Failed to load diagnostics history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [nodeId]);

  useEffect(() => {
    if (isOpen) {
      fetchHistoryAndUsage();
    }
  }, [isOpen, fetchHistoryAndUsage]);

  const fetchHistory = fetchHistoryAndUsage;

  const handleStartDiagnostics = async () => {
    setErrorMsg(null);
    setStep("loading");
    setLoadingStep("Initiating secure log collection request on node...");

    try {
      const parsedSources = sourcesInput
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const res = await collectLogDiagnostic({
        node_id: nodeId,
        sources: parsedSources,
        lines_per_source: linesPerSource,
        include_containers: includeContainers,
      });

      setLoadingStep("Agent sanitizing secrets and analyzing anomalies...");
      const finalDiag = await pollDiagnosticPreview(res.diagnostic.id, 45000);

      setDiagnostic(finalDiag);
      setStep("preview");
      fetchHistory();
    } catch (err: any) {
      console.error("Diagnostic error:", err);
      setErrorMsg(err.message || "Failed to run diagnostic.");
      setStep("config");
    }
  };

  const handleApprove = async () => {
    if (!diagnostic) return;
    setActionLoading(true);
    try {
      await approveLogDiagnostic(diagnostic.id);
      setDiagnostic((prev) =>
        prev ? { ...prev, status: "approved" } : null
      );
      setStep("done");
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to approve diagnostic.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!diagnostic) return;
    setActionLoading(true);
    try {
      await rejectLogDiagnostic(diagnostic.id);
      setDiagnostic((prev) =>
        prev ? { ...prev, status: "rejected" } : null
      );
      setStep("done");
      fetchHistory();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to discard diagnostic.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteLogDiagnostic(id);
      setHistoryList((prev) => prev.filter((d) => d.id !== id));
      if (inspectedDiagnostic?.id === id) {
        setInspectedDiagnostic(null);
        setViewMode("history");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to delete diagnostic.");
    }
  };

  const handleInspect = (item: LogDiagnostic) => {
    setInspectedDiagnostic(item);
    setActiveLogTab(0);
    setViewMode("inspect");
  };

  const handleCopyCommand = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // PDF Export handler
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);

  const handleExportPdf = async (item: LogDiagnostic | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!item) return;
    setExportingPdfId(item.id || "current");
    toast.loading("Generating PDF report...", { id: "pdf-export-toast" });
    try {
      await exportDiagnosticToPdf({
        diagnostic: item,
        nodeId,
      });
      toast.success("PDF report downloaded successfully", { id: "pdf-export-toast" });
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error(err?.message || "Failed to generate PDF", { id: "pdf-export-toast" });
    } finally {
      setExportingPdfId(null);
    }
  };

  const handleExportTxt = (item: LogDiagnostic | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!item) return;
    try {
      exportDiagnosticLogsToTxt({ diagnostic: item, nodeId });
      toast.success("Sanitized logs (.txt) downloaded");
    } catch (err: any) {
      console.error("TXT export error:", err);
      toast.error("Failed to export text logs");
    }
  };

  // Active diagnostic object being viewed
  const currentDiagnostic = viewMode === "inspect" ? inspectedDiagnostic : diagnostic;
  const report = currentDiagnostic?.diagnostic_json as DiagnosticReportJSON | undefined;
  const sources = currentDiagnostic?.sources ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-background border-border shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Sparkles className="size-5 text-primary animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Diagnostics & Observability
                  <Badge variant="outline" className="text-xs font-mono font-normal">
                    AI + Sanitizer
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Recovery, secret obfuscation, audit trail, and failure analysis for servers and containers.
                </DialogDescription>
              </div>
            </div>

            {/* Health Badge when viewing report */}
            {(step === "preview" || viewMode === "inspect") && currentDiagnostic && (
              <HealthBadge health={currentDiagnostic.system_health || report?.system_health || "HEALTHY"} />
            )}
          </div>

          {/* Sub-Header Navigation Tabs */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            <button
              onClick={() => {
                setViewMode("scan");
                setErrorMsg(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "scan"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <Sparkles className="size-3.5" />
              New Diagnostic
            </button>

            <button
              onClick={() => {
                setViewMode("history");
                setErrorMsg(null);
                fetchHistoryAndUsage();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === "history" || viewMode === "inspect"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <History className="size-3.5" />
              Saved History
              {historyList.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-background/20 font-mono">
                  {historyList.length}
                </span>
              )}
            </button>

            {planUsage && (
              <div className="ml-auto flex items-center gap-1.5 text-xs">
                {planUsage.ai_diagnostics_month_limit === -1 ? (
                  <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-400 text-[11px] font-medium">
                    Unlimited AI Diagnostics (Pro)
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={`text-[11px] font-mono ${
                      planUsage.ai_diagnostics_this_month >= planUsage.ai_diagnostics_month_limit
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-400 font-semibold"
                        : "bg-[#70AEFF]/10 border-[#70AEFF]/30 text-[#70AEFF]"
                    }`}
                  >
                    Quota: {planUsage.ai_diagnostics_this_month} / {planUsage.ai_diagnostics_month_limit} this month
                  </Badge>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
              <AlertCircle className="size-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* VIEW: HISTORY LIST                                                    */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {viewMode === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    Archived Diagnostic Reports
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Technical inspections and sanitized logs saved for auditing (30-day retention).
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHistory}
                  disabled={historyLoading}
                  className="h-8 text-xs gap-1.5"
                >
                  <RefreshCw className={`size-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>

              {historyLoading && historyList.length === 0 ? (
                <div className="py-16 text-center space-y-2 text-muted-foreground text-xs">
                  <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                  <p>Loading diagnostic history...</p>
                </div>
              ) : historyList.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed text-center bg-muted/10 space-y-3">
                  <History className="size-10 text-muted-foreground/40 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      No saved diagnostics found
                    </p>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Run an analysis in the &quot;New Diagnostic&quot; tab and approve it to archive the report and logs.
                    </p>
                  </div>
                  <Button
                    onClick={() => setViewMode("scan")}
                    size="sm"
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <Plus className="size-3.5" />
                    Start First Diagnostic
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {historyList.map((item) => {
                    const itemReport = item.diagnostic_json as DiagnosticReportJSON | undefined;
                    const issueCount = itemReport?.issues?.length ?? 0;
                    const sourcesCount = item.sources?.length ?? 0;
                    const isApproved = item.status === "approved";

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleInspect(item)}
                        className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all cursor-pointer space-y-3 group border-border/80 hover:border-primary/40 shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <HealthBadge health={item.system_health || itemReport?.system_health || "HEALTHY"} />
                            <Badge
                              variant={isApproved ? "outline" : "secondary"}
                              className={`text-[10px] uppercase font-mono ${
                                isApproved
                                  ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                  : ""
                              }`}
                            >
                              {item.status === "approved" ? "Archived (30d)" : item.status}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Calendar className="size-3" />
                              {new Date(item.created_at).toLocaleString("en-US", {
                                month: "short",
                                day: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleExportPdf(item, e)}
                              disabled={exportingPdfId === item.id}
                              className="h-7 text-[11px] gap-1 px-2.5 bg-background/50 hover:bg-primary/10 hover:text-primary hover:border-primary/40 font-medium"
                              title="Download PDF report with logo"
                            >
                              {exportingPdfId === item.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Download className="size-3 text-primary" />
                              )}
                              <span>PDF</span>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                              className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Delete archived record"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed">
                          {itemReport?.summary || "Diagnostic executed with no summary recorded."}
                        </p>

                        <div className="flex items-center justify-between pt-1 border-t text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <AlertCircle className="size-3 text-amber-500" />
                              {issueCount} {issueCount === 1 ? "issue" : "issues"}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Terminal className="size-3 text-primary" />
                              {sourcesCount} {sourcesCount === 1 ? "source" : "sources"}
                            </span>
                          </div>

                          <span className="text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium text-xs">
                            View Report & Logs <ChevronRight className="size-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* VIEW: INSPECT ARCHIVED DIAGNOSTIC                                      */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {viewMode === "inspect" && inspectedDiagnostic && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("history")}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
                >
                  <ArrowLeft className="size-3.5" />
                  Back to History
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportPdf(inspectedDiagnostic)}
                    disabled={exportingPdfId === (inspectedDiagnostic?.id || "inspect")}
                    className="h-8 text-xs gap-1.5 font-semibold text-foreground border-primary/30 hover:bg-primary/10 hover:text-primary shadow-xs"
                    title="Download PDF report with logo"
                  >
                    {exportingPdfId === (inspectedDiagnostic?.id || "inspect") ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5 text-primary" />
                    )}
                    Download PDF
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportTxt(inspectedDiagnostic)}
                    className="h-8 text-xs gap-1.5 font-medium text-foreground hover:bg-muted"
                    title="Download plain text file (.txt) with all logs"
                  >
                    <FileCode2 className="size-3.5 text-muted-foreground" />
                    Download Logs (.txt)
                  </Button>

                  <Badge variant="outline" className="font-mono text-[10px]">
                    ID: {inspectedDiagnostic.id.slice(0, 8)}...
                  </Badge>
                  <span>
                    {new Date(inspectedDiagnostic.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {/* Render Tabs (Diagnosis & Sanitized Logs) */}
              <DiagnosticReportTabs
                report={report}
                sources={sources}
                activeLogTab={activeLogTab}
                setActiveLogTab={setActiveLogTab}
                onCopy={handleCopyCommand}
                onExportTxt={() => handleExportTxt(inspectedDiagnostic)}
                copiedIndex={copiedIndex}
              />
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* VIEW: NEW SCAN - STEP 1: CONFIG                                        */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {viewMode === "scan" && step === "config" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-3.5">
                <ShieldCheck className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-foreground">
                    Privacy Protection & In-Origin Sanitization
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Before logs leave the server, the agent automatically redacts passwords, Bearer tokens, JWTs, AWS keys, and database URLs. A preview is then generated for your approval.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-1.5">
                    Log Sources to Inspect
                  </label>
                  <input
                    type="text"
                    value={sourcesInput}
                    onChange={(e) => setSourcesInput(e.target.value)}
                    placeholder="autohost-agent, docker:nginx, docker:postgres, sshd"
                    className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Enter systemd service names or <code>docker:container_name</code> prefix separated by commas.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-lg border bg-card/40 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium block">Auto-include containers</span>
                      <span className="text-[11px] text-muted-foreground">
                        Collect logs from all running Docker containers
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={includeContainers}
                      onChange={(e) => setIncludeContainers(e.target.checked)}
                      className="size-4 text-primary rounded accent-primary cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Lines per source
                    </label>
                    <select
                      value={linesPerSource}
                      onChange={(e) => setLinesPerSource(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border bg-background text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value={100}>100 lines (Fast)</option>
                      <option value={200}>200 lines (Recommended)</option>
                      <option value={500}>500 lines (Deep)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quota Exceeded Alert */}
              {planUsage &&
                planUsage.ai_diagnostics_month_limit !== -1 &&
                planUsage.ai_diagnostics_this_month >= planUsage.ai_diagnostics_month_limit && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-foreground block text-xs mb-0.5">Monthly AI Diagnostics Quota Exhausted</span>
                        <span className="text-muted-foreground">
                          You have used {planUsage.ai_diagnostics_this_month} of {planUsage.ai_diagnostics_month_limit} diagnostic reports for this billing cycle.
                        </span>
                      </div>
                    </div>
                    <a href="/billing" className="shrink-0">
                      <Button size="sm" className="bg-[#70AEFF] hover:bg-[#5b9df5] text-slate-950 font-semibold text-xs h-7 px-3">
                        Upgrade Plan
                      </Button>
                    </a>
                  </div>
                )}

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleStartDiagnostics}
                  disabled={Boolean(
                    planUsage &&
                    planUsage.ai_diagnostics_month_limit !== -1 &&
                    planUsage.ai_diagnostics_this_month >= planUsage.ai_diagnostics_month_limit
                  )}
                  className="gap-2 h-10 px-5 text-sm font-semibold shadow-md shadow-primary/20"
                >
                  <Sparkles className="size-4" />
                  Start Diagnostic & Sanitization
                </Button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* VIEW: NEW SCAN - STEP 2: LOADING                                       */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {viewMode === "scan" && step === "loading" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20 animate-pulse">
                  <Cpu className="size-8 animate-spin" />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 bg-background rounded-full border shadow">
                  <Lock className="size-3.5 text-primary" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h4 className="text-sm font-semibold text-foreground">
                  Processing Secure Diagnostic
                </h4>
                <p className="text-xs text-muted-foreground animate-pulse">
                  {loadingStep}
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* VIEW: NEW SCAN - STEP 3: PREVIEW                                       */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {viewMode === "scan" && step === "preview" && diagnostic && (
            <DiagnosticReportTabs
              report={report}
              sources={sources}
              activeLogTab={activeLogTab}
              setActiveLogTab={setActiveLogTab}
              onCopy={handleCopyCommand}
              onExportTxt={() => handleExportTxt(diagnostic)}
              copiedIndex={copiedIndex}
            />
          )}

          {/* ════════════════════════════════════════════════════════════════════════ */}
          {/* VIEW: NEW SCAN - STEP 4: DONE                                          */}
          {/* ════════════════════════════════════════════════════════════════════════ */}
          {viewMode === "scan" && step === "done" && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 className="size-8" />
              </div>
              <h4 className="text-base font-bold text-foreground">
                {diagnostic?.status === "approved"
                  ? "Diagnostic Approved and Saved"
                  : "Diagnostic Discarded"}
              </h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                {diagnostic?.status === "approved"
                  ? "The report and sanitized logs will remain archived for 30 days for auditing and technical reference."
                  : "The record has been marked as rejected and will be purged automatically."}
              </p>

              <div className="pt-4 flex items-center gap-3 flex-wrap justify-center">
                {diagnostic && (
                  <Button
                    onClick={() => handleExportPdf(diagnostic)}
                    disabled={exportingPdfId === (diagnostic?.id || "done")}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-semibold hover:bg-primary/10 hover:text-primary"
                  >
                    {exportingPdfId === (diagnostic?.id || "done") ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5 text-primary" />
                    )}
                    Download PDF
                  </Button>
                )}

                {diagnostic?.status === "approved" && (
                  <Button
                    onClick={() => {
                      setInspectedDiagnostic(diagnostic);
                      setViewMode("inspect");
                    }}
                    variant="default"
                    size="sm"
                    className="gap-1.5 text-xs font-semibold"
                  >
                    <FileText className="size-3.5" />
                    View Saved Report
                  </Button>
                )}

                <Button
                  onClick={() => {
                    setViewMode("history");
                    fetchHistory();
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                >
                  <History className="size-3.5" />
                  Go to History
                </Button>

                <Button onClick={onClose} variant="ghost" size="sm" className="text-xs">
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Decision Actions (Preview mode only) */}
        {viewMode === "scan" && step === "preview" && (
          <div className="p-4 px-6 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                Preview
              </Badge>
              <span>Expires automatically in 48 hours if not approved.</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPdf(diagnostic)}
                disabled={exportingPdfId === (diagnostic?.id || "preview")}
                className="gap-1.5 text-xs hover:bg-primary/10 hover:text-primary font-medium"
                title="Download current report in PDF"
              >
                {exportingPdfId === (diagnostic?.id || "preview") ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Download className="size-3.5 text-primary" />
                )}
                Download PDF
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReject}
                disabled={actionLoading}
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" />
                Discard
              </Button>

              <Button
                size="sm"
                onClick={handleApprove}
                disabled={actionLoading}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {actionLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                Approve & Archive (30 days)
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Tab Component for Report + Logs ──────────────────────────────────────────

function DiagnosticReportTabs({
  report,
  sources,
  activeLogTab,
  setActiveLogTab,
  onCopy,
  onExportTxt,
  copiedIndex,
}: {
  report?: DiagnosticReportJSON;
  sources: Array<{ source: string; raw_logs: string; line_count: number }>;
  activeLogTab: number;
  setActiveLogTab: (idx: number) => void;
  onCopy: (text: string, id: string) => void;
  onExportTxt?: () => void;
  copiedIndex: string | null;
}) {
  return (
    <Tabs defaultValue="diagnosis" className="w-full">
      <TabsList className="grid grid-cols-2 w-full mb-4">
        <TabsTrigger value="diagnosis" className="gap-2 text-xs">
          <Activity className="size-3.5" />
          Technical Diagnostics & Security
          {report?.issues && report.issues.length > 0 && (
            <Badge variant="destructive" className="size-4 p-0 text-[10px] flex items-center justify-center">
              {report.issues.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="logs" className="gap-2 text-xs">
          <Terminal className="size-3.5" />
          Sanitized Logs ({sources.length} sources)
        </TabsTrigger>
      </TabsList>

      {/* TAB 1: DIAGNOSIS & INSIGHTS */}
      <TabsContent value="diagnosis" className="space-y-5">
        {/* Summary Banner */}
        <div className="p-4 rounded-xl bg-card border shadow-xs space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            Executive Summary
          </div>
          <p className="text-sm text-foreground font-medium leading-relaxed">
            {report?.summary || "Diagnostic completed with no anomalies detected."}
          </p>
        </div>

        {/* Issues List */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <AlertCircle className="size-4 text-amber-500" />
            Issues & Root Cause ({report?.issues?.length ?? 0})
          </h4>

          {!report?.issues || report.issues.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed text-center bg-muted/10 space-y-1">
              <CheckCircle2 className="size-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">
                No critical failures or runtime errors detected.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Analyzed services and containers are operating within nominal parameters.
              </p>
            </div>
          ) : (
            report.issues.map((issue, idx) => (
              <IssueCard
                key={issue.id || idx}
                issue={issue}
                onCopy={onCopy}
                copiedId={copiedIndex}
              />
            ))
          )}
        </div>

        {/* Security Insights */}
        {report?.security_insights && report.security_insights.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <ShieldAlert className="size-4 text-rose-500" />
              Security Findings ({report.security_insights.length})
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {report.security_insights.map((insight, idx) => (
                <SecurityCard key={idx} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Detected Patterns */}
        {report?.detected_patterns && report.detected_patterns.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <RefreshCw className="size-4 text-primary" />
              Temporal Patterns & Anomalies
            </h4>
            <div className="p-3 rounded-lg border bg-muted/20 space-y-1.5">
              {report.detected_patterns.map((pat, idx) => (
                <div key={idx} className="text-xs flex items-start gap-2 text-foreground font-mono">
                  <span className="text-primary">•</span>
                  <span>{pat}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* TAB 2: SANITIZED LOGS PREVIEW */}
      <TabsContent value="logs" className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap gap-1.5">
            {sources.map((b, idx) => (
              <button
                key={b.source}
                onClick={() => setActiveLogTab(idx)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all ${
                  activeLogTab === idx
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                {b.source} ({b.line_count})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {onExportTxt && (
              <Button
                variant="outline"
                size="sm"
                onClick={onExportTxt}
                className="h-7 text-xs gap-1.5 hover:bg-primary/10 hover:text-primary"
                title="Download all logs in a plain text file (.txt)"
              >
                <FileCode2 className="size-3.5 text-primary" />
                Download Logs (.txt)
              </Button>
            )}

            {sources[activeLogTab] && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCopy(sources[activeLogTab].raw_logs, "all_logs")}
                className="h-7 text-xs gap-1.5"
              >
                {copiedIndex === "all_logs" ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                Copy Block
              </Button>
            )}
          </div>
        </div>

        {sources[activeLogTab] ? (
          <div className="rounded-xl border bg-zinc-950 p-4 font-mono text-[11px] text-zinc-300 overflow-x-auto max-h-96 leading-relaxed select-text shadow-inner">
            <pre className="whitespace-pre-wrap">
              {sources[activeLogTab].raw_logs || "(No log lines recorded)"}
            </pre>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground p-6 text-center">
            No sources available.
          </p>
        )}

        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 italic">
          <Lock className="size-3 text-emerald-500 shrink-0" />
          All tokens, sensitive environment variables, and credentials have been replaced with obfuscation tags.
        </p>
      </TabsContent>
    </Tabs>
  );
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function HealthBadge({ health }: { health: string }) {
  switch (health) {
    case "HEALTHY":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1.5 px-3 py-1 font-semibold text-xs">
          <ShieldCheck className="size-3.5 text-emerald-500" />
          HEALTHY
        </Badge>
      );
    case "DEGRADED":
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1.5 px-3 py-1 font-semibold text-xs">
          <AlertTriangle className="size-3.5 text-amber-500" />
          DEGRADED
        </Badge>
      );
    case "CRITICAL":
      return (
        <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1.5 px-3 py-1 font-semibold text-xs animate-pulse">
          <AlertOctagon className="size-3.5 text-rose-500" />
          CRITICAL
        </Badge>
      );
    default:
      return <Badge variant="outline">{health}</Badge>;
  }
}

function IssueCard({
  issue,
  onCopy,
  copiedId,
}: {
  issue: DiagnosticIssue;
  onCopy: (cmd: string, id: string) => void;
  copiedId: string | null;
}) {
  const isCritical = issue.severity === "CRITICAL";

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isCritical
          ? "bg-rose-500/5 border-rose-500/25 shadow-xs"
          : "bg-card border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant={isCritical ? "destructive" : "secondary"}
            className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5"
          >
            {issue.severity}
          </Badge>
          <Badge variant="outline" className="text-[10px] font-mono font-medium">
            {issue.component}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {issue.type}
          </span>
        </div>
      </div>

      <p className="text-xs text-foreground font-medium leading-relaxed mb-3">
        <span className="text-muted-foreground font-normal">Root Cause: </span>
        {issue.root_cause}
      </p>

      {/* Suggested Fix Action */}
      <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span>Suggested Action:</span>
          <span className="font-normal text-muted-foreground">
            {issue.suggested_fix.action}
          </span>
        </div>

        {issue.suggested_fix.command && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-zinc-950 text-zinc-200 font-mono text-[11px] border border-zinc-800">
            <code className="truncate">{issue.suggested_fix.command}</code>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                onCopy(issue.suggested_fix.command!, issue.id || "cmd")
              }
              className="size-6 text-zinc-400 hover:text-white shrink-0"
              title="Copy command"
            >
              {copiedId === (issue.id || "cmd") ? (
                <Check className="size-3.5 text-emerald-400" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function SecurityCard({ insight }: { insight: SecurityInsight }) {
  const isHigh = insight.risk_level === "HIGH";

  return (
    <div
      className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
        isHigh
          ? "bg-rose-500/5 border-rose-500/25"
          : "bg-amber-500/5 border-amber-500/25"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <ShieldAlert
            className={`size-3.5 ${
              isHigh ? "text-rose-500" : "text-amber-500"
            }`}
          />
          <span>{insight.finding}</span>
        </div>
        <Badge
          variant={isHigh ? "destructive" : "secondary"}
          className="text-[10px] font-bold"
        >
          {insight.risk_level}
        </Badge>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">Mitigation: </span>
        {insight.recommendation}
      </p>
    </div>
  );
}
