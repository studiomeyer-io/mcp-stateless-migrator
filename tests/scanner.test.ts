import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../src/scanner.js";
import { makeFixture } from "./helpers/fixture.js";

describe("scanner: multi-file aggregation", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("aggregates byRule + bySeverity across multiple files", async () => {
    const fx = makeFixture({
      "a.ts": `export const A = "Mcp-Session-Id";`,
      "b.ts": `export const B = { code: -32002, message: "x" };`,
      "c.ts": `export const C = "roots/list";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    expect(report.scannedFiles).toBe(3);
    // r01 (warn), r06 (error), r05 (warn) each fire once.
    expect(report.byRule["r01-stateless-core"]).toBe(1);
    expect(report.byRule["r06-error-code-shift"]).toBe(1);
    expect(report.byRule["r05-deprecations"]).toBe(1);
    expect(report.bySeverity.warn).toBe(2);
    expect(report.bySeverity.error).toBe(1);
    expect(report.bySeverity.critical).toBe(0);
    // byRule counts sum to total violations.
    const byRuleSum = Object.values(report.byRule).reduce((a, b) => a + b, 0);
    expect(byRuleSum).toBe(report.violations.length);
  });

  it("bySeverity sums equal total violation count", async () => {
    const fx = makeFixture({
      "x.ts": `
        export const A = "Mcp-Session-Id";
        export const B = "tasks/list";
        export const E = { code: -32002 };
      `,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const sevSum =
      report.bySeverity.info +
      report.bySeverity.warn +
      report.bySeverity.error +
      report.bySeverity.critical;
    expect(sevSum).toBe(report.violations.length);
  });

  it("counts the same rule firing in multiple files", async () => {
    const fx = makeFixture({
      "one.ts": `export const A = "Mcp-Session-Id";`,
      "two.ts": `export const B = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r01-stateless-core"] });
    expect(report.byRule["r01-stateless-core"]).toBe(2);
    expect(report.violations).toHaveLength(2);
  });

  it("includes a populated specRevision + ISO scannedAt", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    expect(report.specRevision.length).toBeGreaterThan(0);
    expect(() => new Date(report.scannedAt).toISOString()).not.toThrow();
    expect(report.scannedAt).toBe(new Date(report.scannedAt).toISOString());
  });
});

describe("scanner: IGNORE globs", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("skips node_modules", async () => {
    const fx = makeFixture({
      "src.ts": `export const OK = 1;`,
      "node_modules/dep/index.ts": `export const BAD = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    expect(report.violations).toHaveLength(0);
    expect(report.scannedFiles).toBe(1);
  });

  it("skips dist/", async () => {
    const fx = makeFixture({
      "src.ts": `export const OK = 1;`,
      "dist/out.js": `export const BAD = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    expect(report.violations).toHaveLength(0);
    expect(report.scannedFiles).toBe(1);
  });

  it("skips .bak.* backup directories", async () => {
    const fx = makeFixture({
      "src.ts": `export const OK = 1;`,
      ".bak.2026-01-01T00-00-00-000Z/old.ts": `export const BAD = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    expect(report.violations).toHaveLength(0);
    expect(report.scannedFiles).toBe(1);
  });
});

describe("scanner: path resolution + robustness", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("throws for a non-existent path", async () => {
    await expect(
      scanPath("/this/path/should/never/exist/mcp-stateless-migrator-xyz"),
    ).rejects.toThrow(/Path does not exist/);
  });

  it("accepts a single file path (resolves to its directory)", async () => {
    const fx = makeFixture({ "single.ts": `export const A = "Mcp-Session-Id";` });
    cleanup = fx.cleanup;
    const report = await scanPath(`${fx.dir}/single.ts`);
    // resolveRoot points at the directory, so the file is picked up.
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
  });

  it("silently skips a file with a syntax error and still scans the rest", async () => {
    const fx = makeFixture({
      "broken.ts": `export const = = = function (((;`,
      "good.ts": `export const A = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    // Must not throw despite the unparseable file.
    const report = await scanPath(fx.dir);
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
    expect(report.violations.some((v) => v.ruleId === "r01-stateless-core")).toBe(true);
  });

  it("returns a clean empty report on a directory with no source files", async () => {
    const fx = makeFixture({ "README.md": `# not source` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    expect(report.scannedFiles).toBe(0);
    expect(report.violations).toHaveLength(0);
    expect(report.byRule).toEqual({});
  });
});

describe("scanner: opts.only rule filtering", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("restricts detection to the requested rule id", async () => {
    const fx = makeFixture({
      "x.ts": `
        export const A = "Mcp-Session-Id";
        export const E = { code: -32002 };
      `,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(report.violations.every((v) => v.ruleId === "r06-error-code-shift")).toBe(true);
    expect(report.violations).toHaveLength(1);
  });

  it("an empty only array falls back to all rules", async () => {
    const fx = makeFixture({
      "x.ts": `
        export const A = "Mcp-Session-Id";
        export const E = { code: -32002 };
      `,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: [] });
    const ids = new Set(report.violations.map((v) => v.ruleId));
    expect(ids.has("r01-stateless-core")).toBe(true);
    expect(ids.has("r06-error-code-shift")).toBe(true);
  });

  it("an only id that matches no rule yields zero violations", async () => {
    const fx = makeFixture({ "x.ts": `export const A = "Mcp-Session-Id";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r99-does-not-exist"] });
    expect(report.violations).toHaveLength(0);
  });
});

describe("scanner: file-extension coverage", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("picks up .tsx files", async () => {
    const fx = makeFixture({
      "ui.tsx": `export const A = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r01-stateless-core"] });
    expect(report.scannedFiles).toBe(1);
    expect(report.violations).toHaveLength(1);
  });

  it("picks up .mjs files", async () => {
    const fx = makeFixture({
      "mod.mjs": `export const A = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r01-stateless-core"] });
    expect(report.scannedFiles).toBe(1);
    expect(report.violations).toHaveLength(1);
  });

  it("picks up .cjs files", async () => {
    const fx = makeFixture({
      "mod.cjs": `const A = "Mcp-Session-Id"; module.exports = { A };`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r01-stateless-core"] });
    expect(report.scannedFiles).toBe(1);
    expect(report.violations).toHaveLength(1);
  });

  it("custom patterns override the default globs", async () => {
    const fx = makeFixture({
      "a.ts": `export const A = "Mcp-Session-Id";`,
      "b.js": `export const B = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, {
      only: ["r01-stateless-core"],
      patterns: ["**/*.ts"],
    });
    expect(report.scannedFiles).toBe(1);
    expect(report.violations).toHaveLength(1);
  });
});
