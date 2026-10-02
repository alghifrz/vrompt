# Vrompt

Vrompt turns a project idea into a validated `ProjectSpec`, then generates deterministic AI coding-agent configuration.

```text
Home → Start → Interview → Review → Ready → Generate → Preview → ZIP
```

`ProjectSpec` is the canonical model. Markdown, rules, and ZIP files are derived outputs.

## Architecture

```text
UI  →  Server Actions / Route Handlers  →  Application services
                                              ├─ Auth (Clerk)
                                              └─ Repositories
                                                    └─ PostgreSQL (or memory in local/test)
                                                         └─ ProjectSpec
                                                              └─ Core
                                                                   ├─ Renderers
                                                                   ├─ Consistency
                                                                   └─ Generation
                                                                        └─ ZIP
```

| Layer | Path | Owns |
|---|---|---|
| Core | `src/core` | Domain types, `ProjectSpec`, interview engine, generation, consistency |
| Renderers | `src/renderers` | Deterministic target output |
| Server | `src/server` | Auth, persistence, application flows, ZIP export |
| UI | `src/app`, `src/components` | Routes, forms, presentation |

Core must stay independent of Next.js, React, Clerk, Drizzle, PostgreSQL, filesystem APIs, and environment variables.

## Project structure

```text
src/
  app/             routes, server actions, export API
  components/      interview, review, generation UI
  core/            domain, interview, generation, consistency
  lib/             view models and safe error mapping
  renderers/       AGENTS.md, Cursor, Qoder, Claude Code
  server/          auth, db, repositories, flows, ZIP
  test/            vitest setup
drizzle/           SQL migrations
```

## Local setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

Local development can run without PostgreSQL. The process then uses an in-memory store. That fallback is for development and tests only.

## Environment variables

| Variable | Scope | Local | Production |
|---|---|---|---|
| `DATABASE_URL` | server | optional | required |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | public | required to start projects | required |
| `CLERK_SECRET_KEY` | server | required to start projects | required |
| `DASHSCOPE_API_KEY` or `LLM_API_KEY` | server | optional (mock fallback) | required |
| `LLM_BASE_URL` | server | DashScope intl default | optional |
| `LLM_MODEL` | server | `qwen-plus` default | optional |

Optional Clerk routing values are documented in `.env.example`. Do not commit `.env`, `.env.local`, or `.env.*.local`.

## Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

Production uses PostgreSQL. `projects` and `interview_sessions` are owner-scoped. One interview session exists per project. Deleting a project cascades to its interview session.

Interview session and project spec writes are sequential, not a shared database transaction. If the spec write fails after the session write, the user sees a safe persistence error.

## Clerk

1. Create a Clerk application.
2. Put the publishable and secret keys in `.env.local`.
3. Set the Clerk sign-in URL to `/sign-in` and the sign-up URL to `/sign-up`.
4. After sign-in or sign-up, send users to `/start`.
5. Enable sign-ups in the Clerk dashboard if the Sign up link is missing.

Without Clerk keys the public pages still render. The sign-in page explains that authentication is not configured. It never prints secret names or values.

Protected routes are `/start`, `/interview`, `/review`, `/generate`, and `/api/projects`. Auth uses `src/middleware.ts` and `clerkMiddleware`. Next.js 16 may mention a future `proxy.ts` file. Do not rename middleware unless the installed Clerk version documents that change.

No Clerk webhooks are required.

## Commands

```bash
pnpm install
pnpm dev

pnpm typecheck
pnpm lint
pnpm test
pnpm build

pnpm db:generate
pnpm db:migrate
pnpm db:studio
```

`pnpm test` is offline. It does not connect to PostgreSQL or Clerk.

## Generation targets

Generation is deterministic renderer output from the persisted, validated, ready `ProjectSpec`. It is not a live model call.

- AGENTS.md
- Cursor (`.cursor/rules`)
- Qoder (`.qoder/rules`)
- Claude Code (`CLAUDE.md`, `.claude/rules`)

ZIP export is server-side only:

```text
GET /api/projects/[projectId]/export?targets=cursor,agents-md
```

The handler authenticates, checks ownership, reloads the persisted spec, validates readiness, and writes paths under `vrompt-export/<target>/`. Absolute paths, `..`, and duplicate entries are rejected.

The interviewer uses a development mock, not a production model vendor

## Deployment

Intended production shape:

```text
Next.js application + PostgreSQL + Clerk
```

1. Set `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
2. Set Clerk URLs for the production origin (`/sign-in`, redirect to `/start`).
3. Run `pnpm db:migrate`.
4. Build with `pnpm build`.
5. Start with `pnpm start`.

Production without `DATABASE_URL` fails clearly. Do not use the in-memory store in production.

There is no distributed rate limiter. Generation is local and deterministic. ZIP export does not read arbitrary files or fetch URLs.

## Known limitations

- No generation history or stored export artifacts
- No distributed rate limiting
- No team collaboration or sharing
- Interview session and project spec persistence is sequential
- Signed-in manual testing requires Clerk credentials
- The interviewer uses DashScope/Qwen or another OpenAI-compatible endpoint when a key is set. Local/test without a key still uses the development mock.

## Core boundaries

`src/core` is covered by an automated import-boundary test. Do not import Next.js, React, Clerk, Drizzle, PostgreSQL clients, Node filesystem APIs, or `process.env` there.
