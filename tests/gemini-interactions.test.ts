import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GEMINI_MODEL,
  buildFunctionResult,
  buildTranscript,
  decodeToolCallId,
  encodeToolCallId,
  extractFunctionCalls,
  extractModelText,
  functionDeclaration,
  resolveGeminiModel,
} from '@/lib/gemini-interactions';
import { ProposeQuarantineInputSchema } from '@/lib/types';
import { useCtrlPayStore } from '@/lib/store';
import { POST } from '@/app/api/chat/route';

/**
 * Gemini 3.8 uses the Interactions API. These tests pin the wire format and the
 * AI SDK v4 data-stream bridge without making a network request.
 */

describe('Gemini Interactions API helpers', () => {
  it('defaults to the current stable Flash model', () => {
    expect(DEFAULT_GEMINI_MODEL).toBe('gemini-3.8-flash');
  });

  it('ignores a stale retired model override and allows a newer one', () => {
    const previous = process.env.GEMINI_MODEL;
    try {
      process.env.GEMINI_MODEL = 'gemini-2.5-flash';
      expect(resolveGeminiModel()).toBe('gemini-3.8-flash');
      process.env.GEMINI_MODEL = 'gemini-4-argon';
      expect(resolveGeminiModel()).toBe('gemini-4-argon');
    } finally {
      if (previous === undefined) delete process.env.GEMINI_MODEL;
      else process.env.GEMINI_MODEL = previous;
    }
  });

  it('converts a Zod tool schema into a function declaration with parameters', () => {
    const declaration = functionDeclaration(
      'propose_quarantine',
      'Propose a quarantine.',
      ProposeQuarantineInputSchema,
    );
    expect(declaration.type).toBe('function');
    expect(declaration.name).toBe('propose_quarantine');
    expect(declaration.parameters).toMatchObject({
      type: 'object',
      properties: expect.any(Object),
    });
    expect(declaration.parameters).not.toHaveProperty('$schema');
    expect(JSON.stringify(declaration.parameters)).not.toContain('additionalProperties');
  });

  it('extracts final text and function calls from interaction steps', () => {
    const interaction = {
      id: 'v1_test',
      status: 'requires_action',
      steps: [
        {
          type: 'function_call',
          id: 'call_1',
          name: 'get_budget_insights',
          arguments: {},
        },
      ],
    };
    expect(extractFunctionCalls(interaction)).toEqual([
      { id: 'call_1', name: 'get_budget_insights', arguments: {} },
    ]);
    expect(extractModelText(interaction)).toBe('');

    expect(
      extractModelText({
        id: 'v1_test',
        status: 'completed',
        steps: [
          {
            type: 'model_output',
            content: [{ type: 'text', text: 'Your safe daily allowance is RM 42.' }],
          },
        ],
      }),
    ).toBe('Your safe daily allowance is RM 42.');
  });

  it('round-trips opaque T3 tool-call IDs with deferred server results', () => {
    const payload = {
      i: 'v1_interaction',
      c: 'call_1',
      n: 'propose_quarantine',
      d: [{ n: 'run_what_if_simulation', c: 'call_0', r: { riskLevel: 'HIGH' } }],
    };
    const id = encodeToolCallId(payload);
    expect(id.startsWith('gem_')).toBe(true);
    expect(decodeToolCallId(id)).toEqual(payload);
    expect(decodeToolCallId('not_ours')).toBeNull();
  });

  it('builds a text-only transcript and redacts nothing by itself', () => {
    const transcript = buildTranscript([
      { role: 'user', content: 'hii' },
      {
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Hello.' },
          { type: 'tool-invocation' },
        ],
      },
      { role: 'user', parts: [{ type: 'text', text: 'Can I afford dinner?' }] },
    ]);
    expect(transcript).toContain('User: hii');
    expect(transcript).toContain('Assistant: Hello.');
    expect(transcript).toContain('User: Can I afford dinner?');
    expect(transcript).not.toContain('tool-invocation');
  });

  it('formats function-result input as content blocks', () => {
    expect(buildFunctionResult('get_budget_insights', 'call_1', { x: 1 })).toEqual({
      type: 'function_result',
      name: 'get_budget_insights',
      call_id: 'call_1',
      result: [{ type: 'text', text: '{"x":1}' }],
    });
  });
});

describe('POST /api/chat data stream', () => {
  beforeEach(() => {
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  });

  function request(messages: unknown[]) {
    return new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages,
        ledgerSnapshot: useCtrlPayStore.getState().ledgerSnapshot(),
        autonomy: {
          masterAutonomyEnabled: false,
          enabledTiers: { T0: true, T1: false, T2: false, T3: false },
        },
      }),
    });
  }

  it('streams a completed answer through the AI SDK v4 protocol', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'v1_test',
          status: 'completed',
          steps: [
            {
              type: 'model_output',
              content: [{ type: 'text', text: 'Hello! How can I help?' }],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(request([{ role: 'user', content: 'hii' }]));
    const stream = await res.text();

    expect(stream).toContain('0:"Hello! How can I help?"');
    expect(stream).toContain('d:{"finishReason":"stop"}');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.model).toBe('gemini-3.8-flash');
    expect(body.system_instruction).toContain('CtrlPay');
    expect(body.tools.map((tool: { name: string }) => tool.name)).toContain('propose_quarantine');
  });

  it('emits a T3 card and continues the same interaction after approval', async () => {
    const firstFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'v1_t3',
          status: 'requires_action',
          steps: [
            {
              type: 'function_call',
              id: 'call_t3',
              name: 'propose_quarantine',
              arguments: {
                targetItem: 'Bubble tea',
                itemPrice: 18,
                category: 'Bubble_Tea_Dining',
              },
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', firstFetch);

    const first = await POST(request([{ role: 'user', content: 'Should I buy bubble tea?' }]));
    const firstStream = await first.text();
    const toolLine = firstStream
      .split('\n')
      .find((line) => line.startsWith('9:'));
    expect(toolLine).toBeTruthy();
    const toolPart = JSON.parse(toolLine!.slice(2)) as {
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    };
    expect(toolPart.toolName).toBe('propose_quarantine');
    expect(toolPart.toolCallId.startsWith('gem_')).toBe(true);

    const secondFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 'v1_final',
          status: 'completed',
          steps: [
            {
              type: 'model_output',
              content: [{ type: 'text', text: 'The 24h Quarantine card is ready for your decision.' }],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', secondFetch);

    const second = await POST(
      request([
        { role: 'user', content: 'Should I buy bubble tea?' },
        {
          role: 'assistant',
          parts: [
            {
              type: 'tool-invocation',
              toolInvocation: {
                state: 'result',
                toolCallId: toolPart.toolCallId,
                toolName: 'propose_quarantine',
                args: toolPart.args,
                result: { status: 'APPROVED', authorization_ref: 'PASSKEY_TEST' },
              },
            },
          ],
        },
      ]),
    );
    const secondStream = await second.text();
    expect(secondStream).toContain('The 24h Quarantine card is ready');
    expect(secondFetch).toHaveBeenCalledTimes(1);

    const body = JSON.parse((secondFetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.previous_interaction_id).toBe('v1_t3');
    expect(body.input).toEqual([
      {
        type: 'function_result',
        name: 'propose_quarantine',
        call_id: 'call_t3',
        result: [
          {
            type: 'text',
            text: JSON.stringify({ status: 'APPROVED', authorization_ref: 'PASSKEY_TEST' }),
          },
        ],
      },
    ]);
  });
});
