<!-- studiomeyer-mcp-stack-banner:start -->
> **Part of the [StudioMeyer MCP Stack](https://studiomeyer.io)** — Built in Mallorca 🌴 · ⭐ if you use it
<!-- studiomeyer-mcp-stack-banner:end -->

# mcp-stateless-migrator

[![npm version](https://img.shields.io/npm/v/mcp-stateless-migrator.svg)](https://www.npmjs.com/package/mcp-stateless-migrator)
[![CI](https://github.com/studiomeyer-io/mcp-stateless-migrator/actions/workflows/ci.yml/badge.svg)](https://github.com/studiomeyer-io/mcp-stateless-migrator/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/studiomeyer-io/mcp-stateless-migrator/badge)](https://scorecard.dev/viewer/?uri=github.com/studiomeyer-io/mcp-stateless-migrator)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

CLI tool that scans MCP-server codebases for incompatibilities with **MCP-Spec 2026-07-28 RC** (Stateless Core, mandatory headers, deprecated features, error-code shift, OAuth hardening, endpoint-shape changes) and applies safe AST-rewrites where mechanically possible.

Target users: maintainers of TypeScript/JavaScript MCP servers (the largest SDK userbase, `@modelcontextprotocol/sdk`).

Status: `v0.1.2` — pre-final-RC. Detection rules are tagged with `specRevision: 2026-07-28-rc-2026-05-21` and cite the canonical SEP files. `v0.2.0` will re-validate against the Tier-1 SDK final release.

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
| `r01-stateless-core` | warn | no | [SEP-2567](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2567-sessionless-mcp.md) |
| `r02-mandatory-headers` | info | no | [SEP-2243](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2243-http-standardization.md) |
| `r03-tasks-extension` | warn | no | [SEP-2663](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2663-tasks-extension.md) |
| `r04-apps-extension` | info | no | [SEP-1865](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/1865-mcp-apps-interactive-user-interfaces-for-mcp.md) |
| `r05-deprecations` | warn | no | [SEP-2577](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2577-deprecate-roots-sampling-and-logging.md) |
| `r06-error-code-shift` | error | **yes** | [SEP-2164](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2164-resource-not-found-error.md) |
| `r07-oauth-hardening` | warn | no | [SEP-2468](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2468-recommend-issuer-claim-for-auth.md) |
| `r08-endpoint-shape` | warn | no | [SEP-2596](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/seps/2596-spec-feature-lifecycle-and-deprecation.md) |

Only `r06` rewrites code automatically — it swaps `-32002 -> -32602` inside any property named `code` (identifier key, `"code"`/`'code'` string key, or class field), and leaves computed keys and same-value-but-different-name properties untouched. SEP-2164 is **Draft** status as of the RC, so re-validate before the final spec; every patch is backed up by default. Every other rule requires a human reviewing the planned change — server architecture varies too much for blind auto-patching.

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
- [`mcp-spec-migrator`](https://www.npmjs.com/package/mcp-spec-migrator) — TypeScript CLI for the previous spec step (`2025-06-18 -> 2025-11-25`).
- [`mcp-protocol-conformance`](https://github.com/studiomeyer-io/mcp-protocol-conformance) — Rust runtime conformance validator.

See [ECOSYSTEM.md](./ECOSYSTEM.md) for the full positioning matrix.

## License

MIT — Copyright © 2026 Matthias Meyer (StudioMeyer).
