# AGENTS.md

Entry point for Codex and other coding agents working in `scaffold.dofe.ai`.
Keep this file short; route detailed reading by task.

## Project Role

`scaffold.dofe.ai` owns the reusable Dofe full-stack scaffold and
`create-dofe-ai` template behavior.

For cross-project ownership, read:

- [Dofe Project Matrix](../docs/PROJECT-MATRIX.md)
- [CLAUDE.md](./CLAUDE.md) for full local conventions when needed
- [Shared Agent Rules](./docs/shared-agent-rules/README.md) for reusable
  architecture boundaries

## Red Lines

- Keep scaffold defaults generic. Product-specific behavior belongs in
  `sso.dofe.ai`, `models.dofe.ai`, `agents.dofe.ai`, or `vibecoding.dofe.ai`.
- DB access must go through the DB service layer; do not use raw
  `prisma.write` / `prisma.read` in API or service code.
- API contracts and external interfaces must be Zod-first and ts-rest aligned.
- External API calls belong in client-layer code, not directly in business
  services.
- Use Winston/project logging patterns for production code; avoid `console.log`.

## Task Routing

| Task                                | Read First                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| Scaffold export or template changes | `CLAUDE.md`, `scripts/export-scaffold-for-create.js`, affected template files |
| Frontend UI changes                 | `CLAUDE.md`, affected component/page, related tests                           |
| API or contract changes             | `CLAUDE.md`, `packages/contracts`, controller/service, related tests          |
| DB or Prisma changes                | `CLAUDE.md`, Prisma schema, DB service code, related tests                    |
| Cross-project behavior              | [Dofe Project Matrix](../docs/PROJECT-MATRIX.md)                              |
| Architecture boundary changes       | `docs/shared-agent-rules`, affected checks/tests                              |

## Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm type-check
pnpm test
pnpm quality:gate
```

Use focused package commands while iterating; use `pnpm quality:gate` before
shipping scaffold or architecture-affecting changes.

## Completion

- Keep changes scoped to the requested scaffold/template surface.
- Run the narrowest meaningful validation first, then `pnpm quality:gate` for
  cross-boundary or release-facing changes.
- Report any unrelated existing worktree changes without reverting them.
