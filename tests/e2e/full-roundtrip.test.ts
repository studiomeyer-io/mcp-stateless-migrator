import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { patchPath, diffPath } from "../../src/patcher.js";
import { makeFixture } from "../helpers/fixture.js";
import fs from "node:fs";
import path from "node:path";

const STATEFUL_SERVER = `
import type { Request, Response } from "node:http";

export const PROTOCOL = "MCP-Protocol-Version";

export const ENDPOINT = "/messages";

export function handler(req: any, res: any) {
  const sid = req.headers["mcp-session-id"];
  if (!sid) {
    return res.json({ code: -32002, message: "session required" });
  }
  if (req.body?.method === "tasks/list") {
    return res.json({ result: [] });
  }
  if (req.body?.method === "roots/list") {
    return res.json({ result: [] });
  }
  return res.json({ ok: true });
}

export const OAUTH_CLAIM = "iss";
`;

const STATELESS_SERVER = `
import type { Request, Response } from "node:http";

export const ENDPOINT = "/rpc";

export function handler(req: any, res: any) {
  return res.json({ ok: true });
}
`;

describe("e2e: scan -> diff -> patch -> verify roundtrip", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("detects multiple rule classes on a stateful server", async () => {
    const fx = makeFixture({ "server.ts": STATEFUL_SERVER });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const ruleIds = new Set(report.violations.map((v) => v.ruleId));
    expect(ruleIds.has("r01-stateless-core")).toBe(true);
    expect(ruleIds.has("r03-tasks-extension")).toBe(true);
    expect(ruleIds.has("r05-deprecations")).toBe(true);
    expect(ruleIds.has("r06-error-code-shift")).toBe(true);
    expect(ruleIds.has("r07-oauth-hardening")).toBe(true);
    expect(ruleIds.has("r08-endpoint-shape")).toBe(true);
  });

  it("diff returns non-empty unified diff for the auto-patchable rule", async () => {
    const fx = makeFixture({ "server.ts": STATEFUL_SERVER });
    cleanup = fx.cleanup;
    const diff = await diffPath(fx.dir);
    expect(diff.length).toBeGreaterThan(0);
    expect(diff).toContain("-32002");
    expect(diff).toContain("-32602");
  });

  it("patch reduces blocking violations on the auto-patchable rule", async () => {
    const fx = makeFixture({ "server.ts": STATEFUL_SERVER });
    cleanup = fx.cleanup;
    const before = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(before.violations.length).toBeGreaterThan(0);
    await patchPath(fx.dir, { dryRun: false, backup: true });
    const after = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    expect(after.violations).toHaveLength(0);
  });

  it("verify returns clean on a stateless server", async () => {
    const fx = makeFixture({ "server.ts": STATELESS_SERVER });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const blocking = report.violations.filter(
      (v) => v.severity === "error" || v.severity === "critical",
    );
    expect(blocking).toHaveLength(0);
  });
});
describe("e2e: idempotency — re-running the migrator is a no-op", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("a second full-fleet patch changes nothing and leaves no patchable diff", async () => {
    const fx = makeFixture({ "server.ts": STATEFUL_SERVER });
    cleanup = fx.cleanup;

    // First pass: auto-patch everything that is mechanically safe.
    const first = await patchPath(fx.dir, { dryRun: false, backup: false });
    expect(first.patchedFiles).toBe(1);

    // Capture the on-disk text after the first patch.
    const afterFirst = fs.readFileSync(path.join(fx.dir, "server.ts"), "utf8");
    expect(afterFirst).toContain("-32602");
    expect(afterFirst).not.toContain("-32002");

    // Second pass MUST be a no-op: no files reported modified...
    const second = await patchPath(fx.dir, { dryRun: false, backup: false });
    expect(second.patchedFiles).toBe(0);
    expect(second.changelogAppendHint).toBe("");

    // ...the bytes are byte-for-byte identical...
    const afterSecond = fs.readFileSync(path.join(fx.dir, "server.ts"), "utf8");
    expect(afterSecond).toBe(afterFirst);

    // ...and the planned diff is now empty (nothing left to auto-patch).
    const diff = await diffPath(fx.dir);
    expect(diff).toBe("");
  });

  it("diff is stable: computing it twice yields the same result and never writes", async () => {
    const fx = makeFixture({ "server.ts": STATEFUL_SERVER });
    cleanup = fx.cleanup;
    const before = fs.readFileSync(path.join(fx.dir, "server.ts"), "utf8");
    const diffA = await diffPath(fx.dir);
    const diffB = await diffPath(fx.dir);
    expect(diffA).toBe(diffB);
    expect(diffA.length).toBeGreaterThan(0);
    // diff must be read-only.
    expect(fs.readFileSync(path.join(fx.dir, "server.ts"), "utf8")).toBe(before);
  });
});
