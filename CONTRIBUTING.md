# Contributing

Thanks for taking the time. This is a small, focused CLI — contributions stay welcome but should match the project tone.

## Local setup

```bash
git clone https://github.com/studiomeyer-io/mcp-stateless-migrator
cd mcp-stateless-migrator
npm install
npm run build
npm test
```

Requires Node >= 20.

## Adding a new rule

1. Create `src/rules/rNN-<slug>.ts` exporting a `Rule` object.
2. Top of file: `// Source: <SEP-link>` comment (CI greps for it).
3. Register the rule in `src/rules/index.ts` `RULES` array.
4. Add a test in `tests/rules/rNN-<slug>.test.ts` with at least: happy-path, edge-case, false-positive resistance.
5. Bump the rule table in `README.md` and add a `CHANGELOG.md` entry.

Auto-patchable rules MUST be idempotent — running `patch` twice should produce zero additional changes.

## PR checklist

- [ ] `npm test` green
- [ ] `npm run build` green
- [ ] New rule has a Source SEP link
- [ ] README rule table updated
- [ ] CHANGELOG entry added

## Code style

- TypeScript strict mode, no `any`
- Zod schemas for CLI args (already in `src/cli.ts`)
- No em-dashes in user-facing text
- No marketing-style copy in commit messages
