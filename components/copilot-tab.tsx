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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';
import { AgentChat } from '@/components/agent-chat';
import { MultimodalBookkeeping } from '@/components/multimodal-bookkeeping';

export interface CopilotTabProps {
  onOpenSheet?: (sheet: 'sandbox' | 'audit' | 'expense' | 'notifications') => void;
  onOpenWhatIf?: () => void;
}

export function CopilotTab({ onOpenSheet, onOpenWhatIf }: CopilotTabProps) {
  const profile = useCtrlPayStore((s) => s.profile);
  const userName = profile.fullName?.split(' ')[0] || 'Jerome';

  const [activeQuery, setActiveQuery] = React.useState<string | null>(null);
  const [inputText, setInputText] = React.useState('');
  const [isVoiceActive, setIsVoiceActive] = React.useState(false);
  const [isBlinking, setIsBlinking] = React.useState(false);

  // Suggestions following plan.md replacing the placeholders from the reference image
  const suggestions = [
    {
      id: 'whatif',
      title: 'What-If Simulate',
      prompt: 'Run a What-If CFaR simulation on my spending and test survival runway.',
      icon: SlidersHorizontal,
      color: '#0070F3',
      bgColor: 'rgba(0, 112, 243, 0.12)',
      action: () => {
        if (onOpenWhatIf) onOpenWhatIf();
        else setActiveQuery('Run a What-If CFaR simulation on my spending.');
      },
    },
    {
      id: 'report',
      title: 'Spending Report',
      prompt: 'Generate my daily spending summary and subscription roast report.',
      icon: FileText,
      color: '#7C3AED',
      bgColor: 'rgba(124, 58, 237, 0.12)',
      action: () => setActiveQuery('Generate my spending summary and subscription roast report.'),
    },
    {
      id: 'zombie',
      title: 'Zombie Radar',
      prompt: 'Scan all recurring payments to detect zombie subscriptions.',
      icon: ShieldAlert,
      color: '#059669',
      bgColor: 'rgba(5, 150, 105, 0.12)',
      action: () => setActiveQuery('Scan my subscriptions for zombie or unused recurring fees.'),
    },
    {
      id: 'sweep',
      title: 'Savings Sweep',
      prompt: 'Audit subscriptions for student discounts and recommend downgrade sweeps.',
      icon: ArrowDownCircle,
      color: '#D97706',
      bgColor: 'rgba(217, 119, 6, 0.12)',
      action: () => setActiveQuery('Audit subscriptions for student discounts and recommend savings sweeps.'),
    },
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setActiveQuery(text.trim());
    setInputText('');
  };

  const handleOrbClick = () => {
    setIsBlinking(true);
    setTimeout(() => setIsBlinking(false), 800);
  };

  // If a chat query is active, display the interactive chat interface
  if (activeQuery) {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3">
        {/* Chat Header */}
        <header className="flex items-center justify-between pt-1 px-1">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-tr from-[#6366F1] to-[#8B5CF6] text-white shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[16px] font-black tracking-tight text-[#0B1E3F]">
                CtrlPay Copilot
              </h2>
              <p className="text-[11px] font-medium text-slate-500">Autonomous Financial AI</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveQuery(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-white/90 px-3 py-1.5 text-[11px] font-bold text-[#0B1E3F] shadow-xs hover:bg-white active:scale-95 transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </button>
        </header>

        {/* Chat message viewport with bookkeeping tools */}
        <div className="rounded-[28px] bg-white/85 p-3.5 shadow-sm border border-white/80 backdrop-blur-xl min-h-[68vh] flex flex-col">
          <AgentChat withBookkeeping={true} initialPrompt={activeQuery} />
        </div>
      </div>
    );
  }

  // Voice Mode modal view
  if (isVoiceActive) {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3">
        <header className="flex items-center justify-between pt-1 px-1">
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
        <button
          type="button"
          onClick={() => onOpenSheet?.('sandbox')}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/75 border border-white/90 text-slate-700 shadow-xs hover:bg-white active:scale-95 transition-all"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" />
        </button>

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
            placeholder="Ask me anything..."
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
      </div>
    </div>
  );
}
