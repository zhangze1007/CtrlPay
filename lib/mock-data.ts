/**
 * Sandbox DEMO_CONFIG data.
 *
 * EVERYTHING in this file is sandbox configuration, not real market data:
 * balances, limits, prices, transaction history and mock receipts. The sandbox
 * ledger lives in the browser and is treated as user-supplied data by the server.
 */
import { mulberry32 } from './prng';
import type {
  FixedBill,
  MockReceipt,
  Subscription,
  Transaction,
  UsageSignal,
} from './domain';
import type { UserSpendingLimit, AiMandate } from './types';

/* ------------------------------------------------------------------ *
 * Clock & identity
 * ------------------------------------------------------------------ */

/** Sandbox clock start. "Today is the 12th" in the demo script. */
export const SANDBOX_START_MS = Date.UTC(2026, 2, 12, 9, 0, 0); // 2026-03-12T09:00:00Z

/** Sandbox session user id. Production: taken from the authenticated session, never the LLM. */
export const CURRENT_USER_ID = 'student_usm_001';

export const PROFILE = {
  fullName: 'Jerome Bell',
  memberId: 'AF-88213',
  studentEmail: 'jerome.bell@fintech.io',
  avatar: '/avatar.jpg',
} as const;

/* ------------------------------------------------------------------ *
 * Balances & budgets (DEMO_CONFIG)
 * ------------------------------------------------------------------ */

export const INITIAL_BALANCE = 7540.0;
export const MONTHLY_SAVINGS_GOAL = 300.0;
export const INITIAL_DEFENSE_VAULT = 0.0;

/**
 * DEMO_CONFIG: seeded as if a previous subscription sweep had already been
 * verified in this sandbox ledger. The reward pool is ONLY ever funded by
 * verified sweep savings (see Section 4.1, Flaw 3) — it is never printed.
 */
export const INITIAL_REWARD_POOL = 24.0;

export const INITIAL_USER_LIMITS: UserSpendingLimit = {
  weeklyPayLimit: 150,
  monthlyPayLimit: 600,
  weeklyTransferLimit: 300,
  monthlyTransferLimit: 1000,
};

export const INITIAL_AI_MANDATE: AiMandate = {
  maxLockAmountRM: 200,
  maxLockDurationDays: 14,
};

/** Demo-config counters used by the CFaR simulation inputs. */
export const SPENT_THIS_WEEK = 62.0;
export const SPENT_THIS_MONTH = 480.0;

/** Read-only Gmail receipt consent defaults to OFF (data minimization). */
export const GMAIL_CONSENT_DEFAULT = false;

/* ------------------------------------------------------------------ *
 * Historical daily variable spending (45 days)
 * ------------------------------------------------------------------ */

/**
 * 45 days of deterministic daily variable spend (RM/day, excluding fixed bills).
 * Seeded so the same CFaR output reproduces on every judge's machine.
 */
export function generateHistoricalDailySpending(seed = 20260312, days = 45): number[] {
  const rng = mulberry32(seed);
  const out: number[] = [];
  for (let i = 0; i < days; i++) {
    const r = rng();
    let value: number;
    if (r < 0.25) {
      // light day (campus cafeteria / basic transport)
      value = 4 + rng() * 8; // 4 - 12
    } else if (r < 0.75) {
      // normal day
      value = 12 + rng() * 16; // 12 - 28
    } else {
      // heavy day (delivery / bubble tea / shopping)
      value = 28 + rng() * 34; // 28 - 62
    }
    out.push(Math.round(value * 100) / 100);
  }
  return out;
}

export const HISTORICAL_DAILY_SPENDING: number[] = generateHistoricalDailySpending();

/* ------------------------------------------------------------------ *
 * Subscriptions (registry-backed)
 * ------------------------------------------------------------------ */

export const SUBSCRIPTIONS: Subscription[] = [
  // Next billing dates fall relative to the 2026-03-12 sandbox clock.
  { subscriptionId: 'spotify_my', amountRM: 15.9, billingCycle: 'MONTHLY', nextBillingDate: '2026-03-18' },
  { subscriptionId: 'youtube_my', amountRM: 17.9, billingCycle: 'MONTHLY', nextBillingDate: '2026-03-14' },
  { subscriptionId: 'netflix_my', amountRM: 55.0, billingCycle: 'MONTHLY', nextBillingDate: '2026-03-15' },
  { subscriptionId: 'icloud_my', amountRM: 4.9, billingCycle: 'MONTHLY', nextBillingDate: '2026-04-01' },
  { subscriptionId: 'disney_plus_my', amountRM: 54.9, billingCycle: 'MONTHLY', nextBillingDate: '2026-03-20' },
  { subscriptionId: 'anytime_fitness_my', amountRM: 180.0, billingCycle: 'ANNUAL', nextBillingDate: '2026-04-05' },
];

/** One annual licence used to demo the Sinking Fund amortization (RM 200/year -> RM 16.67/mo). */
export const ANNUAL_LICENCE = {
  label: 'JetBrains Student Licence (annual)',
  amountRM: 200.0,
  nextBillingDate: '2026-11-01',
} as const;

/* ------------------------------------------------------------------ *
 * Fixed bills (utilities / rent still due this month)
 * ------------------------------------------------------------------ */

export const FIXED_BILLS: FixedBill[] = [
  { id: 'rent', label: 'Room rent', amountRM: 350, dueDay: 1, paid: true },
  { id: 'wifi', label: 'Room Wi-Fi', amountRM: 60, dueDay: 5, paid: true },
  { id: 'electric', label: 'Electricity', amountRM: 45, dueDay: 20, paid: false },
  { id: 'phone', label: 'Phone plan', amountRM: 30, dueDay: 25, paid: false },
];

/* ------------------------------------------------------------------ *
 * Mock bank-statement recurring transactions (last 3 occurrences each)
 * ------------------------------------------------------------------ */

/** Monthly merchant charges for the previous three billing cycles. */
export const RECURRING_TRANSACTIONS: Transaction[] = [
  // Netflix — RM 55 on the 15th
  { id: 'txn_netflix_1', date: '2025-12-15', merchant: 'NETFLIX.COM', amountRM: 55.0, category: 'Entertainment' },
  { id: 'txn_netflix_2', date: '2026-01-15', merchant: 'NETFLIX.COM', amountRM: 55.0, category: 'Entertainment' },
  { id: 'txn_netflix_3', date: '2026-02-15', merchant: 'NETFLIX.COM', amountRM: 55.0, category: 'Entertainment' },
  // Spotify — RM 15.90 on the 18th
  { id: 'txn_spotify_1', date: '2025-12-18', merchant: 'SPOTIFY PTE LTD', amountRM: 15.9, category: 'Entertainment' },
  { id: 'txn_spotify_2', date: '2026-01-18', merchant: 'SPOTIFY PTE LTD', amountRM: 15.9, category: 'Entertainment' },
  { id: 'txn_spotify_3', date: '2026-02-18', merchant: 'SPOTIFY PTE LTD', amountRM: 15.9, category: 'Entertainment' },
  // YouTube Premium — RM 17.90 on the 14th
  { id: 'txn_youtube_1', date: '2025-12-14', merchant: 'GOOGLE *YOUTUBE', amountRM: 17.9, category: 'Entertainment' },
  { id: 'txn_youtube_2', date: '2026-01-14', merchant: 'GOOGLE *YOUTUBE', amountRM: 17.9, category: 'Entertainment' },
  { id: 'txn_youtube_3', date: '2026-02-14', merchant: 'GOOGLE *YOUTUBE', amountRM: 17.9, category: 'Entertainment' },
  // Disney+ — RM 54.90 on the 20th
  { id: 'txn_disney_1', date: '2025-12-20', merchant: 'DISNEY PLUS', amountRM: 54.9, category: 'Entertainment' },
  { id: 'txn_disney_2', date: '2026-01-20', merchant: 'DISNEY PLUS', amountRM: 54.9, category: 'Entertainment' },
  { id: 'txn_disney_3', date: '2026-02-20', merchant: 'DISNEY PLUS', amountRM: 54.9, category: 'Entertainment' },
  // iCloud+ — RM 4.90 on the 1st
  { id: 'txn_icloud_1', date: '2026-01-01', merchant: 'APPLE.COM/BILL ICLOUD', amountRM: 4.9, category: 'Bills_Utilities' },
  { id: 'txn_icloud_2', date: '2026-02-01', merchant: 'APPLE.COM/BILL ICLOUD', amountRM: 4.9, category: 'Bills_Utilities' },
  { id: 'txn_icloud_3', date: '2026-03-01', merchant: 'APPLE.COM/BILL ICLOUD', amountRM: 4.9, category: 'Bills_Utilities' },
  // Anytime Fitness — RM 180 annually on the 5th (last charge only; annual cycle)
  { id: 'txn_fitness_1', date: '2025-04-05', merchant: 'ANYTIME FITNESS', amountRM: 180.0, category: 'Bills_Utilities' },
];

/* ------------------------------------------------------------------ *
 * Mock Gmail structured receipt records (read-only, opt-in)
 * ------------------------------------------------------------------ */

export const MOCK_RECEIPTS: MockReceipt[] = [
  { id: 'mail_1', merchant: 'NETFLIX.COM', amountRM: 55.0, billingDate: '2026-02-15', cycle: 'MONTHLY' },
  { id: 'mail_2', merchant: 'SPOTIFY PTE LTD', amountRM: 15.9, billingDate: '2026-02-18', cycle: 'MONTHLY' },
  { id: 'mail_3', merchant: 'DISNEY PLUS', amountRM: 54.9, billingDate: '2026-02-20', cycle: 'MONTHLY' },
];

/* ------------------------------------------------------------------ *
 * Usage telemetry (mock). null = no telemetry available.
 * ------------------------------------------------------------------ */

export const USAGE_SIGNALS: UsageSignal[] = [
  { subscriptionId: 'spotify_my', lastUsedDaysAgo: 1 },
  { subscriptionId: 'youtube_my', lastUsedDaysAgo: 2 },
  { subscriptionId: 'netflix_my', lastUsedDaysAgo: 42 }, // no use in ~6 weeks -> zombie
  { subscriptionId: 'icloud_my', lastUsedDaysAgo: 0 },
  { subscriptionId: 'disney_plus_my', lastUsedDaysAgo: null }, // no telemetry -> suspected zombie
  { subscriptionId: 'anytime_fitness_my', lastUsedDaysAgo: 9 },
];

/* ------------------------------------------------------------------ *
 * Payment interceptor demo events
 * ------------------------------------------------------------------ */

export const PAYMENT_EVENTS = [
  { id: 'grabfood_32', merchant: 'GrabFood', amount: 32.0, category: 'Food_Delivery_Grab_Foodpanda' as const, isNeed: false },
  { id: 'shopee_180', merchant: 'Shopee', amount: 180.0, category: 'Shopping' as const, isNeed: false },
];
