#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const violations = [];
const TARGET_CYCLE = 105;
const RECENT_CYCLE_START = TARGET_CYCLE - 4;
const EXPECTED_FINAL_ACCEPTANCE_DATE = '2026-06-29';

function read(file) {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) {
    violations.push(`Missing required file: ${file}`);
    return '';
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function assertPattern(file, pattern, message) {
  const content = read(file);
  if (!pattern.test(content)) {
    violations.push(`${file}: ${message}`);
  }
}

function assertTailPattern(file, marker, pattern, message) {
  const content = read(file);
  const index = content.lastIndexOf(marker);
  if (index === -1) {
    violations.push(`${file}: missing marker ${marker}`);
    return;
  }

  const tail = content.slice(index);
  if (!pattern.test(tail)) {
    violations.push(`${file}: ${message}`);
  }
}

function getLatestFinalOverview() {
  const file = 'docs/0628/03-循环实施记录.md';
  const content = read(file);
  const marker = '## 待实施总览（最终';
  const index = content.lastIndexOf(marker);
  if (index === -1) {
    violations.push(`${file}: missing marker ${marker}`);
    return '';
  }
  return content.slice(index);
}

function getCycleNumbers() {
  const file = 'docs/0628/03-循环实施记录.md';
  const content = read(file);
  return [...content.matchAll(/^## 循环 (\d+)：/gm)].map((match) => Number(match[1]));
}

function getLatestCycleNumber() {
  const cycles = getCycleNumbers();
  const latest = Math.max(...cycles);
  return Number.isFinite(latest) ? latest : null;
}

function getLatestFinalOverviewCycleNumber() {
  const file = 'docs/0628/03-循环实施记录.md';
  const content = read(file);
  const matches = [...content.matchAll(/^## 待实施总览（最终，循环 (\d+) 后）$/gm)];
  if (matches.length === 0) {
    violations.push(`${file}: missing numbered final pending overview`);
    return null;
  }
  return Number(matches[matches.length - 1][1]);
}

function getFinalAcceptanceCycleNumber() {
  const file = 'docs/0628/04-最终验收状态.md';
  const content = read(file);
  const matches = [...content.matchAll(/当前循环 (\d+)/g)];
  if (matches.length === 0) {
    violations.push(`${file}: missing current cycle declaration`);
    return null;
  }
  return Number(matches[matches.length - 1][1]);
}

function assertOverviewRow(label, expectedPattern, message) {
  const file = 'docs/0628/03-循环实施记录.md';
  const overview = getLatestFinalOverview();
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rowPattern = new RegExp(`^\\|\\s*${escapedLabel}\\s*\\|([^\\n]+)$`, 'm');
  const row = overview.match(rowPattern)?.[0] ?? '';

  if (!row) {
    violations.push(`${file}: latest final pending overview missing row ${label}`);
    return;
  }
  if (!expectedPattern.test(row)) {
    violations.push(`${file}: ${message}`);
  }
}

function assertLatestFinalOverviewHasNoOpenStatuses() {
  const file = 'docs/0628/03-循环实施记录.md';
  const overview = getLatestFinalOverview();
  const openStatusPatterns = [
    /待复验/,
    /待重新/,
    /待最终/,
    /未完成/,
    /待后续/,
  ];

  for (const pattern of openStatusPatterns) {
    if (pattern.test(overview)) {
      violations.push(`${file}: latest final pending overview contains open status ${pattern.source}`);
    }
  }
}

function assertPlanPhases() {
  const file = 'docs/0628/02-下一步执行计划.md';
  const content = read(file);
  const phaseMatches = [...content.matchAll(/^## Phase \d+：.+$/gm)];

  if (phaseMatches.length !== 10) {
    violations.push(`${file}: expected 10 Phase sections, found ${phaseMatches.length}`);
    return;
  }

  const requiredBlocks = ['**目标**', '**范围**', '**不做**', '**受益**'];
  for (let i = 0; i < phaseMatches.length; i += 1) {
    const current = phaseMatches[i];
    const next = phaseMatches[i + 1];
    const body = content.slice(current.index, next?.index ?? content.length);

    for (const block of requiredBlocks) {
      if (!body.includes(block)) {
        violations.push(`${file}: ${current[0]} missing ${block}`);
      }
    }
  }
}

function assertLatestCycleAtLeast(minCycle) {
  const file = 'docs/0628/03-循环实施记录.md';
  const latest = getLatestCycleNumber();

  if (latest === null || latest < minCycle) {
    violations.push(`${file}: expected latest cycle >= ${minCycle}, found ${latest ?? 'none'}`);
  }
}

function assertCyclesStrictlyIncreasing() {
  const file = 'docs/0628/03-循环实施记录.md';
  const cycles = getCycleNumbers();

  for (let i = 1; i < cycles.length; i += 1) {
    if (cycles[i] <= cycles[i - 1]) {
      violations.push(`${file}: cycle ${cycles[i]} appears after cycle ${cycles[i - 1]}; cycle headings must be strictly increasing`);
      return;
    }
  }
}

function assertLatestFinalOverviewMatchesLatestCycle() {
  const file = 'docs/0628/03-循环实施记录.md';
  const latestCycle = getLatestCycleNumber();
  const latestOverviewCycle = getLatestFinalOverviewCycleNumber();

  if (latestCycle === null || latestOverviewCycle === null) return;
  if (latestCycle !== latestOverviewCycle) {
    violations.push(`${file}: latest final pending overview is for cycle ${latestOverviewCycle}, but latest cycle is ${latestCycle}`);
  }
}

function assertFinalAcceptanceMatchesTargetCycle() {
  const file = 'docs/0628/04-最终验收状态.md';
  const finalAcceptanceCycle = getFinalAcceptanceCycleNumber();

  if (finalAcceptanceCycle === null) return;
  if (finalAcceptanceCycle !== TARGET_CYCLE) {
    violations.push(`${file}: final acceptance cycle is ${finalAcceptanceCycle}, expected ${TARGET_CYCLE}`);
  }
}

function assertRecentCyclesHaveRequiredSections(fromCycle, toCycle) {
  const file = 'docs/0628/03-循环实施记录.md';
  const content = read(file);
  const requiredSections = ['### 输入', '### 实施', '### 审查', '### 验收'];

  for (let cycle = fromCycle; cycle <= toCycle; cycle += 1) {
    const startPattern = new RegExp(`^## 循环 ${cycle}：.+$`, 'm');
    const startMatch = content.match(startPattern);
    if (!startMatch || startMatch.index === undefined) {
      violations.push(`${file}: missing cycle ${cycle}`);
      continue;
    }

    const afterStart = content.slice(startMatch.index + startMatch[0].length);
    const nextMatch = afterStart.match(/^## /m);
    const body = nextMatch ? afterStart.slice(0, nextMatch.index) : afterStart;

    for (const section of requiredSections) {
      if (!body.includes(section)) {
        violations.push(`${file}: cycle ${cycle} missing ${section}`);
      }
    }
  }
}

function getCycleBody(content, cycle) {
  const startPattern = new RegExp(`^## 循环 ${cycle}：.+$`, 'm');
  const startMatch = content.match(startPattern);
  if (!startMatch || startMatch.index === undefined) return null;

  const afterStart = content.slice(startMatch.index + startMatch[0].length);
  const nextMatch = afterStart.match(/^## /m);
  return nextMatch ? afterStart.slice(0, nextMatch.index) : afterStart;
}

function assertRecentCyclesHaveNoOpenExecutionMarkers(fromCycle, toCycle) {
  const file = 'docs/0628/03-循环实施记录.md';
  const content = read(file);
  const openPatterns = [
    /状态：待执行/,
    /^待完成：/m,
    /^待执行。/m,
    /待后续循环执行/,
  ];

  for (let cycle = fromCycle; cycle <= toCycle; cycle += 1) {
    const body = getCycleBody(content, cycle);
    if (body === null) continue;

    for (const pattern of openPatterns) {
      if (pattern.test(body)) {
        violations.push(`${file}: cycle ${cycle} contains open execution marker ${pattern.source}`);
      }
    }
  }
}

for (const file of [
  'docs/0628/README.md',
  'docs/0628/01-脚手架优化方向与内容.md',
  'docs/0628/02-下一步执行计划.md',
  'docs/0628/03-循环实施记录.md',
  'docs/0628/04-最终验收状态.md',
]) {
  read(file);
}

for (const file of [
  '01-脚手架优化方向与内容.md',
  '02-下一步执行计划.md',
  '03-循环实施记录.md',
  '04-最终验收状态.md',
]) {
  assertPattern('docs/0628/README.md', new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `README must link ${file}`);
}

assertPattern(
  'docs/0628/04-最终验收状态.md',
  /pnpm release:check/,
  'final acceptance doc must keep pnpm release:check as the release gate',
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  new RegExp(`更新日期：${EXPECTED_FINAL_ACCEPTANCE_DATE}`),
  `final acceptance doc must have update date ${EXPECTED_FINAL_ACCEPTANCE_DATE}`,
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  /已完成并通过/,
  'final acceptance doc must state the current closed-loop validation result',
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  /循环记录格式检查/,
  'final acceptance doc must mention loop record format checks',
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  /最新最终总览开放状态检查/,
  'final acceptance doc must mention latest final overview open-status checks',
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  /最近循环开放执行标记检查/,
  'final acceptance doc must mention recent cycle open execution marker checks',
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  /最终验收页保护项完整性检查/,
  'final acceptance doc must mention final acceptance protection coverage checks',
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  /最终总览保护项行完整性检查/,
  'final acceptance doc must mention final overview protection row checks',
);
assertPattern(
  'docs/0628/04-最终验收状态.md',
  new RegExp(`循环 ${TARGET_CYCLE}`),
  `final acceptance doc must mention cycle ${TARGET_CYCLE}`,
);

assertTailPattern(
  'docs/0628/03-循环实施记录.md',
  '## 待实施总览（最终',
  /无新的待实施项|已完成/,
  'latest final pending overview must not leave current scaffold work ambiguous',
);
assertOverviewRow('lockfile 同步', /已完成/, 'latest final pending overview must record lockfile sync as completed');
assertOverviewRow('`release:check` 发布入口', /已通过/, 'latest final pending overview must record release:check as passed');
assertOverviewRow('模板导出产物', /已重新导出.*通过/, 'latest final pending overview must record exported template as verified');
assertOverviewRow('最终验收页保护项完整性检查', /已完成/, 'latest final pending overview must record final acceptance protection coverage as completed');
assertOverviewRow('最近循环开放执行标记检查', /已完成/, 'latest final pending overview must record recent cycle open marker checks as completed');
assertOverviewRow('最新最终总览开放状态检查', /已完成/, 'latest final pending overview must record final overview open-status checks as completed');
assertLatestFinalOverviewHasNoOpenStatuses();

assertPlanPhases();
assertCyclesStrictlyIncreasing();
assertLatestCycleAtLeast(TARGET_CYCLE);
assertRecentCyclesHaveRequiredSections(RECENT_CYCLE_START, TARGET_CYCLE);
assertRecentCyclesHaveNoOpenExecutionMarkers(RECENT_CYCLE_START, TARGET_CYCLE);
assertLatestFinalOverviewMatchesLatestCycle();
assertFinalAcceptanceMatchesTargetCycle();

console.log('');
console.log('=============================================');
console.log('  0628 Documentation Status Scan');
console.log('=============================================');
console.log('');

if (violations.length > 0) {
  console.log(`VIOLATIONS (${violations.length}):`);
  for (const violation of violations) {
    console.log(`  x ${violation}`);
  }
  console.log('');
  console.log('FAIL: 0628 documentation status checks failed.');
  process.exit(1);
}

console.log('PASS: 0628 documentation status checks passed.');
