// Source: SEP-1865 https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp.md
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R04 — MCP Apps extension (SEP-1865) surface detection.
 *
 * The MCP Apps extension is identified by `io.modelcontextprotocol/ui` and
 * declares interactive UI resources via the `ui://` URI scheme with the
 * `text/html;profile=mcp-app` content type, rendered in a sandboxed iframe.
 * If the codebase references any of these markers it participates in the Apps
 * surface. Reported as `info` so the maintainer can confirm sandboxed-iframe +
 * CSP configuration — not auto-patchable (deployment-specific).
 */
const PATTERNS = [
  /^ui:\/\//i, // ui:// resource scheme
  /text\/html;\s*profile=mcp-app/i, // MCP Apps content type
  /io\.modelcontextprotocol\/ui/i, // extension identifier
  /\bsandboxed-iframe\b/i, // deployment / CSP signal
];

export const r04AppsExtension: Rule = {
  id: "r04-apps-extension",
  severity: "info",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp.md",
  description: "MCP Apps Extension (SEP-1865, io.modelcontextprotocol/ui) surface detected — review ui:// + sandboxed-iframe/CSP config.",
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
              `MCP Apps (SEP-1865) surface "${v}" — verify ui:// resources, text/html;profile=mcp-app content type, and sandboxed-iframe + CSP config.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
