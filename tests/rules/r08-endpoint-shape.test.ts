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

  it("detects /sse path literal (legacy HTTP+SSE transport)", async () => {
    const fx = makeFixture({
      "routes.ts": `export const STREAM = "/sse";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(1);
  });

  it("ignores streamableHttp (the current transport, not the legacy shape)", async () => {
    const fx = makeFixture({
      "routes.ts": `export const T = "streamableHttp";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(0);
  });

  it("ignores unrelated paths", async () => {
    const fx = makeFixture({
      "routes.ts": `export const HEALTH = "/health";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(0);
  });

  it("does NOT match /messages/extra (patterns are anchored)", async () => {
    const fx = makeFixture({
      "routes.ts": `export const ROUTE = "/messages/extra";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(0);
  });

  it("does NOT match /sse-stream (anchored, no trailing chars allowed)", async () => {
    const fx = makeFixture({
      "routes.ts": `export const ROUTE = "/sse-stream";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(0);
  });

  it("does NOT match /api/messages (anchored, no leading prefix allowed)", async () => {
    const fx = makeFixture({
      "routes.ts": `export const ROUTE = "/api/messages";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(0);
  });

  it("is case-sensitive — /SSE is not the legacy path", async () => {
    // OLD_SHAPE_PATTERNS have no `i` flag.
    const fx = makeFixture({
      "routes.ts": `export const ROUTE = "/SSE";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(0);
  });

  it("detects both /sse and /messages in the same file", async () => {
    const fx = makeFixture({
      "routes.ts": `const A = "/sse"; const B = "/messages";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r08-endpoint-shape"] });
    expect(report.violations).toHaveLength(2);
  });
});
