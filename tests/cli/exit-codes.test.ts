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
});
