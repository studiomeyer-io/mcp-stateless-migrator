/**
 * mcp-stateless-migrator — programmatic API.
 *
 * Library consumers can compose scanner + patcher + reporter directly without
 * spawning the CLI. The CLI itself (`dist/cli.js`) is the recommended entry
 * point for one-shot migrations.
 */
export {
  RULES,
  getRule,
  filterRules,
  SPEC_REVISION,
  type Rule,
  type Severity,
  type Violation,
  type ScanReport,
  type PatchResult,
  type PatchReport,
} from "./rules/index.js";

export { loadProject, scanFiles, scanPath, type LoadOptions, type LoadedProject } from "./scanner.js";
export { patchPath, diffPath, type PatchOptions } from "./patcher.js";
export {
  formatScan,
  formatScanJson,
  formatScanMarkdown,
  formatScanText,
  formatScanHtml,
  type ReportFormat,
} from "./reporter.js";
