#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const cliPath = path.join(rootDir, 'packages', 'create-dofe-ai', 'cli.js');
const templateDir = path.join(rootDir, 'packages', 'create-dofe-ai', 'template');
const violations = [];

function addViolation(message) {
  violations.push(message);
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function assertExists(file) {
  if (!fs.existsSync(file)) {
    addViolation(`Missing generated file: ${path.relative(rootDir, file)}`);
  }
}

function assertNoPattern(file, pattern, message) {
  if (!fs.existsSync(file)) return;
  if (pattern.test(read(file))) {
    addViolation(`${path.relative(rootDir, file)}: ${message}`);
  }
}

function assertPattern(file, pattern, message) {
  if (!fs.existsSync(file)) {
    addViolation(`Missing generated file: ${path.relative(rootDir, file)}`);
    return;
  }
  if (!pattern.test(read(file))) {
    addViolation(`${path.relative(rootDir, file)}: ${message}`);
  }
}

if (!fs.existsSync(templateDir)) {
  addViolation('Template directory is missing. Run pnpm export-scaffold first.');
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'dofe-template-smoke-'));
const projectName = 'smoke-dofe-app';
const targetDir = path.join(tmpRoot, projectName);

try {
  if (violations.length === 0) {
    const result = spawnSync(process.execPath, [cliPath, projectName], {
      cwd: tmpRoot,
      encoding: 'utf8',
    });

    if (result.status !== 0) {
      addViolation(
        `create-dofe-ai CLI failed with exit code ${result.status}: ${result.stderr || result.stdout}`,
      );
    }
  }

  assertExists(path.join(targetDir, 'package.json'));
  assertExists(path.join(targetDir, '.gitignore'));
  assertExists(path.join(targetDir, 'AGENTS.md'));
  assertExists(path.join(targetDir, 'CLAUDE.md'));
  assertExists(path.join(targetDir, 'docs', 'shared-agent-rules', 'README.md'));
  assertExists(path.join(targetDir, 'scripts', 'check-cross-project-boundaries.js'));
  assertExists(path.join(targetDir, 'scripts', 'check-lockfile-sync.js'));
  assertExists(path.join(targetDir, 'scripts', 'check-template-readiness.js'));
  assertExists(path.join(targetDir, 'scripts', 'check-template-smoke.js'));

  const pkgFile = path.join(targetDir, 'package.json');
  if (fs.existsSync(pkgFile)) {
    const pkg = JSON.parse(read(pkgFile));
    if (pkg.name !== projectName) {
      addViolation(`package.json name expected ${projectName}, found ${pkg.name ?? 'missing'}`);
    }
  }

  if (violations.length === 0) {
    const initInput = [
      'smoke-init-app',
      'Smoke initialized scaffold',
      'Smoke Author',
      'smoke@example.com',
      'postgresql://smoke:secret@db.local:5432/smoke?schema=public',
      '',
      'redis://:secret@redis.local:6379/4',
      'amqp://smoke:secret@mq.local:5672/smoke',
      'smoke.local',
      'https://api.smoke.local',
      'https://sso.smoke.local',
      '',
    ].join('\n');

    const initResult = spawnSync(process.execPath, ['scripts/init-project.js'], {
      cwd: targetDir,
      encoding: 'utf8',
      input: initInput,
    });

    if (initResult.status !== 0) {
      addViolation(
        `init-project failed with exit code ${initResult.status}: ${initResult.stderr || initResult.stdout}`,
      );
    }

    const initializedPkg = JSON.parse(read(pkgFile));
    if (initializedPkg.name !== 'smoke-init-app') {
      addViolation(`init-project package.json name expected smoke-init-app, found ${initializedPkg.name ?? 'missing'}`);
    }
  }

  assertPattern(
    path.join(targetDir, 'apps', 'api', '.env'),
    /^BASE_HOST=smoke\.local$/m,
    'init-project must replace BASE_HOST in apps/api/.env',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'api', '.env'),
    /^DATABASE_URL=postgresql:\/\/smoke:secret@db\.local:5432\/smoke\?schema=public$/m,
    'init-project must replace DATABASE_URL in apps/api/.env',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'api', '.env'),
    /^READ_DATABASE_URL=postgresql:\/\/smoke:secret@db\.local:5432\/smoke\?schema=public$/m,
    'init-project must default READ_DATABASE_URL to DATABASE_URL',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'api', '.env'),
    /^REDIS_URL=redis:\/\/:secret@redis\.local:6379\/4$/m,
    'init-project must replace REDIS_URL in apps/api/.env',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'api', '.env'),
    /^RABBITMQ_URL=amqp:\/\/smoke:secret@mq\.local:5672\/smoke$/m,
    'init-project must replace RABBITMQ_URL in apps/api/.env',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'api', '.env'),
    /^RABBITMQ_EVENTS_URL=amqp:\/\/your_user:your_password@smoke\.local:5672\/your_events_vhost$/m,
    'init-project must expand BASE_HOST in RABBITMQ_EVENTS_URL',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'api', '.env'),
    /^SSO_API_URL=https:\/\/sso\.smoke\.local$/m,
    'init-project must replace SSO_API_URL in apps/api/.env',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'web', '.env.local'),
    /^NEXT_PUBLIC_SERVER_BASE_URL=https:\/\/api\.smoke\.local$/m,
    'init-project must replace NEXT_PUBLIC_SERVER_BASE_URL in apps/web/.env.local',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'web', '.env.local'),
    /^SCAFFOLD_INTERNAL_API_URL=https:\/\/api\.smoke\.local$/m,
    'init-project must replace SCAFFOLD_INTERNAL_API_URL in apps/web/.env.local',
  );
  assertPattern(
    path.join(targetDir, 'apps', 'web', '.env.local'),
    /^NEXT_PUBLIC_SSO_BASE_URL=https:\/\/sso\.smoke\.local$/m,
    'init-project must replace NEXT_PUBLIC_SSO_BASE_URL in apps/web/.env.local',
  );
  assertExists(path.join(targetDir, 'apps', 'api', 'keys', 'config.json'));

  assertNoPattern(
    path.join(targetDir, 'pnpm-workspace.yaml'),
    /infra\.dofe\.ai\/packages|local path reference|shared infra \(development/i,
    'generated project must not include sibling infra workspace references',
  );
  assertNoPattern(
    path.join(targetDir, 'packages', 'create-dofe-ai', 'cli.js'),
    /./,
    'generated project must not include generator internals',
  );
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}

console.log('');
console.log('=============================================');
console.log('  Template Smoke Scan');
console.log('=============================================');
console.log('');

if (violations.length > 0) {
  console.log(`VIOLATIONS (${violations.length}):`);
  for (const violation of violations) {
    console.log(`  x ${violation}`);
  }
  console.log('');
  console.log('FAIL: create-dofe-ai template smoke failed.');
  process.exit(1);
}

console.log('PASS: create-dofe-ai template smoke passed.');
