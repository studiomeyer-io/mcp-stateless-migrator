// Source: SEP-Stateless-Core https://github.com/modelcontextprotocol/specification/discussions/stateless-core
import { Node, SyntaxKind, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R01 — Stateless Core (2026-07-28 RC).
 *
 * Detects any literal reference to the `Mcp-Session-Id` header (case-insensitive),
 * because the new spec deprecates the stateful session-id roundtrip on the
 * Streamable-HTTP transport in favour of stateless per-request authentication.
 *
 * Detect-only (auto-patch is unsafe: removing a session-id read can change
 * routing semantics — the maintainer must replace it with their stateless
 * equivalent).
 */
const PATTERN = /^mcp-session-id$/i;

export const r01StatelessCore: Rule = {
  id: "r01-stateless-core",
  severity: "warn",
  autoPatchable: false,
  source: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/",
  description: "Stateless Core: Mcp-Session-Id usage must be removed.",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        const v = node.getLiteralValue();
        if (typeof v === "string" && PATTERN.test(v)) {
          violations.push(
            nodeViolation(
              r01StatelessCore,
              node,
              "Mcp-Session-Id is removed in 2026-07-28 RC (Stateless Core). Replace with per-request auth.",
            ),
          );
        }
      }
    });
    return violations;
  },
};

// Re-export SyntaxKind to keep tree-shaking happy when consumers introspect rules.
export const _SyntaxKindMarker: typeof SyntaxKind = SyntaxKind;
