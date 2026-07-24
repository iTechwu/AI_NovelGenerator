#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

failures=0
warnings=0

section() {
  printf '\n== %s ==\n' "$1"
}

check_no_matches() {
  local label="$1"
  local pattern="$2"
  shift 2
  local tmp
  tmp="$(mktemp)"

  if rg -n "$pattern" "$@" >"$tmp" 2>/dev/null; then
    echo "FAIL: $label"
    cat "$tmp"
    failures=$((failures + 1))
  else
    echo "PASS: $label"
  fi

  rm -f "$tmp"
}

report_matches() {
  local label="$1"
  local pattern="$2"
  shift 2
  local tmp
  tmp="$(mktemp)"

  if rg -n "$pattern" "$@" >"$tmp" 2>/dev/null; then
    local count
    count="$(wc -l <"$tmp" | tr -d ' ')"
    echo "WARN: $label ($count match(es))"
    cat "$tmp"
    warnings=$((warnings + 1))
  else
    echo "PASS: $label"
  fi

  rm -f "$tmp"
}

section "DB client boundary"
check_no_matches \
  "Service/API/domain files must not call getReadClient/getWriteClient directly" \
  "get(Read|Write)Client\\(" \
  apps/api/src apps/api/libs/domain \
  --glob '*.ts' \
  --glob '!**/*.spec.ts' \
  --glob '!**/*.test.ts'

check_no_matches \
  "Service/API/domain files must not call prisma.read/prisma.write directly" \
  "prisma\\.(read|write)" \
  apps/api/src apps/api/libs/domain \
  --glob '*.ts' \
  --glob '!**/*.spec.ts' \
  --glob '!**/*.test.ts'

section "Nest module boundaries"
check_no_matches \
  "API modules must not be marked @Global()" \
  "@Global\\(" \
  apps/api/src/modules \
  --glob '*.module.ts' \
  --glob '!**/*.spec.ts' \
  --glob '!**/*.test.ts'

check_no_matches \
  "@Cron decorators must live under apps/api/src/cron" \
  "@Cron\\(" \
  apps/api/src/modules apps/api/libs/domain \
  --glob '*.ts' \
  --glob '!**/*.spec.ts' \
  --glob '!**/*.test.ts'

section "Next.js routing boundary"
if [ -f apps/web/middleware.ts ] || find apps/web -path '*/middleware.ts' -type f | grep -q .; then
  echo "FAIL: Next.js 16 projects should use proxy.ts, not middleware.ts"
  find apps/web -path '*/middleware.ts' -type f
  failures=$((failures + 1))
else
  echo "PASS: Next.js 16 proxy.ts boundary"
fi

section "BullMQ queue registration"
queue_tmp="$(mktemp)"
if rg -n "BullModule\\.registerQueue\\(\\{[[:space:]]*name:" apps/api/src apps/api/libs/domain --glob '*.ts' >"$queue_tmp" 2>/dev/null; then
  duplicates="$(
    sed -E "s/.*name:[[:space:]]*['\\\"]([^'\\\"]+)['\\\"].*/\\1/" "$queue_tmp" |
      sort |
      uniq -d
  )"
  if [ -n "$duplicates" ]; then
    echo "FAIL: BullMQ queues must have a single registration point"
    while IFS= read -r queue_name; do
      [ -z "$queue_name" ] && continue
      echo "Duplicate queue: $queue_name"
      grep "name: ['\\\"]$queue_name['\\\"]" "$queue_tmp" || true
    done <<<"$duplicates"
    failures=$((failures + 1))
  else
    echo "PASS: BullMQ queue registration is unique"
  fi
else
  echo "PASS: BullMQ queue registration is unique"
fi
rm -f "$queue_tmp"

section "Logger boundary"
check_no_matches \
  "Production backend code should not use Nest built-in Logger" \
  "import .*Logger.*from '@nestjs/common'|new Logger\\(" \
  apps/api/src apps/api/libs/domain \
  --glob '*.ts' \
  --glob '!**/*.spec.ts' \
  --glob '!**/*.test.ts'

section "Console usage"
check_no_matches \
  "Production code should not use console.*" \
  "^[[:space:]]*[^*/[:space:]].*console\\.(log|error|warn|debug|info)\\(" \
  apps/api/src apps/api/libs/domain apps/web/app apps/web/components apps/web/lib apps/web/hooks \
  --glob '*.ts' \
  --glob '*.tsx' \
  --glob '!**/*.spec.ts' \
  --glob '!**/*.test.ts' \
  --glob '!**/__tests__/**'

section "Any usage"
check_no_matches \
  "Production code should not add as any or : any" \
  "^[[:space:]]*[^*/[:space:]].*(as any|: any)" \
  apps/api/src apps/api/libs/domain apps/web/app apps/web/components apps/web/lib apps/web/hooks packages/contracts/src \
  --glob '*.ts' \
  --glob '*.tsx' \
  --glob '!**/*.spec.ts' \
  --glob '!**/*.test.ts' \
  --glob '!**/__tests__/**'

if [ "$failures" -gt 0 ]; then
  printf '\nArchitecture check failed with %s failing section(s).\n' "$failures"
  exit 1
fi

printf '\nArchitecture check passed.\n'
