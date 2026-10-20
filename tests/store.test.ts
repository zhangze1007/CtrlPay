import { beforeEach, describe, expect, it } from 'vitest';
import { useCtrlPayStore, type PaymentIntent } from '@/lib/store';
import { signProposal } from '@/lib/signing';
import {
  INITIAL_AI_MANDATE,
  INITIAL_BALANCE,
  INITIAL_DEFENSE_VAULT,
  INITIAL_REWARD_POOL,
  INITIAL_USER_LIMITS,
  MONTHLY_SAVINGS_GOAL,
  RECURRING_TRANSACTIONS,
  SANDBOX_START_MS,
  SPENT_THIS_MONTH,
  SPENT_THIS_WEEK,
  SUBSCRIPTIONS,
  USAGE_SIGNALS,
} from '@/lib/mock-data';
import { analyzeZombies } from '@/lib/zombie-radar';
import { auditLog } from '@/lib/audit-logger';
import { round2 } from '@/lib/utils';
import type { ProposalTerms } from '@/lib/types';

const USER = 'student_usm_001';

function resetStore() {
  const tags = analyzeZombies({
    transactions: RECURRING_TRANSACTIONS,
    subscriptions: SUBSCRIPTIONS,
    usageSignals: USAGE_SIGNALS,
    sandboxClock: SANDBOX_START_MS,
  }).tags;
  auditLog.__reset(USER);
  useCtrlPayStore.setState({
    sandboxClock: SANDBOX_START_MS,
    currentBalance: INITIAL_BALANCE,
    defenseVault: INITIAL_DEFENSE_VAULT,
    rewardPool: INITIAL_REWARD_POOL,
    masterAutonomyEnabled: false,
    enabledTiers: { T0: true, T1: false, T2: false, T3: false },
    userLimits: INITIAL_USER_LIMITS,
    aiMandate: INITIAL_AI_MANDATE,
    amortizeAnnualFees: false,
    plan: 'FREE',
    spentThisWeek: SPENT_THIS_WEEK,
    spentThisMonth: SPENT_THIS_MONTH,
    studentVerified: false,
    gmailConsent: false,
    quarantines: [],
    escrows: [],
    pendingSweeps: [],
    zombieTags: tags,
    events: [],
  });
}

const quarantineTerms: ProposalTerms = {
  kind: 'QUARANTINE',
  targetItem: 'Shopee impulse buy',
  itemPrice: 180,
  premiumReward: 9,
  quarantineHours: 24,
  shortfallProbability: 42,
  cfar95: 210,
  riskLevel: 'HIGH',
};

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

const escrowTerms: ProposalTerms = {
  kind: 'ESCROW',
  targetItem: 'Shopee impulse buy',
  itemPrice: 180,
  lockedCategories: ['Shopping'],
  dailyBudgetReduction: 10,
  durationDays: 7,
  maxAllowedReduction: 20,
  shortfallProbability: 42,
  cfar95: 210,
};

describe('sandbox clock & state model', () => {
  beforeEach(resetStore);

  it('starts at the sandbox clock with Master OFF (T0 advisory only)', () => {
    const s = useCtrlPayStore.getState();
    expect(s.sandboxClock).toBe(SANDBOX_START_MS);
    expect(s.masterAutonomyEnabled).toBe(false);
    expect(s.enabledTiers.T0).toBe(true);
    expect(s.enabledTiers.T1).toBe(false);
  });

  it('fast-forwarding 24h flips a quarantine LOCKED_24H -> READY_TO_DECIDE', () => {
    const q = signProposal(quarantineTerms, USER);
    useCtrlPayStore.getState().applyDecision(q, 'APPROVED');
    expect(useCtrlPayStore.getState().quarantines[0].status).toBe('LOCKED_24H');

    useCtrlPayStore.getState().advanceClock(24);
    expect(useCtrlPayStore.getState().quarantines[0].status).toBe('READY_TO_DECIDE');
  });

  it('impossible to claim a reward before +24h', () => {
    const q = signProposal(quarantineTerms, USER);
    useCtrlPayStore.getState().applyDecision(q, 'APPROVED');
    useCtrlPayStore.getState().claimQuarantineReward(q.proposalId);
    const s = useCtrlPayStore.getState();
    expect(s.quarantines[0].status).toBe('LOCKED_24H');
    expect(s.defenseVault).toBe(INITIAL_DEFENSE_VAULT);
    expect(s.rewardPool).toBe(INITIAL_REWARD_POOL);
  });

  it('pays the reward from the rewardPool into the defenseVault after +24h', () => {
    const q = signProposal(quarantineTerms, USER);
    useCtrlPayStore.getState().applyDecision(q, 'APPROVED');
    useCtrlPayStore.getState().advanceClock(24);
    useCtrlPayStore.getState().claimQuarantineReward(q.proposalId);
    const s = useCtrlPayStore.getState();
    expect(s.quarantines[0].status).toBe('CLAIMED');
    expect(s.rewardPool).toBe(INITIAL_REWARD_POOL - 9);
    expect(s.defenseVault).toBe(9);
  });

  it('is idempotent: a second claim cannot drain the rewardPool again', () => {
    const q = signProposal(quarantineTerms, USER);
    useCtrlPayStore.getState().applyDecision(q, 'APPROVED');
    useCtrlPayStore.getState().advanceClock(24);
    useCtrlPayStore.getState().claimQuarantineReward(q.proposalId);
    const afterFirst = useCtrlPayStore.getState();
    const vaultAfterFirst = afterFirst.defenseVault;
    const poolAfterFirst = afterFirst.rewardPool;

    useCtrlPayStore.getState().claimQuarantineReward(q.proposalId);
    const afterSecond = useCtrlPayStore.getState();
    expect(afterSecond.defenseVault).toBe(vaultAfterFirst);
    expect(afterSecond.rewardPool).toBe(poolAfterFirst);
    expect(afterSecond.quarantines[0].status).toBe('CLAIMED');
  });

  it('pays no reward when the user proceeds with the purchase', () => {
    const q = signProposal(quarantineTerms, USER);
    useCtrlPayStore.getState().applyDecision(q, 'APPROVED');
    useCtrlPayStore.getState().advanceClock(48);
    useCtrlPayStore.getState().releaseQuarantine(q.proposalId);
    const s = useCtrlPayStore.getState();
    expect(s.quarantines[0].status).toBe('RELEASED');
    expect(s.defenseVault).toBe(0);
    expect(s.rewardPool).toBe(INITIAL_REWARD_POOL);
  });

  it('credits a pending sweep ONLY after its billing date is crossed (two-stage settlement)', () => {
    const sw = signProposal(sweepTerms, USER);
    useCtrlPayStore.getState().applyDecision(sw, 'APPROVED');
    let s = useCtrlPayStore.getState();
    expect(s.pendingSweeps[0].status).toBe('PENDING_NEXT_BILLING_VERIFICATION');
    expect(s.defenseVault).toBe(0); // nothing moves at stage 1

    useCtrlPayStore.getState().advanceClock(24); // Mar 13 < Mar 18 billing date
    s = useCtrlPayStore.getState();
    expect(s.pendingSweeps[0].status).toBe('PENDING_NEXT_BILLING_VERIFICATION');
    expect(s.defenseVault).toBe(0);

    useCtrlPayStore.getState().advanceClock(24 * 6); // crosses Mar 18
    s = useCtrlPayStore.getState();
    expect(s.pendingSweeps[0].status).toBe('VERIFIED');
    expect(s.defenseVault).toBeCloseTo(7.4, 2);
  });

  it('only ever credits the vault up to verified sweep savings (no money created)', () => {
    const sw = signProposal(sweepTerms, USER);
    useCtrlPayStore.getState().applyDecision(sw, 'APPROVED');
    useCtrlPayStore.getState().advanceClock(24 * 30);
    const s = useCtrlPayStore.getState();
    const verifiedSavings = s.pendingSweeps
      .filter((x) => x.status === 'VERIFIED')
      .reduce((sum, x) => sum + x.monthlySavings, 0);
    expect(s.defenseVault).toBeLessThanOrEqual(verifiedSavings + 1e-9);
  });

  it('completes an escrow once its duration has elapsed', () => {
    const e = signProposal(escrowTerms, USER);
    useCtrlPayStore.getState().applyDecision(e, 'APPROVED');
    expect(useCtrlPayStore.getState().escrows[0].status).toBe('ACTIVE');
    useCtrlPayStore.getState().advanceClock(24 * 7);
    expect(useCtrlPayStore.getState().escrows[0].status).toBe('COMPLETED');
  });

  it('applies modified escrow terms', () => {
    const e = signProposal(escrowTerms, USER);
    useCtrlPayStore.getState().applyDecision(e, 'MODIFIED', { durationDays: 3, dailyBudgetReduction: 5 });
    const rec = useCtrlPayStore.getState().escrows[0];
    expect(rec.durationDays).toBe(3);
    expect(rec.dailyBudgetReduction).toBe(5);
  });

  it('fires the 12:00 PM Daily Spending Summary when the clock crosses noon', () => {
    useCtrlPayStore.getState().advanceClock(4); // 09:00 -> 13:00
    const events = useCtrlPayStore.getState().events;
    expect(events.some((e) => e.type === 'DAILY_SUMMARY')).toBe(true);
  });

  it('fires the Month-End Subscription Roast on Jump to Month-End', () => {
    useCtrlPayStore.getState().jumpToMonthEnd();
    const events = useCtrlPayStore.getState().events;
    const roast = events.find((e) => e.type === 'MONTH_END_ROAST');
    expect(roast).toBeTruthy();
    expect((roast!.payload as { wastedMonthly: number }).wastedMonthly).toBeGreaterThan(0);
  });

  it('is idempotent: a second Jump to Month-End does not move the clock or credit again', () => {
    useCtrlPayStore.getState().jumpToMonthEnd();
    const first = useCtrlPayStore.getState();
    const clock = first.sandboxClock;
    const vault = first.defenseVault;
    const pool = first.rewardPool;

    useCtrlPayStore.getState().jumpToMonthEnd();
    const second = useCtrlPayStore.getState();
    expect(second.sandboxClock).toBe(clock);
    expect(second.defenseVault).toBe(vault);
    expect(second.rewardPool).toBe(pool);
  });

  it('tier toggles only work while Master Autonomy is ON', () => {
    useCtrlPayStore.getState().setTier('T1', true);
    expect(useCtrlPayStore.getState().enabledTiers.T1).toBe(false); // master off
    useCtrlPayStore.getState().setMasterAutonomy(true);
    useCtrlPayStore.getState().setTier('T1', true);
    expect(useCtrlPayStore.getState().enabledTiers.T1).toBe(true);
  });

  it('runs a What-If and surfaces an intercept event for an impulse buy', () => {
    const intent: PaymentIntent = {
      merchant: 'Shopee',
      amount: 180,
      category: 'Shopping',
      isNeed: false,
    };
    useCtrlPayStore.getState().simulatePaymentIntent(intent);
    const events = useCtrlPayStore.getState().events;
    expect(events.length).toBe(1);
    expect(['PAYMENT_INTERCEPT', 'PAYMENT_OK']).toContain(events[0].type);
  });

  it('writes an audit entry for every mutation and keeps the chain valid', () => {
    useCtrlPayStore.getState().setMasterAutonomy(true);
    useCtrlPayStore.getState().setAmortize(true);
    useCtrlPayStore.getState().advanceClock(24);
    expect(auditLog.list(USER).length).toBeGreaterThanOrEqual(3);
    expect(auditLog.verifyChain(USER)).toBe(true);
  });

  it('amortizing annual fees changes the dynamic daily allowance', () => {
    const before = useCtrlPayStore.getState().dynamicDailyAllowance();
    useCtrlPayStore.getState().setAmortize(true);
    const after = useCtrlPayStore.getState().dynamicDailyAllowance();
    expect(after).not.toBe(before);
  });
});

describe('Back-Tap quick logging', () => {
  beforeEach(() => {
    resetStore();
    useCtrlPayStore.setState({ activities: [], totalExpenses: 0, categoryExpenses: {} });
  });

  it('shows an expense in the Latest Transactions feed with its merchant and signed amount', () => {
    const before = useCtrlPayStore.getState();
    before.quickLogTransaction({
      type: 'EXPENSE',
      amount: 23.45,
      merchant: 'Tealive & Campus Lunch',
      category: 'Bubble_Tea_Dining',
      isNeed: false,
      subCategory: 'Food & Dining',
      paymentAccount: 'Touch n Go eWallet',
    });
    const s = useCtrlPayStore.getState();
    expect(s.currentBalance).toBe(round2(before.currentBalance - 23.45));
    expect(s.activities[0]).toMatchObject({
      title: 'Tealive & Campus Lunch',
      amount: '- RM 23.45 -',
      rawAmount: 23.45,
    });
    expect(s.totalExpenses).toBe(23.45);
    expect(s.events[0].payload).toMatchObject({
      merchant: 'Tealive & Campus Lunch',
      amount: 23.45,
      entryType: 'EXPENSE',
    });
  });

  it('shows an income in the feed with its merchant, without inflating spending totals', () => {
    const before = useCtrlPayStore.getState();
    before.quickLogTransaction({
      type: 'INCOME',
      amount: 250,
      merchant: 'Tuition Refund',
      category: 'Campus_Cafeteria_Basic',
      isNeed: true,
      subCategory: 'Allowance',
      paymentAccount: 'WeBank / Bank Savings',
    });
    const s = useCtrlPayStore.getState();
    expect(s.currentBalance).toBe(round2(before.currentBalance + 250));
    expect(s.activities[0]).toMatchObject({
      title: 'Tuition Refund',
      amount: '+ RM 250.00 +',
      rawAmount: 250,
      category: 'Income',
    });
    expect(s.totalExpenses).toBe(0);
    expect(s.categoryExpenses).toEqual({});
    expect(s.events[0].payload).toMatchObject({
      merchant: 'Tuition Refund',
      amount: 250,
      entryType: 'INCOME',
    });
  });
});
