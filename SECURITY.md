# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | yes (current) |

## Reporting a vulnerability

Email `security@studiomeyer.io` with:
- a description of the issue,
- a minimal reproduction,
- the version affected.

Please **do not** open a public GitHub issue for security-sensitive reports. We will acknowledge receipt within 72 hours and aim to publish a fix within 14 days for high-severity issues.

## Scope

This tool runs **locally** against source files. It does not transmit data anywhere and does not require credentials. Threat model is limited to:
1. Malformed source files causing the AST loader to crash (mitigated: `addSourceFileAtPath` failures are skipped silently).
2. Path traversal via the `<path>` argument (mitigated: `path.resolve` + existence check before glob).
3. Backup folder writes outside the target tree (mitigated: backup root is always inside the resolved target directory).

## Supply chain

- npm packages are published with provenance (`--provenance`) via GitHub OIDC.
- Dependencies are pinned via `package-lock.json` and updated through Dependabot.
- See [ECOSYSTEM.md](./ECOSYSTEM.md) for the trust stack.
