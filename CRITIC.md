<!-- Verdict: AMBER -->
# Pre-Publish Security-Tiefen-Audit — mcp-stateless-migrator

## Verdict: AMBER

> **Critic:** mcp-factory-critic (Session post-S1171)
> **Date:** 2026-05-27
> **Prior Stages:** Reviewer GO (Re-Review 2026-05-27) + Tester PASS (35/35 tests gruen, source-diff-since-review = 0 files)
> **Audit Scope:** 12 Pflicht-Kategorien aus S1171 Critic-Prompt, kategorien 11+12 reduced-scope (kein OAuth-Server, keine multi-tenant DB)

## Kurz

Reines offline-CLI-Tool (npm bin) ohne Netzwerk, Auth, DB. Security-Profile ist
strukturell klein: keine Crypto, kein OAuth, kein tenant-state, keine NDJSON,
kein HTTP-Surface. Reviewer hat alle 5 Prior-Findings adressiert, Tester bestaetigt
clean diff seit Review-Verdict.

Aber: README "Detection rules" table behauptet `r07-oauth-hardening` severity=**critical**
und `r02-mandatory-headers` severity=**error**. Source-of-truth (src/rules/) ist
`r07: warn` und `r02: info`. Das ist genau die Klasse von README-Honesty-Drift
die in den S1171 Critic-Pflicht-Kategorien 8+10 ("Tool-Annotation Drift" + "README
Honesty") als MEDIUM klassifiziert ist. Fuer ein v0.1.0 mit Public-NPM-Distribution
+ Roadmap-Blogpost-Linkage ist die Frontdoor-Doku ein Trust-Signal — die muss vor
Tag stimmen.

Keine HIGH oder CRITICAL Findings. 2 MEDIUM (README-Drift) + 3 LOW. Builder
--patch kann beides in <5 min fixen.

## Audit-Kategorien (12)

### 1. Crypto-Anti-Patterns
- **clean.** Keine Crypto-Surface. Keine HMAC, kein Hash, kein randomBytes, keine
  Timing-Sensitive-Compares. SPEC_REVISION String + ISO-Timestamp im
  backup-Folder-Name sind nicht-security-relevant.

### 2. NDJSON / Parsing Edge-Cases
- **clean.** Kein NDJSON. Einzige `JSON.parse`-Site ist `readVersion()` in
  `src/cli.ts:13-28` mit try/catch + structural-Check + fallthrough-Default
  `"0.0.0-dev"`. Defense-in-depth ok.

### 3. File-System Race Conditions / TOCTOU
- **Finding F-1 (LOW):** Klassisches TOCTOU-Window in `src/scanner.ts:41-48` —
  `fs.existsSync(resolved) + fs.statSync(resolved)` sind zwei Syscalls vor dem
  spaeteren `fast-glob`-Pass und ts-morph `addSourceFileAtPath`. Threat-Model
  ist allerdings local-CLI auf user-owned-Filesystem (kein privilege-boundary).
  Empfehlung: Doku-Hinweis in SECURITY.md "Tool darf nicht gegen attacker-
  controlled paths gefahren werden". Kein Code-Fix noetig.
- backup-Folder-Erstellung in `patcher.ts:44-49` ist `mkdirSync({recursive:true})`
  + `copyFileSync` — keine separate fs.access/exists race davor. ok.

### 4. Public-Export Hygiene
- **Finding F-2 (LOW):** `src/rules/r01-stateless-core.ts:47` exportiert
  `_SyntaxKindMarker: typeof SyntaxKind = SyntaxKind`. JSDoc-Kommentar nennt
  "tree-shaking happy when consumers introspect rules". Das ist eine
  semantisch-sinnlose Public-Export — der Unterstrich-Prefix signalisiert
  internal, aber ohne `@internal` JSDoc-Marker landet das im d.ts und damit
  in der oeffentlichen API-Oberflaeche der npm-Lib. Empfehlung: entweder
  `@internal` JSDoc-Tag oder ganz raus. Nicht-blockierend.
- `package.json` "files" Array korrekt schmal (dist + README + LICENSE +
  CHANGELOG). package-Inhalt nicht ausufernd.
- `main: dist/index.js` + `types: dist/index.d.ts` deklariert — `src/index.ts`
  steuert die Programmatic-API. Pattern ist sauber.

### 5. CI/CD Workflow Gaps
- **clean fuer den core-flow:** `.github/workflows/ci.yml` hat:
  - Node 20 + 22 matrix
  - `npm ci && npm run build && npm test`
  - Source-link-grep-Lint fuer alle rules/r*.ts
  - publish-job mit OIDC `id-token: write` + `npm publish --provenance --access public`
- npm `--provenance` Flag generiert Sigstore-Attestation via GitHub OIDC
  automatisch (npm 9.5+). Kein separates `actions/attest-build-provenance@v2`
  noetig fuer npm-Targets.
- **Finding F-3 (LOW):** Keine OpenSSF Scorecard, kein CodeQL, kein
  Lint-Workflow (eslint/prettier --check). Plan hatte 7-File-OS-Standard
  Pflicht, nicht Scorecard. Acceptable fuer v0.1.0, aber als post-v0.1.1
  Backlog notieren.
- `permissions: contents: read` global + `id-token: write` only im publish-job
  = principle-of-least-privilege ok.
- Actions sind unpinned auf `@v4` Major-Tag (actions/checkout@v4,
  actions/setup-node@v4). SHA-Pin waere supply-chain-strenger; v4-Tags von
  GitHub-published Actions sind aber praxistauglich. LOW, nicht
  verdict-relevant.

### 6. Supply-Chain Risks
- **verified:** ts-morph@28.0.0, commander@14.0.3, diff@9.0.0, fast-glob@3.3.3
  alle exists=true via npm-registry-check.
- `npm ci` im CI-Job verlangt sauberes lockfile — package-lock.json ist im
  repo (111 KB).
- Dependabot konfiguriert (`.github/dependabot.yml`) fuer npm + github-actions
  weekly monday, Labels + commit-prefix gesetzt. Trust-Stack ist real.
- **Finding F-4 (LOW):** `src/patcher.ts:33-42` `runPrettier()` ruft
  `spawnSync("npx", ["--yes", "prettier", "--write", ...files], { cwd })`.
  Das `--yes` Flag installiert prettier zur Laufzeit aus der npm-Registry
  wenn nicht schon im node_modules. Damit haengt das Verhalten von
  `--format-after` an einer Runtime-resolved Drittpartei. Mitigation:
  Opt-in via Flag (Default false), Failure non-fatal, args-Array (kein
  shell:true) → kein Injection. Empfehlung: README-Note "--format-after
  fetches prettier on first use".

### 7. State-Persistence Lies
- **clean.** Pure one-shot CLI. Keine in-memory Maps, keine Singletons mit
  lifecycle, kein audit-log, kein restart-state. ts-morph Project ist
  per-invocation, gc'd nach process.exit.

### 8. Tool-Annotation Drift
- **Finding F-5 (MEDIUM):** README.md Zeile 40 listet `r07-oauth-hardening`
  severity = **critical**. Source-of-truth `src/rules/r07-oauth-hardening.ts:20`
  ist `severity: "warn"`. Reviewer-F1 hat genau diese Severity prior gefixt
  (von critical → warn), aber README nicht mitgezogen. Konsequenz: Maintainer
  liest README, erwartet OAuth-Findings = verify-blocking, faehrt verify,
  Exit-Code 0 (weil warn nicht blockt) — Trust-Bruch.
- **Finding F-6 (MEDIUM):** README.md Zeile 35 listet `r02-mandatory-headers`
  severity = **error**. Source-of-truth `src/rules/r02-mandatory-headers.ts:20`
  ist `severity: "info"`. Reviewer-F4a hat das prior gefixt (von error → info,
  per Plan-Vorgabe), aber README nicht mitgezogen. Selbe Drift-Klasse wie F-5.
- Beide Fixes: README-Tabelle r02 → info, r07 → warn. Ein-Zeilen-Edit pro
  Eintrag. Kein Code-Fix noetig.

### 9. Normalization Coverage Gaps
- **clean.** Keine user-facing-input-Pfade die NFKC/Bidi-Defense brauchen.
  Path-Arg geht durch `path.resolve` + `fs.existsSync`; ts-morph parsed
  Source-Files (Unicode bereits vom TS-Parser handled).
- `simulate_attacker_input`-Payloads waeren hier nicht applicable (kein
  HTTP-Server, kein Tool-Arg-Surface).

### 10. README / Doku Honesty
- **Drift identisch zu Kategorie 8** (F-5 + F-6).
- CHANGELOG.md v0.1.0 ist konsistent mit Code (listet alle 8 Rules + Backup-
  Strategie + provenance) — keine claims ohne implementation hier.
- SECURITY.md hat sauberen Threat-Model-Block + supply-chain-section
  (provenance + Dependabot). Honest.
- README "Restore via `cp -r .bak.<timestamp>/. .`" ist semantisch korrekt
  (backup enthaelt nur touched files in original-Pfad-Struktur, cp -r merged
  zurueck). ok.
- v0.2-Roadmap implizit via Plan-Open-Items (multi-SDK, multi-target); README
  signalisiert "v0.2.0 will re-validate against the Tier-1 SDK final release".
  Honest und realistisch.

### 11. Tenant-Isolation (customer-mcp Mode)
- **N/A — clean by absence.** Kein multi-tenant, keine DB, keine customer_slug.
  Reines offline-Tool. Kategorie 11 hat keine Surface.

### 12. OAuth-1-Click-Takeover-Defense (OAuth-Builds)
- **N/A — clean by absence.** Build ist kein OAuth-Server. r07-Rule **detected**
  OAuth-Patterns in den TARGETS des Migrators (string-literal scan auf
  iss/id_token/application_type/refresh_token), aber dieses CLI selbst hat
  keinen OAuth-Flow. Kategorie 12 hat keine Surface.

## Top-Findings (priorisiert nach Severity)

### F-5: README severity drift fuer r07-oauth-hardening — MEDIUM
- Pfad: `README.md:40` (Detection-rules-Tabelle)
- Beobachtung: README sagt `critical`, Code (`src/rules/r07-oauth-hardening.ts:20`)
  ist `warn`. Reviewer hat im AMBER→GO-Pass den Code von critical auf warn
  korrigiert (Prior-F1-Fix), README wurde nicht mitgezogen.
- Warum wichtig: Trust-Signal-Klasse. Maintainer trifft `verify`-Erwartungs-
  Entscheidung basierend auf README-Severity. critical wuerde blocken, warn
  blockt nicht. README/Code-Mismatch → user-confusing-experience direkt nach
  npm install. v0.1.0 published mit dieser Drift wuerde sofort GitHub-Issues
  triggern.
- Empfehlung: README.md Tabelle Zeile 40 `critical` → `warn`. Optional dazu
  CHANGELOG-Note in v0.1.0 "r07 severity downgraded warn (was critical in
  pre-review)".
- Verifiziert mit: Read auf README.md:40 + Read auf src/rules/r07-oauth-hardening.ts:20.

### F-6: README severity drift fuer r02-mandatory-headers — MEDIUM
- Pfad: `README.md:35` (Detection-rules-Tabelle)
- Beobachtung: README sagt `error`, Code (`src/rules/r02-mandatory-headers.ts:20`)
  ist `info`. Selbe Drift-Klasse wie F-5; Reviewer hat im AMBER→GO-Pass den
  Code per Plan-Vorgabe von error auf info korrigiert (Prior-F4a-Fix), README
  wurde nicht mitgezogen.
- Warum wichtig: Selbe Trust-Signal-Logik. `verify` mit error blockt, mit info
  nicht. Plan-Predicted-Impact ("False-Positives bei dynamisch generierten
  Pflicht-Headern wird via severity:info reportet statt warn") ist im Code
  korrekt umgesetzt, aber durch README-Drift verschleiert.
- Empfehlung: README.md Tabelle Zeile 35 `error` → `info`. Selbe Strategie
  wie F-5 fuer CHANGELOG.
- Verifiziert mit: Read auf README.md:35 + Read auf src/rules/r02-mandatory-headers.ts:20.

### F-1: TOCTOU window scanner.ts resolveRoot — LOW
- Pfad: `src/scanner.ts:41-48`
- Beobachtung: existsSync + statSync zwei separate syscalls vor fast-glob +
  ts-morph addSourceFileAtPath. Theoretisches TOCTOU-Window wenn ein Angreifer
  zwischen den Calls den Pfad-Inhalt tauscht.
- Warum wichtig: Threat-Model fuer ein local-CLI = user-owned-Filesystem
  praktisch nicht ausnutzbar (Angreifer haette schon shell-zugriff auf user-
  Account und braeuchte das Migrator-Tool nicht). Aber: Doku-Honest-Statement
  in SECURITY.md "Tool darf nicht auf attacker-controlled-paths gefahren werden"
  schliesst das Window discoursive.
- Empfehlung: SECURITY.md Threat-Model-Block ergaenzen um Punkt 4 "Do not run
  against untrusted paths". Code-Fix nicht erforderlich.
- Verifiziert mit: Read auf src/scanner.ts:41-48 + Read auf SECURITY.md:18-23.

### F-2: Public-Export _SyntaxKindMarker pollution — LOW
- Pfad: `src/rules/r01-stateless-core.ts:47`
- Beobachtung: `export const _SyntaxKindMarker: typeof SyntaxKind = SyntaxKind;`
  Kommentar nennt "tree-shaking happy". Underscore-Prefix signalisiert internal,
  aber Export ohne `@internal` JSDoc-Tag landet trotzdem im d.ts der Public-API.
- Warum wichtig: API-Oberflaeche soll schmal sein. Konsumenten die `import * from`
  machen sehen _SyntaxKindMarker und koennten irrtuemlich darauf referenzieren —
  spaetere Entfernung waere dann breaking. Nicht-blockierend fuer v0.1.0 weil
  Underscore-Konvention plus erwartbar kein-Consumer-fuer-Internal-Marker, aber
  Hygiene-Backlog.
- Empfehlung: Entweder `/** @internal */` JSDoc-Tag setzen, oder ganz entfernen
  (tree-shaking auf typeof-import sollte ohnehin elidiert werden vom TS-Compiler).
- Verifiziert mit: Read auf src/rules/r01-stateless-core.ts:47.

### F-3: Kein OpenSSF-Scorecard / CodeQL / Lint-Workflow — LOW
- Pfad: `.github/workflows/`
- Beobachtung: ci.yml hat test+publish, dependabot.yml ist da, aber kein
  scorecard.yml + kein codeql.yml + kein lint.yml. Plan hat das nicht explizit
  gefordert (7-File OS-Standard ist erfuellt), aber S1171 Build-Patterns nennen
  Scorecard als Trust-Stack-Standard.
- Warum wichtig: OpenSSF-Scorecard erzeugt sichtbare Trust-Signale (Badge,
  publicly-visible Scores). Fuer ein Tool das andere Maintainer ueberreden soll
  ihre Codebases damit zu scannen ist die eigene Scorecard ein soft-trust-Hebel.
- Empfehlung: v0.1.1 Backlog — scorecard.yml hinzufuegen (publish_results:true)
  + Badge im README.
- Verifiziert mit: Glob auf .github/workflows/ → nur ci.yml.

### F-4: runPrettier --format-after pulls live registry — LOW
- Pfad: `src/patcher.ts:33-42`
- Beobachtung: `spawnSync("npx", ["--yes", "prettier", "--write", ...files], ...)`.
  `--yes` flag = npx installiert prettier aus der Registry on-first-use wenn
  nicht im node_modules. Damit haengt das Verhalten von `--format-after` an
  einem live registry fetch.
- Warum wichtig: Opt-in Flag (Default false), spawn-Failures non-fatal (patch
  ist schon angewendet), args-Array (kein shell:true) → kein Injection-Vektor.
  Aber Maintainer-Erwartung "deterministisches CLI-Verhalten" wird gebrochen
  wenn die Registry mal nicht erreichbar ist.
- Empfehlung: README-Note "--format-after fetches prettier on first use via
  npx; offline behaviour: silently skipped". Backlog: pruefe ob prettier
  als optionalDependency sinnvoller waere.
- Verifiziert mit: Read auf src/patcher.ts:33-42.

## Verdict-Begruendung

**AMBER weil:**
- 0 HIGH oder CRITICAL Findings — kein Security-Tiefen-Issue, kein
  publish-blocker.
- 2 MEDIUM (F-5 + F-6) sind README-Honesty-Drift gegen den Source-of-Truth
  Code. Beide sind 1-Zeilen-Edits, beide sind nicht im README als
  Known-Issue dokumentiert. S1171 Critic-Rule sagt explizit:
  "MEDIUM-Findings sind alle als Known-Issues im README dokumentiert ODER
  post-publish-fixable. → GO. AMBER wenn mehrere MEDIUM ohne README-Known-
  Issues-Section." Hier ist beides nicht der Fall, also AMBER.
- 3 LOW (F-1 + F-2 + F-3 + F-4 zaehlt 4) sind alle non-blocking-backlog.

**GO ist nicht gerechtfertigt** weil die README-Drift genau die Klasse von
Trust-Signal ist die wir bei v0.1.0 Public-NPM-Publish nicht eingehen wollen
— Frontdoor-Doku muss vor Tag stimmen.

**NO-GO ist nicht gerechtfertigt** weil kein strukturelles Problem, keine
Krypto-Mission, keine Supply-Chain-Compromise. Strict-2-Zeilen-README-Patch
genuegt.

## Builder-Brief (--patch Mode)

Builder bekommt CRITIC.md als zweiten Brief zusammen mit REVIEW.md (Reviewer
GO + Tester PASS bleiben gueltig). Patch-Liste:

1. **README.md Zeile 35** (`r02-mandatory-headers`): severity `error` → `info`.
2. **README.md Zeile 40** (`r07-oauth-hardening`): severity `critical` → `warn`.
3. **(optional) CHANGELOG.md v0.1.0** unter `### Added` einen Eintrag ergaenzen:
   "Severity calibration: r02 = info (partial-adoption detector), r07 = warn
   (signal-only OAuth surface scan)."
4. **(optional, post-v0.1.0)** SECURITY.md Threat-Model um Punkt 4 erweitern:
   "Do not run against attacker-controlled paths (potential TOCTOU between
   path resolve and file load)."

Nach Patch: kein neuer Reviewer-Pass noetig (nur README-Strings + optionaler
CHANGELOG-Eintrag, keine Code/Test-Aenderung). Tester re-run optional (keine
Code-Aenderung → check_source_diff_since_review bleibt 0 fuer src/). Critic
Re-Pass nicht erforderlich wenn die 2 README-Lines gefixt sind — direkter
GO durch Operator/CEO.

Sobald --patch durch: `git tag v0.1.0 && git push origin v0.1.0` → ci.yml
publish-job mit OIDC + `npm publish --provenance --access public`.

## Empfehlung an Operator / CEO

- Builder --patch mit obigen 2 (oder 4) Edits starten.
- Kein Architect-Re-Plan noetig.
- Post-Publish Backlog v0.1.1: persistenter Real-World-Smoke-Test-File
  (Reviewer Backlog Bullet 1) + Scorecard-Workflow + _SyntaxKindMarker
  Hygiene + diff-CLI `--only` parity (Reviewer Backlog Bullet 2).
- Plan-Konformitaet ist 100% auf den initial gefassten Punkten, nur Doku-
  Konsistenz ist nicht-getroffen.

