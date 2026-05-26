import { r01StatelessCore } from "./r01-stateless-core.js";
import { r02MandatoryHeaders } from "./r02-mandatory-headers.js";
import { r03TasksExtension } from "./r03-tasks-extension.js";
import { r04AppsExtension } from "./r04-apps-extension.js";
import { r05Deprecations } from "./r05-deprecations.js";
import { r06ErrorCodeShift } from "./r06-error-code-shift.js";
import { r07OauthHardening } from "./r07-oauth-hardening.js";
import { r08EndpointShape } from "./r08-endpoint-shape.js";
import type { Rule } from "./types.js";

/** Registry of all migration rules. Order matters for determinism in reports. */
export const RULES: ReadonlyArray<Rule> = [
  r01StatelessCore,
  r02MandatoryHeaders,
  r03TasksExtension,
  r04AppsExtension,
  r05Deprecations,
  r06ErrorCodeShift,
  r07OauthHardening,
  r08EndpointShape,
];

export function getRule(id: string): Rule | undefined {
  return RULES.find((r) => r.id === id);
}

export function filterRules(ids: ReadonlyArray<string>): Rule[] {
  return RULES.filter((r) => ids.includes(r.id));
}

export * from "./types.js";
