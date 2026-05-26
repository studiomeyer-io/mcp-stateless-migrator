# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
