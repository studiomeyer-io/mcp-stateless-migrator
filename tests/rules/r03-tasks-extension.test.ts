import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { makeFixture } from "../helpers/fixture.js";

describe("r03-tasks-extension", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("detects tasks/list literal", async () => {
    const fx = makeFixture({
      "x.ts": `export const M = "tasks/list";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r03-tasks-extension"] });
    expect(report.violations).toHaveLength(1);
  });

  it("ignores tools/list (different method family)", async () => {
    const fx = makeFixture({
      "x.ts": `export const M = "tools/list";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r03-tasks-extension"] });
    expect(report.violations).toHaveLength(0);
  });

  it("distinguishes removed methods from extension methods", async () => {
    const fx = makeFixture({
      "x.ts": `const A = "tasks/result"; const B = "tasks/get";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r03-tasks-extension"] });
    expect(report.violations).toHaveLength(2);
    const removed = report.violations.find((v) => v.snippet.includes("tasks/result"));
    const ext = report.violations.find((v) => v.snippet.includes("tasks/get"));
    expect(removed!.message).toMatch(/REMOVED/);
    expect(ext!.message).toMatch(/extension/i);
  });

  it("flags tasks/result with the REMOVED + -32601 message", async () => {
    const fx = makeFixture({ "x.ts": `export const M = "tasks/result";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r03-tasks-extension"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.message).toMatch(/REMOVED/);
    expect(report.violations[0]!.message).toContain("-32601");
  });

  it("flags tasks/update as an extension method", async () => {
    const fx = makeFixture({ "x.ts": `export const M = "tasks/update";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r03-tasks-extension"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.message).toMatch(/extension/i);
    expect(report.violations[0]!.message).not.toMatch(/REMOVED/);
  });

  it("flags tasks/cancel as an extension method", async () => {
    const fx = makeFixture({ "x.ts": `export const M = "tasks/cancel";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r03-tasks-extension"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.message).toMatch(/extension/i);
  });

  it("flags an unknown tasks/* method with the reserved-prefix message", async () => {
    const fx = makeFixture({ "x.ts": `export const M = "tasks/foo";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r03-tasks-extension"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.message).toMatch(/reserved/i);
    expect(report.violations[0]!.message).not.toMatch(/REMOVED/);
  });

  it("ignores a tasks/ prefix that fails the method shape (uppercase start)", async () => {
    // TASK_METHOD requires a lowercase first char after the slash.
    const fx = makeFixture({ "x.ts": `export const M = "tasks/List";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r03-tasks-extension"] });
    expect(report.violations).toHaveLength(0);
  });
});
