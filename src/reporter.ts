import chalk from "chalk";
import { RULES, type ScanReport, type Severity, type Violation } from "./rules/index.js";

export type ReportFormat = "json" | "text" | "md" | "html";

const SEVERITY_ORDER: Severity[] = ["critical", "error", "warn", "info"];

function colorSeverity(s: Severity, text: string): string {
  switch (s) {
    case "critical":
      return chalk.bgRed.white.bold(text);
    case "error":
      return chalk.red.bold(text);
    case "warn":
      return chalk.yellow(text);
    case "info":
      return chalk.cyan(text);
  }
}

export function formatScanText(report: ScanReport): string {
  const lines: string[] = [];
  lines.push(chalk.bold(`mcp-stateless-migrator — scan report`));
  lines.push(`  spec: ${report.specRevision}`);
  lines.push(`  files: ${report.scannedFiles}`);
  lines.push(`  violations: ${report.violations.length}`);
  for (const s of SEVERITY_ORDER) {
    const n = report.bySeverity[s];
    if (n > 0) lines.push(`    ${colorSeverity(s, s)}: ${n}`);
  }
  lines.push("");
  // Group by file for readability.
  const byFile = new Map<string, Violation[]>();
  for (const v of report.violations) {
    if (!byFile.has(v.file)) byFile.set(v.file, []);
    byFile.get(v.file)!.push(v);
  }
  for (const [file, vs] of byFile) {
    lines.push(chalk.underline(file));
    for (const v of vs.sort((a, b) => a.line - b.line)) {
      lines.push(
        `  ${chalk.gray(`${v.line}:${v.column}`)} ${colorSeverity(v.severity, v.severity.padEnd(8))} ${chalk.gray(v.ruleId)} — ${v.message}`,
      );
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function formatScanJson(report: ScanReport): string {
  return JSON.stringify(report, null, 2);
}

export function formatScanMarkdown(report: ScanReport): string {
  const lines: string[] = [];
  lines.push(`# MCP Stateless Migrator — Report`);
  lines.push("");
  lines.push(`- Spec: \`${report.specRevision}\``);
  lines.push(`- Files scanned: ${report.scannedFiles}`);
  lines.push(`- Violations: ${report.violations.length}`);
  lines.push(`- Generated: ${report.scannedAt}`);
  lines.push("");
  lines.push(`## Severity breakdown`);
  lines.push("");
  lines.push(`| Severity | Count |`);
  lines.push(`|---|---|`);
  for (const s of SEVERITY_ORDER) lines.push(`| ${s} | ${report.bySeverity[s]} |`);
  lines.push("");
  lines.push(`## Rule coverage`);
  lines.push("");
  lines.push(`| Rule | Severity | Auto-patch | Hits | Source |`);
  lines.push(`|---|---|---|---|---|`);
  for (const r of RULES) {
    const hits = report.byRule[r.id] ?? 0;
    lines.push(
      `| \`${r.id}\` | ${r.severity} | ${r.autoPatchable ? "yes" : "no"} | ${hits} | [link](${r.source}) |`,
    );
  }
  lines.push("");
  if (report.violations.length > 0) {
    lines.push(`## Violations`);
    lines.push("");
    for (const v of report.violations) {
      lines.push(`- **${v.severity}** \`${v.ruleId}\` ${v.file}:${v.line}:${v.column}`);
      lines.push(`  - ${v.message}`);
      lines.push(`  - \`${v.snippet}\``);
    }
  }
  return lines.join("\n");
}

export function formatScanHtml(report: ScanReport): string {
  const md = formatScanMarkdown(report);
  // Minimal HTML wrapper. We deliberately do not include a markdown renderer
  // dependency — consumers can pipe through their preferred renderer if they
  // want rich HTML. This produces valid (if plain) HTML wrapping the markdown.
  return `<!doctype html><html><head><meta charset="utf-8"><title>MCP Stateless Migrator Report</title></head><body><pre>${escapeHtml(md)}</pre></body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatScan(report: ScanReport, fmt: ReportFormat): string {
  switch (fmt) {
    case "json":
      return formatScanJson(report);
    case "md":
      return formatScanMarkdown(report);
    case "html":
      return formatScanHtml(report);
    case "text":
    default:
      return formatScanText(report);
  }
}
