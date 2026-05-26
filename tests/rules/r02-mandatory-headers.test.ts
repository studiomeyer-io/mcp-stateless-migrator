import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { makeFixture } from "../helpers/fixture.js";

describe("r02-mandatory-headers", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("flags partial adoption (1 of 3 headers)", async () => {
    const fx = makeFixture({
      "h.ts": `export const HEADER = "MCP-Protocol-Version";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r02-mandatory-headers"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.message).toMatch(/Mcp-Method/);
    expect(report.violations[0]!.message).toMatch(/Mcp-Name/);
  });

  it("is silent when all 3 headers present", async () => {
    const fx = makeFixture({
      "h.ts": `
        export const A = "MCP-Protocol-Version";
        export const B = "Mcp-Method";
        export const C = "Mcp-Name";
      `,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r02-mandatory-headers"] });
    expect(report.violations).toHaveLength(0);
  });

  it("is silent when no headers present (out of scope, not partial)", async () => {
    const fx = makeFixture({
      "h.ts": `export const X = "Authorization";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r02-mandatory-headers"] });
    expect(report.violations).toHaveLength(0);
  });
});
