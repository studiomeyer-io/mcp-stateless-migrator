# PLAN — mcp-stateless-migrator

> **Slug:** mcp-stateless-migrator
> **Kind:** foundation
> **Toolchain:** typescript
> **Created:** 2026-05-26
> **Architect:** mcp-factory-architect (Session post-S1171)

## Toolchain

**Toolchain:** typescript (Node >=20)
**Begruendung:** Migration-Target sind primaer TS/JS-MCP-Server (groesste SDK-Userbase: [@modelcontextprotocol/sdk@1.29.0](https://www.npmjs.com/package/@modelcontextprotocol/sdk) hat 78 versions seit Spec-Launch + offizielle Anthropic-Reference). CLI muss MCP-Server-Codebases (TS, JS) parsen + AST-rewriten — [ts-morph@28.0.0](https://www.npmjs.com/package/ts-morph) ist das natuerliche Werkzeug (TypeScript-Compiler-API-Wrapper). npm-Distribution erreicht Tier-1-Audience direkt (`npm install -g mcp-stateless-migrator` oder `npx mcp-stateless-migrator scan`).
**Convention-Templates:** package-json-skeleton-stdio (CLI-bin shape) + tsconfig-base + ci-yaml-with-cosign (npm provenance via GitHub OIDC) + readme-skeleton-mcp + gitignore-mcp-node + changelog-keepachangelog.
**Verify-Tools:** verify_npm_package fuer alle deps (alle 11 deps unten verified), verify_mcp_spec_version fuer 2025-11-25 (current reference) + 2026-07-28 (Target, noch nicht in registry — sourced via Spec-Blogpost).

## Mission

CLI-Tool das einen MCP-Server-Codebase scannt, alle Inkompatibilitaeten zu MCP-Spec 2026-07-28 RC (Stateless Core, Pflicht-Header, deprecated Features, Error-Code-Shift, OAuth-Hardening) detektiert, einen strukturierten Migrations-Diff generiert und wo sicher moeglich Auto-Patches per AST-Rewrite applied. Zielgruppe: alle Maintainer der 8 Foundation-Pillars, 9 Engineer-Tools, 2 Customer-MCPs der Factory + jeder externe TS/JS-MCP-Server-Maintainer der Welt. Distribution-Hebel: Migrations-Tool VOR SDK-Final-Release publishen (Tier-1-SDKs Python+TS shippen in 4-6 Wochen) = wir definieren den Pfad, nicht Anthropic. Pattern-Quelle: mcp-armor v0.3 Cross-Audit S1151 + mcp-spec-migrator-2511 (Rust crate, 06-18 -> 11-25). Komplementaer, nicht duplikat: spec-migrator-2511 = Rust + alte Migration, dieses Tool = TS + neue Migration zur final groessten Spec-Revision seit Launch.

## Scope

**IST drin:**
- CLI mit Commands: `scan` (read-only Codebase-Audit), `diff` (Migrations-Report), `patch` (Auto-Rewrite mit Backup), `verify` (Post-Patch-Validation), `report` (Coverage-Bericht JSON/Markdown).
- Detection-Regeln fuer 8 Breaking-Changes: (1) Stateless-Core / `Mcp-Session-Id` Removal, (2) Pflicht-Header MCP-Protocol-Version + Mcp-Method + Mcp-Name (SEP-2243), (3) Tasks raus aus Core (SEP-Extension), (4) MCP Apps Extension SEP-1865 sandboxed-iframe support detection, (5) Roots/Sampling/Logging Deprecation-Warnings (SEP-2577, 12-Mo-Window), (6) Error-Code -32002 -> -32602 (SEP-2164), (7) OAuth iss-Validierung + DCR application_type + Refresh-Family (SEP-OAuth), (8) `streamableHttp` Endpoint-Shape Changes.
- AST-Rewrite via [ts-morph@28.0.0](https://www.npmjs.com/package/ts-morph) fuer mechanisch-sichere Patches (Error-Code-Shift, Pflicht-Header-Injection, Session-Id-Removal).
- Test-Coverage-Report (welche Regeln matched, welche file-paths, severity-Verteilung).
- npm-Distribution mit `bin: mcp-stateless-migrator` + npm-provenance.
- 7-File OS-Standard (CONTRIBUTING + CODE_OF_CONDUCT + SECURITY + ECOSYSTEM + .github/ISSUE_TEMPLATE + PULL_REQUEST_TEMPLATE + .github/workflows/ci.yml).

**NICHT drin (Out of Scope):**
- Python-MCP-Server-Migration (separater Build mcp-stateless-migrator-py wenn Python-SDK gleichen Pfad geht, frueher non-goal — TS-SDK ist groesste Userbase).
- Rust-MCP-Server-Migration (rmcp 1.7.0 ist offizielles SDK, Rust-Migration deckt mcp-spec-migrator-2511 Round 2 ab — eigener Plan wenn 11-25 -> 07-28 RC gewollt).
- Runtime-Server-Code (kein Wrapper, kein Sidecar — nur Build-Time-Tool).
- Auto-Patch fuer semantisch komplexe Stellen (OAuth-Refresh-Family, MCP Apps iframe-Sandbox) — diese werden NUR detected + reported, nicht rewritten. User-Confirmation Pflicht.
- Migration alter <2025-06-18 Spec-Versionen (skip — mcp-spec-migrator-2511 deckt das ab).

## Tools-Liste (CLI-Subcommands)

| # | Command | Args (Zod-Schema) | Output | ReadOnly | Destructive |
|---|---------|-------------------|--------|----------|-------------|
| 1 | scan | `{ path: string, format?: "json"\|"text" }` | List of detected violations + severity | yes | no |
| 2 | diff | `{ path: string, output?: string }` | Unified diff per file (planned changes) | yes | no |
| 3 | patch | `{ path: string, dryRun?: boolean, backup?: boolean, only?: string[] }` | Patched files + backup dir + report | no | yes (Backup PFLICHT) |
| 4 | verify | `{ path: string, spec?: "2026-07-28-rc" }` | Compliance-Report (0..n violations remaining) | yes | no |
| 5 | report | `{ path: string, format?: "json"\|"md"\|"html" }` | Coverage-Bericht (rules matched, paths, %) | yes | no |
| 6 | rules | `{ verbose?: boolean }` | List aller 8 Detection-Rules + Severity + ob auto-patchable | yes | no |

## Architecture

- **Type:** CLI-Tool (npm `bin`), kein HTTP-Server, kein stdio-MCP-Server. Pure node script.
- **Auth:** keiner.
- **DB:** keiner.
- **External APIs:** keiner (offline-tool, scannt nur local files).
- **Core-Pipeline:**
  1. `Scanner` (fast-glob → file list → ts-morph Project laden)
  2. `RuleEngine` (8 Rule-Implementierungen, plug-in Pattern, jede Rule = `{ id, severity, detect(node), patch?(node) }`)
  3. `Reporter` (json/md/html via templates)
  4. `Patcher` (ts-morph SourceFile.save() + Backup via `<path>.bak.<timestamp>/`)
- **Module:**
  - `src/cli.ts` (commander entry, subcommand routing)
  - `src/scanner.ts` (file discovery, AST loading)
  - `src/rules/*.ts` (1 Datei pro Rule, named exports)
  - `src/rules/index.ts` (Rule-Registry)
  - `src/reporter.ts` (Output-Formatters)
  - `src/patcher.ts` (AST-Rewrite + Backup)
  - `src/index.ts` (programmatic API exports fuer library-use)

## Distribution

- **npm package name:** `mcp-stateless-migrator` (Slug == package-name == GitHub-Repo-Slug)
- **Repo (geplant):** studiomeyer-io/mcp-stateless-migrator (MIT) — namespace verified frei via verify_github_namespace
- **Bin:** `mcp-stateless-migrator` (`npx mcp-stateless-migrator scan ./src`)
- **Marketplace:** mcp.so (Engineer-Tool Section) + verlinkt aus MCP-Roadmap-Kommunikation (Blogpost SEP-2243-Spec-Reference)
- **Hosting:** keiner (CLI-Tool, lokale Ausfuehrung)
- **Hook-Recipes-Bundle:** entfaellt (CLI-Tool ohne MCP-Tools)
- **Pre-Publish:** 2-Runden agent-code-review-Pflicht (Critic + Analyst + Research parallel, mcp-armor v0.3 Pattern). Erst R2 GO -> `git tag v0.1.0` -> .github/workflows/ci.yml triggert `npm publish --provenance --access public` via OIDC.
- **CHANGELOG:** Keep-A-Changelog-Format ab v0.1.0 (jeder Tag = ein Entry).

## Predicted Impact

### Tool: scan

**expected_fixes:**
- eliminiert Maintainer-Drift-Risiko "wir wissen nicht was sich aendert" — vollstaendige Inventory aller 8 Breaking-Changes pro Codebase mit file:line-Lokation
- blockt Mcp-Session-Id Stateful-Pattern-Persistierung in MCP-Servern wenn der Maintainer sonst die Migration verschlaeft (Pattern-Quelle: S1118/S1119 LIVE-Verifikation Session-Header lowercase = 0 tools sichtbar; analog wird Mcp-Session-Id-Entfernung neue Drift-Klasse)

**at_risk_regressions:**
- False-Positives bei dynamisch generierten Pflicht-Headern (z.B. via spread-operator) — Detection laeuft AST-pattern-basiert, kann constexpr-Headers verfehlen. Wird via severity:info reportet statt warn.

### Tool: diff

**expected_fixes:**
- macht jede geplante Aenderung pre-patch reviewbar — Maintainer kann per-rule entscheiden via `--only <rule-id>` filtering
- eliminiert Anti-Pattern "Auto-Migrator schreibt blind drueber" (Pattern-Quelle: cargo fix Erfahrungen + ts-morph community-Berichte ueber unbedachte type-narrowing edits)

**at_risk_regressions:**
- (none) — Diff ist read-only-output, kein file-write.

### Tool: patch

**expected_fixes:**
- eliminiert Anti-Pattern "Maintainer copy-pastes spec-snippet manuell + macht Tippfehler" fuer mechanisch-sichere Regeln (Error-Code-Shift -32002 -> -32602, Pflicht-Header-Injection)
- blockt CHANGELOG-Drift-Klasse aus mcp-armor v0.2 R1 (npm publish ohne dokumentierte Spec-Bump-Begruendung) — Patch generiert CHANGELOG-Eintrag automatisch

**at_risk_regressions:**
- AST-Rewrite kann formatting-noise erzeugen (prettier/eslint diff churn). Mitigation: `--format-after` Flag das `npx prettier --write` auf modified files re-runt; Backup-Folder PFLICHT als safety-net.
- OAuth-Refresh-Family Detection darf NIE auto-patchen (semantisch komplex, refresh-token-store-Architektur ist server-spezifisch) — patch-Tool weigert sich + verweist auf diff-Output mit Severity-Critical.

### Tool: verify

**expected_fixes:**
- macht Post-Migration "ist es fertig?" pruefbar — Exit-Code 0 wenn 0 violations remaining, sonst Liste was noch offen ist
- eliminiert Anti-Pattern "Maintainer denkt Migration ist done, vergisst eine Regel" (Pattern-Quelle: 4 unsichtbare Tools local-memory v1.0.7 -> v1.0.8 S1169 weil Drift zwischen Implementation + Export nicht catched)

**at_risk_regressions:**
- (none) — read-only Verification, kein file-write.

### Tool: report

**expected_fixes:**
- (no anti-pattern eliminated, pure information) — generiert Markdown/HTML-Bericht fuer Tech-Lead-Review + CHANGELOG-Vorlage

**at_risk_regressions:**
- (none).

### Tool: rules

**expected_fixes:**
- (no anti-pattern eliminated, pure information) — listet alle 8 Detection-Rules + ob auto-patchable + Severity. Diskoverabilitaet vor Run.

**at_risk_regressions:**
- (none).

## Recommended Hook Recipes

CLI-Tool ohne MCP-Server-Tools — kein Hook-Use-Case. Section entfaellt mit Begruendung: alle Subcommands sind one-shot CLI-Invocations (`mcp-stateless-migrator scan ./src`), kein stateful protocol-handler. User wuerde keinen Claude-Code-Lifecycle-Hook hier mappen. Verifikation: ein potentieller Hook `Stop -> mcp-stateless-migrator scan ${cwd}/src` waere reine Bash-Shortcut-Aufgabe, kein MCP-Tool-Trigger.

## Test Plan

- **Unit Tests (vitest):**
  - 1 Test pro Rule (8 Rules → 8 Test-Suites, jeweils happy + edge + false-positive-resistance)
  - Scanner: ts-morph Projekt-Load mit fixture-codebases (tests/fixtures/server-stateful.ts, server-stateless.ts)
  - Reporter: snapshot-Tests fuer json/md/html-Output
  - Patcher: AST-Rewrite + Backup-Folder-Erstellung + Restore-Pfad
- **Integration Tests:**
  - End-to-End: `scan -> diff -> patch -> verify` Roundtrip auf tests/fixtures/full-server/ (kompletter Mock-MCP-Server pre-migration, expected post-migration Snapshot vorhanden)
  - Real-World-Smoke: scan gegen `/home/simple/local-memory-mcp/src` (read-only, kein patch) — erwartet 0..n violations, Output muss valides JSON sein
  - CLI: alle 6 Subcommands via execa-spawn, exit-codes geprueft (0 = clean, 1 = violations remaining, 2 = invalid args)
- **MCP-Inspector Smoke Test:** entfaellt — kein MCP-Server.
- **Real-Tenant-Test:** entfaellt — kein SaaS-Connector.
- **Spec-Drift-Test:** rules/*.ts include source-link-Kommentar zur SEP (z.B. `// Source: SEP-2243 https://github.com/modelcontextprotocol/specification/pull/...`). CI prueft via grep dass jede Rule eine Source-URL hat.

## Dependencies (geplant — alle verified via verify_npm_package am 2026-05-26)

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.29.0",
    "zod": "^4.4.3",
    "commander": "^14.0.3",
    "chalk": "^5.6.2",
    "ts-morph": "^28.0.0",
    "fast-glob": "^3.3.3",
    "diff": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "typescript": "^6.0.3",
    "tsx": "^4.22.3",
    "vitest": "^4.1.7"
  }
}
```

**Verify-Spur:**
- [@modelcontextprotocol/sdk@1.29.0](https://www.npmjs.com/package/@modelcontextprotocol/sdk) — verified, rangeOK
- [zod@4.4.3](https://www.npmjs.com/package/zod) — verified, **range update von ^3.23 auf ^4.4.3** (Skeleton-default 3.x ist veraltet, latest major ist 4)
- [commander@14.0.3](https://www.npmjs.com/package/commander) — verified, range update auf ^14
- [chalk@5.6.2](https://www.npmjs.com/package/chalk) — verified, rangeOK
- [ts-morph@28.0.0](https://www.npmjs.com/package/ts-morph) — verified, range update auf ^28
- [fast-glob@3.3.3](https://www.npmjs.com/package/fast-glob) — verified, rangeOK
- [diff@9.0.0](https://www.npmjs.com/package/diff) — verified, range update auf ^9
- [vitest@4.1.7](https://www.npmjs.com/package/vitest) — verified, range update auf ^4
- [typescript@6.0.3](https://www.npmjs.com/package/typescript) — verified, range update auf ^6
- [tsx@4.22.3](https://www.npmjs.com/package/tsx) — verified, rangeOK
- [MCP-Spec 2025-11-25](https://spec.modelcontextprotocol.io/) — verified via verify_mcp_spec_version, currentReference seit S1086 (status: reference)
- **MCP-Spec 2026-07-28 RC** — Source-of-Truth: https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/ (Spec-Blogpost, locked 2026-05-21, final freeze 2026-07-28). Noch nicht in verify_mcp_spec_version map — Builder muss KNOWN_MCP_SPEC_VERSIONS erweitern als Pre-Step.

## Build Steps (fuer Builder)

1. **Skeleton (Round 0):** package.json (aus template, deps wie oben), tsconfig.json (aus tsconfig-base), src/cli.ts (commander entry stub), README.md (aus readme-skeleton-mcp), LICENSE (MIT), .gitignore (gitignore-mcp-node), .github/workflows/ci.yml (ci-yaml-with-cosign).
2. **7-File OS-Standard (mcp-armor v0.4 Quality-Bar):** CONTRIBUTING.md + CODE_OF_CONDUCT.md (Contributor Covenant 2.1) + SECURITY.md (vuln-disclosure + supported versions) + ECOSYSTEM.md (Verhaeltnis zu mcp-spec-migrator-2511 + mcp-protocol-conformance) + .github/ISSUE_TEMPLATE/bug.md + .github/ISSUE_TEMPLATE/feature.md + .github/PULL_REQUEST_TEMPLATE.md.
3. **CHANGELOG.md:** Keep-A-Changelog Format, v0.1.0 Eintrag "Initial release — 8 Migration-Rules fuer 2025-11-25 -> 2026-07-28 RC".
4. **Rule-Engine (Round 1):** src/rules/index.ts (Registry-Pattern), 1 Datei pro Rule:
   - r01-stateless-core.ts (Mcp-Session-Id removal detection)
   - r02-mandatory-headers.ts (MCP-Protocol-Version + Mcp-Method + Mcp-Name injection)
   - r03-tasks-extension.ts (Tasks-API moved to extension)
   - r04-apps-extension.ts (SEP-1865 detection only, no auto-patch)
   - r05-deprecations.ts (Roots/Sampling/Logging warnings)
   - r06-error-code-shift.ts (-32002 -> -32602)
   - r07-oauth-hardening.ts (iss + DCR application_type + refresh-family — detection only, no auto-patch)
   - r08-endpoint-shape.ts (streamableHttp shape changes)
5. **Scanner + Reporter + Patcher (Round 1):** src/scanner.ts, src/reporter.ts, src/patcher.ts mit Tests parallel.
6. **CLI-Wiring (Round 1):** src/cli.ts mit 6 commander-Subcommands.
7. **Tests:** tests/rules/*.test.ts (8 Files), tests/e2e/full-roundtrip.test.ts, tests/cli/exit-codes.test.ts, tests/fixtures/* (mock-servers vor + nach Migration).
8. **README mit Tool-Liste + Install + Usage:** alle 6 Subcommands mit konkreten Beispielen, Tool-Tabelle aus diesem PLAN.md uebernehmen.
9. **Critic-Pflicht (Round 2):** vor `npm publish` Critic + Analyst + Research parallel. Erst R2 GO -> Tag.
10. **Publish (Round 2 GO):** `git tag v0.1.0 && git push origin v0.1.0` -> ci.yml publish-job mit `npm publish --provenance --access public`.

## Risks

- **R1 — Spec-Drift bis 28.07.2026:** zwischen heute (26.05.) und final freeze (28.07.) koennen SEPs noch leicht aendern. Mitigation: rules/*.ts mit `specRevision: "2026-07-28-rc-2026-05-21"` Konstante taggen, Verify-Subcommand prueft ob Codebase gegen aktuelle Rule-Snapshot validiert.
- **R2 — TS-SDK final-API:** Tier-1-TS-SDK shippt in 4-6 Wochen (ca. Juli 2026). Falls SDK-shape von Spec-RC abweicht (z.B. internal helpers fuer Pflicht-Header), muessen Rules auf SDK ^1.30+ angepasst werden. Mitigation: v0.1.0 publish noch im Mai gegen RC-spec, v0.2.0 nach SDK-Final-Release als Spec+SDK-Match.
- **R3 — ts-morph@28 + TS@6:** beide brand-new (TS 6.0.3 release April 2026, ts-morph 28.0.0 release April 2026). Risiko: TS-AST-Shape-Change zwischen TS 5.x und 6.x koennte ts-morph 28 noch nicht voll abdecken. Mitigation: Builder soll Pre-Build-Smoke-Test machen (ts-morph Project erstellen + 1 simple Rule durchlaufen) bevor er den Rest schreibt.
- **R4 — Backup-Folder-Strategie:** patch-Subcommand schreibt `.bak.<timestamp>/` Ordner. Risiko Disk-Bloat bei grossen Codebases. Mitigation: `--no-backup` Flag + Doku-Warnung dass Maintainer-Verantwortung.

## Open Items

- **Decision fuer Matthias bei R2-Review:** soll v0.2.0 (post-SDK-Final) automatisch Multi-SDK-Detection machen (TS-SDK + community-SDKs wie `mcp-framework`) oder strict @modelcontextprotocol/sdk only? Default-Empfehlung: strict offizielles SDK, community-SDKs als opt-in via `--sdk <name>`.
- **Spec-Version-Tag:** soll der CLI-User die Target-Spec explizit angeben (`--target 2026-07-28-rc`) oder default-hardcoded? Default-Empfehlung: hardcoded auf v0.1.0, ab v0.2.0 multi-target wenn 2026-11-XX naechste Spec-Revision kommt.

## Success Criteria (fuer Reviewer + Tester)

- `tsc -b` clean, `npm run build` clean, `chmod +x dist/cli.js` works
- `node dist/cli.js --help` listet alle 6 Subcommands
- `node dist/cli.js scan ./tests/fixtures/server-stateful` detected genau die 8 erwarteten Violations (Snapshot-Test)
- `node dist/cli.js patch ./tests/fixtures/server-stateful --dry-run` zeigt diff aller mechanisch-sicheren Rules, weigert sich bei oauth-hardening + apps-extension
- `node dist/cli.js verify ./tests/fixtures/server-stateless` returnt exit-code 0
- `npm test` clean (alle 8 Rule-Suites + e2e + cli-exit-codes)
- Real-World-Smoke gegen `/home/simple/local-memory-mcp/src` returnt valides JSON
- README enthaelt fuer jede Rule (8x) eine `<rule-id> | severity | auto-patchable | source-SEP` Zeile
- 7-File OS-Standard vorhanden (CONTRIBUTING + CODE_OF_CONDUCT + SECURITY + ECOSYSTEM + 2x ISSUE_TEMPLATE + PULL_REQUEST_TEMPLATE)
- .github/workflows/ci.yml runs Node 20 + 22 matrix
- npm publish dry-run zeigt `provenance: true` in metadata
- 2-Runden agent-code-review GO (Critic + Analyst + Research) vor v0.1.0 Tag
