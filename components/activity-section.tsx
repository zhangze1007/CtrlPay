'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Copy,
  Filter,
  Receipt,
  Search,
  Share2,
  Sparkles,
  Smartphone,
  Tag,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';
import {
  type ActivityItem,
  INITIAL_ACTIVITIES,
  EXTENDED_ACTIVITIES,
} from '@/lib/activities';

export type { ActivityItem };
export { INITIAL_ACTIVITIES, EXTENDED_ACTIVITIES };



export function BrandIcon({ type }: { type: ActivityItem['iconType'] }) {
  switch (type) {
    case 'apple':
      return (
        <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.16.65-2.84 1.44-.59.69-1.11 1.76-.97 2.81 1.07.08 2.2-.62 2.8-1.38z" />
        </svg>
      );
    case 'mcdonalds':
      return (
        <svg viewBox="0 0 24 24" className="h-5.5 w-5.5 fill-[#FFC72C]">
          <path d="M2.5 19.5h2.2c.4-5.3 2.1-9.5 4.3-9.5 1.8 0 3.3 3.1 3.9 7.4.6-4.3 2.1-7.4 3.9-7.4 2.2 0 3.9 4.2 4.3 9.5h2.2C22.8 12.9 20.3 8 16.8 8c-2.4 0-4.4 2.3-5.3 5.8C10.6 10.3 8.6 8 6.2 8 2.7 8 .2 12.9 2.5 19.5z" />
        </svg>
      );
    case 'spotify':
      return (
        <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.792-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.496 9.72 1.115.295.18.388.563.208.855zm1.225-2.724c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.134-9.97-1.168-.413.125-.85-.11-.975-.522-.125-.413.11-.85.522-.975 3.633-1.102 8.147-.568 11.244 1.332.367.226.482.71.256 1.077zm.105-2.836C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.016-.13-1.166-.624-.15-.494.13-1.016.624-1.166 3.532-1.072 9.404-.87 13.115 1.333.444.263.59.84.327 1.284-.264.444-.84.59-1.284.327z" />
        </svg>
      );
    case 'grab':
      return (
        <span className="font-sans font-black text-[12.5px] text-white tracking-tight leading-none select-none">
          Grab
        </span>
      );
    case 'instagram':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case 'tng':
      return (
        <span className="font-sans font-black text-[11px] text-white tracking-tighter leading-none select-none">
          TnG
        </span>
      );
    case 'maybank':
      return (
        <span className="font-sans font-black text-[11px] text-[#111827] tracking-tighter leading-none select-none">
          MAE
        </span>
      );
    case 'publicbank':
      return (
        <span className="font-sans font-black text-[11px] text-white tracking-tight leading-none select-none">
          PB
        </span>
      );
    default:
      return (
        <span className="font-sans font-black text-[11px] text-white tracking-tight leading-none select-none">
          $
        </span>
      );
  }
}

export interface ActivitySectionProps {
  onOpenAnalytics?: () => void;
  onOpenItem?: (item: ActivityItem) => void;
  onViewMore?: () => void;
  className?: string;
  title?: string;
}

export function ActivitySection({
  onOpenAnalytics,
  onOpenItem,
  onViewMore,
  className,
  title = 'Latest Transaction',
}: ActivitySectionProps) {
  const activities = useCtrlPayStore((s) => s.activities);
  const [selectedItem, setSelectedItem] = React.useState<ActivityItem | null>(null);
  const [isViewMoreOpen, setIsViewMoreOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = React.useState<string>('all');

  const [incomingNotification, setIncomingNotification] = React.useState<{
    bank: string;
    text: string;
    category: string;
    amount: number;
    merchant: string;
    iconType: ActivityItem['iconType'];
    iconBg: string;
  } | null>(null);
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [copiedTxn, setCopiedTxn] = React.useState(false);

  const bookExpense = useCtrlPayStore((s) => s.bookExpense);

  const SIMULATION_PRESETS = [
    {
      bank: "Touch 'n Go eWallet",
      merchant: 'Zus Coffee Mid Valley',
      subtitle: 'Iced Spanish Latte x2',
      amount: 15.5,
      category: 'Food & Drinks',
      categoryType: 'food' as const,
      iconType: 'tng' as const,
      iconBg: '#0055B8',
      text: "Touch 'n Go eWallet: Payment of RM 15.50 to Zus Coffee successful via DuitNow QR.",
      note: 'Auto-extracted from TNG push notification. AI tagged to Food & Drinks.',
    },
    {
      bank: 'Maybank MAE',
      merchant: 'Mike Wong (DuitNow)',
      subtitle: 'Dinner Steamboat Split',
      amount: 45.0,
      category: 'Food & Dining',
      categoryType: 'food' as const,
      iconType: 'maybank' as const,
      iconBg: '#FFCE00',
      text: 'Maybank MAE: DuitNow Transfer RM 45.00 to Mike Wong. Ref: Dinner steamboat split.',
      note: 'Auto-extracted from Maybank MAE push notification. Peer split recorded.',
    },
    {
      bank: 'Public Bank Berhad',
      merchant: 'Popular Bookstore SS15',
      subtitle: 'Campus Stationery & Notebooks',
      amount: 28.0,
      category: 'Education & Supplies',
      categoryType: 'shopping' as const,
      iconType: 'publicbank' as const,
      iconBg: '#CC0000',
      text: 'PB Card Alert: RM 28.00 charged at Popular Bookstore SS15 on card ending *3319.',
      note: 'Auto-extracted from Public Bank SMS push. Tagged to Education & Supplies.',
    },
  ];

  const triggerSimulateNotification = (presetIndex: number) => {
    if (isSimulating) return;
    setIsSimulating(true);
    const p = SIMULATION_PRESETS[presetIndex];

    setIncomingNotification({
      bank: p.bank,
      text: p.text,
      category: p.category,
      amount: p.amount,
      merchant: p.merchant,
      iconType: p.iconType,
      iconBg: p.iconBg,
    });

    setTimeout(() => {
      bookExpense({
        merchant: p.merchant,
        amount: p.amount,
        category: p.category as any,
        isNeed: true,
        source: 'NOTIFICATION',
      });

      setIsSimulating(false);
      setTimeout(() => {
        setIncomingNotification(null);
      }, 5000);
    }, 1800);
  };

  const copyRefId = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopiedTxn(true);
    setTimeout(() => setCopiedTxn(false), 2000);
  };

  // Filter extended transactions for "View more"
  const filteredExtended = EXTENDED_ACTIVITIES.filter((item) => {
    const matchesCategory =
      activeCategoryFilter === 'all' || item.categoryType === activeCategoryFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className={cn('relative font-sans', className)}>
      {/* Live Incoming Bank Notification Banner */}
      {incomingNotification && (
        <div className="mb-3 rounded-[24px] bg-[#04222B] text-white p-3.5 shadow-[0_12px_36px_rgba(4,34,43,0.35)] border border-[#10606F]/50 animate-bounce-gentle">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[#10606F] text-white shrink-0 mt-0.5 shadow-sm">
              <Bell className="h-4 w-4 animate-ring" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#38BDF8]">
                  {incomingNotification.bank} · Push Detected
                </span>
                <span className="text-[9px] text-[#94A3B8]">Auto-Extracting</span>
              </div>
              <p className="text-[12px] font-bold text-white leading-tight mt-0.5">
                {incomingNotification.text}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Sparkles className="h-3 w-3 text-[#10B981]" />
                <span className="text-[10.5px] font-bold text-[#10B981]">
                  AI categorized as {incomingNotification.category}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header: Title ("Latest Transaction") + View more button (Live Extractor removed as requested) */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h3 className="text-[17px] font-black tracking-tight text-[#04222B]">{title}</h3>

        <button
          type="button"
          onClick={() => {
            if (onViewMore) onViewMore();
            else setIsViewMoreOpen(true);
          }}
          className="inline-flex items-center gap-1 text-[12px] font-bold text-[#1D8B94] hover:text-[#10606F] transition-colors group"
        >
          <span>View more</span>
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Smart Notification Interceptor Simulation Bar */}
      <div className="mb-3 rounded-[20px] bg-gradient-to-r from-[#E2F4F0]/80 via-white/80 to-[#E0F2FE]/80 p-2.5 border border-white/90 shadow-[0_2px_12px_rgba(4,34,43,0.03)] backdrop-blur-md">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-[#10606F] text-white shrink-0">
              <Smartphone className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-black text-[#04222B] leading-tight truncate">
                Simulate Bank Push
              </p>
              <p className="text-[9.5px] text-[#64748B] leading-none mt-0.5 truncate">
                Touch &apos;n Go / Maybank / PB transfer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => triggerSimulateNotification(0)}
              className="rounded-full bg-[#0055B8] text-white px-2 py-1 text-[10px] font-extrabold shadow-sm active:scale-95 transition-all hover:bg-[#004494]"
              title="Touch 'n Go Transfer"
            >
              +TnG
            </button>
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => triggerSimulateNotification(1)}
              className="rounded-full bg-[#FFCE00] text-[#111827] px-2 py-1 text-[10px] font-extrabold shadow-sm active:scale-95 transition-all hover:bg-[#E5B800]"
              title="Maybank DuitNow Transfer"
            >
              +MAE
            </button>
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => triggerSimulateNotification(2)}
              className="rounded-full bg-[#CC0000] text-white px-2 py-1 text-[10px] font-extrabold shadow-sm active:scale-95 transition-all hover:bg-[#A30000]"
              title="Public Bank Transfer"
            >
              +PB
            </button>
          </div>
        </div>
      </div>

      {/* Activity List: Clean white cards */}
      <div className="space-y-2">
        {activities.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (onOpenItem) {
                onOpenItem(item);
              } else {
                setSelectedItem(item);
              }
            }}
            className="flex items-center justify-between rounded-[22px] bg-white/95 hover:bg-white border border-white/90 p-3.5 shadow-[0_2px_14px_rgba(4,34,43,0.03)] hover:shadow-[0_6px_20px_rgba(4,34,43,0.07)] backdrop-blur-md transition-all active:scale-[0.99] cursor-pointer group"
          >
            {/* Left: Brand Icon + Title & Subtitle */}
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="grid h-11 w-11 place-items-center rounded-full shadow-sm shrink-0 transition-transform group-hover:scale-105"
                style={{ backgroundColor: item.iconBg }}
              >
                <BrandIcon type={item.iconType} />
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13.5px] font-bold text-[#04222B] leading-tight truncate">
                    {item.title}
                  </p>
                  {item.isExtractedFromNotification && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-[#E2F4F0] px-1.5 py-0.2 text-[8.5px] font-extrabold text-[#10606F]">
                      <Sparkles className="h-2 w-2" /> AI
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#64748B] leading-tight mt-0.5 truncate">
                  {item.subtitle}
                </p>
              </div>
            </div>

            {/* Right: Amount with flanking dashes: - RM 30.00 - */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span className="font-sans text-[13px] font-extrabold text-[#04222B] tracking-tight tabular-nums">
                {item.amount}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Slide-in View More Modal: Rich list of transactions with exact same design */}
      <AnimatePresence>
        {isViewMoreOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute inset-0 z-50 flex flex-col bg-[#F8FAF8] overflow-hidden"
          >
            {/* Top Navigation */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-3 pb-3 bg-[#F8FAF8]/95 backdrop-blur-md border-b border-gray-100">
              <button
                type="button"
                onClick={() => setIsViewMoreOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#1E293B] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-gray-50 active:scale-95 transition-all"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
              </button>

              <div className="text-center">
                <h1 className="text-[17px] font-bold text-[#0F172A] tracking-tight">
                  All Transactions
                </h1>
                <p className="text-[11px] text-[#64748B]">
                  {filteredExtended.length} records found
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsViewMoreOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#1E293B] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-gray-50 active:scale-95 transition-all"
                aria-label="Close"
              >
                <X className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>

            {/* Search Input & Category Filter Chips */}
            <div className="px-4 pt-3 pb-2 space-y-2.5 bg-[#F8FAF8]">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
                <input
                  type="text"
                  placeholder="Search merchant, amount or note..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full bg-white pl-10 pr-4 py-2 text-[12.5px] text-[#0F172A] border border-gray-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#10606F]/30"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'food', label: 'Food & Dining' },
                  { id: 'subscription', label: 'Subscriptions' },
                  { id: 'shopping', label: 'Shopping' },
                  { id: 'bills', label: 'Bills & Utilities' },
                  { id: 'transfer', label: 'Transfers' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategoryFilter(c.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shadow-sm',
                      activeCategoryFilter === c.id
                        ? 'bg-[#04222B] text-white'
                        : 'bg-white text-[#64748B] hover:text-[#0F172A] border border-gray-100'
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable List of All Transactions */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 space-y-2">
              {filteredExtended.length === 0 ? (
                <div className="text-center py-12 text-[#94A3B8] text-[13px]">
                  No matching transactions found.
                </div>
              ) : (
                filteredExtended.map((item) => (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (onOpenItem) onOpenItem(item);
                      else setSelectedItem(item);
                    }}
                    className="flex items-center justify-between rounded-[22px] bg-white hover:bg-gray-50/80 border border-white p-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all active:scale-[0.99] cursor-pointer group"
                  >
                    {/* Left: Brand Icon + Title & Subtitle */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="grid h-11 w-11 place-items-center rounded-full shadow-sm shrink-0 transition-transform group-hover:scale-105"
                        style={{ backgroundColor: item.iconBg }}
                      >
                        <BrandIcon type={item.iconType} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13.5px] font-bold text-[#04222B] leading-tight truncate">
                            {item.title}
                          </p>
                          {item.isExtractedFromNotification && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full bg-[#E2F4F0] px-1.5 py-0.2 text-[8.5px] font-extrabold text-[#10606F]">
                              <Sparkles className="h-2 w-2" /> AI
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#64748B] leading-tight mt-0.5 truncate">
                          {item.subtitle} · {item.timestamp}
                        </p>
                      </div>
                    </div>

                    {/* Right: Amount */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <span
                        className={cn(
                          'font-sans text-[13px] font-extrabold tracking-tight tabular-nums',
                          item.amount.startsWith('+') ? 'text-[#10B981]' : 'text-[#04222B]'
                        )}
                      >
                        {item.amount}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity Detail Modal / Receipt (Fallback when no parent handler) */}
      {!onOpenItem && selectedItem && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="w-full max-w-[390px] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-[0_20px_60px_rgba(4,34,43,0.3)] border border-white/90 animate-rise-in max-h-[85vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className="grid h-8 w-8 place-items-center rounded-full shadow-sm shrink-0"
                  style={{ backgroundColor: selectedItem.iconBg }}
                >
                  <BrandIcon type={selectedItem.iconType} />
                </div>
                <span className="text-[13px] font-black text-[#04222B]">Transaction Detail</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-[#04222B] hover:bg-slate-200 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt Amount Hero */}
            <div className="text-center py-4 bg-slate-50/70 rounded-2xl my-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                TOTAL AMOUNT PAID
              </span>
              <div className="text-[28px] font-black tracking-tight text-[#04222B] mt-0.5">
                {selectedItem.amount}
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E2F4F0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#10606F] mt-1">
                <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                Successful · {selectedItem.timestamp}
              </span>
            </div>

            {/* Meta Table */}
            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Merchant</span>
                <span className="font-bold text-[#04222B]">{selectedItem.title}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Category</span>
                <span className="font-bold text-[#04222B] flex items-center gap-1">
                  <Tag className="h-3 w-3 text-[#1D8B94]" />
                  {selectedItem.category}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Payment Method</span>
                <span className="font-bold text-[#04222B]">{selectedItem.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Reference ID</span>
                <button
                  type="button"
                  onClick={() => copyRefId(selectedItem.referenceId)}
                  className="font-mono font-bold text-[#10606F] flex items-center gap-1 hover:underline"
                >
                  <span>{selectedItem.referenceId}</span>
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {copiedTxn && (
                <p className="text-[10px] text-right text-[#10B981] font-bold">Copied to clipboard!</p>
              )}
            </div>

            {/* AI Auto-Categorization Insight Box */}
            <div className="mt-3.5 rounded-2xl bg-[#E2F4F0]/60 p-3 border border-[#98D8D0]/40">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-[#10B981]" />
                <span className="text-[11px] font-black text-[#04222B]">
                  AI Auto-Extractor Note
                </span>
                <span className="text-[9.5px] font-bold text-[#10606F] ml-auto">
                  {selectedItem.aiConfidence ?? 98}% Confidence
                </span>
              </div>
              <p className="text-[11px] text-[#0A3D4A] leading-relaxed">
                {selectedItem.aiCategorizationNote ??
                  'Parsed automatically from background system notifications. Categorized according to the Campus CFaR student framework.'}
              </p>
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="mt-4 w-full py-2.5 rounded-xl bg-[#04222B] text-white text-[12px] font-bold hover:bg-[#0A3D4A] active:scale-[0.98] transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
