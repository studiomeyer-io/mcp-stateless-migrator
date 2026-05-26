import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { patchPath, diffPath } from "../../src/patcher.js";
import { makeFixture } from "../helpers/fixture.js";

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
