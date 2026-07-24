#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const lockfilePath = path.join(rootDir, 'pnpm-lock.yaml');
const violations = [];

const criticalDeps = [
  ['apps/api/package.json', '@dofe/file-sdk'],
  ['apps/api/package.json', '@dofe/infra-clients'],
  ['apps/api/package.json', '@dofe/infra-common'],
  ['apps/api/package.json', '@dofe/infra-contracts'],
  ['apps/api/package.json', '@dofe/infra-docker'],
  ['apps/api/package.json', '@dofe/infra-i18n'],
  ['apps/api/package.json', '@dofe/infra-jwt'],
  ['apps/api/package.json', '@dofe/infra-prisma'],
  ['apps/api/package.json', '@dofe/infra-rabbitmq'],
  ['apps/api/package.json', '@dofe/infra-redis'],
  ['apps/api/package.json', '@dofe/infra-shared-db'],
  ['apps/api/package.json', '@dofe/infra-shared-services'],
  ['apps/api/package.json', '@dofe/infra-utils'],
  ['apps/api/package.json', '@dofe/sso-contracts'],
  ['apps/api/package.json', '@dofe/sso-nestjs'],
  ['apps/api/package.json', '@dofe/sso-node'],
  ['apps/web/package.json', '@dofe/file-sdk-web'],
  ['apps/web/package.json', '@dofe/infra-web-runtime'],
  ['apps/web/package.json', '@dofe/sso-browser'],
  ['apps/web/package.json', '@dofe/sso-contracts'],
  ['apps/web/package.json', '@dofe/sso-hooks'],
];

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getDependencyVersion(pkgFile, depName) {
  const pkg = readJson(pkgFile);
  return pkg.dependencies?.[depName] ?? pkg.devDependencies?.[depName];
}

function lockHasImporterSpecifier(lockfile, importer, depName, version) {
  const importerPattern = new RegExp(`\\n  ${escapeRegex(importer)}:\\n([\\s\\S]*?)(?=\\n  [^\\s][^\\n]*:\\n|\\npackages:|\\nsnapshots:|$)`);
  const importerMatch = lockfile.match(importerPattern);
  if (!importerMatch) return false;
  const depPattern = new RegExp(
    `\\n      '${escapeRegex(depName)}':\\n        specifier: ${escapeRegex(version)}\\n`,
  );
  return depPattern.test(importerMatch[1]);
}

function lockHasOverride(lockfile, depName, version) {
  const overridePattern = new RegExp(`\\n  '${escapeRegex(depName)}': ${escapeRegex(version)}\\n`);
  return overridePattern.test(lockfile);
}

if (!fs.existsSync(lockfilePath)) {
  violations.push('pnpm-lock.yaml is missing.');
} else {
  const lockfile = fs.readFileSync(lockfilePath, 'utf8');
  const rootPkg = readJson('package.json');
  const overrides = rootPkg.pnpm?.overrides ?? {};

  for (const [pkgFile, depName] of criticalDeps) {
    const expected = getDependencyVersion(pkgFile, depName);
    if (!expected) {
      violations.push(`${pkgFile}: missing expected critical dependency ${depName}`);
      continue;
    }

    const importer = pkgFile === 'apps/api/package.json' ? 'apps/api' : 'apps/web';
    if (!lockHasImporterSpecifier(lockfile, importer, depName, expected)) {
      violations.push(`pnpm-lock.yaml importer ${importer}: ${depName} specifier is not synced to ${expected}`);
    }

    if (overrides[depName] && !lockHasOverride(lockfile, depName, overrides[depName])) {
      violations.push(`pnpm-lock.yaml overrides: ${depName} is not synced to ${overrides[depName]}`);
    }
  }
}

console.log('');
console.log('=============================================');
console.log('  Lockfile Sync Scan');
console.log('=============================================');
console.log('');

if (violations.length > 0) {
  console.log(`VIOLATIONS (${violations.length}):`);
  for (const violation of violations) {
    console.log(`  x ${violation}`);
  }
  console.log('');
  console.log('FAIL: pnpm-lock.yaml is not synced with critical scaffold package versions.');
  console.log('Run pnpm install --lockfile-only when the npm registry is responsive.');
  process.exit(1);
}

console.log('PASS: pnpm-lock.yaml is synced with critical scaffold package versions.');
