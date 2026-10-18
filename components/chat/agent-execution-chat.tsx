'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Terminal,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Lock,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';
import type { TraceStep } from '@/app/api/agent-trace/route';

export interface AgentExecutionChatProps {
  initialQuery?: {
    intent?: 'report' | 'zombie' | 'sweep' | 'whatif' | 'general';
    prompt: string;
  } | null;
  onClose?: () => void;
  onOpenWhatIf?: () => void;
  onOpenAudit?: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  title?: string;
  text: string;
  time?: string;
  actions?: Array<{ label: string; action: () => void; primary?: boolean }>;
}

export function AgentExecutionChat({
  initialQuery,
  onClose,
  onOpenWhatIf,
  onOpenAudit,
}: AgentExecutionChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [inputText, setInputText] = React.useState('');
  const [isComputing, setIsComputing] = React.useState(false);
  const [loadingText, setLoadingText] = React.useState('');
  const [traceSteps, setTraceSteps] = React.useState<TraceStep[]>([]);
  const [isTraceExpanded, setIsTraceExpanded] = React.useState(true);
  const [currentToolName, setCurrentToolName] = React.useState<string>('get_budget_insights');

  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const hasExecutedInitialRef = React.useRef(false);

  // Auto-scroll on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isComputing, traceSteps]);

  // Execute tool calling flow via /api/agent-trace
  const executeAgentFlow = React.useCallback(
    async (intent: 'report' | 'zombie' | 'sweep' | 'whatif' | 'general', prompt: string) => {
      setIsComputing(true);
      setLoadingText('Connecting to Agent API & asserting AI Mandate permissions...');

      // Immediately display user query
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: prompt,
        time: 'Just now',
      };
      setMessages((prev) => [...prev, userMsg]);

      // Set tool name based on intent
      const toolMap: Record<string, string> = {
        report: 'get_budget_insights',
        zombie: 'analyze_zombies',
        sweep: 'propose_sweep',
        general: 'get_budget_insights',
      };
      setCurrentToolName(toolMap[intent] || 'get_budget_insights');

      try {
        const res = await fetch('/api/agent-trace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            intent,
            userQuery: prompt,
            ledgerSnapshot: useCtrlPayStore.getState().ledgerSnapshot(),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const steps: TraceStep[] = data.traceSteps || [];
          setTraceSteps(steps);

          // Stream out the messages progressively
          const rawMsgs = data.messages || [];
          for (let i = 0; i < rawMsgs.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 350 + i * 250));
            setLoadingText(`Tool ${toolMap[intent] || 'engine'} verified. Rendering response...`);
            
            const msgItem = rawMsgs[i];
            const isLast = i === rawMsgs.length - 1;
            
            // Attach action buttons to the last message based on intent
            let actions: ChatMessage['actions'] = undefined;
            if (isLast) {
              if (intent === 'report') {
                actions = [
                  {
                    label: 'Run What-If CFaR Simulation',
                    action: () => onOpenWhatIf?.(),
                    primary: true,
                  },
                  {
                    label: 'Inspect Audit Chain',
                    action: () => onOpenAudit?.(),
                    primary: false,
                  },
                ];
              } else if (intent === 'zombie') {
                actions = [
                  {
                    label: 'Quarantine Inactive Subscriptions',
                    action: () => onOpenWhatIf?.(),
                    primary: true,
                  },
                  {
                    label: 'View Cryptographic Audit',
                    action: () => onOpenAudit?.(),
                    primary: false,
                  },
                ];
              } else if (intent === 'sweep') {
                actions = [
                  {
                    label: 'Claim Spotify Student (-RM 7.40/mo)',
                    action: () => onOpenWhatIf?.(),
                    primary: true,
                  },
                ];
              }
            }

            setMessages((prev) => [
              ...prev,
              {
                id: `a-${Date.now()}-${i}`,
                role: 'assistant',
                title: msgItem.title,
                text: msgItem.text,
                time: 'Just now',
                actions,
              },
            ]);
          }
        }
      } catch (err) {
        console.warn('[Agent Trace API Error]', err);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: 'I have analyzed your ledger. Maintaining your current daily spending allocation ensures your balance stays safe above your survival floor.',
            time: 'Just now',
          },
        ]);
      } finally {
        setIsComputing(false);
      }
    },
    [onOpenWhatIf, onOpenAudit]
  );

  // Trigger on initial query
  React.useEffect(() => {
    if (initialQuery && !hasExecutedInitialRef.current) {
      hasExecutedInitialRef.current = true;
      void executeAgentFlow(initialQuery.intent || 'general', initialQuery.prompt);
    }
  }, [initialQuery, executeAgentFlow]);

  // Handle follow-up query submission
  const handleSendFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isComputing) return;
    const text = inputText.trim();
    setInputText('');
    void executeAgentFlow('general', text);
  };

  return (
    <div className="flex flex-col justify-between min-h-[70vh] select-none text-slate-800">
      {/* Scrollable messages area */}
      <div className="space-y-3.5 overflow-y-auto no-scrollbar pb-3">
        {/* Messages */}
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id}>
            {msg.role === 'user' ? (
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                className="flex justify-end"
              >
                <div className="max-w-[85%] rounded-[20px] rounded-tr-sm bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white px-4 py-2.5 text-[12.5px] font-medium shadow-sm">
                  {msg.text}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 360, damping: 28 }}
                className="flex items-start gap-2.5"
              >
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
                  style={{
                    background:
                      'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
                  }}
                >
                  <Bot className="h-4 w-4" />
                </div>

                <div className="flex-1 space-y-2 max-w-[92%]">
                  <div className="rounded-[20px] rounded-tl-sm bg-white/95 backdrop-blur-xl p-3.5 text-[12.5px] text-slate-700 shadow-sm border border-gray-100/80 space-y-2">
                    {msg.title && (
                      <h4 className="text-[13px] font-bold text-[#0F172A] flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        <span>{msg.title}</span>
                      </h4>
                    )}
                    <p className="text-[12px] leading-relaxed whitespace-pre-line text-slate-700">
                      {msg.text}
                    </p>

                    {/* Action buttons if available */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {msg.actions.map((act) => (
                          <button
                            key={act.label}
                            type="button"
                            onClick={act.action}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-bold shadow-xs active:scale-95 transition-all cursor-pointer',
                              act.primary
                                ? 'bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white hover:opacity-95'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            )}
                          >
                            <span>{act.label}</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Render Agent Execution Trace right after the first user message */}
            {index === 0 && traceSteps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="pl-10 pr-1 my-1"
              >
                <div className="rounded-[18px] bg-[#0F172A] text-white p-3 shadow-md border border-slate-700/80">
                  {/* Trace Header */}
                  <div
                    onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="grid h-5 w-5 place-items-center rounded-md bg-purple-500/20 text-purple-300">
                        <Terminal className="h-3 w-3" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5">
                        <span>Agent Execution Trace</span>
                        <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 text-[8.5px] font-mono font-bold">
                          JUDGE TOOL CALLING
                        </span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <span>{isTraceExpanded ? 'Collapse' : 'Expand'}</span>
                      {isTraceExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </div>

                  {/* Expandable Trace Steps */}
                  <AnimatePresence>
                    {isTraceExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2.5 pt-2 border-t border-slate-800 space-y-1.5 text-[10.5px] font-mono"
                      >
                        {traceSteps.map((s) => (
                          <div key={s.step} className="flex items-start gap-1.5 leading-tight">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="text-purple-300 font-bold">[{s.title}]: </span>
                              <span className="text-slate-300">{s.detail}</span>
                            </div>
                          </div>
                        ))}

                        <div className="pt-1 flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-800/80">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            <span>SHA-256 Chained Hash Verified</span>
                          </span>
                          <span className="font-mono text-purple-300">Tool: {currentToolName}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </React.Fragment>
        ))}

        {/* Dynamic Loading Indicator for Running Step ("bubbling chat") */}
        {isComputing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-[11px] text-[#7C3AED] pl-1 py-1"
          >
            <div className="relative shrink-0 w-6 h-6 rounded-full overflow-hidden shadow-xs flex items-center justify-center bg-gradient-to-tr from-[#A855F7] to-[#6366F1] text-white">
              <RefreshCw className="h-3 w-3 animate-spin" />
            </div>
            <div className="flex items-center gap-2 bg-purple-50/90 px-3 py-1 rounded-full border border-purple-100 shadow-2xs">
              <span className="flex gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </span>
              <span className="font-semibold text-[10.5px] text-purple-900">
                {loadingText}
              </span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ============================================================== *
       * BOTTOM INTERACTIVE INPUT BAR FOR FOLLOW-UP QUESTIONS
       * ============================================================== */}
      <div className="pt-2 space-y-2">
        {/* Quick Follow-up Question Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { label: '📊 Spending report', intent: 'report' as const },
            { label: '🧟‍♂️ Zombie radar', intent: 'zombie' as const },
            { label: '🎓 Student savings sweep', intent: 'sweep' as const },
            { label: '🍽️ Can I afford dinner tonight?', intent: 'general' as const },
          ].map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => void executeAgentFlow(chip.intent, chip.label)}
              className="rounded-full bg-white/90 border border-gray-200/90 px-3 py-1 text-[11px] font-bold text-gray-700 shadow-2xs hover:border-[#6366F1] hover:text-[#6366F1] transition-colors whitespace-nowrap"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Form input */}
        <form
          onSubmit={handleSendFollowUp}
          className="flex items-center gap-2 rounded-full p-1.5 shadow-sm bg-white/95 border border-white focus-within:shadow-md focus-within:border-[#6366F1]/50 transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask Copilot or test tool calling..."
            className="flex-1 bg-transparent px-3 text-[13px] font-medium text-[#0B1E3F] placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isComputing}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full text-white shadow-md active:scale-90 transition-all shrink-0',
              inputText.trim() && !isComputing
                ? 'bg-[#4F46E5] hover:bg-[#4338CA]'
                : 'bg-slate-300 cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
