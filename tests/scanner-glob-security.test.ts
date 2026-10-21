import { afterEach, describe, expect, it } from "vitest";
import path from "node:path";
import { loadProject } from "../src/scanner.js";
import { makeFixture } from "./helpers/fixture.js";

let cleanup: (() => void) | undefined;
afterEach(() => { cleanup?.(); cleanup = undefined; });

describe("scanner glob safety", () => {
  it("rejects a deeply nested custom brace pattern", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" });
    cleanup = fx.cleanup;
    const hostile = "{".repeat(4500) + "a" + "}".repeat(4500);
    await expect(loadProject(fx.dir, { patterns: ["**/*.ts", hostile] })).rejects.toThrow(/1024 characters/);
  });

  it.each(["**/*.{ts,js}", "**/*.+(ts|js)"])("preserves %s and the default ignores", async (pattern) => {
    const fx = makeFixture({
      "src/a.ts": "export const a = true;",
      "src/b.js": "export const b = true;",
      "src/c.txt": "not a source file",
      ".hidden.ts": "export const hidden = true;",
      "node_modules/dep/x.ts": "export const ignored = true;",
    });
    cleanup = fx.cleanup;
    const loaded = await loadProject(fx.dir, { patterns: [pattern] });
    expect(loaded.files.map(file => path.relative(fx.dir, file.getFilePath())).sort()).toEqual(["src/a.ts", "src/b.js"]);
  });

  it("does not expand a literal directory pattern", async () => {
    const fx = makeFixture({ "src/a.ts": "export const a = true;" });
    cleanup = fx.cleanup;
    const loaded = await loadProject(fx.dir, { patterns: ["src"] });
    expect(loaded.files).toHaveLength(0);
  });
});


describe("external glob complexity budget", () => {
  it("rejects 129 patterns", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    await expect(loadProject(root, { patterns: Array.from({ length: 129 }, () => "**/*.ts") })).rejects.toThrow(/128 glob patterns/);
  });
  it("rejects a 1025 character pattern", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    await expect(loadProject(root, { patterns: ["a".repeat(1025)] })).rejects.toThrow(/1024 characters/);
  });
  it("rejects the nested extglob attack", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    await expect(loadProject(root, { patterns: ["+(".repeat(4500) + "x" + ")".repeat(4500)] })).rejects.toThrow(/1024 characters/);
  });
  it("rejects 17 unescaped opening groups", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    await expect(loadProject(root, { patterns: ["[ab]".repeat(17)] })).rejects.toThrow(/16 unescaped/);
  });
  it("rejects unmatched opening groups", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    await expect(loadProject(root, { patterns: ["(".repeat(17) + "a"] })).rejects.toThrow(/16 unescaped/);
  });
  it("counts groups after an escaped backslash", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    await expect(loadProject(root, { patterns: ["\\\\(".repeat(17)] })).rejects.toThrow(/16 unescaped/);
  });
  it("accepts 128 patterns", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    const result = await loadProject(root, { patterns: Array.from({ length: 128 }, () => "**/*.ts") });
    expect(result.files).toHaveLength(1);
  });
  it("accepts exactly 1024 characters and 16 groups", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    const boundary = "**/" + "a/".repeat(508) + "a*.ts";
    expect(boundary).toHaveLength(1024);
    await expect(loadProject(root, { patterns: [boundary, "[ab]".repeat(16)] })).resolves.toBeDefined();
  });
  it("does not count escaped opening groups", async () => {
    const fx = makeFixture({ "safe.ts": "export const safe = true;" }); cleanup = fx.cleanup; const root = fx.dir;
    await expect(loadProject(root, { patterns: ["\\(".repeat(17)] })).resolves.toBeDefined();
  });
});
