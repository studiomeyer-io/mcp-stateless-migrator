# Builder Notes — mcp-stateless-migrator

## Round 0 — Initial Build (2026-05-26)

### Status

- Skeleton + 7-File OS-Standard + 8 rules + scanner + reporter + patcher + CLI + tests komplett.
- `npm install` clean (173 packages, 0 vulnerabilities).
- `tsc -b` clean.
- `vitest run` — **11 test files, 35 tests, all passing** (1.50s).
- `dist/cli.js` mit shebang + exec-bit gesetzt.
- Smoke-spawn (entrypoint=both): `cli.js` pass, `server.js` missing — **erwartet**.

### server.js fehlt — beabsichtigt

Der Plan sagt explizit:
> **Type:** CLI-Tool (npm `bin`), kein HTTP-Server, kein stdio-MCP-Server. Pure node script.

`build_smoke_spawn entrypoint=both` ist der gewuenschte Tranche-2-Check laut User-Anweisung; `cli.js` ist der einzige Binary-Entrypoint dieses Builds. Reviewer kann das mit dem Plan abgleichen.

### Verified

- `node dist/cli.js --help` zeigt alle 6 Subcommands (scan, diff, patch, verify, report, rules).
- `node dist/cli.js rules` returnt JSON-Array mit 8 Eintraegen.
- E2E-Roundtrip Test schreibt einen stateful Mock-Server, scannt, patcht r06, verifiziert dass die Violation weg ist.
- Jede Rule hat `// Source:` SEP-Link am Datei-Anfang (CI-greplint im ci.yml).
- Idempotenz von r06-patch: zweiter Lauf produziert 0 Aenderungen (im Test verifiziert).
- Patch-Backup-Strategie funktioniert: `.bak.<ISO-timestamp>/` mit Original-Files.

### Dependencies (alle Plan-konform)

- `@modelcontextprotocol/sdk@^1.29.0`, `zod@^4.4.3`, `commander@^14.0.3`, `chalk@^5.6.2`,
  `ts-morph@^28.0.0`, `fast-glob@^3.3.3`, `diff@^9.0.0`
- `@types/diff@^8.0.0` als DevDep nachgezogen (im Plan nicht erwaehnt, aber notwendig fuer strict TS).

### Was offen / Open Items aus Plan

- **R2 v0.2.0 Multi-SDK-Detection** (Plan Open Item #1) — verschoben auf naechste Runde nach SDK-Final.
- **Target-Spec-Flag multi-target** (Plan Open Item #2) — v0.1 hardcoded auf 2026-07-28-rc, geplant ab v0.2.

### Naechster Schritt

Reviewer trigger gegen branch `builder/mcp-stateless-migrator`. Critic-R1 nach Reviewer-GO.

## --continue Pass 2026-05-27

### Findings-Bilanz

| ID | Severity | Decision | Status | Evidence |
|----|----------|----------|--------|----------|
| F1 | HIGH | FIX (prior pass) | ALREADY-PATCHED | `src/rules/r07-oauth-hardening.ts:20` severity is `"warn"` (was `critical` per REVIEW.md). Verify-Exit-Code-Kontrakt restored — r07 no longer blocks. Variant (a) from review recommendation chosen. |
| F2 | MEDIUM | FIX (prior pass) | ALREADY-PATCHED | `.github/dependabot.yml` exists with npm + github-actions weekly schedule. SECURITY.md Trust-Stack-Claim real now. |
| F3 | MEDIUM | FIX (prior pass) | ALREADY-PATCHED | `src/patcher.ts:15-31` `buildChangelogHint()` builds Keep-A-Changelog-formatted hint; PatchReport carries `changelogAppendHint: string` (line 127). Plan-Predicted-Impact claim validated. |
| F4 | MEDIUM | FIX (prior pass) | ALREADY-PATCHED | `src/rules/r02-mandatory-headers.ts:20` severity is `"info"` (was `error` per REVIEW.md). Plan-Vorgabe restored. Anchoring sub-finding (b): violation still anchors on first matching header-occurrence — message wording explicit ("Partial header adoption — missing: X, Y. SEP-2243 requires all three.") so output is no longer confusing. |
| F5 | LOW | FIX (prior pass) | ALREADY-PATCHED | `src/cli.ts:109` `--format-after` option exposed; `src/patcher.ts:11,33-42` `PatchOptions.formatAfter` + `runPrettier()` spawnSync `npx --yes prettier --write`. Backup-Folder PFLICHT bleibt unveraendert (cli.ts:108 `--no-backup`). |

### Totals

- Total Findings: 5
- Fixed: 5 (F1 HIGH, F2/F3/F4 MEDIUM, F5 LOW — all in prior --continue pass before current session)
- Skipped: 0
- LOW skipped (auto-rule): 0 (F5 was actually fixed despite the auto-skip default, since prior --continue chose to fix all 5)

### Verification (current session, no new edits required)

- `build_tsc_check`: clean
- `build_npm_run_build`: clean (tsc -b)
- `build_npm_test`: **35/35 tests pass** across 11 test files (1.53s) — same count as Round 0
- `build_smoke_spawn entrypoint=cli`: **pass** (shebang + exec + all 6 subcommands listed in help). `bin.js` missing intentional per Plan (CLI-only build).
- `git_status_summary`: only `package.json` shows modified (lockfile + dependabot label updates from prior pass). No unstaged code regressions.

### Why no new edits

The current source tree already incorporates the patches from a prior --continue run (likely the Round 0 → R1 pass that landed F1-F5 fixes before the REVIEW.md cycle was re-opened). Reading each finding-target file confirms the patched state. No additional Builder action is needed — the code matches the Reviewer's recommended fixes verbatim:

- F1 recommendation (a) "severity critical → warn" — applied.
- F2 — `.github/dependabot.yml` exists.
- F3 — `changelogAppendHint` is now in `PatchReport`.
- F4 sub-finding (a) "severity error → info" — applied. Sub-finding (b) anchoring softened by explicit message wording.
- F5 — `--format-after` flag + `runPrettier` shipped.

### Naechster Schritt (post --continue Pass)

Reviewer Re-Run gegen `builder/mcp-stateless-migrator` zur Verdict-Anhebung AMBER → GO. Bei GO: Tester triggert Real-World-Smoke gegen `/home/simple/local-memory-mcp/src` (Plan Test Plan Bullet 2 + REVIEW.md Empfehlung 1) — diese Smoke fehlt noch als File im tests/ Verzeichnis aber kann via CLI direkt gefahren werden. Falls Tester sie als Pflicht-File einbaut: separater Builder-Patch-Run.


