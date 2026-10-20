'use client';

import * as React from 'react';
import { useChat } from '@ai-sdk/react';
import { Bot, Loader2, Send, Sparkles, Wrench } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { syncServerAudit } from '@/lib/audit-sync';
import { toPlainChatText } from '@/lib/chat-format';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EscrowCard, QuarantineCard, SweepCard } from '@/components/contract-cards';
import { MultimodalBookkeeping } from '@/components/multimodal-bookkeeping';

/** Loose UI-part shapes (kept local so we are resilient to SDK type drift). */
interface LooseToolInvocation {
  state: 'partial-call' | 'call' | 'result';
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: unknown;
}
interface LoosePart {
  type: string;
  text?: string;
  toolInvocation?: LooseToolInvocation;
}
interface LooseMessage {
  id: string;
  role: string;
  content?: string;
  parts?: LoosePart[];
}

const T3_TOOLS = new Set(['propose_quarantine', 'propose_escrow', 'propose_sweep']);

/** Plug into the bookkeeping panel? Kept separate for layout clarity. */
function buildQuickChips(roastTone: 'GENTLE' | 'SPICY') {
  return [
    { label: 'Spending Analysis', prompt: 'Give me a spending analysis of my last 45 days.' },
    { label: 'Ways to Save', prompt: 'What are the best ways I can save money this month?' },
    { label: 'Budget Insights', prompt: "What's my safe daily allowance and budget breakdown?" },
    { label: 'Month-End Roast 🔥', prompt: `Roast my subscriptions using the month-end numbers. Tone: ${roastTone}.` },
  ];
}

function ToolSummary({ inv }: { inv: LooseToolInvocation }) {
  const result = inv.result as Record<string, unknown> | undefined;
  const lines: string[] = [];
  if (result) {
    if (typeof result.shortfallProbability === 'number') {
      lines.push(`shortfall ${result.shortfallProbability}% · risk ${String(result.riskLevel)}`);
    }
    if (typeof result.dynamicDailyAllowance === 'number') {
      lines.push(`daily allowance RM ${result.dynamicDailyAllowance}`);
    }
    if (typeof result.wastedMonthly === 'number') {
      lines.push(`wasted RM ${result.wastedMonthly}/mo`);
    }
    if (result.tags && typeof result.tags === 'object') {
      const tags = result.tags as Record<string, string>;
      lines.push(
        Object.entries(tags)
          .map(([k, v]) => `${k}=${v}`)
          .join(' '),
      );
    }
  }
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-holst-50 p-2 text-[11px] duo-muted ring-1 ring-holst-600/10">
      <Wrench className="mt-0.5 h-3 w-3 shrink-0" />
      <div>
        <span className="font-medium text-foreground">{inv.toolName}</span>{' '}
        <Badge variant="outline" className="ml-1">
          {inv.state}
        </Badge>
        {lines.length > 0 && <p>{lines.join(' · ')}</p>}
      </div>
    </div>
  );
}

export function AgentChat({
  withBookkeeping = true,
  initialPrompt,
  compact = false,
}: {
  withBookkeeping?: boolean;
  initialPrompt?: string;
  /** Hide the duplicate card header when the chat is embedded inside the Copilot shell. */
  compact?: boolean;
} = {}) {
  const roastTone = useCtrlPayStore((s) => s.roastTone);
  const setRoastTone = useCtrlPayStore((s) => s.setRoastTone);
  const QUICK_CHIPS = React.useMemo(() => buildQuickChips(roastTone), [roastTone]);

  // A stable body object whose getters read the FRESHEST sandbox state at the exact moment a
  // request (including every addToolResult continuation) is sent — so toggling the Master
  // Autonomy Switch takes effect immediately with no stale closure values.
  const body = React.useMemo(
    () => ({
      get ledgerSnapshot() {
        return useCtrlPayStore.getState().ledgerSnapshot();
      },
      get autonomy() {
        const s = useCtrlPayStore.getState();
        return { masterAutonomyEnabled: s.masterAutonomyEnabled, enabledTiers: s.enabledTiers };
      },
      get currentBalance() {
        return useCtrlPayStore.getState().currentBalance;
      },
      get sandboxClock() {
        return useCtrlPayStore.getState().sandboxClock;
      },
      get userLimits() {
        return useCtrlPayStore.getState().userLimits;
      },
      get aiMandate() {
        return useCtrlPayStore.getState().aiMandate;
      },
    }),
    [],
  );

  const { messages, input, handleInputChange, handleSubmit, append, addToolResult, isLoading, error } = useChat({
    api: '/api/chat',
    maxSteps: 5,
    body,
  });

  const sentInitialRef = React.useRef(false);
  React.useEffect(() => {
    if (initialPrompt && !sentInitialRef.current && messages.length === 0) {
      sentInitialRef.current = true;
      void append({ role: 'user', content: initialPrompt });
    }
  }, [initialPrompt, append, messages.length]);

  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // After every assistant turn, pull the server's AGENT audit entries (tool invocations and the
  // post-LLM NUMBER_VERIFIER_* outcome) into the local hash chain, and surface the verifier state
  // so the guardrail is observable in the UI, not just the log.
  const [verifier, setVerifier] = React.useState<'PASSED' | 'BLOCKED' | null>(null);
  const wasLoading = React.useRef(false);
  React.useEffect(() => {
    if (wasLoading.current && !isLoading) {
      void syncServerAudit().then((r) => {
        if (r.verifier) setVerifier(r.verifier);
      });
    }
    wasLoading.current = isLoading;
  }, [isLoading]);

  const typed = messages as unknown as LooseMessage[];

  return (
    <Card className="flex h-full flex-col border-0 bg-transparent shadow-none ring-0 backdrop-blur-none">
      {!compact && (
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-4 w-4" /> CtrlPay Agent
            </CardTitle>
            <CardDescription>
              Numbers come from the server-side engine (base ledger MYR), never the model. You approve
              every state change.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">Groq GPT-OSS 120B · live</Badge>
            <div className="flex items-center gap-1">
              <span className="mr-1 text-[11px] text-muted-foreground">Roast tone</span>
              <Button
                size="sm"
                variant={roastTone === 'GENTLE' ? 'secondary' : 'ghost'}
                onClick={() => setRoastTone('GENTLE')}
              >
                Gentle
              </Button>
              <Button
                size="sm"
                variant={roastTone === 'SPICY' ? 'secondary' : 'ghost'}
                onClick={() => setRoastTone('SPICY')}
              >
                Spicy
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent
        className={cn(
          'flex flex-1 flex-col gap-3 overflow-hidden',
          compact && 'pt-3',
        )}
      >
        {verifier === 'BLOCKED' && (
          <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            Post-LLM number verifier blocked an ungrounded RM figure in the last reply. The guardrail is
            recorded in the audit trail as <span className="font-mono">NUMBER_VERIFIER_BLOCKED</span>.
          </p>
        )}
        <div className="min-h-[220px] flex-1 space-y-3 overflow-y-auto scroll-thin pr-1">
          {typed.length === 0 && (
            <div className="rounded-2xl bg-holst-50 p-3 text-xs duo-muted ring-1 ring-holst-600/10">
              <p className="flex items-center gap-2 font-bold text-holst-950">
                <Sparkles className="h-3.5 w-3.5" /> Try a quick chip, or ask anything about your money.
              </p>
              <p className="mt-1">
                The agent will simulate the purchase first. It only proposes a contract when the risk is HIGH or
                CRITICAL.
              </p>
            </div>
          )}

          {typed.map((message) => {
            const parts = message.parts ?? [{ type: 'text', text: message.content ?? '' }];
            return (
              <div
                key={message.id}
                className={cn('flex flex-col gap-2', message.role === 'user' ? 'items-end' : 'items-start')}
              >
                <div
                  className={cn(
                    'max-w-[92%] rounded-2xl px-3 py-2 text-sm',
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-[#1D8B94] to-[#10606F] text-white'
                      : 'bg-holst-50 text-holst-950 ring-1 ring-holst-600/10',
                  )}
                >
                  {parts.map((part, i) => {
                    if (part.type === 'text' && part.text) {
                      return (
                        <p key={i} className="whitespace-pre-wrap">
                          {toPlainChatText(part.text)}
                        </p>
                      );
                    }
                    if (part.type === 'tool-invocation' && part.toolInvocation) {
                      const inv = part.toolInvocation;
                      if (inv.state === 'partial-call') {
                        return (
                          <p key={i} className="text-[11px] italic text-muted-foreground">
                            composing {inv.toolName}…
                          </p>
                        );
                      }
                      if (inv.toolName === 'propose_quarantine') {
                        return (
                          <QuarantineCard
                            key={inv.toolCallId}
                            toolCallId={inv.toolCallId}
                            args={inv.args ?? {}}
                            result={inv.result}
                            addToolResult={addToolResult}
                          />
                        );
                      }
                      if (inv.toolName === 'propose_escrow') {
                        return (
                          <EscrowCard
                            key={inv.toolCallId}
                            toolCallId={inv.toolCallId}
                            args={inv.args ?? {}}
                            result={inv.result}
                            addToolResult={addToolResult}
                          />
                        );
                      }
                      if (inv.toolName === 'propose_sweep') {
                        return (
                          <SweepCard
                            key={inv.toolCallId}
                            toolCallId={inv.toolCallId}
                            args={inv.args ?? {}}
                            result={inv.result}
                            addToolResult={addToolResult}
                          />
                        );
                      }
                      if (T3_TOOLS.has(inv.toolName)) return null;
                      return <ToolSummary key={i} inv={inv} />;
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> CtrlPay is thinking…
            </p>
          )}
          {error && (
            <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {error.message.includes('MISSING_API_KEY')
                ? 'Agent chat needs GROQ_API_KEY in .env.local (or Vercel environment variables). The dashboard, Zombie Radar and audit log work without it.'
                : error.message}
            </p>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-1">
          {QUICK_CHIPS.map((c) => (
            <Button
              key={c.label}
              size="sm"
              variant="outline"
              disabled={isLoading}
              onClick={() => append({ role: 'user', content: c.prompt })}
            >
              {c.label}
            </Button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask CtrlPay… (numbers are computed server-side)"
            className="min-w-0 flex-1 rounded-full border border-holst-950/10 bg-white px-4 py-2 text-sm text-holst-950 outline-none focus:border-holst-600"
            aria-label="Chat message"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} aria-label="Send">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {withBookkeeping && <MultimodalBookkeeping />}
      </CardContent>
    </Card>
  );
}
