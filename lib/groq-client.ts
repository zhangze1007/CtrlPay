/**
 * Groq Chat Completions API client (server-only).
 *
 * Groq exposes an OpenAI-compatible endpoint with tool / function calling
 * support. We use raw `fetch` to avoid an extra SDK dependency and to keep the
 * AI SDK v4 data-stream bridge unchanged.
 */
import { zodSchema } from 'ai';
import type { ZodTypeAny } from 'zod';

export const GROQ_API_ENDPOINT =
  'https://api.groq.com/openai/v1/chat/completions';

/**
 * Vercel AI Gateway, used only when the deployment has an AI Gateway key but
 * no direct Groq key. It exposes the same OpenAI Chat Completions shape and
 * routes the request to Groq first, so the app still runs the same model.
 */
export const AI_GATEWAY_ENDPOINT =
  'https://ai-gateway.vercel.sh/v1/chat/completions';

/**
 * Model used when GROQ_MODEL is not set.
 *
 * Groq retired `llama-3.3-70b-versatile` for the Free/Developer tier on
 * 2026-08-16. GPT-OSS 120B is Groq's current production open-weight model with
 * tool calling, so it is the safe default for the live agent.
 */
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

/**
 * Models that were valid in older drafts of this project but are retired or
 * unavailable on Groq's current Free/Developer tier. A stale deployment env var
 * must not take the agent offline, so these fall back to the current default.
 */
const RETIRED_GROQ_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]);

export function resolveGroqModel(): string {
  const configured = process.env.GROQ_MODEL?.trim();
  if (!configured || RETIRED_GROQ_MODELS.has(configured)) {
    return DEFAULT_GROQ_MODEL;
  }
  return configured;
}

/**
 * Read the server-side Groq key. `GROQ_API_KEY` is the documented name; the
 * aliases keep older Vercel projects working without a redeploy of the app.
 */
const GROQ_KEY_NAMES = new Set([
  'GROQ',
  'GROQ_KEY',
  'GROQ_API',
  'GROQ_API_KEY',
  'GROQ_APIKEY',
  'GROQ_API_TOKEN',
  'GROQ_TOKEN',
  'GROQ_SECRET',
  'GROQ_API_SECRET',
]);

export function resolveGroqApiKey(): string | undefined {
  // Case-insensitive because Vercel env names are user-authored. The allowlist
  // excludes GROQ_MODEL/BASE_URL so a non-secret setting can never be sent as a
  // bearer token.
  for (const [name, value] of Object.entries(process.env)) {
    if (!GROQ_KEY_NAMES.has(name.toUpperCase())) continue;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

/**
 * Prefer a direct Groq key. If the deployment only has a Vercel AI Gateway
 * credential, use that gateway and pin the request to the Groq provider. The
 * application therefore never falls back to a different model family just
 * because the direct key is absent.
 */
export function resolveAiApiKey(): string | undefined {
  const direct = resolveGroqApiKey();
  if (direct) return direct;
  return (
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim() ||
    undefined
  );
}

export function resolveAiEndpoint(apiKey: string): string {
  const gatewayKey =
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_AI_GATEWAY_API_KEY?.trim();
  return gatewayKey && apiKey === gatewayKey
    ? AI_GATEWAY_ENDPOINT
    : GROQ_API_ENDPOINT;
}

/* ------------------------------------------------------------------ *
 * OpenAI-compatible types
 * ------------------------------------------------------------------ */

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface GroqToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface GroqToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface GroqChatCompletionResponse {
  id: string;
  object: string;
  model: string;
  choices: Array<{
    index: number;
    message: GroqMessage;
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/* ------------------------------------------------------------------ *
 * JSON Schema cleaner
 * ------------------------------------------------------------------ */

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
 * Convert a Zod tool schema into an OpenAI-compatible tool definition
 * expected by the Groq API.
 */
export function groqToolDefinition(
  name: string,
  description: string,
  schema: ZodTypeAny,
): GroqToolDefinition {
  const parameters = cleanJsonSchema(
    zodSchema(schema).jsonSchema,
  ) as Record<string, unknown>;
  return {
    type: 'function',
    function: { name, description, parameters },
  };
}

/* ------------------------------------------------------------------ *
 * Parsed tool calls from a Groq response
 * ------------------------------------------------------------------ */

export interface ParsedToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export function extractGroqToolCalls(message: GroqMessage): ParsedToolCall[] {
  if (!message.tool_calls || message.tool_calls.length === 0) return [];
  return message.tool_calls.map((tc) => {
    let args: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(tc.function.arguments);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        args = parsed as Record<string, unknown>;
      }
    } catch {
      /* malformed arguments — server schema validation reports the issue */
    }
    return { id: tc.id, name: tc.function.name, arguments: args };
  });
}

export function extractGroqText(message: GroqMessage): string {
  return (message.content ?? '').trim();
}

/* ------------------------------------------------------------------ *
 * T3 client-resolved tool-call IDs
 * ------------------------------------------------------------------ */

export interface PendingToolCallPayload {
  /**
   * The single T3 assistant tool call being resumed. Older payloads could
   * contain several calls; the route still accepts that shape but only uses
   * the selected T3 call. This keeps OpenAI's "every tool_call needs a tool
   * result" rule satisfiable even when a model emits more than one card.
   */
  tc: Array<{ id: string; n: string; a: string }>;
  /** The specific T3 tool-call id. */
  c: string;
  /** Function name. */
  n: string;
}

export function encodeToolCallId(payload: PendingToolCallPayload): string {
  return `groq_${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}`;
}

export function decodeToolCallId(toolCallId: string): PendingToolCallPayload | null {
  if (!toolCallId.startsWith('groq_')) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(toolCallId.slice(5), 'base64url').toString('utf8'),
    ) as PendingToolCallPayload;
    if (!decoded || typeof decoded.c !== 'string' || !Array.isArray(decoded.tc)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Transcript helpers
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
 * Flatten the AI SDK v4 UI messages into a small text transcript. Tool parts
 * are omitted; the conversation itself owns the tool-call state.
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

/* ------------------------------------------------------------------ *
 * Error helper
 * ------------------------------------------------------------------ */

/** Short, sanitised error text safe to show in the chat UI. */
export function toSafeAgentError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  return `Agent error: ${raw.replace(/https?:\/\/\S+/g, '[provider-url]').slice(0, 240)}`;
}

/* ------------------------------------------------------------------ *
 * Core API call
 * ------------------------------------------------------------------ */

export interface CreateGroqCompletionArgs {
  apiKey: string;
  model: string;
  messages: GroqMessage[];
  tools?: GroqToolDefinition[];
  signal?: AbortSignal;
  temperature?: number;
  maxCompletionTokens?: number;
  /** OpenAI-compatible `response_format` (e.g. Groq Strict Structured Outputs). */
  responseFormat?: Record<string, unknown>;
  /** Override the provider endpoint (defaults to direct Groq unless using the gateway key). */
  endpoint?: string;
}

/**
 * Create a single Groq Chat Completion. Returns the assistant's message.
 */
export async function createGroqCompletion({
  apiKey,
  model,
  messages,
  tools,
  signal,
  temperature = 0.5,
  maxCompletionTokens = 4096,
  responseFormat,
  endpoint,
}: CreateGroqCompletionArgs): Promise<GroqMessage> {
  const resolvedEndpoint = endpoint ?? resolveAiEndpoint(apiKey);
  const isGateway = resolvedEndpoint === AI_GATEWAY_ENDPOINT;
  const body: Record<string, unknown> = {
    model,
    messages,
    // Groq's current OpenAI-compatible docs use max_completion_tokens for
    // reasoning models such as GPT-OSS 120B.
    max_completion_tokens: maxCompletionTokens,
    temperature,
  };
  if (responseFormat) {
    body.response_format = responseFormat;
  }
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = 'auto';
  }
  if (isGateway) {
    // Gateway extension: try Groq first, then use another host only if Groq is
    // unavailable. The model stays openai/gpt-oss-120b.
    body.providerOptions = { gateway: { order: ['groq'] } };
  }

  const res = await fetch(resolvedEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Groq returned a non-JSON response (HTTP ${res.status}).`);
  }

  const payload = json as GroqChatCompletionResponse & {
    error?: { message?: string; type?: string; code?: string };
  };

  if (!res.ok || payload.error) {
    const message =
      payload.error?.message || `Groq request failed (HTTP ${res.status}).`;
    throw new Error(message);
  }

  const choice = payload.choices?.[0];
  if (!choice || !choice.message) {
    throw new Error('Groq returned a completion without a message.');
  }

  return choice.message;
}

/* ------------------------------------------------------------------ *
 * Lightweight single-shot AI analysis (for OCR + interceptor)
 * ------------------------------------------------------------------ */

const ANALYSIS_RESPONSE_FORMAT = {
  type: 'json_schema',
  json_schema: {
    name: 'ctrlpay_advisory_analysis',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        advice: { type: 'string' },
        warnings: { type: 'array', items: { type: 'string' } },
        suggestions: { type: 'array', items: { type: 'string' } },
        severity: {
          type: 'string',
          enum: ['safe', 'caution', 'warning', 'danger'],
        },
      },
      required: ['advice', 'warnings', 'suggestions', 'severity'],
      additionalProperties: false,
    },
  },
} as const;

export async function quickAiAnalysis(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const message = await createGroqCompletion({
    apiKey,
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    // GPT-OSS reasoning tokens count against this budget; leave headroom for
    // the short JSON answer on top of the model's internal reasoning.
    maxCompletionTokens: 2048,
    responseFormat: ANALYSIS_RESPONSE_FORMAT,
  });
  const text = extractGroqText(message);
  if (!text) throw new Error('Groq returned an empty analysis.');
  return text;
}
