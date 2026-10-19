'use client';

/**
 * Reactive global sandbox state (plan.md Section 4.4) + the event-driven sandbox clock.
 *
 * EVERY mutation:
 *   - writes an entry to the hash-chained audit log, and
 *   - emits `console.info('[SANDBOX]', ...)` (the competition's required operation log).
 *
 * `defenseVault` is a labelled, NON-INTEREST-BEARING ledger bucket. No real money moves.
 */
import { create } from 'zustand';
import {
  HISTORICAL_DAILY_SPENDING,
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
  CURRENT_USER_ID,
  PROFILE,
} from './mock-data';
import { auditLog } from './audit-logger';
import { applyUsageAnswer, analyzeZombies, type ZombieTag } from './zombie-radar';
import { SUBSCRIPTION_REGISTRY, type SubscriptionId } from './subscription-registry';
import {
  calculateQuarantineReward,
  computeDynamicDailyAllowance,
  routeIntervention,
  runWhatIfSimulation,
  toStudentUnits,
  unpaidFixedBillTotal,
} from './quant-engine';
import {
  buildLedgerSnapshot,
  buildWhatIfInput,
  upcomingFixedBills,
  type LedgerSnapshot,
} from './ledger';
import {
  endOfMonthMs,
  noonsBetween,
  remainingDaysInMonth,
  round2,
  toISODateTime,
} from './utils';
import type { AiMandate, SignedProposal, SpendCategory, UserSpendingLimit } from './types';
import type { PermissionTier } from './permissions';
import {
  type ActivityItem,
  INITIAL_ACTIVITIES,
  EXTENDED_ACTIVITIES,
  INITIAL_CATEGORY_EXPENSES,
  INITIAL_TOTAL_EXPENSES,
  mapToDashboardCategory,
} from './activities';

export type { PermissionTier };
export type { ZombieTag };
export type { ActivityItem };

const DAY_MS = 86_400_000;
const QUARANTINE_MS = 24 * 3_600_000;

export type SandboxEventType =
  | 'QUARANTINE_READY'
  | 'QUARANTINE_CLAIMED'
  | 'QUARANTINE_RELEASED'
  | 'ESCROW_STARTED'
  | 'ESCROW_COMPLETED'
  | 'SWEEP_VERIFIED'
  | 'SWEEP_NOT_VERIFIED'
  | 'DAILY_SUMMARY'
  | 'MONTH_END_ROAST'
  | 'PAYMENT_OK'
  | 'PAYMENT_INTERCEPT'
  | 'BOOKING';

export interface SandboxEvent {
  id: string;
  type: SandboxEventType;
  at: number;
  payload: Record<string, unknown>;
}

export interface QuarantineRecord {
  proposalId: string;
  targetItem: string;
  itemPrice: number;
  premiumReward: number;
  status: 'LOCKED_24H' | 'READY_TO_DECIDE' | 'CLAIMED' | 'RELEASED';
  lockedAt: number; // sandbox clock ms
}

export interface EscrowRecord {
  proposalId: string;
  lockedCategories: string[];
  dailyBudgetReduction: number;
  durationDays: number;
  startedAt: number; // sandbox clock ms
  status: 'ACTIVE' | 'COMPLETED';
}

export interface PendingSweep {
  proposalId: string;
  subscriptionId: string;
  monthlySavings: number;
  nextBillingDate: number;
  status: 'PENDING_NEXT_BILLING_VERIFICATION' | 'VERIFIED' | 'NOT_VERIFIED';
}

export interface PaymentIntent {
  merchant: string;
  amount: number;
  category: SpendCategory;
  isNeed: boolean;
}

export interface CtrlPayState {
  userId: string;
  sandboxClock: number; // ms epoch, controlled ONLY by the Simulation Toolbar
  currentBalance: number;
  defenseVault: number; // formerly yieldPocket; non-interest-bearing ledger bucket
  rewardPool: number; // funded only by VERIFIED sweep savings
  masterAutonomyEnabled: boolean; // default false
  enabledTiers: Record<PermissionTier, boolean>;
  userLimits: UserSpendingLimit;
  aiMandate: AiMandate;
  amortizeAnnualFees: boolean;
  plan: 'FREE' | 'PRO';
  roastTone: 'GENTLE' | 'SPICY';
  spentThisWeek: number;
  spentThisMonth: number;
  totalExpenses: number;
  categoryExpenses: Record<string, number>;
  activities: ActivityItem[];
  studentVerified: boolean;
  gmailConsent: boolean;
  quarantines: QuarantineRecord[];
  escrows: EscrowRecord[];
  pendingSweeps: PendingSweep[];
  zombieTags: Record<string, ZombieTag>;
  events: SandboxEvent[];
  profile: {
    fullName: string;
    memberId: string;
    studentEmail: string;
    avatar: string;
  };

  // actions
  setProfile(next: Partial<{ fullName: string; memberId: string; studentEmail: string; avatar: string }>): void;
  advanceClock(hours: number): void;
  jumpToMonthEnd(): void;
  applyDecision(
    p: SignedProposal,
    decision: 'APPROVED' | 'MODIFIED' | 'DECLINED',
    newTerms?: { durationDays?: number; dailyBudgetReduction?: number },
  ): void;
  claimQuarantineReward(proposalId: string): void;
  releaseQuarantine(proposalId: string): void;
  setMasterAutonomy(on: boolean): void;
  setTier(tier: PermissionTier, on: boolean): void;
  setAmortize(on: boolean): void;
  setAiMandate(next: Partial<AiMandate>): void;
  setPlan(plan: 'FREE' | 'PRO'): void;
  setRoastTone(tone: 'GENTLE' | 'SPICY'): void;
  setStudentVerified(on: boolean): void;
  setGmailConsent(on: boolean): void;
  simulatePaymentIntent(intent: PaymentIntent): void;
  proceedPayment(intent: PaymentIntent): void;
  bookExpense(booking: {
    merchant: string;
    amount: number;
    category: SpendCategory | string;
    isNeed: boolean;
    source?: string;
    items?: Array<{ name: string; price: number }>;
  }): void;
  addActivity(activity: ActivityItem): void;
  refreshZombieTags(): void;
  answerZombie(subscriptionId: SubscriptionId, usedInPast30Days: boolean): void;
  dismissEvent(id: string): void;

  // selectors
  ledgerSnapshot(): LedgerSnapshot;
  dynamicDailyAllowance(): number;
  runWhatIf(intent: PaymentIntent): ReturnType<typeof runWhatIfSimulation>;
}

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

function pushEvent(events: SandboxEvent[], e: SandboxEvent): SandboxEvent[] {
  return [...events, e].slice(-60);
}

const initialZombieTags = analyzeZombies({
  transactions: RECURRING_TRANSACTIONS,
  subscriptions: SUBSCRIPTIONS,
  usageSignals: USAGE_SIGNALS,
  sandboxClock: SANDBOX_START_MS,
}).tags;

function audit(s: CtrlPayState, e: Omit<Parameters<typeof auditLog.append>[0], 'sandboxClock'> & { at?: number }): void {
  const { at, ...rest } = e;
  auditLog.append({ ...rest, sandboxClock: toISODateTime(at ?? s.sandboxClock) }, s.userId);
}

/* ------------------------------------------------------------------ *
 * store
 * ------------------------------------------------------------------ */

export const useCtrlPayStore = create<CtrlPayState>((set, get) => ({
  userId: CURRENT_USER_ID,
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
  roastTone: 'GENTLE',
  spentThisWeek: SPENT_THIS_WEEK,
  spentThisMonth: SPENT_THIS_MONTH,
  totalExpenses: INITIAL_TOTAL_EXPENSES,
  categoryExpenses: { ...INITIAL_CATEGORY_EXPENSES },
  activities: [...EXTENDED_ACTIVITIES],
  studentVerified: false,
  gmailConsent: false,
  quarantines: [],
  escrows: [],
  pendingSweeps: [],
  zombieTags: initialZombieTags,
  events: [],
  profile: {
    fullName: PROFILE.fullName,
    memberId: PROFILE.memberId,
    studentEmail: PROFILE.studentEmail,
    avatar: PROFILE.avatar,
  },

  setProfile(next) {
    const s = get();
    const updated = { ...s.profile, ...next };
    set({ profile: updated });
    audit(s, {
      actor: 'USER',
      actionType: 'UPDATE_PROFILE',
      permissionTier: 'T0',
      data_accessed: ['profile'],
      authorization_ref: 'USER_EDIT_PROFILE',
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] setProfile', updated.fullName);
  },

  ledgerSnapshot() {
    const s = get();
    return buildLedgerSnapshot({
      userId: s.userId,
      sandboxClock: s.sandboxClock,
      currentBalance: s.currentBalance,
      defenseVault: s.defenseVault,
      rewardPool: s.rewardPool,
      amortizeAnnualFees: s.amortizeAnnualFees,
      spentThisWeek: s.spentThisWeek,
      spentThisMonth: s.spentThisMonth,
      userLimits: s.userLimits,
      aiMandate: s.aiMandate,
      subscriptions: SUBSCRIPTIONS,
      fixedBills: upcomingFixedBills(s.sandboxClock, SUBSCRIPTIONS, s.amortizeAnnualFees),
      historicalDailySpending: HISTORICAL_DAILY_SPENDING,
      monthlySavingsGoal: MONTHLY_SAVINGS_GOAL,
    });
  },

  dynamicDailyAllowance() {
    const s = get();
    const bills = upcomingFixedBills(s.sandboxClock, SUBSCRIPTIONS, s.amortizeAnnualFees);
    return computeDynamicDailyAllowance({
      currentBalance: s.currentBalance,
      unpaidFixedBills: unpaidFixedBillTotal(bills),
      monthlySavingsGoal: MONTHLY_SAVINGS_GOAL,
      remainingDaysInMonth: remainingDaysInMonth(s.sandboxClock),
    });
  },

  runWhatIf(intent) {
    const snapshot = get().ledgerSnapshot();
    return runWhatIfSimulation(
      buildWhatIfInput(snapshot, {
        amount: intent.amount,
        category: intent.category,
        isNeed: intent.isNeed,
      }),
    );
  },

  setMasterAutonomy(on) {
    const s = get();
    set({ masterAutonomyEnabled: on });
    audit(s, {
      actor: 'USER',
      actionType: 'SET_MASTER_AUTONOMY',
      permissionTier: 'T0',
      data_accessed: ['settings.masterAutonomy'],
      authorization_ref: on ? 'USER_TOGGLE_MASTER_ON' : 'USER_TOGGLE_MASTER_OFF',
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] setMasterAutonomy', on);
  },

  setTier(tier, on) {
    const s = get();
    if (tier === 'T0') return; // T0 is always on
    if (!s.masterAutonomyEnabled) return; // tiers are only toggleable when master is ON
    set({ enabledTiers: { ...s.enabledTiers, [tier]: on } });
    audit(s, {
      actor: 'USER',
      actionType: `SET_TIER_${tier}`,
      permissionTier: 'T0',
      data_accessed: ['settings.permissionTiers'],
      authorization_ref: on ? `USER_TOGGLE_${tier}_ON` : `USER_TOGGLE_${tier}_OFF`,
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] setTier', tier, on);
  },

  setAmortize(on) {
    const s = get();
    set({ amortizeAnnualFees: on });
    audit(s, {
      actor: 'USER',
      actionType: 'SET_AMORTIZE_ANNUAL_FEES',
      permissionTier: 'T0',
      data_accessed: ['subscriptions', 'settings.amortizeAnnualFees'],
      authorization_ref: on ? 'USER_TOGGLE_AMORTIZE_ON' : 'USER_TOGGLE_AMORTIZE_OFF',
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] setAmortize', on);
  },

  setPlan(plan) {
    const s = get();
    set({ plan });
    audit(s, {
      actor: 'USER',
      actionType: 'SET_PLAN',
      permissionTier: 'T0',
      data_accessed: ['settings.plan'],
      authorization_ref: `USER_PLAN_${plan}`,
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] setPlan', plan);
  },

  setAiMandate(next) {
    const s = get();
    const merged: AiMandate = {
      maxLockAmountRM: Math.min(
        1000,
        Math.max(10, round2(next.maxLockAmountRM ?? s.aiMandate.maxLockAmountRM)),
      ),
      maxLockDurationDays: Math.min(
        30,
        Math.max(1, Math.round(next.maxLockDurationDays ?? s.aiMandate.maxLockDurationDays)),
      ),
    };
    set({ aiMandate: merged });
    audit(s, {
      actor: 'USER',
      actionType: 'SET_AI_MANDATE',
      permissionTier: 'T0',
      data_accessed: ['settings.aiMandate'],
      authorization_ref: 'USER_ADJUST_AI_MANDATE',
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] setAiMandate', merged.maxLockAmountRM, merged.maxLockDurationDays);
  },

  setRoastTone(tone) {
    set({ roastTone: tone });
    console.info('[SANDBOX] setRoastTone', tone);
  },

  setStudentVerified(on) {
    const s = get();
    set({ studentVerified: on });
    audit(s, {
      actor: 'USER',
      actionType: 'STUDENT_EMAIL_OTP_VERIFIED',
      permissionTier: 'T2',
      data_accessed: ['profile.studentEmail', 'verification.studentStatus'],
      authorization_ref: on ? 'USER_SUBMIT_STUDENT_OTP' : 'USER_CLEAR_STUDENT_OTP',
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] setStudentVerified', on);
  },

  setGmailConsent(on) {
    const s = get();
    set({ gmailConsent: on });
    audit(s, {
      actor: 'USER',
      actionType: 'SET_GMAIL_RECEIPT_CONSENT',
      permissionTier: 'T1',
      data_accessed: ['consent.gmailReceipts'],
      authorization_ref: on ? 'USER_GRANT_GMAIL_READONLY' : 'USER_REVOKE_GMAIL_READONLY',
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] setGmailConsent', on);
  },

  refreshZombieTags() {
    const s = get();
    const { tags } = analyzeZombies({
      transactions: RECURRING_TRANSACTIONS,
      subscriptions: SUBSCRIPTIONS,
      usageSignals: USAGE_SIGNALS,
      sandboxClock: s.sandboxClock,
    });
    set({ zombieTags: tags });
  },

  answerZombie(subscriptionId, usedInPast30Days) {
    const s = get();
    const current = s.zombieTags[subscriptionId] ?? 'SUSPECTED_ZOMBIE';
    const next = applyUsageAnswer(current, usedInPast30Days);
    set({ zombieTags: { ...s.zombieTags, [subscriptionId]: next } });
    audit(s, {
      actor: 'USER',
      actionType: 'FLAG_SUSPECTED_ZOMBIE',
      permissionTier: 'T1',
      data_accessed: ['usageSignals', 'subscriptions'],
      authorization_ref: usedInPast30Days ? 'USER_USED_YES' : 'USER_USED_NO',
      proposal_hash: null,
      status: 'MODIFIED',
    });
    console.info('[SANDBOX] answerZombie', subscriptionId, usedInPast30Days, '->', next);
  },

  dismissEvent(id) {
    set({ events: get().events.filter((e) => e.id !== id) });
  },

  simulatePaymentIntent(intent) {
    const s = get();
    const result = get().runWhatIf(intent);
    const gate = routeIntervention({ result, isNeed: intent.isNeed });
    const units = toStudentUnits(intent.amount);
    const at = s.sandboxClock;
    // Documented gate: only HIGH/CRITICAL or a limit breach surfaces an intervention.
    const elevated = gate.action === 'QUARANTINE' || gate.action === 'ESCROW';

    set({
      events: pushEvent(s.events, {
        id: `evt_${elevated ? 'PAYMENT_INTERCEPT' : 'PAYMENT_OK'}_${at}_${intent.merchant}`,
        type: elevated ? 'PAYMENT_INTERCEPT' : 'PAYMENT_OK',
        at,
        payload: { intent, result, units, gate },
      }),
    });
    audit(s, {
      actor: 'AGENT',
      actionType: elevated ? 'PAYMENT_INTERCEPT' : 'PAYMENT_OK',
      permissionTier: 'T0',
      data_accessed: ['transactions.last45d', 'bills.unpaid', 'userPayLimits'],
      authorization_ref: 'MANDATE_DEFAULT_T0',
      proposal_hash: null,
      status: 'EXECUTED',
    });
    console.info('[SANDBOX] simulatePaymentIntent', intent.merchant, intent.amount, result.riskLevel);
  },

  proceedPayment(intent) {
    const s = get();
    const amount = round2(intent.amount);
    const catInfo = mapToDashboardCategory(intent.category, intent.merchant);
    const prevCatTotal = s.categoryExpenses?.[catInfo.categoryName] ?? 0;
    const newCatExpenses = {
      ...(s.categoryExpenses ?? INITIAL_CATEGORY_EXPENSES),
      [catInfo.categoryName]: round2(prevCatTotal + amount),
    };

    const newActivity: ActivityItem = {
      id: `act-live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: intent.merchant,
      subtitle: `${catInfo.categoryName} · Direct Payment`,
      amount: `- RM ${amount.toFixed(2)} -`,
      rawAmount: amount,
      category: catInfo.categoryName,
      categoryType: catInfo.categoryType,
      iconBg: catInfo.iconBg,
      iconType: catInfo.iconType,
      timestamp: 'Just now',
      paymentMethod: "Touch 'n Go eWallet (DuitNow QR)",
      referenceId: `AUT-${Math.floor(10000 + Math.random() * 90000)}-LIVE`,
      isExtractedFromNotification: false,
      rawNotificationText: `Simulated checkout payment of RM ${amount.toFixed(2)} at ${intent.merchant}.`,
      aiCategorizationNote: `Direct payment authorized. Categorized under ${catInfo.categoryName}. Real-time balance and expenses synced.`,
      aiConfidence: 99,
    };

    set({
      currentBalance: round2(s.currentBalance - amount),
      spentThisWeek: round2(s.spentThisWeek + amount),
      spentThisMonth: round2(s.spentThisMonth + amount),
      totalExpenses: round2((s.totalExpenses ?? INITIAL_TOTAL_EXPENSES) + amount),
      categoryExpenses: newCatExpenses,
      activities: [newActivity, ...(s.activities ?? EXTENDED_ACTIVITIES)],
      events: s.events.filter((e) => e.type !== 'PAYMENT_INTERCEPT'),
    });
    audit(s, {
      actor: 'USER',
      actionType: 'USER_PROCEED_PAYMENT',
      permissionTier: 'T3',
      data_accessed: ['balance', 'transactions'],
      authorization_ref: 'USER_CLICK_PROCEED_ANYWAY',
      proposal_hash: null,
      status: 'EXECUTED',
    });
    console.info('[SANDBOX] proceedPayment', intent.merchant, intent.amount);
  },

  bookExpense(b) {
    const s = get();
    const at = s.sandboxClock;
    const amount = round2(b.amount);
    const catInfo = mapToDashboardCategory(String(b.category), b.merchant);
    const prevCatTotal = s.categoryExpenses?.[catInfo.categoryName] ?? 0;
    const newCatExpenses = {
      ...(s.categoryExpenses ?? INITIAL_CATEGORY_EXPENSES),
      [catInfo.categoryName]: round2(prevCatTotal + amount),
    };

    const newActivity: ActivityItem = {
      id: `act-live-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: b.merchant,
      subtitle: b.items?.length
        ? b.items.map((it) => it.name).join(', ')
        : `${catInfo.categoryName} · ${b.source ?? 'Quick Log'}`,
      amount: `- RM ${amount.toFixed(2)} -`,
      rawAmount: amount,
      category: catInfo.categoryName,
      categoryType: catInfo.categoryType,
      iconBg: catInfo.iconBg,
      iconType: catInfo.iconType,
      timestamp: 'Just now',
      paymentMethod: "Touch 'n Go eWallet (DuitNow QR)",
      referenceId: `TXN-${Date.now().toString().slice(-5)}`,
      isExtractedFromNotification: b.source === 'NOTIFICATION' || b.source === 'OCR',
      rawNotificationText: b.source === 'OCR'
        ? `Receipt OCR recognized: RM ${amount.toFixed(2)} at ${b.merchant}. Discarded from memory.`
        : `Payment of RM ${amount.toFixed(2)} to ${b.merchant} recorded.`,
      aiCategorizationNote: `AI categorized under ${catInfo.categoryName}. Real-time balance and expenses synced.`,
      aiConfidence: 99,
    };

    set({
      currentBalance: round2(s.currentBalance - amount),
      spentThisWeek: round2(s.spentThisWeek + amount),
      spentThisMonth: round2(s.spentThisMonth + amount),
      totalExpenses: round2((s.totalExpenses ?? INITIAL_TOTAL_EXPENSES) + amount),
      categoryExpenses: newCatExpenses,
      activities: [newActivity, ...(s.activities ?? EXTENDED_ACTIVITIES)],
      events: pushEvent(s.events, {
        id: `evt_BOOKING_${at}_${b.merchant}_${amount}`,
        type: 'BOOKING',
        at,
        payload: {
          merchant: b.merchant,
          amount,
          category: b.category,
          isNeed: b.isNeed,
          source: b.source ?? 'CHAT',
          units: toStudentUnits(amount),
        },
      }),
    });
    audit(s, {
      actor: 'USER',
      actionType: 'USER_BOOK_EXPENSE',
      permissionTier: 'T1',
      data_accessed: ['transactions', 'balance'],
      authorization_ref: 'USER_CONFIRM_BOOKING',
      proposal_hash: null,
      status: 'EXECUTED',
    });
    console.info('[SANDBOX] bookExpense', b.merchant, amount, b.category);
  },

  addActivity(activity) {
    set((s) => ({ activities: [activity, ...(s.activities ?? EXTENDED_ACTIVITIES)] }));
  },

  applyDecision(p, decision, newTerms) {
    const s = get();
    const at = s.sandboxClock;

    if (decision === 'DECLINED') {
      audit(s, {
        actor: 'USER',
        actionType: 'USER_DECISION',
        permissionTier: 'T3',
        data_accessed: ['proposals'],
        authorization_ref: `USER_DECLINE_PROPOSAL_${p.proposalId.slice(-4)}`,
        proposal_hash: p.integrityHash,
        status: 'DECLINED',
      });
      console.info('[SANDBOX] applyDecision DECLINED', p.proposalId);
      return;
    }

    const terms = p.terms;
    if (terms.kind === 'QUARANTINE') {
      if (s.quarantines.some((q) => q.proposalId === p.proposalId)) return; // idempotent
      const rec: QuarantineRecord = {
        proposalId: p.proposalId,
        targetItem: terms.targetItem,
        itemPrice: terms.itemPrice,
        premiumReward: terms.premiumReward,
        status: 'LOCKED_24H',
        lockedAt: at,
      };
      set({ quarantines: [...s.quarantines, rec] });
    } else if (terms.kind === 'ESCROW') {
      if (s.escrows.some((e) => e.proposalId === p.proposalId)) return;
      const rec: EscrowRecord = {
        proposalId: p.proposalId,
        lockedCategories: terms.lockedCategories,
        dailyBudgetReduction: newTerms?.dailyBudgetReduction ?? terms.dailyBudgetReduction,
        durationDays: newTerms?.durationDays ?? terms.durationDays,
        startedAt: at,
        status: 'ACTIVE',
      };
      set({
        escrows: [...s.escrows, rec],
        events: pushEvent(s.events, {
          id: `evt_ESCROW_STARTED_${at}_${p.proposalId}`,
          type: 'ESCROW_STARTED',
          at,
          payload: { escrow: rec },
        }),
      });
    } else {
      // SWEEP -> two-stage settlement, stage 1: nothing moves yet.
      if (s.pendingSweeps.some((sw) => sw.proposalId === p.proposalId)) return;
      const sub = SUBSCRIPTIONS.find((x) => x.subscriptionId === terms.subscriptionId);
      const rec: PendingSweep = {
        proposalId: p.proposalId,
        subscriptionId: terms.subscriptionId,
        monthlySavings: terms.monthlySavings,
        nextBillingDate: sub ? new Date(sub.nextBillingDate).getTime() : at + 30 * DAY_MS,
        status: 'PENDING_NEXT_BILLING_VERIFICATION',
      };
      set({ pendingSweeps: [...s.pendingSweeps, rec] });
    }

    audit(s, {
      actor: 'USER',
      actionType: 'USER_DECISION',
      permissionTier: 'T3',
      data_accessed: ['proposals', 'balance'],
      authorization_ref: `USER_CLICK_APPROVE_PROPOSAL_${p.proposalId.slice(-4)}`,
      proposal_hash: p.integrityHash,
      status: decision === 'MODIFIED' ? 'MODIFIED' : 'APPROVED',
    });
    console.info('[SANDBOX] applyDecision', decision, p.proposalId);
  },

  claimQuarantineReward(proposalId) {
    const s = get();
    const rec = s.quarantines.find((q) => q.proposalId === proposalId);
    if (!rec || rec.status !== 'READY_TO_DECIDE') {
      console.info('[SANDBOX] claim refused (not ready)', proposalId);
      return; // claim before +24h is impossible
    }
    const reward = calculateQuarantineReward(rec.itemPrice, s.rewardPool);
    set({
      quarantines: s.quarantines.map((q) =>
        q.proposalId === proposalId ? { ...q, status: 'CLAIMED' as const } : q,
      ),
      rewardPool: round2(s.rewardPool - reward),
      defenseVault: round2(s.defenseVault + reward),
      events: pushEvent(s.events, {
        id: `evt_QUARANTINE_CLAIMED_${s.sandboxClock}_${proposalId}`,
        type: 'QUARANTINE_CLAIMED',
        at: s.sandboxClock,
        payload: { proposalId, reward, targetItem: rec.targetItem },
      }),
    });
    audit(s, {
      actor: 'USER',
      actionType: 'CLAIM_QUARANTINE_REWARD',
      permissionTier: 'T3',
      data_accessed: ['quarantines', 'rewardPool', 'defenseVault'],
      authorization_ref: `USER_CLICK_CLAIM_REWARD_${proposalId.slice(-4)}`,
      proposal_hash: null,
      status: 'EXECUTED',
    });
    console.info('[SANDBOX] claimQuarantineReward', proposalId, reward);
  },

  releaseQuarantine(proposalId) {
    const s = get();
    const rec = s.quarantines.find((q) => q.proposalId === proposalId);
    if (!rec || rec.status !== 'READY_TO_DECIDE') {
      console.info('[SANDBOX] release refused (not ready)', proposalId);
      return;
    }
    set({
      quarantines: s.quarantines.map((q) =>
        q.proposalId === proposalId ? { ...q, status: 'RELEASED' as const } : q,
      ),
      events: pushEvent(s.events, {
        id: `evt_QUARANTINE_RELEASED_${s.sandboxClock}_${proposalId}`,
        type: 'QUARANTINE_RELEASED',
        at: s.sandboxClock,
        payload: { proposalId, targetItem: rec.targetItem },
      }),
    });
    audit(s, {
      actor: 'USER',
      actionType: 'RELEASE_QUARANTINE',
      permissionTier: 'T3',
      data_accessed: ['quarantines'],
      authorization_ref: `USER_CLICK_PROCEED_PURCHASE_${proposalId.slice(-4)}`,
      proposal_hash: null,
      status: 'EXECUTED',
    });
    console.info('[SANDBOX] releaseQuarantine (no reward)', proposalId);
  },

  advanceClock(hours) {
    resolveClock(set, get, get().sandboxClock, get().sandboxClock + hours * 3_600_000, false);
  },

  jumpToMonthEnd() {
    const from = get().sandboxClock;
    resolveClock(set, get, from, endOfMonthMs(from), true);
  },
}));

/* ------------------------------------------------------------------ *
 * clock resolution (Section 5.1 order)
 * ------------------------------------------------------------------ */

type SetState = (partial: Partial<CtrlPayState>) => void;

export function resolveClock(
  set: SetState,
  get: () => CtrlPayState,
  from: number,
  to: number,
  forceRoast: boolean,
): void {
  if (to <= from) return;
  const s = get();
  const events: SandboxEvent[] = [];
  let defenseVault = s.defenseVault;
  let rewardPool = s.rewardPool;

  // 1) Quarantines: LOCKED_24H -> READY_TO_DECIDE at >= 24h.
  const quarantines = s.quarantines.map((q) => {
    if (q.status === 'LOCKED_24H' && q.lockedAt + QUARANTINE_MS <= to) {
      events.push({
        id: `evt_QUARANTINE_READY_${to}_${q.proposalId}`,
        type: 'QUARANTINE_READY',
        at: to,
        payload: { proposalId: q.proposalId, targetItem: q.targetItem, premiumReward: q.premiumReward },
      });
      return { ...q, status: 'READY_TO_DECIDE' as const };
    }
    return q;
  });

  // 2) Escrows: complete when durationDays elapsed.
  const escrows = s.escrows.map((e) => {
    if (e.status === 'ACTIVE' && e.startedAt + e.durationDays * DAY_MS <= to) {
      events.push({
        id: `evt_ESCROW_COMPLETED_${to}_${e.proposalId}`,
        type: 'ESCROW_COMPLETED',
        at: to,
        payload: { proposalId: e.proposalId, lockedCategories: e.lockedCategories },
      });
      return { ...e, status: 'COMPLETED' as const };
    }
    return e;
  });

  // 3) Sweeps: stage 2 settlement across the next billing date.
  const pendingSweeps = s.pendingSweeps.map((sw) => {
    if (sw.status !== 'PENDING_NEXT_BILLING_VERIFICATION') return sw;
    if (sw.nextBillingDate > to) return sw;

    const entry = SUBSCRIPTION_REGISTRY[sw.subscriptionId as SubscriptionId];
    const manualContract = entry !== undefined && entry.officialCancelDeepLink === null;
    if (manualContract) {
      // Honest NOT_VERIFIED path: a manually-processed contract shows no automatic change yet.
      events.push({
        id: `evt_SWEEP_NOT_VERIFIED_${to}_${sw.proposalId}`,
        type: 'SWEEP_NOT_VERIFIED',
        at: to,
        payload: { proposalId: sw.proposalId, subscriptionId: sw.subscriptionId, monthlySavings: sw.monthlySavings },
      });
      return { ...sw, status: 'NOT_VERIFIED' as const };
    }

    // Two-stage settlement: monthlySavings moves to the Vault, and the SAME amount
    // funds the rewardPool (Flaw 3 / Flaw 2). Vault growth never exceeds verified savings.
    defenseVault = round2(defenseVault + sw.monthlySavings);
    rewardPool = round2(rewardPool + sw.monthlySavings);
    events.push({
      id: `evt_SWEEP_VERIFIED_${to}_${sw.proposalId}`,
      type: 'SWEEP_VERIFIED',
      at: to,
      payload: { proposalId: sw.proposalId, subscriptionId: sw.subscriptionId, monthlySavings: sw.monthlySavings },
    });
    return { ...sw, status: 'VERIFIED' as const };
  });

  // 4) 12:00 PM Daily Spending Summary on each noon crossing.
  for (const noon of noonsBetween(from, to)) {
    const billTotal = unpaidFixedBillTotal(
      upcomingFixedBills(noon, SUBSCRIPTIONS, s.amortizeAnnualFees),
    );
    const allowance = computeDynamicDailyAllowance({
      currentBalance: s.currentBalance,
      unpaidFixedBills: billTotal,
      monthlySavingsGoal: MONTHLY_SAVINGS_GOAL,
      remainingDaysInMonth: remainingDaysInMonth(noon),
    });
    const spentToday =
      HISTORICAL_DAILY_SPENDING[(new Date(noon).getUTCDate() - 1) % HISTORICAL_DAILY_SPENDING.length];
    events.push({
      id: `evt_DAILY_SUMMARY_${noon}`,
      type: 'DAILY_SUMMARY',
      at: noon,
      payload: { date: new Date(noon).toISOString(), spentToday, allowance, units: toStudentUnits(spentToday) },
    });
  }

  // 5) Month-End Subscription Roast.
  if (forceRoast || new Date(from).getUTCMonth() !== new Date(to).getUTCMonth()) {
    const tags = s.zombieTags;
    const wasted = SUBSCRIPTIONS.filter((sub) => {
      const t = tags[sub.subscriptionId];
      return t === 'ZOMBIE' || t === 'SUSPECTED_ZOMBIE';
    }).reduce((sum, sub) => sum + sub.amountRM, 0);
    const wastedAnnual = round2(wasted * 12);
    events.push({
      id: `evt_MONTH_END_ROAST_${to}`,
      type: 'MONTH_END_ROAST',
      at: to,
      payload: {
        wastedMonthly: round2(wasted),
        wastedAnnual,
        units: toStudentUnits(round2(wasted)),
        unitsAnnual: toStudentUnits(wastedAnnual),
        tone: s.roastTone,
      },
    });
  }

  set({
    sandboxClock: to,
    quarantines,
    escrows,
    pendingSweeps,
    defenseVault,
    rewardPool,
    events: [...s.events, ...events].slice(-60),
  });

  audit(s, {
    at: to,
    actor: 'AGENT',
    actionType: 'ADVANCE_CLOCK',
    permissionTier: 'T0',
    data_accessed: ['sandboxClock'],
    authorization_ref: 'USER_SIMULATION_TOOLBAR',
    proposal_hash: null,
    status: 'EXECUTED',
  });
  console.info('[SANDBOX] advanceClock', from, '->', to, `${events.length} event(s)`);
}
