#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import chalk from "chalk";
import { z } from "zod";
import { scanPath } from "./scanner.js";
import { patchPath, diffPath } from "./patcher.js";
import { formatScan, type ReportFormat } from "./reporter.js";
import { RULES, SPEC_REVISION } from "./rules/index.js";

function readVersion(): string {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    // dist/cli.js -> dist -> package root
    const pkgPath = path.resolve(here, "..", "package.json");
    const raw = fs.readFileSync(pkgPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "version" in parsed) {
      const v = (parsed as { version: unknown }).version;
      if (typeof v === "string") return v;
    }
  } catch {
    // fallthrough
  }
  return "0.0.0-dev";
}

const ScanArgs = z.object({
  path: z.string().min(1),
  format: z.enum(["json", "text", "md", "html"]).default("text"),
});

const DiffArgs = z.object({
  path: z.string().min(1),
  output: z.string().optional(),
});

const PatchArgs = z.object({
  path: z.string().min(1),
  dryRun: z.boolean().default(false),
  backup: z.boolean().default(true),
  formatAfter: z.boolean().default(false),
  only: z.array(z.string()).optional(),
});

const VerifyArgs = z.object({
  path: z.string().min(1),
  spec: z.string().default(SPEC_REVISION),
});

const ReportArgs = z.object({
  path: z.string().min(1),
  format: z.enum(["json", "md", "html"]).default("md"),
});

function fail(code: number, message: string): never {
  console.error(chalk.red(`error: ${message}`));
  process.exit(code);
}

async function main(): Promise<void> {
  const program = new Command();
  program
    .name("mcp-stateless-migrator")
    .description(
      "Scan + migrate MCP-server codebases to MCP-Spec 2026-07-28 RC (Stateless Core).",
    )
    .version(readVersion());

  program
    .command("scan")
    .description("Scan a codebase for migration violations.")
    .argument("<path>", "Path to MCP-server source directory")
    .option("-f, --format <fmt>", "Output format: json|text|md|html", "text")
    .action(async (rawPath: string, opts: { format: string }) => {
      const parsed = ScanArgs.safeParse({ path: rawPath, format: opts.format });
      if (!parsed.success) fail(2, parsed.error.message);
      const report = await scanPath(parsed.data.path);
      process.stdout.write(formatScan(report, parsed.data.format as ReportFormat) + "\n");
      process.exit(report.violations.length > 0 ? 1 : 0);
    });

  program
    .command("diff")
    .description("Show planned auto-patches as a unified diff.")
    .argument("<path>", "Path to MCP-server source directory")
    .option("-o, --output <file>", "Write diff to file instead of stdout")
    .action(async (rawPath: string, opts: { output?: string }) => {
      const parsed = DiffArgs.safeParse({ path: rawPath, output: opts.output });
      if (!parsed.success) fail(2, parsed.error.message);
      const diff = await diffPath(parsed.data.path);
      if (parsed.data.output) {
        fs.writeFileSync(parsed.data.output, diff);
        console.error(chalk.gray(`diff written to ${parsed.data.output}`));
      } else {
        process.stdout.write(diff);
      }
      process.exit(diff.length > 0 ? 1 : 0);
    });

  program
    .command("patch")
    .description("Apply mechanically-safe auto-patches (backup PFLICHT by default).")
    .argument("<path>", "Path to MCP-server source directory")
    .option("--dry-run", "Do not write files; report what would happen.", false)
    .option("--no-backup", "Skip backup folder creation (DANGEROUS).")
    .option("--format-after", "Re-run `npx prettier --write` on modified files after patching.", false)
    .option("--only <ids...>", "Restrict to a subset of rule ids.")
    .action(
      async (
        rawPath: string,
        opts: { dryRun: boolean; backup: boolean; formatAfter: boolean; only?: string[] },
      ) => {
        const parsed = PatchArgs.safeParse({
          path: rawPath,
          dryRun: opts.dryRun,
          backup: opts.backup,
          formatAfter: opts.formatAfter,
          only: opts.only,
        });
        if (!parsed.success) fail(2, parsed.error.message);
        const report = await patchPath(parsed.data.path, {
          dryRun: parsed.data.dryRun,
          backup: parsed.data.backup,
          formatAfter: parsed.data.formatAfter,
          only: parsed.data.only,
        });
        process.stdout.write(JSON.stringify(report, null, 2) + "\n");
        process.exit(0);
      },
    );

  program
    .command("verify")
    .description("Verify a codebase against a spec revision. Exit 0 = clean.")
    .argument("<path>", "Path to MCP-server source directory")
    .option("--spec <rev>", "Target spec revision tag", SPEC_REVISION)
    .action(async (rawPath: string, opts: { spec: string }) => {
      const parsed = VerifyArgs.safeParse({ path: rawPath, spec: opts.spec });
      if (!parsed.success) fail(2, parsed.error.message);
      const report = await scanPath(parsed.data.path);
      const blocking = report.violations.filter(
        (v) => v.severity === "error" || v.severity === "critical",
      );
      console.log(
        `verify: ${report.violations.length} violations (${blocking.length} blocking) against ${parsed.data.spec}`,
      );
      process.exit(blocking.length > 0 ? 1 : 0);
    });

  program
    .command("report")
    .description("Generate a coverage report (json/md/html).")
    .argument("<path>", "Path to MCP-server source directory")
    .option("-f, --format <fmt>", "Output format: json|md|html", "md")
    .action(async (rawPath: string, opts: { format: string }) => {
      const parsed = ReportArgs.safeParse({ path: rawPath, format: opts.format });
      if (!parsed.success) fail(2, parsed.error.message);
      const report = await scanPath(parsed.data.path);
      process.stdout.write(formatScan(report, parsed.data.format as ReportFormat) + "\n");
      process.exit(0);
    });

  program
    .command("rules")
    .description("List all migration detection rules.")
    .option("-v, --verbose", "Include description + source", false)
    .action((opts: { verbose: boolean }) => {
      const out: unknown[] = RULES.map((r) => ({
        id: r.id,
        severity: r.severity,
        autoPatchable: r.autoPatchable,
        source: r.source,
        ...(opts.verbose ? { description: r.description, specRevision: r.specRevision } : {}),
      }));
      process.stdout.write(JSON.stringify(out, null, 2) + "\n");
      process.exit(0);
    });

  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  fail(1, msg);
});
