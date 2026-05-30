import { afterEach, describe, expect, it } from "vitest";
import { scanPath } from "../src/scanner.js";
import { formatScan } from "../src/reporter.js";
import { makeFixture } from "./helpers/fixture.js";

describe("reporter: JSON structural shape", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("emits parseable JSON with all top-level report keys", async () => {
    const fx = makeFixture({
      "x.ts": `export const A = "Mcp-Session-Id"; export const E = { code: -32002 };`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const out = formatScan(report, "json");
    const parsed = JSON.parse(out) as {
      scannedFiles: number;
      violations: unknown[];
      byRule: Record<string, number>;
      bySeverity: Record<string, number>;
      specRevision: string;
      scannedAt: string;
    };
    expect(typeof parsed.scannedFiles).toBe("number");
    expect(Array.isArray(parsed.violations)).toBe(true);
    expect(typeof parsed.byRule).toBe("object");
    expect(typeof parsed.bySeverity).toBe("object");
    expect(typeof parsed.specRevision).toBe("string");
    expect(typeof parsed.scannedAt).toBe("string");
    // round-trip equality of the byRule aggregation.
    expect(parsed.byRule["r06-error-code-shift"]).toBe(1);
  });

  it("JSON round-trips a violation entry with its fields", async () => {
    const fx = makeFixture({ "x.ts": `export const E = { code: -32002 };` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r06-error-code-shift"] });
    const parsed = JSON.parse(formatScan(report, "json")) as {
      violations: Array<{
        ruleId: string;
        severity: string;
        line: number;
        column: number;
        autoPatchable: boolean;
      }>;
    };
    expect(parsed.violations).toHaveLength(1);
    const v = parsed.violations[0]!;
    expect(v.ruleId).toBe("r06-error-code-shift");
    expect(v.severity).toBe("error");
    expect(v.autoPatchable).toBe(true);
    expect(typeof v.line).toBe("number");
    expect(typeof v.column).toBe("number");
  });
});

describe("reporter: markdown", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("renders the severity breakdown + rule coverage tables", async () => {
    const fx = makeFixture({ "x.ts": `export const E = { code: -32002 };` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const md = formatScan(report, "md");
    expect(md).toContain("# MCP Stateless Migrator — Report");
    expect(md).toContain("## Severity breakdown");
    expect(md).toContain("| Severity | Count |");
    expect(md).toContain("| Rule | Severity | Auto-patch | Hits | Source |");
    // every rule id appears in the coverage table.
    expect(md).toContain("r01-stateless-core");
    expect(md).toContain("r08-endpoint-shape");
  });

  it("renders a Violations section when there are hits", async () => {
    const fx = makeFixture({ "x.ts": `export const E = { code: -32002 };` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const md = formatScan(report, "md");
    expect(md).toContain("## Violations");
    expect(md).toContain("r06-error-code-shift");
  });

  it("omits the Violations section on a clean report", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const md = formatScan(report, "md");
    expect(md).not.toContain("## Violations");
    // but the coverage table is still present.
    expect(md).toContain("## Rule coverage");
    expect(md).toContain("Violations: 0");
  });
});

describe("reporter: html", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("produces a well-formed-ish html document", async () => {
    const fx = makeFixture({ "x.ts": `export const E = { code: -32002 };` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const html = formatScan(report, "html");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<html>");
    expect(html).toContain("</html>");
    expect(html).toContain("<title>");
    expect(html).toContain("<pre>");
    // the embedded markdown header text mentions severity.
    expect(html.toLowerCase()).toContain("severity");
  });

  it("escapes angle brackets coming from snippet text", async () => {
    // A snippet containing < / > should be HTML-escaped in the output so the
    // document stays well-formed.
    const fx = makeFixture({
      "x.ts": `export const A = "ui://<b>render</b>";`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r04-apps-extension"] });
    const html = formatScan(report, "html");
    expect(html).toContain("&lt;");
    expect(html).toContain("&gt;");
  });

  it("renders a clean report without throwing", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const html = formatScan(report, "html");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("Violations: 0");
  });
});

describe("reporter: text", () => {
  let cleanup: (() => void) | null = null;
  afterEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it("lists rule ids and the violations count", async () => {
    const fx = makeFixture({
      "x.ts": `export const A = "Mcp-Session-Id"; export const E = { code: -32002 };`,
    });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const text = formatScan(report, "text");
    expect(text).toContain("scan report");
    expect(text).toContain("r01-stateless-core");
    expect(text).toContain("r06-error-code-shift");
    expect(text).toContain(`violations: ${report.violations.length}`);
  });

  it("renders a clean report (no violations, no file groups)", async () => {
    const fx = makeFixture({ "ok.ts": `export const X = 1;` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir);
    const text = formatScan(report, "text");
    expect(text).toContain("scan report");
    expect(text).toContain("violations: 0");
  });

  it("defaults to text format for an unknown format value", async () => {
    const fx = makeFixture({ "x.ts": `export const A = "Mcp-Session-Id";` });
    cleanup = fx.cleanup;
    const report = await scanPath(fx.dir, { only: ["r01-stateless-core"] });
    // Cast through unknown to exercise the default branch of the switch.
    const out = formatScan(report, "totally-unknown" as unknown as "text");
    expect(out).toContain("scan report");
  });
});
