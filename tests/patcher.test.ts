import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { patchPath, diffPath } from "../src/patcher.js";
import { makeFixture } from "./helpers/fixture.js";

function hasBackupDir(dir: string): boolean {
  return fs.readdirSync(dir).some((e) => e.startsWith(".bak."));
}

describe("patcher: diffPath", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("returns a unified diff containing the old + new error codes", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002, message: "x" };\n`,
    });
    cleanup = fx.cleanup;
    const diff = await diffPath(fx.dir);
    expect(diff.length).toBeGreaterThan(0);
    expect(diff).toContain("-32002");
    expect(diff).toContain("-32602");
    // Unified-diff framing markers are present.
    expect(diff).toContain("@@");
  });

  it("returns an empty string when nothing is patchable", async () => {
    const fx = makeFixture({
      // r01 fires but is NOT auto-patchable, so diff stays empty.
      "x.ts": `export const A = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const diff = await diffPath(fx.dir);
    expect(diff).toBe("");
  });

  it("does not write to disk while computing the diff", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002 };\n`,
    });
    cleanup = fx.cleanup;
    const before = fs.readFileSync(path.join(fx.dir, "err.ts"), "utf8");
    await diffPath(fx.dir);
    const after = fs.readFileSync(path.join(fx.dir, "err.ts"), "utf8");
    expect(after).toBe(before);
    expect(hasBackupDir(fx.dir)).toBe(false);
  });

  it("honors the only filter (subset that excludes the patchable rule = empty)", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002 };\n`,
    });
    cleanup = fx.cleanup;
    const diff = await diffPath(fx.dir, ["r01-stateless-core"]);
    expect(diff).toBe("");
  });
});

describe("patcher: backup behavior", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("writes no .bak.* dir when backup:false", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002 };\n`,
    });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, {
      dryRun: false,
      backup: false,
      only: ["r06-error-code-shift"],
    });
    expect(report.patchedFiles).toBe(1);
    expect(report.backupDir).toBeNull();
    expect(hasBackupDir(fx.dir)).toBe(false);
    // the file itself was still patched.
    const after = fs.readFileSync(path.join(fx.dir, "err.ts"), "utf8");
    expect(after).toContain("-32602");
  });

  it("creates a .bak.* dir mirroring the patched file when backup:true", async () => {
    const fx = makeFixture({
      "nested/err.ts": `export const E = { code: -32002 };\n`,
    });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, {
      dryRun: false,
      backup: true,
      only: ["r06-error-code-shift"],
    });
    expect(report.backupDir).toBeTruthy();
    expect(hasBackupDir(fx.dir)).toBe(true);
    // the backup keeps the original (pre-patch) content at the mirrored path.
    const backedUp = fs.readFileSync(
      path.join(report.backupDir!, "nested", "err.ts"),
      "utf8",
    );
    expect(backedUp).toContain("-32002");
    expect(backedUp).not.toContain("-32602");
  });

  it("creates no backup dir when there is nothing to patch", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, { dryRun: false, backup: true });
    expect(report.patchedFiles).toBe(0);
    expect(report.backupDir).toBeNull();
    expect(hasBackupDir(fx.dir)).toBe(false);
  });
});

describe("patcher: dry-run", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("reports dryRun:true, writes nothing, creates no backup", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002 };\n`,
    });
    cleanup = fx.cleanup;
    const before = fs.readFileSync(path.join(fx.dir, "err.ts"), "utf8");
    const report = await patchPath(fx.dir, {
      dryRun: true,
      backup: true,
      only: ["r06-error-code-shift"],
    });
    expect(report.dryRun).toBe(true);
    // patchedFiles still reflects what WOULD change.
    expect(report.patchedFiles).toBe(1);
    // ...but nothing was written and no backup was created.
    const after = fs.readFileSync(path.join(fx.dir, "err.ts"), "utf8");
    expect(after).toBe(before);
    expect(report.backupDir).toBeNull();
    expect(hasBackupDir(fx.dir)).toBe(false);
  });
});

describe("patcher: changelogAppendHint", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("is populated when a patch applies", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002 };\n`,
    });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, {
      dryRun: false,
      backup: false,
      only: ["r06-error-code-shift"],
    });
    expect(report.changelogAppendHint.length).toBeGreaterThan(0);
    expect(report.changelogAppendHint).toContain("[Unreleased]");
    expect(report.changelogAppendHint).toContain("### Changed");
    expect(report.changelogAppendHint).toContain(report.specRevision);
    // it lists the relative path of the modified file.
    expect(report.changelogAppendHint).toContain("err.ts");
  });

  it("is empty when no patch applies", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, { dryRun: false, backup: false });
    expect(report.changelogAppendHint).toBe("");
  });

  it("is still populated on a dry-run that would change a file", async () => {
    const fx = makeFixture({
      "err.ts": `export const E = { code: -32002 };\n`,
    });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, {
      dryRun: true,
      backup: false,
      only: ["r06-error-code-shift"],
    });
    expect(report.changelogAppendHint).toContain("[Unreleased]");
  });
});

describe("patcher: only filter + non-patchable reporting", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("restricting only to the patchable rule skips non-patchable reports", async () => {
    const fx = makeFixture({
      "x.ts": `export const A = "Mcp-Session-Id"; export const E = { code: -32002 };`,
    });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, {
      dryRun: false,
      backup: false,
      only: ["r06-error-code-shift"],
    });
    // every result row belongs to the patchable rule.
    expect(report.results.length).toBeGreaterThan(0);
    expect(report.results.every((r) => r.ruleId === "r06-error-code-shift")).toBe(true);
    expect(report.results.some((r) => r.applied)).toBe(true);
  });

  it("restricting only to a non-patchable rule patches nothing but reports it", async () => {
    const fx = makeFixture({
      "x.ts": `export const A = "Mcp-Session-Id";`,
    });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, {
      dryRun: false,
      backup: false,
      only: ["r01-stateless-core"],
    });
    expect(report.patchedFiles).toBe(0);
    // the non-patchable hit is surfaced as applied:false with a reason.
    const row = report.results.find((r) => r.ruleId === "r01-stateless-core");
    expect(row).toBeDefined();
    expect(row!.applied).toBe(false);
    expect(row!.reason).toMatch(/not auto-patchable/i);
  });

  it("a full-fleet patch reports both applied + non-applied rows", async () => {
    const fx = makeFixture({
      "x.ts": `
        export const A = "Mcp-Session-Id";
        export const E = { code: -32002 };
      `,
    });
    cleanup = fx.cleanup;
    const report = await patchPath(fx.dir, { dryRun: false, backup: false });
    expect(report.results.some((r) => r.applied)).toBe(true);
    expect(report.results.some((r) => !r.applied)).toBe(true);
    // formattedFiles is empty when formatAfter is not requested.
    expect(report.formattedFiles).toEqual([]);
  });
});
