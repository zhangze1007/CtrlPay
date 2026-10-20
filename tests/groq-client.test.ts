import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_GROQ_MODEL,
  buildTranscript,
  decodeToolCallId,
  encodeToolCallId,
  extractGroqText,
  extractGroqToolCalls,
  groqToolDefinition,
  resolveGroqModel,
} from '@/lib/groq-client';
import { ProposeQuarantineInputSchema } from '@/lib/types';
import { useCtrlPayStore } from '@/lib/store';
import { POST } from '@/app/api/chat/route';

function completion(message: Record<string, unknown>, finishReason = 'stop') {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl_test',
      object: 'chat.completion',
      model: DEFAULT_GROQ_MODEL,
      choices: [{ index: 0, message, finish_reason: finishReason }],
      usage: { prompt_tokens: 10, completion_tokens: 8, total_tokens: 18 },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

describe('Groq client helpers', () => {
  it('defaults to the current production model with tool calling', () => {
    expect(DEFAULT_GROQ_MODEL).toBe('openai/gpt-oss-120b');
  });

  it('replaces a retired Llama override but keeps a valid custom model', () => {
    const previous = process.env.GROQ_MODEL;
    try {
      process.env.GROQ_MODEL = 'llama-3.3-70b-versatile';
      expect(resolveGroqModel()).toBe(DEFAULT_GROQ_MODEL);
      process.env.GROQ_MODEL = 'qwen/qwen3.6-27b';
      expect(resolveGroqModel()).toBe('qwen/qwen3.6-27b');
    } finally {
      if (previous === undefined) delete process.env.GROQ_MODEL;
      else process.env.GROQ_MODEL = previous;
    }
  });

  it('converts a Zod schema into an OpenAI-compatible function tool', () => {
    const tool = groqToolDefinition(
      'propose_quarantine',
      'Propose a quarantine.',
      ProposeQuarantineInputSchema,
    );
    expect(tool.type).toBe('function');
    expect(tool.function.name).toBe('propose_quarantine');
    expect(tool.function.parameters).toMatchObject({
      type: 'object',
      properties: expect.any(Object),
    });
    expect(tool.function.parameters).not.toHaveProperty('$schema');
    expect(JSON.stringify(tool.function.parameters)).not.toContain('additionalProperties');
  });

  it('extracts text and tool calls from a Groq assistant message', () => {
    expect(extractGroqText({ role: 'assistant', content: '  Hello  ' })).toBe('Hello');

    const calls = extractGroqToolCalls({
      role: 'assistant',
      content: null,
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'run_what_if_simulation',
            arguments: JSON.stringify({ targetItem: 'Bubble tea', itemPrice: 18 }),
          },
        },
      ],
    });
    expect(calls).toEqual([
      {
        id: 'call_1',
        name: 'run_what_if_simulation',
        arguments: { targetItem: 'Bubble tea', itemPrice: 18 },
      },
    ]);
  });

  it('round-trips the T3 call context without trusting deferred results', () => {
    const payload = {
      tc: [
        {
          id: 'call_t3',
          n: 'propose_quarantine',
          a: '{"targetItem":"Bubble tea","itemPrice":18}',
        },
      ],
      c: 'call_t3',
      n: 'propose_quarantine',
    };
    const id = encodeToolCallId(payload);
    expect(id.startsWith('groq_')).toBe(true);
    expect(decodeToolCallId(id)).toEqual(payload);
    expect(decodeToolCallId('not_ours')).toBeNull();
  });

  it('builds a text-only transcript', () => {
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
});

describe('POST /api/chat Groq data stream', () => {
  beforeEach(() => {
    process.env.GROQ_API_KEY = 'test-key';
    delete process.env.GROQ_MODEL;
    delete process.env.AI_GATEWAY_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GROQ_API_KEY;
    delete process.env.GROQ_MODEL;
    delete process.env.AI_GATEWAY_API_KEY;
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

  it('streams a completed answer with the correct Groq request shape', async () => {
    const fetchMock = vi.fn(async () => completion({ role: 'assistant', content: 'Hello! How can I help?' }));
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(request([{ role: 'user', content: 'hii' }]));
    const stream = await res.text();

    expect(stream).toContain('0:"Hello! How can I help?"');
    expect(stream).toContain('d:{"finishReason":"stop"}');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('openai/gpt-oss-120b');
    expect(body.max_completion_tokens).toBeGreaterThan(0);
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('CtrlPay');
    expect(body.messages[1]).toEqual({ role: 'user', content: 'User: hii' });
    expect(body.tools.map((tool: { function: { name: string } }) => tool.function.name)).toContain(
      'propose_quarantine',
    );
    expect(init.headers).toMatchObject({ Authorization: 'Bearer test-key' });
  });

  it('emits one T3 card and resumes that exact call after approval', async () => {
    const firstFetch = vi.fn(async () =>
      completion(
        {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: 'call_t3',
              type: 'function',
              function: {
                name: 'propose_quarantine',
                arguments: JSON.stringify({
                  targetItem: 'Bubble tea',
                  itemPrice: 18,
                  category: 'Bubble_Tea_Dining',
                }),
              },
            },
          ],
        },
        'tool_calls',
      ),
    );
    vi.stubGlobal('fetch', firstFetch);

    const first = await POST(request([{ role: 'user', content: 'Should I buy bubble tea?' }]));
    const firstStream = await first.text();
    const toolLine = firstStream.split('\n').find((line) => line.startsWith('9:'));
    expect(toolLine).toBeTruthy();
    const toolPart = JSON.parse(toolLine!.slice(2)) as {
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    };
    expect(toolPart.toolName).toBe('propose_quarantine');
    expect(toolPart.toolCallId.startsWith('groq_')).toBe(true);

    const secondFetch = vi.fn(async () =>
      completion({
        role: 'assistant',
        content: 'The 24h Quarantine card is ready for your decision.',
      }),
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

    const [, init] = secondFetch.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    const assistant = body.messages.find((message: { role: string }) => message.role === 'assistant');
    expect(assistant.tool_calls).toHaveLength(1);
    expect(assistant.tool_calls[0].id).toBe('call_t3');
    expect(assistant.tool_calls[0].function.name).toBe('propose_quarantine');

    const toolMessage = body.messages.find((message: { role: string }) => message.role === 'tool');
    expect(toolMessage.tool_call_id).toBe('call_t3');
    expect(toolMessage.name).toBe('propose_quarantine');
    expect(toolMessage.content).toContain('PASSKEY_TEST');
  });
});
