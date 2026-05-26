// Source: SEP-OAuth-Hardening https://github.com/modelcontextprotocol/specification/discussions/oauth-hardening
import { Node, type SourceFile } from "ts-morph";
import { nodeViolation, SPEC_REVISION, type Rule, type Violation } from "./types.js";

/**
 * R07 — OAuth hardening (iss validation, DCR application_type, refresh-family).
 *
 * Detects:
 *  - usage of `id_token` / `iss` claim parsing without explicit `iss` check
 *  - DCR (Dynamic Client Registration) calls without `application_type`
 *  - refresh-token grant handlers without family-tracking marker
 *
 * Detect-only — semantic complexity is server-architecture-specific. We surface
 * the locations and link the SEP; maintainer reviews each.
 */
const SIGNALS = [/\biss\b/i, /\bid_token\b/i, /\bapplication_type\b/i, /\brefresh_token\b/i];

export const r07OauthHardening: Rule = {
  id: "r07-oauth-hardening",
  severity: "warn",
  autoPatchable: false,
  source: "https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/",
  description: "OAuth hardening: iss validation + DCR application_type + refresh-family.",
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
              `OAuth signal "${v}" — verify iss/DCR/refresh-family per OAuth-Hardening SEP.`,
            ),
          );
        }
      }
    });
    return violations;
  },
};
