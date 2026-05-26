import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { makeFixture } from "../helpers/fixture.js";

describe("r08-endpoint-shape", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("detects /messages path literal", async () => {
    const fx = makeFixture({
      "routes.ts": `export const ROUTE = "/messages";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(1);
  });

  it("detects streamableHttp literal", async () => {
    const fx = makeFixture({
      "routes.ts": `export const T = "streamableHttp";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(1);
  });

  it("ignores unrelated paths", async () => {
    const fx = makeFixture({
      "routes.ts": `export const HEALTH = "/health";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(0);
  });
});
