import { afterEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeFixture } from "../helpers/fixture.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(__dirname, "..", "..", "dist", "cli.js");

function runCli(args: string[]): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  return { stdout: result.stdout ?? "", stderr: result.stderr ?? "", status: result.status };
}

describe("CLI exit codes", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("scan exits 0 on a clean tree", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const r = runCli(["scan", fx.dir, "--format", "json"]);
    expect(r.status).toBe(0);
  });

  it("scan exits 1 on violations", async () => {
    const fx = makeFixture({ "bad.ts": `export const X = "Mcp-Session-Id";` });
    cleanup = fx.cleanup;
    const r = runCli(["scan", fx.dir, "--format", "json"]);
    expect(r.status).toBe(1);
  });

  it("rules subcommand exits 0 and prints JSON", () => {
    const r = runCli(["rules"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as unknown[];
    expect(parsed.length).toBe(8);
  });

  it("verify exits 0 on stateless code", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const r = runCli(["verify", fx.dir]);
    expect(r.status).toBe(0);
  });

  it("verify exits 1 on blocking violations", async () => {
    const fx = makeFixture({
      "bad.ts": `export const E = { code: -32002, message: "x" };`,
    });
    cleanup = fx.cleanup;
    const r = runCli(["verify", fx.dir]);
    expect(r.status).toBe(1);
  });

  it("--help exits 0", () => {
    const r = runCli(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("scan");
    expect(r.stdout).toContain("patch");
  });

  it("--version exits 0 and prints a semver-ish string", () => {
    const r = runCli(["--version"]);
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("scan emits parseable JSON with the report shape", async () => {
    const fx = makeFixture({ "bad.ts": `export const E = { code: -32002 };` });
    cleanup = fx.cleanup;
    const r = runCli(["scan", fx.dir, "--format", "json"]);
    const parsed = JSON.parse(r.stdout) as { violations: unknown[]; scannedFiles: number };
    expect(Array.isArray(parsed.violations)).toBe(true);
    expect(parsed.scannedFiles).toBe(1);
  });

  it("diff exits 1 and prints a unified diff when patches are planned", async () => {
    const fx = makeFixture({ "err.ts": `export const E = { code: -32002 };\n` });
    cleanup = fx.cleanup;
    const r = runCli(["diff", fx.dir]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("-32002");
    expect(r.stdout).toContain("-32602");
  });

  it("diff exits 0 with empty output when nothing is patchable", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const r = runCli(["diff", fx.dir]);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("");
  });

  it("patch --dry-run exits 0 and reports dryRun:true without writing", async () => {
    const fx = makeFixture({ "err.ts": `export const E = { code: -32002 };\n` });
    cleanup = fx.cleanup;
    const r = runCli(["patch", fx.dir, "--dry-run"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as { dryRun: boolean; patchedFiles: number };
    expect(parsed.dryRun).toBe(true);
    expect(parsed.patchedFiles).toBe(1);
  });

  it("report exits 0 and emits markdown by default", async () => {
    const fx = makeFixture({ "err.ts": `export const E = { code: -32002 };` });
    cleanup = fx.cleanup;
    const r = runCli(["report", fx.dir]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("# MCP Stateless Migrator");
    expect(r.stdout).toContain("Rule coverage");
  });

  it("rules --verbose includes description + specRevision", () => {
    const r = runCli(["rules", "--verbose"]);
    expect(r.status).toBe(0);
    const parsed = JSON.parse(r.stdout) as Array<{
      id: string;
      description?: string;
      specRevision?: string;
    }>;
    expect(parsed).toHaveLength(8);
    expect(parsed.every((x) => typeof x.description === "string" && x.description.length > 0)).toBe(
      true,
    );
    expect(parsed.every((x) => typeof x.specRevision === "string")).toBe(true);
  });

  it("scan rejects an invalid --format with exit code 2", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const r = runCli(["scan", fx.dir, "--format", "xml"]);
    expect(r.status).toBe(2);
  });

  it("scan on a non-existent path fails (exit code 1)", () => {
    const r = runCli(["scan", "/no/such/path/mcp-migrator-xyz", "--format", "json"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/Path does not exist/);
  });
});
