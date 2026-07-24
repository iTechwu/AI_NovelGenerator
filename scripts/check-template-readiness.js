#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const violations = [];

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function addViolation(message) {
  violations.push(message);
}

function assertFile(file) {
  if (!fs.existsSync(path.join(rootDir, file))) {
    addViolation(`Missing required file: ${file}`);
  }
}

function assertFileIfTemplateExists(file) {
  const templateRoot = path.join(rootDir, 'packages', 'create-dofe-ai', 'template');
  if (!fs.existsSync(templateRoot)) return;
  const templateFile = path.join(templateRoot, file);
  if (!fs.existsSync(templateFile)) {
    addViolation(`Template missing required file: packages/create-dofe-ai/template/${file}`);
  }
}

function assertPattern(file, pattern, message) {
  const content = read(file);
  if (!pattern.test(content)) {
    addViolation(`${file}: ${message}`);
  }
}

function assertPatternIfTemplateExists(file, pattern, message) {
  const templateRoot = path.join(rootDir, 'packages', 'create-dofe-ai', 'template');
  if (!fs.existsSync(templateRoot)) return;
  const templateFile = path.join(templateRoot, file);
  if (!fs.existsSync(templateFile)) {
    addViolation(`Template missing required file: packages/create-dofe-ai/template/${file}`);
    return;
  }
  const content = fs.readFileSync(templateFile, 'utf8');
  if (!pattern.test(content)) {
    addViolation(`packages/create-dofe-ai/template/${file}: ${message}`);
  }
}

function assertNoPattern(file, pattern, message) {
  const content = read(file);
  if (pattern.test(content)) {
    addViolation(`${file}: ${message}`);
  }
}

function assertDep(pkgFile, name, expected) {
  const pkg = readJson(pkgFile);
  const actual = pkg.dependencies?.[name] ?? pkg.devDependencies?.[name];
  if (actual !== expected) {
    addViolation(`${pkgFile}: expected ${name}@${expected}, found ${actual ?? 'missing'}`);
  }
}

function assertOverride(name, expected) {
  const pkg = readJson('package.json');
  const actual = pkg.pnpm?.overrides?.[name];
  if (actual !== expected) {
    addViolation(`package.json pnpm.overrides: expected ${name}@${expected}, found ${actual ?? 'missing'}`);
  }
}

function assertScript(pkgFile, name, expectedPattern) {
  const pkg = readJson(pkgFile);
  const actual = pkg.scripts?.[name];
  if (!actual) {
    addViolation(`${pkgFile}: missing script ${name}`);
    return;
  }
  if (!expectedPattern.test(actual)) {
    addViolation(`${pkgFile}: script ${name} does not match expected release/check chain`);
  }
}

function assertEnvKey(file, key) {
  const content = read(file);
  const pattern = new RegExp(`^${key}=`, 'm');
  if (!pattern.test(content)) {
    addViolation(`${file}: missing env key ${key}`);
  }
}

function assertInitProjectReplacement(key) {
  assertPattern(
    'scripts/init-project.js',
    new RegExp(`${key}: config\\.`),
    `init-project must replace ${key} from wizard config`,
  );
}

for (const file of [
  'docs/shared-agent-rules/README.md',
  'docs/shared-agent-rules/core-architecture-rules.md',
  'docs/shared-agent-rules/api-patterns.md',
  'docs/shared-agent-rules/zod4-guidelines.md',
  'docs/shared-agent-rules/module-dependency-rules.md',
  'docs/shared-agent-rules/cron-queue-rules.md',
  'docs/shared-agent-rules/cross-project-boundaries.md',
  'docs/shared-agent-rules/workflow-api-patterns.md',
]) {
  assertFile(file);
  assertFileIfTemplateExists(file);
}

assertFile('docs/0628/04-最终验收状态.md');
assertPattern(
  'docs/0628/04-最终验收状态.md',
  /pnpm release:check/,
  'final acceptance doc must mention pnpm release:check',
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  /已通过/,
  'final acceptance doc must record passed validation status',
);
assertFileIfTemplateExists('docs/0628/04-最终验收状态.md');
assertPatternIfTemplateExists(
  'docs/0628/04-最终验收状态.md',
  /pnpm release:check/,
  'final acceptance doc must mention pnpm release:check',
);
assertPatternIfTemplateExists(
  'docs/0628/04-最终验收状态.md',
  /已通过/,
  'final acceptance doc must record passed validation status',
);

for (const file of [
  'scripts/check-0628-doc-status.js',
  'scripts/check-cross-project-boundaries.js',
  'scripts/check-lockfile-sync.js',
  'scripts/check-template-readiness.js',
  'scripts/check-template-smoke.js',
]) {
  assertFile(file);
  assertFileIfTemplateExists(file);
}

for (const file of ['AGENTS.md', 'CLAUDE.md']) {
  assertFile(file);
  assertPattern(file, /docs\/shared-agent-rules/, 'must route architecture-affecting work to docs/shared-agent-rules');
  assertPatternIfTemplateExists(
    file,
    /docs\/shared-agent-rules/,
    'must route architecture-affecting work to docs/shared-agent-rules',
  );
}

for (const file of ['README.md', 'packages/create-dofe-ai/README.md']) {
  assertFile(file);
  assertPattern(file, /Web API URL/, 'init-project docs must mention Web API URL replacement');
  assertPattern(file, /SSO Base URL/, 'init-project docs must mention SSO Base URL replacement');
}
assertPatternIfTemplateExists(
  'README.md',
  /Web API URL/,
  'init-project docs must mention Web API URL replacement',
);
assertPatternIfTemplateExists(
  'README.md',
  /SSO Base URL/,
  'init-project docs must mention SSO Base URL replacement',
);

for (const key of [
  'BASE_HOST',
  'DATABASE_URL',
  'READ_DATABASE_URL',
  'REDIS_URL',
  'RABBITMQ_URL',
  'SSO_API_URL',
  'SSO_INTERNAL_API_URL',
  'SSO_ISSUER',
]) {
  assertEnvKey('apps/api/.env.example', key);
  assertInitProjectReplacement(key);
}

for (const key of [
  'NEXT_PUBLIC_SERVER_BASE_URL',
  'SCAFFOLD_INTERNAL_API_URL',
  'NEXT_PUBLIC_SSO_BASE_URL',
]) {
  assertEnvKey('apps/web/.env.example', key);
  assertInitProjectReplacement(key);
}

assertScript(
  'package.json',
  'release:check',
  /quality:gate[\s\S]*export-scaffold[\s\S]*check:template-readiness[\s\S]*check:template-smoke[\s\S]*check:lockfile-sync/,
);
assertScript('package.json', 'check:0628-doc-status', /check-0628-doc-status\.js/);
assertScript('package.json', 'quality:gate', /check:0628-doc-status/);

assertNoPattern(
  'scripts/export-scaffold-for-create.js',
  /\.\.\/infra\.dofe\.ai\/packages\/\*/,
  'must not inject sibling infra workspace into template',
);
assertNoPattern(
  'packages/create-dofe-ai/cli.js',
  /git clone .*infra\.dofe\.ai/,
  'must not ask generated projects to clone sibling infra repo',
);
assertNoPattern(
  'pnpm-workspace.yaml',
  /infra\.dofe\.ai\/packages|local path reference|shared infra \(development/i,
  'must not include sibling infra workspace packages or local infra workspace comments',
);

if (fs.existsSync(path.join(rootDir, 'packages', 'create-dofe-ai', 'template', 'pnpm-workspace.yaml'))) {
  assertNoPattern(
    'packages/create-dofe-ai/template/pnpm-workspace.yaml',
    /infra\.dofe\.ai\/packages|local path reference|shared infra \(development/i,
    'template must not include sibling infra workspace packages or local infra workspace comments',
  );
}

if (fs.existsSync(path.join(rootDir, 'packages', 'create-dofe-ai', 'template', 'package.json'))) {
  assertScript(
    'packages/create-dofe-ai/template/package.json',
    'release:check',
    /quality:gate[\s\S]*export-scaffold[\s\S]*check:template-readiness[\s\S]*check:template-smoke[\s\S]*check:lockfile-sync/,
  );
  assertScript(
    'packages/create-dofe-ai/template/package.json',
    'check:0628-doc-status',
    /check-0628-doc-status\.js/,
  );
  assertScript(
    'packages/create-dofe-ai/template/package.json',
    'quality:gate',
    /check:0628-doc-status/,
  );
}

for (const [name, version] of [
  ['@dofe/infra-clients', '0.1.78'],
  ['@dofe/infra-common', '0.1.78'],
  ['@dofe/infra-contracts', '0.1.78'],
  ['@dofe/infra-i18n', '0.1.78'],
  ['@dofe/infra-jwt', '0.1.78'],
  ['@dofe/infra-prisma', '0.1.78'],
  ['@dofe/infra-rabbitmq', '0.1.78'],
  ['@dofe/infra-redis', '0.1.80'],
  ['@dofe/infra-shared-db', '0.1.78'],
  ['@dofe/infra-shared-services', '0.1.78'],
  ['@dofe/infra-utils', '0.1.78'],
]) {
  assertDep('apps/api/package.json', name, version);
  assertOverride(name, version);
}

assertDep('apps/api/package.json', '@dofe/file-sdk', '0.1.12');
assertDep('apps/api/package.json', '@dofe/sso-contracts', '0.1.73');
assertDep('apps/api/package.json', '@dofe/sso-nestjs', '0.1.59');
assertDep('apps/api/package.json', '@dofe/sso-node', '0.1.60');
assertDep('apps/web/package.json', '@dofe/file-sdk-web', '0.1.13');
assertDep('apps/web/package.json', '@dofe/infra-web-runtime', '0.1.78');
assertDep('apps/web/package.json', '@dofe/sso-browser', '0.1.78');
assertDep('apps/web/package.json', '@dofe/sso-contracts', '0.1.73');
assertDep('apps/web/package.json', '@dofe/sso-hooks', '0.1.61');

if (fs.existsSync(path.join(rootDir, 'packages', 'create-dofe-ai', 'template', 'apps', 'api', 'package.json'))) {
  for (const [pkgFile, name, expected] of [
    ['packages/create-dofe-ai/template/apps/api/package.json', '@dofe/infra-common', '0.1.78'],
    ['packages/create-dofe-ai/template/apps/api/package.json', '@dofe/infra-redis', '0.1.80'],
    ['packages/create-dofe-ai/template/apps/api/package.json', '@dofe/file-sdk', '0.1.12'],
    ['packages/create-dofe-ai/template/apps/api/package.json', '@dofe/sso-contracts', '0.1.73'],
    ['packages/create-dofe-ai/template/apps/web/package.json', '@dofe/file-sdk-web', '0.1.13'],
    ['packages/create-dofe-ai/template/apps/web/package.json', '@dofe/sso-browser', '0.1.78'],
    ['packages/create-dofe-ai/template/apps/web/package.json', '@dofe/sso-hooks', '0.1.61'],
  ]) {
    assertDep(pkgFile, name, expected);
  }
}

console.log('');
console.log('=============================================');
console.log('  Template Readiness Scan');
console.log('=============================================');
console.log('');

if (violations.length > 0) {
  console.log(`VIOLATIONS (${violations.length}):`);
  for (const violation of violations) {
    console.log(`  x ${violation}`);
  }
  console.log('');
  console.log('FAIL: scaffold template readiness checks failed.');
  process.exit(1);
}

console.log('PASS: scaffold template readiness checks passed.');
