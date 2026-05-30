import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { makeFixture } from "../helpers/fixture.js";

describe("r05-deprecations", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("flags deprecated methods", async () => {
    const fx = makeFixture({
      "d.ts": `
        export const A = "roots/list";
        export const B = "sampling/createMessage";
        export const C = "logging/setLevel";
      `,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r05-deprecations"] });
    expect(report.violations).toHaveLength(3);
    expect(report.violations.every((v) => v.severity === "warn")).toBe(true);
  });

  it("ignores non-deprecated methods", async () => {
    const fx = makeFixture({
      "d.ts": `export const X = "tools/list";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r05-deprecations"] });
    expect(report.violations).toHaveLength(0);
  });

  it("flags notifications/roots/list_changed", async () => {
    const fx = makeFixture({
      "d.ts": `export const N = "notifications/roots/list_changed";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r05-deprecations"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.severity).toBe("warn");
  });

  it("flags notifications/message (deprecated logging notification)", async () => {
    const fx = makeFixture({
      "d.ts": `export const N = "notifications/message";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r05-deprecations"] });
    expect(report.violations).toHaveLength(1);
  });

  it("requires an exact match — a longer literal is not flagged", async () => {
    // DEPRECATED_METHODS uses a Set with exact equality, not substring.
    const fx = makeFixture({
      "d.ts": `export const N = "roots/list/all";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r05-deprecations"] });
    expect(report.violations).toHaveLength(0);
  });
});
