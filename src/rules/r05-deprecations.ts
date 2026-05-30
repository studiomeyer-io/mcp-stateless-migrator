// Source: SEP-2577 https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2577-deprecate-roots-sampling-and-logging.md
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R05 — Deprecations: Roots, Sampling, Logging (SEP-2577).
 *
 * SEP-2577 deprecates the Roots, Sampling and Logging features. These remain
 * fully functional for at least twelve months under the feature-lifecycle
 * policy (SEP-2596), so this is annotation-only: we flag direct usage of the
 * method/notification string literals so maintainers can start the migration.
 *
 * Detect-only — replacement APIs are domain-specific (tool params / resource
 * URIs for Roots, direct LLM provider APIs for Sampling, stderr / OpenTelemetry
 * for Logging).
 */
const DEPRECATED_METHODS = new Set([
  "roots/list",
  "notifications/roots/list_changed",
  "sampling/createMessage",
  "logging/setLevel",
  "notifications/message",
]);

export const r05Deprecations: Rule = {
  id: "r05-deprecations",
  severity: "warn",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2577-deprecate-roots-sampling-and-logging.md",
  description: "Deprecated Roots/Sampling/Logging methods (SEP-2577; 12-month window per SEP-2596).",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        const v = node.getLiteralValue();
        if (typeof v === "string" && DEPRECATED_METHODS.has(v)) {
          violations.push(
            nodeViolation(
              r05Deprecations,
              node,
              `"${v}" deprecated in 2026-07-28 RC (SEP-2577). Functional for >=12 months, then eligible for removal.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
