import type { SourceFile, Node } from "ts-morph";

export type Severity = "info" | "warn" | "error" | "critical";

export interface Violation {
  ruleId: string;
  severity: Severity;
  file: string;
  line: number;
  column: number;
  message: string;
  /** Snippet of the node that triggered the rule (truncated). */
  snippet: string;
  /** Whether this violation can be auto-patched. */
  autoPatchable: boolean;
}

export interface PatchResult {
  ruleId: string;
  file: string;
  applied: boolean;
  /** Human-readable reason if not applied (e.g. semantic-complex rule, dryRun). */
  reason?: string;
}

export interface Rule {
  /** Stable id, e.g. "r06-error-code-shift". */
  id: string;
  /** Severity attached to violations this rule reports. */
  severity: Severity;
  /** Whether `patch()` is implemented and safe to auto-apply. */
  autoPatchable: boolean;
  /** Source-of-truth link (SEP url, spec section). Lint-enforced. */
  source: string;
  /** Human-readable one-liner. */
  description: string;
  /** Spec revision this rule targets. */
  specRevision: string;
  /** Detect violations in a source file. Pure read. */
  detect(file: SourceFile): Violation[];
  /**
   * Apply a fix in place. Returns one PatchResult per attempted site.
   * Implementations MUST be idempotent (re-running on an already-patched file = no-op).
   * If `autoPatchable` is false, callers MUST NOT invoke `patch()`.
   */
  patch?(file: SourceFile): PatchResult[];
}

export interface ScanReport {
  scannedFiles: number;
  scannedAt: string;
  specRevision: string;
  violations: Violation[];
  byRule: Record<string, number>;
  bySeverity: Record<Severity, number>;
}

export interface PatchReport {
  patchedFiles: number;
  patchedAt: string;
  specRevision: string;
  backupDir: string | null;
  results: PatchResult[];
  dryRun: boolean;
  /** Suggested CHANGELOG.md append text if any patches were applied. Empty when no patches. */
  changelogAppendHint: string;
  /** Files that prettier was re-run on when --format-after was passed. */
  formattedFiles: string[];
}

export const SPEC_REVISION = "2026-07-28-rc-2026-05-21";

export function truncateSnippet(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= max ? flat : flat.slice(0, max - 1) + "…";
}

export function nodeViolation(
  rule: Pick<Rule, "id" | "severity" | "autoPatchable">,
  node: Node,
  message: string,
): Violation {
  const sf = node.getSourceFile();
  const pos = sf.getLineAndColumnAtPos(node.getStart());
  return {
    ruleId: rule.id,
    severity: rule.severity,
    file: sf.getFilePath(),
    line: pos.line,
    column: pos.column,
    message,
    snippet: truncateSnippet(node.getText()),
    autoPatchable: rule.autoPatchable,
  };
}
