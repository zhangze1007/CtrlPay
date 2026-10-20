#!/usr/bin/env node
/**
 * Phase 6 hardening — AI SDK version-pin guard (plan.md Section 2.2).
 *
 * Two checks:
 *   1. SOURCE CHECK  — no v5 identifiers appear in app/, components/ or lib/.
 *   2. PIN CHECK     — package.json keeps the AI SDK on the v4 major.minor lines,
 *                      and node_modules is not on a v5 version.
 *
 * Run with:  npm run verify:sdk-version
 * Exits 0 when clean, 1 when a violation is found.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const SCAN_DIRS = ['app', 'components', 'lib'];
const SCAN_EXTS = new Set(['.ts', '.tsx']);

/** v5 identifiers that must never appear in v4 source. */
const FORBIDDEN = [
  { token: 'inputSchema', hint: 'v4 uses `parameters: z.object({ ... })`' },
  { token: 'addToolOutput', hint: 'v4 uses `addToolResult({ toolCallId, result })`' },
  { token: 'toUIMessageStreamResponse', hint: 'v4 uses `result.toDataStreamResponse()`' },
  { token: 'stopWhen', hint: 'v4 uses `maxSteps`' },
  { token: 'DefaultChatTransport', hint: 'v4 imports `useChat` from `@ai-sdk/react`' },
];

/** Expected v4 dependency lines (package.json range must start with these). */
const EXPECTED_PINS = [
  { name: 'ai', prefix: '~4.' },
  { name: '@ai-sdk/react', prefix: '~1.' },
];

const violations = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      out.push(...walk(full));
    } else if (SCAN_EXTS.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

// ---- 1. Source scan ------------------------------------------------------
const files = SCAN_DIRS.flatMap((d) => walk(join(root, d)));

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  text.split(/\r?\n/).forEach((line, i) => {
    for (const { token, hint } of FORBIDDEN) {
      const re = new RegExp(`\\b${token}\\b`);
      if (re.test(line)) {
        violations.push(`${file}:${i + 1}  found "${token}" — ${hint}`);
      }
    }
  });
}

console.log(`[verify-sdk-version] scanned ${files.length} source files for v5 identifiers.`);

// ---- 2. Pin check --------------------------------------------------------
const pkgPath = join(root, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

for (const { name, prefix } of EXPECTED_PINS) {
  const range = deps[name];
  if (!range) {
    violations.push(`package.json: missing dependency "${name}"`);
  } else if (!range.startsWith(prefix)) {
    violations.push(
      `package.json: "${name}" is "${range}" but must stay on the "${prefix}x" v4 line (Section 2.2).`,
    );
  }
}

// Installed majors must not be v5.
for (const { name } of EXPECTED_PINS) {
  const installed = join(root, 'node_modules', name, 'package.json');
  if (!existsSync(installed)) continue;
  const version = JSON.parse(readFileSync(installed, 'utf8')).version;
  const major = Number(String(version).split('.')[0]);
  const expectedMajor = name === 'ai' ? 4 : 1;
  if (major > expectedMajor) {
    violations.push(`node_modules/${name} is v${version} — v5+ detected, reinstall the pinned v4 versions.`);
  }
  console.log(`[verify-sdk-version] ${name} installed: ${version}`);
}

if (violations.length > 0) {
  console.error('\n[verify-sdk-version] FAILED:');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}

console.log('[verify-sdk-version] PASS — AI SDK is pinned to v4 and no v5 identifiers are in the source.');
