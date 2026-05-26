# Ecosystem

How `mcp-stateless-migrator` relates to neighbouring tools in the MCP Factory.

## Migration tools

| Tool | Language | Source spec | Target spec | Auto-patch |
|------|----------|-------------|-------------|------------|
| `mcp-spec-migrator-2511` | Rust crate | `2025-06-18` | `2025-11-25` | partial |
| **`mcp-stateless-migrator`** | TypeScript CLI | `2025-11-25` | `2026-07-28-rc` | partial (only `r06-error-code-shift`) |

The Rust migrator is for older codebases moving up to the current production spec. This tool picks up where it leaves off and prepares servers for the upcoming Stateless Core revision. A Rust port (`mcp-stateless-migrator-rs`) is out of scope for v0.1 — re-evaluate once the official Rust SDK `rmcp` finalises 2026-07-28 support.

## Conformance tools

| Tool | Role |
|------|------|
| `mcp-protocol-conformance` | Runtime validator (does my server speak the spec correctly *right now*?) |
| `mcp-hook-conformance` | Hook-lifecycle validator (SEP-1865 MCP Apps) |
| `mcp-stateless-migrator` | Static migrator (will my server still work *after* the spec bumps?) |

You typically run `mcp-stateless-migrator patch` first, then `mcp-protocol-conformance` against the patched server to catch what static analysis missed.

## Sidecars

`mcp-armor` (Rust) is a defensive sidecar that wraps a stdio MCP server with signature checks, attestation, and shell-guard rules. It is orthogonal to this migrator — the migrator rewrites your *source*, mcp-armor runs at *runtime*.

## Spec sources

- Current reference: [MCP Spec 2025-11-25](https://spec.modelcontextprotocol.io/).
- Target: [Release Candidate 2026-07-28](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/), locked snapshot `2026-05-21`.
- SEP tracker: https://github.com/modelcontextprotocol/specification/pulls

## Why static analysis, not runtime

Migration runs once, against a codebase the maintainer controls. Runtime instrumentation costs more, requires harness setup, and cannot reach unexecuted branches. A static AST walk catches every `Mcp-Session-Id` literal regardless of whether the route handler that uses it was hit during testing.
