// Source: SEP-2567 https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2567-sessionless-mcp.md
import { Node, SyntaxKind, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R01 — Stateless Core (SEP-2567 + SEP-2575).
 *
 * Detects any literal reference to the `Mcp-Session-Id` header (case-insensitive).
 * SEP-2567 (Sessionless MCP via Explicit State Handles) removes the
 * `Mcp-Session-Id` header and the protocol-level session entirely; SEP-2575
 * (Make MCP Stateless) removes the initialize/initialized handshake. Servers
 * move session-scoped state to explicit, server-minted handles passed as
 * ordinary tool arguments.
 *
 * Detect-only (auto-patch is unsafe: removing a session-id read changes routing
 * semantics — the maintainer must replace it with their stateless equivalent).
 */
const PATTERN = /^mcp-session-id$/i;

export const r01StatelessCore: Rule = {
  id: "r01-stateless-core",
  severity: "warn",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2567-sessionless-mcp.md",
  description: "Stateless Core (SEP-2567/2575): Mcp-Session-Id is removed; migrate to explicit state handles.",
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
              "Mcp-Session-Id is removed in 2026-07-28 RC (SEP-2567 Sessionless MCP). Replace with explicit state handles / per-request auth.",
            ),
          );
        }
      }
    });
    return violations;
  },
};

/** @internal Re-export kept so consumers introspecting rules tree-shake cleanly. */
export const _SyntaxKindMarker: typeof SyntaxKind = SyntaxKind;
