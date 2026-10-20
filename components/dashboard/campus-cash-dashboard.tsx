'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, PanInfo } from 'framer-motion';
import {
  ArrowRight,
  Bell,
  CreditCard,
  PiggyBank,
  Search,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivitySection, type ActivityItem } from '@/components/activity-section';
import { AiMoneyAssistantCard } from '@/components/dashboard/ai-money-assistant-card';
import { CurrencySwitcherPill } from '@/components/currency-switcher-pill';
import { formatDisplayCurrency } from '@/lib/currency-ppp';
import { useCtrlPayStore } from '@/lib/store';

export interface CampusCashDashboardProps {
  onOpenProfile: () => void;
  onOpenTimeline: () => void;
  onOpenExpense: () => void;
  onOpenSimulator: () => void;
  onOpenAnalytics: () => void;
  onOpenNotifications: () => void;
  onOpenBudgetDetails: () => void;
  onOpenAllTransactions?: () => void;
  onOpenItem?: (item: ActivityItem) => void;
  /** iOS Back-Tap / shortcut quick log entry (v2.5). */
  onQuickLog?: () => void;
}

interface ExpenseCategory {
  name: string;
  percentage: number;
  amount: number;
  color: string;
  isHigh?: boolean;
}

export function CampusCashDashboard({
  onOpenProfile,
  onOpenTimeline,
  onOpenExpense,
  onOpenSimulator,
  onOpenAnalytics,
  onOpenNotifications,
  onOpenBudgetDetails,
  onOpenAllTransactions,
  onOpenItem,
  onQuickLog,
}: CampusCashDashboardProps) {
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const totalExpenses = useCtrlPayStore((s) => s.totalExpenses);
  const categoryExpenses = useCtrlPayStore((s) => s.categoryExpenses);
  const displayCurrency = useCtrlPayStore((s) => s.displayCurrency);

  // Slide state: 'main' is the photo replica, 'expenses' is the expenses graph
  const [activeSlide, setActiveSlide] = React.useState<'main' | 'expenses'>('main');
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);

  // Currency formatters: display-layer only — the ledger always stays in MYR.
  const formatCurrency = (rmAmount: number) => formatDisplayCurrency(rmAmount, displayCurrency);

  // Compact formatter: whole numbers to prevent ellipses truncation in capsules
  const formatCapsuleCurrency = (rmAmount: number) =>
    formatDisplayCurrency(rmAmount, displayCurrency, { decimals: 0 });

  // Route a live AI insight card to the relevant dashboard surface.
  const handleAiCardAction = (action: string) => {
    switch (action) {
      case 'budget':
        onOpenBudgetDetails();
        break;
      case 'transactions':
        (onOpenAllTransactions ?? onOpenAnalytics)();
        break;
      case 'timeline':
        onOpenTimeline();
        break;
      case 'notifications':
        onOpenNotifications();
        break;
      case 'cfar':
      default:
        onOpenSimulator();
        break;
    }
  };

  // Dynamic reactive categories computed from store category expenses & total
  const categories: ExpenseCategory[] = React.useMemo(() => {
    const safeTotal = totalExpenses > 0 ? totalExpenses : 2910;
    const catMap = categoryExpenses ?? {};
    const raw = [
      { name: 'Dining & Food', amount: catMap['Dining & Food'] ?? 989.4, color: '#F43F5E' },
      { name: 'Living & Home', amount: catMap['Living & Home'] ?? 698.4, color: '#8B5CF6' },
      { name: 'Bills & Utilities', amount: catMap['Bills & Utilities'] ?? 510.0, color: '#3B82F6' },
      { name: 'Transport', amount: catMap['Transport'] ?? 407.4, color: '#0EA5E9' },
      { name: 'Entertainment', amount: catMap['Entertainment'] ?? 232.8, color: '#EC4899' },
      { name: 'Other', amount: catMap['Other'] ?? 72.0, color: '#10B981' },
    ];

    let maxAmount = -1;
    let maxName = '';
    raw.forEach((r) => {
      if (r.amount > maxAmount) {
        maxAmount = r.amount;
        maxName = r.name;
      }
    });

    return raw.map((cat) => ({
      ...cat,
      percentage: Math.max(1, Math.round((cat.amount / safeTotal) * 100)),
      isHigh: cat.name === maxName,
    }));
  }, [categoryExpenses, totalExpenses]);

  // Entrance and reactive transition animation for balance
  const [animatedBalance, setAnimatedBalance] = React.useState(currentBalance || 7540);
  const [chartProgress, setChartProgress] = React.useState(1);
  const prevBalanceRef = React.useRef(currentBalance || 7540);
  const isInitialMount = React.useRef(true);

  React.useEffect(() => {
    let frame: number;
    const start = performance.now();
    const from = isInitialMount.current ? 0 : prevBalanceRef.current;
    const to = currentBalance;
    const duration = isInitialMount.current ? 1000 : 700;
    isInitialMount.current = false;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

      setAnimatedBalance(from + (to - from) * ease);
      setChartProgress(ease);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        prevBalanceRef.current = to;
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [currentBalance]);

  // Drag handler for manual swipe gesture
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const swipeThreshold = 35;
    if (activeSlide === 'main' && (info.offset.x < -swipeThreshold || info.velocity.x < -250)) {
      setActiveSlide('expenses');
    } else if (activeSlide === 'expenses' && (info.offset.x > swipeThreshold || info.velocity.x > 250)) {
      setActiveSlide('main');
    }
  };

  // SVG Donut calculation for Expenses Graph (Enlarged with Golden Ratio proportions)
  const donutSize = 138;
  const strokeWidth = 14;
  const radius = (donutSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const segmentsWithAngles = categories.map((cat) => {
    const dashLength = (cat.percentage / 100) * circumference * chartProgress;
    const offset = -(accumulatedPercent / 100) * circumference * chartProgress;
    accumulatedPercent += cat.percentage;
    return {
      ...cat,
      dashLength,
      dashOffset: offset,
    };
  });

  return (
    <div className="space-y-2.5 pb-3 animate-fade-in font-sans select-none relative">
      {/* Soft ambient canvas glow directly on background matching reference image */}
      <div className="absolute -top-6 -left-4 -right-4 h-[440px] bg-gradient-to-br from-[#E6F3FE]/70 via-[#F5F2FF]/60 to-[#FEECE5]/80 pointer-events-none -z-10 rounded-b-[40px] blur-xl" />

      {/* ============================================================== *
       * 1. FIXED TOP PROFILE & GREETING HEADER (Stationary when sliding)
       * ============================================================== */}
      <div className="flex items-center justify-between pt-1 px-1">
        {/* Profile Info: Avatar + Welcome Alex Smith */}
        <div
          role="button"
          tabIndex={0}
          onClick={onOpenProfile}
          className="flex items-center gap-3 cursor-pointer group active:scale-95 transition-all"
        >
          <div className="relative h-12 w-12 rounded-full overflow-hidden ring-2 ring-white/90 shadow-xs shrink-0 group-hover:ring-emerald-400 transition-all">
            <Image
              src="/alex-smith.jpg"
              alt="Alex Smith"
              fill
              className="object-cover"
              sizes="48px"
              priority
            />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="text-[12px] font-medium text-[#64748B] leading-none tracking-[0.01em]">
              Welcome
            </span>
            <h1 className="text-[17px] font-semibold tracking-normal text-[#0F172A] leading-snug mt-1 group-hover:text-emerald-700 transition-colors">
              Alex Smith
            </h1>
          </div>
        </div>

        {/* Right Action Buttons: RM/USD Toggle, Search & Bell */}
        <div className="flex items-center gap-1.5">
          {/* iOS Back-Tap quick log (v2.5) — also via `?trigger=backtap` / double-tap B */}
          <button
            type="button"
            onClick={onQuickLog}
            className="relative grid h-9 w-9 place-items-center rounded-full bg-[#FFF4E0] backdrop-blur-md text-[#8A5408] shadow-xs border border-[#F5B84D]/40 hover:bg-[#FFEAC4] active:scale-95 transition-all"
            aria-label="Open Back-Tap quick logging"
            title="iOS Back-Tap / press B twice"
          >
            <Smartphone className="h-4 w-4 stroke-[1.8]" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 animate-pulse rounded-full bg-[#F5B84D] ring-2 ring-white" />
          </button>

          {/* Search Button */}
          <button
            type="button"
            onClick={onOpenBudgetDetails}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/70 backdrop-blur-md text-[#0F172A] shadow-xs border border-white/70 hover:bg-white active:scale-95 transition-all"
            aria-label="Search"
          >
            <Search className="h-4 w-4 text-[#1E293B] stroke-[1.8]" />
          </button>

          {/* Bell Notification Button */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="relative grid h-9 w-9 place-items-center rounded-full bg-white/70 backdrop-blur-md text-[#0F172A] shadow-xs border border-white/70 hover:bg-white active:scale-95 transition-all"
            aria-label="Open Notifications"
          >
            <Bell className="h-4 w-4 text-[#1E293B] stroke-[1.8]" />
            {/* Pulsing Red Unread Badge */}
            <span className="absolute top-2 right-2 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
          </button>
        </div>
      </div>

      {/* Display-currency / PPP switcher (render-layer only — base ledger stays MYR) */}
      <div className="pt-0.5 px-1.5">
        <CurrencySwitcherPill />
      </div>

      {/* ============================================================== *
       * 2. MIDDLE HORIZONTAL SLIDING CONTENT (No outer card - directly on background!)
       * Strictly isolated with overflow-hidden to prevent touching latest transaction.
       * ============================================================== */}
      <div className="relative overflow-hidden w-full">
        <motion.div
          className="flex items-start w-[200%] cursor-grab active:cursor-grabbing"
          animate={{ x: activeSlide === 'main' ? '0%' : '-50%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.18}
          onDragEnd={handleDragEnd}
        >
          {/* ----------------------------------------------------------- *
           * SLIDE 1: EXACT PHOTO REPLICA (Directly on canvas background)
           * ----------------------------------------------------------- */}
          <div className="w-1/2 px-1 flex flex-col justify-start">
            {/* Total Balance Block (Directly on background with airy breathing space) */}
            <div className="text-center pt-1 pb-0">
              <p className="text-[11.5px] font-normal text-[#94A3B8] tracking-wide">
                Total Balance
              </p>
              <div className="flex items-center justify-center mt-1">
                <span className="money-font text-[34px] sm:text-[36px] text-[#0F172A] leading-none text-center">
                  {formatCurrency(animatedBalance)}
                </span>
              </div>

              {/* Trend Tag: ↗ last month 12.5% */}
              <div className="flex items-center justify-center gap-1 text-[11px] font-normal text-[#64748B] mt-1">
                <span className="text-[#10B981] font-medium text-[13px]">↗</span>
                <span>last month 12.5%</span>
              </div>
            </div>

            {/* 3 Floating Glass Capsules in a single row - wider, taller and comfortable */}
            <div className="grid grid-cols-3 gap-2 mt-3.5 px-0.5">
              {/* Capsule 1: Income */}
              <div
                className="flex items-center gap-2 rounded-[20px] border border-white/80 px-2.5 py-3 sm:px-3 sm:py-3.5 transition-all min-w-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 10px 26px -4px rgba(0, 0, 0, 0.038)',
                }}
              >
                <Wallet className="h-4 w-4 text-[#1E293B] stroke-[1.6] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-[#64748B] leading-none">Income</p>
                  <p className="money-font text-[12.5px] sm:text-[13.5px] text-[#0F172A] leading-tight mt-1 whitespace-nowrap">
                    {formatCapsuleCurrency(4650)}
                  </p>
                </div>
              </div>

              {/* Capsule 2: Expenses (Interactive Trigger to slide 2) */}
              <button
                type="button"
                onClick={() => setActiveSlide('expenses')}
                className="flex items-center gap-2 rounded-[20px] border border-white/80 px-2.5 py-3 sm:px-3 sm:py-3.5 transition-all hover:scale-[1.02] active:scale-95 text-left group cursor-pointer min-w-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 10px 26px -4px rgba(0, 0, 0, 0.038)',
                }}
                aria-label="View Expenses Breakdown"
              >
                <CreditCard className="h-4 w-4 text-[#1E293B] stroke-[1.6] shrink-0 group-hover:text-rose-600 transition-colors" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-[#64748B] leading-none">Expenses</p>
                  <p className="money-font text-[12.5px] sm:text-[13.5px] text-[#0F172A] leading-tight mt-1 whitespace-nowrap">
                    {formatCapsuleCurrency(totalExpenses)}
                  </p>
                </div>
              </button>

              {/* Capsule 3: Savings */}
              <div
                className="flex items-center gap-2 rounded-[20px] border border-white/80 px-2.5 py-3 sm:px-3 sm:py-3.5 transition-all min-w-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.65)',
                  backdropFilter: 'blur(24px)',
                  boxShadow: '0 10px 26px -4px rgba(0, 0, 0, 0.038)',
                }}
              >
                <PiggyBank className="h-4 w-4 text-[#1E293B] stroke-[1.6] shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-[#64748B] leading-none">Savings</p>
                  <p className="money-font text-[12.5px] sm:text-[13.5px] text-[#0F172A] leading-tight mt-1 whitespace-nowrap">
                    {formatCapsuleCurrency(Math.max(0, 1940 - (totalExpenses - 2910)))}
                  </p>
                </div>
              </div>
            </div>

            {/* Live AI Money Assistant — engine-grounded, swipeable daily cards */}
            <AiMoneyAssistantCard onCtaAction={handleAiCardAction} />
          </div>

          {/* ----------------------------------------------------------- *
           * SLIDE 2: EXPENSES GRAPH (Directly on canvas background)
           * Total Expenses centered exactly like Total Balance!
           * No Back button - manual swipe right to return.
           * ----------------------------------------------------------- */}
          <div className="w-1/2 px-1 flex flex-col justify-start">
            {/* Total Expenses Block (Centered in exact same spot and font as Total Balance) */}
            <div className="text-center pt-1 pb-0">
              <p className="text-[11.5px] font-normal text-[#94A3B8] tracking-wide">
                Total Expenses
              </p>
              <div className="flex items-center justify-center mt-1">
                <span className="money-font text-[34px] sm:text-[36px] text-[#0F172A] leading-none text-center">
                  {formatCurrency(totalExpenses)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-1 text-[11px] font-normal text-[#64748B] mt-1">
                <span className="text-[#10B981] font-medium text-[13px]">↗</span>
                <span>last month 8.2%</span>
              </div>
            </div>

            {/* Expenses Donut Chart & Category Breakdown Card (Golden Ratio Proportion: W:H ≈ 1.618, aligned with Slide 1) */}
            <div className="rounded-[26px] bg-white/65 backdrop-blur-[26px] p-4 sm:p-4.5 shadow-[0_20px_44px_-8px_rgba(0,0,0,0.045)] border border-white/80 mt-3.5 min-h-[258px] flex flex-col justify-between relative overflow-hidden">
              {/* Soft ambient rose/purple glow in corner matching Slide 1 */}
              <div className="absolute -bottom-6 -right-4 w-44 h-40 rounded-full bg-gradient-to-tl from-rose-300/20 via-pink-200/15 to-transparent pointer-events-none" />

              <div className="flex items-center justify-between gap-3.5 z-10">
                {/* SVG Donut (Widened & Enlarged with Golden Ratio proportions) */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <svg
                    width={donutSize}
                    height={donutSize}
                    viewBox={`0 0 ${donutSize} ${donutSize}`}
                    className="transform -rotate-90 drop-shadow-xs"
                  >
                    <circle
                      cx={donutSize / 2}
                      cy={donutSize / 2}
                      r={radius}
                      stroke="#F1F5F9"
                      strokeWidth={strokeWidth}
                      fill="transparent"
                    />
                    {segmentsWithAngles.map((seg) => (
                      <circle
                        key={seg.name}
                        cx={donutSize / 2}
                        cy={donutSize / 2}
                        r={radius}
                        stroke={seg.color}
                        strokeWidth={activeCategory === seg.name ? strokeWidth + 3 : strokeWidth}
                        fill="transparent"
                        strokeDasharray={`${seg.dashLength} ${circumference}`}
                        strokeDashoffset={seg.dashOffset}
                        strokeLinecap="round"
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setActiveCategory(seg.name)}
                        onMouseLeave={() => setActiveCategory(null)}
                        onClick={() =>
                          setActiveCategory(activeCategory === seg.name ? null : seg.name)
                        }
                      />
                    ))}
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[9.5px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                      Total Spent
                    </span>
                    <span className="money-font text-[16px] text-[#0F172A] leading-tight mt-0.5">
                      {formatCurrency(totalExpenses)}
                    </span>
                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-200/60 mt-0.5">
                      6 Categories
                    </span>
                  </div>
                </div>

                {/* Categories (Widened with horizontal mini progress tracks) */}
                <div className="flex-1 space-y-1 pl-1 min-w-0">
                  {categories.map((cat) => {
                    const isSelected = activeCategory === cat.name;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() =>
                          setActiveCategory(activeCategory === cat.name ? null : cat.name)
                        }
                        className={cn(
                          'flex items-center justify-between w-full text-left py-0.5 px-2 rounded-xl transition-all',
                          isSelected ? 'bg-rose-50/90 shadow-2xs scale-[1.02]' : 'hover:bg-gray-50/80'
                        )}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                          <span
                            className="h-2 w-2 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span
                            className={cn(
                              'text-[11px] truncate font-semibold',
                              isSelected ? 'text-[#0F172A]' : 'text-[#334155]'
                            )}
                          >
                            {cat.name}
                          </span>
                          {cat.isHigh && (
                            <span className="text-[8px] font-extrabold text-rose-600 bg-rose-100/80 px-1 rounded shrink-0">
                              High
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Mini visual track */}
                          <div className="w-8 h-1 rounded-full bg-slate-100 overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                            />
                          </div>
                          <span className="text-[10.5px] font-bold text-[#64748B] tabular-nums text-right">
                            {cat.percentage}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected category detail banner / Deep Analytics Link */}
              <div className="mt-2.5 pt-2 border-t border-gray-100/90 flex items-center justify-between text-[11px] z-10">
                {activeCategory ? (
                  <div className="flex items-center justify-between w-full animate-fade-in">
                    <span className="text-[#475569]">
                      Selected: <strong className="text-[#0F172A]">{activeCategory}</strong>
                    </span>
                    <span className="money-font text-[11.5px] text-[#0F172A]">
                      {formatCurrency(categories.find((c) => c.name === activeCategory)?.amount ?? 0)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between w-full text-[10.5px]">
                    <span className="text-[#64748B] flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span>
                        Highest: {categories.find((c) => c.isHigh)?.name ?? 'Dining & Food'} (
                        {categories.find((c) => c.isHigh)?.percentage ?? 34}%)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={onOpenAnalytics}
                      className="text-indigo-600 font-bold hover:underline flex items-center gap-0.5"
                    >
                      <span>Deep Analytics</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Swipe Right Prompt (Manual swipe indicator) */}
            <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#64748B] pt-1.5 pb-0.5">
              <span>👉 Swipe right to return to Overview</span>
            </div>
          </div>
        </motion.div>

        {/* Carousel Pagination Dots */}
        <div className="flex items-center justify-center gap-1 pt-1 pb-0.5">
          <button
            type="button"
            onClick={() => setActiveSlide('main')}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              activeSlide === 'main' ? 'w-4 bg-[#0F172A]' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
            )}
            aria-label="View Main Overview"
          />
          <button
            type="button"
            onClick={() => setActiveSlide('expenses')}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              activeSlide === 'expenses' ? 'w-4 bg-[#0F172A]' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
            )}
            aria-label="View Expenses Graph"
          />
        </div>
      </div>

      {/* ============================================================== *
       * 3. FIXED BOTTOM LATEST TRANSACTION SECTION
       * Positioned directly below the middle hero slider.
       * Stays completely untouched and is never blocked or overlapped by graphs.
       * ============================================================== */}
      <div className="pt-0.5">
        <ActivitySection
          title="Latest Transaction"
          onOpenAnalytics={onOpenAnalytics}
          onViewMore={onOpenAllTransactions}
          onOpenItem={onOpenItem}
        />
      </div>
    </div>
  );
}
