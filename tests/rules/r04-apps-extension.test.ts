import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { makeFixture } from "../helpers/fixture.js";

describe("r04-apps-extension", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("flags sandboxed-iframe references as info", async () => {
    const fx = makeFixture({
      "apps.ts": `export const KEY = "sandboxed-iframe";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.severity).toBe("info");
  });

  it("ignores unrelated literals", async () => {
    const fx = makeFixture({
      "apps.ts": `export const KEY = "iframe";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(0);
  });
});
