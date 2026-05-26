# mcp-stateless-migrator

CLI tool that scans MCP-server codebases for incompatibilities with **MCP-Spec 2026-07-28 RC** (Stateless Core, mandatory headers, deprecated features, error-code shift, OAuth hardening, endpoint-shape changes) and applies safe AST-rewrites where mechanically possible.

Target users: maintainers of TypeScript/JavaScript MCP servers (the largest SDK userbase, `@modelcontextprotocol/sdk`).

Status: `v0.1.0` — pre-final-RC. Detection rules are tagged with `specRevision: 2026-07-28-rc-2026-05-21`. `v0.2.0` will re-validate against the Tier-1 SDK final release.

## Install

```bash
npm install -g mcp-stateless-migrator
# or one-shot:
npx mcp-stateless-migrator scan ./src
```

Requires **Node >= 20**.

## CLI

| # | Command | Args | Output | Read-only | Destructive |
|---|---------|------|--------|-----------|-------------|
| 1 | `scan` | `<path>` `[--format json\|text\|md\|html]` | violations + severity | yes | no |
| 2 | `diff` | `<path>` `[--output <file>]` | unified diff of planned patches | yes | no |
| 3 | `patch` | `<path>` `[--dry-run]` `[--no-backup]` `[--only <id...>]` | rewrites files + writes backup folder | no | yes |
| 4 | `verify` | `<path>` `[--spec <rev>]` | exit 0 = clean | yes | no |
| 5 | `report` | `<path>` `[--format json\|md\|html]` | coverage report | yes | no |
| 6 | `rules` | `[--verbose]` | list all detection rules | yes | no |

## Detection rules

| Rule | Severity | Auto-patch | Source |
|------|----------|------------|--------|
| `r01-stateless-core` | warn | no | Stateless Core (2026-07-28 RC blogpost) |
| `r02-mandatory-headers` | error | no | [SEP-2243](https://github.com/modelcontextprotocol/specification/pull/2243) |
| `r03-tasks-extension` | warn | no | Tasks Extension (2026-07-28 RC blogpost) |
| `r04-apps-extension` | info | no | [SEP-1865](https://github.com/modelcontextprotocol/specification/pull/1865) |
| `r05-deprecations` | warn | no | [SEP-2577](https://github.com/modelcontextprotocol/specification/pull/2577) |
| `r06-error-code-shift` | error | **yes** | [SEP-2164](https://github.com/modelcontextprotocol/specification/pull/2164) |
| `r07-oauth-hardening` | critical | no | OAuth Hardening SEP |
| `r08-endpoint-shape` | warn | no | Streamable HTTP shape (2026-07-28 RC blogpost) |

Only `r06` rewrites code automatically. Every other rule requires a human reviewing the planned change — server architecture varies too much for blind auto-patching.

## Usage

```bash
# 1. See what the migrator finds
mcp-stateless-migrator scan ./src --format text

# 2. Preview the auto-patch as a unified diff
mcp-stateless-migrator diff ./src

# 3. Apply only the safe error-code shift, with backup
mcp-stateless-migrator patch ./src --only r06-error-code-shift

# 4. Confirm the codebase is clean
mcp-stateless-migrator verify ./src

# 5. Generate a Markdown report for the team
mcp-stateless-migrator report ./src --format md > migration-report.md
```

Exit codes:
- `0` — clean (no violations OR patch applied successfully)
- `1` — violations remaining / diff non-empty
- `2` — invalid CLI arguments

## Backup folder

`patch` creates `<path>/.bak.<ISO-timestamp>/` containing the original file tree for every file it touched. Pass `--no-backup` to disable (not recommended). Restore via `cp -r .bak.<timestamp>/. .`.

## Programmatic API

```ts
import { scanPath, patchPath, formatScan } from "mcp-stateless-migrator";

const report = await scanPath("./src");
console.log(formatScan(report, "json"));

await patchPath("./src", { dryRun: false, backup: true, only: ["r06-error-code-shift"] });
```

## Ecosystem

This tool complements:
- [`mcp-spec-migrator-2511`](https://crates.io/crates/mcp-spec-migrator) — Rust + previous spec (`2025-06-18 -> 2025-11-25`).
- [`mcp-protocol-conformance`](https://crates.io/crates/mcp-protocol-conformance) — Rust runtime validator.

See [ECOSYSTEM.md](./ECOSYSTEM.md) for the full positioning matrix.

## License

MIT — Copyright © 2026 Matthias Meyer (StudioMeyer).
