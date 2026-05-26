import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { patchPath } from "../../src/patcher.js";
import { makeFixture } from "../helpers/fixture.js";
import fs from "node:fs";
import path from "node:path";

describe("r06-error-code-shift", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("detects -32002 inside a code property", async () => {
    const fx = makeFixture({
      "err.ts": `
        export const E = { code: -32002, message: "bad" };
      `,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.autoPatchable).toBe(true);
  });

  it("ignores -32002 in unrelated context", async () => {
    const fx = makeFixture({
      "err.ts": `export const TIMEOUT = -32002;`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(report.violations).toHaveLength(0);
  });

  it("patches -32002 -> -32602 with backup", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002, message: "bad" };\n`,
    });
    cleanup = fx.cleanup;
    const result = await patchPath(fx.dir, {
      dryRun: false,
      backup: true,
      only: ["r06-error-code-shift"],
    });
    expect(result.patchedFiles).toBe(1);
    expect(result.backupDir).toBeTruthy();
    const after = fs.readFileSync(path.join(fx.dir, "err.ts"), "utf8");
    expect(after).toContain("-32602");
    expect(after).not.toContain("-32002");
    // Re-running should be a no-op (idempotent).
    const second = await patchPath(fx.dir, {
      dryRun: false,
      backup: false,
      only: ["r06-error-code-shift"],
    });
    expect(second.patchedFiles).toBe(0);
  });

  it("dry-run does not modify files", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002, message: "bad" };`,
    });
    cleanup = fx.cleanup;
    const original = fs.readFileSync(path.join(fx.dir, "err.ts"), "utf8");
    await patchPath(fx.dir, { dryRun: true, backup: false, only: ["r06-error-code-shift"] });
    const after = fs.readFileSync(path.join(fx.dir, "err.ts"), "utf8");
    expect(after).toBe(original);
  });
});
