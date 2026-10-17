'use client';

import * as React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  CalendarDays,
  Sparkles,
  CheckCircle2,
  X,
  CreditCard,
  SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandLogo, type BrandId } from '@/components/brand-logos';
import { GoalsAscent, useGoals } from '@/components/goals-ascent';

export interface ReminderItem {
  id: string;
  brand: BrandId;
  title: string;
  subtitle: string;
  amount: number;
  time: string;
  dateStr: string; // e.g. "TUESDAY 12, 2026"
  dayNum: number; // e.g. 12
  ringColor: string; // e.g. "#6366F1" or "#F59E0B"
  category: string;
  billingCycle: string;
}

const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: 'netflix',
    brand: 'netflix',
    title: 'Netflix Premium',
    subtitle: '9:00 AM · Monthly renewal',
    amount: 25.86,
    time: '9:00 AM',
    dateStr: 'TUESDAY 12, 2026',
    dayNum: 12,
    ringColor: '#6366F1',
    category: 'Streaming · Entertainment',
    billingCycle: 'Monthly · Since Nov, 2024',
  },
  {
    id: 'spotify',
    brand: 'spotify',
    title: 'Spotify Individual',
    subtitle: '2:30 PM · Music streaming',
    amount: 16.43,
    time: '2:30 PM',
    dateStr: 'TUESDAY 12, 2026',
    dayNum: 12,
    ringColor: '#F59E0B',
    category: 'Music · Audio & Podcasts',
    billingCycle: 'Monthly · Since Jan, 2023',
  },
  {
    id: 'claude',
    brand: 'claude',
    title: 'Claude Max',
    subtitle: '12:00 AM · Monthly renewal',
    amount: 299.0,
    time: '12:00 AM',
    dateStr: 'FRIDAY 15, 2026',
    dayNum: 15,
    ringColor: '#6366F1',
    category: 'AI & Developer · Anthropic',
    billingCycle: 'Monthly · Since Feb, 2025',
  },
  {
    id: 'figma',
    brand: 'figma',
    title: 'Figma (Professional)',
    subtitle: '4:30 PM · Creative design',
    amount: 12.0,
    time: '4:30 PM',
    dateStr: 'FRIDAY 15, 2026',
    dayNum: 15,
    ringColor: '#F59E0B',
    category: 'Design & Collaboration',
    billingCycle: 'Monthly · Since Mar, 2024',
  },
  {
    id: 'apple',
    brand: 'apple',
    title: 'Apple One',
    subtitle: '11:00 AM · 2TB Cloud storage',
    amount: 19.9,
    time: '11:00 AM',
    dateStr: 'MONDAY 18, 2026',
    dayNum: 18,
    ringColor: '#3B82F6',
    category: 'Cloud Storage · Backup',
    billingCycle: 'Monthly · Since Aug, 2022',
  },
  {
    id: 'youtube',
    brand: 'youtube',
    title: 'YouTube Premium',
    subtitle: '6:00 PM · Ad-free streaming',
    amount: 17.9,
    time: '6:00 PM',
    dateStr: 'TUESDAY 23, 2026',
    dayNum: 23,
    ringColor: '#EF4444',
    category: 'Video & Music · Family',
    billingCycle: 'Monthly · Since Oct, 2023',
  },
  {
    id: 'chatgpt',
    brand: 'chatgpt',
    title: 'ChatGPT Plus',
    subtitle: '10:00 AM · GPT-4o Reasoning',
    amount: 20.0,
    time: '10:00 AM',
    dateStr: 'MONDAY 25, 2026',
    dayNum: 25,
    ringColor: '#10B981',
    category: 'AI & Copilot · OpenAI',
    billingCycle: 'Monthly · Since Jan, 2024',
  },
  {
    id: 'disney',
    brand: 'disney',
    title: 'Disney+ Hotstar',
    subtitle: '3:00 PM · Quarterly fee',
    amount: 13.3,
    time: '3:00 PM',
    dateStr: 'THURSDAY 28, 2026',
    dayNum: 28,
    ringColor: '#F59E0B',
    category: 'Streaming · Movies',
    billingCycle: 'Quarterly · Since Dec, 2024',
  },
];

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function RemindersTimeline({
  onBack,
  onOpenSheet,
}: {
  onBack?: () => void;
  onOpenSheet?: (s: any) => void;
}) {
  const goals = useGoals();
  const [viewMode, setViewMode] = React.useState<'timeline' | 'ascent'>('timeline');

  // Dynamic month & date state for swiping and navigating between months
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date(2026, 4, 12)); // May 12, 2026
  const [selectedDay, setSelectedDay] = React.useState<number>(12);
  const [activeItem, setActiveItem] = React.useState<ReminderItem | null>(null);

  // Month slide transition state
  const [slideDirection, setSlideDirection] = React.useState<'left' | 'right' | null>(null);
  const [isAnimating, setIsAnimating] = React.useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long' });

  // Month navigation handlers
  const handlePrevMonth = () => {
    setSlideDirection('right');
    setIsAnimating(true);
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setTimeout(() => {
      setIsAnimating(false);
      setSlideDirection(null);
    }, 250);
  };

  const handleNextMonth = () => {
    setSlideDirection('left');
    setIsAnimating(true);
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setTimeout(() => {
      setIsAnimating(false);
      setSlideDirection(null);
    }, 250);
  };

  // Touch Swipe Gesture Handlers ("可以滑动别的month这样子")
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - (touchStartY.current || 0);

    // If horizontal swipe distance > 40px and dominant over vertical scroll
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (deltaX < 0) {
        handleNextMonth(); // Swipe left -> next month
      } else {
        handlePrevMonth(); // Swipe right -> prev month
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Mouse Drag gesture for desktop interaction
  const mouseStartX = React.useRef<number | null>(null);
  const onMouseDown = (e: React.MouseEvent) => {
    mouseStartX.current = e.clientX;
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (mouseStartX.current === null) return;
    const deltaX = e.clientX - mouseStartX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0) handleNextMonth();
      else handlePrevMonth();
    }
    mouseStartX.current = null;
  };

  // Calendar cells generation (6 rows x 7 cols = 42 cells) matching screenshot
  const calendarCells = React.useMemo(() => {
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const firstDayWeekday = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, ..., 5 = Fri for May 2026
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      day: number;
      isCurrentMonth: boolean;
      dots?: string[];
    }> = [];

    // 1. Leading ghost days from previous month (or empty space)
    for (let i = firstDayWeekday - 1; i >= 0; i--) {
      cells.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
      });
    }

    // 2. Days of current month with authentic reminder dots
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      let dots: string[] | undefined;
      // Exact dots matching the reference screenshot:
      if (d === 3 || d === 5) dots = ['#22C55E'];
      else if (d === 15) dots = ['#F59E0B', '#F59E0B'];
      else if (d === 18) dots = ['#6366F1'];
      else if (d === 23) dots = ['#4F46E5'];
      else if (d === 25) dots = ['#3B82F6'];
      else if (d === 28) dots = ['#F59E0B'];

      cells.push({
        day: d,
        isCurrentMonth: true,
        dots,
      });
    }

    // 3. Trailing ghost days from next month to complete exactly 42 cells
    // (As shown in screenshot: 1, 2, 3, 4, 5, 6 on the 6th row)
    let nextMonthDay = 1;
    while (cells.length < 42) {
      cells.push({
        day: nextMonthDay++,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month]);

  // Group reminders by date string
  const groupedReminders = React.useMemo(() => {
    const map = new Map<string, ReminderItem[]>();
    for (const r of DEFAULT_REMINDERS) {
      const list = map.get(r.dateStr) ?? [];
      list.push(r);
      map.set(r.dateStr, list);
    }
    return Array.from(map.entries());
  }, []);

  if (viewMode === 'ascent') {
    return (
      <div className="animate-fade-in -mx-1 pb-16 space-y-3">
        <header className="flex items-center justify-between pt-1 px-1">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/80 border border-white/90 shadow-sm text-[#0B1E3F] hover:bg-white transition-all active:scale-95"
            aria-label="Back to Reminders"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center rounded-full bg-white/80 p-0.5 border border-white/90 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className="rounded-full px-3 py-1 text-[11px] font-black text-[#64748B] hover:text-[#0B1E3F]"
            >
              Reminders
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ascent')}
              className="rounded-full bg-[#0B1E3F] px-3 py-1 text-[11px] font-black text-white shadow-xs"
            >
              Goals 🏔️
            </button>
          </div>

          <div className="w-9" />
        </header>

        <GoalsAscent goals={goals} onOpenGoal={(id) => onOpenSheet?.(id)} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in -mx-1 pb-16 space-y-3.5">
      {/* 1. Header matching Reference UI: Back button, Reminders title, and Month Nav chevrons */}
      <header className="flex items-center justify-between pt-1 px-1">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="grid h-9 w-9 place-items-center rounded-full bg-black/5 hover:bg-black/10 text-[#0B1E3F] active:scale-95 transition-all shadow-xs"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-[21px] font-bold tracking-tight text-[#0B1E3F] font-sans">
            Reminders
          </h1>
        </div>

        {/* Right side: Goals toggle + Month navigation chevron buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('ascent')}
            className="rounded-full bg-white/70 hover:bg-white border border-white/80 px-2.5 py-1 text-[11px] font-bold text-[#64748B] hover:text-[#0B1E3F] shadow-xs transition-all"
          >
            Goals 🏔️
          </button>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/80 border border-white/90 shadow-sm text-[#0B1E3F] hover:bg-white active:scale-90 transition-all"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/80 border border-white/90 shadow-sm text-[#0B1E3F] hover:bg-white active:scale-90 transition-all"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Subheader: May 12, 2026 & Stacked "8 active subscriptions" */}
      <div className="flex items-baseline justify-between px-2 pt-0.5">
        <h2 className="text-[18px] font-black tracking-tight text-[#0B1E3F] font-sans">
          {monthName} {selectedDay}, {year}
        </h2>
        <div className="text-right">
          <span className="text-[11px] font-semibold text-[#64748B] block leading-tight">
            8 active
          </span>
          <span className="text-[11px] font-semibold text-[#64748B] block leading-tight">
            subscriptions
          </span>
        </div>
      </div>

      {/* 3. Frosted Translucent Calendar Card with Touch/Mouse Swipe support ("可以滑动别的month这样子") */}
      <section
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        className={cn(
          'relative rounded-[28px] p-4 sm:p-5 select-none transition-all duration-300',
          'backdrop-blur-2xl bg-white/60 border border-white/80',
          'shadow-[0_12px_36px_rgba(11,30,63,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)]',
          'overflow-hidden cursor-grab active:cursor-grabbing'
        )}
      >
        {/* Subtle background ambient pastel glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-gradient-to-tr from-[#DDD6FE]/30 to-[#BAE6FD]/25 blur-2xl" />

        {/* Weekday headers: SUN MON TUE WED THU FRI SAT */}
        <div className="grid grid-cols-7 text-center text-[10.5px] font-bold tracking-wider text-[#94A3B8]">
          {DAYS_OF_WEEK.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days grid with slide animation on month change */}
        <div
          className={cn(
            'mt-1.5 grid grid-cols-7 gap-y-1.5 text-center transition-transform duration-250 ease-out',
            isAnimating && slideDirection === 'left' && '-translate-x-3 opacity-80',
            isAnimating && slideDirection === 'right' && 'translate-x-3 opacity-80'
          )}
        >
          {calendarCells.map((c, idx) => {
            const isSelected = c.isCurrentMonth && c.day === selectedDay;

            // Trailing / leading ghost days from adjacent months (as in screenshot)
            if (!c.isCurrentMonth) {
              return (
                <div
                  key={`adjacent-${idx}`}
                  className="flex flex-col items-center justify-center py-1 opacity-45 pointer-events-none"
                >
                  <span className="text-[13px] font-semibold text-[#94A3B8]">
                    {c.day}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={`current-${c.day}`}
                type="button"
                onClick={() => setSelectedDay(c.day)}
                className="group relative flex flex-col items-center justify-center py-0.5 transition-transform active:scale-90"
              >
                {/* Day circle */}
                <div
                  className={cn(
                    'grid h-7.5 w-7.5 place-items-center rounded-full text-[13px] font-bold transition-all duration-150',
                    isSelected
                      ? 'bg-[#3730A3] text-white shadow-md shadow-[#3730A3]/40 scale-105 font-black'
                      : 'text-[#1E293B] hover:bg-black/5'
                  )}
                >
                  {c.day}
                </div>

                {/* Sub-badge / Dots underneath */}
                {isSelected ? (
                  <div className="mt-1 flex items-center justify-center">
                    <span className="h-1 w-2.5 rounded-full bg-[#3730A3]" />
                  </div>
                ) : (
                  <div className="mt-1 flex h-1.5 items-center justify-center gap-0.5">
                    {c.dots?.map((dotColor, dotIdx) => (
                      <span
                        key={dotIdx}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: dotColor }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Timeline Section */}
      <section className="space-y-4 pt-1">
        {groupedReminders.map(([dateStr, items]) => {
          const isToday = dateStr.includes(String(selectedDay));
          return (
            <div key={dateStr} className="space-y-2.5">
              {/* Date Header + Badge */}
              <div className="flex items-center justify-between px-2 pt-1">
                <h3 className="text-[13px] font-extrabold uppercase tracking-wider text-[#0B1E3F]">
                  {dateStr}
                </h3>
                <span className="text-[11.5px] font-bold text-[#64748B]">
                  {isToday ? 'Today' : `${items.length} reminders`}
                </span>
              </div>

              {/* Connected Timeline Items */}
              <div className="relative pl-6 space-y-2.5">
                {/* Vertical continuous connector line */}
                <div className="absolute left-[7px] top-4 bottom-4 w-0.5 bg-[#E2E8F0]" />

                {items.map((item) => (
                  <div key={item.id} className="relative flex items-center gap-3">
                    {/* Ring Node on Timeline */}
                    <div
                      className="absolute -left-6 grid h-4 w-4 place-items-center rounded-full bg-white border-2 shadow-xs z-10"
                      style={{ borderColor: item.ringColor }}
                    >
                      <span
                        className="h-1 w-1 rounded-full"
                        style={{ backgroundColor: item.ringColor }}
                      />
                    </div>

                    {/* Subscription Card */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveItem(item)}
                      className="flex flex-1 items-center justify-between rounded-2xl bg-white/95 p-3.5 shadow-sm border border-white/80 hover:bg-white transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <BrandLogo brand={item.brand} className="h-10 w-10 p-2" />
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-[15px] font-extrabold text-[#0B1E3F] leading-tight">
                            {item.title}
                          </h4>
                          <p className="truncate text-[11px] font-semibold text-[#64748B] mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <p className="text-[15.5px] font-black text-[#0B1E3F] leading-tight">
                          ${item.amount.toFixed(2)}
                        </p>
                        <p className="text-[10px] font-bold text-[#64748B] mt-0.5">
                          per month
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* 5. Subscription Manage Modal Drawer (matching left peek of Image 3) */}
      {activeItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl border border-white space-y-4 animate-slide-up">
            {/* Header: Logo, Title, Close button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandLogo brand={activeItem.brand} className="h-11 w-11 p-2" />
                <div>
                  <h3 className="text-[17px] font-black text-[#0B1E3F]">
                    {activeItem.title}
                  </h3>
                  <p className="text-[11px] font-bold text-[#64748B]">
                    ${activeItem.amount.toFixed(2)} / month
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1E3F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Action Buttons matching image: Pay now & Cancel */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#4F46E5] text-white text-[12.5px] font-black shadow-md shadow-[#4F46E5]/30 active:scale-95"
              >
                <span>Pay now</span>
                <span className="text-[14px]">↗</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#DC2626] text-white text-[12.5px] font-black shadow-md shadow-[#DC2626]/30 active:scale-95"
              >
                <span>Cancel</span>
                <span>✕</span>
              </button>
            </div>

            {/* Billing Cycle Card */}
            <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-[#E2E8F0]/60 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Billing Cycle
              </p>
              <p className="text-[13.5px] font-bold text-[#0B1E3F]">
                {activeItem.billingCycle}
              </p>
            </div>

            {/* Category Card */}
            <div className="rounded-2xl bg-[#F8FAFC] p-3 border border-[#E2E8F0]/60 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Category
              </p>
              <p className="text-[13.5px] font-bold text-[#0B1E3F]">
                {activeItem.category}
              </p>
            </div>

            {/* Protection Toggles */}
            <div className="space-y-2 pt-1 border-t border-[#F1F5F9]">
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] font-bold text-[#0B1E3F]">
                  Auto-renewal Alert (3 days before)
                </span>
                <span className="text-[11.5px] font-extrabold text-[#10B981]">
                  ON ✓
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12px] font-bold text-[#0B1E3F]">
                  Anti-Impulse AI Quarantine
                </span>
                <span className="text-[11.5px] font-extrabold text-[#2563EB]">
                  Protected
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
