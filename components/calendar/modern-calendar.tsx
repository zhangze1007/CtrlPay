'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trophy,
  Calendar as CalendarIcon,
  Sparkles,
  X,
  Target,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Laptop,
  ShieldCheck,
  Coffee,
  UtensilsCrossed,
  BookOpen,
  Receipt,
  ChevronRight as ChevronRightIcon,
  Wallet,
  Tag,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GoalsAscent, useGoals } from '@/components/goals-ascent';
import { useCtrlPayStore } from '@/lib/store';

export interface ModernCalendarViewProps {
  onBack: () => void;
  onOpenSheet?: (sheet: string) => void;
}

export interface CalendarActivityItem {
  id: string;
  type: 'transaction' | 'goal';
  title: string;
  subtitle: string;
  amount: string; // e.g. "- RM 15.50" or "RM 320 / RM 1,200"
  tag: string;
  tagColor?: string;
  time: string;
  day: number;
  month?: number; // 0-indexed month
  year?: number;
  iconBg: string;
  iconColor: string;
  iconType: 'coffee' | 'food' | 'book' | 'laptop' | 'shield' | 'apple' | 'custom';
  // Transaction specific details
  paymentMethod?: string;
  referenceId?: string;
  aiNote?: string;
  // Goal specific details
  targetAmount?: string;
  savedAmount?: string;
  progressPercent?: number;
  deadline?: string;
  goalStatus?: string;
}

const INITIAL_CALENDAR_ACTIVITIES: CalendarActivityItem[] = [
  {
    id: 'cal-act-1',
    type: 'transaction',
    title: "Touch 'n Go Zus Coffee",
    subtitle: '2x Iced Spanish Latte · Mid Valley',
    amount: '- RM 15.50',
    tag: 'Food & Drinks',
    time: '16 May · 10:30 AM',
    day: 16,
    month: 4,
    year: 2025,
    iconBg: '#E0F2FE',
    iconColor: '#0055B8',
    iconType: 'coffee',
    paymentMethod: "Touch 'n Go eWallet (DuitNow QR)",
    referenceId: 'TNG-99182-COF',
    aiNote: 'Auto-categorized as Food & Drinks. Deducted from daily survival runway.',
  },
  {
    id: 'cal-goal-1',
    type: 'goal',
    title: 'New Laptop Milestone',
    subtitle: 'Campus Tech Hardware Escrow',
    amount: 'RM 320 / RM 1,200',
    tag: 'Goal · 27% reached',
    tagColor: 'bg-[#CCF92E]/40 text-[#1E293B]',
    time: 'Target: 30 June · Runway safe',
    day: 16,
    month: 4,
    year: 2025,
    iconBg: '#CCF92E',
    iconColor: '#000000',
    iconType: 'laptop',
    targetAmount: 'RM 1,200.00',
    savedAmount: 'RM 320.00',
    progressPercent: 27,
    deadline: '30 June 2026',
    goalStatus: 'On track · Safe pace RM 8.50/day reserved',
  },
  {
    id: 'cal-act-2',
    type: 'transaction',
    title: 'Maybank MAE Lunch Split',
    subtitle: 'Steamboat Dinner Split with Mike',
    amount: '- RM 45.00',
    tag: 'Food & Dining',
    time: '16 May · 1:15 PM',
    day: 16,
    month: 4,
    year: 2025,
    iconBg: '#FEF9C3',
    iconColor: '#B45309',
    iconType: 'food',
    paymentMethod: 'Maybank MAE (DuitNow Transfer)',
    referenceId: 'MAE-77120-SPL',
    aiNote: 'Auto-detected peer transfer. Tagged to Food & Dining.',
  },
  {
    id: 'cal-goal-2',
    type: 'goal',
    title: 'Emergency Buffer Fund',
    subtitle: 'Liquid Sandbox Safety Net',
    amount: 'RM 150 / RM 500',
    tag: 'Goal · 30% reached',
    tagColor: 'bg-[#E2F4F0] text-[#10606F]',
    time: 'Target: 15 July · Protected',
    day: 17,
    month: 4,
    year: 2025,
    iconBg: '#E2F4F0',
    iconColor: '#10606F',
    iconType: 'shield',
    targetAmount: 'RM 500.00',
    savedAmount: 'RM 150.00',
    progressPercent: 30,
    deadline: '15 July 2026',
    goalStatus: 'Protected in Defense Vault · Non-interest asset',
  },
  {
    id: 'cal-act-3',
    type: 'transaction',
    title: 'Popular Bookstore SS15',
    subtitle: 'Campus Stationery & Notebooks',
    amount: '- RM 28.00',
    tag: 'Education',
    time: '17 May · 3:40 PM',
    day: 17,
    month: 4,
    year: 2025,
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    iconType: 'book',
    paymentMethod: 'Public Bank Debit Card *3319',
    referenceId: 'PB-55019-STA',
    aiNote: 'Classified as Education & Supplies. Essential campus expenditure.',
  },
  {
    id: 'cal-act-4',
    type: 'transaction',
    title: 'Apple Services Subscription',
    subtitle: 'App Store & iCloud+ 200GB',
    amount: '- RM 30.00',
    tag: 'Subscription',
    time: '18 May · 9:00 AM',
    day: 18,
    month: 4,
    year: 2025,
    iconBg: '#F1F5F9',
    iconColor: '#0F172A',
    iconType: 'apple',
    paymentMethod: 'Apple Pay · Mastercard *4829',
    referenceId: 'APL-11920-SUB',
    aiNote: 'Zombie Radar monitored. Fixed commitment subscription paid.',
  },
];

function ActivityIcon({ type, className }: { type: CalendarActivityItem['iconType']; className?: string }) {
  switch (type) {
    case 'coffee':
      return <Coffee className={cn('h-5 w-5', className)} />;
    case 'food':
      return <UtensilsCrossed className={cn('h-5 w-5', className)} />;
    case 'book':
      return <BookOpen className={cn('h-5 w-5', className)} />;
    case 'laptop':
      return <Laptop className={cn('h-5 w-5', className)} />;
    case 'shield':
      return <ShieldCheck className={cn('h-5 w-5', className)} />;
    case 'apple':
      return (
        <svg className={cn('h-5 w-5 fill-current', className)} viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.16.65-2.84 1.44-.59.69-1.11 1.76-.97 2.81 1.07.08 2.2-.62 2.8-1.38z" />
        </svg>
      );
    default:
      return <Receipt className={cn('h-5 w-5', className)} />;
  }
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface UpcomingSubscriptionItem {
  id: string;
  name: string;
  logo: 'netflix' | 'spotify' | 'amazon' | 'alltrails';
  cycle: 'Monthly' | 'Annually';
  day: number;
  monthText: string;
  amount: string;
  isAnnual?: boolean;
  daysUntilCharge?: number;
  escrowReserved?: string;
  quarantineGateActive?: boolean;
}

const UPCOMING_SUBSCRIPTIONS: UpcomingSubscriptionItem[] = [
  {
    id: 'sub-netflix',
    name: 'Netflix',
    logo: 'netflix',
    cycle: 'Monthly',
    day: 16,
    monthText: 'JUL',
    amount: 'RM 14.99',
    daysUntilCharge: 8,
  },
  {
    id: 'sub-spotify',
    name: 'Spotify',
    logo: 'spotify',
    cycle: 'Monthly',
    day: 20,
    monthText: 'JUL',
    amount: 'RM 13.99',
    daysUntilCharge: 12,
  },
  {
    id: 'sub-amazon',
    name: 'Amazon',
    logo: 'amazon',
    cycle: 'Monthly',
    day: 22,
    monthText: 'JUL',
    amount: 'RM 10.00',
    daysUntilCharge: 14,
  },
  {
    id: 'sub-alltrails',
    name: 'AllTrails',
    logo: 'alltrails',
    cycle: 'Annually',
    day: 24,
    monthText: 'JUL',
    amount: 'RM 29.99',
    isAnnual: true,
    daysUntilCharge: 6,
    escrowReserved: 'RM 29.99',
    quarantineGateActive: true,
  },
];

function NetflixLogo({ className }: { className?: string }) {
  return (
    <div className={cn('grid h-8 w-8 place-items-center rounded-full bg-black shrink-0 shadow-xs', className)}>
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-[#E50914]">
        <path d="M5.5 3h3.2l5.6 13.5V3h3.2v18h-3.2L8.7 7.5V21H5.5V3z" />
      </svg>
    </div>
  );
}

function SpotifyLogo({ className }: { className?: string }) {
  return (
    <div className={cn('grid h-8 w-8 place-items-center rounded-full bg-[#1DB954] text-white shrink-0 shadow-xs', className)}>
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-white">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.792-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.496 9.72 1.115.295.18.388.563.208.855zm1.225-2.724c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.134-9.97-1.168-.413.125-.85-.11-.975-.522-.125-.413.11-.85.522-.975 3.633-1.102 8.147-.568 11.244 1.332.367.226.482.71.256 1.077zm.105-2.836C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.016-.13-1.166-.624-.15-.494.13-1.016.624-1.166 3.532-1.072 9.404-.87 13.115 1.333.444.263.59.84.327 1.284-.264.444-.84.59-1.284.327z" />
      </svg>
    </div>
  );
}

function AmazonLogo({ className }: { className?: string }) {
  return (
    <div className={cn('grid h-8 w-8 place-items-center rounded-full bg-white border border-gray-100 shrink-0 shadow-xs p-1', className)}>
      <svg viewBox="0 0 24 24" className="h-full w-full">
        <path d="M13.2 13.5c-.7.7-1.7 1-2.7 1-1.8 0-3.1-1.2-3.1-2.9 0-2 1.6-3.1 4.2-3.1v-.3c0-.6-.3-1.1-1.4-1.1-.8 0-1.6.3-2 .6l-.4-1.1c.6-.4 1.6-.8 2.7-.8 2 0 2.7 1.1 2.7 2.6v3.5c0 .6.1 1 .2 1.4h-1.6c-.1-.3-.2-.6-.2-1.1zm-1.2-3.3c-1.4 0-2.3.4-2.3 1.5 0 .9.6 1.4 1.5 1.4.7 0 1.3-.4 1.6-1.1v-1.8h-.8z" fill="#111827" />
        <path d="M5.8 16.5c2.1 1.3 4.9 1.8 7.5 1 1.1-.3 2-.8 2.9-1.4.3-.2.4-.1.2.2-.5.8-1.5 1.4-2.6 1.8-2.7.8-5.8.4-8.2-1-.3-.2 0-.5.2-.6z" fill="#FF9900" />
      </svg>
    </div>
  );
}

function AllTrailsLogo({ className }: { className?: string }) {
  return (
    <div className={cn('grid h-8 w-8 place-items-center rounded-full bg-[#3D7D18] text-white shrink-0 shadow-xs', className)}>
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 fill-white">
        <path d="M12 4.5L3.5 18h4.5l4-6.5 4 6.5h4.5L12 4.5zm0 4.5l2.4 3.9-2.4 3.9-2.4-3.9 2.4-3.9z" />
      </svg>
    </div>
  );
}

export function ModernCalendarView({ onBack, onOpenSheet }: ModernCalendarViewProps) {
  // Calendar dynamic month & year state
  const [currentYear, setCurrentYear] = React.useState<number>(2025);
  const [currentMonthIndex, setCurrentMonthIndex] = React.useState<number>(4); // 4 = May
  const [selectedDay, setSelectedDay] = React.useState<number>(16);
  const [showGoalsAscent, setShowGoalsAscent] = React.useState(false);
  const [selectedActivity, setSelectedActivity] = React.useState<CalendarActivityItem | null>(null);
  const [copiedTxn, setCopiedTxn] = React.useState(false);

  // Activities list state
  const [activities, setActivities] = React.useState<CalendarActivityItem[]>(INITIAL_CALENDAR_ACTIVITIES);

  // Manual Expense Modal State
  const [isAddExpenseOpen, setIsAddExpenseOpen] = React.useState(false);
  const [newExpenseMerchant, setNewExpenseMerchant] = React.useState('');
  const [newExpenseAmount, setNewExpenseAmount] = React.useState('');
  const [newExpenseCategory, setNewExpenseCategory] = React.useState('Food & Beverage');
  const [newExpensePayment, setNewExpensePayment] = React.useState("Touch 'n Go eWallet");
  const [newExpenseDay, setNewExpenseDay] = React.useState(16);

  const goals = useGoals();
  const bookExpense = useCtrlPayStore((s) => s.bookExpense);

  // Upcoming Subscriptions Popover Hover/Tap State (Matching User Reference Image)
  const [hoveredSubDate, setHoveredSubDate] = React.useState<number | null>(null);
  const [pinnedUpcoming, setPinnedUpcoming] = React.useState(false);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSubMouseEnter = (day: number) => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setHoveredSubDate(day);
  };

  const handleSubMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      setHoveredSubDate(null);
    }, 240);
  };

  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Dynamic Month Navigation
  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  // Calculate days in the current dynamic month
  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const startWeekday = new Date(currentYear, currentMonthIndex, 1).getDay();

  // Calendar cells
  const cells: Array<{ day: number | null; hasActivity?: boolean; isHighlight?: boolean }> = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const hasActivity = activities.some(
      (a) => a.day === d && (a.month === undefined || a.month === currentMonthIndex)
    );
    cells.push({
      day: d,
      isHighlight: currentMonthIndex === 4 && currentYear === 2025 && d === 16,
      hasActivity,
    });
  }

  // Filter activities for selected day and month
  const filteredActivities = activities.filter(
    (a) => a.day === selectedDay && (a.month === undefined || a.month === currentMonthIndex)
  );
  const displayActivities = filteredActivities.length > 0 ? filteredActivities : activities;

  // Add Manual Expense handler
  const handleAddManualExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newExpenseAmount);
    if (!newExpenseMerchant.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newTxn: CalendarActivityItem = {
      id: `manual-txn-${Date.now()}`,
      type: 'transaction',
      title: newExpenseMerchant.trim(),
      subtitle: `${newExpenseCategory} · Manual Entry`,
      amount: `- RM ${parsedAmount.toFixed(2)}`,
      tag: newExpenseCategory,
      time: `${selectedDay} ${MONTH_NAMES[currentMonthIndex].slice(0, 3)} · Just now`,
      day: selectedDay,
      month: currentMonthIndex,
      year: currentYear,
      iconBg: '#E2F4F0',
      iconColor: '#10606F',
      iconType:
        newExpenseCategory === 'Food & Beverage'
          ? 'food'
          : newExpenseCategory === 'Education'
          ? 'book'
          : 'custom',
      paymentMethod: newExpensePayment,
      referenceId: `MAN-${Date.now().toString().slice(-5)}`,
      aiNote: 'Manually logged expense. Synced with student budget balance.',
    };

    setActivities((prev) => [newTxn, ...prev]);

    // Book expense in store to sync balances
    bookExpense({
      amount: parsedAmount,
      merchant: newExpenseMerchant.trim(),
      category: 'Bubble_Tea_Dining',
      isNeed: true,
    });

    // Reset and close
    setNewExpenseMerchant('');
    setNewExpenseAmount('');
    setIsAddExpenseOpen(false);
  };

  return (
    <div className="min-h-full pb-20 font-sans text-[#1E293B] animate-fade-in select-none">
      {/* 1. Header with X, Calendar, More */}
      <div className="flex items-center justify-between pt-1 pb-3 px-1">
        <button
          type="button"
          onClick={onBack}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#1E293B] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>

        <h1 className="text-[18px] font-bold text-[#0F172A] tracking-tight">Calendar</h1>

        <button
          type="button"
          onClick={() => setShowGoalsAscent(!showGoalsAscent)}
          className={cn(
            'grid h-10 w-10 place-items-center rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] border transition-all active:scale-95',
            showGoalsAscent ? 'bg-[#CCF92E] text-black border-[#CCF92E]' : 'bg-white text-[#1E293B] border-gray-100'
          )}
          title="Toggle Financial Goals Ascent"
        >
          <Target className="h-4 w-4" />
        </button>
      </div>

      {showGoalsAscent ? (
        <div className="space-y-3 pt-1 animate-fade-in">
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-bold text-[#0F172A]">Student Financial Milestones</span>
            <button
              type="button"
              onClick={() => setShowGoalsAscent(false)}
              className="text-[11px] font-bold text-[#475569] bg-white px-2.5 py-1 rounded-full border border-gray-200"
            >
              ← Back to Calendar
            </button>
          </div>
          <GoalsAscent goals={goals} onOpenGoal={() => onOpenSheet?.('commitments')} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* 2. Calendar Card: Dynamic Month + Grid with Interactive Chevrons */}
          <div className="relative rounded-[26px] bg-white p-5 shadow-[0_2px_14px_rgba(0,0,0,0.03)] border border-white space-y-4">
            {/* Popover Card: Upcoming Subscriptions (Exact replica of user reference image) */}
            <AnimatePresence>
              {(hoveredSubDate !== null || pinnedUpcoming) && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                  onMouseEnter={() => {
                    if (closeTimerRef.current) {
                      clearTimeout(closeTimerRef.current);
                      closeTimerRef.current = null;
                    }
                  }}
                  onMouseLeave={handleSubMouseLeave}
                  className="absolute inset-x-3 top-2 z-40 rounded-[24px] bg-white p-4 shadow-[0_20px_60px_rgba(4,34,43,0.22)] border border-gray-100 select-none backdrop-blur-xl"
                >
                  {/* Top Bar of Upcoming Card */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[17px] font-black text-[#0F172A] tracking-tight">
                        Upcoming
                      </h3>
                      <span className="rounded-full bg-[#E2F4F0] px-2 py-0.5 text-[9.5px] font-black text-[#10606F]">
                        Next 30 Days
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedUpcoming(false);
                        setHoveredSubDate(null);
                      }}
                      className="grid h-6 w-6 place-items-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
                      aria-label="Close upcoming view"
                    >
                      <X className="h-3.5 w-3.5 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* List of 4 Upcoming Subscriptions from photo */}
                  <div className="divide-y divide-gray-100/90 pt-1">
                    {UPCOMING_SUBSCRIPTIONS.map((item) => {
                      const isHoveredItem = hoveredSubDate === item.day;
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'py-2 px-1 rounded-xl transition-all',
                            isHoveredItem ? 'bg-emerald-50/70 scale-[1.01]' : 'hover:bg-gray-50/60'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {/* Date Box: e.g. JUL 16 */}
                              <div className="text-center w-7 shrink-0">
                                <span className="block text-[8.5px] font-extrabold uppercase text-gray-400 leading-none">
                                  {item.monthText}
                                </span>
                                <span className="block text-[15px] font-black text-[#0F172A] leading-tight">
                                  {item.day}
                                </span>
                              </div>

                              {/* Real Brand Logo */}
                              {item.logo === 'netflix' && <NetflixLogo />}
                              {item.logo === 'spotify' && <SpotifyLogo />}
                              {item.logo === 'amazon' && <AmazonLogo />}
                              {item.logo === 'alltrails' && <AllTrailsLogo />}

                              {/* Name & Frequency */}
                              <div>
                                <h4 className="text-[13px] font-black text-[#0F172A] leading-tight">
                                  {item.name}
                                </h4>
                                <span className="text-[10.5px] font-medium text-gray-400">
                                  {item.cycle}
                                </span>
                              </div>
                            </div>

                            {/* Amount */}
                            <div className="text-right">
                              <span className="font-sans text-[13.5px] font-black text-[#0F172A]">
                                {item.amount}
                              </span>
                            </div>
                          </div>

                          {/* Gate logic callout for annual subscription within 7 days */}
                          {item.quarantineGateActive && (
                            <div className="mt-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/90 p-2 flex items-center justify-between text-[10px]">
                              <span className="font-extrabold text-amber-800 flex items-center gap-1.5">
                                <span>⚠️</span>
                                <span>Annual Renewal in {item.daysUntilCharge} days</span>
                              </span>
                              <span className="font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded-md">
                                Escrow Gate: {item.escrowReserved}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 text-center border-t border-gray-100/80">
                    <p className="text-[10px] text-gray-400 font-medium">
                      Hover off or tap × to return to calendar
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Month Header with Working < > Arrows */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-bold text-[#0F172A]">
                  {MONTH_NAMES[currentMonthIndex]}, {currentYear}
                </h2>
                <button
                  type="button"
                  onClick={() => setPinnedUpcoming((p) => !p)}
                  className="rounded-full bg-[#E2F4F0] hover:bg-[#D1FAE5] text-[#10606F] px-2 py-0.5 text-[10px] font-extrabold border border-[#A7F3D0] transition-colors"
                  title="Toggle Upcoming Subscriptions card"
                >
                  Upcoming (4)
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous Month"
                  className="grid h-8 w-8 place-items-center rounded-full bg-gray-50 hover:bg-gray-100 text-[#475569] active:scale-90 transition-all border border-gray-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next Month"
                  className="grid h-8 w-8 place-items-center rounded-full bg-gray-50 hover:bg-gray-100 text-[#475569] active:scale-90 transition-all border border-gray-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday Names */}
            <div className="grid grid-cols-7 text-center">
              {WEEKDAYS.map((wd) => (
                <span key={wd} className="text-[11.5px] font-semibold text-[#94A3B8]">
                  {wd}
                </span>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-y-2 text-center items-center">
              {cells.map((cell, idx) => {
                if (!cell.day) {
                  return <div key={`empty-${idx}`} className="h-9 w-9" />;
                }

                const isSelected = selectedDay === cell.day;
                const isNeon16 = cell.day === 16 && currentMonthIndex === 4 && currentYear === 2025;
                const isToday = cell.day === 8;
                const upcomingSub = UPCOMING_SUBSCRIPTIONS.find((s) => s.day === cell.day);

                return (
                  <div key={cell.day} className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDay(cell.day as number);
                        if (upcomingSub) {
                          setPinnedUpcoming((p) => !p);
                        }
                      }}
                      onMouseEnter={() => {
                        if (upcomingSub) {
                          handleSubMouseEnter(cell.day as number);
                        }
                      }}
                      onMouseLeave={() => {
                        if (upcomingSub) {
                          handleSubMouseLeave();
                        }
                      }}
                      className={cn(
                        'relative flex flex-col items-center justify-center transition-all',
                        isNeon16
                          ? 'h-10 w-10 rounded-full bg-[#CCF92E] text-black font-extrabold shadow-[0_4px_12px_rgba(204,249,46,0.5)] scale-105'
                          : isToday
                          ? 'h-9 w-9 rounded-full bg-[#10606F] text-white font-extrabold shadow-xs'
                          : upcomingSub
                          ? 'h-9 w-9 rounded-full bg-[#CFECE3]/70 hover:bg-[#A7F3D0] text-[#065F46] font-extrabold border border-[#A7F3D0] shadow-xs cursor-pointer'
                          : isSelected
                          ? 'h-9 w-9 rounded-full bg-[#0F172A] text-white font-bold'
                          : 'h-9 w-9 rounded-full text-[#334155] font-semibold hover:bg-gray-100'
                      )}
                    >
                      <span className="text-[13px]">{cell.day}</span>
                      {cell.hasActivity && !isNeon16 && !isSelected && !isToday && !upcomingSub && (
                        <span className="h-1 w-1 rounded-full bg-[#10B981] -mt-0.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Activity Header + Manual Add Expense Button */}
          <div className="pt-1 space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[17px] font-black text-[#04222B] tracking-tight">Activity</h3>
                <span className="rounded-full bg-[#E2F4F0] px-2 py-0.5 text-[10.5px] font-bold text-[#10606F]">
                  {selectedDay} {MONTH_NAMES[currentMonthIndex].slice(0, 3)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddExpenseOpen(true)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#CCF92E] text-black shadow-sm hover:scale-105 active:scale-95 transition-all"
                title="Manual Add Expense"
              >
                <Plus className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Activity List: Staggered spring bounce pop-in animation ("一个个弹出来") */}
            <div className="space-y-2.5">
              {displayActivities.map((act, index) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, y: 18, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 24,
                    delay: index * 0.05,
                  }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedActivity(act)}
                  className="flex items-center justify-between rounded-[22px] bg-white p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-white hover:border-[#10606F]/20 hover:shadow-[0_4px_16px_rgba(4,34,43,0.06)] active:scale-[0.99] transition-all cursor-pointer group"
                >
                  {/* Left: Icon + Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="grid h-11 w-11 place-items-center rounded-2xl shadow-sm shrink-0 transition-transform group-hover:scale-105"
                      style={{ backgroundColor: act.iconBg, color: act.iconColor }}
                    >
                      <ActivityIcon type={act.iconType} />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[13.5px] font-bold text-[#0F172A] leading-tight truncate">
                          {act.title}
                        </p>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[9.5px] font-bold shrink-0',
                            act.tagColor ?? 'bg-[#F1F5F9] text-[#475569]'
                          )}
                        >
                          {act.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{act.time}</p>
                    </div>
                  </div>

                  {/* Right: Amount in RM + Arrow indicator */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <div className="text-right">
                      <span
                        className={cn(
                          'font-sans text-[13px] font-extrabold tracking-tight tabular-nums block',
                          act.type === 'goal'
                            ? 'text-[#04222B]'
                            : act.amount.startsWith('+')
                            ? 'text-[#10B981]'
                            : 'text-[#04222B]'
                        )}
                      >
                        {act.amount}
                      </span>
                      {act.type === 'goal' && act.progressPercent && (
                        <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1 ml-auto">
                          <div
                            className="h-full rounded-full bg-[#10B981]"
                            style={{ width: `${act.progressPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-[#94A3B8] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manual Expense Modal ("+icon在activity旁边可以manual加expenses") */}
      <AnimatePresence>
        {isAddExpenseOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsAddExpenseOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 350 }}
              className="w-full max-w-[390px] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-2xl border border-white"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-[#CCF92E] text-black">
                    <Plus className="h-4 w-4 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-black text-[#04222B]">Add Manual Expense</h3>
                    <p className="text-[10.5px] text-[#64748B]">
                      {selectedDay} {MONTH_NAMES[currentMonthIndex]} · Student Ledger
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleAddManualExpense} className="py-4 space-y-3.5">
                {/* Amount Input with RM */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Amount (RM)
                  </label>
                  <div className="relative mt-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-sans font-black text-[18px] text-[#04222B]">
                      RM
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={newExpenseAmount}
                      onChange={(e) => setNewExpenseAmount(e.target.value)}
                      className="w-full rounded-2xl bg-[#F8FAF8] border border-gray-200 pl-14 pr-4 py-3 font-sans font-black text-[22px] text-[#04222B] focus:outline-none focus:ring-2 focus:ring-[#10606F]/40"
                    />
                  </div>
                  {/* Quick Preset Amount Chips */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[5, 10, 15, 25, 50].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setNewExpenseAmount(amt.toString())}
                        className="flex-1 py-1 rounded-full bg-gray-100 hover:bg-[#CCF92E] text-[11px] font-bold text-gray-700 hover:text-black transition-colors"
                      >
                        +RM{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Merchant Name */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Merchant / Note
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zus Coffee SS15, Mamak Lunch"
                    value={newExpenseMerchant}
                    onChange={(e) => setNewExpenseMerchant(e.target.value)}
                    className="w-full mt-1 rounded-2xl bg-[#F8FAF8] border border-gray-200 px-3.5 py-2.5 text-[13px] text-[#04222B] font-medium focus:outline-none focus:ring-2 focus:ring-[#10606F]/40"
                  />
                </div>

                {/* Category Pills */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {['Food & Beverage', 'Transport', 'Shopping', 'Education', 'Bills'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewExpenseCategory(cat)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
                          newExpenseCategory === cat
                            ? 'bg-[#04222B] text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Payment Method
                  </label>
                  <select
                    value={newExpensePayment}
                    onChange={(e) => setNewExpensePayment(e.target.value)}
                    className="w-full mt-1 rounded-2xl bg-[#F8FAF8] border border-gray-200 px-3 py-2.5 text-[12.5px] font-bold text-[#04222B] focus:outline-none"
                  >
                    <option value="Touch 'n Go eWallet">Touch &apos;n Go eWallet (DuitNow)</option>
                    <option value="Maybank MAE">Maybank MAE</option>
                    <option value="Public Bank Debit Card">Public Bank Debit Card</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-[#04222B] text-white py-3 text-[13px] font-extrabold shadow-md hover:bg-[#0A3D4A] active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    <span>Save Expense &amp; Deduct Balance</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal for Selected Transaction or Goal ("也是可以点进去看") */}
      {selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="w-full max-w-[390px] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-[0_20px_60px_rgba(4,34,43,0.3)] border border-white/90 animate-rise-in max-h-[85vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E2F4F0] text-[#10606F]">
                  <ActivityIcon type={selectedActivity.iconType} className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#10606F]">
                    {selectedActivity.type === 'goal' ? 'Savings Goal Milestone' : 'Verified Transaction'}
                  </p>
                  <h4 className="text-[15px] font-black text-[#04222B]">{selectedActivity.title}</h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200 text-[#475569] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="py-4 space-y-4">
              {/* Highlighted Amount / Progress Banner */}
              <div className="rounded-2xl bg-gradient-to-br from-[#F8FAF8] to-[#E2F4F0]/40 p-4 border border-[#E2F4F0] text-center">
                <p className="text-[11px] font-bold text-[#64748B]">
                  {selectedActivity.type === 'goal' ? 'Progress Target' : 'Transaction Total'}
                </p>
                <p className="font-sans text-[26px] font-black text-[#04222B] mt-0.5 tracking-tight">
                  {selectedActivity.amount}
                </p>

                {selectedActivity.type === 'goal' && selectedActivity.progressPercent && (
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#04222B]">
                      <span>{selectedActivity.savedAmount} saved</span>
                      <span>Target: {selectedActivity.targetAmount}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#10B981] transition-all"
                        style={{ width: `${selectedActivity.progressPercent}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[#64748B] text-left pt-1">
                      {selectedActivity.goalStatus}
                    </p>
                  </div>
                )}
              </div>

              {/* Information Rows */}
              <div className="space-y-2.5 text-[12.5px]">
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-[#64748B]">Timestamp</span>
                  <span className="font-bold text-[#0F172A]">{selectedActivity.time}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-[#64748B]">Category</span>
                  <span className="font-bold text-[#0F172A]">{selectedActivity.tag}</span>
                </div>

                {selectedActivity.type === 'transaction' && (
                  <>
                    <div className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-[#64748B]">Payment Method</span>
                      <span className="font-bold text-[#0F172A]">{selectedActivity.paymentMethod}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="text-[#64748B]">Reference ID</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[11px] text-[#0F172A]">
                          {selectedActivity.referenceId}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedActivity.referenceId) {
                              navigator.clipboard?.writeText(selectedActivity.referenceId);
                              setCopiedTxn(true);
                              setTimeout(() => setCopiedTxn(false), 1500);
                            }
                          }}
                          className="text-[#10606F] hover:text-[#04222B] p-0.5"
                          title="Copy Reference"
                        >
                          {copiedTxn ? (
                            <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {selectedActivity.type === 'goal' && (
                  <div className="flex items-center justify-between py-1 border-b border-gray-50">
                    <span className="text-[#64748B]">Target Deadline</span>
                    <span className="font-bold text-[#0F172A]">{selectedActivity.deadline}</span>
                  </div>
                )}
              </div>

              {/* AI Note */}
              {selectedActivity.aiNote && (
                <div className="rounded-2xl bg-[#E2F4F0]/60 p-3 border border-[#1D8B94]/20 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-[#10606F] shrink-0 mt-0.5" />
                  <p className="text-[11px] text-[#04222B] leading-relaxed">
                    <span className="font-bold text-[#10606F]">AI Solvency Intelligence: </span>
                    {selectedActivity.aiNote}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="flex-1 rounded-2xl bg-[#04222B] text-white py-2.5 text-[12.5px] font-bold shadow-md hover:bg-[#0A3D4A] active:scale-95 transition-all text-center"
              >
                Done
              </button>
              {selectedActivity.type === 'goal' ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActivity(null);
                    setShowGoalsAscent(true);
                  }}
                  className="flex-1 rounded-2xl bg-[#CCF92E] text-black py-2.5 text-[12.5px] font-extrabold shadow-md hover:bg-[#BBE825] active:scale-95 transition-all text-center"
                >
                  View Goals Ascent →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedActivity(null);
                    onOpenSheet?.('allTransactions');
                  }}
                  className="flex-1 rounded-2xl bg-[#E2F4F0] text-[#10606F] py-2.5 text-[12.5px] font-extrabold hover:bg-[#D5EFEA] active:scale-95 transition-all text-center"
                >
                  All Transactions →
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
