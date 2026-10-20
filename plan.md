# CtrlPay — Master Blueprint (plan.md)

> **2026 Shenzhen FinTechathon · Topic A: Personal Finance Assistant (个人理财助手)**
> A proactive *defensive* financial agent for university students.
> Build target: a reproducible web sandbox. **No real money moves. No real subscription is cancelled by the AI. Every state change needs a human click.**

**Reading rules for the AI coding agent (Cursor / Claude Code / Windsurf):**
- Follow Section 9 in order. Do not skip phases.
- All code blocks in this file are complete and closed. Copy signatures exactly.
- Demo constants (prices, thresholds, rewards) are **sandbox configuration values**, marked `DEMO_CONFIG`. They are not market data. Do not present them as real-world figures.
- Where this file says "server-side authority", the LLM must never be the source of a financial number.

---

## SECTION 1: Project Identity, Topic A Alignment & Core Philosophy

### 1.1 Identity

| Item | Value |
|---|---|
| Product name | **CtrlPay** |
| Meaning | `Ctrl+Z` undo impulse purchases · `Ctrl+S` save · `Ctrl+X` cut zombie expenses |
| Philosophy | **"Stop Paying Blindly. Let AI Control the Flow."** |
| Agent nature | Proactive *defensive* agent: it detects, simulates, proposes. The human decides and signs. |
| Audience | Gen Z / university students (USM, UPM, Malaysia) |
| Language | English primary, bilingual 中文/English labels for judges |

### 1.2 Student-Unit Translation (purchasing-power benchmarks)

Every money explanation is translated into student-life units. Benchmarks are `DEMO_CONFIG` in `lib/quant-engine.ts`:

| Unit | Value (RM) | Example |
|---|---|---|
| USM cafeteria mixed rice | 9.00 | RM 180/month of wasted subscriptions = 20 mixed rice meals |
| Bubble tea | 15.00 | RM 15 = one bubble tea |

Rule: the unit count is always computed by the engine (`Math.floor(amount / unitPrice)`), never by the LLM.

### 1.3 Topic A Four-Pillar Alignment Matrix

| Topic A verb | CtrlPay modules | Priority |
|---|---|---|
| **Budgeting (预算)** | Dynamic Budgeting (`dynamicDailyAllowance`) · Sinking Fund (annual fee amortization) · Needs/Wants/Savings allocation · **Dual Limits** (User Spending Limit vs. AI Mandate Limit) | P0 |
| **Bill Analysis (账单分析)** | Zombie Radar (recurring-cycle detection on transactions + user-authorized, read-only, structured Gmail receipt parser) · Visual Subscription Timeline | P0/P1 |
| **Spending Insights (消费洞察)** | What-If Cash-Flow-at-Risk (CFaR) Monte Carlo simulator · 12:00 PM Daily Spending Summary · Month-End Subscription Roast | P0/P2 |
| **Actionable Recommendations (行动建议)** | Payment Approval Interceptor → Commitment Quarantine / Needs-Protected Escrow · Student Downgrade & whitelisted deep-link / `mailto:` Sweep | P1 |

### 1.4 Tiered Prioritization Roadmap (cut from the bottom up: protect P0 > P1 > P2)

| Tier | Scope | Modules |
|---|---|---|
| **P0 — Core Engine & Security** | Must ship | Permission Tiers T0–T3 · Autonomy Master Switch · Audit Log · Privacy Guardrails · What-If CFaR Monte Carlo Engine · Dynamic Budget |
| **P1 — Event & Time Loop + Actionable Sweep** | Ship next | Subscription Timeline · Fast-Forward Time Controls · Payment Approval Interceptor · Student Downgrade · Deep-Link Cancel · Zombie Radar |
| **P2 — Polish & Multimodal Input** | If time allows | Quick Action Chips (Spending Analysis, Ways to Save, Budget Insights) · Multimodal Receipt OCR / Voice / Chat bookkeeping · Month-End Subscription Roast with Tone Toggle |

### 1.5 Explicitly Excluded / Out of Scope (with compliance justification)

| Dropped feature | Why it is excluded | Replacement / documentation |
|---|---|---|
| Brand discount push notifications | Contradicts the "Defensive Agent" identity, creates a conflict of interest, depends on behavioral data, violates our own "No sudden pop-up ads" promise, hurts privacy compliance | None. Zero third-party ad scripts. |
| Real-time GPS location spending alerts | Privacy cost outweighs utility | Time-triggered **12:00 PM Daily Spending Summary**. GPS moved to future roadmap. |
| Nearby bank & ATM tracker | Unrelated to AI agent execution; adds no score | None |
| Wi-Fi detection & malicious pop-up blocker | Browsers have no OS-level network or pop-up interception permission; outside the agent's authority boundary | Documented as a **Platform-Layer Control** in the Security Report (Section 10) |
| IC / passport upload + facial liveness | Highest sensitivity; conflicts with data minimization | Production: **integrate a licensed third-party eKYC provider**. Demo: student status via lightweight **Student Email (.edu / USM) OTP** |
| iOS Back-Tap shortcut | Not reproducible by judges on a web sandbox | None |

---

## SECTION 2: Tech Stack & Pinned SDK Conventions

### 2.1 Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript, `"strict": true` |
| Styling / UI | Tailwind CSS, Shadcn UI, Framer Motion, Lucide icons |
| State | Zustand (reactive global sandbox state) |
| Validation | Zod (strict input/output schemas + post-LLM number verification guard) |
| AI | Vercel AI SDK, **pinned to v4 convention** (below) |

### 2.2 Vercel AI SDK Version Pin (CRITICAL — zero version mismatch)

**We use AI SDK v4.** Pin exact versions in `package.json`:

```json
{
  "dependencies": {
    "ai": "~4.3.16",
    "@ai-sdk/react": "~1.2.12",
    "zod": "^3.23.8"
  }
}
```

(If the pinned patch versions are unavailable, keep the **major.minor** line `ai 4.3.x` and `@ai-sdk/react 1.2.x`. Do not upgrade to v5.)

**v4 syntax rules, enforced on backend and frontend alike:**

| Concern | Use (v4) | Forbidden (v5) |
|---|---|---|
| Tool schema key | `parameters: z.object({...})` | `inputSchema` |
| Rendering tool UI | `message.parts` → `part.type === 'tool-invocation'` → `part.toolInvocation` (`state`, `toolName`, `toolCallId`, `args`, `result`) | `part.type === 'tool-<name>'`, `part.input`, `part.output` |
| Client tool result | `addToolResult({ toolCallId, result })` from `useChat` | `addToolOutput` |
| Streaming response | `createDataStreamResponse` + `formatDataStreamPart` (server) | `toUIMessageStreamResponse()` |
| Multi-step | `maxSteps` on `useChat`; server agent loop for Groq Chat Completions | `stopWhen` |
| Hook import | `import { useChat } from '@ai-sdk/react'` | `DefaultChatTransport` |

Add a lint-style check in Phase 6: `grep -rE "inputSchema|addToolOutput|toUIMessageStreamResponse|stopWhen" app components lib` must return nothing.

### 2.3 Multi-Turn Tool-Call Integrity (CRITICAL)

**Every interactive contract card MUST call `addToolResult` for its `toolCallId`, whatever the user does:**

| User action | `addToolResult` payload |
|---|---|
| Approve & Sign | `{ status: 'APPROVED', proposalId, authorizationRef }` |
| Modify Terms | `{ status: 'MODIFIED', proposalId, newTerms, authorizationRef }` |
| Decline | `{ status: 'DECLINED', proposalId }` |

A tool call left in state `'call'` with no result makes the next turn fail (dangling tool call). Therefore:
1. Cards are rendered only for `toolInvocation.state === 'call'` (awaiting decision) or `'result'` (read-only summary).
2. The three contract tools (`propose_quarantine`, `propose_escrow`, `propose_sweep`) are **client-resolved tools: no `execute` on the server**. The card resolves them.
3. The chat uses `maxSteps: 5` so the model continues after the result and can acknowledge the decision.
4. Unmount safety: if a card unmounts while pending (for example the user clears the chat), a `useEffect` cleanup resolves it with `{ status: 'DECLINED', reason: 'DISMISSED' }`.

---

## SECTION 3: Quantitative Engine (`lib/quant-engine.ts`) — Real Math, Zero Buzzwords

### 3.1 Removed Claims

- **Removed:** Modern Portfolio Theory (needs an asset portfolio and a covariance matrix; we have neither) and Behavioral Options Pricing (no pricing model exists in the product).
- **Removed:** the 2-parameter `calculateVaR(itemPrice, liquidity)` and the hardcoded `dailyAllowance: 25`.
- **Replaced by:** Cash-Flow-at-Risk via historical bootstrap Monte Carlo, plus a computed dynamic daily allowance.
- Deck and report wording: only mention CFaR, sinking fund, needs/wants/savings allocation, commitment device, annualized cost and opportunity cost. Do not mention anything that has no implementation.

### 3.2 Server-Side Authority Rule

```text
LLM  → extracts intent + identifiers only:
        targetItem, itemPrice (as stated by user), category, subscriptionId, durationDays
LLM  → calls a tool
SERVER (quant-engine.ts) → deterministically computes ALL contract figures:
        premiumReward, monthlySavings, dailyBudgetReduction, lockedAmount, shortfallProbability ...
SERVER → returns a SIGNED PROPOSAL: { proposalId, terms, integrityHash, expiresAt }
USER   → approves / modifies / declines THAT exact proposal
```

Integrity hash: `HMAC-SHA256(serverSecret, canonicalJson(terms) + proposalId + userId)`. On approval the server re-computes the hash and rejects any mismatch. The LLM never sees `serverSecret`.

### 3.3 Cash-Flow-at-Risk via Historical Bootstrap (`runWhatIfSimulation`)

**Inputs**

```typescript
export type SpendCategory =
  | 'Bills_Utilities' | 'Campus_Cafeteria_Basic' | 'Medical' | 'Transport_Essential'
  | 'Food_Delivery_Grab_Foodpanda' | 'Entertainment' | 'Bubble_Tea_Dining' | 'Shopping';

export interface WhatIfInput {
  currentBalance: number;            // RM
  fixedMonthlyBills: FixedBill[];    // utilities, rent, active subscriptions (with dueDay + paid flag)
  remainingDaysInMonth: number;      // integer >= 1
  monthlySavingsGoal: number;        // RM
  userPayLimits: { weeklyPayLimit: number; monthlyPayLimit: number; weeklyTransferLimit: number; monthlyTransferLimit: number };
  spentThisWeek: number;
  spentThisMonth: number;
  historicalDailySpending: number[]; // variable daily spend, RM per day, length >= MIN_HISTORY_DAYS
  proposedExpense: { amount: number; category: SpendCategory; isNeed: boolean };
  seed?: number;                     // deterministic PRNG seed for reproducible demos
}

export interface WhatIfResult {
  shortfallProbability: number;      // 0-100 (%)
  cfar95: number;                    // RM, 95th percentile month-end shortfall vs. savings goal
  projectedMonthEndBalance: number;  // RM, mean of simulated paths
  dynamicDailyAllowance: number;     // RM/day
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  limitBreach: { weekly: boolean; monthly: boolean };
  lowHistoryWarning: boolean;        // true if history < MIN_HISTORY_DAYS (falls back to flat estimate)
  pathsRun: number;                  // 1000
}

export declare function runWhatIfSimulation(input: WhatIfInput): WhatIfResult;
```

**Algorithm (N = 1,000 bootstrap paths)**

Let `U` = unpaid fixed bills still due this month, `P` = proposed expense, `B` = current balance, `G` = monthly savings goal, `D` = remaining days, `h_1..h_m` = historical daily variable spend.

For each path `i = 1..N`:

$$S_i = \sum_{j=1}^{D} h_{k_{ij}}, \quad k_{ij} \sim \text{Uniform}\{1..m\} \text{ (sampling with replacement)}$$

$$E_i = B - U - P - S_i \quad \text{(simulated month-end balance)}$$

$$L_i = \max(0,\; G - E_i) \quad \text{(shortfall against the savings goal, RM)}$$

Outputs:

- `projectedMonthEndBalance` = $\frac{1}{N}\sum_i E_i$
- `shortfallProbability` = $100 \times \frac{\#\{i : E_i < G\}}{N}$ (covers "missing the savings goal" and "going negative", since $G \ge 0$)
- `cfar95` = 95th percentile of $\{L_i\}$ (sort ascending, take index $\lceil 0.95N \rceil - 1$)
- `dynamicDailyAllowance`:

$$\text{dynamicDailyAllowance} = \frac{\text{currentBalance} - \text{unpaidFixedBills} - \text{monthlySavingsGoal}}{\text{remainingDaysInMonth}}$$

(floored at 0; computed *without* the proposed expense for the dashboard, and *with* it for the what-if output.)

**Risk classification (`DEMO_CONFIG`, tunable in one constant object):**

| riskLevel | Rule |
|---|---|
| LOW | `shortfallProbability < 10` |
| MEDIUM | `10 <= shortfallProbability < 30` |
| HIGH | `30 <= shortfallProbability < 60` |
| CRITICAL | `shortfallProbability >= 60`, **or** `P(E_i < 0) > 20%` |

Any breach of `userPayLimits` (`spentThisWeek + P > weeklyPayLimit`, or the monthly equivalent) raises `riskLevel` to at least HIGH and sets `limitBreach`.

**Implementation notes (honesty about the model):**
- Seeded PRNG (`mulberry32(seed)`) so judges can reproduce the same output.
- `MIN_HISTORY_DAYS = 14` (`DEMO_CONFIG`). Below that, set `lowHistoryWarning = true` and bootstrap from a flat estimate. The UI must show: *"Based on limited history, estimate only."*
- Bootstrap assumes daily spends are independent draws. State this limitation in the report (no day-of-week seasonality). Do not claim a parametric distribution.

**Downstream routing (the only gate to Quarantine/Escrow):**

```text
riskLevel in {LOW, MEDIUM} and no limitBreach → NO contract. Agent answers helpfully (Non-Intervention Exit Path).
riskLevel in {HIGH, CRITICAL} or limitBreach  → agent MAY propose Quarantine (impulse WANT) or Escrow (WANTS-category budget lock).
proposedExpense.isNeed === true               → never Quarantine/Escrow; advisory only.
```

### 3.4 Sinking Fund Amortization (`calculateAmortizedSubscriptions`)

Converts annual / quarterly charges into hidden monthly and daily burdens when the user toggles **Amortize Annual Fees** on the Timeline.

```typescript
export interface Subscription {
  subscriptionId: SubscriptionId;
  amountRM: number;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
  nextBillingDate: string; // ISO date in sandbox clock
}

export interface AmortizedView {
  subscriptionId: SubscriptionId;
  monthlyBurden: number;  // RM
  dailyBurden: number;    // RM
  setAsideThisMonth: number; // RM to reserve in the sinking fund
}

export declare function calculateAmortizedSubscriptions(subs: Subscription[]): AmortizedView[];
```

$$\text{Monthly Burden} = \frac{\text{Annual Fee}}{12} \;(\text{annual}),\quad \frac{\text{Quarterly Fee}}{3}\;(\text{quarterly}),\quad \text{Fee}\;(\text{monthly})$$

$$\text{Daily Burden} = \frac{\text{Monthly Burden} \times 12}{365}$$

Example (`DEMO_CONFIG`): an RM 200/year software licence shows as RM 16.67/month of "hidden" burden. When the toggle is ON, `dynamicDailyAllowance` uses amortized burdens instead of waiting for the lump-sum billing month.

### 3.5 Needs vs. Wants Protection Floor (`validateEscrowFloor`)

```typescript
export const NEEDS_CATEGORIES = [
  'Bills_Utilities', 'Campus_Cafeteria_Basic', 'Medical', 'Transport_Essential',
] as const;

export const WANTS_CATEGORIES = [
  'Food_Delivery_Grab_Foodpanda', 'Entertainment', 'Bubble_Tea_Dining', 'Shopping',
] as const;

export const ESCROW_RULES = {          // DEMO_CONFIG
  maxReductionRatio: 0.4,              // dailyBudgetReduction <= 40% of dynamicDailyAllowance
  minDailySurvivalFloorRM: 15,         // basic-meal floor
} as const;

export interface EscrowFloorCheck {
  ok: boolean;
  reasons: Array<'NEEDS_CATEGORY_LOCKED' | 'REDUCTION_OVER_40_PERCENT' | 'BELOW_SURVIVAL_FLOOR' | 'EXCEEDS_AI_MANDATE'>;
  maxAllowedReduction: number;         // RM/day
}

export declare function validateEscrowFloor(args: {
  lockedCategories: SpendCategory[];
  dailyBudgetReduction: number;
  dynamicDailyAllowance: number;
  durationDays: number;
  mandate: AiMandate;
}): EscrowFloorCheck;
```

Hard compliance rules (server-enforced, UI sliders are clamped to the same bounds):
- **(a)** NEEDS categories can **never** appear in `lockedCategories`.
- **(b)** `dailyBudgetReduction <= 0.40 × dynamicDailyAllowance` **and** `dynamicDailyAllowance − dailyBudgetReduction >= 15`. If `dynamicDailyAllowance − 15` is too small to allow any reduction, Escrow is not offered at all.
- **(c)** `durationDays` and total locked RM stay within the user's **AI Mandate Limit** (Section 6.2).

### 3.6 Subscription Annualized & Opportunity Cost (`calculateSubscriptionMetrics`)

```typescript
export interface SubscriptionMetrics {
  annualizedCost: number;           // monthlyPrice * 12
  studentAnnualSavings: number | null; // null if no student plan exists
  opportunityCostMeals: number;     // floor(monthlySpend / 9.00)
  opportunityCostBubbleTea: number; // floor(monthlySpend / 15.00)
}

export declare function calculateSubscriptionMetrics(args: {
  fullPriceRM: number;
  studentPriceRM: number | null;
}): SubscriptionMetrics;
```

$$\text{Annualized Cost} = \text{Monthly Price} \times 12$$

$$\Delta\text{Annual Savings} = (\text{Full Price} - \text{Student Price}) \times 12$$

$$\text{Opportunity Cost (meals)} = \left\lfloor \frac{\text{Monthly Spend}}{9.00} \right\rfloor$$

### 3.7 Other Deterministic Functions

```typescript
export declare function calculateQuarantineReward(itemPrice: number, rewardPoolBalance: number): number;
// = min(round2(itemPrice * REWARD_RATE), REWARD_CAP, rewardPoolBalance); REWARD_RATE and REWARD_CAP are DEMO_CONFIG; returns 0 if pool is empty.

export declare function signProposal(terms: ProposalTerms, userId: string): SignedProposal;
export declare function verifyProposal(p: SignedProposal, userId: string): boolean;
```

---

## SECTION 4: Fixed Fund Mechanics, State Model (`lib/store.ts`) & Strict Zod Schemas

### 4.1 Fix of the Three Fund-Logic Flaws

#### Flaw 1 — Naming: `yieldPocket` → `defenseVault`
Rename everywhere to **`defenseVault`** (UI label: "Defense Vault 防御金库"). The word "yield" is removed. The vault earns **no interest** and offers no return. It is a labeled, non-interest sandbox ledger bucket of verified savings. This avoids any suggestion of an unlicensed deposit or wealth-management product.

#### Flaw 2 — Quarantine anti-farming logic
- `premiumReward` is **not printed from nothing**. It is paid out of **`rewardPool`**, which is funded only by **verified subscription sweep savings** (Flaw 3 below). If `rewardPool` is empty, reward = RM 0 and the Quarantine is still available.
- Accepting a Quarantine sets status `LOCKED_24H`.
- Reward is paid into `defenseVault` **only if both**: (1) sandbox clock has advanced by ≥ 24h, **and** (2) the user clicks **"Abandon Purchase & Claim Reward"**.
- If the user proceeds with the purchase after 24h, **no reward** is paid. If they try to claim before 24h, the button is disabled.
- One active Quarantine per `targetItem` (idempotency key = `userId + targetItem + proposalId`).

```text
Quarantine state machine
PROPOSED → (user approve) → LOCKED_24H → (clock ≥ +24h) → READY_TO_DECIDE
READY_TO_DECIDE → "Abandon Purchase & Claim Reward" → CLAIMED   (reward: rewardPool → defenseVault)
READY_TO_DECIDE → "Proceed with Purchase"           → RELEASED  (no reward)
PROPOSED → (decline) → DECLINED
```

#### Flaw 3 — Two-Stage Sweep Settlement
Clicking **Downgrade / Cancel Subscription** does **not** credit `defenseVault`, because the plan change happens on an external third-party platform.
- Stage 1: create `PendingSweep` with status `PENDING_NEXT_BILLING_VERIFICATION`. Nothing moves.
- Stage 2: when the sandbox timeline fast-forwards **across that subscription's next billing date** and the mock ledger shows the lower student charge or no recurring charge, status → `VERIFIED` and `monthlySavings` moves to `defenseVault` (and the same amount is added to `rewardPool` for funding Quarantine rewards, split rule `DEMO_CONFIG`: e.g. 50/50).
- If the billing date passes and the old price was still charged, status → `NOT_VERIFIED` and the UI shows *"No change detected. Savings not counted."*

### 4.2 Hardcoded Subscription Whitelist Registry (`lib/subscription-registry.ts`)

**CRITICAL SECURITY FIX:** `deepLinkUrl: z.string()` is **removed from all LLM tool schemas** (URL injection / phishing vector). The LLM may only pass a `subscriptionId` enum. URLs come from this team-maintained, read-only registry.

```typescript
import { z } from 'zod';

export const SubscriptionIdSchema = z.enum([
  'spotify_my',
  'youtube_my',
  'netflix_my',
  'icloud_my',
  'disney_plus_my',
  'anytime_fitness_my',
]);
export type SubscriptionId = z.infer<typeof SubscriptionIdSchema>;

export interface RegistryEntry {
  merchantName: string;
  fullPriceRM: number;                 // DEMO_CONFIG sandbox price
  studentPriceRM: number | null;       // null = no student plan
  requiresStudentEmailOTP: boolean;
  officialCancelDeepLink: string | null; // HTTPS only; null for manual contracts
  mailtoTemplate: {
    to: string;
    subject: string;
    body: string;                      // contains {{MEMBER_ID}} and {{FULL_NAME}} placeholders
  } | null;
}

export const SUBSCRIPTION_REGISTRY: Readonly<Record<SubscriptionId, RegistryEntry>> = Object.freeze({
  spotify_my: {
    merchantName: 'Spotify',
    fullPriceRM: 15.9,
    studentPriceRM: 8.5,               // DEMO_CONFIG: verify against the merchant page before any production use
    requiresStudentEmailOTP: true,
    officialCancelDeepLink: 'https://www.spotify.com/my-en/account/subscription/',
    mailtoTemplate: null,
  },
  youtube_my: {
    merchantName: 'YouTube Premium',
    fullPriceRM: 17.9,
    studentPriceRM: 8.9,               // DEMO_CONFIG
    requiresStudentEmailOTP: true,
    officialCancelDeepLink: 'https://www.youtube.com/paid_memberships',
    mailtoTemplate: null,
  },
  netflix_my: {
    merchantName: 'Netflix',
    fullPriceRM: 55,                   // matches the timeline demo event (-RM 55 on the 15th)
    studentPriceRM: null,              // no student plan: cancel/downgrade-tier only
    requiresStudentEmailOTP: false,
    officialCancelDeepLink: 'https://www.netflix.com/cancelplan',
    mailtoTemplate: null,
  },
  icloud_my: {
    merchantName: 'iCloud+',
    fullPriceRM: 4.9,                  // DEMO_CONFIG
    studentPriceRM: null,
    requiresStudentEmailOTP: false,
    officialCancelDeepLink: 'https://support.apple.com/en-my/118428',
    mailtoTemplate: null,
  },
  disney_plus_my: {
    merchantName: 'Disney+',
    fullPriceRM: 54.9,                 // DEMO_CONFIG
    studentPriceRM: null,
    requiresStudentEmailOTP: false,
    officialCancelDeepLink: 'https://www.disneyplus.com/account',
    mailtoTemplate: null,
  },
  anytime_fitness_my: {
    merchantName: 'Anytime Fitness',
    fullPriceRM: 180,                  // DEMO_CONFIG
    studentPriceRM: null,
    requiresStudentEmailOTP: false,
    officialCancelDeepLink: null,      // manual contract: email only
    mailtoTemplate: {
      to: 'membership@anytimefitness.example',   // placeholder address in sandbox; replace with the verified club address
      subject: 'Request to Terminate Membership: Member ID {{MEMBER_ID}}',
      body:
        'Dear Membership Team,\n\n' +
        'I am writing to formally request the termination of my membership (Member ID: {{MEMBER_ID}}, Name: {{FULL_NAME}}), ' +
        'effective at the end of my current billing period, in accordance with the terms of my agreement.\n\n' +
        'Kindly confirm in writing the effective termination date, any outstanding balance, and that no further charges will be made ' +
        'after that date.\n\nThank you for your assistance.\n\nYours sincerely,\n{{FULL_NAME}}',
    },
  },
});
```

Registry rules:
- Prices and URLs are **sandbox/demo values maintained by the team**. Add a `// last verified: <date>` comment at build time. The report states that production requires merchant-verified data.
- A unit test asserts every `officialCancelDeepLink` starts with `https://`, and every mailto `to` matches an email regex.
- The `mailto:` URL is built **client-side** with `encodeURIComponent`; placeholders are filled from the local profile; nothing is sent by CtrlPay.

### 4.3 Strict Zod Schemas (`lib/types.ts`)

Rules: strict enums for categories and `subscriptionId`; every number has `.positive()` / `.int()` / `.min()` / `.max()`; **no `.default()`** in LLM tool input schemas (cross-provider JSON Schema compatibility); `.strict()` on objects so unknown keys are rejected.

```typescript
import { z } from 'zod';
import { SubscriptionIdSchema } from './subscription-registry';

export const NeedsCategorySchema = z.enum([
  'Bills_Utilities', 'Campus_Cafeteria_Basic', 'Medical', 'Transport_Essential',
]);

export const WantsCategorySchema = z.enum([
  'Food_Delivery_Grab_Foodpanda', 'Entertainment', 'Bubble_Tea_Dining', 'Shopping',
]);

export const SpendCategorySchema = z.enum([
  'Bills_Utilities', 'Campus_Cafeteria_Basic', 'Medical', 'Transport_Essential',
  'Food_Delivery_Grab_Foodpanda', 'Entertainment', 'Bubble_Tea_Dining', 'Shopping',
]);

// ---------- LLM TOOL INPUT SCHEMAS (identifiers & intent only; NO financial contract numbers) ----------

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

export const DraftCancellationInputSchema = z
  .object({ subscriptionId: SubscriptionIdSchema })
  .strict(); // T2: returns a mailto: draft built from the registry template

export const GenerateRoastInputSchema = z
  .object({ tone: z.enum(['GENTLE', 'SPICY']) }) // caller always passes it; no default in schema
  .strict();

// ---------- SERVER-SIDE SIGNED PROPOSAL (outputs of quant-engine) ----------

export const ProposalStatusSchema = z.enum([
  'PROPOSED', 'APPROVED', 'DECLINED', 'MODIFIED', 'EXECUTED',
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
  QuarantineTermsSchema, EscrowTermsSchema, SweepTermsSchema,
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

// ---------- CARD DECISION (what the card passes to addToolResult) ----------

export const ModifiedTermsSchema = z
  .object({
    durationDays: z.number().int().min(1).max(30).optional(),
    dailyBudgetReduction: z.number().positive().optional(),
  })
  .strict(); // server re-validates against validateEscrowFloor + AI mandate

export const CardDecisionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('APPROVED'), proposalId: z.string(), authorizationRef: z.string() }).strict(),
  z.object({ status: z.literal('MODIFIED'), proposalId: z.string(), newTerms: ModifiedTermsSchema, authorizationRef: z.string() }).strict(),
  z.object({ status: z.literal('DECLINED'), proposalId: z.string(), reason: z.string().max(40).optional() }).strict(),
]);

// ---------- DUAL MANDATES ----------

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

export type SignedProposal = z.infer<typeof SignedProposalSchema>;
export type ProposalTerms = z.infer<typeof ProposalTermsSchema>;
export type AiMandate = z.infer<typeof AiMandateSchema>;
export type UserSpendingLimit = z.infer<typeof UserSpendingLimitSchema>;
```

### 4.4 Zustand State Model (`lib/store.ts`)

```typescript
import { create } from 'zustand';
import type { SignedProposal, AiMandate, UserSpendingLimit } from './types';

export type PermissionTier = 'T0' | 'T1' | 'T2' | 'T3';
export type ZombieTag = 'ACTIVE' | 'ENDANGERED' | 'ZOMBIE' | 'SUSPECTED_ZOMBIE';

export interface QuarantineRecord {
  proposalId: string;
  targetItem: string;
  itemPrice: number;
  premiumReward: number;
  status: 'LOCKED_24H' | 'READY_TO_DECIDE' | 'CLAIMED' | 'RELEASED';
  lockedAt: number;      // sandbox clock ms
}

export interface EscrowRecord {
  proposalId: string;
  lockedCategories: string[];
  dailyBudgetReduction: number;
  durationDays: number;
  startedAt: number;     // sandbox clock ms
  status: 'ACTIVE' | 'COMPLETED';
}

export interface PendingSweep {
  proposalId: string;
  subscriptionId: string;
  monthlySavings: number;
  nextBillingDate: number;
  status: 'PENDING_NEXT_BILLING_VERIFICATION' | 'VERIFIED' | 'NOT_VERIFIED';
}

export interface CtrlPayState {
  userId: string;
  sandboxClock: number;                 // ms epoch, controlled ONLY by the Simulation Toolbar
  currentBalance: number;
  defenseVault: number;                 // formerly yieldPocket; non-interest-bearing ledger bucket
  rewardPool: number;                   // funded only by VERIFIED sweep savings
  masterAutonomyEnabled: boolean;       // default false
  enabledTiers: Record<PermissionTier, boolean>; // T0 always true; T1/T2 toggleable only if master ON; T3 always needs per-action confirm
  userLimits: UserSpendingLimit;
  aiMandate: AiMandate;
  amortizeAnnualFees: boolean;
  quarantines: QuarantineRecord[];
  escrows: EscrowRecord[];
  pendingSweeps: PendingSweep[];
  zombieTags: Record<string, ZombieTag>;
  // actions
  advanceClock(hours: number): void;    // resolves quarantines, escrows, verifies sweeps, fires 12:00 PM + month-end events
  applyDecision(p: SignedProposal, decision: 'APPROVED' | 'MODIFIED' | 'DECLINED', newTerms?: unknown): void;
  claimQuarantineReward(proposalId: string): void;
  releaseQuarantine(proposalId: string): void;
  setMasterAutonomy(on: boolean): void;
  setAmortize(on: boolean): void;
  simulatePaymentIntent(intent: { merchant: string; amount: number; category: string }): void;
}
```

Initial mock state is configured in `lib/mock-data.ts` (`DEMO_CONFIG`): a starting balance, 45 days of historical daily spend, a recurring-transaction ledger, the subscription set above (Spotify at full price, Netflix, etc.), and `masterAutonomyEnabled: false`. Every store mutation calls `auditLog.append(...)` and `console.info('[SANDBOX]', ...)` (the console log doubles as the competition's required sandbox operation log).

---

## SECTION 5: Proactive Event-Driven Sandbox & Core Feature Modules

**Problem solved:** the old plan claimed *proactive* but only reacted to chat. The sandbox now has an **event bus + a controllable clock**. The agent intervenes when events fire, without waiting for the user to type.

```text
Event sources (all mock, labeled as stand-ins for Open Banking / merchant APIs)
  SimulationToolbar → advanceClock(+24h | +7d | month-end)
  PaymentInterceptor → simulatePaymentIntent(GrabFood RM 32 | Shopee RM 180)
  Mock Gmail         → receipt events
         ↓
  Event handler → runs T0 analysis (CFaR, Zombie Radar) → if risk HIGH/CRITICAL → surfaces an intervention
         ↓
  Left-panel modal / drawer or chat card → user decides → state change → audit log
```

Layout: **Left panel** = Interactive Dashboard + Simulation Control Bar. **Right panel** = Agent chat. Both read the same Zustand store.

### 5.1 Visual Subscription Timeline (`components/subscription-timeline.tsx`)

- Horizontal scrollable 30-day strip. Today's date is highlighted (e.g. the 12th). Upcoming recurring deductions appear as prominent **red badges** (e.g. `-RM 55 Netflix` on the 15th).
- **Annual Fee Amortization toggle** (Sinking Fund view): when ON, annual/quarterly charges are shown as monthly/daily burdens (Section 3.4) and `dynamicDailyAllowance` recomputes.
- **Time Fast-Forward Buttons:** `+24 Hours`, `+7 Days`, `Jump to Month-End`. Each calls `advanceClock`, which in order:
  1. resolves Quarantines (`LOCKED_24H → READY_TO_DECIDE` at ≥ 24h);
  2. progresses N-day Escrows (and completes them when `durationDays` elapsed);
  3. verifies `PendingSweep`s whose billing date was crossed (Section 4.1, Flaw 3);
  4. fires the 12:00 PM Daily Spending Summary when the clock crosses noon;
  5. triggers the Month-End Subscription Roast on month-end.
- The clock only moves forward through this control. It is clearly labeled **"Sandbox Clock (simulated)"**.

### 5.2 Payment Intent Interceptor (`components/payment-interceptor-modal.tsx`)

- Two sandbox buttons: **Simulate GrabFood RM 32 Checkout** and **Simulate Shopee RM 180 Impulse Buy**.
- Documented explicitly as a **mock stand-in for Open Banking / Merchant Payment Webhook APIs**. No real merchant is connected.
- Firing the event automatically runs `runWhatIfSimulation` *before* the "payment completes".
  - LOW/MEDIUM and no limit breach → a small non-blocking toast: "Looks fine. Today's allowance after this: RM X."
  - HIGH/CRITICAL or limit breach → **intercept modal** showing `shortfallProbability`, `cfar95`, `projectedMonthEndBalance`, and the student-unit translation. Offers: **24h Quarantine** (WANT impulse) or **Wants-Category Escrow**, plus **Proceed anyway** (the user always keeps control; the log records it).
- NEEDS-category intents are never intercepted with a lock; they only get an advisory note.
- The Interceptor is available on the Free tier (Section 7).

### 5.3 Zombie Radar & Bill Analysis (`lib/zombie-radar.ts`)

Detection inputs:
1. **Bank-statement recurring transactions:** group by normalized merchant; flag as recurring when there are ≥ 3 occurrences with amount within ±5% (`DEMO_CONFIG`) and interval ≈ 30 ± 3 days.
2. **User-authorized, read-only structured receipt fields from mock Gmail emails.** Explicitly replaces any "silent scanning": the user must grant a read-only consent toggle; only structured fields (`merchant`, `amount`, `billingDate`, `cycle`) are extracted and stored; no email bodies are stored; consent can be revoked and is audit-logged.

Tags (computed deterministically in `lib/zombie-radar.ts`):

| Tag | Rule |
|---|---|
| `ACTIVE` | Recurring and a usage signal is present or recent |
| `ENDANGERED` | Renewing within 3 days (sandbox clock) |
| `ZOMBIE` | Recurring for ≥ 3 months **and** a low-activity signal exists |
| `SUSPECTED_ZOMBIE` | Recurring but no usage telemetry available. Agent asks one-click: *"Have you used Disney+ in the past 30 days?"* [Yes / No]. "No" upgrades to `ZOMBIE`. |

Tagging is a T1 action; asking the question is T1; any cancel/downgrade proposal is T2/T3.

### 5.4 Student Downgrade & Deep-Link Cancel (the "Sweep Hero Flow")

1. Zombie Radar / registry diff proactively detects: *paying full price (e.g. RM 15.90/mo for Spotify) while a student plan exists*.
2. Agent prompt (numbers from `calculateSubscriptionMetrics`): *"Detected full-price payment. Verify your USM student email via OTP to switch to the Student Plan and save RM X/year."*
3. Student OTP (sandbox): user enters a `@student.usm.my`-style or `.edu` address → mock 6-digit OTP shown in the sandbox UI → verified flag stored. No ID documents.
4. A **bottom sheet / drawer** opens with two safe navigator options:
   - **[1-Click Official Deep-Link Cancel/Downgrade]**: opens `officialCancelDeepLink` from `SUBSCRIPTION_REGISTRY` in a new tab (`rel="noopener noreferrer"`).
   - **[Draft AI Cancellation Email]**: builds a `mailto:` link with pre-filled business English text and membership-ID placeholder. The user only presses Send in their own mail client. CtrlPay holds **zero Gmail send permission and no OAuth write scope**.
5. User confirms (T3) → creates `PendingSweep` (`PENDING_NEXT_BILLING_VERIFICATION`). Savings are credited only after verification on the next billing date (Section 4.1).

### 5.5 Quick Chips, Multimodal Bookkeeping & Month-End Roast (P2)

- **AI Quick Chips** above the chat bar: `Spending Analysis`, `Ways to Save`, `Budget Insights`. Each directly triggers a **T0 read-only** tool (no contract, no state change).
- **Multimodal Bookkeeping:**
  - *Receipt / transfer screenshot OCR:* image → vision LLM → structured JSON (`merchant`, `amount`, `date`, `category`) → **user confirmation required before booking** → raw image **discarded immediately, never written to disk or storage**. PII redaction applies to extracted text before it returns to any further LLM call.
  - *Voice:* hold-to-talk via browser **Web Speech API**, with an explicit privacy notice: *"Browser speech recognition may process your audio in the cloud."* Text transcript goes through the same confirm-before-book step.
  - *Chat bookkeeping:* "I spent RM 12 on lunch" → parsed to a pending entry → confirm.
- **12:00 PM Daily Spending Summary:** a time-triggered in-app card (sandbox clock crossing noon): today's spend vs. `dynamicDailyAllowance`, in student units. No GPS, no push to third parties.
- **Month-End Subscription Roast:** generated on `Jump to Month-End`; compares wasted subscription spend to USM cafeteria meals. **Tone Toggle: Gentle (default) / Spicy.** Numbers come from the engine; the LLM only writes the prose and passes through the number verifier (Section 6.3).

---

## SECTION 6: Permission Tiers (T0–T3), Dual Mandates & Privacy Guardrails

### 6.1 Master AI Autonomy Switch & Permission Tiers

- **Master AI Autonomy Switch: default OFF.** When OFF, CtrlPay operates in **T0 advisory/analysis mode only** (read-only). Demo moment: flip the switch and the agent's available behaviors visibly change.
- Tier model:

| Tier | Name | Examples | Confirmation |
|---|---|---|---|
| **T0** | Read-Only Insights | CFaR What-If simulation, Budget Insights, Zombie Radar detection, Spending Analysis | None (always allowed, still logged) |
| **T1** | Low-Risk Organization | Tag transactions Needs vs. Wants, set 12:00 PM reminder schedule, flag `SUSPECTED_ZOMBIE` | Requires Master ON + T1 enabled; reversible, no money state |
| **T2** | Assisted Preparation | Generate `mailto:` cancellation drafts, prepare Student Downgrade deep-link drawer, pre-fill contract terms | Requires Master ON + T2 enabled; nothing executes |
| **T3** | High-Risk Financial State Change | Lock funds in Quarantine, sign an Escrow budget lock, initiate a Subscription Sweep | **ALWAYS requires explicit per-action user confirmation (click)**, even when Master is ON |

Enforcement: a central `assertTier(toolName, state)` runs inside the API route before every tool executes (and in the card's Approve handler). A T3 action without a matching `USER_CLICK_APPROVE_*` authorization ref is rejected and logged.

### 6.2 Dual Limit Architecture

| Limit | Constrains | Contents | Used as |
|---|---|---|---|
| **User Spending Limit** | The *user's own* impulse spending | Weekly/monthly payment limits and transfer limits | Constraint inputs to `runWhatIfSimulation` (a breach raises riskLevel to ≥ HIGH) |
| **AI Mandate Limit** | The *AI agent's* authority | Max RM amount and max duration days the AI may propose to lock in any single Quarantine/Escrow | Hard validation in `validateEscrowFloor` and proposal creation; proposals exceeding it are rejected server-side |

### 6.3 Three-Layer Privacy Guardrails (`lib/privacy-guard.ts`)

1. **Pre-LLM PII Redaction:** strip bank account numbers, IC numbers, phone numbers, and exact personal names from transaction strings before building LLM context. Example: `"TRANSFER TO AHMAD BIN ALI 0123456789"` → `"TRANSFER TO [PERSON] [ACCOUNT]"`. Regex-based plus a unit-tested fixture set (Malaysian IC format `YYMMDD-PB-####`, 10–16 digit account strings, `+60`/`01x` phone patterns).
2. **Per-User Tenant Isolation:** all state, mock data, proposals and logs are keyed by `userId`; every server read/write takes `userId` from the authenticated session (sandbox: signed cookie), never from the LLM or request body. No cross-user context. The LLM provider is configured with no training on user data where the provider supports it.
3. **Post-LLM Output & Numerical Hallucination Verifier:**
   - Every tool call goes through Zod `.strict()` validation + AI-mandate validation.
   - A regex verifier extracts every `RM\s?\d+(\.\d+)?` figure from the LLM's natural-language reply and checks that each figure appears in the deterministic `quant-engine.ts` outputs for that turn or in the user's ledger (tolerance ±RM 0.01). On failure: the reply is withheld/regenerated once with a correction instruction; on a second failure, a safe fallback template built from engine output is shown. Failures are audit-logged as `NUMBER_VERIFIER_BLOCKED`.

### 6.4 Enhanced Immutable Audit Log (`lib/audit-logger.ts`)

Every AI tool invocation, simulation and user decision appends an entry. The log is **append-only and hash-chained** (`entryHash = SHA-256(prevHash + canonicalJson(entry))`) so tampering is detectable.

```typescript
export interface AuditEntry {
  logId: string;
  timestamp: string;                  // ISO, real time
  sandboxClock: string;               // ISO, simulated time
  actor: 'AGENT' | 'USER';
  actionType: string;                 // e.g. 'RUN_WHAT_IF', 'PROPOSE_QUARANTINE', 'USER_DECISION'
  permissionTier: 'T0' | 'T1' | 'T2' | 'T3';
  data_accessed: string[];            // exact FIELDS read, e.g. ["transactions.last30d","subscriptions.spotify"]; never raw PII values
  authorization_ref: string;          // e.g. 'USER_CLICK_APPROVE_PROPOSAL_8F3A' | 'MANDATE_DEFAULT_T0'
  proposal_hash: string | null;
  status: 'PROPOSED' | 'APPROVED' | 'DECLINED' | 'MODIFIED' | 'EXECUTED';
  prevHash: string;
  entryHash: string;
}

export declare const auditLog: {
  append(e: Omit<AuditEntry, 'logId' | 'timestamp' | 'prevHash' | 'entryHash'>): AuditEntry;
  list(userId: string): readonly AuditEntry[];
  verifyChain(userId: string): boolean;
};
```

`components/audit-drawer.tsx` shows the trace (filter by tier/status) and a "Chain verified ✓ / ✗" indicator. In the sandbox the log is persisted in server memory plus `localStorage` mirror; production would use WORM storage (see Section 10 residual risk).

---

## SECTION 7: Ethical Freemium vs. Student Pro Monetization Model

**Ethical Paywall Principle: protective and safety controls are never paywalled.** Safety is free; advanced prediction and automation convenience is paid.

### 7.1 Free Tier (RM 0 — Core Protection & Safety, Forever Free)

- Zero pop-up ads; zero third-party ad scripts.
- Manual and chat/receipt bookkeeping; Monthly Overview Pie Chart (Needs vs. Wants); basic dynamic daily allowance.
- **Overspending & budget-breach alerts** (moved to Free so protection is never locked behind a paywall).
- **Payment Approval Interception** for linked delivery/shopping apps.
- **All security controls:** Master Autonomy Switch (default OFF), T0–T3 permission settings, human confirmation (HITL), and full audit-log traceability.

### 7.2 CtrlPay Pro (RM 9.90/month · RM 89/year · Student price via .edu/USM OTP: RM 49 first year, RM 69/year renewal)

> Pricing is the team's proposed business-model assumption (`DEMO_CONFIG`), not validated market pricing.

- Multi-path Monte Carlo What-If CFaR scenario simulator and predictive cash-flow stress testing (multiple scenarios side by side).
- Full Visual Subscription Timeline with Sinking Fund annual-fee amortization.
- Automated Zombie Radar, 1-Click whitelisted deep-link cancel / `mailto:` generator, and Student Downgrade Arbitrage Detector. A single detected student downgrade can save tens of RM per year (engine-computed per merchant, e.g. Spotify's registry gap), which can offset the Student Pro price.
- Automated Month-End Subscription Roast and custom commitment rewards.

In the sandbox demo, a `plan` flag in the store gates Pro modules. **Safety modules are never gated by that flag** (add a test asserting `permissions.*`, `audit.*`, `interceptor.*` and `alerts.*` do not read `plan`).

---

## SECTION 8: System Prompt & Interactive UI Card Lifecycle

### 8.1 Exact System Prompt for `/app/api/chat/route.ts`

```text
You are CtrlPay, a defensive personal-finance assistant for university students in Malaysia (USM / UPM). You protect users from impulse spending and zombie subscriptions. You advise and prepare; the human always decides.

NUMBERS (strict):
- You must NEVER invent, estimate, or calculate any money figure, probability, or percentage yourself.
- Always call the server-side tools first (run_what_if_simulation, get_budget_insights, analyze_zombies, etc.) and quote ONLY numbers returned by those tools or present in the user's ledger context.
- You only extract the user's intent and identifiers (targetItem, itemPrice as the user stated it, category, subscriptionId, durationDays). The server computes every contract term (rewards, savings, budget reductions).
- Never output URLs. Never write links; the app shows approved links from its own registry.

WHEN TO INTERVENE:
- For any purchase the user is considering, call run_what_if_simulation first.
- Propose a contract ONLY IF the result says riskLevel is HIGH or CRITICAL, or limitBreach is true. Use propose_quarantine for an impulse WANT, propose_escrow for a WANTS-category budget lock, propose_sweep for a subscription downgrade/cancel.
- NON-INTERVENTION EXIT PATH: if the user asks a general question, or riskLevel is LOW or MEDIUM, answer helpfully and briefly in student-friendly language. Do NOT force a Quarantine or Escrow. Say plainly that the purchase looks affordable and what today's allowance would be, using tool numbers.
- Never propose a contract for NEEDS (Bills_Utilities, Campus_Cafeteria_Basic, Medical, Transport_Essential). Give advice only.

AUTHORITY:
- If the Master Autonomy Switch is OFF, only use read-only (T0) tools.
- You cannot move money, cancel subscriptions, or send emails. You can only propose. After you call a propose_* tool, STOP and wait: the user will Approve, Modify, or Decline, and you will receive that result. Then acknowledge their choice in one or two sentences, without pressure and without repeating the proposal. If they declined, respect it and offer one alternative at most.

STYLE:
- Warm, concise, non-judgmental, Gen Z friendly. Never shame the user. Gentle tone unless the user chose Spicy for the roast.
- Every monetary explanation includes a student benchmark taken from the tool output (e.g. "that's about 20 USM cafeteria mixed rice meals at RM 9, or a bubble tea at RM 15"). Do not compute the benchmark yourself.
- Never ask for or repeat bank account numbers, IC numbers, or phone numbers. If the user types them, tell them you do not need them.
- Do not give investment advice or recommend financial products. CtrlPay is a budgeting and protection tool, not a bank, lender, or wealth manager.
```

### 8.2 Tool Registry (route-level wiring, AI SDK v4)

| Tool | Tier | `execute` on server? | Resolves via |
|---|---|---|---|
| `run_what_if_simulation` | T0 | Yes (calls `runWhatIfSimulation`) | server |
| `get_budget_insights` | T0 | Yes | server |
| `analyze_zombies` | T0 | Yes | server |
| `flag_suspected_zombie` | T1 | Yes | server |
| `draft_cancellation` | T2 | Yes (returns a registry-based mailto draft descriptor, not a free-form URL) | server |
| `generate_roast` | T0 | Yes (engine numbers + LLM prose, verified) | server |
| `propose_quarantine` | T3 | **No** | card → `addToolResult` |
| `propose_escrow` | T3 | **No** | card → `addToolResult` |
| `propose_sweep` | T3 | **No** | card → `addToolResult` |

Implementation note (updated 2026-10): the live route uses `lib/groq-client.ts`
with the Groq Chat Completions API and `openai/gpt-oss-120b`. Groq has retired
Llama 3.x models including `llama-3.3-70b-versatile`; `resolveGroqModel()`
rejects those overrides and falls back to the current production model. The AI
SDK v4 browser client is fed by `createDataStreamResponse`. T0–T2 tools still
execute server-side and are audit-logged. T3 tools return a card and resume
through `addToolResult` with an opaque in-app tool-call context, exactly as
described above.

Sandbox note: because the sandbox ledger lives in the browser, the client posts a `ledgerSnapshot` that the server treats as **user-supplied data**. The server recomputes every derived figure and signs proposals itself; production would read the ledger from a server database. (Residual risk listed in Section 10.)

### 8.3 Three-Option Interactive Contract Cards

`<EscrowCard>`, `<QuarantineCard>` and `<SweepCard>` live in `components/agent-chat.tsx` (or sub-files), rendered from `part.toolInvocation` when `state === 'call'`. On mount, the card calls `POST /api/proposals` with the tool args; the server runs the engine, enforces the Needs/Wants floor and AI Mandate, signs, stores and returns the **signed proposal**, which the card displays. Each card **MUST** render three actions:

| Action | Behavior |
|---|---|
| **[Approve & Sign]** | `POST /api/proposals/{id}/decision` (server verifies `integrityHash`, tier, mandate) → store `applyDecision` → audit log with `authorization_ref = USER_CLICK_APPROVE_PROPOSAL_<id4>` → `addToolResult({ toolCallId, result: { status: 'APPROVED', proposalId, authorizationRef } })` |
| **[Modify Terms]** | Slider for `durationDays` / `dailyBudgetReduction` clamped to the safe bounds returned by the server (`maxAllowedReduction`, mandate caps) → server re-signs the modified terms → audit log `MODIFIED` → `addToolResult({ toolCallId, result: { status: 'MODIFIED', proposalId, newTerms, authorizationRef } })` |
| **[Decline]** | Dismiss → audit log `DECLINED` → `addToolResult({ toolCallId, result: { status: 'DECLINED', proposalId } })` |

Card UX rules: show `shortfallProbability`, `cfar95` and the student-unit translation on the card; show "You are always in control. Nothing moves until you click." Card buttons disabled after the first click (idempotency). Card states after resolution render as a read-only summary chip.

---

## SECTION 9: Step-by-Step Implementation Phases (Phases 1 to 6)

Build sequentially. Do not start a phase until the previous one passes its **Done-when** check.

### Phase 1 — Foundation, Types & Registry
- Scaffold Next.js 14+ App Router, TypeScript strict, Tailwind, Shadcn UI, Framer Motion, Zustand, Zod; install the pinned AI SDK versions (Section 2.2).
- **`lib/types.ts`**: all Zod schemas from Section 4.3 (enums, tool inputs, proposal/terms, decisions, mandates).
- **`lib/subscription-registry.ts`**: `SUBSCRIPTION_REGISTRY` and `SubscriptionIdSchema` (Section 4.2).
- **`lib/mock-data.ts`**: 45 days of historical daily spend, recurring transactions, subscriptions, mock Gmail receipt records, initial balance and limits (all `DEMO_CONFIG`).
- **Done when:** `tsc --noEmit` passes; registry test asserts HTTPS links and valid mailto addresses.

### Phase 2 — Deterministic Engine & Guardrails
- **`lib/quant-engine.ts`**: `runWhatIfSimulation`, `calculateAmortizedSubscriptions`, `validateEscrowFloor`, `calculateSubscriptionMetrics`, `calculateQuarantineReward`, `signProposal`, `verifyProposal`, seeded PRNG.
- **`lib/zombie-radar.ts`**: recurring detection and tagging (Section 5.3).
- **`lib/privacy-guard.ts`**: redaction, tenant helpers, `verifyNumbers(reply, engineOutputs, ledger)`.
- **`lib/audit-logger.ts`**: hash-chained append-only log and `verifyChain`.
- **Done when:** unit tests pass: same seed → same CFaR output; NEEDS category rejected from escrow; 40% rule and RM 15 floor enforced; PII fixtures masked; number verifier rejects an invented RM figure; tampered audit chain fails verification.

### Phase 3 — State Model & Sandbox Clock
- **`lib/store.ts`**: state from Section 4.4; `advanceClock` implementing the resolution order in Section 5.1; `applyDecision`, quarantine claim/release, sweep two-stage settlement, master autonomy and tier toggles; every mutation writes to the audit log and `console.info('[SANDBOX]', …)`.
- **`components/simulation-toolbar.tsx`**: clock display, `+24 Hours`, `+7 Days`, `Jump to Month-End`, payment-event simulators (GrabFood RM 32, Shopee RM 180), master switch, tier toggles.
- **Done when:** fast-forwarding 24h flips a quarantine to `READY_TO_DECIDE`; crossing a billing date verifies a pending sweep and only then credits `defenseVault`; reward claim before 24h is impossible; total ledger always reconciles (no money created: `defenseVault` growth ≤ verified sweep savings).

### Phase 4 — Chat Route & Tool Pipeline
- **`app/api/chat/route.ts`**: system prompt (Section 8.1), tool registry (Section 8.2), `assertTier`, redaction, T0–T2 server tool loop, T3 card resumption via Groq Chat Completions, number verifier on the final text, AI SDK v4 `createDataStreamResponse` bridge.
- **`app/api/proposals/route.ts`** and **`app/api/proposals/[id]/decision/route.ts`**: create/sign/verify proposals.
- **Done when:** a prompt like "can I buy RM 180 shoes?" calls the simulation first; at LOW risk no contract is proposed; at HIGH risk a `propose_quarantine`/`propose_escrow` call is emitted; schema violations (extra keys, NEEDS category lock, a `deepLinkUrl` key) are rejected.

### Phase 5 — Proactive Dashboard & Chat UI
- **`components/subscription-timeline.tsx`**: 30-day scroll strip, red billing badges, amortization toggle, fast-forward integration (Section 5.1).
- **`components/payment-interceptor-modal.tsx`**: auto What-If on payment event, intercept modal with Quarantine/Escrow/Proceed.
- **`components/agent-chat.tsx`**: `useChat` from `@ai-sdk/react` (v4), `maxSteps: 5`, `message.parts` rendering, the three contract cards with Approve/Modify/Decline and **guaranteed `addToolResult`** (Section 2.3), Student Downgrade drawer (deep-link + mailto), Zombie confirm chips, Quick Chips, receipt/voice input (P2).
- **`components/audit-drawer.tsx`**: trace list, filters, chain-verified indicator.
- **`app/page.tsx`**: two-panel layout. Left = dashboard (balance, `dynamicDailyAllowance`, `defenseVault`, rewardPool, quarantine/escrow cards, timeline, toolbar). Right = chat. Framer Motion transitions when funds move into Vault/Quarantine.
- **Done when:** the full demo script runs end to end (below) without typing a prompt first.

### Phase 6 — Hardening, Report & Demo Readiness
- Version-grep check (Section 2.2): no v5 identifiers.
- Test the dangling-tool-call path: approve, modify, decline, and "clear chat while pending" all lead to a clean next turn.
- Confirm Free-tier safety features do not read the `plan` flag.
- CSP header (`default-src 'self'`; no third-party scripts) and `next.config` security headers.
- Security Self-Assessment (Section 10): privacy-by-default rationale (no survey data or fabricated numbers); sandbox registry/pricing disclosures recorded.
- Rehearse the **5-minute demo script:**
  1. Open dashboard: Master Switch OFF → only T0 analysis available.
  2. Click `Simulate Shopee RM 180 Impulse Buy` → auto CFaR → intercept modal with shortfall probability.
  3. Accept 24h Quarantine → `LOCKED_24H`.
  4. Timeline `+24 Hours` → READY_TO_DECIDE → "Abandon Purchase & Claim Reward" (reward comes from rewardPool).
  5. Zombie Radar flags Spotify full price → OTP → drawer → deep-link / mailto → PendingSweep.
  6. `Jump to Month-End` → sweep verified, Vault credited, Roast shown (Gentle/Spicy).
  7. Open the Audit Drawer: show `data_accessed`, `authorization_ref`, chain verified.

**Repository file map (build order):**

```text
lib/types.ts
lib/subscription-registry.ts
lib/mock-data.ts
lib/quant-engine.ts
lib/zombie-radar.ts
lib/privacy-guard.ts
lib/audit-logger.ts
lib/store.ts
lib/system-prompt.ts
lib/server-tools.ts
app/api/chat/route.ts
app/api/proposals/route.ts
app/api/proposals/[id]/decision/route.ts
components/simulation-toolbar.tsx
components/subscription-timeline.tsx
components/payment-interceptor-modal.tsx
components/agent-chat.tsx
components/audit-drawer.tsx
app/page.tsx
```

---

## SECTION 10: Security Self-Assessment Report (安全自评报告, Mandatory Deliverable)

### 10.1 Security Control Matrix

| 控制项 (Control Item) | 对应层级 (Layer) | 实现方式 (Implementation) | 验证方式 (Verification Method) | 残余风险 (Residual Risk) |
|---|---|---|---|---|
| **(1) Human Confirmation & Tiered Autonomy 人工确认与分级授权** (T0–T3 + default-OFF Master Switch + Dual Mandates) | Application / Authorization 应用层·授权层 | Master Autonomy Switch default OFF; tiers T0–T3; T3 always needs an explicit per-action click; `assertTier` runs server-side; User Spending Limit vs. AI Mandate Limit enforced in `validateEscrowFloor` and proposal creation; Needs categories can never be locked; max 40% reduction and a daily survival floor | Unit tests for tier gating and mandate rejection; live demo toggling the switch; attempt a T3 action without a click (rejected + logged); audit entries show `authorization_ref` | Sandbox session is not strongly authenticated; production needs real identity, step-up authentication and device binding. A user can still approve a harmful-but-allowed contract (mitigated by floors and caps). |
| **(2) Network, Environment & Pop-up Safety 网络环境与弹窗安全** | Platform / Transport 平台层·传输层 | HTTPS-only deployment, strict CSP and security headers, **zero third-party ad scripts**, no pop-up ads. Wi-Fi detection and malicious pop-up blocking are **Platform-Layer controls** (OS/browser), documented as out of the web app's authority | Inspect response headers and network tab (no third-party requests); CSP report; dependency list review | A web app cannot detect hostile Wi-Fi or malicious pop-ups from other apps. Users rely on OS/browser protections. A mobile production version should add certificate pinning. |
| **(3) Full-Lifecycle AI Audit Logging AI 全流程审计** | Audit / Accountability 审计层 | Append-only, hash-chained log recording `logId, timestamp, actor, actionType, permissionTier, data_accessed (field names only), authorization_ref, proposal_hash, status`; "immutable trace drawer" for users | `verifyChain()` detects tampering; every demo action appears in the drawer; tests assert every tool call writes an entry | Sandbox log lives in server memory/localStorage and can be wiped by the operator; production needs WORM / append-only storage with external anchoring. |
| **(4) Three-Stage Privacy & Hallucination Guardrails 三段式隐私与幻觉防护** | Data / Model 数据层·模型层 | (a) Pre-LLM PII masking (accounts, IC, phone, names); (b) per-user tenant isolation by `userId` from the session; (c) Zod `.strict()` + post-LLM RM number verifier tied to engine/ledger outputs; **receipt OCR images are never written to disk** (processed in memory, discarded after structured extraction and user confirmation); server-side authority (LLM never computes numbers) with signed proposals | PII fixture tests; number-verifier test with an injected fake figure; cross-user access test; check that no image file or blob persists after OCR | Regex redaction can miss unusual formats; the LLM provider still sees redacted transaction text; browser speech recognition may send audio to the cloud (disclosed in UI); the verifier checks numbers, not the semantic correctness of advice. |
| **(5) Identity & Student Privilege Verification 身份与学生资格验证** | Identity 身份层 | Data-minimized **Student Email (.edu / USM) OTP** in the sandbox; no ID/passport/face data collected; production path: **integrate a licensed third-party eKYC provider** | Demo OTP flow; confirm no ID uploads exist in the codebase; data inventory shows only email and verified flag | Sandbox OTP is simulated, so it proves flow, not identity. Student emails can be shared or misused; production requires a licensed eKYC/institution verification partner. |
| **(6) Safe Navigator Deep-Link & `mailto:` Execution 安全导航与邮件草稿** | Execution / Integrity 执行层 | Hardcoded `SUBSCRIPTION_REGISTRY` HTTPS whitelist keyed by `subscriptionId` enum (the LLM cannot supply URLs); `mailto:` drafts built **client-side** from registry templates; CtrlPay holds **no autonomous credentials and no OAuth write access**; links open with `noopener noreferrer` | Registry unit test (HTTPS only, valid recipients); attempt to pass `deepLinkUrl` in a tool call (rejected by `.strict()`); code search for Gmail send scopes (none) | Registry entries can go stale if merchants change URLs (needs a maintenance and verification process); the user can edit the draft before sending; the mail client is outside our control. |

### 10.2 Privacy-by-Default Design Rationale

> **No survey sample size or willingness percentage is claimed in this submission.** The rationale
> below is qualitative; no user data is fabricated.

CtrlPay assumes **zero trust** toward silent background scanning and autonomous money movement until
the user explicitly opts in. The resulting decisions are: Gmail receipt access is opt-in /
read-only / structured-fields-only; bank statement upload is not required for any core feature; GPS is
not collected (replaced by the 12:00 PM summary); IC/passport/facial data is not collected (student
OTP only; licensed eKYC in production).

These decisions are enforced by the Master Autonomy Switch default OFF, T0–T3 tiers, dual mandate
limits, the NEEDS-protection floor and per-action T3 authorization. `SUBSCRIPTION_REGISTRY` prices
and links are a sandbox snapshot (last verified 2026-03-01); Pro pricing is a team hypothesis; all
defensive controls are permanently free (ethical freemium, enforced by `tests/compliance.test.ts`).

### 10.3 IP & Asset Compliance Statement

External **Behance UI links are used strictly for high-level visual inspiration and moodboarding**. We did not copy layouts, assets, illustrations or brand materials from them. All UI layouts, Shadcn/Tailwind components, icons (**Lucide**, open-source license) and the **sandbox datasets are 100% original or open-source licensed**, in compliance with the FinTechathon anti-plagiarism rules. Third-party merchant names in the registry are used only as descriptive labels for mock data; no merchant logos are included. All dependencies and their licenses are listed in `THIRD_PARTY_LICENSES.md`.

### 10.4 Disclosures (for judge Q&A)

- **Not a financial institution:** CtrlPay is a budgeting/protection tool. No real funds, no deposits, no interest, no investment advice. `defenseVault` is a labeled sandbox ledger bucket.
- **Model limits:** CFaR is a historical-bootstrap estimate under an independent-days assumption; the UI shows the "limited history" warning when data is short.
- **Demo values:** prices, thresholds, rewards and plan pricing are sandbox configuration, to be validated with real merchants and market data before any production launch.
- **Open Banking / merchant webhooks** are represented by mock event buttons in the sandbox.

---

*End of plan.md*
