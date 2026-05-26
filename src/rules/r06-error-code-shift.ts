// Source: SEP-2164 https://github.com/modelcontextprotocol/specification/pull/2164
import { Node, SyntaxKind, type SourceFile } from "ts-morph";
import {
  nodeViolation,
  SPEC_REVISION,
  type PatchResult,
  type Rule,
  type Violation,
} from "./types.js";

/**
 * R06 — Error code shift -32002 -> -32602 (SEP-2164).
 *
 * The old `-32002` (custom server error) collides with downstream JSON-RPC
 * proxies and is replaced by the more semantically appropriate `-32602`
 * (invalid params). Mechanically auto-patchable: numeric literal swap.
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
  // Plain numeric literal already negative? TypeScript represents -N as
  // PrefixUnary, but we also accept the literal "32002" if used as
  // `Math.sign * 32002` — handled above. Direct numeric -32002 lives in
  // PrefixUnary, so this branch is the precaution for parsed JSON.
  return false;
}

export const r06ErrorCodeShift: Rule = {
  id: "r06-error-code-shift",
  severity: "error",
  autoPatchable: true,
  source: "https://github.com/modelcontextprotocol/specification/pull/2164",
  description: "Error code -32002 -> -32602 (SEP-2164). Auto-patch on { code: -32002 } props.",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (matchesOldCode(node) && isCodeProperty(node)) {
        violations.push(
          nodeViolation(
            r06ErrorCodeShift,
            node,
            "Error code -32002 must shift to -32602 per SEP-2164.",
          ),
        );
      }
    });
    return violations;
  },

  patch(file: SourceFile): PatchResult[] {
    const results: PatchResult[] = [];
    let changed = 0;
    file.forEachDescendant((node) => {
      if (matchesOldCode(node) && isCodeProperty(node)) {
        // PrefixUnaryExpression: replace with new literal "-32602".
        node.replaceWithText(String(NEW_CODE));
        changed += 1;
      }
    });
    if (changed > 0) {
      results.push({
        ruleId: r06ErrorCodeShift.id,
        file: file.getFilePath(),
        applied: true,
      });
    }
    return results;
  },
};
