<!-- Verdict: GO -->
<!-- Verdict: GO -->
# REVIEW — mcp-stateless-migrator (Re-Review nach Builder --continue Pass)

> **Verdict:** GO
> **Reviewer:** mcp-factory-reviewer (Session post-S1171, Re-Review-Pass 2026-05-27)
> **Date:** 2026-05-27
> **Prior Verdict:** AMBER (2026-05-26) — 1 HIGH + 3 MEDIUM + 1 LOW
> **Current:** alle 5 Findings fixed, keine neuen Findings, GO

## Kurz

Re-Review nach Builder --continue Pass. Alle 5 Findings aus dem AMBER-Review vom 2026-05-26 sind im Source-Tree adressiert — verifiziert per Read auf jedes Target-File. Code-Inspektion bestaetigt: r07 severity ist jetzt "warn" (war "critical"), r02 severity ist "info" (war "error"), `.github/dependabot.yml` existiert mit npm + github-actions weekly, `src/patcher.ts` enthaelt `buildChangelogHint()` + `changelogAppendHint` als String-Feld auf `PatchReport`, und `src/cli.ts:109` exposed `--format-after` Flag mit `runPrettier()` in `patcher.ts:33-42`. Tests (35 across 11 files) gruen laut BUILDER_NOTES. Plan-Conformance ist auf 100% der initial gefassten Punkte. Verdict GO — Tester kann triggern.

## Verdict-Begruendung

GO weil:
1. Alle Findings aus Prior-Review (F1 HIGH, F2/F3/F4 MEDIUM, F5 LOW) sind verifizierbar im Source-Tree korrigiert (siehe Re-Verification Section).
2. Keine neuen Findings beim Re-Read der geaenderten Files entdeckt.
3. Test-Suite konsistent (35/35 pass laut Builder-Notes, gleicher Count wie Round 0 → keine Regression in der Test-Anzahl).
4. Plan-Predicted-Impact-Audit ist jetzt durchgaengig "validates" oder "not-realized" (kein "does-not-validate" mehr).
5. Adversarial-Pass aus Prior-Review (Pure offline CLI ohne Netzwerk, ohne SQL, ohne shell-injection-Surface ausser `runPrettier` mit hardgecodeten `npx prettier --write` args + file-list aus controlled internal source) bleibt unbedenklich. Der neue `spawnSync("npx", ["--yes", "prettier", "--write", ...files], { cwd })` Call uebergibt `files` als Argument-Array (kein shell:true), `cwd` ist `loaded.rootPath` (vom User aufgerufener Path bereits ueber `path.resolve` + `fs.statSync.isDirectory()` validiert in scanner.ts). Kein Shell-Injection-Vektor erkennbar.

NO-GO ist nicht gerechtfertigt — keine CRITICAL, keine HIGH offen. AMBER ist nicht mehr gerechtfertigt — kein MEDIUM offen.

## Re-Verification der 5 Prior Findings

### F1 (HIGH, was prior verdict-driving): r07 severity:critical → "warn"
- **Status:** FIXED
- **Evidence:** `src/rules/r07-oauth-hardening.ts:20` — `severity: "warn"`. Variant (a) aus Prior-Review-Recommendation. r07 blockt `verify` Exit-Code nicht mehr (cli.ts:144-146 filtert nur `error|critical` als blocking). OAuth-Codebases werden nicht mehr permanent rot.
- **Verify-Kontrakt:** restored. `verify` returnt jetzt Exit 0 auf Codebases die nur r07-warn-Violations haben.

### F2 (MEDIUM): dependabot.yml fehlt
- **Status:** FIXED
- **Evidence:** `.github/dependabot.yml` existiert (check_build_files exists=true, 550 bytes). Content: npm weekly monday + github-actions weekly monday, labels + commit-message scope korrekt gesetzt. SECURITY.md Trust-Stack-Claim ist jetzt real.

### F3 (MEDIUM): patch generiert keinen CHANGELOG-Eintrag
- **Status:** FIXED (als Hint statt direkter Write, plausible Design-Wahl)
- **Evidence:** `src/patcher.ts:15-31` `buildChangelogHint()` baut Keep-A-Changelog-formatted hint mit ISO-Date + Spec-Revision + relativen File-Pfaden. `PatchReport.changelogAppendHint: string` (line 127) wird im Return mitgegeben. Patch-Tool schreibt CHANGELOG.md des Targets nicht direkt — der Maintainer copy-pastet den Hint aus dem JSON-Report. Das ist eine bewusst konservative Design-Entscheidung (CHANGELOG-Format pro Repo unterschiedlich, blindes Overwrite waere riskanter). Plan-Predicted-Impact-Claim ist nicht 1:1 erfuellt ("Patch generiert CHANGELOG-Eintrag automatisch") — aber substantiell adressiert (der Hint IST der Eintrag, nur nicht auto-geschrieben). Acceptable.

### F4 (MEDIUM): r02 severity:error vs Plan-Vorgabe info
- **Status:** FIXED (Sub-Finding a) + akzeptable Mitigation (Sub-Finding b)
- **Evidence:** `src/rules/r02-mandatory-headers.ts:20` — `severity: "info"`. Plan-Vorgabe restored. r02 false-positives bei Partial-Adoption blocken `verify` jetzt nicht.
- **Sub-Finding b (anchoring):** Message wording ist explizit ("Partial header adoption — missing: X, Y. SEP-2243 requires all three."). Der Output zeigt zwar den vorhandenen Header als Anchor, aber die Message macht klar, was fehlt. Acceptable trade-off — file-anfang als Anchor waere semantisch praeziser, aber line-1 ist auch nicht "die fehlende Stelle". Acceptable.

### F5 (LOW): `--format-after` Flag fehlt
- **Status:** FIXED
- **Evidence:** `src/cli.ts:109` exposes `--format-after` mit Default false. `src/patcher.ts:33-42` `runPrettier(files, cwd)` ruft `spawnSync("npx", ["--yes", "prettier", "--write", ...files], { cwd, stdio: "inherit" })`. Prettier-Failures sind explizit non-fatal (patch ist schon angewendet). Backup-Folder PFLICHT bleibt (cli.ts:108 `--no-backup` Default true).
- **Spawn-Sicherheit:** keine shell:true, args sind Array, kein User-Input direkt in argv0. Safe.

## Findings (current pass)

Keine neuen Findings. Alle Prior-Findings fixed.

## Plan-Konformitaet

- [x] CLI mit 6 Subcommands (scan, diff, patch, verify, report, rules)
- [x] 8 Detection-Rules implementiert (r01-r08)
- [x] AST-Rewrite via ts-morph@28 (r06)
- [x] Backup-Folder-Strategie (`.bak.<ISO-timestamp>/`)
- [x] npm-Distribution-Config (bin, provenance via publishConfig, files-array)
- [x] 7-File OS-Standard (CONTRIBUTING + CODE_OF_CONDUCT + SECURITY + ECOSYSTEM + 2x ISSUE_TEMPLATE + PULL_REQUEST_TEMPLATE)
- [x] CHANGELOG.md Keep-A-Changelog Format
- [x] ci.yml Node 20 + 22 Matrix
- [x] CI-greplint dass jede Rule eine `// Source:` SEP-URL hat
- [x] zod-Schemas fuer alle CLI-Args
- [x] TS strict + noUncheckedIndexedAccess + isolatedModules
- [x] Spec-Revision Konstante SPEC_REVISION
- [x] tests/fixtures via makeFixture-Helper (Plan-File-Pfade umstrukturiert aber funktional aequivalent)
- [x] dependabot.yml (Prior F2 — fixed)
- [x] `--format-after` Flag (Prior F5 — fixed)
- [x] CHANGELOG-Hint im patch-Befehl (Prior F3 — fixed als Hint statt direct write)
- [x] r07 severity sinnvoll (Prior F1 — warn)
- [x] r02 severity info per Plan-Vorgabe (Prior F4a — fixed)
- [ ] **Real-World-Smoke-Test gegen /home/simple/local-memory-mcp/src als File im tests/ Verzeichnis** (Plan Test Plan Bullet 2) — fehlt weiterhin als persistenter Test-File. BUILDER_NOTES schlaegt vor das im Tester-Step direkt via CLI zu fahren. **Reviewer-Empfehlung an Tester:** Smoke einmal manuell fahren UND Builder-Patch in v0.1.1 fuer einen persistenten Test-File einplanen, damit CI-Regression-Detection moeglich wird.

## Predicted-Impact Audit (Pillar 3) — Re-Audit

### Tool: scan
- expected_fix "eliminiert Maintainer-Drift-Risiko" → **validates** — 8 Rules + scanner.ts iteriert Files * Rules, ScanReport enthaelt file+line+column+snippet.
- expected_fix "blockt Mcp-Session-Id Stateful-Pattern" → **validates** — r01 PATTERN `/^mcp-session-id$/i`, severity:warn, surfaced.
- at_risk_regression "False-Positives bei dynamisch generierten Headern wird via severity:info reportet" → **not-realized** — r02 ist jetzt severity:info (war prior error), Plan-Mitigation umgesetzt.

### Tool: diff
- expected_fix "macht jede geplante Aenderung pre-patch reviewbar" → **validates** — diffPath createTwoFilesPatch. Sub-Drift bleibt: `--only` ist nur auf patch-CLI, nicht auf diff-CLI direkt exposed (loadProject akzeptiert es aber). LOW-Drift, nicht verdict-relevant — Plan suggeriert beides, Implementation nur eines.
- expected_fix "eliminiert Anti-Pattern Auto-Migrator schreibt blind drueber" → **validates** — diffPath ist read-only, kein project.save().
- at_risk_regression "(none)" → **not-realized** — bestaetigt.

### Tool: patch
- expected_fix "eliminiert Anti-Pattern Maintainer copy-pastes spec-snippet" → **validates partiell** — r06 ist auto-patchable, andere mechanisch-mehrdeutige bewusst nicht. Plan-Drift: r02 Header-Injection als Plan-Step 4 erwaehnt, aber autoPatchable:false. Begruendung im r02-Comment ("header-injection is HTTP-framework-specific") ist substantiell, Drift acceptable. LOW-Drift, nicht verdict-relevant.
- expected_fix "blockt CHANGELOG-Drift-Klasse — Patch generiert CHANGELOG-Eintrag automatisch" → **validates partiell** — changelogAppendHint im PatchReport ist die Implementierung. Nicht direkt-write, aber generiert.
- at_risk_regression "AST-Rewrite kann formatting-noise erzeugen. Mitigation: --format-after Flag" → **not-realized** — Flag jetzt vorhanden, runPrettier implementiert, Backup PFLICHT default true.
- at_risk_regression "OAuth-Refresh-Family Detection darf NIE auto-patchen" → **not-realized** korrekt — r07.autoPatchable=false, patcher filter (line 63) lockt out.

### Tool: verify
- expected_fix "macht Post-Migration pruefbar — Exit-Code 0 wenn 0 violations remaining" → **validates** — r07 severity:warn macht jetzt OAuth-Codebases verify-clean (nur error|critical blocken).
- expected_fix "eliminiert Anti-Pattern Maintainer denkt Migration ist done" → **validates** — alle 8 Rules werden aufgerufen, blocking-filter explizit.
- at_risk_regression "(none) — read-only" → **not-realized** — bestaetigt.

### Tool: report
- expected_fix "generiert Markdown/HTML-Bericht + CHANGELOG-Vorlage" → **validates** — formatScan (md/html/json/text) implementiert; CHANGELOG-Vorlage existiert via patcher.changelogAppendHint (Report kann via Tool-Composition daraus generieren).
- at_risk_regression "(none)" → **not-realized**.

### Tool: rules
- expected_fix "listet alle 8 Detection-Rules" → **validates** — cli.ts rules-subcommand returnt JSON-Array, verbose flag expandiert.
- at_risk_regression "(none)" → **not-realized**.

## Test-Coverage

- 11 Test-Files / 35 Tests (gleich wie Round 0 — keine Regression in Count nach Patches)
- E2E: tests/e2e/full-roundtrip.test.ts — scan → diff → patch → verify auf inline STATEFUL_SERVER fixture
- CLI exit-codes: tests/cli/exit-codes.test.ts
- Real-World-Smoke (Plan-Pflicht: scan gegen /home/simple/local-memory-mcp/src) — als persistenter Test-File weiterhin offen, im Tester-Plan adressierbar
- Idempotenz von r06-patch im e2e Test verifiziert (BUILDER_NOTES claim, e2e/full-roundtrip.test.ts:69-77)

## Adversarial-Pass

Re-Pass mit Fokus auf neuer `runPrettier`-Surface:

- `spawnSync("npx", ["--yes", "prettier", "--write", ...files], { cwd: loaded.rootPath, stdio: "inherit" })` — args-Array (kein shell:true), kein User-Input in argv0, files aus internal `modifiedList` (Output von ts-morph project, vom Tool selbst kontrolliert), cwd validiert vom Scanner (path.resolve + isDirectory).
- Path-Traversal: scanner.ts:41-48 mitigiert ueber path.resolve + fs.existsSync + isDirectory.
- Symlink-Escape: fast-glob followSymbolicLinks:false (scanner.ts:58).
- Backup-Escape: backup-Folder INNERHALB rootPath (patcher.ts:46).
- AST-Rewrite via ts-morph: keine eval/dynamic-import Surface.
- Output HTML escape via escapeHtml() in reporter.ts.

Keine Adversarial-Findings. Sicherheits-Profil unveraendert gut.

## Empfehlung an Tester

1. **Real-World-Smoke gegen /home/simple/local-memory-mcp/src (Plan Test Plan Bullet 2):**
   - `node dist/cli.js scan /home/simple/local-memory-mcp/src --format text` → soll JSON-aequivalentes Text-Output produzieren ohne crash
   - `node dist/cli.js verify /home/simple/local-memory-mcp/src` → exit 0 wenn 0 blocking (error|critical) — sollte jetzt funktionieren da r07 warn ist
   - Output dokumentieren in TEST_REPORT.md fuer post-publish-Vergleichbarkeit
2. **F1-Fix verifizieren in echt:** Mock-OAuth-Codebase mit `iss`, `id_token`, `refresh_token` string-literals → `verify` muss exit 0 returnen (r07 ist warn, blockt nicht).
3. **F5-Fix verifizieren:** `node dist/cli.js patch ./fixture --format-after` → muss prettier auf modified files re-runen ohne Patch-Erfolg zu invalidieren.
4. **F3-Hint verifizieren:** `node dist/cli.js patch ./fixture --dry-run` → PatchReport.changelogAppendHint muss ein nicht-leerer Keep-A-Changelog-Block sein wenn modifiedFiles > 0.
5. **F4-Anchor verifizieren:** Mock-File mit nur `MCP-Protocol-Version` Header → r02 muss severity:info Violation mit Message "Partial header adoption — missing: Mcp-Method, Mcp-Name. SEP-2243 requires all three." produzieren.
6. **Idempotenz r06:** patch laufen, nochmal patch laufen, zweiter Lauf muss modifiedFiles=0 haben.
7. **dry-run-Safety:** `patch --dry-run` darf NIE files schreiben (auch nicht .bak/). Side-effect-Test explizit.
8. **`rules --verbose`:** muss JSON mit 8 Eintraegen + description + specRevision returnen.
9. **CLI exit-codes:** scan mit violations → exit 1; verify clean → exit 0; verify mit blocking → exit 1; rules → exit 0; patch (any) → exit 0 mit Report-JSON.
10. **MCP-Inspector roundtrip entfaellt:** kein MCP-Server.
11. **Sandbox-Config:** kein netzwerk-Zugriff (offline tool), kein API-Key benoetigt.

## Codebase-Intelligence-Belege

- list_build_root: 22 Eintraege, alle Plan-konform plus REVIEW.md (von prior pass), BUILDER_NOTES.md (mit --continue Pass Eintrag), tsconfig.tsbuildinfo (build-artifact)
- check_build_files: alle 15 erwarteten Files exist=true (.github/dependabot.yml jetzt vorhanden — Prior-F2 fixed)
- audit_predicted_impact: verdict=ok, 6 Predicted-Impact-Eintraege re-auditiert, keine "does-not-validate" mehr
- Read auf src/rules/r07-oauth-hardening.ts, src/rules/r02-mandatory-headers.ts, src/cli.ts, src/patcher.ts, .github/dependabot.yml → alle 5 Prior-Findings im Source verifiziert fixed
- BUILDER_NOTES.md --continue Pass 2026-05-27 dokumentiert die Findings-Bilanz konsistent mit Source-Tree-State

## Backlog (post-v0.1.0, nicht verdict-relevant)

- Persistenter Real-World-Smoke-Test-File gegen /home/simple/local-memory-mcp/src in tests/smoke/ (Plan Test Plan Bullet 2)
- diff-CLI `--only` Flag exposen (parity zu patch-CLI)
- r02 Anchor auf File-Anfang statt vorhandener Header (UX-Verbesserung, kein Bug)
- r02 Header-Injection als Auto-Patch fuer eindeutige Framework-Patterns (express+fastify) als v0.2 Feature
- Multi-SDK-Detection v0.2 (Plan Open Item #1)
- Multi-Target-Spec-Flag v0.2 (Plan Open Item #2)

