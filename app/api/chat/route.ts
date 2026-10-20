import { createDataStreamResponse, formatDataStreamPart } from 'ai';
import type { ZodTypeAny } from 'zod';
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
import type {
  DraftCancellationInput,
  FlagSuspectedZombieInput,
  GenerateRoastInput,
  RunWhatIfInput,
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
import { isT3ContractTool } from '@/lib/tool-resolution';
import {
  buildFunctionResult,
  buildTranscript,
  createGeminiInteraction,
  decodeToolCallId,
  encodeToolCallId,
  extractFunctionCalls,
  extractModelText,
  functionDeclaration,
  resolveGeminiModel,
  toSafeAgentError,
  type GeminiFunctionCall,
  type GeminiFunctionDeclaration,
  type GeminiFunctionResultInput,
  type GeminiInteraction,
} from '@/lib/gemini-interactions';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ChatRequestBody {
  messages?: unknown[];
  ledgerSnapshot?: unknown;
  autonomy?: TierState;
}

interface RawToolInvocation {
  state?: string;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: unknown;
}

interface RawPart {
  type?: string;
  text?: string;
  toolInvocation?: RawToolInvocation;
}

interface RawMessage {
  role?: string;
  content?: unknown;
  parts?: RawPart[];
}

interface PendingToolResult {
  toolCallId: string;
  toolName: string;
  result: unknown;
}

/** T3 tools are resolved by the contract card, never executed on the server. */
const T3_TOOL_DESCRIPTIONS: Record<string, string> = {
  propose_quarantine:
    'Propose a 24h commitment Quarantine for an impulse WANT purchase. Only when risk is HIGH/CRITICAL or a limit is breached. NEEDS can never be quarantined.',
  propose_escrow:
    'Propose a WANTS-category budget Escrow. Only when risk is HIGH/CRITICAL or a limit is breached.',
  propose_sweep:
    'Propose a student downgrade or cancellation for a registry subscription.',
};

const TOOL_DECLARATIONS: GeminiFunctionDeclaration[] = [
  functionDeclaration(
    'run_what_if_simulation',
    'Simulate the effect of a purchase on month-end cash flow. Returns engine numbers only.',
    RunWhatIfInputSchema,
  ),
  functionDeclaration(
    'get_budget_insights',
    'Return the current dynamic daily allowance and budget breakdown.',
    GetBudgetInsightsInputSchema,
  ),
  functionDeclaration(
    'analyze_zombies',
    'Analyse recurring transactions and subscriptions; tags zombies and finds student-downgrade opportunities.',
    AnalyzeZombiesInputSchema,
  ),
  functionDeclaration(
    'flag_suspected_zombie',
    'Record the user answer to the one-click zombie usage question (T1).',
    FlagSuspectedZombieInputSchema,
  ),
  functionDeclaration(
    'draft_cancellation',
    'Return a registry-based mailto: draft descriptor (T2). Never returns a free-form URL.',
    DraftCancellationInputSchema,
  ),
  functionDeclaration(
    'generate_roast',
    'Return engine numbers for the Month-End Subscription Roast. You write the prose only.',
    GenerateRoastInputSchema,
  ),
  functionDeclaration(
    'propose_quarantine',
    T3_TOOL_DESCRIPTIONS.propose_quarantine,
    ProposeQuarantineInputSchema,
  ),
  functionDeclaration(
    'propose_escrow',
    T3_TOOL_DESCRIPTIONS.propose_escrow,
    ProposeEscrowInputSchema,
  ),
  functionDeclaration(
    'propose_sweep',
    T3_TOOL_DESCRIPTIONS.propose_sweep,
    ProposeSweepInputSchema,
  ),
];

function extractPendingToolResults(messages: RawMessage[]): PendingToolResult[] {
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant') return [];

  const out: PendingToolResult[] = [];
  for (const part of last.parts ?? []) {
    if (part.type !== 'tool-invocation') continue;
    const inv = part.toolInvocation;
    if (!inv || inv.state !== 'result' || !inv.toolCallId) continue;
    if (!inv.toolCallId.startsWith('gem_')) continue;
    const toolName = inv.toolName || decodeToolCallId(inv.toolCallId)?.n;
    if (!toolName) continue;
    out.push({ toolCallId: inv.toolCallId, toolName, result: inv.result });
  }
  return out;
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

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const model = resolveGeminiModel();
  const rawMessages = Array.isArray(body.messages) ? (body.messages as RawMessage[]) : [];
  const pendingToolResults = extractPendingToolResults(rawMessages);

  // Deterministic tool outputs for the post-LLM number verifier.
  const engineOutputs: unknown[] = [];

  const guard = (toolName: string) => {
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
  };

  const SERVER_TOOLS: Record<
    string,
    { schema: ZodTypeAny; run: (args: unknown) => unknown }
  > = {
    run_what_if_simulation: {
      schema: RunWhatIfInputSchema,
      run: (args) => runWhatIfForUser(userId, snapshot, args as RunWhatIfInput),
    },
    get_budget_insights: {
      schema: GetBudgetInsightsInputSchema,
      run: () => getBudgetInsightsForUser(userId, snapshot),
    },
    analyze_zombies: {
      schema: AnalyzeZombiesInputSchema,
      run: () => analyzeZombiesForUser(userId, snapshot),
    },
    flag_suspected_zombie: {
      schema: FlagSuspectedZombieInputSchema,
      run: (args) => flagSuspectedZombieForUser(userId, snapshot, args as FlagSuspectedZombieInput),
    },
    draft_cancellation: {
      schema: DraftCancellationInputSchema,
      run: (args) => draftCancellationForUser(userId, snapshot, args as DraftCancellationInput),
    },
    generate_roast: {
      schema: GenerateRoastInputSchema,
      run: (args) => generateRoastForUser(userId, snapshot, args as GenerateRoastInput),
    },
  };

  function executeServerTool(call: GeminiFunctionCall): { ok: boolean; result: unknown } {
    const def = SERVER_TOOLS[call.name];
    if (!def) {
      return { ok: false, result: { error: 'UNKNOWN_TOOL', name: call.name } };
    }
    try {
      guard(call.name);
      const parsed = def.schema.safeParse(call.arguments);
      if (!parsed.success) {
        return {
          ok: false,
          result: {
            error: 'INVALID_TOOL_ARGUMENTS',
            issues: parsed.error.issues.map((issue) => issue.message),
          },
        };
      }
      const result = def.run(parsed.data);
      engineOutputs.push(result);
      return { ok: true, result };
    } catch (err) {
      return { ok: false, result: { error: (err as Error).message } };
    }
  }

  return createDataStreamResponse({
    onError: (error) => {
      console.error('[CHAT_STREAM_ERROR]', error);
      return toSafeAgentError(error);
    },
    execute: async (dataStream) => {
      const finalize = (text: string) => {
        const verification = verifyNumbers(text, engineOutputs, snapshot);
        auditLog.append(
          {
            sandboxClock: toISODateTime(snapshot.sandboxClock),
            actor: 'AGENT',
            actionType: verification.ok
              ? 'NUMBER_VERIFIER_PASSED'
              : 'NUMBER_VERIFIER_BLOCKED',
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
        dataStream.write(formatDataStreamPart('text', text));
        dataStream.write(formatDataStreamPart('finish_message', { finishReason: 'stop' }));
      };

      const processInteraction = async (initial: GeminiInteraction): Promise<void> => {
        let interaction = initial;

        for (let round = 0; round < 6; round += 1) {
          const calls = extractFunctionCalls(interaction);
          if (calls.length === 0) {
            const text = extractModelText(interaction);
            if (!text) {
              throw new Error(
                `Gemini finished without text (status: ${interaction.status}).`,
              );
            }
            finalize(text);
            return;
          }

          const serverCalls = calls.filter((call) => !isT3ContractTool(call.name));
          const t3Calls = calls.filter((call) => isT3ContractTool(call.name));
          const deferredResults: Array<{ n: string; c: string; r: unknown }> = [];

          for (const call of serverCalls) {
            const outcome = executeServerTool(call);
            deferredResults.push({ n: call.name, c: call.id, r: outcome.result });
          }

          if (t3Calls.length > 0) {
            for (const call of t3Calls) {
              const toolCallId = encodeToolCallId({
                i: interaction.id,
                c: call.id,
                n: call.name,
                ...(deferredResults.length > 0 ? { d: deferredResults } : {}),
              });
              dataStream.write(
                formatDataStreamPart('tool_call', {
                  toolCallId,
                  toolName: call.name,
                  args: call.arguments,
                }),
              );
            }
            dataStream.write(
              formatDataStreamPart('finish_message', { finishReason: 'tool-calls' }),
            );
            return;
          }

          interaction = await createGeminiInteraction({
            apiKey,
            model,
            systemInstruction: SYSTEM_PROMPT,
            input: deferredResults.map((item) =>
              buildFunctionResult(item.n, item.c, item.r),
            ),
            tools: TOOL_DECLARATIONS,
            previousInteractionId: interaction.id,
          });
        }

        throw new Error('Agent exceeded the maximum number of tool steps.');
      };

      try {
        if (pendingToolResults.length > 0) {
          const decoded = pendingToolResults
            .map((item) => ({ item, payload: decodeToolCallId(item.toolCallId) }))
            .filter(
              (entry): entry is { item: PendingToolResult; payload: NonNullable<ReturnType<typeof decodeToolCallId>> } =>
                Boolean(entry.payload),
            );

          if (decoded.length === 0) {
            throw new Error('The contract decision could not be matched to its Gemini interaction.');
          }

          const interactionId = decoded[0].payload.i;
          if (decoded.some((entry) => entry.payload.i !== interactionId)) {
            throw new Error('Mixed Gemini interactions in one contract decision.');
          }

          const input: Array<Record<string, unknown> | GeminiFunctionResultInput> = [];
          const seenServerCalls = new Set<string>();
          for (const entry of decoded) {
            for (const deferred of entry.payload.d ?? []) {
              if (seenServerCalls.has(deferred.c)) continue;
              seenServerCalls.add(deferred.c);
              input.push(buildFunctionResult(deferred.n, deferred.c, deferred.r));
            }
          }
          for (const entry of decoded) {
            input.push(
              buildFunctionResult(
                entry.item.toolName,
                entry.payload.c,
                entry.item.result,
              ),
            );
            engineOutputs.push(entry.item.result);
          }

          const next = await createGeminiInteraction({
            apiKey,
            model,
            systemInstruction: SYSTEM_PROMPT,
            input,
            tools: TOOL_DECLARATIONS,
            previousInteractionId: interactionId,
          });
          await processInteraction(next);
          return;
        }

        const transcript = buildTranscript(
          redactMessages(rawMessages as never[]) as never,
        );
        if (!transcript.trim()) {
          throw new Error('No user message was provided.');
        }

        const first = await createGeminiInteraction({
          apiKey,
          model,
          systemInstruction: SYSTEM_PROMPT,
          input: transcript,
          tools: TOOL_DECLARATIONS,
        });
        await processInteraction(first);
      } catch (error) {
        console.error('[CHAT_AGENT_ERROR]', error);
        dataStream.write(formatDataStreamPart('error', toSafeAgentError(error)));
      }
    },
  });
}
