// Source: SEP-2577 https://github.com/modelcontextprotocol/specification/pull/2577
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R05 — Deprecations: roots, sampling, logging (SEP-2577).
 *
 * 12-month deprecation window opens on 2026-07-28. We flag direct usage of the
 * method-name string literals so maintainers can start the deprecation path.
 *
 * Detect-only — replacement APIs are domain-specific.
 */
const DEPRECATED_METHODS = new Set([
  "roots/list",
  "sampling/createMessage",
  "logging/setLevel",
]);

export const r05Deprecations: Rule = {
  id: "r05-deprecations",
  severity: "warn",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/specification/pull/2577",
  description: "Deprecated roots/sampling/logging methods (12-month window from 2026-07-28).",
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
              `"${v}" deprecated in 2026-07-28 RC (SEP-2577). 12-month window.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
