import { beforeEach, describe, expect, it } from 'vitest';
import { POST as decidePOST } from '@/app/api/proposals/[id]/decision/route';
import { POST as createPOST } from '@/app/api/proposals/route';
import { __clearProposals, storeProposal } from '@/lib/proposals';
import { signProposal } from '@/lib/signing';
import { buildLedgerSnapshot, type LedgerSnapshot } from '@/lib/ledger';
import { auditLog } from '@/lib/audit-logger';
import { CURRENT_USER_ID } from '@/lib/mock-data';
import type { QuarantineTerms, SignedProposal } from '@/lib/types';

/**
 * Red-team regression checks that exercise the REAL API routes (not just pure
 * helpers). These close the two boundary gaps identified in the security review:
 *   - T-01: Master Switch OFF must reject a T3 decision with HTTP 403 and a
 *           BLOCKED audit entry (reason-coded actionType).
 *   - T-04: a direct POST can never create a NEEDS-category Quarantine, even if
 *           the caller bypasses the LLM tool schema.
 */

const AUTONOMY_ON = {
  masterAutonomyEnabled: true,
  enabledTiers: { T0: true, T1: true, T2: true, T3: true },
};

const AUTONOMY_OFF = {
  masterAutonomyEnabled: false,
  enabledTiers: { T0: true, T1: false, T2: false, T3: false },
};

const TERMS: QuarantineTerms = {
  kind: 'QUARANTINE',
  targetItem: 'Shopee impulse buy',
  itemPrice: 180,
  premiumReward: 9,
  quarantineHours: 24,
  shortfallProbability: 42,
  cfar95: 210,
  riskLevel: 'HIGH',
};

function snapshot(): LedgerSnapshot {
  return buildLedgerSnapshot({
    userId: CURRENT_USER_ID,
    sandboxClock: Date.UTC(2026, 2, 12, 9, 0, 0),
    currentBalance: 1240,
    defenseVault: 0,
    rewardPool: 24,
    amortizeAnnualFees: false,
  });
}

function makeProposal(): SignedProposal {
  return signProposal(TERMS, CURRENT_USER_ID, { proposalId: 'prop_redteam_0001' });
}

function decisionRequest(id: string, body: unknown): Request {
  return new Request(`http://localhost/api/proposals/${id}/decision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function approve(proposalId: string) {
  return {
    status: 'APPROVED' as const,
    proposalId,
    authorizationRef: `USER_CLICK_APPROVE_PROPOSAL_${proposalId.slice(-4)}`,
  };
}

describe('red-team API boundary checks', () => {
  beforeEach(() => {
    __clearProposals();
    auditLog.__reset(CURRENT_USER_ID);
  });

  it('T-01: Master Switch OFF rejects a T3 approval with 403 and a BLOCKED audit entry', async () => {
    const proposal = makeProposal();
    storeProposal(proposal);

    const res = await decidePOST(
      decisionRequest(proposal.proposalId, {
        decision: approve(proposal.proposalId),
        ledgerSnapshot: snapshot(),
        autonomy: AUTONOMY_OFF,
        proposal,
      }),
      { params: { id: proposal.proposalId } },
    );

    expect(res.status).toBe(403);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('TIER_BLOCKED');

    const entries = auditLog.list(CURRENT_USER_ID);
    const last = entries[entries.length - 1];
    expect(last?.status).toBe('BLOCKED');
    expect(last?.actionType).toBe('T3_GATE_REJECTED_MASTER_AUTONOMY_OFF');
  });

  it('rejects a malformed autonomy payload with 400 (never accepts or crashes)', async () => {
    const proposal = makeProposal();
    storeProposal(proposal);

    const res = await decidePOST(
      decisionRequest(proposal.proposalId, {
        decision: approve(proposal.proposalId),
        ledgerSnapshot: snapshot(),
        // Missing enabledTiers: previously this could reach assertTier() and throw.
        autonomy: { masterAutonomyEnabled: true },
        proposal,
      }),
      { params: { id: proposal.proposalId } },
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('INVALID_AUTONOMY');
  });

  it('accepts the same valid request when the Master Switch is ON', async () => {
    const proposal = makeProposal();
    storeProposal(proposal);

    const res = await decidePOST(
      decisionRequest(proposal.proposalId, {
        decision: approve(proposal.proposalId),
        ledgerSnapshot: snapshot(),
        autonomy: AUTONOMY_ON,
        proposal,
      }),
      { params: { id: proposal.proposalId } },
    );

    expect(res.status).toBe(200);
    const data = (await res.json()) as { proposal: SignedProposal };
    expect(data.proposal.status).toBe('APPROVED');
  });

  it('T-04: a direct API call cannot create a NEEDS-category Quarantine', async () => {
    const res = await createPOST(
      new Request('http://localhost/api/proposals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'QUARANTINE',
          input: { targetItem: 'Panadol', itemPrice: 180, category: 'Medical' },
          ledgerSnapshot: snapshot(),
        }),
      }),
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('NEEDS_NOT_QUARANTINABLE');
  });

  it('rejects unknown escrow categories at the API boundary with 400 (no 500 ZodError)', async () => {
    const res = await createPOST(
      new Request('http://localhost/api/proposals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'ESCROW',
          input: {
            targetItem: 'impulse',
            itemPrice: 180,
            lockedCategories: ['Not_A_Real_Category'],
            durationDays: 7,
          },
          ledgerSnapshot: snapshot(),
        }),
      }),
    );

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('INVALID_INPUT');
  });
});
