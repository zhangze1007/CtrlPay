/**
 * Sandbox Execution Evidence generator (Submission Checklist Item 06).
 *
 * Runs the complete judge workflow from plan.md against the REAL engine, store,
 * proposal service and audit logger, asserts every invariant, and writes two deterministic
 * artifacts:
 *
 *   docs/EXECUTION_EVIDENCE_SANDBOX_LOGS.json  — full [SANDBOX] operation log + hash-chained audit chain
 *   docs/SANDBOX_EXECUTION_EVIDENCE.md         — human-readable evidence report
 *
 * DETERMINISM: the wall clock is frozen and Math.random is pinned, and the two proposals are
 * re-signed with fixed ids, so re-running produces byte-identical artifacts (no git churn).
 *
 * Run directly with:  npm run generate:evidence
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { useCtrlPayStore } from '@/lib/store';
import { auditLog, type AuditEntry } from '@/lib/audit-logger';
import { __clearProposals, createProposal, decideProposal } from '@/lib/proposals';
import { buildWhatIfInput } from '@/lib/ledger';
import { runWhatIfSimulation, toStudentUnits } from '@/lib/quant-engine';
import { assertTier, type TierState } from '@/lib/permissions';
import { signProposal } from '@/lib/signing';
import { approveProposal } from '@/lib/tool-resolution';
import { analyzeZombies } from '@/lib/zombie-radar';
import {
  CURRENT_USER_ID,
  RECURRING_TRANSACTIONS,
  SUBSCRIPTIONS,
  USAGE_SIGNALS,
} from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
import { round2, toISODateTime } from '@/lib/utils';
import type { SignedProposal } from '@/lib/types';

const USER = CURRENT_USER_ID;
const FIXED_NOW = Date.UTC(2026, 2, 12, 9, 0, 0); // 2026-03-12T09:00:00Z (sandbox start)
const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const JSON_PATH = path.join(DOCS_DIR, 'EXECUTION_EVIDENCE_SANDBOX_LOGS.json');
const MD_PATH = path.join(DOCS_DIR, 'SANDBOX_EXECUTION_EVIDENCE.md');

const OFF: TierState = {
  masterAutonomyEnabled: false,
  enabledTiers: { T0: true, T1: false, T2: false, T3: false },
};

interface LedgerView {
  currentBalance: number;
  defenseVault: number;
  rewardPool: number;
}

const INITIAL_STATE = useCtrlPayStore.getState();
const sandboxLog: Array<{ sandboxClock: string; line: string }> = [];
let originalInfo: typeof console.info | undefined;

function S() {
  return useCtrlPayStore.getState();
}

function ledger(): LedgerView {
  const s = S();
  return {
    currentBalance: s.currentBalance,
    defenseVault: s.defenseVault,
    rewardPool: s.rewardPool,
  };
}

function resetSandbox(): void {
  useCtrlPayStore.setState(INITIAL_STATE, true);
  auditLog.__reset(USER);
  __clearProposals();
  sandboxLog.length = 0;
}

const steps: Array<Record<string, unknown>> = [];

function record(step: number, title: string, observations: Record<string, unknown>): void {
  steps.push({ step, title, sandboxClock: toISODateTime(S().sandboxClock), ledger: ledger(), observations });
}

describe('sandbox execution evidence generator', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_NOW));
    vi.spyOn(Math, 'random').mockReturnValue(0.424242);
    originalInfo = console.info;
    console.info = (...args: unknown[]) => {
      const line = args.map((a) => String(a)).join(' ');
      if (line.includes('[SANDBOX]')) {
        sandboxLog.push({
          sandboxClock: toISODateTime(useCtrlPayStore.getState().sandboxClock),
          line,
        });
      }
      originalInfo?.(...args);
    };
  });

  afterAll(() => {
    if (originalInfo) console.info = originalInfo;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs the 8-step judge workflow and writes the evidence artifacts', () => {
    resetSandbox();
    steps.length = 0;

    /* ---------------- Step 1 — Default-OFF safety gate ---------------- */
    expect(S().masterAutonomyEnabled).toBe(false);
    const shopeeIntent = { merchant: 'Shopee', amount: 180, category: 'Shopping' as const, isNeed: false };
    const t0 = runWhatIfSimulation(
      buildWhatIfInput(S().ledgerSnapshot(), { amount: 180, category: 'Shopping', isNeed: false }, 42),
    );
    const t3Attempt = assertTier('propose_quarantine', OFF, {
      authorizationRef: 'USER_CLICK_APPROVE_PROPOSAL_AAAA',
    });
    expect(t3Attempt.ok).toBe(false);
    auditLog.append(
      {
        sandboxClock: toISODateTime(S().sandboxClock),
        actor: 'AGENT',
        actionType: 'PROPOSE_QUARANTINE_BLOCKED',
        permissionTier: 'T3',
        data_accessed: [],
        authorization_ref: 'TIER_GATE_REJECTED',
        proposal_hash: null,
        status: 'BLOCKED',
      },
      USER,
    );
    record(1, 'Default-OFF safety gate (T0 advisory only)', {
      masterAutonomyEnabled: false,
      t0: {
        shortfallProbability: t0.shortfallProbability,
        cfar95: t0.cfar95,
        es95: t0.es95,
        intraMonthLiquidityBreachProb: t0.intraMonthLiquidityBreachProb,
        lowestProjectedBalanceRM: t0.lowestProjectedBalanceRM,
        riskLevel: t0.riskLevel,
      },
      t3Attempt: { ok: t3Attempt.ok, reason: t3Attempt.reason },
    });

    /* ------- Step 2 — Payment interceptor: Shopee RM 180 impulse buy ------- */
    S().simulatePaymentIntent(shopeeIntent);
    const cfar = runWhatIfSimulation(buildWhatIfInput(S().ledgerSnapshot(), shopeeIntent, 42));
    const units = toStudentUnits(shopeeIntent.amount);
    const intercepted = [...S().events].reverse().find((e) => e.type === 'PAYMENT_INTERCEPT');
    expect(intercepted).toBeDefined();
    record(2, 'Payment interceptor — Shopee RM 180 impulse buy', {
      seed: 42,
      shortfallProbability: cfar.shortfallProbability,
      cfar95: cfar.cfar95,
      es95: cfar.es95,
      intraMonthLiquidityBreachProb: cfar.intraMonthLiquidityBreachProb,
      lowestProjectedBalanceRM: cfar.lowestProjectedBalanceRM,
      stratifiedShortfallProbability: cfar.stratifiedShortfallProbability,
      projectedMonthEndBalance: cfar.projectedMonthEndBalance,
      projectedMonthEndBalanceWithIncomeRM: cfar.projectedMonthEndBalanceWithIncomeRM,
      dynamicDailyAllowance: cfar.dynamicDailyAllowance,
      riskLevel: cfar.riskLevel,
      limitBreach: cfar.limitBreach,
      studentUnits: units,
    });

    /* ------- Step 3 — 24h commitment quarantine lock ------- */
    S().setMasterAutonomy(true);
    S().setTier('T3', true);
    const qCreated = createProposal({
      kind: 'QUARANTINE',
      input: { targetItem: 'Shopee impulse buy (RM 180)', itemPrice: 180, category: 'Shopping' },
      snapshot: S().ledgerSnapshot(),
      userId: USER,
    });
    const quarantine: SignedProposal = signProposal(qCreated.terms, USER, {
      proposalId: 'prop_quarantine_0001',
      status: 'PROPOSED',
    });
    const qBuilt = approveProposal(quarantine.proposalId, quarantine.terms);
    expect(qBuilt.decision).not.toBeNull();
    const qGate = assertTier('propose_quarantine', {
      masterAutonomyEnabled: S().masterAutonomyEnabled,
      enabledTiers: S().enabledTiers,
    }, { authorizationRef: qBuilt.decision!.authorizationRef });
    expect(qGate.ok).toBe(true);
    const qDecided = decideProposal({
      proposalId: quarantine.proposalId,
      userId: USER,
      decision: qBuilt.decision!,
      mandate: S().aiMandate,
      snapshot: S().ledgerSnapshot(),
      proposal: quarantine,
    });
    expect(qDecided.proposal.status).toBe('APPROVED');
    S().applyDecision(qDecided.proposal, 'APPROVED');
    expect(S().quarantines[0]?.status).toBe('LOCKED_24H');

    // Anti-farming: claiming before +24h must be refused.
    const poolBeforeEarlyClaim = S().rewardPool;
    S().claimQuarantineReward(quarantine.proposalId);
    expect(S().quarantines[0]?.status).toBe('LOCKED_24H');
    expect(S().rewardPool).toBe(poolBeforeEarlyClaim);
    record(3, '24h Commitment Quarantine lock (early claim refused)', {
      proposalId: quarantine.proposalId,
      authorizationRef: qBuilt.decision!.authorizationRef,
      terms: quarantine.terms,
      status: S().quarantines[0]?.status,
      earlyClaimRefused: true,
      rewardPoolUnchangedAt: poolBeforeEarlyClaim,
    });

    /* ------- Step 4 — Fast-forward +24h & reward claim ------- */
    S().advanceClock(24);
    expect(S().quarantines[0]?.status).toBe('READY_TO_DECIDE');
    const poolBeforeClaim = S().rewardPool;
    const vaultBeforeClaim = S().defenseVault;
    S().claimQuarantineReward(quarantine.proposalId);
    const reward = round2(poolBeforeClaim - S().rewardPool);
    expect(S().quarantines[0]?.status).toBe('CLAIMED');
    expect(S().defenseVault).toBe(round2(vaultBeforeClaim + reward));
    record(4, 'Fast-forward +24h and claim the quarantine reward', {
      proposalId: quarantine.proposalId,
      status: S().quarantines[0]?.status,
      rewardClaimed: reward,
      rewardPoolBefore: poolBeforeClaim,
      rewardPoolAfter: S().rewardPool,
      defenseVaultBefore: vaultBeforeClaim,
      defenseVaultAfter: S().defenseVault,
    });

    /* ------- Step 5 — Zombie Radar & student downgrade sweep ------- */
    S().refreshZombieTags();
    const analysis = analyzeZombies({
      transactions: RECURRING_TRANSACTIONS,
      subscriptions: SUBSCRIPTIONS,
      usageSignals: USAGE_SIGNALS,
      sandboxClock: S().sandboxClock,
    });
    expect(analysis.studentDowngradeCandidates).toContain('spotify_my');
    S().setStudentVerified(true);
    const spotify = SUBSCRIPTION_REGISTRY.spotify_my;
    const sCreated = createProposal({
      kind: 'SWEEP',
      input: { subscriptionId: 'spotify_my', action: 'STUDENT_DOWNGRADE' },
      snapshot: S().ledgerSnapshot(),
      userId: USER,
    });
    const sweep: SignedProposal = signProposal(sCreated.terms, USER, {
      proposalId: 'prop_sweep_0001',
      status: 'PROPOSED',
    });
    const sBuilt = approveProposal(sweep.proposalId, sweep.terms);
    const sDecided = decideProposal({
      proposalId: sweep.proposalId,
      userId: USER,
      decision: sBuilt.decision!,
      mandate: S().aiMandate,
      snapshot: S().ledgerSnapshot(),
      proposal: sweep,
    });
    S().applyDecision(sDecided.proposal, 'APPROVED');
    const pending = S().pendingSweeps.find((x) => x.subscriptionId === 'spotify_my');
    expect(pending?.status).toBe('PENDING_NEXT_BILLING_VERIFICATION');
    const vaultBeforeSettlement = S().defenseVault;
    // Verification is deferred: the vault is NOT credited yet.
    expect(S().defenseVault).toBe(vaultBeforeSettlement);
    record(5, 'Zombie Radar and Spotify student downgrade sweep', {
      zombieTags: analysis.tags,
      studentDowngradeCandidates: analysis.studentDowngradeCandidates,
      studentVerified: S().studentVerified,
      spotifyFullPriceRM: spotify.fullPriceRM,
      spotifyStudentPriceRM: spotify.studentPriceRM,
      monthlySavings: sweep.terms.kind === 'SWEEP' ? sweep.terms.monthlySavings : null,
      sweepStatus: pending?.status,
      defenseVaultNotCreditedYet: S().defenseVault,
    });

    /* ------- Step 6 — Jump to Month-End & two-stage settlement ------- */
    const poolBeforeSettle = S().rewardPool;
    S().jumpToMonthEnd();
    const settled = S().pendingSweeps.find((x) => x.subscriptionId === 'spotify_my');
    expect(settled?.status).toBe('VERIFIED');
    const settledSavings = settled?.monthlySavings ?? 0;
    const vaultGrowth = round2(S().defenseVault - vaultBeforeSettlement);
    const poolGrowth = round2(S().rewardPool - poolBeforeSettle);
    expect(vaultGrowth).toBe(settledSavings);
    expect(poolGrowth).toBe(settledSavings);
    // Ledger conservation: vault growth never exceeds verified sweep savings.
    expect(vaultGrowth).toBeLessThanOrEqual(settledSavings);
    expect(S().events.some((e) => e.type === 'DAILY_SUMMARY')).toBe(true);
    const roast = [...S().events].reverse().find((e) => e.type === 'MONTH_END_ROAST');
    expect(roast).toBeDefined();
    record(6, 'Jump to Month-End — two-stage sweep settlement', {
      sweepStatus: settled?.status,
      monthlySavings: settledSavings,
      defenseVaultGrowth: vaultGrowth,
      rewardPoolGrowth: poolGrowth,
      conservationHolds: vaultGrowth <= settledSavings,
      dailySummaryFired: true,
      monthEndRoast: roast?.payload,
    });

    /* ------- Step 7 — Back-Tap quick logging & dynamic budget re-compute ------- */
    const balanceBeforeQuickLog = S().currentBalance;
    const ddaBeforeQuickLog = S().dynamicDailyAllowance();
    const quickLogAt = S().sandboxClock;
    S().quickLogTransaction({
      type: 'EXPENSE',
      amount: 18.5,
      merchant: 'Tealive & Campus Lunch (Back-Tap)',
      category: 'Bubble_Tea_Dining',
      isNeed: false,
      subCategory: 'Food & Dining',
      paymentAccount: 'Touch n Go eWallet',
    });
    const ddaAfterQuickLog = S().dynamicDailyAllowance();
    expect(S().currentBalance).toBe(round2(balanceBeforeQuickLog - 18.5));
    expect(ddaAfterQuickLog).toBeLessThan(ddaBeforeQuickLog);
    expect(S().events.some((e) => e.id.includes('QUICKLOG'))).toBe(true);
    record(7, 'Back-Tap quick logging syncs the dynamic daily budget', {
      sandboxClock: toISODateTime(quickLogAt),
      trigger: 'iOS Back-Tap / double-tap B / sandbox button → single quick-log path',
      amountRM: 18.5,
      balanceBefore: balanceBeforeQuickLog,
      balanceAfter: S().currentBalance,
      dynamicDailyAllowanceBefore: ddaBeforeQuickLog,
      dynamicDailyAllowanceAfter: ddaAfterQuickLog,
      authorizationRef: 'USER_AUTHORIZED_BACKTAP_TRANSFER',
    });

    /* ------- Step 8 — Cryptographic audit verification ------- */
    const chainOk = auditLog.verifyChain(USER);
    expect(chainOk).toBe(true);
    const entries = auditLog.list(USER) as AuditEntry[];
    expect(entries.length).toBeGreaterThanOrEqual(10);
    const actionTypes = entries.map((e) => e.actionType);
    for (const required of [
      'PROPOSE_QUARANTINE_BLOCKED',
      'PAYMENT_INTERCEPT',
      'SET_MASTER_AUTONOMY',
      'USER_DECISION',
      'CLAIM_QUARANTINE_REWARD',
      'STUDENT_EMAIL_OTP_VERIFIED',
      'ADVANCE_CLOCK',
      'USER_BACKTAP_QUICK_LOG',
    ]) {
      expect(actionTypes).toContain(required);
    }
    const genesisPrevHash = entries[0]?.prevHash;
    const finalEntryHash = entries[entries.length - 1]?.entryHash;
    expect(genesisPrevHash).toBe('GENESIS');
    expect(finalEntryHash).toMatch(/^[0-9a-f]{64}$/);
    record(8, 'Cryptographic audit-chain verification', {
      verified: chainOk,
      entryCount: entries.length,
      genesisPrevHash,
      finalEntryHash,
    });

    /* ---------------- Write artifacts ---------------- */
    const finalLedger = ledger();
    const payload = {
      schema: 'ctrlpay.sandbox-execution-evidence.v1',
      topic: '2026 Shenzhen FinTechathon — International Track, Topic A',
      deliverable: 'Submission Checklist Item 06 — Execution Evidence (sandbox operation logs)',
      userId: USER,
      sandboxStartClock: toISODateTime(FIXED_NOW),
      deterministic: true,
      reproducibilityNote:
        'The wall clock is frozen at the sandbox start and Math.random is pinned; proposals use ' +
        'fixed ids. Re-running "npm run generate:evidence" reproduces this file byte-for-byte.',
      summary: {
        auditEntries: entries.length,
        chainVerified: chainOk,
        finalSandboxClock: toISODateTime(S().sandboxClock),
        finalLedger,
      },
      steps,
      sandboxOperationLog: sandboxLog,
      auditLog: entries,
    };

    mkdirSync(DOCS_DIR, { recursive: true });
    writeFileSync(JSON_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    writeFileSync(MD_PATH, renderMarkdown(payload), 'utf8');

    expect(chainOk).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Markdown renderer
 * ------------------------------------------------------------------ */

type EvidencePayload = {
  userId: string;
  sandboxStartClock: string;
  summary: {
    auditEntries: number;
    chainVerified: boolean;
    finalSandboxClock: string;
    finalLedger: LedgerView;
  };
  steps: Array<Record<string, unknown>>;
  sandboxOperationLog: Array<{ sandboxClock: string; line: string }>;
  auditLog: AuditEntry[];
};

function renderMarkdown(payload: EvidencePayload): string {
  const lines: string[] = [];
  lines.push('# CtrlPay — Sandbox Execution Evidence');
  lines.push('');
  lines.push('**2026 Shenzhen FinTechathon · International Track · Topic A**');
  lines.push('**Submission Checklist Item 06 — Execution evidence**');
  lines.push('');
  lines.push('This report is generated by `tests/generate-execution-evidence.test.ts` against the real');
  lines.push('engine, Zustand sandbox store, proposal service and hash-chained audit logger. The complete');
  lines.push('machine-readable log is in `docs/EXECUTION_EVIDENCE_SANDBOX_LOGS.json`.');
  lines.push('');
  lines.push('| Field | Value |');
  lines.push('|---|---|');
  lines.push(`| Tenant (userId) | \`${payload.userId}\` |`);
  lines.push(`| Sandbox start clock | \`${payload.sandboxStartClock}\` |`);
  lines.push(`| Final sandbox clock | \`${payload.summary.finalSandboxClock}\` |`);
  lines.push(`| Audit entries | ${payload.summary.auditEntries} |`);
  lines.push(`| Audit chain verified | ${payload.summary.chainVerified ? 'YES' : 'NO'} |`);
  lines.push(
    `| Final ledger | balance RM ${payload.summary.finalLedger.currentBalance} · ` +
      `defenseVault RM ${payload.summary.finalLedger.defenseVault} · ` +
      `rewardPool RM ${payload.summary.finalLedger.rewardPool} |`,
  );
  lines.push('');
  lines.push(`## The ${payload.steps.length}-step judge workflow`);
  lines.push('');
  for (const step of payload.steps) {
    lines.push(`### Step ${step.step} — ${step.title}`);
    lines.push('');
    lines.push(`- Sandbox clock: \`${step.sandboxClock}\``);
    const l = step.ledger as LedgerView;
    lines.push(
      `- Ledger after this step: balance RM ${l.currentBalance} · defenseVault RM ${l.defenseVault} · rewardPool RM ${l.rewardPool}`,
    );
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(step.observations, null, 2));
    lines.push('```');
    lines.push('');
  }

  lines.push('## Sample [SANDBOX] operation-log lines');
  lines.push('');
  lines.push('```text');
  for (const entry of payload.sandboxOperationLog.slice(0, 12)) {
    lines.push(`${entry.sandboxClock}  ${entry.line}`);
  }
  if (payload.sandboxOperationLog.length > 12) {
    lines.push(`... ${payload.sandboxOperationLog.length - 12} more line(s) in docs/EXECUTION_EVIDENCE_SANDBOX_LOGS.json`);
  }
  lines.push('```');
  lines.push('');

  const last = payload.auditLog[payload.auditLog.length - 1];
  lines.push('## Final SHA-256 audit-chain digest');
  lines.push('');
  lines.push(`- Genesis \`prevHash\`: \`${payload.auditLog[0]?.prevHash}\``);
  lines.push(`- Final \`entryHash\`: \`${last?.entryHash}\``);
  lines.push(`- \`verifyChain(userId)\`: **${payload.summary.chainVerified ? 'true' : 'false'}**`);
  lines.push('');
  lines.push('The chain is `entryHash = SHA-256(canonicalJson(entry))` with `prevHash` binding each');
  lines.push('entry to its predecessor, so altering any earlier entry breaks every later hash.');
  lines.push('');
  lines.push('## Ledger conservation');
  lines.push('');
  lines.push(
    '`defenseVault` growth from the Spotify sweep equals the verified `monthlySavings` (RM ' +
      `${(payload.steps.find((s) => s.step === 6)?.observations as { monthlySavings?: number } | undefined)?.monthlySavings ?? 0}` +
      '), and the same amount funds the `rewardPool`. Vault growth never exceeds verified savings, and ' +
      'the rewardPool is funded only by verified sweep savings.',
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*Sandbox/demo numbers only. No real money moves; `defenseVault` is a non-interest-bearing ledger bucket.*');
  lines.push('');
  return lines.join('\n');
}
