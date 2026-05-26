import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { makeFixture } from "../helpers/fixture.js";

describe("r07-oauth-hardening", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("flags OAuth signals as warn (manual review required)", async () => {
    const fx = makeFixture({
      "oauth.ts": `export const FIELDS = ["iss", "id_token"];`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r07-oauth-hardening"] });
    expect(report.violations.length).toBeGreaterThanOrEqual(1);
    expect(report.violations[0]!.severity).toBe("warn");
    expect(report.violations[0]!.autoPatchable).toBe(false);
  });

  it("ignores unrelated string literals", async () => {
    const fx = makeFixture({
      "oauth.ts": `export const X = "client_id";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r07-oauth-hardening"] });
    expect(report.violations).toHaveLength(0);
  });
});
