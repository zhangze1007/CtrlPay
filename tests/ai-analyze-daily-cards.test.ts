import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/ai-analyze/route';

function completion(content: string) {
  return new Response(
    JSON.stringify({
      id: 'chatcmpl_daily_cards',
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

const ledgerSummary = {
  currentBalance: 7540,
  spentThisWeek: 210,
  spentThisMonth: 2910,
  topCategory: 'Dining & Food',
  topCategoryAmount: 989.4,
  cfar95: 21.5,
  projectedMonthEndBalance: 1200,
  shortfallProbability: 8,
  riskLevel: 'LOW',
  dailyAllowance: 88.5,
  remainingDays: 7,
  unpaidBillsTotal: 45,
  topSaving: { label: 'Spotify', monthlySavings: 7.4 },
};

describe('POST /api/ai-analyze (daily_cards mode)', () => {
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

  it('degrades to engine-derived cards with 200 before any provider call when no key is set', async () => {
    delete process.env.GROQ_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(request({ type: 'daily_cards', ledgerSummary }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.degraded).toBe(true);
    expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // LOW risk → safe badge; summary quotes the engine balance exactly
    expect(data.cards[0].badge).toBe('CFaR 95% Safe');
    expect(data.cards[0].summary).toContain('RM 7540.00');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('quotes engine figures to the model and returns structured cards', async () => {
    const fetchMock = vi.fn(async () =>
      completion(
        JSON.stringify({
          cards: [
            {
              badge: 'CFaR 95% Safe',
              title: 'AI Money Assistant',
              summary:
                'On-track: our RM 7540.00 buffer is at a 95% safety class. Safe runway RM 88.50/day for 7 days.',
              highlightPill: 'Save ~RM 7/mo Spotify student rate',
              ctaText: 'What-If CFaR',
              ctaAction: 'cfar',
            },
            {
              badge: 'CFaR 95% Safe',
              title: 'Dining Watch',
              summary: 'Dining & Food is your biggest bucket. Pace it inside the safe buffer.',
              highlightPill: '',
              ctaText: 'Budget Guard',
              ctaAction: 'budget',
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(request({ type: 'daily_cards', ledgerSummary }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.degraded).toBeUndefined();
    expect(data.cards).toHaveLength(2);
    expect(data.cards[0].ctaAction).toBe('cfar');
    expect(data.cards[1].ctaAction).toBe('budget');

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('openai/gpt-oss-120b');
    expect(body.temperature).toBe(0.4);
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { strict: true, name: 'ctrlpay_daily_insight_cards' },
    });
    // Engine figures are quoted — the model is told, never asked to compute.
    expect(body.messages[1].content).toContain('ENGINE DATA');
    expect(body.messages[1].content).toContain('- Ledger balance: RM 7540.00');
    expect(body.messages[1].content).toContain('RM 989.40');
    expect(body.messages[1].content).toContain('Spotify saves RM 7.40/month');
    expect(body.messages[1].content).toContain('untrusted data');
  });

  it('clamps to 3 cards, defaults missing fields and normalizes unknown ctaAction', async () => {
    const modelCards = [
      { badge: 'CFaR Watch', title: 'Runway', summary: 's1', highlightPill: 'p1', ctaText: '', ctaAction: 'party' },
      { title: 'No badge card', summary: 's2', highlightPill: 'p2', ctaText: 'Open', ctaAction: 'budget' },
      { badge: 'b', title: 't', summary: 's3', highlightPill: 'p3', ctaText: 'Go', ctaAction: 'transactions' },
      { badge: 'b', title: 't', summary: 's4', highlightPill: 'p4', ctaText: 'Go', ctaAction: 'timeline' },
    ];
    const fetchMock = vi.fn(async () => completion(JSON.stringify({ cards: modelCards })));
    vi.stubGlobal('fetch', fetchMock);

    const res = await POST(request({ type: 'daily_cards', ledgerSummary }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.cards).toHaveLength(3);
    // Unknown ctaAction falls back to 'cfar'; missing ctaText gets the default
    expect(data.cards[0].ctaAction).toBe('cfar');
    expect(data.cards[0].ctaText).toBe('View →');
    expect(data.cards[1].badge).toBe('CFaR 95% Safe');
  });
});
