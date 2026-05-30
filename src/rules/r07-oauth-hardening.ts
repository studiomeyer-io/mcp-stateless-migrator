// Source: SEP-2468 https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2468-recommend-issuer-claim-for-auth.md
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R07 — OAuth hardening cluster.
 *
 * The 2026-07-28 RC tightens authorization across several SEPs:
 *  - `iss` parameter validation per RFC 9207 (SEP-2468)
 *  - `application_type` on Dynamic Client Registration (SEP-837)
 *  - OIDC-flavored refresh-token guidance (SEP-2207)
 *
 * We surface string-literal signals so the maintainer reviews each call site.
 * Detect-only — the semantics are server-architecture-specific.
 *
 * NOTE: the `iss` signal is intentionally broad and may false-positive on any
 * literal containing the word "iss". It is `warn` + non-patchable; review the
 * context before acting.
 */
const SIGNALS = [/\biss\b/i, /\bid_token\b/i, /\bapplication_type\b/i, /\brefresh_token\b/i];

export const r07OauthHardening: Rule = {
  id: "r07-oauth-hardening",
  severity: "warn",
  autoPatchable: false,
  source: "https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2468-recommend-issuer-claim-for-auth.md",
  description: "OAuth hardening: iss validation (SEP-2468) + DCR application_type (SEP-837) + OIDC refresh (SEP-2207).",
  specRevision: SPEC_REVISION,

  detect(file: SourceFile): Violation[] {
    const violations: Violation[] = [];
    file.forEachDescendant((node) => {
      if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
        const v = node.getLiteralValue();
        if (typeof v === "string" && SIGNALS.some((re) => re.test(v))) {
          violations.push(
            nodeViolation(
              r07OauthHardening,
              node,
              `OAuth signal "${v}" — verify iss (RFC 9207 / SEP-2468), DCR application_type (SEP-837), refresh-token (SEP-2207).`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
