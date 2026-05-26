import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Create a throw-away workspace with the given files and return its absolute
 * path. The caller is responsible for `cleanup()` (Vitest afterEach hook).
 */
export function makeFixture(files: Record<string, string>): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-stateless-migrator-"));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, "utf8");
  }
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}
