#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const scanRoots = ['apps', 'packages', 'scripts'];
const violations = [];

const forbidden = [
  {
    pattern: /\.\.\/(?:sso|models|agents|vibecoding|infra)\.dofe\.ai/g,
    reason: 'must not depend on sibling Dofe project source paths',
  },
  {
    pattern: /from\s+['"]@dofe\/(?:sso|infra|file|models|agents)-[^'"]*\/src(?:\/[^'"]*)?['"]/g,
    reason: 'must import published package entrypoints, not @dofe/*/src internals',
  },
  {
    pattern: /\b(ModelCatalog|ProviderKey|ModelAvailability|ModelCapabilityTag)\b/g,
    reason: 'model/provider authority belongs to models.dofe.ai; use SDK/API consumer patterns',
  },
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', 'dist', '.next', '.turbo', 'template'].includes(entry.name)) return [];
      return walk(full);
    }
    if (!entry.isFile()) return [];
    if (full === __filename) return [];
    if (!/\.(ts|tsx|js|jsx|mjs|cjs|json|yaml|yml)$/.test(entry.name)) return [];
    if (entry.name.endsWith('.log')) return [];
    return [full];
  });
}

function relative(file) {
  return path.relative(rootDir, file).split(path.sep).join('/');
}

for (const root of scanRoots) {
  for (const file of walk(path.join(rootDir, root))) {
    const rel = relative(file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const rule of forbidden) {
        rule.pattern.lastIndex = 0;
        if (rule.pattern.test(line)) {
          violations.push({
            file: rel,
            line: index + 1,
            text: line.trim(),
            reason: rule.reason,
          });
        }
      }
    });
  }
}

console.log('');
console.log('=============================================');
console.log('  Cross-Project Boundary Scan');
console.log('=============================================');
console.log('');

if (violations.length > 0) {
  console.log(`VIOLATIONS (${violations.length}):`);
  for (const violation of violations) {
    console.log(`  x ${violation.file}:${violation.line}: ${violation.reason}`);
    console.log(`    ${violation.text}`);
  }
  console.log('');
  console.log('FAIL: cross-project boundary violations found.');
  process.exit(1);
}

console.log('PASS: cross-project boundaries are clean.');
