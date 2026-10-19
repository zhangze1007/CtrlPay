import { NextResponse } from 'next/server';
import { getUserIdFromSession } from '@/lib/session';
import { auditLog, type AuditInput } from '@/lib/audit-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Returns the server-side hash-chained audit entries for the caller's tenant.
 * Also provides cryptographic verification status and total recorded counts.
 */
export async function GET(req: Request) {
  const userId = getUserIdFromSession(req);
  // Ensure default authentic entries are present if empty for the current demo tenant
  auditLog.seedIfEmpty(userId);

  const entries = auditLog.list(userId);
  const chainVerified = auditLog.verifyChain(userId);

  return NextResponse.json(
    {
      userId,
      entries,
      chainVerified,
      stats: {
        recordedEvents: entries.length,
        chainVerified,
        lastVerifiedAt: new Date().toISOString(),
      },
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

/**
 * Executes audit actions:
 * - action: 'verify'   -> runs SHA-256 integrity verification across all blocks
 * - action: 'tamper'   -> injects a simulated alteration to demonstrate tampering detection
 * - action: 'restore'  -> restores the authentic hash chain
 * - action: 'append'   -> appends a new audit record to the chain
 */
export async function POST(req: Request) {
  const userId = getUserIdFromSession(req);
  try {
    const body = (await req.json()) as {
      action?: 'verify' | 'tamper' | 'restore' | 'append';
      entry?: AuditInput;
      targetIndex?: number;
    };

    const action = body.action ?? 'verify';

    if (action === 'verify') {
      const verified = auditLog.verifyChain(userId);
      const entries = auditLog.list(userId);
      return NextResponse.json({
        ok: true,
        action: 'verify',
        verified,
        recordedEvents: entries.length,
        verifiedAt: new Date().toISOString(),
        latestHash: entries.length > 0 ? entries[entries.length - 1].entryHash : 'GENESIS',
      });
    }

    if (action === 'tamper') {
      const result = auditLog.simulateTamper(userId, body.targetIndex ?? 1);
      const verifiedAfterTamper = auditLog.verifyChain(userId);
      return NextResponse.json({
        ok: true,
        action: 'tamper',
        tampered: result.tampered,
        targetLogId: result.targetLogId,
        verified: verifiedAfterTamper,
        message: 'Simulated tampering injected. Verification should now fail.',
      });
    }

    if (action === 'restore') {
      const restored = auditLog.restoreAuthentic(userId);
      const verified = auditLog.verifyChain(userId);
      return NextResponse.json({
        ok: true,
        action: 'restore',
        restored,
        verified,
        message: 'Authentic cryptographic ledger restored.',
      });
    }

    if (action === 'append' && body.entry) {
      const newEntry = auditLog.append(body.entry, userId);
      return NextResponse.json({
        ok: true,
        action: 'append',
        entry: newEntry,
        verified: auditLog.verifyChain(userId),
      });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 },
    );
  }
}
