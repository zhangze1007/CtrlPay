'use client';

import * as React from 'react';
import {
  Menu,
  Settings,
  SlidersHorizontal,
  FileText,
  ShieldAlert,
  ArrowDownCircle,
  Plus,
  Mic,
  Send,
  Sparkles,
  Bot,
  RotateCcw,
  Volume2,
  ArrowLeft,
  Check,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';
import { AgentChat } from '@/components/agent-chat';
import { MultimodalBookkeeping } from '@/components/multimodal-bookkeeping';
import { ConversationalCfarSimulator } from '@/components/chat/conversational-cfar-simulator';
import { AgentExecutionChat } from '@/components/chat/agent-execution-chat';
import { consumeDataStreamText } from '@/lib/ai-stream';
import { toPlainChatText } from '@/lib/chat-format';
import type { SpendCategory } from '@/lib/types';

export interface CopilotTabProps {
  onBack?: () => void;
  onOpenSheet?: (sheet: 'sandbox' | 'audit' | 'expense' | 'notifications') => void;
  onOpenWhatIf?: () => void;
  initialProposal?: {
    merchant: string;
    amount: number;
    category: string;
  } | null;
  onClearProposal?: () => void;
  initialCfarActive?: boolean;
  onClearCfar?: () => void;
}

const SPEND_CATEGORIES: SpendCategory[] = [
  'Bills_Utilities',
  'Campus_Cafeteria_Basic',
  'Medical',
  'Transport_Essential',
  'Food_Delivery_Grab_Foodpanda',
  'Entertainment',
  'Bubble_Tea_Dining',
  'Shopping',
];

/** Normalise the free-form OCR category into the engine's strict enum. */
function toSpendCategory(raw: string): SpendCategory {
  const exact = SPEND_CATEGORIES.find((category) => category.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;

  const c = raw.toLowerCase();
  if (c.includes('bill') || c.includes('utilit')) return 'Bills_Utilities';
  if (c.includes('campus') || c.includes('cafeteria')) return 'Campus_Cafeteria_Basic';
  if (c.includes('medical') || c.includes('health') || c.includes('pharmacy')) return 'Medical';
  if (c.includes('transport') || c.includes('grab') || c.includes('ride')) return 'Transport_Essential';
  if (c.includes('delivery') || c.includes('foodpanda')) return 'Food_Delivery_Grab_Foodpanda';
  if (c.includes('entertain') || c.includes('stream') || c.includes('game')) return 'Entertainment';
  if (c.includes('food') || c.includes('dining') || c.includes('cafe') || c.includes('tea')) {
    return 'Bubble_Tea_Dining';
  }
  return 'Shopping';
}

function buildProposalPrompt(
  text: string,
  proposal: { merchant: string; amount: number; category: string },
): string {
  return `The user is reviewing this intercepted payment in the CtrlPay sandbox:
- Merchant: ${proposal.merchant}
- Amount: RM ${proposal.amount.toFixed(2)}
- Category: ${proposal.category} (engine category: ${toSpendCategory(proposal.category)})
- Ledger base currency: MYR

The user's message is: ${text}

Reply directly to the user's message. Use a tool whenever you need a money figure; never invent one. Do not call propose_quarantine, propose_escrow, or propose_sweep in this chat — the user is asking a question, not approving a contract. Keep it warm and concise.

Formatting: answer like a normal chat message in plain prose. Do NOT use Markdown tables, headings, bold markers, pipe tables, or code blocks. Use 2-4 short paragraphs; if you need a list, use at most 3 plain lines beginning with "-". Do not dump every ledger field — mention only the numbers needed to answer.`;
}

function buildDeterministicProposalReply(
  text: string,
  proposal: { merchant: string; amount: number; category: string },
  notice?: string,
): string {
  const state = useCtrlPayStore.getState();
  const snapshot = state.ledgerSnapshot();
  const result = state.runWhatIf({
    merchant: proposal.merchant,
    amount: proposal.amount,
    category: toSpendCategory(proposal.category),
    isNeed: false,
  });
  const prefix = notice ? `${notice}\n\n` : '';
  const asksForRisk = /cfar|what.?if|simulat|afford|shortfall|risk|safe|allowance/i.test(text);
  const asksForBudget = /budget|plan|save|saving/i.test(text);

  if (asksForBudget) {
    return `${prefix}Deterministic budget snapshot:
• Safe daily allowance: RM ${state.dynamicDailyAllowance().toFixed(2)}
• After this payment: RM ${result.dynamicDailyAllowance.toFixed(2)}
• Monthly savings goal: RM ${snapshot.monthlySavingsGoal.toFixed(2)}

Keep discretionary spending inside the daily allowance and protect the savings goal. Nothing moves without your click.`;
  }

  if (asksForRisk) {
    return `${prefix}Here is the deterministic engine snapshot for this payment:
• 95% CFaR: RM ${result.cfar95.toFixed(2)}
• Shortfall probability: ${result.shortfallProbability.toFixed(1)}%
• Risk level: ${result.riskLevel}
• Safe daily allowance after this payment: RM ${result.dynamicDailyAllowance.toFixed(2)}

Nothing has moved. You remain in control.`;
  }

  return `${prefix}I couldn't reach the live AI service just now. Your current sandbox balance is RM ${snapshot.currentBalance.toFixed(2)} and today's deterministic allowance is RM ${state.dynamicDailyAllowance().toFixed(2)}. You can still use the What-If simulator; no payment has moved.`;
}

export function CopilotTab({
  onBack,
  onOpenSheet,
  onOpenWhatIf,
  initialProposal,
  onClearProposal,
  initialCfarActive = false,
  onClearCfar,
}: CopilotTabProps) {
  const profile = useCtrlPayStore((s) => s.profile);
  const userName = profile.fullName?.split(' ')[0] || 'Jerome';
  const totalExpenses = useCtrlPayStore((s) => s.totalExpenses);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const categoryExpenses = useCtrlPayStore((s) => s.categoryExpenses);
  const safeAllowance = useCtrlPayStore((s) => s.dynamicDailyAllowance());

  const [proposal, setProposal] = React.useState(initialProposal ?? null);
  const [activeQuery, setActiveQuery] = React.useState<{
    intent?: 'report' | 'zombie' | 'sweep' | 'whatif' | 'general';
    prompt: string;
  } | null>(null);
  const [inputText, setInputText] = React.useState('');
  const [livePrompt, setLivePrompt] = React.useState<string | null>(null);
  const [isVoiceActive, setIsVoiceActive] = React.useState(false);
  const [isBlinking, setIsBlinking] = React.useState(false);
  const [isCfarSimulating, setIsCfarSimulating] = React.useState<boolean>(Boolean(initialCfarActive));

  React.useEffect(() => {
    if (initialCfarActive) {
      setIsCfarSimulating(true);
      setLivePrompt(null);
      setActiveQuery(null);
    }
  }, [initialCfarActive]);

  // Progressive streaming steps for incoming AI proposals ("一条条流动地弹出")
  const [streamStep, setStreamStep] = React.useState<number>(0);
  const [isAiStreaming, setIsAiStreaming] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (proposal) {
      setStreamStep(1);
      setIsAiStreaming(true);

      const t1 = setTimeout(() => {
        setStreamStep(2);
        setIsAiStreaming(true);
      }, 500);

      const t2 = setTimeout(() => {
        setStreamStep(3);
        setIsAiStreaming(true);
      }, 1300);

      const t3 = setTimeout(() => {
        setStreamStep(4);
        setIsAiStreaming(false);
      }, 2100);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      setStreamStep(0);
      setIsAiStreaming(false);
    }
  }, [proposal]);

  const handleOrbClick = () => {
    setIsBlinking(true);
    setTimeout(() => setIsBlinking(false), 800);
  };

  // Proposal states
  const [isAdjustmentConfirmed, setIsAdjustmentConfirmed] = React.useState(false);
  const [extraChatMessages, setExtraChatMessages] = React.useState<
    Array<{ id: string; role: 'user' | 'assistant'; text: string; time?: string }>
  >([]);
  const [isProposalThinking, setIsProposalThinking] = React.useState(false);

  const proposalRisk = React.useMemo(() => {
    if (!proposal) return null;
    return useCtrlPayStore.getState().runWhatIf({
      merchant: proposal.merchant,
      amount: proposal.amount,
      category: toSpendCategory(proposal.category),
      isNeed: false,
    });
  }, [proposal]);

  const categoryRows = React.useMemo(() => {
    const total = totalExpenses > 0 ? totalExpenses : 1;
    const palette = ['#F59E0B', '#EC4899', '#0EA5E9', '#10B981'];
    return Object.entries(categoryExpenses ?? {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([name, amount], index) => ({
        name: name.replace(' & ', ' '),
        amount,
        percent: Math.max(0, Math.min(100, Math.round((amount / total) * 100))),
        color: palette[index] ?? '#94A3B8',
      }));
  }, [categoryExpenses, totalExpenses]);

  const topCategory = categoryRows[0] ?? {
    name: 'Monthly spending',
    amount: totalExpenses,
    percent: 100,
    color: '#F59E0B',
  };
  const savingsGoal = useCtrlPayStore.getState().ledgerSnapshot().monthlySavingsGoal;
  const afterPaymentAllowance = proposalRisk?.dynamicDailyAllowance ?? safeAllowance;
  const allowanceDrop =
    safeAllowance > 0
      ? Math.max(0, Math.round(((safeAllowance - afterPaymentAllowance) / safeAllowance) * 100))
      : 0;

  React.useEffect(() => {
    if (initialProposal) {
      setProposal(initialProposal);
      setIsAdjustmentConfirmed(false);
      setLivePrompt(null);
      setActiveQuery(null);
    }
  }, [initialProposal]);

  // Suggestions following plan.md replacing the placeholders from the reference image
  const suggestions = [
    {
      id: 'whatif',
      title: 'What-If CFaR',
      prompt: 'Run a What-If CFaR simulation on my spending and test survival runway.',
      icon: SlidersHorizontal,
      color: '#7C3AED',
      bgColor: 'rgba(124, 58, 237, 0.12)',
      action: () => {
        setIsCfarSimulating(true);
      },
    },
    {
      id: 'report',
      title: 'Spending Report',
      prompt: 'Generate my daily spending summary and subscription roast report.',
      icon: FileText,
      color: '#7C3AED',
      bgColor: 'rgba(124, 58, 237, 0.12)',
      action: () =>
        setActiveQuery({
          intent: 'report',
          prompt: 'Generate my daily spending summary and subscription roast report.',
        }),
    },
    {
      id: 'zombie',
      title: 'Zombie Radar',
      prompt: 'Scan all recurring payments to detect zombie subscriptions.',
      icon: ShieldAlert,
      color: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.12)',
      action: () =>
        setActiveQuery({
          intent: 'zombie',
          prompt: 'Scan all recurring payments to detect zombie subscriptions.',
        }),
    },
    {
      id: 'sweep',
      title: 'Savings Sweep',
      prompt: 'Audit subscriptions for student discounts and recommend downgrade sweeps.',
      icon: ArrowDownCircle,
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.12)',
      action: () =>
        setActiveQuery({
          intent: 'sweep',
          prompt: 'Audit subscriptions for student discounts and recommend savings sweeps.',
        }),
    },
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const lower = text.toLowerCase();
    if (
      lower.includes('what-if') ||
      lower.includes('what if') ||
      lower.includes('cfar') ||
      lower.includes('simulate')
    ) {
      setIsCfarSimulating(true);
      setInputText('');
      return;
    }
    if (proposal) {
      handleProposalSend(text.trim());
      return;
    }
    setActiveQuery(null);
    setLivePrompt(text.trim());
    setInputText('');
  };

  const handleProposalSend = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isProposalThinking || !proposal) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: trimmed,
      time: 'Just now',
    };
    setExtraChatMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsProposalThinking(true);

    let unavailableNotice: string | undefined;

    try {
      const state = useCtrlPayStore.getState();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              id: `proposal-${Date.now()}`,
              role: 'user',
              content: buildProposalPrompt(trimmed, proposal),
            },
          ],
          ledgerSnapshot: state.ledgerSnapshot(),
          autonomy: {
            masterAutonomyEnabled: state.masterAutonomyEnabled,
            enabledTiers: state.enabledTiers,
          },
        }),
      });

      if (res.ok) {
        const result = await consumeDataStreamText(res);
        if (result.text) {
          setExtraChatMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: 'assistant' as const,
              text: result.text,
              time: 'Just now',
            },
          ]);
          return;
        }

        if (result.toolCalls > 0) {
          setExtraChatMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              role: 'assistant' as const,
              text: 'The agent prepared a contract proposal for this payment. Please review the card in the payment interceptor; nothing moves without your explicit approval.',
              time: 'Just now',
            },
          ]);
          return;
        }

        unavailableNotice = result.error
          ? `Live AI unavailable: ${result.error}`
          : 'Live AI returned no text.';
      } else if (res.status === 503) {
        unavailableNotice = 'Live AI is not configured in this deployment.';
      } else {
        unavailableNotice = `Live AI is unavailable (HTTP ${res.status}).`;
      }
    } catch (err) {
      console.warn('[COPILOT_PROPOSAL_AI]', err);
      unavailableNotice = 'Live AI is temporarily unreachable.';
    } finally {
      setIsProposalThinking(false);
    }

    setExtraChatMessages((prev) => [
      ...prev,
      {
        id: `ai-${Date.now()}`,
        role: 'assistant' as const,
        text: buildDeterministicProposalReply(trimmed, proposal, unavailableNotice),
        time: 'Just now',
      },
    ]);
  };

  const handleConfirmAdjustment = () => {
    setIsAdjustmentConfirmed(true);
    setTimeout(() => {
      setExtraChatMessages((prev) => [
        ...prev,
        {
          id: `ai-confirm-${Date.now()}`,
          role: 'assistant' as const,
          text: '✅ Snapshot acknowledged. No budget or payment was changed. Use the payment interceptor card to approve, modify, or decline the actual proposal.',
          time: 'Just now',
        },
      ]);
    }, 400);
  };

  const handleCloseProposal = () => {
    setProposal(null);
    setActiveQuery(null);
    onClearProposal?.();
  };

  // If What-If CFaR simulation is active, render inside the AI chat interface
  if (isCfarSimulating) {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3 select-none">
        {/* Chat Header matching Copilot / CtrlPay - Sticky Frosted Glass Top Navigation */}
        <header className="sticky -top-1 z-30 -mx-3 px-4 pt-2.5 pb-2.5 ct-header-glass flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsCfarSimulating(false);
                onClearCfar?.();
              }}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/60 hover:bg-white/90 border border-white/80 text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-white shadow-xs"
              style={{
                background:
                  'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-black tracking-tight text-[#0B1E3F]">
                CtrlPay Copilot
              </h2>
              <p className="text-[11px] font-medium text-[#7C3AED]">
                What-If CFaR Simulator · <span className="font-bold text-[#0B1E3F]/60">Base ledger MYR</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsCfarSimulating(false);
              onClearCfar?.();
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/60 hover:bg-white/90 border border-white/80 px-3 py-1.5 text-[11px] font-bold text-[#0B1E3F] shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </header>

        {/* Conversational CFaR Simulator inside same chat thread */}
        <div className="px-0.5">
          <ConversationalCfarSimulator
            onBack={() => {
              setIsCfarSimulating(false);
              onClearCfar?.();
            }}
            onFreeformQuery={(text) => {
              setIsCfarSimulating(false);
              onClearCfar?.();
              setActiveQuery(null);
              setLivePrompt(text);
            }}
          />
        </div>
      </div>
    );
  }

  // If initialProposal is active, display within the ORIGINAL Copilot Chat layout
  if (proposal) {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3 select-none">
        {/* Chat Header (Original design) - Sticky Frosted Glass Top Navigation */}
        <header className="sticky -top-1 z-30 -mx-3 px-4 pt-2.5 pb-2.5 ct-header-glass flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                handleCloseProposal();
                onBack?.();
              }}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/60 hover:bg-white/90 border border-white/80 text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-black tracking-tight text-[#0B1E3F]">
                CtrlPay Copilot
              </h2>
              <p className="text-[11px] font-medium text-slate-500">
                Autonomous Financial AI · <span className="font-bold text-[#0B1E3F]/60">Base ledger MYR</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseProposal}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/60 hover:bg-white/90 border border-white/80 px-3 py-1.5 text-[11px] font-bold text-[#0B1E3F] shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </header>

        {/* Chat message viewport: rendered directly on background without outer white card */}
        <div className="min-h-[68vh] flex flex-col justify-between space-y-3 px-0.5">
          <div className="space-y-3.5 overflow-y-auto no-scrollbar pb-3">
            {/* 1. User Message (Auto-triggered query, progressive step 1) */}
            {streamStep >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                className="flex justify-end"
              >
                <div className="max-w-[85%] rounded-[20px] rounded-tr-sm bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white px-4 py-2.5 text-[12.5px] font-medium shadow-sm">
                  Analyze my RM {proposal.amount.toFixed(2)} purchase at {proposal.merchant}
                </div>
              </motion.div>
            )}

            {/* AI Streaming Thinking Indicator */}
            {isAiStreaming && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-[11px] text-[#7C3AED] pl-2 py-1"
              >
                <div className="relative shrink-0 w-6 h-6 rounded-full overflow-hidden shadow-xs flex items-center justify-center bg-gradient-to-tr from-[#A855F7] to-[#6366F1] text-white">
                  <Bot className="h-3 w-3 animate-spin" />
                </div>
                <div className="flex items-center gap-1.5 bg-purple-50/80 px-2.5 py-1 rounded-full border border-purple-100">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span className="font-medium text-[10.5px]">AI Copilot is streaming financial intelligence...</span>
                </div>
              </motion.div>
            )}

            {/* 2. AI Message 1: Extraction & Context Summary (progressive step 2) */}
            {streamStep >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="flex items-start gap-2.5"
              >
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
                  style={{
                    background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
                  }}
                >
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2 max-w-[92%]">
                  <div className="rounded-[20px] rounded-tl-sm bg-white/95 backdrop-blur-xl p-3.5 text-[12.5px] text-slate-700 shadow-sm border border-gray-100/80 leading-relaxed">
                    <p>
                      Hello {userName}! 👋 I’ve analyzed your receipt for{' '}
                      <span className="font-extrabold text-[#04222B]">RM {proposal.amount.toFixed(2)}</span> at{' '}
                      <span className="font-extrabold text-[#04222B]">{proposal.merchant}</span> (Category:{' '}
                      <span className="font-bold text-[#7C3AED]">{proposal.category}</span>).
                    </p>
                    <p className="mt-1.5 text-[11.5px] text-slate-500">
                      Your snapshot shows <span className="font-bold text-[#0F172A]">RM {totalExpenses.toFixed(2)}</span> spent this month
                      and <span className="font-bold text-emerald-700">RM {currentBalance.toFixed(2)}</span> available in the sandbox.
                    </p>
                  </div>
                  {/* Reaction micro-controls matching reference style */}
                  <div className="flex items-center gap-3 pl-1 text-slate-400 text-[11px]">
                    <button type="button" className="hover:text-slate-600 transition-colors">👍 Helpful</button>
                    <button type="button" className="hover:text-slate-600 transition-colors">👎</button>
                    <button
                      type="button"
                      onClick={() => alert('Summary copied to clipboard!')}
                      className="hover:text-slate-600 transition-colors flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3. AI Message 2: Visual Spending Analytics & Burn Bar (progressive step 3) */}
            {streamStep >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="flex items-start gap-2.5"
              >
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
                  style={{
                    background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
                  }}
                >
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2.5 max-w-[92%]">
                  {/* VISUAL GRAPH 1: Top category share of monthly spend */}
                  <div className="rounded-[20px] bg-white/95 backdrop-blur-xl p-3.5 shadow-sm border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        {topCategory.name} · Share of Monthly Spend
                      </span>
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-black text-amber-700 border border-amber-200">
                        {topCategory.percent}% of total
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-sans text-[19px] font-black text-[#04222B]">RM {topCategory.amount.toFixed(2)}</span>
                        <span className="text-[11px] font-bold text-gray-400 ml-1">of RM {totalExpenses.toFixed(2)}</span>
                      </div>
                      <span className="text-[10.5px] font-extrabold text-rose-600">{topCategory.percent}%</span>
                    </div>

                    <div className="relative h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${topCategory.percent}%` }}
                        transition={{ duration: 0.9, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      This is the actual sandbox category total, not a fabricated budget. The deterministic engine uses its own allowances below.
                    </p>
                  </div>

                  {/* VISUAL GRAPH 2: Category Breakdown */}
                  <div className="rounded-[20px] bg-white/95 backdrop-blur-xl p-3.5 shadow-sm border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-[#7C3AED]" />
                        Category Spending Breakdown
                      </span>
                      <span className="text-[9.5px] font-bold text-gray-400">Monthly</span>
                    </div>

                    <div className="space-y-1.5">
                      {categoryRows.map((item) => (
                        <div key={item.name} className="space-y-0.5">
                          <div className="flex items-center justify-between text-[10.5px] font-bold">
                            <span className="text-gray-700 flex items-center gap-1">
                              {item.name}
                            </span>
                            <span className="text-[#04222B]">
                              RM {item.amount.toFixed(2)} · {item.percent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: item.color }}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percent}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* VISUAL METRIC CARD 3: Protected savings goal */}
                  <div className="rounded-[20px] bg-gradient-to-br from-[#04222B] to-[#0A3D4A] p-3 text-white shadow-xs space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-4.5 w-4.5 place-items-center rounded-full bg-[#10B981] text-white">
                        <TrendingDown className="h-3 w-3" />
                      </span>
                      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-cyan-200">
                        Protected Savings Goal
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-sans text-[18px] font-black text-white">RM {savingsGoal.toFixed(2)}</span>
                      <span className="text-[10px] font-extrabold text-[#10B981]">/ month</span>
                    </div>
                    <p className="text-[10px] text-gray-300 leading-relaxed">
                      This goal is part of the deterministic sandbox snapshot. CtrlPay never spends it for you, and the AI never invents a savings figure.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 4. AI Message 3: Actionable Proposal & One-Click Adjust (progressive step 4) */}
            {streamStep >= 4 && (
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="flex items-start gap-2.5"
              >
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
                  style={{
                    background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-2 max-w-[92%]">
                  <div className="rounded-[20px] bg-white/95 backdrop-blur-xl p-3.5 shadow-sm border border-gray-100 space-y-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-purple-50 text-purple-700">
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-purple-700">
                        Engine Recommendation
                      </span>
                    </div>

                    <div>
                      <h3 className="text-[14.5px] font-bold text-[#04222B] leading-tight">
                        Keep this payment inside today&apos;s safe allowance
                      </h3>
                      <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                        The deterministic engine computes RM {safeAllowance.toFixed(2)} of safe daily spending today; after this RM {proposal.amount.toFixed(2)} payment, the stressed allowance is RM {afterPaymentAllowance.toFixed(2)}.
                      </p>
                    </div>

                    {/* Before vs After Display */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <div className="rounded-xl bg-gray-50/80 p-2 border border-gray-200/60 text-center">
                        <span className="text-[9.5px] font-medium text-gray-500">Today&apos;s Allowance</span>
                        <p className="font-sans text-[16px] font-bold text-gray-700 mt-0.5">
                          RM {safeAllowance.toFixed(2)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-[#ECFDF5] p-2 border border-[#A7F3D0] text-center relative overflow-hidden">
                        {allowanceDrop > 0 && (
                          <span className="absolute top-1 right-1 rounded-full bg-[#059669] text-white px-1 py-0.1 text-[7px] font-black">
                            -{allowanceDrop}%
                          </span>
                        )}
                        <span className="text-[9.5px] font-bold text-[#059669]">After Payment</span>
                        <p className="font-sans text-[16px] font-bold text-[#059669] mt-0.5">
                          RM {afterPaymentAllowance.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Engine risk pill */}
                    <div className="rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100/60 p-2 flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-purple-800 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Engine Risk
                      </span>
                      <span className="font-extrabold text-[#04222B]">
                        {proposalRisk?.riskLevel ?? 'LOW'} · CFaR RM {(proposalRisk?.cfar95 ?? 0).toFixed(2)}
                      </span>
                    </div>

                    {/* Interactive acknowledgement */}
                    <div className="pt-0.5">
                      {isAdjustmentConfirmed ? (
                        <div className="w-full rounded-xl bg-[#059669] text-white py-2.5 text-center font-bold text-[12px] shadow-sm flex items-center justify-center gap-1.5">
                          <Check className="h-4 w-4 stroke-[3]" />
                          <span>Snapshot acknowledged — nothing moved</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConfirmAdjustment}
                          className="w-full rounded-xl bg-[#04222B] hover:bg-[#1E1B4B] text-white py-2.5 text-[12px] font-bold shadow-sm active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                          <span>Acknowledge engine snapshot</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Live AI thinking state for proposal follow-ups */}
            {isProposalThinking && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5"
              >
                <div
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-xs"
                >
                  <Bot className="h-4 w-4 animate-pulse" />
                </div>
                <div className="max-w-[85%] rounded-[20px] rounded-tl-sm bg-white/95 px-3.5 py-2.5 text-[11.5px] font-medium text-slate-500 shadow-xs border border-gray-100">
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#7C3AED]/25 border-t-[#7C3AED]" />
                    Checking your ledger with live AI...
                  </span>
                </div>
              </motion.div>
            )}

            {/* Dynamic Extra Chat Messages */}
            {extraChatMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {msg.role === 'assistant' && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white text-[11px] shadow-xs">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={cn(
                    'max-w-[85%] whitespace-pre-wrap break-words rounded-[20px] px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-xs',
                    msg.role === 'user'
                      ? 'rounded-tr-sm bg-[#04222B] text-white font-medium'
                      : 'rounded-tl-sm bg-white text-slate-700 border border-gray-100'
                  )}
                >
                  {msg.role === 'assistant' ? toPlainChatText(msg.text) : msg.text}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Bottom Area: Quick Chips + Input Form directly on canvas */}
          <div className="pt-2 space-y-2">
            {/* Quick Prompt Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
              {[
                '📊 Show spending chart',
                '🎯 Create a budget plan',
                '💡 Can I afford dinner out tonight?',
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleProposalSend(chip)}
                  disabled={isProposalThinking}
                  className="rounded-full bg-white/90 border border-gray-200/90 px-3 py-1 text-[11px] font-bold text-gray-700 shadow-2xs hover:border-[#6366F1] hover:text-[#6366F1] transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar matching original Copilot style */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!isProposalThinking) handleProposalSend(inputText);
              }}
              className={cn(
                'flex items-center gap-2 rounded-full p-1.5 shadow-sm transition-all',
                'bg-white/95 border border-white focus-within:bg-white focus-within:shadow-md focus-within:border-[#6366F1]/40'
              )}
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask Copilot about this proposal..."
                className="flex-1 bg-transparent px-3 text-[13px] font-medium text-[#0B1E3F] placeholder:text-slate-400 focus:outline-none"
              />
              {inputText.trim() ? (
                <button
                  type="submit"
                  disabled={isProposalThinking}
                  className="grid h-8 w-8 place-items-center rounded-full bg-[#4F46E5] text-white shadow-md hover:scale-105 active:scale-90 transition-all shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  {isProposalThinking ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVoiceActive(true)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-md hover:scale-105 active:scale-90 transition-all shrink-0"
                  aria-label="Voice input"
                >
                  <Mic className="h-3.5 w-3.5" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Free-form questions use the live Groq agent. The fixed report/zombie/sweep
  // suggestions above still use the deterministic engine trace.
  if (livePrompt) {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3 select-none">
        <header className="sticky -top-1 z-30 -mx-3 px-4 pt-2.5 pb-2.5 ct-header-glass flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLivePrompt(null)}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/60 hover:bg-white/90 border border-white/80 text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-all"
              aria-label="Back to Copilot"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-white shadow-xs"
              style={{
                background:
                  'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-black tracking-tight text-[#0B1E3F]">
                CtrlPay Copilot
              </h2>
              <p className="text-[11px] font-medium text-[#7C3AED]">
                Live Groq · <span className="font-bold text-[#0B1E3F]/60">Base ledger MYR</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLivePrompt(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/60 hover:bg-white/90 border border-white/80 px-3 py-1.5 text-[11px] font-bold text-[#0B1E3F] shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </header>

        <div className="rounded-[28px] bg-white/90 p-3.5 shadow-sm border border-white/80 backdrop-blur-md min-h-[66vh] flex flex-col">
          <AgentChat
            key={livePrompt}
            initialPrompt={livePrompt}
            withBookkeeping={false}
            compact
          />
        </div>
      </div>
    );
  }

  // If a chat query is active, display the interactive Agent Execution Chat interface
  if (activeQuery) {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3">
        {/* Chat Header - Sticky Frosted Glass Top Navigation */}
        <header className="sticky -top-1 z-30 -mx-3 px-4 pt-2.5 pb-2.5 ct-header-glass flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveQuery(null)}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/60 hover:bg-white/90 border border-white/80 text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-all"
              aria-label="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div
              className="grid h-8 w-8 place-items-center rounded-full text-white shadow-xs"
              style={{
                background:
                  'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-black tracking-tight text-[#0B1E3F]">
                CtrlPay Copilot
              </h2>
              <p className="text-[11px] font-medium text-[#7C3AED]">
                Agent Execution &amp; Tool Calling · <span className="font-bold text-[#0B1E3F]/60">Base ledger MYR</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveQuery(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/60 hover:bg-white/90 border border-white/80 px-3 py-1.5 text-[11px] font-bold text-[#0B1E3F] shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] backdrop-blur-md active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </header>

        {/* Real Tool Execution Chat View with Agent Trace */}
        <div className="px-0.5">
          <AgentExecutionChat
            initialQuery={activeQuery}
            onClose={() => setActiveQuery(null)}
            onFreeformQuery={(text) => {
              setActiveQuery(null);
              setLivePrompt(text);
            }}
            onOpenWhatIf={() => {
              setActiveQuery(null);
              setIsCfarSimulating(true);
            }}
            onOpenAudit={() => onOpenSheet?.('audit')}
          />
        </div>
      </div>
    );
  }

  // Voice Mode modal view
  if (isVoiceActive) {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3">
        <header className="sticky -top-1 z-30 -mx-3 px-4 pt-2.5 pb-2.5 ct-header-glass flex items-center justify-between transition-all">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-[#6366F1] animate-pulse" />
            <h2 className="text-[17px] font-black text-[#0B1E3F]">Voice Copilot</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsVoiceActive(false)}
            className="rounded-full bg-white/80 border border-white/90 px-3 py-1 text-[11px] font-bold text-[#0B1E3F]"
          >
            Close
          </button>
        </header>
        <div className="rounded-[28px] bg-white/90 p-4 shadow-sm border border-white/80 backdrop-blur-md">
          <MultimodalBookkeeping defaultOpen defaultMode="VOICE" autoStartVoice={true} />
        </div>
      </div>
    );
  }

  // Default Welcome View matching the reference UI screenshot
  return (
    <div className="animate-fade-in -mx-1 pb-16 flex flex-col justify-between min-h-[78vh] select-none">
      {/* 1. Header with Menu & Settings circular buttons */}
      <header className="flex items-center justify-between pt-1 px-1">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/75 border border-white/90 text-slate-700 shadow-xs hover:bg-white active:scale-95 transition-all text-[12px] font-bold"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenSheet?.('sandbox')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/75 border border-white/90 text-slate-700 shadow-xs hover:bg-white active:scale-95 transition-all"
            aria-label="Menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenSheet?.('audit')}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/75 border border-white/90 text-slate-700 shadow-xs hover:bg-white active:scale-95 transition-all"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </header>

      {/* 2. Hero Greeting */}
      <div className="text-center pt-2 px-4 space-y-1">
        <h1 className="text-[23px] font-bold tracking-tight text-[#1E1B4B] font-sans">
          Hello, {userName}!
        </h1>
        <p className="text-[14.5px] font-medium text-slate-500">
          How can I help you today?
        </p>
        <div className="flex justify-center pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6366F1]/20 bg-white/70 px-2.5 py-1 text-[9.5px] font-bold text-[#4F46E5] shadow-2xs backdrop-blur-md">
            <Sparkles className="h-3 w-3" />
            Live Groq · free-form answers
          </span>
        </div>
      </div>

      {/* 3. Centerpiece Glowing AI Orb with Visor Eyes matching screenshot */}
      <div className="my-auto py-5 flex flex-col items-center justify-center">
        {/* Floating Orb Container */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleOrbClick}
          className="relative group cursor-pointer transition-transform"
          style={{ animation: 'orb-levitate 3.6s ease-in-out infinite' }}
          title="Click me!"
        >
          {/* Ethereal specular glass orbital rim */}
          <div className="absolute -inset-2.5 rounded-full border-[1.5px] border-white/70 shadow-[0_0_30px_rgba(168,85,247,0.35)] pointer-events-none" />

          {/* 3D Radiant Gradient Sphere */}
          <div
            className={cn(
              'h-36 w-36 sm:h-40 sm:w-40 rounded-full relative flex items-center justify-center transition-all duration-300',
              'shadow-[0_16px_40px_rgba(99,102,241,0.45),0_0_50px_rgba(192,132,252,0.35)]'
            )}
            style={{
              background:
                'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 30%, #818CF8 65%, #4F46E5 100%)',
              boxShadow:
                'inset 0 3px 6px rgba(255, 255, 255, 0.8), inset 0 -6px 12px rgba(15, 23, 42, 0.35), 0 16px 44px rgba(79, 70, 229, 0.45)',
            }}
          >
            {/* Specular gloss highlight on top-left */}
            <div className="absolute top-3 left-6 h-10 w-16 rounded-full bg-gradient-to-b from-white/60 to-transparent blur-xs transform -rotate-25 pointer-events-none" />

            {/* Glowing Visor Capsule Eyes in Center */}
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  'h-5.5 w-2 rounded-full bg-white shadow-[0_0_10px_#ffffff] transition-all duration-150',
                  isBlinking && 'scale-y-[0.1]'
                )}
                style={{
                  animation: !isBlinking ? 'eye-blink 4.2s infinite' : undefined,
                }}
              />
              <span
                className={cn(
                  'h-5.5 w-2 rounded-full bg-white shadow-[0_0_10px_#ffffff] transition-all duration-150',
                  isBlinking && 'scale-y-[0.1]'
                )}
                style={{
                  animation: !isBlinking ? 'eye-blink 4.2s infinite' : undefined,
                }}
              />
            </div>
          </div>
        </div>

        {/* Ambient levitation shadow on floor */}
        <div
          className="h-4 w-28 rounded-full bg-[#312E81]/20 blur-md mt-4 transition-all"
          style={{ animation: 'orb-shadow-pulse 3.6s ease-in-out infinite' }}
        />
      </div>

      {/* 4. Suggestions 2x2 Grid replacing placeholders with plan.md features */}
      <div className="grid grid-cols-2 gap-2.5 px-1 mb-4">
        {suggestions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              className={cn(
                'rounded-2xl p-3 flex items-center gap-2.5 text-left transition-all duration-200',
                'bg-white/70 border border-white/80 shadow-[0_4px_16px_rgba(11,30,63,0.04)] backdrop-blur-xl',
                'hover:bg-white hover:shadow-md hover:-translate-y-0.5 active:scale-95'
              )}
            >
              <div
                className="grid h-8 w-8 place-items-center rounded-xl shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: item.bgColor, color: item.color }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[12.5px] font-bold text-[#0B1E3F] tracking-tight leading-tight">
                {item.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. Bottom Floating Input Bar matching the reference UI screenshot */}
      <div className="px-0.5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputText);
          }}
          className={cn(
            'flex items-center gap-2 rounded-full p-1.5 shadow-[0_8px_28px_rgba(11,30,63,0.08)] backdrop-blur-2xl transition-all',
            'bg-white/80 border border-white/90 focus-within:bg-white focus-within:shadow-lg focus-within:border-[#6366F1]/40'
          )}
        >
          {/* Left + button */}
          <button
            type="button"
            onClick={() => onOpenSheet?.('expense')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#4F46E5] border border-slate-100 shadow-xs hover:bg-[#EEF2FF] active:scale-90 transition-all shrink-0"
            aria-label="Add expense or action"
          >
            <Plus className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask anything — live Groq..."
            className="flex-1 bg-transparent px-2 text-[13.5px] font-medium text-[#0B1E3F] placeholder:text-slate-400 focus:outline-none"
          />

          {/* Right Action Button: Send if text exists, otherwise glowing Voice Mic */}
          {inputText.trim() ? (
            <button
              type="submit"
              className="grid h-9 w-9 place-items-center rounded-full bg-[#4F46E5] text-white shadow-md shadow-indigo-500/30 hover:scale-105 active:scale-90 transition-all shrink-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsVoiceActive(true)}
              className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-md shadow-indigo-500/30 hover:scale-105 active:scale-90 transition-all shrink-0"
              aria-label="Voice input"
            >
              <Mic className="h-4 w-4" />
            </button>
          )}
        </form>
        <p className="mt-1.5 text-center text-[9.5px] font-medium text-slate-500">
          Fixed demo cards use the deterministic engine · free-form chat uses Live Groq
        </p>
      </div>
    </div>
  );
}
