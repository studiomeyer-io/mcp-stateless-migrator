// Source: SEP-2663 https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2663-tasks-extension.md
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R03 — Tasks moved to the `io.modelcontextprotocol/tasks` extension (SEP-2663).
 *
 * The experimental core Tasks feature from `2025-11-25` is redesigned and moved
 * out of the core protocol into an official extension. Two distinct cases the
 * migrator must NOT conflate:
 *  - REMOVED: `tasks/list` and `tasks/result` no longer exist. A server still
 *    answering `tasks/result` MUST return -32601 (Method Not Found).
 *  - EXTENSION: `tasks/get`, `tasks/update`, `tasks/cancel` are the new methods,
 *    valid only when the `io.modelcontextprotocol/tasks` extension capability is
 *    negotiated — they are not core methods.
 *
 * Detect-only: the maintainer adopts the extension capability or drops tasks.
 */
const REMOVED_METHODS = new Set(["tasks/list", "tasks/result"]);
const EXTENSION_METHODS = new Set(["tasks/get", "tasks/update", "tasks/cancel"]);
const TASK_METHOD = /^tasks\/[a-z][a-zA-Z0-9_]*$/;

export const r03TasksExtension: Rule = {
  id: "r03-tasks-extension",
  severity: "warn",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2663-tasks-extension.md",
  description:
    "Tasks moved to the io.modelcontextprotocol/tasks extension (SEP-2663): tasks/list + tasks/result removed; tasks/get|update|cancel are extension-only.",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (!Node.isStringLiteral(node) && !Node.isNoSubstitutionTemplateLiteral(node)) return;
      const v = node.getLiteralValue();
      if (typeof v !== "string" || !TASK_METHOD.test(v)) return;

      let message: string;
      if (REMOVED_METHODS.has(v)) {
        message = `Method "${v}" is REMOVED in the SEP-2663 Tasks extension — a server still answering it MUST return -32601 (Method Not Found). Migrate to tasks/get polling.`;
      } else if (EXTENSION_METHODS.has(v)) {
        message = `Method "${v}" is now part of the io.modelcontextprotocol/tasks extension (SEP-2663) — valid only when that extension capability is negotiated, not in core.`;
      } else {
        message = `Method "${v}" sits under the tasks/ prefix reserved for the io.modelcontextprotocol/tasks extension (SEP-2663). Confirm against the extension surface.`;
      }
      violations.push(nodeViolation(r03TasksExtension, node, message));
    });
    return violations;
  },
};
