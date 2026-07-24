FROM ghcr.io/astral-sh/uv:0.9.13 AS uv

FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY --from=uv /uv /uvx /bin/
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY . ./

ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 18080

CMD ["uvicorn", "runtime.api:app", "--host", "0.0.0.0", "--port", "18080"]
