// Source: SEP-1865 https://github.com/modelcontextprotocol/specification/pull/1865
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R04 — Apps Extension (SEP-1865) surface detection.
 *
 * If the codebase mentions `mcp-apps`, `apps/render`, or `sandboxed-iframe`,
 * the server is participating in the Apps Extension surface. We report this as
 * `info` so the maintainer can confirm sandboxed-iframe support is configured
 * correctly. Not auto-patchable — the iframe-sandbox configuration is
 * deployment-specific.
 */
const PATTERNS = [/\bmcp-apps\b/i, /\bapps\/render\b/i, /\bsandboxed-iframe\b/i];

export const r04AppsExtension: Rule = {
  id: "r04-apps-extension",
  severity: "info",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/specification/pull/1865",
  description: "MCP Apps Extension (SEP-1865) surface detected — review sandboxed-iframe config.",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        const v = node.getLiteralValue();
        if (typeof v === "string" && PATTERNS.some((re) => re.test(v))) {
          violations.push(
            nodeViolation(
              r04AppsExtension,
              node,
              `Apps-Extension reference "${v}" — verify sandboxed-iframe headers + CSP.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
