import { describe, expect, it } from "vitest";
import { RULES, getRule, filterRules } from "../../src/rules/index.js";

describe("rules registry: RULES invariants", () => {
  it("has exactly 8 entries", () => {
    expect(RULES).toHaveLength(8);
  });

  it("every rule id is unique", () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ids follow the r0N-* naming convention", () => {
    for (const r of RULES) {
      expect(r.id).toMatch(/^r0[1-8]-[a-z-]+$/);
    }
  });

  it("every rule has a non-empty https source", () => {
    for (const r of RULES) {
      expect(typeof r.source).toBe("string");
      expect(r.source.length).toBeGreaterThan(0);
      expect(r.source.startsWith("https://")).toBe(true);
    }
  });

  it("every rule has a non-empty description + specRevision", () => {
    for (const r of RULES) {
      expect(r.description.length).toBeGreaterThan(0);
      expect(r.specRevision.length).toBeGreaterThan(0);
    }
  });

  it("every rule has a valid severity", () => {
    const valid = new Set(["info", "warn", "error", "critical"]);
    for (const r of RULES) {
      expect(valid.has(r.severity)).toBe(true);
    }
  });

  it("every autoPatchable rule actually defines patch()", () => {
    for (const r of RULES) {
      if (r.autoPatchable) {
        expect(typeof r.patch).toBe("function");
      }
    }
  });

  it("exactly one rule (r06) is auto-patchable in the current set", () => {
    const patchable = RULES.filter((r) => r.autoPatchable);
    expect(patchable).toHaveLength(1);
    expect(patchable[0]!.id).toBe("r06-error-code-shift");
  });

  it("preserves registry order r01..r08", () => {
    expect(RULES.map((r) => r.id)).toEqual([
      "r01-stateless-core",
      "r02-mandatory-headers",
      "r03-tasks-extension",
      "r04-apps-extension",
      "r05-deprecations",
      "r06-error-code-shift",
      "r07-oauth-hardening",
      "r08-endpoint-shape",
    ]);
  });
});

describe("rules registry: getRule", () => {
  it("returns the matching rule by id", () => {
    const r = getRule("r06-error-code-shift");
    expect(r).toBeDefined();
    expect(r!.id).toBe("r06-error-code-shift");
    expect(r!.autoPatchable).toBe(true);
  });

  it("returns undefined for an unknown id", () => {
    expect(getRule("r99-nope")).toBeUndefined();
  });

  it("is case-sensitive on the id", () => {
    expect(getRule("R06-ERROR-CODE-SHIFT")).toBeUndefined();
  });
});

describe("rules registry: filterRules", () => {
  it("returns the subset in registry order regardless of input order", () => {
    const subset = filterRules(["r05-deprecations", "r01-stateless-core"]);
    expect(subset.map((r) => r.id)).toEqual([
      "r01-stateless-core",
      "r05-deprecations",
    ]);
  });

  it("ignores ids that do not exist", () => {
    const subset = filterRules(["r06-error-code-shift", "r99-nope"]);
    expect(subset).toHaveLength(1);
    expect(subset[0]!.id).toBe("r06-error-code-shift");
  });

  it("returns an empty array for an empty input", () => {
    expect(filterRules([])).toHaveLength(0);
  });
});
