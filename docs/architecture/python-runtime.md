# Python Runtime Architecture

## Service Ownership

The browser communicates only with the Next.js application and NestJS API.
Python is an internal runtime for long-running content generation; it is never
an unauthenticated browser-facing API.

```text
Next.js workbench
        |
        | ts-rest client generated from @repo/contracts
        v
NestJS API
  - authentication and user ownership
  - public REST contract and error semantics
  - Python runtime client
        |
        | internal HTTP + x-runtime-secret
        v
Python runtime
  - job execution and progress
  - legacy novel_generator implementation
  - project filesystem artifacts
```

## Public Contract

`packages/contracts/src/api/studio.contract.ts` is the public contract for the
first writing workflow:

- `POST /studio/projects` creates an asynchronous architecture-generation job.
- `GET /studio/jobs/:jobId` returns the caller-owned job's current state.

Both request and response shapes are Zod schemas. The Next.js client and NestJS
controller import the same contract; neither manually recreates request or
response interfaces.

## Runtime Contract

The Python runtime uses a separate internal HTTP interface:

- `POST /v1/generation-jobs`
- `GET /v1/generation-jobs/{jobId}?owner_id=...`

NestJS attaches the authenticated local user ID, a Nest-generated `jobId`, and
the runtime shared secret. The runtime verifies the caller and treats repeated
requests for the same owner/project/`jobId` as idempotent, so NestJS keeps the
authoritative Project/Run identity even when it retries an internal request.
Model credentials are runtime environment variables (`LLM_API_KEY`,
`LLM_BASE_URL`, `LLM_MODEL`), never browser input or public API fields.
Each execution writes artifacts to `outputs/<runId>/` and an atomically updated
status checkpoint to `checkpoints/<runId>/status.json` under its project
workspace. These files support diagnostics and future worker recovery; NestJS
remains the authoritative Project/Run record.

## Local Startup

The runtime uses `uv` and Python 3.14. From `backend/`, install the locked
runtime and test dependencies with `uv sync --group dev`; run its tests with
`uv run pytest`. Vector retrieval and the legacy desktop UI are optional:
install them with `uv sync --extra retrieval` and `uv sync --extra desktop`
when those capabilities are needed. The Docker image uses the same frozen
`uv.lock` file and does not install packages with `pip`.

Set the following before `docker compose up --build`:

```bash
export NOVEL_RUNTIME_SHARED_SECRET='replace-with-a-long-random-secret'
export LLM_API_KEY='provider-key'
export LLM_BASE_URL='https://api.openai.com/v1'
export LLM_MODEL='gpt-4.1-mini'
export LLM_INTERFACE_FORMAT='OpenAI'
```

The compose network exposes the Python runtime only to the NestJS API. Generated
project artifacts persist in the `novel_runtime_data` Docker volume.
