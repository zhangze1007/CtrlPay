'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  BatteryFull,
  Bell,
  Bot,
  Bus,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Clapperboard,
  Copy,
  CreditCard,
  CupSoda,
  Filter,
  Flame,
  GraduationCap,
  HeartPulse,
  Home as HomeIcon,
  LayoutGrid,
  Lock,
  Mail,
  Mic,
  PiggyBank,
  Plane,
  Plus,
  Radar,
  Receipt,
  Search,
  Send,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Timer,
  TrendingUp,
  User,
  Utensils,
  UtensilsCrossed,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { BrandIcon, type ActivityItem } from '@/components/activity-section';
import { useCtrlPayStore, type SandboxEvent } from '@/lib/store';
import type { SpendCategory } from '@/lib/types';
import {
  calculateAmortizedSubscriptions,
  DEMO_CONFIG,
  ESCROW_RULES,
  toStudentUnits,
} from '@/lib/quant-engine';
import {
  FIXED_BILLS,
  HISTORICAL_DAILY_SPENDING,
  PAYMENT_EVENTS,
  PROFILE,
  RECURRING_TRANSACTIONS,
  SUBSCRIPTIONS,
  USAGE_SIGNALS,
} from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
import { analyzeZombies, ZOMBIE_RULES } from '@/lib/zombie-radar';
import { upcomingFixedBills } from '@/lib/ledger';
import { cn, formatRM, remainingDaysInMonth } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AgentChat } from '@/components/agent-chat';
import { AuditDrawer } from '@/components/audit-drawer';
import { CfarStressTester } from '@/components/cfar-stress-tester';
import { EventFeed } from '@/components/event-feed';
import { GoalZoom, GoalsAscent, useGoals, type AscentGoal } from '@/components/goals-ascent';
import { MultimodalBookkeeping } from '@/components/multimodal-bookkeeping';
import { PaymentInterceptorModal } from '@/components/payment-interceptor-modal';
import { QuarantineCards } from '@/components/quarantine-cards';
import { SimulationToolbar } from '@/components/simulation-toolbar';
import { SpendingBars } from '@/components/spending-bars';
import { SpendingStatisticChart } from '@/components/spending-statistic-chart';
import { CircularExpenseDonut } from '@/components/circular-expense-donut';
import { ClinicalProfileView } from '@/components/clinical-profile-view';
import { ActivitySection } from '@/components/activity-section';
import { CentroHeroCard } from '@/components/centro-hero-card';
import { SubscriptionTab } from '@/components/subscription-tab';
import { RemindersTimeline } from '@/components/reminders-timeline';
import { CampusCashDashboard } from '@/components/dashboard/campus-cash-dashboard';
import { ModernSettingsView } from '@/components/profile/modern-settings-view';
import { ModernCalendarView } from '@/components/calendar/modern-calendar';
import { BudgetDetailsView } from '@/components/dashboard/budget-details-view';
import { AllTransactionsSlideView } from '@/components/transactions/all-transactions-slide-view';
import { ArcRing } from '@/components/arc-ring';
import { FolderTabCard } from '@/components/folder-tab-card';
import { StudentDowngradeDrawer } from '@/components/student-downgrade-drawer';
import { SubscriptionTimeline } from '@/components/subscription-timeline';
import { VaultPanel } from '@/components/vault-panel';
import { ZombieRadarPanel } from '@/components/zombie-radar-panel';
import { ExpenseOverviewCard } from '@/components/corridor-chart';
import { SteppedLogo, UnequalMenuIcon } from '@/components/ui/design-icons';
import { ProfileSheet } from '@/components/profile-sheet';
import { NotificationsSheet } from '@/components/notifications-sheet';
import { CopilotTab } from '@/components/copilot-tab';
import { ReceiptAiFlowModal } from '@/components/ocr/receipt-ai-flow-modal';
import { PiggyDefenseVaultTab } from '@/components/vault/piggy-defense-vault-tab';

export type MobileTab = 'home' | 'timeline' | 'subscription' | 'agent' | 'radar' | 'vault';

type SheetId =
  | 'none'
  | 'profile'
  | 'expense'
  | 'payments'
  | 'notifications'
  | 'summary'
  | 'audit'
  | 'commitments'
  | 'ai'
  | 'sandbox'
  | 'budgetDetails'
  | 'allTransactions';
type AiSegment = 'OCR' | 'VOICE' | 'COPILOT';

export interface MobileAppShellProps {
  /** Rendered inside the AI drawer's Copilot segment. Falls back to `<AgentChat />`. */
  copilot?: React.ReactNode;
  initialTab?: MobileTab;
  className?: string;
}

/* ------------------------------------------------------------------ *
 * Small display primitives
 * ------------------------------------------------------------------ */

/** Integer / decimal split typography — the anti-"generic AI" money treatment. */
function SplitAmount({
  value,
  size = 40,
  tone = 'dark',
  className,
}: {
  value: number;
  size?: number;
  tone?: 'dark' | 'light';
  className?: string;
}) {
  const [int, dec] = formatRM(value).replace('RM', '').trim().split('.');
  return (
    <span className={cn('inline-flex items-start', tone === 'light' ? 'text-white' : 'text-holst-950', className)}>
      <span
        className={cn('ct-kicker mr-1 mt-1', tone === 'light' ? 'text-holst-200' : 'text-holst-800')}
        style={{ fontSize: Math.max(9, size * 0.26) }}
      >
        RM
      </span>
      <span className="ct-int" style={{ fontSize: size }}>
        {int}
      </span>
      <span className="ct-dec mt-[3px]" style={{ fontSize: size * 0.52 }}>
        .{dec ?? '00'}
      </span>
    </span>
  );
}

function ScreenTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="pb-1 pt-2">
      <p className="ct-kicker text-holst-600">{kicker}</p>
      <h1 className="text-[22px] font-extrabold tracking-[-0.03em] text-holst-950">{title}</h1>
    </div>
  );
}

function greetingFor(clock: number): string {
  const h = new Date(clock).getUTCHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDay(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ *
 * Status bar
 * ------------------------------------------------------------------ */

function StatusBar({ onOpenSandbox }: { onOpenSandbox: () => void }) {
  const clock = useCtrlPayStore((s) => s.sandboxClock);
  const time = new Date(clock).toISOString().slice(11, 16);
  return (
    <div className="relative z-10 flex shrink-0 items-center justify-between px-6 pb-1 pt-3 text-holst-950">
      <span className="duo-num text-[12px] font-bold">{time}</span>
      <span className="ct-island absolute left-1/2 top-1.5 h-6 w-[92px] -translate-x-1/2 rounded-full" />
      <span className="flex items-center gap-2">
        <button
          type="button"
          className="ct-sandbox-pill"
          onClick={onOpenSandbox}
          aria-label="Open the judge sandbox drawer"
        >
          <Zap className="h-3 w-3" /> Sandbox
        </button>
        <span className="flex items-center gap-1.5">
          <SignalIcon />
          <BatteryFull className="h-4 w-4" />
        </span>
      </span>
    </div>
  );
}

function SignalIcon() {
  return (
    <span className="flex items-end gap-[2px]" aria-hidden>
      {[3, 5, 7, 9].map((h) => (
        <span key={h} className="w-[3px] rounded-sm bg-holst-950" style={{ height: h }} />
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Bottom dock + multimodal AI orb
 * ------------------------------------------------------------------ */

function SparkleStarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 2.5L14.4 9.6L21.5 12L14.4 14.4L12 21.5L9.6 14.4L2.5 12L9.6 9.6L12 2.5Z" />
    </svg>
  );
}

const DOCK_ITEMS: Array<{ id: MobileTab; label: string; icon: React.ElementType }> = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'subscription', label: 'Subscription', icon: CreditCard },
  { id: 'vault', label: 'Vault', icon: PiggyBank },
];

function DockButton({
  item,
  active,
  onSelect,
}: {
  item: { id: MobileTab; label: string; icon: React.ElementType };
  active: boolean;
  onSelect: (t: MobileTab) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      className="ct-dock-btn"
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      onClick={() => onSelect(item.id)}
    >
      <Icon className="h-5 w-5" />
      <span className="ct-dock-dot" />
    </button>
  );
}

function SlidingNavigationPlusOrb({
  onTap,
  onSelectOcr,
  onSelectCopilot,
}: {
  onTap: () => void;
  onSelectOcr: () => void;
  onSelectCopilot: () => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hoveredAction, setHoveredAction] = React.useState<'ocr' | 'copilot' | null>(null);

  const holdTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = React.useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = React.useRef(false);
  const isExpandedRef = React.useRef(false);
  isExpandedRef.current = isExpanded;

  const clearTimer = React.useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  React.useEffect(() => clearTimer, [clearTimer]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    startPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = true;
    setHoveredAction(null);

    clearTimer();
    // Long press threshold: 220ms triggers slide-out of OCR & Copilot
    holdTimerRef.current = setTimeout(() => {
      setIsExpanded(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    }, 220);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDraggingRef.current || !startPosRef.current) return;
    const deltaX = e.clientX - startPosRef.current.x;

    if (isExpandedRef.current) {
      if (deltaX < -22) {
        setHoveredAction('ocr');
      } else if (deltaX > 22) {
        setHoveredAction('copilot');
      } else {
        setHoveredAction(null);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    clearTimer();
    const wasExpanded = isExpandedRef.current;
    const action = hoveredAction;
    isDraggingRef.current = false;
    startPosRef.current = null;

    if (wasExpanded) {
      if (action === 'ocr') {
        setIsExpanded(false);
        setHoveredAction(null);
        onSelectOcr();
        return;
      }
      if (action === 'copilot') {
        setIsExpanded(false);
        setHoveredAction(null);
        onSelectCopilot();
        return;
      }
      // Held long enough and released in center without sliding: keep open for direct tap
    } else {
      // Short tap: under 220ms triggers quick expense
      onTap();
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    clearTimer();
    isDraggingRef.current = false;
    startPosRef.current = null;
  };

  return (
    <div className="relative shrink-0 flex items-center justify-center">
      {/* Dim backdrop to dismiss when tapped outside */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => {
            setIsExpanded(false);
            setHoveredAction(null);
          }}
        />
      )}

      {/* Satellite Buttons: Left (OCR) and Right (Copilot) floating above dock */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Left Satellite: OCR Scan (Camera) */}
            <motion.div
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{
                opacity: 1,
                x: -64,
                y: -52,
                scale: hoveredAction === 'ocr' ? 1.18 : 1.0,
              }}
              exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              className="absolute z-40 pointer-events-auto"
            >
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setHoveredAction(null);
                  onSelectOcr();
                }}
                className={cn(
                  'relative h-[48px] w-[48px] rounded-full flex items-center justify-center transition-all',
                  'bg-gradient-to-br from-[#10606F] via-[#0A3D4A] to-[#04222B] text-white border-[3.5px] border-white',
                  'shadow-[0_12px_28px_-4px_rgba(4,34,43,0.45),0_0_16px_-2px_rgba(29,139,148,0.4)]',
                  hoveredAction === 'ocr' &&
                    'ring-4 ring-[#1D8B94] ring-offset-2 ring-offset-white shadow-[0_0_24px_rgba(29,139,148,0.7)]'
                )}
                aria-label="Scan OCR Receipt"
              >
                <Camera className="h-5 w-5 text-white" />
                <span
                  className={cn(
                    'absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-black shadow-md transition-all',
                    hoveredAction === 'ocr'
                      ? 'bg-[#10606F] text-white scale-110'
                      : 'bg-[#04222B] text-white'
                  )}
                >
                  Scan OCR
                </span>
              </button>
            </motion.div>

            {/* Right Satellite: Copilot AI (Bot) */}
            <motion.div
              initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              animate={{
                opacity: 1,
                x: 64,
                y: -52,
                scale: hoveredAction === 'copilot' ? 1.18 : 1.0,
              }}
              exit={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              className="absolute z-40 pointer-events-auto"
            >
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setHoveredAction(null);
                  onSelectCopilot();
                }}
                className={cn(
                  'relative h-[48px] w-[48px] rounded-full flex items-center justify-center transition-all',
                  'bg-gradient-to-br from-[#10606F] via-[#0A3D4A] to-[#04222B] text-white border-[3.5px] border-white',
                  'shadow-[0_12px_28px_-4px_rgba(4,34,43,0.45),0_0_16px_-2px_rgba(29,139,148,0.4)]',
                  hoveredAction === 'copilot' &&
                    'ring-4 ring-[#1D8B94] ring-offset-2 ring-offset-white shadow-[0_0_24px_rgba(29,139,148,0.7)]'
                )}
                aria-label="Copilot AI Agent"
              >
                <Bot className="h-5 w-5 text-white" />
                <span
                  className={cn(
                    'absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[9.5px] font-black shadow-md transition-all',
                    hoveredAction === 'copilot'
                      ? 'bg-[#10606F] text-white scale-110'
                      : 'bg-[#04222B] text-white'
                  )}
                >
                  Copilot AI
                </span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Center + Button */}
      <button
        type="button"
        className={cn(
          'ct-orb shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-holst-200 z-40 transition-transform duration-200 select-none',
          isExpanded && 'scale-95 shadow-[0_0_20px_rgba(29,139,148,0.5)]'
        )}
        aria-label="Navigation quick action: tap for expense, press & slide left for OCR, right for Copilot"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onClick={() => {
          if (isExpanded) {
            setIsExpanded(false);
            setHoveredAction(null);
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Plus
          className={cn(
            'relative z-10 h-6 w-6 stroke-[2.5] text-white transition-transform duration-200',
            isExpanded && 'rotate-45'
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * In-phone sheet
 * ------------------------------------------------------------------ */

function PhoneSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close"
            className="ct-scrim absolute inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '104%' }}
            animate={{ y: 0 }}
            exit={{ y: '104%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            className="ct-sheet absolute inset-x-0 bottom-0 z-50 flex max-h-[86%] flex-col overflow-hidden"
          >
            <div className="flex flex-col items-center gap-2 px-4 pt-3">
              <span className="ct-grabber" />
              <div className="flex w-full items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-extrabold text-holst-950">{title}</p>
                  {subtitle && <p className="truncate text-[11px] duo-muted">{subtitle}</p>}
                </div>
                <button type="button" className="ct-icon-btn h-9 w-9" onClick={onClose} aria-label="Close sheet">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex-1 overflow-y-auto no-scrollbar px-4 pb-6">{children}</div>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ *
 * Home tab
 * ------------------------------------------------------------------ */

/** Ratified non-negotiable term: every impulse buy is held for a 24-hour human cooling-off click. */
const QUARANTINE_HOLD_HOURS = 24;

/** Compact RM string for the arc-ring <textPath> labels (the legend carries the exact value). */
function arcRM(value: number): string {
  return `RM ${Math.round(value).toLocaleString('en-MY')}`;
}

function spendingWeek(clock: number) {
  const hist = HISTORICAL_DAILY_SPENDING.slice(-7);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return hist.map((value, i) => {
    const offsetDays = hist.length - 1 - i;
    const day = new Date(clock - offsetDays * 86_400_000);
    return { label: dayNames[day.getUTCDay()], value };
  });
}

const CATEGORY_ICON: Record<SpendCategory, React.ElementType> = {
  Bills_Utilities: Receipt,
  Campus_Cafeteria_Basic: Utensils,
  Medical: HeartPulse,
  Transport_Essential: Bus,
  Food_Delivery_Grab_Foodpanda: UtensilsCrossed,
  Entertainment: Clapperboard,
  Bubble_Tea_Dining: CupSoda,
  Shopping: ShoppingBag,
};

/** Muted in-family tints so every row gets its own colour without leaving the palette. */
const CATEGORY_TINT: Record<SpendCategory, string> = {
  Bills_Utilities: 'bg-[#FFF1E4] text-[#8A5408]',
  Campus_Cafeteria_Basic: 'bg-[#E3F3EF] text-[#0F6B55]',
  Medical: 'bg-[#DCF7EE] text-[#0B5F4A]',
  Transport_Essential: 'bg-[#E9F4F3] text-[#0A3D4A]',
  Food_Delivery_Grab_Foodpanda: 'bg-[#FFEBE0] text-[#A14E1E]',
  Entertainment: 'bg-[#FDEBEF] text-[#B3253F]',
  Bubble_Tea_Dining: 'bg-[#F6EFE3] text-[#7A5A2E]',
  Shopping: 'bg-[#10606F] text-[#EAF7F4]',
};

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCDate()} ${SHORT_MONTHS[d.getUTCMonth()]}`;
}

function prettyMerchant(name: string): string {
  const cleaned = name
    .replace(/\.(COM|MY|NET|ORG)(\/[A-Z]+)?/gi, ' ')
    .replace(/\b(PTE|LTD|SDN|BHD|ONLINE|BILL)\b/gi, ' ')
    .replace(/[*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const title = (cleaned || name).toLowerCase();
  return title.replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

interface TxnRow {
  id: string;
  merchant: string;
  amount: number;
  category: SpendCategory;
  at: number;
}

/** Merges real booked expenses with the seeded statement history, newest first. */
function buildRecentTransactions(clock: number, events: SandboxEvent[]): TxnRow[] {
  const rows: TxnRow[] = [];

  for (const e of events) {
    if (e.type !== 'BOOKING') continue;
    const p = e.payload as { merchant?: unknown; amount?: unknown; category?: unknown };
    if (typeof p.merchant !== 'string' || typeof p.amount !== 'number' || typeof p.category !== 'string') continue;
    rows.push({ id: e.id, merchant: p.merchant, amount: p.amount, category: p.category as SpendCategory, at: e.at });
  }

  const now = new Date(clock);
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  for (const b of FIXED_BILLS) {
    if (!b.paid) continue;
    rows.push({
      id: `bill_${b.id}`,
      merchant: b.label,
      amount: b.amountRM,
      category: 'Bills_Utilities',
      at: monthStart + (b.dueDay - 1) * 86_400_000,
    });
  }

  for (const t of RECURRING_TRANSACTIONS) {
    rows.push({
      id: t.id,
      merchant: t.merchant,
      amount: t.amountRM,
      category: t.category,
      at: new Date(`${t.date}T00:00:00Z`).getTime(),
    });
  }

  const seen = new Set<string>();
  return rows
    .sort((a, b) => b.at - a.at)
    .filter((r) => {
      const key = `${prettyMerchant(r.merchant)}|${r.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 5);
}

function CategoryTile({ category }: { category: SpendCategory }) {
  const Icon = CATEGORY_ICON[category] ?? Receipt;
  return (
    <span className={cn('ct-cat-tile', CATEGORY_TINT[category] ?? CATEGORY_TINT.Bills_Utilities)}>
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function DualLimits() {
  const userLimits = useCtrlPayStore((s) => s.userLimits);
  const aiMandate = useCtrlPayStore((s) => s.aiMandate);
  const setAiMandate = useCtrlPayStore((s) => s.setAiMandate);

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-holst-50/70 p-3">
      <div>
        <p className="ct-kicker duo-muted">Constraints on you</p>
        <div className="mt-1.5 space-y-1.5">
          <LimitRow label="Weekly cap" value={userLimits.weeklyPayLimit} />
          <LimitRow label="Monthly cap" value={userLimits.monthlyPayLimit} />
        </div>
      </div>
      <div className="h-px bg-holst-950/8" />
      <div>
        <p className="ct-kicker duo-muted">Constraints on the AI</p>
        <label className="mt-2 block text-[11px] font-semibold text-holst-950">
          Max lock amount · {formatRM(aiMandate.maxLockAmountRM)}
          <Slider
            className="mt-1.5"
            min={10}
            max={500}
            step={10}
            value={aiMandate.maxLockAmountRM}
            onValueChange={(v) => setAiMandate({ maxLockAmountRM: v })}
            aria-label="Max lock amount"
          />
        </label>
        <label className="mt-2 block text-[11px] font-semibold text-holst-950">
          Max lock duration · {aiMandate.maxLockDurationDays} days
          <Slider
            className="mt-1.5"
            min={1}
            max={30}
            step={1}
            value={aiMandate.maxLockDurationDays}
            onValueChange={(v) => setAiMandate({ maxLockDurationDays: v })}
            aria-label="Max lock duration"
          />
        </label>
      </div>
    </div>
  );
}

function LimitRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[11.5px]">
      <span className="duo-muted">{label}</span>
      <span className="duo-num font-bold text-holst-950">{formatRM(value)}</span>
    </div>
  );
}

function HomeTab({
  onOpenSheet,
  onGoTab,
  onOpenTransaction,
  onOpenCfar,
}: {
  onOpenSheet: (s: SheetId) => void;
  onGoTab: (t: MobileTab) => void;
  onOpenTransaction: (item: ActivityItem) => void;
  onOpenCfar?: () => void;
}) {
  return (
    <CampusCashDashboard
      onOpenProfile={() => onOpenSheet('profile')}
      onOpenTimeline={() => onGoTab('timeline')}
      onOpenExpense={() => onOpenSheet('expense')}
      onOpenSimulator={() => {
        onOpenCfar?.();
        onGoTab('agent');
      }}
      onOpenAnalytics={() => onOpenSheet('payments')}
      onOpenNotifications={() => onOpenSheet('notifications')}
      onOpenBudgetDetails={() => onOpenSheet('budgetDetails')}
      onOpenAllTransactions={() => onOpenSheet('allTransactions')}
      onOpenItem={onOpenTransaction}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Timeline tab — CFaR projection curve
 * ------------------------------------------------------------------ */

function buildSmoothPath(series: number[], w: number, h: number, pad = 10) {
  const n = series.length;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => ({
    x: n === 1 ? 0 : (i / (n - 1)) * w,
    y: pad + (1 - (v - min) / span) * (h - pad * 2),
  }));

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(2)} ${p0.y.toFixed(2)}, ${cx.toFixed(2)} ${p1.y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }
  const area = `${d} L ${w} ${h} L 0 ${h} Z`;
  const minIndex = series.indexOf(min);
  return { d, area, pts, minIndex, min, max };
}

function CfarCurve() {
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const amortize = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const allowance = useCtrlPayStore((s) => s.dynamicDailyAllowance());

  const series = React.useMemo(() => {
    const bills = upcomingFixedBills(sandboxClock, SUBSCRIPTIONS, amortize);
    const days = remainingDaysInMonth(sandboxClock);
    const today = new Date(sandboxClock).getUTCDate();
    const out: number[] = [currentBalance];
    let bal = currentBalance;
    for (let i = 1; i <= days; i++) {
      const due = bills
        .filter((b) => !b.paid && b.dueDay === today + i)
        .reduce((sum, b) => sum + b.amountRM, 0);
      bal = bal - allowance - due;
      out.push(bal);
    }
    return out;
  }, [currentBalance, sandboxClock, amortize, allowance]);

  const W = 320;
  const H = 132;
  const { d, area, pts, minIndex, min } = buildSmoothPath(series, W, H);
  const last = pts[pts.length - 1];
  const minPt = pts[minIndex];
  const monthEnd = series[series.length - 1];

  return (
    <section className="rounded-[32px] bg-white p-4 shadow-soft ring-1 ring-inset ring-holst-950/5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="ct-kicker duo-muted">Projected month-end</p>
          <SplitAmount value={monthEnd} size={26} className="mt-1" />
        </div>
        <span className={cn(monthEnd >= currentBalance ? 'ct-badge-up' : 'ct-badge-down')}>
          {monthEnd >= currentBalance ? <ArrowUpRight className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
          {formatRM(Math.abs(monthEnd - currentBalance))}
        </span>
      </div>

      <div className="relative mt-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-[132px] w-full" preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id="ct-cfar-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1D8B94" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#1D8B94" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* daily vertical dividers */}
          {pts.map((p, i) =>
            i % 3 === 0 ? (
              <line key={i} x1={p.x} y1={0} x2={p.x} y2={H} stroke="rgba(4,34,43,0.05)" strokeWidth="1" />
            ) : null,
          )}
          {/* sparkle dots */}
          {pts.map((p, i) =>
            i % 4 === 0 ? <circle key={`d${i}`} cx={p.x} cy={p.y} r="1.6" fill="#98D8D0" /> : null,
          )}
          <path d={area} fill="url(#ct-cfar-fill)" />
          <path d={d} fill="none" stroke="#10606F" strokeWidth="3" strokeLinecap="round" />
          {/* min node */}
          <circle cx={minPt.x} cy={minPt.y} r="5" fill="#ffffff" stroke="#1D8B94" strokeWidth="3" />
          {/* endpoint arrow */}
          <path
            d={`M ${last.x - 14} ${last.y + 9} L ${last.x - 2} ${last.y - 1} M ${last.x - 12} ${last.y - 1} L ${last.x - 2} ${last.y - 1} L ${last.x - 9} ${last.y + 6}`}
            fill="none"
            stroke="#10606F"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className="ct-bubble absolute -translate-x-1/2 -translate-y-full"
          style={{
            left: `${Math.min(80, (minPt.x / W) * 100)}%`,
            top: `${(minPt.y / H) * 100}%`,
          }}
        >
          Min {formatRM(min)}
        </span>
      </div>

      <p className="mt-3 text-[10.5px] leading-relaxed duo-muted">
        Smooth CFaR trajectory from the deterministic engine · daily allowance minus scheduled bills. The glowing node
        is the lowest projected balance this month.
      </p>
    </section>
  );
}

function TimelineTab({
  goals,
  onOpenGoal,
}: {
  goals: AscentGoal[];
  onOpenGoal: (goalId: string) => void;
}) {
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [showStressTester, setShowStressTester] = React.useState(false);

  return (
    <div className="animate-fade-in space-y-4">
      {/* Component from Image 2: Exact Expense Overview Card */}
      <ExpenseOverviewCard
        amount="RM 120.00"
        onCalendarClick={() => setShowCalendar((v) => !v)}
        onDrillClick={() => setShowStressTester((v) => !v)}
      />

      {/* Real deterministic engine status chips */}
      <div className="flex items-center justify-between px-2 text-[11px] font-semibold text-holst-900/70">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#10B981]" /> &lt;3ms latency
        </span>
        <span>0% NSF zero-break</span>
        <span>ES95 tail protected ✓</span>
      </div>

      {/* Toggled 30-Day Subscription Deduction Calendar */}
      {showCalendar && (
        <div className="animate-fade-in">
          <SubscriptionTimeline />
        </div>
      )}

      {/* Toggled CFaR Stress Tester */}
      {showStressTester && (
        <div className="animate-fade-in">
          <CfarStressTester />
        </div>
      )}

      {/* Goals Ascent Milestone Path */}
      <GoalsAscent goals={goals} onOpenGoal={onOpenGoal} />

      {!showCalendar && <SubscriptionTimeline />}
      {!showStressTester && <CfarStressTester />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Radar tab — Image 3 right screen: 4 pure geometric components
 * ------------------------------------------------------------------ */

type RadarOrbitMode = 'invested' | 'trend' | 'circle';

function RadarTab({
  onVerifyStudent,
  onOpenSheet,
}: {
  onVerifyStudent: () => void;
  onOpenSheet: (s: SheetId) => void;
}) {
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const zombieTags = useCtrlPayStore((s) => s.zombieTags);
  const answerZombie = useCtrlPayStore((s) => s.answerZombie);
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);
  const [orbitMode, setOrbitMode] = React.useState<RadarOrbitMode>('invested');
  const [showFullConsole, setShowFullConsole] = React.useState(false);
  const [viewStyle, setViewStyle] = React.useState<'concept' | 'ctrlpay'>('concept');

  const analysis = React.useMemo(
    () =>
      analyzeZombies({
        transactions: RECURRING_TRANSACTIONS,
        subscriptions: SUBSCRIPTIONS,
        usageSignals: USAGE_SIGNALS,
        sandboxClock,
      }),
    [sandboxClock],
  );

  const monthly = React.useMemo(
    () => calculateAmortizedSubscriptions(SUBSCRIPTIONS, { sandboxClock }),
    [sandboxClock],
  );

  const monthlyBySub = new Map(monthly.map((m) => [m.subscriptionId, m.monthlyBurden]));

  let activeAmt = 0;
  let zombieAmt = 0;
  for (const sub of SUBSCRIPTIONS) {
    const tag = zombieTags[sub.subscriptionId];
    const amt = monthlyBySub.get(sub.subscriptionId) ?? sub.amountRM;
    if (tag === 'ZOMBIE' || tag === 'SUSPECTED_ZOMBIE') zombieAmt += amt;
    else activeAmt += amt;
  }

  const arbitrageIds = analysis.studentDowngradeCandidates;
  const arbitrageSavings = arbitrageIds.reduce((sum, id) => {
    const entry = SUBSCRIPTION_REGISTRY[id];
    if (entry.studentPriceRM === null) return sum;
    return sum + (entry.fullPriceRM - entry.studentPriceRM);
  }, 0);

  const totalMonthly = activeAmt + zombieAmt;
  const zombieCardId = SUBSCRIPTIONS.map((s) => s.subscriptionId).find(
    (id) => zombieTags[id] === 'SUSPECTED_ZOMBIE' || zombieTags[id] === 'ZOMBIE',
  );
  const arbitrageCardId = arbitrageIds[0];

  const isConcept = viewStyle === 'concept';

  return (
    <div className="animate-fade-in space-y-4">
      {/* Component 1: Minimalist Transparent Header Bar (from Image 3) */}
      <header className="flex items-center justify-between pt-1 pb-1">
        <div className="flex items-center gap-2.5">
          <SteppedLogo className="h-5 w-6" />
          <h1 className="text-[20px] font-bold tracking-tight text-[#04222B]">
            {isConcept ? 'Nexora' : 'CtrlPay'}
          </h1>
          {/* Subtle fidelity switcher pill */}
          <button
            type="button"
            onClick={() => setViewStyle(isConcept ? 'ctrlpay' : 'concept')}
            className="ml-1 rounded-full border border-[#04222B]/15 bg-white/50 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-[#04222B]/70 hover:bg-white/80 transition-colors"
            title="Toggle between Dribbble concept data and live CtrlPay data"
          >
            {isConcept ? 'Concept' : 'Engine'}
          </button>
        </div>

        {/* Right dual 38px circular frosted glass buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSheet('summary')}
            aria-label="12:00 PM Daily summary"
            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-white/65 bg-white/45 backdrop-blur shadow-sm text-[#04222B] transition-transform active:scale-95"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenSheet('sandbox')}
            aria-label="Judge Sandbox and SHA-256 Audit Chain"
            className="grid h-[38px] w-[38px] place-items-center rounded-full border border-white/65 bg-white/45 backdrop-blur shadow-sm text-[#04222B] transition-transform active:scale-95"
          >
            <UnequalMenuIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Component 2: Three-Tier Concentric Arc-Labeled Donut Gauge + Orbiting Capsules */}
      <div className="relative pt-1 pb-1">
        <ArcRing
          segments={[
            { id: 'main', value: 210, color: '#04222B', textColor: '#E2F4F0' },
            { id: 'profit', value: 45, color: '#E2F4F0', textColor: '#04222B', outline: true },
            { id: 'vault', value: 50, color: '#98D8D0', textColor: '#04222B' },
          ]}
          arcLabels={
            isConcept
              ? ['Invested', 'Profit', 'RM 1.5k/yr']
              : ['Active', 'Saved', 'Vault']
          }
          arcAmounts={
            isConcept
              ? ['RM 120/mo', '', '']
              : [`RM ${Math.round(activeAmt)}`, '', '']
          }
          center={isConcept ? 'RM 186/mo' : `RM ${Math.round(totalMonthly)}`}
          capsules={[
            { id: 'invested', icon: BarChart2, label: 'Column metrics' },
            { id: 'trend', icon: TrendingUp, label: 'Trend line' },
            { id: 'circle', icon: CircleDot, label: 'Mandate distribution' },
          ]}
          activeCapsule={orbitMode}
          onCapsule={(id) => setOrbitMode(id as RadarOrbitMode)}
        />
      </div>

      {/* Components 3 & 4: Two Vertically Stacked Asymmetric Folder-Tab Cutout Cards */}
      <div className="space-y-3 pt-1">
        {/* Card 1: Invested / Suspected Zombie */}
        <FolderTabCard
          tone="sky"
          tab={isConcept ? 'Invested' : 'Suspected zombie'}
          metaTime={isConcept ? '16:00' : '30d idle'}
          metaDate={isConcept ? '01-06-2026' : '15-10-2026'}
          title={isConcept ? 'Coinbase Global (COIN)' : 'Disney+ Hotstar (MYR)'}
          pills={
            isConcept ? (
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/45 text-[11px] font-bold text-[#04222B]">
                  <ArrowUpRight className="h-3 w-3" /> +4.73%
                </span>
                <span className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/25 text-[11px] font-bold text-[#04222B]">
                  +RM 1,286 - Today
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/45 text-[11px] font-bold text-[#04222B]">
                  <ArrowUpRight className="h-3 w-3" /> 1.43× impulse
                </span>
                <button
                  type="button"
                  onClick={() => zombieCardId && answerZombie(zombieCardId, false)}
                  className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/25 text-[11px] font-bold text-[#04222B] hover:bg-white/40"
                >
                  Flag zombie →
                </button>
              </>
            )
          }
          footerLeft={isConcept ? 'Total Invested : RM 96k' : 'Monthly burn : RM 39.90'}
          footerRight={isConcept ? 'Profit : RM 16k' : 'Sweepable : +RM 39.90'}
        />

        {/* Card 2: Withdraw / Student Arbitrage */}
        <FolderTabCard
          tone="sky"
          tab={isConcept ? 'Withdraw' : (studentVerified ? 'Student arbitrage · verified' : 'Student arbitrage')}
          metaTime={isConcept ? '08:42' : '24h lock'}
          metaDate={isConcept ? '02-06-2026' : '02-06-2026'}
          title={isConcept ? 'MicroStrategy (MSTR)' : 'Spotify Premium (Student)'}
          pills={
            isConcept ? (
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/45 text-[11px] font-bold text-[#04222B]">
                  <ArrowUpRight className="h-3 w-3" /> +2.12%
                </span>
                <span className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/25 text-[11px] font-bold text-[#04222B]">
                  +RM 942.65 - Today
                </span>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/45 text-[11px] font-bold text-[#04222B]">
                  <ArrowUpRight className="h-3 w-3" /> Save RM 7.40/mo
                </span>
                <button
                  type="button"
                  onClick={onVerifyStudent}
                  className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/25 text-[11px] font-bold text-[#04222B] hover:bg-white/40"
                >
                  Verify &amp; downgrade →
                </button>
              </>
            )
          }
          footerLeft={isConcept ? 'Total Invested : RM 18,632' : 'Full price : RM 15.90'}
          footerRight={isConcept ? 'Profit : +RM 942.65' : 'Student : RM 8.50'}
        />
      </div>

      {/* Expandable full fintech roster & raw rules (pain.009) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowFullConsole((v) => !v)}
          className="flex w-full items-center justify-between rounded-2xl bg-white/60 px-4 py-2.5 text-[11px] font-bold text-[#04222B]/75 border border-white/80 hover:bg-white/80 transition-colors"
        >
          <span>More Mandates &amp; Telemetry (pain.009)</span>
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showFullConsole && 'rotate-180')} />
        </button>

        {showFullConsole && (
          <div className="mt-3 space-y-3 animate-fade-in">
            <ZombieRadarPanel />
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-holst-50/70 px-2 py-2">
      <span className="mx-auto mb-1 block h-2 w-2 rounded-full" style={{ background: color }} />
      <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] duo-muted">{label}</p>
      <p className="duo-num text-[11.5px] font-extrabold text-holst-950">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Vault & security tab
 * ------------------------------------------------------------------ */

function PermissionMatrix() {
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);
  const enabledTiers = useCtrlPayStore((s) => s.enabledTiers);
  const setTier = useCtrlPayStore((s) => s.setTier);
  const plan = useCtrlPayStore((s) => s.plan);
  const setPlan = useCtrlPayStore((s) => s.setPlan);
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);
  const setStudentVerified = useCtrlPayStore((s) => s.setStudentVerified);

  const tiers = [
    { tier: 'T0' as const, label: 'T0 Read-only insights', hint: 'Analysis, CFaR, Zombie Radar. Always on.' },
    { tier: 'T1' as const, label: 'T1 Low-risk organization', hint: 'Tagging, reminders, suspected-zombie flags.' },
    { tier: 'T2' as const, label: 'T2 Assisted preparation', hint: 'Draft cancellations, deep-link drawers.' },
    { tier: 'T3' as const, label: 'T3 Financial state change', hint: 'Always needs a per-action click.' },
  ];

  return (
    <section className="duo-card border-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="ct-kicker duo-muted">Permission ladder</p>
          <h2 className="mt-0.5 flex items-center gap-2 text-[14px] font-extrabold text-holst-950">
            <Lock className="h-4 w-4 text-holst-600" /> T0 – T3 control
          </h2>
        </div>
        <span className="ct-chip">{masterAutonomyEnabled ? 'AUTONOMY ON' : 'ADVISORY ONLY'}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-holst-50/70 p-3">
        <div>
          <p className="text-[12px] font-bold text-holst-950">Master AI autonomy</p>
          <p className="text-[10.5px] duo-muted">Default OFF — CtrlPay runs T0 advisory mode only.</p>
        </div>
        <Switch
          checked={masterAutonomyEnabled}
          onCheckedChange={setMasterAutonomy}
          aria-label="Master AI Autonomy Switch"
        />
      </div>

      <div className="mt-2 space-y-1.5">
        {tiers.map(({ tier, label, hint }) => {
          const disabled = tier === 'T0' || !masterAutonomyEnabled || tier === 'T3';
          const checked = tier === 'T0' ? true : tier === 'T3' ? false : enabledTiers[tier];
          return (
            <div key={tier} className="flex items-center justify-between gap-3 rounded-2xl bg-white/70 p-2.5 ring-1 ring-inset ring-holst-950/5">
              <div className="min-w-0">
                <p className="text-[11.5px] font-bold text-holst-950">{label}</p>
                <p className="text-[10px] duo-muted">{hint}</p>
              </div>
              {disabled && tier === 'T3' ? (
                <span className="ct-chip shrink-0">per-click</span>
              ) : (
                <Switch
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(v) => setTier(tier, v)}
                  aria-label={`${tier} toggle`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-holst-50/70 p-3">
        <div>
          <p className="text-[12px] font-bold text-holst-950">Student status</p>
          <p className="text-[10.5px] duo-muted">{PROFILE.studentEmail}</p>
        </div>
        <Switch checked={studentVerified} onCheckedChange={setStudentVerified} aria-label="Student verification" />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-holst-50/70 p-3">
        <div>
          <p className="text-[12px] font-bold text-holst-950">Plan (gates Pro modules only)</p>
          <p className="text-[10.5px] duo-muted">Safety modules are never gated.</p>
        </div>
        <div className="ct-seg shrink-0">
          <button
            type="button"
            data-on={plan === 'FREE'}
            className="ct-seg-btn"
            onClick={() => setPlan('FREE')}
          >
            Free
          </button>
          <button type="button" data-on={plan === 'PRO'} className="ct-seg-btn" onClick={() => setPlan('PRO')}>
            Student Pro
          </button>
        </div>
      </div>
    </section>
  );
}

function VaultHero({ onOpenAudit }: { onOpenAudit: () => void }) {
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const sweeps = useCtrlPayStore((s) => s.pendingSweeps);
  const verified = sweeps.filter((s) => s.status === 'VERIFIED').length;
  const [bucket, setBucket] = React.useState<'free' | 'vault' | 'reward' | null>(null);

  const totalHeld = currentBalance + defenseVault + rewardPool;
  const shown =
    bucket === 'free' ? currentBalance : bucket === 'vault' ? defenseVault : bucket === 'reward' ? rewardPool : totalHeld;
  const kicker =
    bucket === 'free'
      ? 'Free balance'
      : bucket === 'vault'
        ? 'Defense Vault'
        : bucket === 'reward'
          ? 'Reward pool'
          : 'Total held';

  return (
    <section className="duo-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="ct-kicker duo-muted">Sandbox holdings · non-interest</span>
        <button type="button" className="ct-chip shrink-0" onClick={onOpenAudit}>
          <CheckCircle2 className="mr-1 h-3 w-3 text-[#0F6B55]" /> SHA-256 chain
        </button>
      </div>

      <ArcRing
        segments={[
          { id: 'free', value: currentBalance, color: '#04222B', textColor: '#FFFFFF' },
          { id: 'vault', value: defenseVault, color: '#1D8B94', textColor: '#FFFFFF' },
          { id: 'reward', value: rewardPool, color: '#E2F4F0', textColor: '#04222B', outline: true },
        ]}
        arcLabels={['FREE', 'VAULT', 'REWARD']}
        arcAmounts={[arcRM(currentBalance), arcRM(defenseVault), arcRM(rewardPool)]}
        center={formatRM(shown)}
        centerKicker={kicker}
        centerSub="no interest · no leverage"
        capsules={[
          { id: 'free', icon: Wallet, label: 'Free balance' },
          { id: 'vault', icon: ShieldCheck, label: 'Defense Vault' },
          { id: 'reward', icon: PiggyBank, label: 'Reward pool' },
        ]}
        activeCapsule={bucket ?? undefined}
        onCapsule={(id) =>
          setBucket((b) => (b === id ? null : (id as 'free' | 'vault' | 'reward')))
        }
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Reward pool</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">{formatRM(rewardPool)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Verified sweeps</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">{verified}</p>
        </div>
      </div>
    </section>
  );
}

function VaultTab({ onOpenAudit }: { onOpenAudit: () => void }) {
  const quarantines = useCtrlPayStore((s) => s.quarantines);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);
  const enabledTiers = useCtrlPayStore((s) => s.enabledTiers);
  const armedTiers = (['T1', 'T2'] as const).filter((t) => enabledTiers[t]).length;

  return (
    <div className="animate-fade-in">
      <ScreenTitle kicker="Vault & security" title="Defense" />
      <div className="space-y-3">
        <VaultHero onOpenAudit={onOpenAudit} />

        <FolderTabCard
          tab="Commitment device"
          metaTime={`🕒 ${quarantines.length} parked`}
          metaDate={`📅 ${QUARANTINE_HOLD_HOURS}h lock`}
          tone="mint"
          title="Quarantine escrow"
          pills={
            <>
              <span className="ct-chip flex-1 justify-center py-2.5">never auto-releases</span>
              <button
                type="button"
                className="ct-action ct-action-primary flex-1 justify-center text-[11px]"
                onClick={onOpenAudit}
              >
                Open audit chain
              </button>
            </>
          }
          footerLeft="A human click is required to release locked escrow."
          footerRight={formatRM(rewardPool)}
        />

        <FolderTabCard
          tab="Permission ladder"
          metaTime="🕒 T0 advisory"
          metaDate="📅 T3 per-click"
          tone="jade"
          title="T0 – T3 control"
          pills={
            <>
              <span className="ct-chip flex-1 justify-center py-2.5">{armedTiers} tiers armed</span>
              <button
                type="button"
                className="ct-action ct-action-primary flex-1 justify-center text-[11px]"
                onClick={() => setMasterAutonomy(!masterAutonomyEnabled)}
              >
                {masterAutonomyEnabled ? 'Disarm autonomy' : 'Arm autonomy'}
              </button>
            </>
          }
          footerLeft="Financial state change always needs a per-action click."
          footerRight={masterAutonomyEnabled ? 'AUTONOMY ON' : 'ADVISORY ONLY'}
        />

        <VaultPanel />
        <PermissionMatrix />
        <AuditDrawer />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sheets
 * ------------------------------------------------------------------ */

function PaymentsSheet({ onClose }: { onClose: () => void }) {
  const simulate = useCtrlPayStore((s) => s.simulatePaymentIntent);
  return (
    <div className="space-y-2">
      <p className="text-[11px] duo-muted">
        Stand-in for Open Banking / merchant webhooks. Simulation only — no real money moves.
      </p>
      {PAYMENT_EVENTS.map((ev) => (
        <button
          key={ev.id}
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-2xl bg-holst-50/80 p-3 text-left ring-1 ring-inset ring-holst-950/5"
          onClick={() => {
            simulate({ merchant: ev.merchant, amount: ev.amount, category: ev.category, isNeed: ev.isNeed });
            onClose();
          }}
        >
          <span>
            <span className="block text-[12.5px] font-bold text-holst-950">
              {ev.merchant} {formatRM(ev.amount)}
            </span>
            <span className="block text-[10.5px] duo-muted">
              {ev.category.replaceAll('_', ' ')} · {ev.isNeed ? 'NEED' : 'WANT'}
            </span>
          </span>
          <span className="ct-chip">Simulate</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Judge Sandbox — the ONLY debug surface, and it lives inside the phone as a
 * bottom sheet so the App chrome stays 100% consumer-grade.
 *
 * Holds the sandbox clock controls, the payment-injection events, the
 * autonomy/permission ladder, the plan switch and the raw event feed.
 */
function JudgeSandboxSheet() {
  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-holst-50/80 p-3 text-[11px] leading-relaxed duo-muted ring-1 ring-inset ring-holst-950/5">
        <span className="font-bold text-holst-800">Simulation only.</span> No real money moves. Fast-forward the
        clock to trigger time-based events, inject a mock merchant payment to fire the CFaR interceptor, or flip the
        permission ladder. Everything below is faithful to the shipped engine.
      </p>
      <SimulationToolbar />
      <EventFeed />
    </div>
  );
}

function SummarySheet({ onSimulate }: { onSimulate: () => void }) {
  const allowance = useCtrlPayStore((s) => s.dynamicDailyAllowance());
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const events = useCtrlPayStore((s) => s.events);
  const units = toStudentUnits(allowance);

  const last = [...events].reverse().find((e) => e.type === 'DAILY_SUMMARY');
  const spentToday = Number((last?.payload as { spentToday?: number } | undefined)?.spentToday ?? 0);

  return (
    <div className="space-y-3">
      <div className="ct-hero-radial p-4">
        <p className="ct-kicker text-holst-200/90">12:00 PM daily summary</p>
        <SplitAmount value={spentToday} size={34} tone="light" className="mt-2" />
        <p className="mt-1 text-[10.5px] text-holst-200/80">spent so far today</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="ct-pill-glass">Safe today {formatRM(allowance)}</span>
          <span className="ct-pill-glass">
            ≈ {units.mixedRiceMeals} rice · {units.bubbleTea} tea
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Spent this month</p>
          <p className="ct-int mt-1 text-[18px] text-holst-950">{formatRM(spentThisMonth)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Student units</p>
          <p className="ct-int mt-1 text-[18px] text-holst-950">
            {units.mixedRiceMeals}×{DEMO_CONFIG.studentUnits.campusMixedRice.toFixed(0)}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="ct-action ct-action-primary w-full justify-center py-3 text-[12.5px]"
        onClick={onSimulate}
      >
        <CreditCard className="h-4 w-4" /> Simulate an incoming payment
      </button>
    </div>
  );
}

function AiDrawer({
  segment,
  onSegment,
  listening,
  copilot,
}: {
  segment: AiSegment;
  onSegment: (s: AiSegment) => void;
  listening: boolean;
  copilot?: React.ReactNode;
}) {
  const segs: Array<{ id: AiSegment; icon: React.ElementType; label: string }> = [
    { id: 'OCR', icon: Camera, label: 'OCR scan' },
    { id: 'VOICE', icon: Mic, label: 'Voice' },
    { id: 'COPILOT', icon: Sparkles, label: 'Copilot' },
  ];

  return (
    <div className="space-y-3">
      <div className="ct-seg w-full justify-between">
        {segs.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              data-on={segment === s.id}
              className="ct-seg-btn flex-1 justify-center"
              onClick={() => onSegment(s.id)}
            >
              <Icon className="h-3.5 w-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      {segment === 'OCR' && (
        <MultimodalBookkeeping key="ocr" defaultOpen defaultMode="RECEIPT" />
      )}
      {segment === 'VOICE' && (
        <MultimodalBookkeeping key="voice" defaultOpen defaultMode="VOICE" autoStartVoice={listening} />
      )}
      {segment === 'COPILOT' && (
        <div className="h-[52vh]">{copilot ?? <AgentChat withBookkeeping={false} />}</div>
      )}
    </div>
  );
}

function AgentTab({
  copilot,
  onOpenSheet,
}: {
  copilot?: React.ReactNode;
  onOpenSheet: (s: SheetId) => void;
}) {
  const [segment, setSegment] = React.useState<AiSegment>('COPILOT');
  const [listening, setListening] = React.useState(false);
  const masterAutonomy = useCtrlPayStore((s) => s.masterAutonomyEnabled);

  return (
    <div className="animate-fade-in -mx-1 pb-4">
      {/* Header */}
      <header className="flex items-center justify-between pt-1 mb-3">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#10B981]">
              Autonomous Agent Active
            </span>
          </div>
          <h2 className="text-[20px] font-black tracking-tight text-[#04222B]">Copilot AI</h2>
        </div>

        <button
          type="button"
          onClick={() => onOpenSheet('sandbox')}
          className="flex items-center gap-1.5 rounded-full bg-[#0B1E3F] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition-transform active:scale-95"
        >
          <Sparkles className="h-3 w-3 text-cyan-300" />
          <span>{masterAutonomy ? 'T3 Autonomy' : 'Advisory Mode'}</span>
        </button>
      </header>

      {/* Segment Selector: Copilot / Voice / OCR */}
      <div className="ct-seg w-full justify-between mb-3">
        <button
          type="button"
          data-on={segment === 'COPILOT'}
          className="ct-seg-btn flex-1 justify-center"
          onClick={() => setSegment('COPILOT')}
        >
          <Sparkles className="h-3.5 w-3.5" /> Copilot
        </button>
        <button
          type="button"
          data-on={segment === 'VOICE'}
          className="ct-seg-btn flex-1 justify-center"
          onClick={() => {
            setSegment('VOICE');
            setListening(true);
          }}
        >
          <Mic className="h-3.5 w-3.5" /> Voice
        </button>
        <button
          type="button"
          data-on={segment === 'OCR'}
          className="ct-seg-btn flex-1 justify-center"
          onClick={() => setSegment('OCR')}
        >
          <Camera className="h-3.5 w-3.5" /> OCR Scan
        </button>
      </div>

      {/* Content Area */}
      {segment === 'COPILOT' && (
        <div className="rounded-[28px] bg-white/90 p-3.5 shadow-sm border border-white/80 backdrop-blur-md min-h-[66vh] flex flex-col">
          {copilot ?? <AgentChat withBookkeeping={true} />}
        </div>
      )}

      {segment === 'VOICE' && (
        <div className="rounded-[28px] bg-white/90 p-4 shadow-sm border border-white/80 backdrop-blur-md">
          <MultimodalBookkeeping defaultOpen defaultMode="VOICE" autoStartVoice={listening} />
        </div>
      )}

      {segment === 'OCR' && (
        <div className="rounded-[28px] bg-white/90 p-4 shadow-sm border border-white/80 backdrop-blur-md">
          <MultimodalBookkeeping defaultOpen defaultMode="RECEIPT" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Shell
 * ------------------------------------------------------------------ */

export function MobileAppShell({ copilot, initialTab = 'home', className }: MobileAppShellProps) {
  const [tab, setTab] = React.useState<MobileTab>(initialTab);
  const [sheet, setSheet] = React.useState<SheetId>('none');
  const [segment, setSegment] = React.useState<AiSegment>('OCR');
  const [listening, setListening] = React.useState(false);
  const [downgradeId, setDowngradeId] = React.useState<string | null>(null);
  const [goalId, setGoalId] = React.useState<string | null>(null);
  const [isReceiptFlowOpen, setIsReceiptFlowOpen] = React.useState(false);
  const [budgetImpactCard, setBudgetImpactCard] = React.useState<{
    merchant: string;
    amount: number;
    category: string;
    categorySpent: number;
    categoryCap: number;
    percentUsed: number;
    isOverBudget: boolean;
    overAmount: number;
    dailyRunway: number;
    isOverWeekly: boolean;
  } | null>(null);
  const [expenseSuccessModal, setExpenseSuccessModal] = React.useState<{
    merchant: string;
    amount: number;
    category: string;
    dailyRunway: number;
    isOverBudget?: boolean;
    overAmount?: number;
  } | null>(null);
  const [activeCopilotProposal, setActiveCopilotProposal] = React.useState<{
    merchant: string;
    amount: number;
    category: string;
  } | null>(null);
  const [activeCopilotCfar, setActiveCopilotCfar] = React.useState(false);
  const [selectedTransaction, setSelectedTransaction] = React.useState<ActivityItem | null>(null);

  const goals = useGoals();
  const activeGoal = goals.find((g) => g.id === goalId) ?? null;

  const openSheet = React.useCallback((s: SheetId) => {
    setListening(false);
    setSheet(s);
  }, []);
  const closeSheet = React.useCallback(() => {
    setListening(false);
    setSheet('none');
  }, []);

  const openOcr = React.useCallback(() => {
    setSegment('OCR');
    setSheet('ai');
  }, []);
  const openVoice = React.useCallback(() => {
    setSegment('VOICE');
    setListening(true);
    setSheet('ai');
  }, []);
  const releaseVoice = React.useCallback(() => setListening(false), []);

  const aiOpen = sheet === 'ai';
  const listeningActive = aiOpen && segment === 'VOICE' && listening;

  return (
    <div
      className={cn(
        // Explicit iPhone-class viewport. On narrow devices it becomes the whole screen.
        'duo-phone relative flex h-[932px] max-h-[calc(100svh-64px)] w-[430px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-phone',
        'max-[500px]:h-[100dvh] max-[500px]:max-h-none max-[500px]:w-full max-[500px]:max-w-none max-[500px]:rounded-none',
        className,
      )}
    >
      <StatusBar onOpenSandbox={() => openSheet('sandbox')} />

      {/* Post-Expense Recording Success Bottom Sheet Modal (Matching User Screenshot: "记录好了会弹出这个") */}
      <AnimatePresence>
        {expenseSuccessModal && (
          <div
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setExpenseSuccessModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="w-full max-w-[430px] rounded-t-[36px] bg-white pt-3 px-6 pb-7 text-center space-y-4 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] border-t border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />

              {/* Circular Blue Checkmark Icon (Exact match to user screenshot) */}
              <div className="flex justify-center pt-2">
                <div className="h-20 w-20 rounded-full border-[2.5px] border-[#2563EB] flex items-center justify-center shadow-xs">
                  <Check className="h-10 w-10 text-[#2563EB] stroke-[2.5]" />
                </div>
              </div>

              {/* Bold Headline */}
              <h3 className="text-[19px] sm:text-[20px] font-black text-[#0F172A] leading-snug px-3">
                Your Expense was successfully recorded with RM {expenseSuccessModal.amount.toFixed(2)}
              </h3>

              {/* Subtitle / Details */}
              <div className="text-[13px] text-gray-500 font-medium px-4 leading-relaxed space-y-1">
                <p>
                  {expenseSuccessModal.merchant} · {expenseSuccessModal.category}
                </p>
                {expenseSuccessModal.isOverBudget ? (
                  <p className="text-amber-600 font-bold">
                    ⚠️ Exceeded {expenseSuccessModal.category} cap by RM {expenseSuccessModal.overAmount?.toFixed(2)}. Daily runway adjusted to RM {expenseSuccessModal.dailyRunway.toFixed(2)}/day
                  </p>
                ) : (
                  <p className="text-gray-500">
                    Your daily runway remains healthy at RM {expenseSuccessModal.dailyRunway.toFixed(2)}/day
                  </p>
                )}
              </div>

              {/* Bottom Soft Blue Button (Matching screenshot) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setExpenseSuccessModal(null)}
                  className="w-full py-3.5 rounded-2xl bg-[#E8F0FE] hover:bg-[#D2E3FC] text-[#1A73E8] font-black text-[14px] transition-all active:scale-98 shadow-2xs"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto no-scrollbar px-4 pb-[104px] pt-1">
          {tab === 'home' && (
            <HomeTab
              onOpenSheet={openSheet}
              onGoTab={setTab}
              onOpenTransaction={setSelectedTransaction}
              onOpenCfar={() => setActiveCopilotCfar(true)}
            />
          )}
          {tab === 'timeline' && (
            <ModernCalendarView onBack={() => setTab('home')} onOpenSheet={(s) => openSheet(s as SheetId)} />
          )}
          {tab === 'subscription' && (
            <SubscriptionTab
              onOpenSheet={openSheet}
              onVerifyStudent={() => setDowngradeId('spotify_my')}
            />
          )}
          {tab === 'agent' && (
            <CopilotTab
              onBack={() => {
                setTab('home');
                setActiveCopilotCfar(false);
              }}
              onOpenSheet={(s) => openSheet(s as SheetId)}
              onOpenWhatIf={() => setActiveCopilotCfar(true)}
              initialCfarActive={activeCopilotCfar}
              onClearCfar={() => setActiveCopilotCfar(false)}
              initialProposal={activeCopilotProposal}
              onClearProposal={() => setActiveCopilotProposal(null)}
            />
          )}
          {tab === 'radar' && (
            <RadarTab
              onVerifyStudent={() => setDowngradeId('spotify_my')}
              onOpenSheet={openSheet}
            />
          )}
          {tab === 'vault' && <PiggyDefenseVaultTab onOpenAudit={() => openSheet('audit')} />}
        </div>
      </div>

      {/* Floating white capsule dock: home timeline (+) subscription vault */}
      <nav className="ct-dock" aria-label="Primary">
        <button
          type="button"
          className="ct-dock-btn"
          aria-current={tab === 'home' ? 'page' : undefined}
          aria-label="Home"
          onClick={() => setTab('home')}
        >
          <HomeIcon className="h-5 w-5" />
          <span className="ct-dock-dot" />
        </button>
        <button
          type="button"
          className="ct-dock-btn"
          aria-current={tab === 'timeline' ? 'page' : undefined}
          aria-label="Timeline"
          onClick={() => setTab('timeline')}
        >
          <CalendarDays className="h-5 w-5" />
          <span className="ct-dock-dot" />
        </button>
        <SlidingNavigationPlusOrb
          onTap={() => openSheet('expense')}
          onSelectOcr={() => setIsReceiptFlowOpen(true)}
          onSelectCopilot={() => setTab('agent')}
        />
        <button
          type="button"
          className="ct-dock-btn"
          aria-current={tab === 'subscription' ? 'page' : undefined}
          aria-label="Subscription"
          onClick={() => setTab('subscription')}
        >
          <CreditCard className="h-5 w-5" />
          <span className="ct-dock-dot" />
        </button>
        <button
          type="button"
          className="ct-dock-btn"
          aria-current={tab === 'vault' ? 'page' : undefined}
          aria-label="Vault"
          onClick={() => setTab('vault')}
        >
          <PiggyBank className="h-5 w-5" />
          <span className="ct-dock-dot" />
        </button>
      </nav>

      <PhoneSheet
        open={aiOpen}
        onClose={closeSheet}
        title="CtrlPay multimodal"
        subtitle={segment === 'VOICE' && listening ? 'Listening… release or stop to capture' : 'OCR · voice · copilot'}
      >
        <AiDrawer
          segment={segment}
          onSegment={(s) => {
            setSegment(s);
            if (s !== 'VOICE') setListening(false);
          }}
          listening={listeningActive}
          copilot={copilot}
        />
      </PhoneSheet>

      <PhoneSheet open={sheet === 'expense'} onClose={closeSheet} title="Add an expense" subtitle="Confirm before book">
        <MultimodalBookkeeping
          defaultOpen
          onOpenReceiptFlow={() => {
            closeSheet();
            setIsReceiptFlowOpen(true);
          }}
          onBooked={(data) => {
            closeSheet();
            const s = useCtrlPayStore.getState();
            const categoryBudgets: Record<string, number> = {
              'Dining & Food': 400,
              'Food & Dining': 400,
              'Bubble Tea Dining': 400,
              'Living & Home': 300,
              'Transport': 150,
              'Shopping': 150,
              'Entertainment': 100,
              'Bills & Utilities': 100,
            };
            const catCap = categoryBudgets[data.category] || 300;
            const catSpent = s.categoryExpenses[data.category] || data.amount;
            const isOverCategory = catSpent > catCap;
            setTimeout(() => {
              setExpenseSuccessModal({
                merchant: data.merchant,
                amount: data.amount,
                category: data.category,
                dailyRunway: s.dynamicDailyAllowance(),
                isOverBudget: isOverCategory,
                overAmount: Math.max(0, catSpent - catCap),
              });
            }, 300);
          }}
        />
      </PhoneSheet>

      <PhoneSheet open={sheet === 'payments'} onClose={closeSheet} title="Simulate a payment" subtitle="Judge controls">
        <PaymentsSheet onClose={closeSheet} />
      </PhoneSheet>

      <AnimatePresence>
        {sheet === 'profile' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-0 z-50 flex flex-col bg-[#F3F4F1] overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto no-scrollbar">
              <ModernSettingsView
                onClose={closeSheet}
                onOpenSandbox={() => openSheet('sandbox')}
                onOpenAudit={() => openSheet('audit')}
              />
            </div>
          </motion.div>
        )}
        {sheet === 'budgetDetails' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-0 z-50 flex flex-col bg-[#F8FAF8] overflow-hidden"
          >
            <BudgetDetailsView
              onClose={closeSheet}
              onOpenTimeline={() => {
                closeSheet();
                setTab('timeline');
              }}
              onOpenSimulator={() => openSheet('payments')}
            />
          </motion.div>
        )}

        {sheet === 'allTransactions' && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-0 z-50 flex flex-col bg-[#F8FAF8] overflow-hidden"
          >
            <AllTransactionsSlideView
              onClose={closeSheet}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <PhoneSheet
        open={sheet === 'notifications'}
        onClose={closeSheet}
        title="Notifications"
        subtitle="Proactive Alerts & Signals"
      >
        <NotificationsSheet
          onClose={closeSheet}
          aiNotification={budgetImpactCard ? { merchant: budgetImpactCard.merchant, amount: budgetImpactCard.amount, category: budgetImpactCard.category } : { merchant: 'Store Purchase', amount: 24.64, category: 'Dining & Food' }}
          onSelectProposal={(prop) => {
            closeSheet();
            setActiveCopilotProposal(prop);
            setTab('agent');
          }}
        />
      </PhoneSheet>

      <PhoneSheet open={sheet === 'summary'} onClose={closeSheet} title="Daily summary" subtitle="12:00 PM snapshot">
        <SummarySheet onSimulate={() => openSheet('payments')} />
      </PhoneSheet>

      <PhoneSheet
        open={sheet === 'sandbox'}
        onClose={closeSheet}
        title="Judge sandbox"
        subtitle="Clock · payment injection · event feed"
      >
        <JudgeSandboxSheet />
      </PhoneSheet>

      <PhoneSheet open={sheet === 'commitments'} onClose={closeSheet} title="Commitment devices" subtitle="Quarantines & sweeps">
        <QuarantineCards />
      </PhoneSheet>

      <PhoneSheet
        open={sheet === 'audit'}
        onClose={closeSheet}
        title="Audit hash chain"
        subtitle="Append-only · SHA-256"
      >
        <AuditDrawer />
      </PhoneSheet>

      <PhoneSheet
        open={activeGoal !== null}
        onClose={() => setGoalId(null)}
        title={activeGoal?.title ?? 'Milestone'}
        subtitle="Zoom-in · what-if projection"
      >
        {activeGoal && <GoalZoom key={activeGoal.id} goal={activeGoal} />}
      </PhoneSheet>

      <StudentDowngradeDrawer
        subscriptionId={downgradeId ?? 'spotify_my'}
        open={downgradeId !== null}
        onClose={() => setDowngradeId(null)}
      />

      <PaymentInterceptorModal />

      {/* Real OCR Receipt Flow Modal */}
      <ReceiptAiFlowModal
        isOpen={isReceiptFlowOpen}
        onClose={() => setIsReceiptFlowOpen(false)}
        onSaveSuccess={(data) => {
          setIsReceiptFlowOpen(false);
          const s = useCtrlPayStore.getState();
          const categoryBudgets: Record<string, number> = {
            'Dining & Food': 400,
            'Food & Dining': 400,
            'Bubble Tea Dining': 400,
            'Living & Home': 300,
            'Transport': 150,
            'Shopping': 150,
            'Entertainment': 100,
            'Bills & Utilities': 100,
          };
          const catCap = categoryBudgets[data.category] || 300;
          const catSpent = s.categoryExpenses[data.category] || data.amount;
          const isOverCategory = catSpent > catCap;
          const isNearLimit = catSpent / catCap >= 0.85;
          const isOverWeekly = s.spentThisWeek > s.userLimits.weeklyPayLimit;
          const hasImpact = isOverCategory || isNearLimit || isOverWeekly;

          // User requested: "记录好了会弹出这个" (Bottom sheet success confirmation modal)
          setTimeout(() => {
            setExpenseSuccessModal({
              merchant: data.merchant,
              amount: data.amount,
              category: data.category,
              dailyRunway: s.dynamicDailyAllowance(),
              isOverBudget: isOverCategory,
              overAmount: Math.max(0, catSpent - catCap),
            });
          }, 300);
        }}
        onComplete={() => {
          setIsReceiptFlowOpen(false);
        }}
      />

      {/* Global Transaction Detail Drawer strictly inside the phone frame (like View More) */}
      <AnimatePresence>
        {selectedTransaction && (
          <div
            className="absolute inset-0 z-50 flex items-end justify-center p-0 bg-black/50 backdrop-blur-xs animate-fade-in"
            onClick={() => setSelectedTransaction(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              className="w-full max-w-[390px] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-[0_20px_60px_rgba(4,34,43,0.3)] border border-white/90 animate-rise-in max-h-[85vh] overflow-y-auto no-scrollbar font-sans"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div
                    className="grid h-8 w-8 place-items-center rounded-full shadow-sm shrink-0"
                    style={{ backgroundColor: selectedTransaction.iconBg }}
                  >
                    <BrandIcon type={selectedTransaction.iconType} />
                  </div>
                  <span className="text-[13px] font-black text-[#04222B]">Transaction Detail</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTransaction(null)}
                  className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-[#04222B] hover:bg-slate-200 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Receipt Hero */}
              <div className="text-center py-4 bg-slate-50/70 rounded-2xl my-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  TOTAL AMOUNT PAID
                </span>
                <div className="text-[28px] font-black tracking-tight text-[#04222B] mt-0.5">
                  {selectedTransaction.amount}
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#E2F4F0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#10606F] mt-1">
                  <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                  Successful · {selectedTransaction.timestamp}
                </span>
              </div>

              {/* Meta Table */}
              <div className="space-y-2.5 text-[12px]">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Merchant</span>
                  <span className="font-bold text-[#04222B]">{selectedTransaction.title}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Category</span>
                  <span className="font-bold text-[#04222B] flex items-center gap-1">
                    <Tag className="h-3 w-3 text-[#1D8B94]" />
                    {selectedTransaction.category}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Payment Method</span>
                  <span className="font-bold text-[#04222B]">{selectedTransaction.paymentMethod}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-[#64748B]">Reference ID</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedTransaction.referenceId);
                      alert('Reference ID copied to clipboard!');
                    }}
                    className="font-mono font-bold text-[#10606F] flex items-center gap-1 hover:underline"
                  >
                    <span>{selectedTransaction.referenceId}</span>
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* AI Auto-Categorization Insight Box */}
              <div className="mt-3.5 rounded-2xl bg-[#E2F4F0]/60 p-3 border border-[#98D8D0]/40">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-[#10B981]" />
                  <span className="text-[11px] font-black text-[#04222B]">
                    AI Auto-Extractor Note
                  </span>
                  <span className="text-[9.5px] font-bold text-[#10606F] ml-auto">
                    {selectedTransaction.aiConfidence ?? 98}% Confidence
                  </span>
                </div>
                <p className="text-[11px] text-[#0A3D4A] leading-relaxed">
                  {selectedTransaction.aiCategorizationNote ??
                    'Parsed automatically from background system notifications. Categorized according to the Campus CFaR student framework.'}
                </p>
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="mt-4 w-full py-3 rounded-xl bg-[#04222B] text-white text-[12.5px] font-bold hover:bg-[#0A3D4A] active:scale-[0.98] transition-all"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
