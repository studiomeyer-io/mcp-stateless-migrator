import path from "node:path";
import fs from "node:fs";
import { glob } from "tinyglobby";
import { Project, ScriptTarget, ModuleKind, type SourceFile } from "ts-morph";
import { RULES, SPEC_REVISION, type ScanReport, type Violation, type Severity, type Rule } from "./rules/index.js";

const DEFAULT_GLOBS = [
  "**/*.ts",
  "**/*.tsx",
  "**/*.mts",
  "**/*.cts",
  "**/*.js",
  "**/*.mjs",
  "**/*.cjs",
];

const IGNORE = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/.git/**",
  "**/*.bak.*/**",
];

export interface LoadOptions {
  /** Restrict to a subset of rule ids (optional). */
  only?: ReadonlyArray<string>;
  /**
   * Override file globs: at most 128 patterns, each at most 1024 characters
   * and 16 unescaped opening grouping characters: (, {, [.
   */
  patterns?: ReadonlyArray<string>;
}

export interface LoadedProject {
  project: Project;
  files: SourceFile[];
  rules: ReadonlyArray<Rule>;
  rootPath: string;
}

function validateGlobPatterns(patterns: readonly string[], option: string): void {
  if (patterns.length > 128) {
    throw new Error(`${option} accepts at most 128 glob patterns`);
  }
  for (const pattern of patterns) {
    if (pattern.length > 1024) {
      throw new Error(`${option} patterns must not exceed 1024 characters`);
    }
    let groups = 0;
    for (let index = 0; index < pattern.length; index++) {
      const character = pattern[index];
      if (character === "\\") {
        index++;
        continue;
      }
      if (character === "(" || character === "{" || character === "[") {
        groups++;
        if (groups > 16) {
          throw new Error(`${option} patterns allow at most 16 unescaped opening grouping characters`);
        }
      }
    }
  }
}

function resolveRoot(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Path does not exist: ${resolved}`);
  }
  const stat = fs.statSync(resolved);
  return stat.isDirectory() ? resolved : path.dirname(resolved);
}

export async function loadProject(targetPath: string, opts: LoadOptions = {}): Promise<LoadedProject> {
  const root = resolveRoot(targetPath);
  const patterns = opts.patterns ?? DEFAULT_GLOBS;
  validateGlobPatterns(patterns, "patterns");
  validateGlobPatterns(IGNORE, "ignore");
  const files = await glob(patterns, {
    cwd: root,
    ignore: IGNORE,
    absolute: true,
    expandDirectories: false,
    dot: false,
    followSymbolicLinks: false,
  });
  // Use an in-memory project: we never need to typecheck, just walk AST.
  const project = new Project({
    useInMemoryFileSystem: false,
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: true,
      target: ScriptTarget.ES2022,
      module: ModuleKind.NodeNext,
      noEmit: true,
    },
  });
  const sourceFiles: SourceFile[] = [];
  for (const f of files) {
    try {
      sourceFiles.push(project.addSourceFileAtPath(f));
    } catch {
      // skip unparseable files silently — scanner is best-effort.
    }
  }
  const rules = opts.only && opts.only.length > 0
    ? RULES.filter((r) => opts.only!.includes(r.id))
    : RULES;
  return { project, files: sourceFiles, rules, rootPath: root };
}

export function scanFiles(loaded: LoadedProject): ScanReport {
  const violations: Violation[] = [];
  for (const file of loaded.files) {
    for (const rule of loaded.rules) {
      violations.push(...rule.detect(file));
    }
  }
  const byRule: Record<string, number> = {};
  const bySeverity: Record<Severity, number> = { info: 0, warn: 0, error: 0, critical: 0 };
  for (const v of violations) {
    byRule[v.ruleId] = (byRule[v.ruleId] ?? 0) + 1;
    bySeverity[v.severity] += 1;
  }
  return {
    scannedFiles: loaded.files.length,
    scannedAt: new Date().toISOString(),
    specRevision: SPEC_REVISION,
    violations,
    byRule,
    bySeverity,
  };
}

export async function scanPath(targetPath: string, opts?: LoadOptions): Promise<ScanReport> {
  const loaded = await loadProject(targetPath, opts);
  return scanFiles(loaded);
}
