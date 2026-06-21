# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.2] - 2026-06-21

### Fixed

- **r06 auto-patch correctness (missed cases):** the resource-not-found error-code rewrite now recognises every hand-written spelling of a `code` property, not just an identifier key. It previously *silently skipped* `{ "code": -32002 }` / `{ 'code': -32002 }` (string-literal keys) and `class E { code = -32002 }` (class fields), leaving a non-conformant error code in place. Property-name matching is normalised (surrounding quotes stripped) while computed keys (`{ [k]: -32002 }`) and any property not named exactly `code` (e.g. `data`, `status`, `codeValue`) stay untouched — no false rewrites. Added detection + patch + idempotency fixtures for each spelling plus the must-not-rewrite cases. Symbolic `ErrorCode.ResourceNotFound` / positional `McpError(-32002, …)` sites remain deliberately out of scope (no safe mechanical mapping) and are documented as such.

### Added

- `typecheck` npm script (`tsc --noEmit -p tsconfig.typecheck.json`) that type-checks `src` **and** `tests` under the strict compiler options, wired into CI before the test run so test-only type regressions can no longer slip through.
- e2e idempotency coverage: a second full-fleet `patch` over a realistic multi-rule server is asserted to be a byte-for-byte no-op with an empty planned diff, and `diff` is asserted to be stable + read-only across repeated calls.

[0.1.2]: https://github.com/studiomeyer-io/mcp-stateless-migrator/releases/tag/v0.1.2

## [0.1.1] - 2026-05-30

### Fixed

- **r06 auto-patch correctness:** the error-code rewrite now collects all matching nodes before mutating instead of replacing during AST traversal, so files containing more than one `{ code: -32002 }` are fully and idempotently patched. Added a multi-occurrence regression test.
- **Canonical SEP citations:** every rule's `Source` link now points at the canonical SEP file in `modelcontextprotocol/modelcontextprotocol/seps/` (previous `discussions/...` and `specification/pull/...` links were non-canonical or did not resolve). r01 → SEP-2567, r03 → SEP-2663, r07 → SEP-2468, r08 → SEP-2596.
- **r03 (Tasks):** stops conflating removed methods with extension methods — `tasks/list` + `tasks/result` are reported as *removed* (a server still answering `tasks/result` MUST return `-32601`), while `tasks/get`/`tasks/update`/`tasks/cancel` are reported as *extension-only* (valid under `io.modelcontextprotocol/tasks`, SEP-2663).
- **r04 (MCP Apps):** detects the real SEP-1865 surface — the `ui://` resource scheme, the `text/html;profile=mcp-app` content type, and the `io.modelcontextprotocol/ui` identifier — instead of markers that never appear in the SEP.
- **r08 (transport):** no longer flags `streamableHttp` (the *current* transport); detects the legacy HTTP+SSE paths `/sse` + `/messages`, deprecated under SEP-2596.
- **r05 (deprecations):** also detects `notifications/roots/list_changed` and `notifications/message`.
- **README severity drift:** the detection-rules table now matches the code — `r02-mandatory-headers` is `info` and `r07-oauth-hardening` is `warn`.

### Changed

- `r02` message + docs clarify that `Mcp-Method`/`Mcp-Name` come from SEP-2243 while the protocol version travels per-request via `_meta` (SEP-2575), not a header.
- `patcher` counts a file as modified by comparing actual text before/after (ground truth) instead of trusting a rule's `applied` flag; removed a dead `continue`.
- Marked the internal `_SyntaxKindMarker` export `@internal`.
- Corrected ecosystem links: `mcp-spec-migrator` is a TypeScript npm CLI (not a Rust crate) and `mcp-protocol-conformance` is a Rust tool on GitHub; both prior `crates.io` links were dead. Refreshed MCP spec / SEP reference URLs.

### Added

- OpenSSF Scorecard + CodeQL workflows, README status badges (npm / CI / Scorecard / license), and an issue-template `config.yml` (`blank_issues_enabled: false` + private security-report link).
- Expanded the test suite from 39 to 131 tests: scanner aggregation + ignore-globs + skip-on-parse-error, reporter formats (json/text/md/html), patcher diff/backup/dry-run/changelog-hint, rule-registry invariants, and per-rule edge cases (incl. the r06 multi-occurrence regression).

[0.1.1]: https://github.com/studiomeyer-io/mcp-stateless-migrator/releases/tag/v0.1.1

## [0.1.0] - 2026-05-26

### Added

- Initial release.
- 6 CLI subcommands: `scan`, `diff`, `patch`, `verify`, `report`, `rules`.
- 8 migration detection rules for MCP-Spec 2025-11-25 -> 2026-07-28 RC:
  - `r01-stateless-core` — detects `Mcp-Session-Id` stateful patterns.
  - `r02-mandatory-headers` — detects missing `MCP-Protocol-Version`, `Mcp-Method`, `Mcp-Name` headers (SEP-2243).
  - `r03-tasks-extension` — detects core `tasks/*` references moved to extension.
  - `r04-apps-extension` — detects MCP Apps Extension SEP-1865 surface (detect-only).
  - `r05-deprecations` — warns on Roots, Sampling, Logging deprecations (SEP-2577).
  - `r06-error-code-shift` — detects error code `-32002` (auto-patch to `-32602`, SEP-2164).
  - `r07-oauth-hardening` — detects OAuth `iss` validation, DCR `application_type`, refresh family gaps (detect-only).
  - `r08-endpoint-shape` — detects `streamableHttp` endpoint shape changes.
- AST-rewrite engine via `ts-morph@28`.
- Backup folder strategy (`.bak.<timestamp>/`) for `patch` subcommand.
- npm distribution with provenance via GitHub OIDC.
- 7-File OS-Standard: CONTRIBUTING + CODE_OF_CONDUCT + SECURITY + ECOSYSTEM + 2x ISSUE_TEMPLATE + PULL_REQUEST_TEMPLATE.

[0.1.0]: https://github.com/studiomeyer-io/mcp-stateless-migrator/releases/tag/v0.1.0
