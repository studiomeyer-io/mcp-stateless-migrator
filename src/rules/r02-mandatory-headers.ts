// Source: SEP-2243 https://github.com/modelcontextprotocol/specification/pull/2243
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R02 — Mandatory headers (SEP-2243).
 *
 * The 2026-07-28 RC makes `MCP-Protocol-Version`, `Mcp-Method`, and `Mcp-Name`
 * required on every JSON-RPC HTTP request. We detect codebases that mention
 * one of these but are missing the others — strong signal the server only
 * partially implements the new contract.
 *
 * Detect-only: header-injection is HTTP-framework-specific (express vs fastify
 * vs node:http) and we will not guess the route-handler shape.
 */
const MANDATORY = ["MCP-Protocol-Version", "Mcp-Method", "Mcp-Name"] as const;

export const r02MandatoryHeaders: Rule = {
  id: "r02-mandatory-headers",
  severity: "info",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/specification/pull/2243",
  description:
    "Mandatory headers MCP-Protocol-Version + Mcp-Method + Mcp-Name (SEP-2243). Detects partial adoption.",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const text = file.getFullText();
    const seen = new Set<string>();
    for (const header of MANDATORY) {
      // case-insensitive whole-token-ish presence check on the file text.
      const re = new RegExp(`\\b${header.replace(/-/g, "\\-")}\\b`, "i");
      if (re.test(text)) seen.add(header);
    }
    if (seen.size === 0 || seen.size === MANDATORY.length) return [];

    const missing = MANDATORY.filter((h) => !seen.has(h));
    // Anchor the violation on the first string literal so we have a line.
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (violations.length > 0) return;
      if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        const v = node.getLiteralValue();
        if (typeof v === "string" && MANDATORY.some((h) => new RegExp(h, "i").test(v))) {
          violations.push(
            nodeViolation(
              r02MandatoryHeaders,
              node,
              `Partial header adoption — missing: ${missing.join(", ")}. SEP-2243 requires all three.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
