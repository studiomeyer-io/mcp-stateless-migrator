// Source: SEP-Streamable-HTTP-Endpoint-Shape https://github.com/modelcontextprotocol/specification/discussions/streamable-http-shape
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R08 — Streamable HTTP endpoint shape changes.
 *
 * Detects literal "streamableHttp" and "/messages" path strings (old shape).
 * Servers must move to the new endpoint contract (request-id in query, no
 * persistent SSE). Detect-only.
 */
const OLD_SHAPE_PATTERNS = [/streamableHttp/, /^\/messages$/, /^\/sse$/];

export const r08EndpointShape: Rule = {
  id: "r08-endpoint-shape",
  severity: "warn",
  autoPatchable: false,
  source: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/",
  description: "Streamable HTTP endpoint shape changed (no /messages or /sse persistent path).",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        const v = node.getLiteralValue();
        if (typeof v === "string" && OLD_SHAPE_PATTERNS.some((re) => re.test(v))) {
          violations.push(
            nodeViolation(
              r08EndpointShape,
              node,
              `Endpoint shape "${v}" deprecated in 2026-07-28 RC.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
