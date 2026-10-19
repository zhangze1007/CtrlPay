import { NextResponse } from 'next/server';
import { getUserIdFromSession } from '@/lib/session';
import { auditLog } from '@/lib/audit-logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const userId = getUserIdFromSession(req);
  const chainVerified = auditLog.verifyChain(userId);
  const entries = auditLog.list(userId);

  return NextResponse.json({
    status: 'ok',
    userId,
    overview: {
      name: 'Security Center',
      system: 'CtrlPay · Sandbox Security Overview',
      badge: 'Demo',
    },
    masterAutonomy: {
      defaultMode: 'T0',
      description: 'AI starts in read-only T0 mode',
    },
    securityControls: [
      {
        id: 'tiered_permissions',
        title: 'Tiered Permissions',
        subtitle: 'T0–T3 · Server-side authorization',
        status: 'Review',
        layer: 'Application / Authorization',
        evidence: 'tests/permissions.test.ts',
        description:
          'Server-side gate assertTier() enforces T0 (Read-only simulation), T1 (Advisory), T2 (24h Quarantine escrow), and T3 (Autonomous sweeps). T3 requires explicit per-action click authorization ref.',
      },
      {
        id: 'privacy_guardrails',
        title: 'Privacy Guardrails',
        subtitle: 'PII masking · Data minimization',
        status: 'Review',
        layer: 'Data / Model',
        evidence: 'tests/privacy-guard.test.ts',
        description:
          'Pre-LLM PII masking redacts Malaysian IC numbers, phone numbers, person names, and bank account figures. Receipt OCR images are processed purely in-memory and discarded immediately.',
      },
      {
        id: 'ai_output_verification',
        title: 'AI Output Verification',
        subtitle: 'Financial numbers checked against engine output',
        status: 'Review',
        layer: 'Quant Engine / Model Guard',
        evidence: 'tests/quant-engine.test.ts',
        description:
          'Post-LLM deterministic number verifier compares generated currency values against quant-engine CFaR calculations and active ledger balances. Fabricated numbers trigger NUMBER_VERIFIER_BLOCKED.',
      },
      {
        id: 'audit_hash_chain',
        title: 'Audit Hash Chain',
        subtitle: 'Integrity verification and tamper detection',
        status: 'Review',
        layer: 'Audit / Accountability',
        evidence: 'tests/audit-logger.test.ts',
        algorithm: 'SHA-256',
        chainVerified,
        totalEntries: entries.length,
        description:
          'Immutable, append-only cryptographic ledger. Each entry is cryptographically linked: entryHash = SHA-256(canonicalJson(entry)). Any alteration breaks the entire downward hash chain.',
      },
    ],
    securityAssessment: {
      title: 'Security Assessment',
      subtitle: 'Control status · Test evidence · Known limitations',
      reportPath: 'SECURITY_REPORT.md',
      knownLimitations: [
        'Sandbox session uses signed session cookie rather than hardware-bound passkeys/eKYC.',
        'OS-level Wi-Fi detection and cross-app pop-up blocking are platform-level controls outside web application boundary.',
        'Receipt OCR relies on client canvas/in-memory extract without permanent cloud archiving.',
      ],
    },
    disclaimer:
      'Illustrative UI only. "Review" means the control still needs verification; do not show "Passed" without actual test evidence.',
  });
}
