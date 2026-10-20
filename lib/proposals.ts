/**
 * Proposal service — SERVER-ONLY.
 *
 * The server (never the LLM) computes and signs every contract figure:
 *   premiumReward, monthlySavings, dailyBudgetReduction, shortfallProbability ...
 * then returns a SIGNED PROPOSAL: { proposalId, terms, integrityHash, expiresAt }.
 * The user approves / modifies / declines THAT exact proposal.
 */
import { signProposal, verifyProposal } from './signing';
import {
  calculateQuarantineReward,
  calculateSubscriptionMetrics,
  computeDynamicDailyAllowance,
  routeIntervention,
  runWhatIfSimulation,
  unpaidFixedBillTotal,
  validateEscrowFloor,
} from './quant-engine';
import { SUBSCRIPTION_REGISTRY } from './subscription-registry';
import { buildWhatIfInput, upcomingFixedBills, type LedgerSnapshot } from './ledger';
import {
  EscrowTermsSchema,
  QuarantineTermsSchema,
  SpendCategorySchema,
  SweepTermsSchema,
  WantsCategorySchema,
  type CardDecision,
  type ProposalTerms,
  type SignedProposal,
} from './types';
import { round2, remainingDaysInMonth } from './utils';

export class ProposalError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(`${code}: ${message}`);
    this.code = code;
    this.status = status;
    this.name = 'ProposalError';
  }
}

export type ProposalKind = 'QUARANTINE' | 'ESCROW' | 'SWEEP';

export interface CreateProposalArgs {
  kind: ProposalKind;
  input: Record<string, unknown>;
  snapshot: LedgerSnapshot;
  userId: string;
}

/* ------------------------------------------------------------------ *
 * In-memory proposal registry (sandbox). Production: a tenant-scoped DB.
 * ------------------------------------------------------------------ */

const proposals = new Map<string, SignedProposal>();

export function storeProposal(p: SignedProposal): void {
  proposals.set(p.proposalId, p);
}

export function getStoredProposal(proposalId: string): SignedProposal | undefined {
  return proposals.get(proposalId);
}

export function __clearProposals(): void {
  proposals.clear();
}

/* ------------------------------------------------------------------ *
 * Creation
 * ------------------------------------------------------------------ */

export function createProposal({ kind, input, snapshot, userId }: CreateProposalArgs): SignedProposal {
  let terms: ProposalTerms;

  if (kind === 'QUARANTINE') {
    const targetItem = String(input.targetItem ?? '').trim();
    const itemPrice = Number(input.itemPrice);
    // API-BOUNDARY INVARIANT: NEEDS can never be quarantined. The LLM tool schema
    // already restricts the category, but a direct POST must be rejected here too.
    const categoryParse = WantsCategorySchema.safeParse(input.category ?? 'Shopping');
    if (!categoryParse.success) {
      throw new ProposalError(
        'NEEDS_NOT_QUARANTINABLE',
        'Quarantine is available only for WANT categories. NEEDS purchases can never be quarantined.',
        400,
      );
    }
    const category = categoryParse.data;
    if (!targetItem || targetItem.length > 80 || !Number.isFinite(itemPrice) || itemPrice <= 0) {
      throw new ProposalError('INVALID_INPUT', 'targetItem (1-80 chars) and positive itemPrice are required', 400);
    }
    if (itemPrice > snapshot.aiMandate.maxLockAmountRM) {
      throw new ProposalError(
        'EXCEEDS_AI_MANDATE',
        `itemPrice RM ${itemPrice} exceeds the AI Mandate Limit of RM ${snapshot.aiMandate.maxLockAmountRM}`,
      );
    }

    const result = runWhatIfSimulation(
      buildWhatIfInput(snapshot, {
        amount: itemPrice,
        category,
        isNeed: false,
      }),
    );
    const gate = routeIntervention({ result, isNeed: false });
    if (gate.action !== 'QUARANTINE') {
      throw new ProposalError(
        'RISK_TOO_LOW',
        `No contract is warranted (riskLevel=${result.riskLevel}, limitBreach=${JSON.stringify(result.limitBreach)}). Use the non-intervention path.`,
      );
    }

    terms = QuarantineTermsSchema.parse({
      kind: 'QUARANTINE',
      targetItem,
      itemPrice: round2(itemPrice),
      premiumReward: calculateQuarantineReward(itemPrice, snapshot.rewardPool),
      quarantineHours: 24,
      shortfallProbability: result.shortfallProbability,
      cfar95: result.cfar95,
      riskLevel: result.riskLevel,
    });
  } else if (kind === 'ESCROW') {
    const targetItem = String(input.targetItem ?? '').trim();
    const itemPrice = Number(input.itemPrice);
    const lockedCategories = input.lockedCategories as string[];
    const durationDays = Number(input.durationDays);
    if (
      !targetItem ||
      targetItem.length > 80 ||
      !Number.isFinite(itemPrice) ||
      itemPrice <= 0 ||
      !Array.isArray(lockedCategories) ||
      lockedCategories.length < 1 ||
      lockedCategories.length > 4 ||
      !lockedCategories.every((c) => SpendCategorySchema.safeParse(c).success) ||
      !Number.isInteger(durationDays)
    ) {
      throw new ProposalError(
        'INVALID_INPUT',
        'targetItem, positive itemPrice, 1-4 known lockedCategories and integer durationDays are required',
        400,
      );
    }

    const bills = upcomingFixedBills(snapshot.sandboxClock, snapshot.subscriptions, snapshot.amortizeAnnualFees);
    const dda = computeDynamicDailyAllowance({
      currentBalance: snapshot.currentBalance,
      unpaidFixedBills: unpaidFixedBillTotal(bills),
      monthlySavingsGoal: snapshot.monthlySavingsGoal,
      remainingDaysInMonth: remainingDaysInMonth(snapshot.sandboxClock),
    });

    // Probe for the safe ceiling, then choose a reduction that does not exceed it.
    const probe = validateEscrowFloor({
      lockedCategories: lockedCategories as never,
      dailyBudgetReduction: 1,
      dynamicDailyAllowance: dda,
      durationDays,
      mandate: snapshot.aiMandate,
    });
    if (probe.maxAllowedReduction <= 0) {
      throw new ProposalError(
        'ESCROW_NOT_OFFERED',
        'Daily allowance is too close to the survival floor to offer an Escrow.',
      );
    }
    const requested = Math.min(probe.maxAllowedReduction, round2(itemPrice / Math.max(1, durationDays)));
    const dailyBudgetReduction = Math.max(0.01, round2(requested));

    const check = validateEscrowFloor({
      lockedCategories: lockedCategories as never,
      dailyBudgetReduction,
      dynamicDailyAllowance: dda,
      durationDays,
      mandate: snapshot.aiMandate,
    });
    if (!check.ok) {
      throw new ProposalError('ESCROW_FLOOR_VIOLATION', check.reasons.join(','));
    }

    const result = runWhatIfSimulation(
      buildWhatIfInput(snapshot, {
        amount: itemPrice,
        category: (lockedCategories[0] ?? 'Shopping') as never,
        isNeed: false,
      }),
    );

    terms = EscrowTermsSchema.parse({
      kind: 'ESCROW',
      targetItem,
      itemPrice: round2(itemPrice),
      lockedCategories: lockedCategories.slice(0, 4),
      dailyBudgetReduction,
      durationDays,
      maxAllowedReduction: check.maxAllowedReduction,
      shortfallProbability: result.shortfallProbability,
      cfar95: result.cfar95,
    });
  } else {
    const subscriptionId = String(input.subscriptionId ?? '');
    const action = input.action as 'STUDENT_DOWNGRADE' | 'CANCEL';
    const entry = SUBSCRIPTION_REGISTRY[subscriptionId as keyof typeof SUBSCRIPTION_REGISTRY];
    if (!entry) throw new ProposalError('UNKNOWN_SUBSCRIPTION', `No registry entry for ${subscriptionId}`);

    if (action === 'STUDENT_DOWNGRADE' && entry.studentPriceRM === null) {
      throw new ProposalError('NO_STUDENT_PLAN', `${entry.merchantName} has no student plan; use CANCEL.`);
    }
    const monthlySavings =
      action === 'STUDENT_DOWNGRADE'
        ? round2(entry.fullPriceRM - (entry.studentPriceRM ?? 0))
        : round2(entry.fullPriceRM);
    if (monthlySavings <= 0) {
      throw new ProposalError('NO_SAVINGS', 'This action produces no monthly savings.');
    }

    terms = SweepTermsSchema.parse({
      kind: 'SWEEP',
      subscriptionId,
      action,
      merchantName: entry.merchantName,
      monthlySavings,
      annualSavings: round2(monthlySavings * 12),
      requiresStudentEmailOTP: entry.requiresStudentEmailOTP,
      deepLinkAvailable: entry.officialCancelDeepLink !== null,
      mailtoAvailable: entry.mailtoTemplate !== null,
    });
  }

  const proposal = signProposal(terms, userId, { status: 'PROPOSED' });
  storeProposal(proposal);
  return proposal;
}

/* ------------------------------------------------------------------ *
 * Decision
 * ------------------------------------------------------------------ */

export interface DecideArgs {
  proposalId: string;
  userId: string;
  decision: CardDecision;
  mandate: LedgerSnapshot['aiMandate'];
  snapshot: LedgerSnapshot;
  /**
   * Serverless fallback: the client echoes the full SignedProposal it is deciding on.
   * Used only when the in-memory registry is empty (cold start / different instance).
   * It is ALWAYS cryptographically re-verified before any state change.
   */
  proposal?: SignedProposal;
}

export function decideProposal({
  proposalId,
  userId,
  decision,
  mandate,
  snapshot,
  proposal,
}: DecideArgs): {
  proposal: SignedProposal;
  authorizationRef: string;
} {
  // Prefer the in-memory (authoritative) copy; fall back to the client-supplied signed
  // proposal so stateless/serverless deployments do not 404 on a cold start.
  const stored = getStoredProposal(proposalId) ?? proposal;
  if (!stored) throw new ProposalError('PROPOSAL_NOT_FOUND', `Unknown proposal ${proposalId}`, 404);

  if (stored.proposalId !== proposalId) {
    throw new ProposalError(
      'PROPOSAL_ID_MISMATCH',
      'The supplied proposal does not match the proposal id being decided',
      400,
    );
  }

  // Tenant isolation: proposals are keyed by user.
  if (stored.userId !== userId) {
    throw new ProposalError('FORBIDDEN', 'This proposal belongs to another tenant', 403);
  }

  // Re-verify the signature; a tampered proposal (any terms byte changed) is rejected.
  if (!verifyProposal(stored, userId)) {
    throw new ProposalError('INTEGRITY_HASH_MISMATCH', 'Proposal signature failed verification', 409);
  }

  // Only a pending proposal may be decided (no replay of an already-settled proposal).
  if (stored.status !== 'PROPOSED') {
    throw new ProposalError('PROPOSAL_NOT_PENDING', `Proposal is already ${stored.status}`, 409);
  }

  // Expiry uses the REAL wall clock; the sandbox clock is simulated and never expires a proposal.
  if (Number.isFinite(Date.parse(stored.expiresAt)) && Date.parse(stored.expiresAt) < Date.now()) {
    throw new ProposalError('PROPOSAL_EXPIRED', 'This proposal has expired. Please re-request it.', 410);
  }

  if (decision.status === 'DECLINED') {
    const updated: SignedProposal = { ...stored, status: 'DECLINED' };
    storeProposal(updated);
    return { proposal: updated, authorizationRef: `USER_DECLINE_PROPOSAL_${proposalId.slice(-4)}` };
  }

  const authorizationRef = `USER_CLICK_APPROVE_PROPOSAL_${proposalId.slice(-4)}`;

  if (decision.status === 'MODIFIED') {
    if (stored.terms.kind !== 'ESCROW') {
      throw new ProposalError('MODIFY_NOT_SUPPORTED', 'Only Escrow terms can be modified.');
    }
    const durationDays = decision.newTerms.durationDays ?? stored.terms.durationDays;
    const requestedReduction =
      decision.newTerms.dailyBudgetReduction ?? stored.terms.dailyBudgetReduction;

    const bills = upcomingFixedBills(snapshot.sandboxClock, snapshot.subscriptions, snapshot.amortizeAnnualFees);
    const dda = computeDynamicDailyAllowance({
      currentBalance: snapshot.currentBalance,
      unpaidFixedBills: unpaidFixedBillTotal(bills),
      monthlySavingsGoal: snapshot.monthlySavingsGoal,
      remainingDaysInMonth: remainingDaysInMonth(snapshot.sandboxClock),
    });
    const check = validateEscrowFloor({
      lockedCategories: stored.terms.lockedCategories as never,
      dailyBudgetReduction: requestedReduction,
      dynamicDailyAllowance: dda,
      durationDays,
      mandate,
    });
    if (!check.ok) {
      throw new ProposalError('ESCROW_FLOOR_VIOLATION', check.reasons.join(','));
    }
    const newTerms = EscrowTermsSchema.parse({
      ...stored.terms,
      dailyBudgetReduction: requestedReduction,
      durationDays,
      maxAllowedReduction: check.maxAllowedReduction,
    });
    const reSigned = signProposal(newTerms, userId, {
      proposalId: stored.proposalId,
      expiresAt: stored.expiresAt,
      status: 'MODIFIED',
    });
    storeProposal(reSigned);
    return { proposal: reSigned, authorizationRef };
  }

  // ---- APPROVED: re-enforce the AI Mandate / survival floor at decision time. ----
  if (stored.terms.kind === 'QUARANTINE') {
    if (stored.terms.itemPrice > mandate.maxLockAmountRM) {
      throw new ProposalError(
        'EXCEEDS_AI_MANDATE',
        `itemPrice RM ${stored.terms.itemPrice} exceeds the AI Mandate Limit of RM ${mandate.maxLockAmountRM}`,
      );
    }
    if (mandate.maxLockDurationDays < Math.ceil(stored.terms.quarantineHours / 24)) {
      throw new ProposalError(
        'EXCEEDS_AI_MANDATE',
        `Quarantine of ${stored.terms.quarantineHours}h exceeds the AI Mandate duration of ${mandate.maxLockDurationDays} day(s)`,
      );
    }
  } else if (stored.terms.kind === 'ESCROW') {
    const bills = upcomingFixedBills(snapshot.sandboxClock, snapshot.subscriptions, snapshot.amortizeAnnualFees);
    const dda = computeDynamicDailyAllowance({
      currentBalance: snapshot.currentBalance,
      unpaidFixedBills: unpaidFixedBillTotal(bills),
      monthlySavingsGoal: snapshot.monthlySavingsGoal,
      remainingDaysInMonth: remainingDaysInMonth(snapshot.sandboxClock),
    });
    const check = validateEscrowFloor({
      lockedCategories: stored.terms.lockedCategories as never,
      dailyBudgetReduction: stored.terms.dailyBudgetReduction,
      dynamicDailyAllowance: dda,
      durationDays: stored.terms.durationDays,
      mandate,
    });
    if (!check.ok) {
      throw new ProposalError('ESCROW_FLOOR_VIOLATION', check.reasons.join(','));
    }
  }

  const approved: SignedProposal = { ...stored, status: 'APPROVED' };
  storeProposal(approved);
  return { proposal: approved, authorizationRef };
}
