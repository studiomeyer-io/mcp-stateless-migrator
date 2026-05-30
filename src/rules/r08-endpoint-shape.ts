// Source: SEP-2596 https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2596-spec-feature-lifecycle-and-deprecation.md
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R08 — Legacy HTTP+SSE transport endpoint shape.
 *
 * The 2024-11-05 HTTP+SSE transport (a `/sse` GET event-stream plus a
 * `/messages` POST endpoint) is Deprecated and reclassified under the feature
 * lifecycle policy (SEP-2596). The sessionless rework (SEP-2567) removes the
 * per-connection session those paths assumed. Servers should expose the single
 * Streamable HTTP endpoint instead. Detect-only.
 */
const OLD_SHAPE_PATTERNS = [/^\/messages$/, /^\/sse$/];

export const r08EndpointShape: Rule = {
  id: "r08-endpoint-shape",
  severity: "warn",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2596-spec-feature-lifecycle-and-deprecation.md",
  description: "Legacy HTTP+SSE transport (/sse + /messages) deprecated (SEP-2596) — move to the single Streamable HTTP endpoint.",
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
              `Legacy transport path "${v}" — HTTP+SSE is deprecated (SEP-2596); migrate to the single Streamable HTTP endpoint.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
