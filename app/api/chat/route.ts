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
  buildTranscript,
  createGroqCompletion,
  decodeToolCallId,
  encodeToolCallId,
  extractGroqText,
  extractGroqToolCalls,
  groqToolDefinition,
  resolveGroqApiKey,
  resolveGroqModel,
  toSafeAgentError,
  type GroqMessage,
  type GroqToolDefinition,
  type ParsedToolCall,
} from '@/lib/groq-client';

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

const TOOL_DEFINITIONS: GroqToolDefinition[] = [
  groqToolDefinition(
    'run_what_if_simulation',
    'Simulate the effect of a purchase on month-end cash flow. Returns engine numbers only.',
    RunWhatIfInputSchema,
  ),
  groqToolDefinition(
    'get_budget_insights',
    'Return the current dynamic daily allowance and budget breakdown.',
    GetBudgetInsightsInputSchema,
  ),
  groqToolDefinition(
    'analyze_zombies',
    'Analyse recurring transactions and subscriptions; tags zombies and finds student-downgrade opportunities.',
    AnalyzeZombiesInputSchema,
  ),
  groqToolDefinition(
    'flag_suspected_zombie',
    'Record the user answer to the one-click zombie usage question (T1).',
    FlagSuspectedZombieInputSchema,
  ),
  groqToolDefinition(
    'draft_cancellation',
    'Return a registry-based mailto: draft descriptor (T2). Never returns a free-form URL.',
    DraftCancellationInputSchema,
  ),
  groqToolDefinition(
    'generate_roast',
    'Return engine numbers for the Month-End Subscription Roast. You write the prose only.',
    GenerateRoastInputSchema,
  ),
  groqToolDefinition(
    'propose_quarantine',
    T3_TOOL_DESCRIPTIONS.propose_quarantine,
    ProposeQuarantineInputSchema,
  ),
  groqToolDefinition(
    'propose_escrow',
    T3_TOOL_DESCRIPTIONS.propose_escrow,
    ProposeEscrowInputSchema,
  ),
  groqToolDefinition(
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
    if (!inv.toolCallId.startsWith('groq_')) continue;
    const toolName = inv.toolName || decodeToolCallId(inv.toolCallId)?.n;
    if (!toolName) continue;
    out.push({ toolCallId: inv.toolCallId, toolName, result: inv.result });
  }
  return out;
}

export async function POST(req: Request) {
  const apiKey = resolveGroqApiKey();
  if (!apiKey) {
    return Response.json(
      {
        error: 'MISSING_API_KEY',
        message:
          'GROQ_API_KEY is not set. Add your Groq API key to the environment variables (Vercel dashboard or .env.local) to enable the agent chat. The dashboard, Zombie Radar, timeline and audit log work without a key.',
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

  const model = resolveGroqModel();
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

  function executeServerTool(call: ParsedToolCall): { ok: boolean; result: unknown } {
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

      /**
       * Multi-round tool-call loop.
       * Groq is stateless, so we accumulate the full messages array across rounds.
       */
      const processCompletion = async (messages: GroqMessage[]): Promise<void> => {
        let conversationMessages = [...messages];

        for (let round = 0; round < 6; round += 1) {
          const assistantMessage = await createGroqCompletion({
            apiKey,
            model,
            messages: conversationMessages,
            tools: TOOL_DEFINITIONS,
          });

          const calls = extractGroqToolCalls(assistantMessage);

          if (calls.length === 0) {
            const text = extractGroqText(assistantMessage);
            if (!text) {
              throw new Error(
                `Groq finished without text (finish_reason: unknown).`,
              );
            }
            finalize(text);
            return;
          }

          // Separate server-side tools from T3 contract tools
          const serverCalls = calls.filter((call) => !isT3ContractTool(call.name));
          const t3Calls = calls.filter((call) => isT3ContractTool(call.name));
          const deferredResults: Array<{ n: string; c: string; r: unknown }> = [];

          // Execute server-side tools only when this turn is not handing a T3
          // contract to the browser. Mixed turns are resolved by the T3 card
          // alone; executing a server tool whose result is never replayed would
          // create a side effect the continuation cannot account for.
          if (t3Calls.length === 0) {
            for (const call of serverCalls) {
              const outcome = executeServerTool(call);
              deferredResults.push({ n: call.name, c: call.id, r: outcome.result });
            }
          }

          if (t3Calls.length > 0) {
            // T3 tools need client resolution — send to browser and stop.
            //
            // Emit at most ONE card per turn. If the model emitted several T3
            // calls, resuming them independently would leave the other
            // tool_calls without results (OpenAI-compatible APIs reject that
            // assistant message). The model can propose the next contract on
            // the next turn instead.
            const call = t3Calls[0];
            if (t3Calls.length > 1) {
              console.warn(
                '[CHAT_AGENT] Dropping extra T3 calls in one turn:',
                t3Calls.slice(1).map((extra) => extra.name),
              );
            }

            // Encode only the call being resumed. The browser must not be able
            // to inject arbitrary server-tool results into the verifier.
            const encodedCall = {
              id: call.id,
              n: call.name,
              a: JSON.stringify(call.arguments),
            };
            const toolCallId = encodeToolCallId({
              tc: [encodedCall],
              c: call.id,
              n: call.name,
            });
            dataStream.write(
              formatDataStreamPart('tool_call', {
                toolCallId,
                toolName: call.name,
                args: call.arguments,
              }),
            );
            dataStream.write(
              formatDataStreamPart('finish_message', { finishReason: 'tool-calls' }),
            );
            return;
          }

          // All tools were server-side: add assistant + tool results and loop
          conversationMessages.push(assistantMessage);
          for (const item of deferredResults) {
            conversationMessages.push({
              role: 'tool',
              tool_call_id: item.c,
              name: item.n,
              content: JSON.stringify(item.r),
            });
          }
        }

        throw new Error('Agent exceeded the maximum number of tool steps.');
      };

      try {
        if (pendingToolResults.length > 0) {
          // T3 continuation: client sent back contract decisions
          const decoded = pendingToolResults
            .map((item) => ({ item, payload: decodeToolCallId(item.toolCallId) }))
            .filter(
              (entry): entry is { item: PendingToolResult; payload: NonNullable<ReturnType<typeof decodeToolCallId>> } =>
                Boolean(entry.payload),
            );

          if (decoded.length === 0) {
            throw new Error('The contract decision could not be matched to its Groq completion.');
          }

          // Rebuild the conversation messages for continuation.
          const transcript = buildTranscript(
            redactMessages(rawMessages as never[]) as never,
          );

          const continuationMessages: GroqMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: transcript },
          ];

          // Reconstruct the assistant message. Only the encoded T3 call is
          // included, so every tool_call in this message has a matching tool
          // result below. Never execute or trust client-supplied server results.
          const firstPayload = decoded[0].payload;
          if (!isT3ContractTool(firstPayload.n)) {
            throw new Error('The contract decision references a non-T3 tool.');
          }
          const selectedCall = firstPayload.tc.find(
            (tc) => tc.id === firstPayload.c && tc.n === firstPayload.n,
          );
          if (!selectedCall) {
            throw new Error('The contract decision is missing its tool-call context.');
          }

          continuationMessages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: selectedCall.id,
                type: 'function',
                function: { name: selectedCall.n, arguments: selectedCall.a },
              },
            ],
          });

          // Add the T3 client result. Only one card is emitted per turn, so
          // only the first result can correspond to the reconstructed call.
          const entry = decoded[0];
          continuationMessages.push({
            role: 'tool',
            tool_call_id: entry.payload.c,
            name: entry.payload.n,
            content: JSON.stringify(entry.item.result),
          });
          engineOutputs.push(entry.item.result);

          await processCompletion(continuationMessages);
          return;
        }

        // Normal flow: new user message
        const transcript = buildTranscript(
          redactMessages(rawMessages as never[]) as never,
        );
        if (!transcript.trim()) {
          throw new Error('No user message was provided.');
        }

        const initialMessages: GroqMessage[] = [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ];

        await processCompletion(initialMessages);
      } catch (error) {
        console.error('[CHAT_AGENT_ERROR]', error);
        dataStream.write(formatDataStreamPart('error', toSafeAgentError(error)));
      }
    },
  });
}
