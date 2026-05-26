import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../src/scanner.js";
import { formatScan } from "../src/reporter.js";
import { makeFixture } from "./helpers/fixture.js";

describe("reporter output formats", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("formats JSON validly", async () => {
    const fx = makeFixture({ "x.ts": `export const A = "Mcp-Session-Id";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const out = formatScan(report, "json");
    const parsed = JSON.parse(out) as { violations: unknown[] };
    expect(Array.isArray(parsed.violations)).toBe(true);
  });

  it("markdown includes the rule coverage table", async () => {
    const fx = makeFixture({ "x.ts": `export const A = "Mcp-Session-Id";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const md = formatScan(report, "md");
    expect(md).toContain("Rule coverage");
    expect(md).toContain("r01-stateless-core");
  });

  it("html wraps the markdown", async () => {
    const fx = makeFixture({ "x.ts": `export const A = "Mcp-Session-Id";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const html = formatScan(report, "html");
    expect(html).toContain("<!doctype html>");
  });

  it("text format renders without throwing", async () => {
    const fx = makeFixture({ "x.ts": `export const A = "Mcp-Session-Id";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const text = formatScan(report, "text");
    expect(text).toContain("scan report");
  });
});
