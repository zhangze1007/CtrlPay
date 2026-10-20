import { z } from 'zod';
import { SubscriptionIdSchema } from './subscription-registry';

/* ------------------------------------------------------------------ *
 * Category enums
 * ------------------------------------------------------------------ */

export const NeedsCategorySchema = z.enum([
  'Bills_Utilities',
  'Campus_Cafeteria_Basic',
  'Medical',
  'Transport_Essential',
]);

export const WantsCategorySchema = z.enum([
  'Food_Delivery_Grab_Foodpanda',
  'Entertainment',
  'Bubble_Tea_Dining',
  'Shopping',
]);

export const SpendCategorySchema = z.enum([
  'Bills_Utilities',
  'Campus_Cafeteria_Basic',
  'Medical',
  'Transport_Essential',
  'Food_Delivery_Grab_Foodpanda',
  'Entertainment',
  'Bubble_Tea_Dining',
  'Shopping',
]);

/* ------------------------------------------------------------------ *
 * LLM TOOL INPUT SCHEMAS
 * identifiers & intent only; NO financial contract numbers.
 * No `.default()` anywhere (cross-provider JSON Schema compatibility).
 * ------------------------------------------------------------------ */

export const RunWhatIfInputSchema = z
  .object({
    targetItem: z.string().min(1).max(80),
    itemPrice: z.number().positive().max(10000), // user-stated price of the purchase being considered
    category: SpendCategorySchema,
  })
  .strict();

export const ProposeQuarantineInputSchema = z
  .object({
    targetItem: z.string().min(1).max(80),
    itemPrice: z.number().positive().max(10000),
    category: WantsCategorySchema, // NEEDS can never be quarantined
  })
  .strict();

export const ProposeEscrowInputSchema = z
  .object({
    targetItem: z.string().min(1).max(80),
    itemPrice: z.number().positive().max(10000),
    lockedCategories: z.array(WantsCategorySchema).min(1).max(4), // NEEDS excluded by type
    durationDays: z.number().int().min(1).max(30),
  })
  .strict();
// dailyBudgetReduction is NOT an input: the server computes it.

export const ProposeSweepInputSchema = z
  .object({
    subscriptionId: SubscriptionIdSchema,
    action: z.enum(['STUDENT_DOWNGRADE', 'CANCEL']),
  })
  .strict();
// No URL, no price, no savings figure: all come from SUBSCRIPTION_REGISTRY + quant-engine.

export const AnalyzeZombiesInputSchema = z.object({}).strict();

export const GetBudgetInsightsInputSchema = z.object({}).strict();

export const FlagSuspectedZombieInputSchema = z
  .object({
    subscriptionId: SubscriptionIdSchema,
    usedInPast30Days: z.boolean(),
  })
  .strict();

export const DraftCancellationInputSchema = z
  .object({ subscriptionId: SubscriptionIdSchema })
  .strict(); // T2: returns a mailto: draft built from the registry template

export const GenerateRoastInputSchema = z
  .object({ tone: z.enum(['GENTLE', 'SPICY']) }) // caller always passes it; no default in schema
  .strict();

/* ------------------------------------------------------------------ *
 * SERVER-SIDE SIGNED PROPOSAL (outputs of quant-engine)
 * ------------------------------------------------------------------ */

export const ProposalStatusSchema = z.enum([
  'PROPOSED',
  'APPROVED',
  'DECLINED',
  'MODIFIED',
  'EXECUTED',
]);

export const QuarantineTermsSchema = z
  .object({
    kind: z.literal('QUARANTINE'),
    targetItem: z.string(),
    itemPrice: z.number().positive(),
    premiumReward: z.number().min(0),
    quarantineHours: z.literal(24),
    shortfallProbability: z.number().min(0).max(100),
    cfar95: z.number().min(0),
    riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  })
  .strict();

export const EscrowTermsSchema = z
  .object({
    kind: z.literal('ESCROW'),
    targetItem: z.string(),
    itemPrice: z.number().positive(),
    lockedCategories: z.array(WantsCategorySchema).min(1),
    dailyBudgetReduction: z.number().positive(),
    durationDays: z.number().int().min(1).max(30),
    maxAllowedReduction: z.number().positive(),
    shortfallProbability: z.number().min(0).max(100),
    cfar95: z.number().min(0),
  })
  .strict();

export const SweepTermsSchema = z
  .object({
    kind: z.literal('SWEEP'),
    subscriptionId: SubscriptionIdSchema,
    action: z.enum(['STUDENT_DOWNGRADE', 'CANCEL']),
    merchantName: z.string(),
    monthlySavings: z.number().positive(),
    annualSavings: z.number().positive(),
    requiresStudentEmailOTP: z.boolean(),
    deepLinkAvailable: z.boolean(),
    mailtoAvailable: z.boolean(),
  })
  .strict();

export const ProposalTermsSchema = z.discriminatedUnion('kind', [
  QuarantineTermsSchema,
  EscrowTermsSchema,
  SweepTermsSchema,
]);

export const SignedProposalSchema = z
  .object({
    proposalId: z.string().min(8),
    userId: z.string().min(1),
    terms: ProposalTermsSchema,
    integrityHash: z.string().length(64),
    expiresAt: z.string(), // ISO, sandbox clock
    status: ProposalStatusSchema,
  })
  .strict();

/* ------------------------------------------------------------------ *
 * CARD DECISION (what the card passes to addToolResult)
 * ------------------------------------------------------------------ */

export const ModifiedTermsSchema = z
  .object({
    durationDays: z.number().int().min(1).max(30).optional(),
    dailyBudgetReduction: z.number().positive().optional(),
  })
  .strict(); // server re-validates against validateEscrowFloor + AI mandate

export const CardDecisionSchema = z.discriminatedUnion('status', [
  z
    .object({ status: z.literal('APPROVED'), proposalId: z.string(), authorizationRef: z.string() })
    .strict(),
  z
    .object({
      status: z.literal('MODIFIED'),
      proposalId: z.string(),
      newTerms: ModifiedTermsSchema,
      authorizationRef: z.string(),
    })
    .strict(),
  z
    .object({ status: z.literal('DECLINED'), proposalId: z.string(), reason: z.string().max(40).optional() })
    .strict(),
]);

/* ------------------------------------------------------------------ *
 * DUAL MANDATES
 * ------------------------------------------------------------------ */

export const UserSpendingLimitSchema = z
  .object({
    weeklyPayLimit: z.number().positive().max(100000),
    monthlyPayLimit: z.number().positive().max(100000),
    weeklyTransferLimit: z.number().positive().max(100000),
    monthlyTransferLimit: z.number().positive().max(100000),
  })
  .strict();

export const AiMandateSchema = z
  .object({
    maxLockAmountRM: z.number().positive().max(10000),
    maxLockDurationDays: z.number().int().min(1).max(30),
  })
  .strict();

/**
 * Permission state submitted with chat / proposal-decision requests.
 * VALIDATED AT THE API BOUNDARY: malformed payloads are rejected with HTTP 400
 * instead of silently defaulting (or crashing `assertTier` on a missing tier map).
 */
export const TierStateSchema = z
  .object({
    masterAutonomyEnabled: z.boolean(),
    enabledTiers: z
      .object({
        T0: z.boolean(),
        T1: z.boolean(),
        T2: z.boolean(),
        T3: z.boolean(),
      })
      .strict(),
  })
  .strict();

/* ------------------------------------------------------------------ *
 * Inferred types
 * ------------------------------------------------------------------ */

export type SignedProposal = z.infer<typeof SignedProposalSchema>;
export type ProposalTerms = z.infer<typeof ProposalTermsSchema>;
export type QuarantineTerms = z.infer<typeof QuarantineTermsSchema>;
export type EscrowTerms = z.infer<typeof EscrowTermsSchema>;
export type SweepTerms = z.infer<typeof SweepTermsSchema>;
export type AiMandate = z.infer<typeof AiMandateSchema>;
export type UserSpendingLimit = z.infer<typeof UserSpendingLimitSchema>;
export type SpendCategory = z.infer<typeof SpendCategorySchema>;
export type NeedsCategory = z.infer<typeof NeedsCategorySchema>;
export type WantsCategory = z.infer<typeof WantsCategorySchema>;
export type CardDecision = z.infer<typeof CardDecisionSchema>;
export type ModifiedTerms = z.infer<typeof ModifiedTermsSchema>;
export type ProposalStatus = z.infer<typeof ProposalStatusSchema>;
export type RunWhatIfInput = z.infer<typeof RunWhatIfInputSchema>;
export type ProposeQuarantineInput = z.infer<typeof ProposeQuarantineInputSchema>;
export type ProposeEscrowInput = z.infer<typeof ProposeEscrowInputSchema>;
export type ProposeSweepInput = z.infer<typeof ProposeSweepInputSchema>;
export type DraftCancellationInput = z.infer<typeof DraftCancellationInputSchema>;
export type GenerateRoastInput = z.infer<typeof GenerateRoastInputSchema>;
export type FlagSuspectedZombieInput = z.infer<typeof FlagSuspectedZombieInputSchema>;
