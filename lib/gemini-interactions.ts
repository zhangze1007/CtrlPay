/**
 * Gemini Interactions API client (server-only).
 *
 * Gemini 2.0 / 2.5 Flash are no longer available to new API keys. The current
 * stable Flash model is Gemini 3.8, which requires the Interactions API for
 * stateful function calling. The AI SDK v4 client is kept for the browser data
 * stream, while this module talks to Gemini directly.
 */
import { zodSchema } from 'ai';
import type { ZodTypeAny } from 'zod';

export const GEMINI_INTERACTIONS_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/interactions';

/** Model used when GEMINI_MODEL is not set. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

export function resolveGeminiModel(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  if (!configured) return DEFAULT_GEMINI_MODEL;

  // A stale Vercel env var must not keep the deployed app on a retired model.
  if (/^gemini-2\.(0|5)(?:-|$)/i.test(configured)) {
    console.warn(
      `[GEMINI_MODEL] ${configured} is retired for new API keys; using ${DEFAULT_GEMINI_MODEL}.`,
    );
    return DEFAULT_GEMINI_MODEL;
  }
  return configured;
}

export interface GeminiFunctionDeclaration {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface GeminiFunctionCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface GeminiInteraction {
  id: string;
  status: string;
  steps?: Array<Record<string, unknown>>;
  output_text?: string;
  error?: { message?: string; code?: string };
}

export interface GeminiFunctionResultInput {
  type: 'function_result';
  name: string;
  call_id: string;
  result: Array<{ type: 'text'; text: string }>;
}

export interface CreateInteractionArgs {
  apiKey: string;
  model: string;
  systemInstruction: string;
  input: string | Array<Record<string, unknown> | GeminiFunctionResultInput>;
  tools: GeminiFunctionDeclaration[];
  previousInteractionId?: string;
  signal?: AbortSignal;
}

/**
 * Gemini's function-declaration parser rejects `additionalProperties` in some
 * schemas (it can return a malformed function call), and `$schema` is not part
 * of a function declaration. Strip both recursively.
 */
function cleanJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(cleanJsonSchema);
  if (!value || typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === '$schema' || key === 'additionalProperties') continue;
    out[key] = cleanJsonSchema(child);
  }
  return out;
}

/**
 * Convert a Zod tool schema into the JSON Schema shape expected by the
 * Interactions API.
 */
export function functionDeclaration(
  name: string,
  description: string,
  schema: ZodTypeAny,
): GeminiFunctionDeclaration {
  const parameters = cleanJsonSchema(
    zodSchema(schema).jsonSchema,
  ) as Record<string, unknown>;
  return { type: 'function', name, description, parameters };
}

export function buildFunctionResult(
  name: string,
  callId: string,
  result: unknown,
): GeminiFunctionResultInput {
  const text = result === undefined ? 'null' : JSON.stringify(result);
  return {
    type: 'function_result',
    name,
    call_id: callId,
    result: [{ type: 'text', text }],
  };
}

/** Pull the final prose out of an Interaction, ignoring thought steps. */
export function extractModelText(interaction: GeminiInteraction): string {
  if (typeof interaction.output_text === 'string' && interaction.output_text.trim()) {
    return interaction.output_text.trim();
  }

  const chunks: string[] = [];
  for (const step of interaction.steps ?? []) {
    if (step.type !== 'model_output') continue;
    const content = Array.isArray(step.content) ? step.content : [];
    for (const part of content) {
      if (part && part.type === 'text' && typeof part.text === 'string') {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

export function extractFunctionCalls(interaction: GeminiInteraction): GeminiFunctionCall[] {
  const calls: GeminiFunctionCall[] = [];
  for (const step of interaction.steps ?? []) {
    if (step.type !== 'function_call' || typeof step.name !== 'string') continue;
    const id =
      typeof step.id === 'string' && step.id
        ? step.id
        : `call_${calls.length}_${Date.now().toString(36)}`;
    const args =
      step.arguments && typeof step.arguments === 'object'
        ? (step.arguments as Record<string, unknown>)
        : {};
    calls.push({ id, name: step.name, arguments: args });
  }
  return calls;
}

/** Short, sanitised error text safe to show in the chat UI. */
export function toSafeAgentError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return `Agent error: ${raw.replace(/https?:\/\/\S+/g, '[provider-url]').slice(0, 240)}`;
}

/**
 * Create one Interaction. `store: true` is required for the function-result
 * continuation (`previous_interaction_id`); PII is redacted before this call.
 */
export async function createGeminiInteraction({
  apiKey,
  model,
  systemInstruction,
  input,
  tools,
  previousInteractionId,
  signal,
}: CreateInteractionArgs): Promise<GeminiInteraction> {
  const body: Record<string, unknown> = {
    model,
    input,
    system_instruction: systemInstruction,
    tools,
    store: true,
    generation_config: {
      thinking_level: 'low',
      max_output_tokens: 2048,
    },
  };
  if (previousInteractionId) body.previous_interaction_id = previousInteractionId;

  const res = await fetch(GEMINI_INTERACTIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Gemini returned a non-JSON response (HTTP ${res.status}).`);
  }

  const payload = json as GeminiInteraction & {
    error?: { message?: string; code?: string };
  };

  if (!res.ok || payload.error) {
    const message = payload.error?.message || `Gemini request failed (HTTP ${res.status}).`;
    throw new Error(message);
  }
  if (!payload.id || !payload.status) {
    throw new Error('Gemini returned an interaction without an id/status.');
  }
  return payload;
}

/* ------------------------------------------------------------------ *
 * T3 client-resolved tool-call IDs
 * ------------------------------------------------------------------ */

export interface PendingToolCallPayload {
  /** Interaction id. */
  i: string;
  /** Function-call id inside the interaction. */
  c: string;
  /** Function name. */
  n: string;
  /** Server tool results that must be sent when the client resolves this call. */
  d?: Array<{ n: string; c: string; r: unknown }>;
}

export function encodeToolCallId(payload: PendingToolCallPayload): string {
  return `gem_${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`;
}

export function decodeToolCallId(toolCallId: string): PendingToolCallPayload | null {
  if (!toolCallId.startsWith('gem_')) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(toolCallId.slice(4), 'base64url').toString('utf8'),
    ) as PendingToolCallPayload;
    if (!decoded || typeof decoded.i !== 'string' || typeof decoded.c !== 'string') {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Transcript
 * ------------------------------------------------------------------ */

export interface TranscriptMessage {
  role?: string;
  content?: unknown;
  parts?: Array<{ type?: string; text?: string }>;
}

function messageText(message: TranscriptMessage): string {
  if (typeof message.content === 'string' && message.content.trim()) {
    return message.content.trim();
  }
  if (Array.isArray(message.parts)) {
    return message.parts
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text as string)
      .join('\n')
      .trim();
  }
  return '';
}

/**
 * Flatten the AI SDK v4 UI messages into a small text transcript. Tool parts are
 * omitted; the Interaction itself owns the tool-call state.
 */
export function buildTranscript(messages: TranscriptMessage[], maxChars = 8000): string {
  const lines: string[] = [];
  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const text = messageText(message);
    if (!text) continue;
    lines.push(`${message.role === 'user' ? 'User' : 'Assistant'}: ${text}`);
  }
  let transcript = lines.join('\n\n');
  if (transcript.length > maxChars) {
    transcript = `[Earlier conversation omitted]\n\n${transcript.slice(-maxChars)}`;
  }
  return transcript;
}
