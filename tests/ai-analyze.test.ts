import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/ai-analyze/route';

function completion(content: string) {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl_advisory',
      object: 'chat.completion',
      model: 'openai/gpt-oss-120b',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content },
          finish_reason: 'stop',
        },
      ],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function request(body: unknown) {
  return new Request('http://localhost/api/ai-analyze', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const receipt = {
  merchant: 'Starbucks Coffee',
  amount: 24.5,
  category: 'Dining & Food',
  date: '2026-10-18',
  items: [{ name: 'Caramel Macchiato', price: 16.5 }],
};

describe('POST /api/ai-analyze', () => {
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

  it('returns 503 before calling the provider when no key is configured', async () => {
    delete process.env.GROQ_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(request({ type: 'ocr_receipt', receipt }));
    expect(res.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns structured advisory findings for a receipt', async () => {
    const fetchMock = vi.fn(async () =>
      completion(
        JSON.stringify({
          advice: 'This is close to a full day of your safe allowance.',
          warnings: ['Amount is higher than your usual coffee spend.'],
          suggestions: ['Try a smaller size or share the treat.'],
          severity: 'warning',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(
      request({
        type: 'ocr_receipt',
        receipt,
        context: { currentBalance: 7540, spentThisWeek: 210, spentThisMonth: 2910 },
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toMatchObject({
      severity: 'warning',
      warnings: ['Amount is higher than your usual coffee spend.'],
      suggestions: ['Try a smaller size or share the treat.'],
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('openai/gpt-oss-120b');
    expect(body.max_completion_tokens).toBeGreaterThan(500);
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { strict: true },
    });
    expect(body.messages[1].content).toContain('Starbucks Coffee');
    expect(body.messages[1].content).toContain('RM 24.50');
  });

  it('labels a positive projected balance so the model cannot call it negative', async () => {
    const fetchMock = vi.fn(async () =>
      completion(
        JSON.stringify({
          advice: 'This RM 180 want still leaves RM 120 at month end.',
          warnings: ['Shortfall risk is 34%.'],
          suggestions: ['Delay the purchase if you can.'],
          severity: 'warning',
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(
      request({
        type: 'payment_advice',
        payment: {
          merchant: 'Shopee',
          amount: 180,
          category: 'Shopping',
          isNeed: false,
          riskLevel: 'HIGH',
          shortfallProbability: 34,
          cfar95: 180,
          projectedMonthEndBalance: 120,
          dailyAllowance: 21.5,
        },
      }),
    );

    expect(res.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.messages[1].content).toContain('RM 120.00 (POSITIVE)');
  });

  it('rejects an invalid receipt before any provider call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(
      request({ type: 'ocr_receipt', receipt: { ...receipt, amount: -3 } }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a visible 503 instead of fabricating a safe result when Groq fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: 'rate limited' } }), {
            status: 429,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );

    const res = await POST(
      request({
        type: 'payment_advice',
        payment: {
          merchant: 'Shopee',
          amount: 180,
          category: 'Shopping',
          isNeed: false,
          riskLevel: 'HIGH',
          shortfallProbability: 34,
          cfar95: 180,
          projectedMonthEndBalance: 120,
          dailyAllowance: 21.5,
        },
      }),
    );
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.error).toBe('AI_UNAVAILABLE');
    expect(data).not.toHaveProperty('severity');
  });
});
