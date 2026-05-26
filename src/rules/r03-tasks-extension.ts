// Source: SEP-Tasks-Extension https://github.com/modelcontextprotocol/specification/discussions/tasks-extension
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R03 — Tasks moved to extension.
 *
 * The 2026-07-28 RC moves `tasks/*` JSON-RPC methods out of core. Any string
 * literal that references `tasks/list`, `tasks/get`, `tasks/cancel`,
 * `tasks/result`, or matches the regex `^tasks/` triggers a warning.
 *
 * Detect-only: maintainer must decide whether to (a) adopt the extension SDK
 * surface or (b) drop tasks entirely.
 */
const TASK_METHODS = /^tasks\/[a-z][a-zA-Z0-9_]*$/;

export const r03TasksExtension: Rule = {
  id: "r03-tasks-extension",
  severity: "warn",
  autoPatchable: false,
  source: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/",
  description: "Tasks/* methods moved out of core into an extension. Detected in string literals.",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        const v = node.getLiteralValue();
        if (typeof v === "string" && TASK_METHODS.test(v)) {
          violations.push(
            nodeViolation(
              r03TasksExtension,
              node,
              `Method "${v}" moved to tasks-extension in 2026-07-28 RC. Adopt extension SDK or drop.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
