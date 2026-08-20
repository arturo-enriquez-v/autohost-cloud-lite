import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { LogDiagnostic, DiagnosticReportJSON } from "./types";

export interface ExportPdfOptions {
  diagnostic: LogDiagnostic;
  nodeId?: string;
  nodeName?: string;
  includeLogs?: boolean;
}

export async function exportDiagnosticToPdf({
  diagnostic,
  nodeId,
  nodeName,
  includeLogs = true,
}: ExportPdfOptions): Promise<void> {
  const report = diagnostic.diagnostic_json as DiagnosticReportJSON | undefined;
  const sources = diagnostic.sources || [];
  const health = diagnostic.system_health || report?.system_health || "HEALTHY";
  const issues = report?.issues || [];
  const securityInsights = report?.security_insights || [];
  const patterns = report?.detected_patterns || [];

  const createdDate = new Date(diagnostic.created_at || Date.now()).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const shortId = (diagnostic.id || "diag").slice(0, 12);
  const targetNode = nodeName || nodeId || diagnostic.node_id || "Main Server";

  // Health colors & labels
  const healthConfig = {
    HEALTHY: {
      bg: "#f0fdf4",
      border: "#86efac",
      text: "#15803d",
      badgeBg: "#16a34a",
      badgeText: "#ffffff",
      label: "SYSTEM HEALTHY",
    },
    DEGRADED: {
      bg: "#fffbeb",
      border: "#fde68a",
      text: "#b45309",
      badgeBg: "#d97706",
      badgeText: "#ffffff",
      label: "DEGRADED STATE",
    },
    CRITICAL: {
      bg: "#fef2f2",
      border: "#fca5a5",
      text: "#b91c1c",
      badgeBg: "#dc2626",
      badgeText: "#ffffff",
      label: "CRITICAL STATE",
    },
  }[health] || {
    bg: "#f8fafc",
    border: "#cbd5e1",
    text: "#334155",
    badgeBg: "#64748b",
    badgeText: "#ffffff",
    label: health,
  };

  // Build Issues HTML
  const issuesHtml =
    issues.length === 0
      ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px; text-align: center; margin-top: 6px;">
        <div style="font-size: 12.5px; font-weight: bold; color: #166534; margin-bottom: 3px;">No anomalies or critical failures detected</div>
        <div style="font-size: 11px; color: #15803d;">All analyzed services and containers are operating within nominal parameters.</div>
      </div>
    `
      : issues
          .map((issue, idx) => {
            const isCrit = issue.severity === "CRITICAL";
            const sevBg = isCrit ? "#fee2e2" : "#fef3c7";
            const sevColor = isCrit ? "#991b1b" : "#92400e";
            const sevBorder = isCrit ? "#fca5a5" : "#fcd34d";

            return `
        <div style="background-color: #ffffff; border: 1px solid ${isCrit ? "#fecaca" : "#e2e8f0"}; border-left: 5px solid ${isCrit ? "#dc2626" : "#d97706"}; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; background-color: ${sevBg}; color: ${sevColor}; border: 1px solid ${sevBorder}; font-size: 9.5px; font-weight: bold; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; line-height: 1.2;">
                ${issue.severity}
              </span>
              <span style="display: inline-block; background-color: #f1f5f9; color: #1e293b; font-size: 11px; font-family: monospace; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid #e2e8f0; line-height: 1.2;">
                ${escapeHtml(issue.component)}
              </span>
              <span style="display: inline-block; font-size: 10.5px; color: #64748b; font-family: monospace; line-height: 1.2;">
                ${escapeHtml(issue.type)}
              </span>
            </div>
            <span style="font-size: 10.5px; color: #94a3b8; font-weight: bold;">#${idx + 1}</span>
          </div>

          <div style="font-size: 11.5px; color: #1e293b; line-height: 1.45; margin-bottom: 8px;">
            <strong style="color: #475569;">Root Cause: </strong>${escapeHtml(issue.root_cause)}
          </div>

          ${
            issue.suggested_fix
              ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-top: 6px; box-sizing: border-box;">
              <div style="font-size: 11px; font-weight: bold; color: #0284c7; margin-bottom: 5px; line-height: 1.35;">
                Suggested Action: <span style="font-weight: normal; color: #334155;">${escapeHtml(issue.suggested_fix.action)}</span>
              </div>
              ${
                issue.suggested_fix.command
                  ? `
                <div style="display: block; width: 100%; background-color: #090d16; color: #38bdf8; font-family: 'Courier New', Courier, monospace; font-size: 10.5px; font-weight: bold; padding: 8px 10px; border-radius: 5px; margin-top: 5px; box-sizing: border-box; border: 1px solid #1e293b; word-break: break-all; line-height: 1.35;">
                  $ ${escapeHtml(issue.suggested_fix.command)}
                </div>
              `
                  : ""
              }
            </div>
          `
              : ""
          }
        </div>
      `;
          })
          .join("");

  // Build Security HTML
  const securityHtml =
    securityInsights.length === 0
      ? ""
      : `
      <div style="margin-top: 16px;">
        <div style="font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 8px;">
          SECURITY & PRIVACY FINDINGS (${securityInsights.length})
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${securityInsights
            .map((sec) => {
              const isHigh = sec.risk_level === "HIGH";
              const borderCol = isHigh ? "#fda4af" : "#fde68a";
              const bgCol = isHigh ? "#fff1f2" : "#fffbeb";
              const textCol = isHigh ? "#9f1239" : "#92400e";
              const badgeBg = isHigh ? "#dc2626" : "#d97706";

              return `
              <div style="background-color: ${bgCol}; border: 1px solid ${borderCol}; border-radius: 8px; padding: 10px 14px; box-sizing: border-box;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 4px;">
                  <div style="font-size: 11.5px; font-weight: bold; color: ${textCol}; line-height: 1.35; flex: 1; min-width: 0;">
                    ${escapeHtml(sec.finding)}
                  </div>
                  <div style="flex-shrink: 0;">
                    <span style="display: inline-block; font-size: 9.5px; font-weight: bold; text-transform: uppercase; background-color: ${badgeBg}; color: #ffffff; padding: 3px 8px; border-radius: 4px; white-space: nowrap; line-height: 1.2;">
                      RISK ${sec.risk_level}
                    </span>
                  </div>
                </div>
                <div style="font-size: 11px; color: #334155; line-height: 1.4; margin-top: 3px;">
                  <strong style="color: #1e293b;">Mitigation: </strong>${escapeHtml(sec.recommendation)}
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;

  // Build Patterns HTML
  const patternsHtml =
    patterns.length === 0
      ? ""
      : `
      <div style="margin-top: 14px;">
        <div style="font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 6px;">
          TEMPORAL PATTERNS & EVENT LOGS
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; box-sizing: border-box;">
          ${patterns
            .map(
              (p) => `
            <div style="font-size: 10.5px; color: #334155; font-family: monospace; padding: 3px 0; border-bottom: 1px dashed #e2e8f0; line-height: 1.35;">
              • ${escapeHtml(p)}
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;

  // Build Sources Table
  const sourcesRows = sources
    .map(
      (src) => `
      <tr style="border-bottom: 1px solid #f1f5f9; font-size: 10.5px;">
        <td style="padding: 7px 10px; font-family: monospace; font-weight: bold; color: #0f172a;">${escapeHtml(
          src.source
        )}</td>
        <td style="padding: 7px 10px; color: #475569; text-align: center;">${src.line_count} lines</td>
        <td style="padding: 7px 10px; text-align: right;">
          <span style="display: inline-block; background-color: #ecfdf5; color: #065f46; border: 1px solid #86efac; font-size: 9.5px; font-weight: bold; padding: 3px 8px; border-radius: 4px; line-height: 1.2;">
            Secrets Obfuscated
          </span>
        </td>
      </tr>
    `
    )
    .join("");

  // SECTION 1: Executive Report HTML (Page 1)
  const reportMainHtml = `
    <!-- Top Header with Real AutoHost Logo & Brand -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 2px solid #0284c7; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <!-- Real AutoHost Logo with authentic SVG gradients -->
        <div style="width: 48px; height: 35px; display: flex; align-items: center; justify-content: center;">
          <svg width="48" height="35" viewBox="0 0 858 629" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M251.764 48.5H294.014C296.913 48.5 299.264 46.1495 299.264 43.25C299.264 40.3505 301.614 38 304.514 38H551.014C553.913 38 556.264 40.3505 556.264 43.25C556.264 46.1495 558.614 48.5 561.514 48.5H605.264C605.264 21.9903 583.773 0.5 557.264 0.5H299.764C273.254 0.5 251.764 21.9903 251.764 48.5Z" fill="url(#p0)" stroke="#70AEFF" stroke-width="8"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M856.764 628L687.764 240.5L675.764 258.25L663.764 276L795.764 587.5H646.764L601.764 488.5H559.764L620.764 628H856.764Z" fill="url(#p1)" stroke="#70AEFF" stroke-width="8"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0.763672 628L169.764 240.5L181.764 258.25L193.764 276L61.7637 587.5H210.764L255.764 488.5H297.764L236.764 628H0.763672Z" fill="url(#p2)" stroke="#70AEFF" stroke-width="8"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M256.66 283.5C228.016 283.5 204.779 306.654 204.767 335.297C204.758 356.657 204.769 379.192 204.787 398.61C204.812 427.293 228.078 450.5 256.761 450.5H600.587C629.306 450.5 652.587 427.219 652.587 398.5V335.5C652.587 306.781 629.306 283.5 600.587 283.5H256.66ZM258.765 413.5C249.945 413.5 242.79 406.374 242.773 397.554C242.744 381.544 242.713 356.444 242.753 336.408C242.77 327.606 249.917 320.5 258.719 320.5H598.587C607.423 320.5 614.587 327.663 614.587 336.5V397.5C614.587 406.337 607.423 413.5 598.587 413.5H258.765Z" fill="url(#p3)" stroke="#70AEFF" stroke-width="8"/>
            <circle cx="286.764" cy="369.5" r="19.5" fill="url(#p4)" stroke="#70AEFF" stroke-width="6"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M256.836 84.5C228.193 84.5 204.956 107.654 204.944 136.297C204.935 157.657 204.946 180.192 204.964 199.61C204.989 228.293 228.255 251.5 256.937 251.5H600.763C629.482 251.5 652.764 228.219 652.764 199.5V136.5C652.764 107.781 629.482 84.5 600.764 84.5H256.836ZM258.942 214.5C250.122 214.5 242.966 207.374 242.95 198.554C242.921 182.544 242.889 157.444 242.929 137.408C242.947 128.606 250.094 121.5 258.896 121.5H598.764C607.6 121.5 614.764 128.663 614.764 137.5V198.5C614.764 207.337 607.6 214.5 598.764 214.5H258.942Z" fill="url(#p5)" stroke="#70AEFF" stroke-width="8"/>
            <circle cx="286.764" cy="170.5" r="19.5" fill="url(#p6)" stroke="#70AEFF" stroke-width="6"/>
            <defs>
              <linearGradient id="p0" x1="251.764" y1="24.5" x2="605.264" y2="24.5" gradientUnits="userSpaceOnUse"><stop stop-color="#5DA1F9"/><stop offset="1" stop-color="#375F93"/></linearGradient>
              <linearGradient id="p1" x1="373.264" y1="591.5" x2="782.764" y2="529.5" gradientUnits="userSpaceOnUse"><stop stop-color="#5DA1F9"/><stop offset="1" stop-color="#375F93"/></linearGradient>
              <linearGradient id="p2" x1="149.264" y1="240.5" x2="292.264" y2="245" gradientUnits="userSpaceOnUse"><stop stop-color="#5DA1F9"/><stop offset="1" stop-color="#375F93"/></linearGradient>
              <linearGradient id="p3" x1="123.264" y1="340.5" x2="652.764" y2="377.5" gradientUnits="userSpaceOnUse"><stop stop-color="#5DA1F9"/><stop offset="1" stop-color="#375F93"/></linearGradient>
              <linearGradient id="p4" x1="266.764" y1="360" x2="309.764" y2="383" gradientUnits="userSpaceOnUse"><stop stop-color="#5DA1F9"/><stop offset="1" stop-color="#375F93"/></linearGradient>
              <linearGradient id="p5" x1="206.264" y1="164.5" x2="652.264" y2="167.5" gradientUnits="userSpaceOnUse"><stop stop-color="#5DA1F9"/><stop offset="1" stop-color="#375F93"/></linearGradient>
              <linearGradient id="p6" x1="266.764" y1="169.5" x2="306.764" y2="185.5" gradientUnits="userSpaceOnUse"><stop stop-color="#5DA1F9"/><stop offset="1" stop-color="#375F93"/></linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <div style="font-size: 19px; font-weight: 900; letter-spacing: -0.02em; color: #0f172a; line-height: 1.1;">
            AUTOHOST <span style="color: #0284c7; font-weight: 800;">CLOUD</span>
          </div>
          <div style="font-size: 9.5px; font-weight: bold; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 2px;">
            Observability • AI Diagnostics & Sanitizer
          </div>
        </div>
      </div>

      <div style="text-align: right;">
        <div style="font-size: 11.5px; font-weight: bold; color: #0284c7; text-transform: uppercase; letter-spacing: 0.04em;">
          OFFICIAL AUDIT REPORT
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
          ID: <span style="font-family: monospace; font-weight: bold; color: #1e293b;">${shortId}</span>
        </div>
      </div>
    </div>

    <!-- Metadata Grid & Health Banner -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 16px; box-sizing: border-box;">
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; box-sizing: border-box;">
        <div>
          <div style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">Node / Server</div>
          <div style="font-size: 11px; font-weight: bold; color: #0f172a; margin-top: 2px; word-break: break-all;">${escapeHtml(
            targetNode
          )}</div>
        </div>
        <div>
          <div style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">Issue Date</div>
          <div style="font-size: 10.5px; font-weight: bold; color: #334155; margin-top: 2px;">${createdDate}</div>
        </div>
        <div>
          <div style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">Report Status</div>
          <div style="font-size: 10.5px; font-weight: bold; color: #0284c7; margin-top: 2px; text-transform: capitalize;">
            ${diagnostic.status === "approved" ? "Archived (30 days)" : diagnostic.status}
          </div>
        </div>
        <div>
          <div style="font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">Secrets Sanitization</div>
          <div style="font-size: 10.5px; font-weight: bold; color: #16a34a; margin-top: 2px;">Protected (100%)</div>
        </div>
      </div>

      <!-- Health Box -->
      <div style="background-color: ${healthConfig.bg}; border: 1.5px solid ${
    healthConfig.border
  }; border-radius: 8px; padding: 10px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center; box-sizing: border-box;">
        <div style="font-size: 9px; font-weight: bold; color: ${healthConfig.text}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
          OVERALL DIAGNOSIS
        </div>
        <div>
          <span style="display: inline-block; background-color: #ffffff; color: ${
            healthConfig.text
          }; border: 1.5px solid ${healthConfig.border}; font-size: 10.5px; font-weight: bold; letter-spacing: 0.04em; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; white-space: nowrap; line-height: 1.2;">
            ${healthConfig.label}
          </span>
        </div>
      </div>
    </div>

    <!-- Executive Summary -->
    <div style="background: linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 8px; padding: 10px 12px; margin-bottom: 16px; box-sizing: border-box;">
      <div style="font-size: 10px; font-weight: bold; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">
        AI ANALYSIS EXECUTIVE SUMMARY
      </div>
      <div style="font-size: 11px; color: #0c4a6e; font-weight: 500; line-height: 1.45;">
        ${escapeHtml(report?.summary || "Diagnostic completed with no anomalies detected in server logs.")}
      </div>
    </div>

    <!-- Issues and Root Cause Section -->
    <div style="margin-bottom: 16px;">
      <div style="font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
        <span>DETECTED ISSUES & ROOT CAUSES (${issues.length})</span>
        <span style="font-size: 9px; font-weight: bold; color: #64748b;">LOGS & SERVICES ANALYSIS</span>
      </div>
      ${issuesHtml}
    </div>

    <!-- Security Insights Section -->
    ${securityHtml}

    <!-- Patterns Section -->
    ${patternsHtml}

    <!-- Log Sources Audit Section -->
    <div style="margin-top: 16px; margin-bottom: 18px;">
      <div style="font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 6px;">
        INSPECTED LOG SOURCES (${sources.length})
      </div>
      <table style="width: 100%; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase;">
            <th style="padding: 6px 10px; text-align: left;">Source / Service</th>
            <th style="padding: 6px 10px; text-align: center;">Analyzed Volume</th>
            <th style="padding: 6px 10px; text-align: right;">Sanitization</th>
          </tr>
        </thead>
        <tbody>
          ${
            sources.length > 0
              ? sourcesRows
              : `<tr><td colspan="3" style="padding: 8px; text-align: center; font-size: 10.5px; color: #94a3b8;">No sources detailed</td></tr>`
          }
        </tbody>
      </table>
    </div>

    <!-- Privacy Certification & Footer (Page 1) -->
    <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #94a3b8;">
      <div style="max-width: 520px; line-height: 1.35;">
        <strong style="color: #64748b;">Privacy & Security Notice:</strong> This document was automatically generated by AutoHost AI Sanitizer. All access tokens, sensitive variables, and credentials were obfuscated at origin before processing.
      </div>
      <div style="text-align: right;">
        <div style="font-weight: bold; color: #0284c7;">AutoHost Cloud Observability</div>
        <div>Page 1 of ${includeLogs && sources.length > 0 ? "2+" : "1"} • Main Report</div>
      </div>
    </div>
  `;

  // SECTION 2: Logs Appendix HTML (Starts on Page 2)
  const logsAppendixHtml =
    includeLogs && sources.length > 0
      ? `
    <!-- Top Mini-Header for Appendix Page -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #0284c7; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 16px; font-weight: 900; letter-spacing: -0.02em; color: #0f172a;">
          AUTOHOST <span style="color: #0284c7; font-weight: 800;">CLOUD</span>
        </span>
        <span style="font-size: 9.5px; font-weight: bold; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase;">
          • SANITIZED LOGS APPENDIX
        </span>
      </div>
      <div style="font-size: 10px; color: #64748b; font-family: monospace; font-weight: bold;">
        ID: ${shortId}
      </div>
    </div>

    <div style="margin-bottom: 14px;">
      <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 3px;">
        APPENDIX: SANITIZED RECORDS & LOGS
      </div>
      <div style="font-size: 10px; color: #64748b; line-height: 1.4;">
        Full transcription of records processed during diagnostic. All secrets, credentials, and sensitive tokens were obfuscated at origin prior to processing.
      </div>
    </div>

    ${sources
      .map(
        (src, idx) => `
      <div style="margin-bottom: 16px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-family: monospace; font-size: 11px; font-weight: bold; color: #0f172a;">
            [${idx + 1}/${sources.length}] Source: ${escapeHtml(src.source)}
          </span>
          <span style="font-size: 10px; color: #64748b; font-weight: bold;">
            ${src.line_count} lines analyzed
          </span>
        </div>
        <div style="background-color: #090d16; color: #e2e8f0; font-family: 'Courier New', Courier, monospace; font-size: 9px; padding: 10px 12px; line-height: 1.4; white-space: pre-wrap; word-break: break-all;">
${escapeHtml(src.raw_logs || "(No records logged)")}
        </div>
      </div>
    `
      )
      .join("")}

    <!-- Footer for Appendix -->
    <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #94a3b8;">
      <div>
        <strong style="color: #64748b;">End of Records:</strong> All displayed data corresponds to the diagnostic session executed on ${createdDate}.
      </div>
      <div style="text-align: right;">
        <div style="font-weight: bold; color: #0284c7;">AutoHost Cloud Observability</div>
        <div>Technical Appendix</div>
      </div>
    </div>
  `
      : "";

  // Use an isolated iframe to completely shield html2canvas from parent window CSS variables (oklch, lab)
  const iframe = document.createElement("iframe");
  iframe.id = "autohost-pdf-isolated-frame";
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "860px";
  iframe.style.height = "3000px";
  iframe.style.border = "none";
  iframe.style.zIndex = "-1000";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Failed to initialize PDF render environment");
    }

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      -webkit-font-smoothing: antialiased;
      width: 820px;
      margin: 0;
      padding: 0;
      line-height: 1.4;
    }
    .pdf-page-block {
      width: 820px;
      padding: 24px 28px;
      background-color: #ffffff;
    }
    span, div, table, td, th {
      box-sizing: border-box;
    }
  </style>
</head>
<body>
  <div id="section-main-report" class="pdf-page-block">
    ${reportMainHtml}
  </div>

  ${
    logsAppendixHtml
      ? `
    <div id="section-logs-appendix" class="pdf-page-block">
      ${logsAppendixHtml}
    </div>
  `
      : ""
  }
</body>
</html>`;

    iframeDoc.open();
    iframeDoc.write(fullHtml);
    iframeDoc.close();

    // Give browser a tick to layout and render fonts/SVGs
    await new Promise((resolve) => setTimeout(resolve, 200));

    const mainElement = iframeDoc.getElementById("section-main-report");
    const logsElement = iframeDoc.getElementById("section-logs-appendix");

    if (!mainElement) {
      throw new Error("Error locating main report section");
    }

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // ── 1. RENDER MAIN REPORT (Page 1) ──────────────────────────────────────────
    const mainCanvas = await html2canvas(mainElement, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 860,
    });

    const mainImgData = mainCanvas.toDataURL("image/png");
    const mainImgHeightInPdf = (mainCanvas.height * pdfWidth) / mainCanvas.width;

    if (mainImgHeightInPdf <= pdfHeight) {
      pdf.addImage(mainImgData, "PNG", 0, 0, pdfWidth, mainImgHeightInPdf, undefined, "FAST");
    } else {
      let heightLeft = mainImgHeightInPdf;
      let position = 0;
      pdf.addImage(mainImgData, "PNG", 0, position, pdfWidth, mainImgHeightInPdf, undefined, "FAST");
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(mainImgData, "PNG", 0, position, pdfWidth, mainImgHeightInPdf, undefined, "FAST");
        heightLeft -= pdfHeight;
      }
    }

    // ── 2. RENDER LOGS APPENDIX (Starts on a Brand New Page) ───────────────────
    if (logsElement && includeLogs && sources.length > 0) {
      pdf.addPage(); // ALWAYS start logs on a brand new page!

      const logsCanvas = await html2canvas(logsElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 860,
      });

      const logsImgData = logsCanvas.toDataURL("image/png");
      const logsImgHeightInPdf = (logsCanvas.height * pdfWidth) / logsCanvas.width;

      if (logsImgHeightInPdf <= pdfHeight) {
        pdf.addImage(logsImgData, "PNG", 0, 0, pdfWidth, logsImgHeightInPdf, undefined, "FAST");
      } else {
        let heightLeft = logsImgHeightInPdf;
        let position = 0;
        pdf.addImage(logsImgData, "PNG", 0, position, pdfWidth, logsImgHeightInPdf, undefined, "FAST");
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position -= pdfHeight;
          pdf.addPage();
          pdf.addImage(logsImgData, "PNG", 0, position, pdfWidth, logsImgHeightInPdf, undefined, "FAST");
          heightLeft -= pdfHeight;
        }
      }
    }

    const cleanDate = new Date().toISOString().slice(0, 10);
    const sanitizedNodeId = (nodeId || "node").replace(/[^a-zA-Z0-9-_]/g, "_");
    const fileName = `autohost-diagnostic-${sanitizedNodeId}-${cleanDate}.pdf`;

    pdf.save(fileName);
  } finally {
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

export function exportDiagnosticLogsToTxt({
  diagnostic,
  nodeId,
}: ExportPdfOptions): void {
  const sources = diagnostic.sources || [];
  const createdDate = new Date(diagnostic.created_at || Date.now()).toLocaleString("en-US");
  const targetNode = nodeId || diagnostic.node_id || "node";

  let content = `================================================================================\n`;
  content += `AUTOHOST CLOUD - SANITIZED DIAGNOSTIC LOGS & RECORDS\n`;
  content += `================================================================================\n`;
  content += `Diagnostic ID : ${diagnostic.id}\n`;
  content += `Node / Server : ${targetNode}\n`;
  content += `Date          : ${createdDate}\n`;
  content += `System Health : ${diagnostic.system_health || "HEALTHY"}\n`;
  content += `Sanitization  : Secrets, passwords, and tokens obfuscated at origin\n`;
  content += `================================================================================\n\n`;

  if (sources.length === 0) {
    content += `(No log sources recorded in this diagnostic)\n`;
  } else {
    sources.forEach((src, idx) => {
      content += `================================================================================\n`;
      content += `[SOURCE ${idx + 1}/${sources.length}] ${src.source} (${src.line_count} lines)\n`;
      content += `================================================================================\n`;
      content += `${src.raw_logs || "(No log lines recorded)"}\n\n\n`;
    });
  }

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const cleanDate = new Date().toISOString().slice(0, 10);
  const sanitizedNodeId = targetNode.replace(/[^a-zA-Z0-9-_]/g, "_");
  a.href = url;
  a.download = `autohost-logs-${sanitizedNodeId}-${cleanDate}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
