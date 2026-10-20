/**
 * Server-only session helpers.
 *
 * TENANT ISOLATION RULE (plan.md Section 6.3, layer 2): the userId is taken from
 * the authenticated session (sandbox: a signed cookie), NEVER from the request
 * body or the LLM. Every server read/write is keyed by this userId.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { CURRENT_USER_ID } from './mock-data';

const DEV_FALLBACK_SECRET = 'ctrlpay-sandbox-dev-secret-not-for-production';
export const SESSION_COOKIE = 'ctrlpay_session';

function getSecret(): string {
  const secret = process.env.CTRLPAY_SIGNING_SECRET;
  if (secret && secret.length > 0) return secret;
  // FAIL CLOSED in production: the dev fallback is public in this repository.
  // Running production with it would let anyone forge session cookies.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] CTRLPAY_SIGNING_SECRET is required in production; refusing the public dev fallback.',
    );
  }
  return DEV_FALLBACK_SECRET;
}

function sig(userId: string): string {
  return createHmac('sha256', getSecret()).update(userId).digest('hex').slice(0, 32);
}

export function signSession(userId: string): string {
  return `${encodeURIComponent(userId)}.${sig(userId)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const userId = decodeURIComponent(token.slice(0, idx));
  const provided = token.slice(idx + 1);
  const expected = sig(userId);
  if (provided.length !== expected.length) return null;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return timingSafeEqual(a, b) ? userId : null;
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Resolve the caller's userId. Sandbox fallback is the demo tenant only when no
 * valid signed cookie is present; the id is never read from the body or the LLM.
 */
export function getUserIdFromSession(req: Request): string {
  const cookieHeader = req.headers.get('cookie');
  const cookies = parseCookies(cookieHeader);
  const userId = verifySessionToken(cookies[SESSION_COOKIE]);
  return userId ?? CURRENT_USER_ID;
}
