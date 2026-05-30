// Source: SEP-2164 https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2164-resource-not-found-error.md
import { Node, SyntaxKind, type SourceFile } from "ts-morph";
import {
  nodeViolation,
  SPEC_REVISION,
  type PatchResult,
  type Rule,
  type Violation,
} from "./types.js";

/**
 * R06 — Resource-not-found error code shift -32002 -> -32602 (SEP-2164).
 *
 * The MCP-custom `-32002` ("resource not found") sits in the JSON-RPC
 * server-error range and is replaced by the standard `-32602` (Invalid Params).
 * Mechanically auto-patchable: numeric-literal swap inside an object property
 * named `code`.
 *
 * This is the ONLY rule that mutates code. Safeguards:
 *  - SEP-2164 is Draft status as of the 2026-07-28 RC — re-validate before final.
 *  - `patch` writes a `.bak.<ts>/` backup by default; every change is reversible.
 *  - The swap targets the resource-not-found case; if a server uses -32002 for an
 *    unrelated implementation-defined error, review the diff before applying.
 *
 * We only rewrite literals inside an object property named `code` to avoid
 * touching unrelated numbers (e.g. timeouts, ports).
 */
const OLD_CODE = -32002;
const NEW_CODE = -32602;

function isCodeProperty(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;
  if (parent.getKind() !== SyntaxKind.PropertyAssignment) return false;
  const name = (parent as import("ts-morph").PropertyAssignment).getName();
  return name === "code";
}

function matchesOldCode(node: Node): boolean {
  // PrefixUnaryExpression for negative numeric literal: -32002.
  if (Node.isPrefixUnaryExpression(node) && node.getOperatorToken() === SyntaxKind.MinusToken) {
    const operand = node.getOperand();
    if (Node.isNumericLiteral(operand) && Number(operand.getLiteralValue()) === Math.abs(OLD_CODE)) {
      return true;
    }
  }
  return false;
}

function collectTargets(file: SourceFile): Node[] {
  const targets: Node[] = [];
  file.forEachDescendant((node) => {
    if (matchesOldCode(node) && isCodeProperty(node)) targets.push(node);
  });
  return targets;
}

export const r06ErrorCodeShift: Rule = {
  id: "r06-error-code-shift",
  severity: "error",
  autoPatchable: true,
  source: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2164-resource-not-found-error.md",
  description:
    "Resource-not-found error code -32002 -> -32602 (SEP-2164, Draft). Auto-patch on { code: -32002 } props.",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    return collectTargets(file).map((node) =>
      nodeViolation(
        r06ErrorCodeShift,
        node,
        "Error code -32002 must shift to -32602 (Invalid Params) per SEP-2164.",
      ),
    );
  },

  patch(file: SourceFile): PatchResult[] {
    const targets = collectTargets(file);
    if (targets.length === 0) return [];
    // Replace right-to-left so an earlier rewrite never invalidates the source
    // position of a node we still have to visit (forEachDescendant must NOT
    // mutate mid-traversal — collect first, then mutate).
    targets.sort((a, b) => b.getStart() - a.getStart());
    for (const node of targets) {
      node.replaceWithText(String(NEW_CODE));
    }
    return [
      {
        ruleId: r06ErrorCodeShift.id,
        file: file.getFilePath(),
        applied: true,
      },
    ];
  },
};
