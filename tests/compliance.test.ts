import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Phase 6 hardening regression tests (plan.md Section 9, Phase 6):
 *   1. AI SDK version-pin grep — no v5 identifiers in the source.
 *   2. Free-tier safety features never read the `plan` flag.
 *   3. CSP / security headers stay first-party only.
 */

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const SCAN_DIRS = ['app', 'components', 'lib'];
const SCAN_EXTS = new Set(['.ts', '.tsx']);

function walk(dir: string): string[] {
  const full = join(ROOT, dir);
  const out: string[] = [];
  for (const entry of readdirSync(full)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const p = join(full, entry);
    if (statSync(p).isDirectory()) out.push(...walk(join(dir, entry)));
    else if (SCAN_EXTS.has(extname(entry))) out.push(p);
  }
  return out;
}

/** Drop line comments and block comments before scanning real code. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

const sourceFiles = SCAN_DIRS.flatMap(walk);

describe('AI SDK version pin (Section 2.2)', () => {
  const FORBIDDEN = ['inputSchema', 'addToolOutput', 'toUIMessageStreamResponse', 'stopWhen', 'DefaultChatTransport'];

  it('scans a non-trivial number of source files', () => {
    expect(sourceFiles.length).toBeGreaterThan(30);
  });

  it.each(FORBIDDEN)('does not contain the v5 identifier "%s"', (token) => {
    const re = new RegExp(`\\b${token}\\b`);
    const offenders = sourceFiles.filter((f) => re.test(readFileSync(f, 'utf8')));
    expect(offenders, `v5 identifier "${token}" found in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('pins the AI SDK to the v4 major.minor lines in package.json', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    expect(pkg.dependencies.ai).toMatch(/^~4\./);
    expect(pkg.dependencies['@ai-sdk/react']).toMatch(/^~1\./);
  });

  it('declares OpenAI-compatible tool schemas with explicit `parameters`', () => {
    const route = readFileSync(join(ROOT, 'app/api/chat/route.ts'), 'utf8');
    const client = readFileSync(join(ROOT, 'lib/groq-client.ts'), 'utf8');
    expect(route).toContain('groqToolDefinition(');
    expect(client).toContain('parameters');
    expect(route).not.toMatch(/\binputSchema\s*:/);
  });

  it('defaults the live agent to the current Groq production model', () => {
    const client = readFileSync(join(ROOT, 'lib/groq-client.ts'), 'utf8');
    expect(client).toContain("DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b'");
    expect(client).toContain('llama-3.3-70b-versatile');
  });
});

describe('Free-tier safety is independent of the `plan` flag (Section 9, Phase 6)', () => {
  const SAFETY_MODULES = [
    'lib/quant-engine.ts',
    'lib/zombie-radar.ts',
    'lib/privacy-guard.ts',
    'lib/audit-logger.ts',
    'lib/permissions.ts',
    'lib/proposals.ts',
    'lib/server-tools.ts',
    'lib/ledger.ts',
    'lib/signing.ts',
    'lib/domain.ts',
  ];

  it.each(SAFETY_MODULES)('%s never reads the `plan` flag in code', (rel) => {
    const code = stripComments(readFileSync(join(ROOT, rel), 'utf8'));
    // The plan flag is only ever read as a property access (e.g. `s.plan`).
    // Merchant copy like "student plan" or the "NO_STUDENT_PLAN" code is unrelated.
    expect(code).not.toMatch(/\.\s*plan\b/);
  });

  it('the `plan` flag exists only as a settings slice in the store', () => {
    const code = stripComments(readFileSync(join(ROOT, 'lib/store.ts'), 'utf8'));
    const planLines = code.split('\n').filter((l) => /\bplan\b/.test(l));
    expect(planLines.length).toBeGreaterThan(0);
    for (const line of planLines) {
      // No safety branch may hinge on the plan: assignments/audit only.
      expect(line).not.toMatch(/\b(if|while|switch|case)\b/);
      expect(line).not.toMatch(/\?|&&|\|\||!/);
    }
  });
});

describe('CSP and security headers (Section 10.2)', () => {
  const config = readFileSync(join(ROOT, 'next.config.mjs'), 'utf8');

  it("locks the default source to 'self' and forbids plugins/frames", () => {
    expect(config).toContain("default-src 'self'");
    expect(config).toContain("object-src 'none'");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("base-uri 'self'");
  });

  it('loads no third-party script/style/font hosts', () => {
    // The CSP array must not whitelist any remote origin.
    expect(config).not.toMatch(/script-src[^;]*https?:\/\//);
    expect(config).not.toMatch(/connect-src[^;]*https?:\/\//);
  });

  it('ships the standard hardening headers', () => {
    for (const header of [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
    ]) {
      expect(config).toContain(header);
    }
  });
});
