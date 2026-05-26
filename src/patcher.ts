import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createTwoFilesPatch } from "diff";
import { loadProject, type LoadedProject } from "./scanner.js";
import { SPEC_REVISION, type PatchReport, type PatchResult } from "./rules/index.js";

export interface PatchOptions {
  dryRun: boolean;
  backup: boolean;
  formatAfter?: boolean;
  only?: ReadonlyArray<string>;
}

function buildChangelogHint(
  modifiedFiles: ReadonlyArray<string>,
  rootPath: string,
  specRevision: string,
): string {
  if (modifiedFiles.length === 0) return "";
  const today = new Date().toISOString().slice(0, 10);
  const rels = modifiedFiles.map((f) => path.relative(rootPath, f)).sort();
  const lines: string[] = [];
  lines.push(`## [Unreleased] - ${today}`);
  lines.push("");
  lines.push("### Changed");
  lines.push(`- Migrated to MCP spec ${specRevision} via mcp-stateless-migrator (auto-patch).`);
  for (const r of rels) lines.push(`  - ${r}`);
  lines.push("");
  return lines.join("\n");
}

function runPrettier(files: ReadonlyArray<string>, cwd: string): string[] {
  if (files.length === 0) return [];
  const args = ["--yes", "prettier", "--write", ...files];
  const result = spawnSync("npx", args, { cwd, stdio: "inherit" });
  if (result.status !== 0) {
    // prettier failures are non-fatal — the patch already succeeded.
    return [];
  }
  return [...files];
}

function ensureBackupDir(rootPath: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(rootPath, `.bak.${ts}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function backupFile(absFile: string, root: string, backupRoot: string): void {
  const rel = path.relative(root, absFile);
  const dest = path.join(backupRoot, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(absFile, dest);
}

export async function patchPath(
  targetPath: string,
  options: PatchOptions,
): Promise<PatchReport> {
  const loaded: LoadedProject = await loadProject(targetPath, { only: options.only });
  const patchableRules = loaded.rules.filter((r) => r.autoPatchable && r.patch);
  const results: PatchResult[] = [];
  const modifiedFiles = new Set<string>();
  let backupDir: string | null = null;

  for (const file of loaded.files) {
    const before = file.getFullText();
    for (const rule of patchableRules) {
      const ruleResults = rule.patch!(file);
      for (const r of ruleResults) {
        results.push(r);
        if (r.applied) modifiedFiles.add(r.file);
      }
    }
    const after = file.getFullText();
    if (before === after) {
      // ts-morph mutates the in-memory text; nothing to write.
      continue;
    }
  }

  // Report non-patchable rule hits explicitly so the caller knows what still
  // needs manual attention.
  for (const file of loaded.files) {
    for (const rule of loaded.rules) {
      if (rule.autoPatchable) continue;
      const violations = rule.detect(file);
      if (violations.length === 0) continue;
      results.push({
        ruleId: rule.id,
        file: file.getFilePath(),
        applied: false,
        reason: `Rule "${rule.id}" is not auto-patchable (semantic-complex). See report for ${violations.length} violation(s).`,
      });
    }
  }

  const modifiedList = [...modifiedFiles];
  let formattedFiles: string[] = [];

  if (modifiedFiles.size > 0 && !options.dryRun) {
    if (options.backup) {
      backupDir = ensureBackupDir(loaded.rootPath);
      for (const f of modifiedList) backupFile(f, loaded.rootPath, backupDir);
    }
    await loaded.project.save();
    if (options.formatAfter) {
      formattedFiles = runPrettier(modifiedList, loaded.rootPath);
    }
  }

  const changelogAppendHint = buildChangelogHint(
    modifiedList,
    loaded.rootPath,
    SPEC_REVISION,
  );

  return {
    patchedFiles: modifiedFiles.size,
    patchedAt: new Date().toISOString(),
    specRevision: SPEC_REVISION,
    backupDir,
    results,
    dryRun: options.dryRun,
    changelogAppendHint,
    formattedFiles,
  };
}

/** Generate a unified diff of planned patches without writing to disk. */
export async function diffPath(targetPath: string, only?: ReadonlyArray<string>): Promise<string> {
  const loaded = await loadProject(targetPath, { only });
  const patchableRules = loaded.rules.filter((r) => r.autoPatchable && r.patch);
  const chunks: string[] = [];
  for (const file of loaded.files) {
    const before = file.getFullText();
    for (const rule of patchableRules) {
      rule.patch!(file);
    }
    const after = file.getFullText();
    if (before === after) continue;
    const rel = path.relative(loaded.rootPath, file.getFilePath());
    chunks.push(
      createTwoFilesPatch(`a/${rel}`, `b/${rel}`, before, after, "before", "after"),
    );
  }
  return chunks.join("\n");
}
