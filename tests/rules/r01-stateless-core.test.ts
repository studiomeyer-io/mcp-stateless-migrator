import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { makeFixture } from "../helpers/fixture.js";

describe("r01-stateless-core", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("detects Mcp-Session-Id header literal (case-insensitive)", async () => {
    const fx = makeFixture({
      "server.ts": `
        export function handle(req: Request) {
          const sid = req.headers.get("Mcp-Session-Id");
          return new Response(sid ?? "no-session");
        }
      `,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r01-stateless-core"] });
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
    expect(report.violations[0]!.ruleId).toBe("r01-stateless-core");
    expect(report.violations[0]!.autoPatchable).toBe(false);
  });

  it("ignores unrelated string literals", async () => {
    const fx = makeFixture({
      "server.ts": `export const FOO = "Authorization";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r01-stateless-core"] });
    expect(report.violations).toHaveLength(0);
  });

  it("matches case-insensitively", async () => {
    const fx = makeFixture({
      "server.ts": `export const H = "mcp-session-id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r01-stateless-core"] });
    expect(report.violations).toHaveLength(1);
  });
});
