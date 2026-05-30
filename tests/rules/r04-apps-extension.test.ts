import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../../src/scanner.js";
import { makeFixture } from "../helpers/fixture.js";

describe("r04-apps-extension", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("flags sandboxed-iframe references as info", async () => {
    const fx = makeFixture({
      "apps.ts": `export const KEY = "sandboxed-iframe";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.severity).toBe("info");
  });

  it("ignores unrelated literals", async () => {
    const fx = makeFixture({
      "apps.ts": `export const KEY = "iframe";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(0);
  });

  it("flags the real MCP Apps surface (ui:// + content type + extension id)", async () => {
    const fx = makeFixture({
      "ui.ts":
        `const A = "ui://widget/main";\n` +
        `const B = "text/html;profile=mcp-app";\n` +
        `const C = "io.modelcontextprotocol/ui";\n`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(3);
    expect(report.violations.every((v) => v.severity === "info")).toBe(true);
  });

  it("flags a ui:// resource scheme literal on its own", async () => {
    const fx = makeFixture({ "ui.ts": `export const A = "ui://widget/main";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(1);
    expect(report.violations[0]!.severity).toBe("info");
  });

  it("flags the text/html;profile=mcp-app content type on its own", async () => {
    const fx = makeFixture({
      "ui.ts": `export const CT = "text/html;profile=mcp-app";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(1);
  });

  it("flags the text/html;profile=mcp-app content type with a space after the semicolon", async () => {
    // PATTERN allows optional whitespace: text/html;\s*profile=mcp-app
    const fx = makeFixture({
      "ui.ts": `export const CT = "text/html; profile=mcp-app";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(1);
  });

  it("flags the io.modelcontextprotocol/ui extension id on its own", async () => {
    const fx = makeFixture({
      "ui.ts": `export const EXT = "io.modelcontextprotocol/ui";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(1);
  });

  it("does not match a plain http(s):// url", async () => {
    const fx = makeFixture({
      "ui.ts": `export const URL = "https://example.com/ui";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    expect(report.violations).toHaveLength(0);
  });
});
