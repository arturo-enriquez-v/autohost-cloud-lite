export type DiagnosticHealth = "HEALTHY" | "DEGRADED" | "CRITICAL";

export type IssueSeverity = "LOW" | "MEDIUM" | "CRITICAL";
export type IssueType =
  | "RUNTIME_ERROR"
  | "CONFIG_ERROR"
  | "NETWORK_TIMEOUT"
  | "DATABASE_FAILURE"
  | "RESOURCE_LIMIT"
  | "UNKNOWN";

export type SecurityRiskLevel = "INFO" | "WARNING" | "HIGH";

export interface SuggestedFix {
  action: string;
  command: string | null;
}

export interface DiagnosticIssue {
  id: string;
  type: IssueType;
  severity: IssueSeverity;
  component: string;
  root_cause: string;
  suggested_fix: SuggestedFix;
}

export interface SecurityInsight {
  finding: string;
  risk_level: SecurityRiskLevel;
  recommendation: string;
}

export interface DiagnosticReportJSON {
  summary: string;
  system_health: DiagnosticHealth;
  issues: DiagnosticIssue[];
  security_insights: SecurityInsight[];
  detected_patterns: string[];
}

export interface LogSourceBundle {
  source: string;
  raw_logs: string;
  line_count: number;
}

export type DiagnosticStatus = "pending" | "preview" | "approved" | "rejected";

export interface LogDiagnostic {
  id: string;
  user_id: string;
  node_id: string;
  request_id: string;
  status: DiagnosticStatus;
  diagnostic_json?: DiagnosticReportJSON | null;
  sources?: LogSourceBundle[] | null;
  system_health?: DiagnosticHealth | null;
  created_at: string;
  approved_at?: string | null;
}

export interface CollectDiagnosticPayload {
  node_id: string;
  sources: string[];
  lines_per_source?: number;
  include_containers?: boolean;
}
