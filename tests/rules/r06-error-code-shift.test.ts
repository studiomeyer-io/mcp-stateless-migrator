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

  it("does NOT match a positive 32002 (no minus) inside a code property", async () => {
    // matchesOldCode requires a PrefixUnaryExpression with a MinusToken.
    const fx = makeFixture({
      "err.ts": `export const E = { code: 32002, message: "x" };`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(report.violations).toHaveLength(0);
  });

  it("does NOT match -32002 assigned to a variable literally named code", async () => {
    // isCodeProperty only matches an object PropertyAssignment named `code`,
    // not a variable declaration named code.
    const fx = makeFixture({
      "err.ts": `export const code = -32002;`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(report.violations).toHaveLength(0);
  });

  it("does NOT match -32002 in a property NOT named code", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { status: -32002 };`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(report.violations).toHaveLength(0);
  });

  it("does NOT match a different negative code like -32601", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32601 };`,
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

  it("patches every occurrence in a multi-error file (H-1 regression)", async () => {
    const fx = makeFixture({
      "errs.ts":
        `export const A = { code: -32002, message: "a" };\n` +
        `export const B = { code: -32002, message: "b" };\n` +
        `export const C = { nested: { code: -32002 } };\n`,
    });
    cleanup = fx.cleanup;
    const result = await patchPath(fx.dir, {
      dryRun: false,
      backup: false,
      only: ["r06-error-code-shift"],
    });
    expect(result.patchedFiles).toBe(1);
    const after = fs.readFileSync(path.join(fx.dir, "errs.ts"), "utf8");
    expect(after).not.toContain("-32002");
    expect(after.match(/-32602/g)).toHaveLength(3);
    // Idempotent: a re-scan after patching finds nothing.
    const second = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(second.violations).toHaveLength(0);
  });
});
