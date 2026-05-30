// Source: SEP-2243 https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2243-http-standardization.md
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R02 — Standardized Streamable HTTP headers (SEP-2243).
 *
 * SEP-2243 standardizes request headers on the Streamable HTTP transport:
 * `Mcp-Method` (every JSON-RPC POST) and `Mcp-Name` (on the methods that carry
 * a target name, e.g. tools/call, resources/read, prompts/get). The negotiated
 * protocol version travels per-request via `_meta` (SEP-2575) in the stateless
 * model rather than a header. We flag *partial adoption* — a codebase that
 * mentions some of these header strings but not the others is a strong signal
 * of an incomplete migration.
 *
 * Detect-only: header-injection is HTTP-framework-specific (express vs fastify
 * vs node:http) and we will not guess the route-handler shape.
 */
const SIGNAL_HEADERS = ["MCP-Protocol-Version", "Mcp-Method", "Mcp-Name"] as const;

export const r02MandatoryHeaders: Rule = {
  id: "r02-mandatory-headers",
  severity: "info",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2243-http-standardization.md",
  description:
    "Standardized Streamable HTTP headers Mcp-Method + Mcp-Name (SEP-2243; version via _meta per SEP-2575). Detects partial adoption.",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const text = file.getFullText();
    const seen = new Set<string>();
    for (const header of SIGNAL_HEADERS) {
      // case-insensitive whole-token-ish presence check on the file text.
      const re = new RegExp(`\\b${header.replace(/-/g, "\\-")}\\b`, "i");
      if (re.test(text)) seen.add(header);
    }
    if (seen.size === 0 || seen.size === SIGNAL_HEADERS.length) return [];

    const missing = SIGNAL_HEADERS.filter((h) => !seen.has(h));
    // Anchor the violation on the first string literal so we have a line.
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (violations.length > 0) return;
      if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        const v = node.getLiteralValue();
        if (typeof v === "string" && SIGNAL_HEADERS.some((h) => new RegExp(h, "i").test(v))) {
          violations.push(
            nodeViolation(
              r02MandatoryHeaders,
              node,
              `Partial Streamable-HTTP header adoption — missing: ${missing.join(", ")}. Review against SEP-2243 (Mcp-Method/Mcp-Name) + SEP-2575 (per-request _meta version).`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
