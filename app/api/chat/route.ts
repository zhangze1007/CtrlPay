import { convertToCoreMessages, streamText, tool } from 'ai';
import { google } from '@ai-sdk/google';
import {
  AnalyzeZombiesInputSchema,
  DraftCancellationInputSchema,
  FlagSuspectedZombieInputSchema,
  GenerateRoastInputSchema,
  GetBudgetInsightsInputSchema,
  ProposeEscrowInputSchema,
  ProposeQuarantineInputSchema,
  ProposeSweepInputSchema,
  RunWhatIfInputSchema,
  TierStateSchema,
} from '@/lib/types';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { redactMessages, verifyNumbers } from '@/lib/privacy-guard';
import { getUserIdFromSession } from '@/lib/session';
import { auditLog } from '@/lib/audit-logger';
import { parseLedgerSnapshot } from '@/lib/ledger';
import { assertTier, type TierState } from '@/lib/permissions';
import {
  analyzeZombiesForUser,
  draftCancellationForUser,
  flagSuspectedZombieForUser,
  generateRoastForUser,
  getBudgetInsightsForUser,
  runWhatIfForUser,
} from '@/lib/server-tools';
import { toISODateTime } from '@/lib/utils';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatRequestBody {
  messages?: unknown[];
  ledgerSnapshot?: unknown;
  autonomy?: TierState;
}

export async function POST(req: Request) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return Response.json(
      {
        error: 'MISSING_API_KEY',
        message:
          'GOOGLE_GENERATIVE_AI_API_KEY is not set. Copy .env.example to .env.local and add your Gemini key to enable the agent chat. The dashboard, Zombie Radar, timeline and audit log work without a key.',
      },
      { status: 503 },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return Response.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  // userId comes ONLY from the signed session cookie, never the body or the LLM.
  const userId = getUserIdFromSession(req);

  let snapshot;
  try {
    snapshot = parseLedgerSnapshot(body.ledgerSnapshot);
  } catch (err) {
    return Response.json(
      { error: 'INVALID_LEDGER_SNAPSHOT', message: (err as Error).message },
      { status: 400 },
    );
  }

  // The autonomy payload is untrusted input. Validate its exact shape: a missing
  // payload defaults to the safe T0-only posture; a malformed one is rejected.
  let autonomy: TierState = {
    masterAutonomyEnabled: false,
    enabledTiers: { T0: true, T1: false, T2: false, T3: false },
  };
  if (body.autonomy !== undefined) {
    const parsedAutonomy = TierStateSchema.safeParse(body.autonomy);
    if (!parsedAutonomy.success) {
      return Response.json(
        { error: 'INVALID_AUTONOMY', issues: parsedAutonomy.error.issues.map((i) => i.message) },
        { status: 400 },
      );
    }
    autonomy = parsedAutonomy.data;
  }

  // Deterministic tool outputs for the post-LLM number verifier.
  const engineOutputs: unknown[] = [];

  // Guard helper for the server-executed tools. T3 tools have NO execute here.
  const guard = (toolName: string) => (args: unknown) => {
    const check = assertTier(toolName, autonomy);
    if (!check.ok) {
      auditLog.append(
        {
          sandboxClock: toISODateTime(snapshot.sandboxClock),
          actor: 'AGENT',
          actionType: `${toolName.toUpperCase()}_BLOCKED`,
          permissionTier: check.tier,
          data_accessed: [],
          authorization_ref: 'TIER_GATE_REJECTED',
          proposal_hash: null,
          status: 'BLOCKED',
        },
        userId,
      );
      throw new Error(`TIER_BLOCKED: ${check.reason}`);
    }
    void args;
  };

  const messages = redactMessages(
    convertToCoreMessages((body.messages ?? []) as never[]) as never,
  ) as never;

  // Gemini 2.0 Flash was shut down on 1 June 2026. Keep the model
  // environment-configurable so a valid key can switch without a code change.
  // Gemini 3.x cannot be used here yet: its stateless tool-calling flow requires
  // thought signatures, which AI SDK v4's Google provider does not preserve.
  const modelId = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

  const result = streamText({
    model: google(modelId),
    system: SYSTEM_PROMPT,
    messages,
    maxSteps: 5,
    temperature: 0.4,
    onError: ({ error }) => {
      console.error('[CHAT_STREAM_ERROR]', error);
    },
    tools: {
      run_what_if_simulation: tool({
        description:
          'Simulate the effect of a purchase on month-end cash flow. Returns engine numbers only.',
        parameters: RunWhatIfInputSchema,
        execute: async (args) => {
          guard('run_what_if_simulation')(args);
          const out = runWhatIfForUser(userId, snapshot, args);
          engineOutputs.push(out);
          return out;
        },
      }),
      get_budget_insights: tool({
        description: 'Return the current dynamic daily allowance and budget breakdown.',
        parameters: GetBudgetInsightsInputSchema,
        execute: async (args) => {
          guard('get_budget_insights')(args);
          const out = getBudgetInsightsForUser(userId, snapshot);
          engineOutputs.push(out);
          return out;
        },
      }),
      analyze_zombies: tool({
        description:
          'Analyse recurring transactions and subscriptions; tags zombies and finds student-downgrade opportunities.',
        parameters: AnalyzeZombiesInputSchema,
        execute: async (args) => {
          guard('analyze_zombies')(args);
          const out = analyzeZombiesForUser(userId, snapshot);
          engineOutputs.push(out);
          return out;
        },
      }),
      flag_suspected_zombie: tool({
        description: 'Record the user answer to the one-click zombie usage question (T1).',
        parameters: FlagSuspectedZombieInputSchema,
        execute: async (args) => {
          guard('flag_suspected_zombie')(args);
          const out = flagSuspectedZombieForUser(userId, snapshot, args);
          engineOutputs.push(out);
          return out;
        },
      }),
      draft_cancellation: tool({
        description:
          'Return a registry-based mailto: draft descriptor (T2). Never returns a free-form URL.',
        parameters: DraftCancellationInputSchema,
        execute: async (args) => {
          guard('draft_cancellation')(args);
          const out = draftCancellationForUser(userId, snapshot, args);
          engineOutputs.push(out);
          return out;
        },
      }),
      generate_roast: tool({
        description:
          'Return engine numbers for the Month-End Subscription Roast. You write the prose only.',
        parameters: GenerateRoastInputSchema,
        execute: async (args) => {
          guard('generate_roast')(args);
          const out = generateRoastForUser(userId, snapshot, args);
          engineOutputs.push(out);
          return out;
        },
      }),
      // ---- T3 contract tools: NO `execute`. The client card resolves them. ----
      propose_quarantine: tool({
        description:
          'Propose a 24h commitment Quarantine for an impulse WANT purchase. Only when risk is HIGH/CRITICAL or a limit is breached. NEEDS can never be quarantined.',
        parameters: ProposeQuarantineInputSchema,
      }),
      propose_escrow: tool({
        description:
          'Propose a WANTS-category budget Escrow. Only when risk is HIGH/CRITICAL or a limit is breached.',
        parameters: ProposeEscrowInputSchema,
      }),
      propose_sweep: tool({
        description:
          'Propose a student downgrade or cancellation for a registry subscription.',
        parameters: ProposeSweepInputSchema,
      }),
    },
    onFinish: ({ text }) => {
      // Post-LLM numerical hallucination verifier. Engine tool outputs AND the
      // user's ledger are the only allowed sources of RM figures.
      const verification = verifyNumbers(text, engineOutputs, snapshot);
      auditLog.append(
        {
          sandboxClock: toISODateTime(snapshot.sandboxClock),
          actor: 'AGENT',
          actionType: verification.ok ? 'NUMBER_VERIFIER_PASSED' : 'NUMBER_VERIFIER_BLOCKED',
          permissionTier: 'T0',
          data_accessed: ['engine.outputs', 'ledger'],
          authorization_ref: 'POST_LLM_VERIFIER',
          proposal_hash: null,
          status: verification.ok ? 'EXECUTED' : 'DECLINED',
        },
        userId,
      );
      if (!verification.ok) {
        console.warn('[NUMBER_VERIFIER_BLOCKED] unverified figures:', verification.invalid);
      }
    },
  });

  return result.toDataStreamResponse({
    getErrorMessage: (error) => {
      // Never return provider credentials or a raw URL. A short, actionable
      // message is enough to distinguish model/key/network failures in the UI.
      const raw = error instanceof Error ? error.message : String(error);
      const safe = raw.replace(/https?:\/\/\S+/g, '[provider-url]').slice(0, 240);
      return `Agent error: ${safe}`;
    },
  });
}
