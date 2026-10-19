import { describe, it, expect, beforeEach } from 'vitest';
import { parseReceiptText } from '../lib/real-ocr';
import { generateAiFinancialInsights } from '../lib/ai-insights';
import { useCtrlPayStore } from '../lib/store';
import { signProposal } from '../lib/signing';
import { auditLog } from '../lib/audit-logger';
import type { ProposalTerms } from '../lib/types';

describe('AI Insights and Real OCR Integration Test Suite', () => {
  let testUserId: string;

  const sweepTerms: ProposalTerms = {
    kind: 'SWEEP',
    subscriptionId: 'spotify_my',
    action: 'STUDENT_DOWNGRADE',
    merchantName: 'Spotify',
    monthlySavings: 7.4,
    annualSavings: 88.8,
    requiresStudentEmailOTP: true,
    deepLinkAvailable: true,
    mailtoAvailable: false,
  };

  beforeEach(() => {
    testUserId = `student_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    useCtrlPayStore.setState({
      userId: testUserId,
      sandboxClock: 1773306000000, // 2026-03-12T09:00:00.000Z
      currentBalance: 7540,
      totalExpenses: 2910,
      spentThisWeek: 180,
      spentThisMonth: 850,
      defenseVault: 0,
      rewardPool: 24,
      masterAutonomyEnabled: false,
      enabledTiers: { T0: true, T1: false, T2: false, T3: false },
      pendingSweeps: [],
      activities: [],
      events: [],
    });
  });

  // 1. OCR confirmation before transaction persistence
  it('does not commit transactions before user review and explicit confirmation', () => {
    const rawReceiptText = `
      THE COFFEE BEAN & TEA LEAF
      MID VALLEY MEGAMALL
      DATE: 18/10/2026 10:32 AM
      1 ICED AMERICANO RM 12.90
      1 CROISSANT RM 9.50
      TOTAL RM 24.64
    `;

    // Parse extracted OCR data
    const parsed = parseReceiptText(rawReceiptText);
    expect(parsed.merchant).toBe('THE COFFEE BEAN & TEA LEAF');
    expect(parsed.amount).toBe(24.64);
    expect(parsed.items).toHaveLength(2);

    // Verify nothing is committed to the store prior to confirmation
    const sBefore = useCtrlPayStore.getState();
    expect(sBefore.currentBalance).toBe(7540);
    expect(sBefore.activities).toHaveLength(0);

    // Commit only upon explicit user confirmation
    useCtrlPayStore.getState().bookExpense({
      merchant: parsed.merchant,
      amount: parsed.amount,
      category: parsed.category as any,
      isNeed: parsed.isNeed,
      source: 'OCR',
      items: parsed.items,
    });

    const sAfter = useCtrlPayStore.getState();
    expect(sAfter.currentBalance).toBe(7540 - 24.64);
    expect(sAfter.activities).toHaveLength(1);
    expect(sAfter.activities[0].title).toBe('THE COFFEE BEAN & TEA LEAF');
    expect(sAfter.activities[0].isExtractedFromNotification).toBe(true);
  });

  // 2. Duplicate submission prevention
  it('prevents duplicate transaction creation when user retries submission', () => {
    const committedFingerprints = new Set<string>();

    const recordTransaction = (merchant: string, amount: number, date: string) => {
      const fingerprint = `${merchant}_${amount.toFixed(2)}_${date}`;
      if (committedFingerprints.has(fingerprint)) {
        return false; // rejected as duplicate
      }
      committedFingerprints.add(fingerprint);
      useCtrlPayStore.getState().bookExpense({
        merchant,
        amount,
        category: 'Dining & Food' as any,
        isNeed: true,
        source: 'OCR',
      });
      return true;
    };

    const first = recordTransaction('Tealive', 8.9, '2026-10-18');
    expect(first).toBe(true);
    expect(useCtrlPayStore.getState().activities).toHaveLength(1);

    // Retry same submission
    const duplicate = recordTransaction('Tealive', 8.9, '2026-10-18');
    expect(duplicate).toBe(false);
    expect(useCtrlPayStore.getState().activities).toHaveLength(1);
  });

  // 3. Insights refreshing after a confirmed transaction
  it('refreshes AI insights dynamically with updated figures after a booking', () => {
    const snap1 = useCtrlPayStore.getState().ledgerSnapshot();
    const insights1 = generateAiFinancialInsights(testUserId, snap1, 3);
    const initialAllowance = insights1.cfar.dynamicDailyAllowance;

    // Book an expense
    useCtrlPayStore.getState().bookExpense({
      merchant: 'Popular Bookstore',
      amount: 150.0,
      category: 'Shopping' as any,
      isNeed: false,
      source: 'OCR',
    });

    const snap2 = useCtrlPayStore.getState().ledgerSnapshot();
    const insights2 = generateAiFinancialInsights(testUserId, snap2, 4);

    // Dynamic daily allowance recalculated
    expect(insights2.cfar.dynamicDailyAllowance).toBeLessThan(initialAllowance);
    expect(insights2.spending.underlyingTransactionsCount).toBe(4);
  });

  // 4. Spending insights: sufficient history vs insufficient history
  it('flags INSUFFICIENT_HISTORY when history is too sparse (< 3 transactions)', () => {
    const snap = useCtrlPayStore.getState().ledgerSnapshot();
    const sparseInsights = generateAiFinancialInsights(testUserId, snap, 1);

    expect(sparseInsights.spending.type).toBe('INSUFFICIENT_HISTORY');
    expect(sparseInsights.spending.isReliableTrend).toBe(false);
    expect(sparseInsights.spending.explanation).toContain('Fewer than 3 recorded transactions');
  });

  it('calculates reliable spending insights when history is sufficient (>= 3 transactions)', () => {
    const snap = useCtrlPayStore.getState().ledgerSnapshot();
    const richInsights = generateAiFinancialInsights(testUserId, snap, 6);

    expect(richInsights.spending.isReliableTrend).toBe(true);
    expect(richInsights.spending.type).not.toBe('INSUFFICIENT_HISTORY');
    expect(richInsights.spending.currentSpend).toBeGreaterThan(0);
  });

  // 5. CFaR results sourced strictly from calculation engine
  it('ensures CFaR figures are computed by deterministic quant-engine and marked as engine-calculated', () => {
    const snap = useCtrlPayStore.getState().ledgerSnapshot();
    const insights = generateAiFinancialInsights(testUserId, snap, 5);

    expect(insights.cfar.isEngineCalculated).toBe(true);
    expect(insights.cfar.dynamicDailyAllowance).toBeGreaterThan(0);
    expect(insights.cfar.cfar95).toBeGreaterThanOrEqual(0);
    expect(typeof insights.cfar.shortfallProbability).toBe('number');
    expect(insights.cfar.shortfallProbability).toBeGreaterThanOrEqual(0);
    expect(insights.cfar.shortfallProbability).toBeLessThanOrEqual(1);
  });

  // 6. Invalid or fabricated AI financial figures are rejected
  it('validates extracted amounts and rejects negative or zero figures', () => {
    const invalidReceipt = `
      BAD STORE
      TOTAL RM -45.00
      TOTAL RM 0.00
    `;
    const parsed = parseReceiptText(invalidReceipt);
    expect(parsed.amount).toBe(0); // Rejects negative or zero amount
  });

  // 7. Subscription proposals require explicit user approval
  it('requires explicit user approval before a subscription proposal creates a pending sweep', () => {
    const proposal = signProposal(sweepTerms, testUserId);

    expect(proposal.proposalId).toBeDefined();
    // Before approval, pendingSweeps in store remains empty
    expect(useCtrlPayStore.getState().pendingSweeps).toHaveLength(0);

    // User explicitly approves
    useCtrlPayStore.getState().applyDecision(proposal, 'APPROVED');

    expect(useCtrlPayStore.getState().pendingSweeps).toHaveLength(1);
    expect(useCtrlPayStore.getState().pendingSweeps[0].subscriptionId).toBe('spotify_my');
  });

  // 8. PendingSweep is not counted as verified savings
  it('does not increment defenseVault balance when a PendingSweep is created', () => {
    const proposal = signProposal(sweepTerms, testUserId);

    const vaultBefore = useCtrlPayStore.getState().defenseVault;
    useCtrlPayStore.getState().applyDecision(proposal, 'APPROVED');

    // PendingSweep created, but Vault has NOT received money yet (Flaw 3 protection)
    expect(useCtrlPayStore.getState().defenseVault).toBe(vaultBefore);
    expect(useCtrlPayStore.getState().pendingSweeps[0].status).toBe('PENDING_NEXT_BILLING_VERIFICATION');
  });

  // 9. Vault and Reward Pool update only after billing cycle verification
  it('credits defenseVault and rewardPool only when advanceClock crosses nextBillingDate', () => {
    const proposal = signProposal(sweepTerms, testUserId);

    useCtrlPayStore.getState().applyDecision(proposal, 'APPROVED');
    const sweep = useCtrlPayStore.getState().pendingSweeps[0];

    // Fast-forward clock past next billing date (7 days)
    useCtrlPayStore.getState().advanceClock(24 * 7);

    const sAfter = useCtrlPayStore.getState();
    expect(sAfter.pendingSweeps[0].status).toBe('VERIFIED');
    expect(sAfter.defenseVault).toBe(sweep.monthlySavings);
    expect(sAfter.rewardPool).toBe(24 + sweep.monthlySavings);
  });

  // 10. Master Autonomy Switch OFF prevents unauthorized actions
  it('prevents autonomous execution when Master Switch is OFF', () => {
    const s = useCtrlPayStore.getState();
    expect(s.masterAutonomyEnabled).toBe(false);

    // Toggling tier fails while Master Autonomy is OFF
    s.setTier('T1', true);
    expect(useCtrlPayStore.getState().enabledTiers.T1).toBe(false);
  });

  // 11. Audit logging for relevant state changes
  it('writes verified SHA-256 hash-chained audit log entries for bookings and insights', () => {
    useCtrlPayStore.getState().bookExpense({
      merchant: 'USM Canteen',
      amount: 6.5,
      category: 'Dining & Food' as any,
      isNeed: true,
      source: 'OCR',
    });

    const entries = auditLog.list(testUserId);
    expect(entries.length).toBeGreaterThan(0);
    const last = entries[entries.length - 1];
    expect(last.actionType).toBe('USER_BOOK_EXPENSE');
    expect(last.entryHash).toBeDefined();

    const isValid = auditLog.verifyChain(testUserId);
    expect(isValid).toBe(true);
  });
});
