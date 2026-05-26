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
});
