'use client';

import * as React from 'react';
import {
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Copy,
  Receipt,
  Share2,
  Sparkles,
  Smartphone,
  Tag,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';

export interface ActivityItem {
  id: string;
  title: string;
  subtitle: string;
  amount: string; // Formatted with flanking dashes e.g. "- $30.00 -"
  rawAmount: number;
  category: string;
  categoryType: 'food' | 'shopping' | 'subscription' | 'transfer' | 'entertainment' | 'bills';
  iconBg: string;
  iconType: 'apple' | 'mcdonalds' | 'spotify' | 'grab' | 'instagram' | 'tng' | 'maybank' | 'publicbank' | 'custom';
  timestamp: string;
  paymentMethod: string;
  referenceId: string;
  isExtractedFromNotification?: boolean;
  rawNotificationText?: string;
  aiCategorizationNote?: string;
  aiConfidence?: number;
}

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Apple service subscription',
    subtitle: 'App Store, Tinder, and 2+',
    amount: '- $30.00 -',
    rawAmount: 30.0,
    category: 'Subscription',
    categoryType: 'subscription',
    iconBg: '#1C1C1E',
    iconType: 'apple',
    timestamp: 'Today, 2:45 PM',
    paymentMethod: 'Apple Pay · Mastercard *4829',
    referenceId: 'APL-99482-TXN',
    aiCategorizationNote: 'Recurring monthly digital subscription detected. Tagged to Fixed Commitments.',
    aiConfidence: 99,
  },
  {
    id: 'act-2',
    title: 'Have a lunch with Mike',
    subtitle: 'Bigmac, Chicken Wings',
    amount: '- $30.00 -',
    rawAmount: 30.0,
    category: 'Food & Dining',
    categoryType: 'food',
    iconBg: '#FFFBEB',
    iconType: 'mcdonalds',
    timestamp: 'Today, 12:30 PM',
    paymentMethod: "Touch 'n Go eWallet (DuitNow QR)",
    referenceId: 'TNG-88319-KOP',
    isExtractedFromNotification: true,
    rawNotificationText: "Touch 'n Go eWallet: Payment of RM 30.00 to McDonald's SS15 successful via DuitNow QR.",
    aiCategorizationNote: "Extracted from Touch 'n Go push notification. Auto-categorized as Food & Dining based on merchant name. Within daily survival floor.",
    aiConfidence: 98,
  },
  {
    id: 'act-3',
    title: 'Spotify Family Plan',
    subtitle: 'Spotify Monthly Subscription',
    amount: '- $12.00 -',
    rawAmount: 12.0,
    category: 'Streaming',
    categoryType: 'subscription',
    iconBg: '#0F172A',
    iconType: 'spotify',
    timestamp: 'Yesterday, 8:00 AM',
    paymentMethod: 'Maybank MAE · Visa *1042',
    referenceId: 'MBB-44120-SPT',
    aiCategorizationNote: 'Zombie Radar active: Flagged as shared family plan eligible for student discount.',
    aiConfidence: 96,
  },
  {
    id: 'act-4',
    title: 'Nasi Bebek Guling',
    subtitle: 'Bebek Guling Surabaya',
    amount: '- $5.00 -',
    rawAmount: 5.0,
    category: 'Local Eats',
    categoryType: 'food',
    iconBg: '#ECFDF5',
    iconType: 'grab',
    timestamp: 'Yesterday, 7:15 PM',
    paymentMethod: 'GrabPay Balance',
    referenceId: 'GP-77291-BEB',
    isExtractedFromNotification: true,
    rawNotificationText: 'GrabPay: You paid RM 5.00 to Warung Bebek Guling. Order #8824.',
    aiCategorizationNote: 'Extracted from GrabPay notification. Tagged to Dining & Food.',
    aiConfidence: 97,
  },
  {
    id: 'act-5',
    title: 'Instagram Ads',
    subtitle: 'Sponsored Boost Campaign',
    amount: '- $24.00 -',
    rawAmount: 24.0,
    category: 'Marketing',
    categoryType: 'bills',
    iconBg: '#FDF2F8',
    iconType: 'instagram',
    timestamp: '16 Oct, 11:20 AM',
    paymentMethod: 'Public Bank Visa *3319',
    referenceId: 'PB-30219-META',
    aiCategorizationNote: 'Classified under Business/Marketing expense.',
    aiConfidence: 94,
  },
];

function BrandIcon({ type }: { type: ActivityItem['iconType'] }) {
  switch (type) {
    case 'apple':
      return (
        <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.16.65-2.84 1.44-.59.69-1.11 1.76-.97 2.81 1.07.08 2.2-.62 2.8-1.38z" />
        </svg>
      );
    case 'mcdonalds':
      return (
        <span className="font-sans font-black text-[18px] text-[#F59E0B] leading-none select-none">
          M
        </span>
      );
    case 'spotify':
      return (
        <svg className="h-5 w-5 fill-[#1DB954]" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.747 3.808-.87 7.076-.506 9.722 1.116.294.18.386.563.207.856zm1.224-2.72c-.226.367-.706.482-1.072.257-2.687-1.652-6.785-2.131-9.965-1.166-.413.127-.848-.106-.973-.517-.125-.413.108-.848.52-.973 3.632-1.102 8.147-.568 11.233 1.328.366.226.481.707.257 1.071zm.104-2.828c-3.223-1.914-8.54-2.09-11.618-1.156-.496.149-1.015-.129-1.166-.624-.149-.495.13-1.015.625-1.165 3.532-1.072 9.404-.866 13.115 1.337.445.264.59.838.327 1.282-.264.443-.838.59-1.283.326z" />
        </svg>
      );
    case 'grab':
      return (
        <span className="font-sans font-black text-[12px] text-[#059669] tracking-tighter leading-none select-none">
          Grab
        </span>
      );
    case 'instagram':
      return (
        <div className="h-5 w-5 rounded-md flex items-center justify-center bg-gradient-to-tr from-[#F59E0B] via-[#EC4899] to-[#8B5CF6] p-[2px]">
          <div className="h-full w-full rounded-[4px] border-[1.5px] border-white flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full border-[1.2px] border-white" />
          </div>
        </div>
      );
    case 'tng':
      return (
        <div className="grid h-full w-full place-items-center rounded-full bg-[#0055B8] text-white font-black text-[10px] tracking-tighter">
          TnG
        </div>
      );
    case 'maybank':
      return (
        <div className="grid h-full w-full place-items-center rounded-full bg-[#FFCE00] text-[#111827] font-black text-[11px] tracking-tighter">
          MAE
        </div>
      );
    case 'publicbank':
      return (
        <div className="grid h-full w-full place-items-center rounded-full bg-[#CC0000] text-white font-black text-[10px] tracking-tighter">
          PB
        </div>
      );
    default:
      return <div className="h-2.5 w-2.5 rounded-full bg-[#04222B]" />;
  }
}

export interface ActivitySectionProps {
  onOpenAnalytics?: () => void;
  onOpenItem?: (item: ActivityItem) => void;
  className?: string;
}

export function ActivitySection({ onOpenAnalytics, onOpenItem, className }: ActivitySectionProps) {
  const [activities, setActivities] = React.useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [selectedItem, setSelectedItem] = React.useState<ActivityItem | null>(null);
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

  // Bank & E-Wallet simulation scenarios based on user audio prompt
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
      note: 'DuitNow transfer intercepted. AI parsed reference text "Dinner" -> Food & Dining.',
    },
    {
      bank: 'Public Bank (PB engage)',
      merchant: 'Uniqlo Mid Valley',
      subtitle: 'AIRism Oversized Tee',
      amount: 79.9,
      category: 'Shopping',
      categoryType: 'shopping' as const,
      iconType: 'publicbank' as const,
      iconBg: '#CC0000',
      text: 'PB engage: RM 79.90 debited from Account *4512 for UNIQLO MID VALLEY.',
      note: 'Public Bank debit alert intercepted. AI categorized under Shopping & Apparel.',
    },
    {
      bank: "Touch 'n Go eWallet",
      merchant: 'Tealive Nu Sentral',
      subtitle: 'Roasted Milk Tea w/ Pearls',
      amount: 9.9,
      category: 'Food & Drinks',
      categoryType: 'food' as const,
      iconType: 'tng' as const,
      iconBg: '#0055B8',
      text: "Touch 'n Go eWallet: Payment of RM 9.90 to Tealive Nu Sentral via DuitNow QR.",
      note: 'Auto-extracted. Within daily coffee & treats quota.',
    },
  ];

  function triggerSimulateNotification(presetIndex: number) {
    const preset = SIMULATION_PRESETS[presetIndex % SIMULATION_PRESETS.length];
    setIsSimulating(true);
    setIncomingNotification(preset);

    // After 1.6s, add to Activity list and book to store
    setTimeout(() => {
      const newAct: ActivityItem = {
        id: `act-${Date.now()}`,
        title: preset.merchant,
        subtitle: preset.subtitle,
        amount: `- RM ${preset.amount.toFixed(2)} -`,
        rawAmount: preset.amount,
        category: preset.category,
        categoryType: preset.categoryType,
        iconBg: preset.iconBg,
        iconType: preset.iconType,
        timestamp: 'Just now',
        paymentMethod: preset.bank,
        referenceId: `NTF-${Math.floor(10000 + Math.random() * 90000)}`,
        isExtractedFromNotification: true,
        rawNotificationText: preset.text,
        aiCategorizationNote: preset.note,
        aiConfidence: 99,
      };

      setActivities((prev) => [newAct, ...prev]);

      // Book to store
      bookExpense({
        merchant: preset.merchant,
        amount: preset.amount,
        category: preset.category as any,
        isNeed: false,
        source: 'VOICE',
      });

      // Clear push banner after 4.5s
      setTimeout(() => {
        setIncomingNotification(null);
        setIsSimulating(false);
      }, 3500);
    }, 1200);
  }

  return (
    <section className={cn('relative', className)}>
      {/* Floating Incoming Push Notification Banner (User's audio feature!) */}
      {incomingNotification && (
        <div className="fixed top-3 left-4 right-4 z-50 animate-bounce-subtle pointer-events-auto">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              const latest = activities[0];
              if (latest) setSelectedItem(latest);
            }}
            className="rounded-[22px] bg-[#04222B]/95 text-white p-3.5 shadow-[0_16px_40px_rgba(4,34,43,0.45)] border border-white/20 backdrop-blur-xl flex items-center gap-3 cursor-pointer"
          >
            <div className="h-9 w-9 rounded-full shrink-0 grid place-items-center bg-white/10 text-white border border-white/15">
              <Bell className="h-4 w-4 text-[#4FB8B4] animate-pulse" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#4FB8B4]">
                  {incomingNotification.bank} · Just now
                </span>
                <span className="text-[9px] font-bold text-white/50">Auto-Extracting</span>
              </div>
              <p className="text-[12px] font-bold text-white leading-tight truncate mt-0.5">
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

      {/* Header: Activity + View Analytics */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-[17px] font-black tracking-tight text-[#04222B]">Activity</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E2F4F0] px-2 py-0.5 text-[9.5px] font-extrabold text-[#10606F]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
            Live Extractor
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenAnalytics}
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#1D8B94] hover:text-[#10606F] transition-colors group"
        >
          <span>View Analytics</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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

      {/* Activity List: Clean white cards matching Image 1 left screen */}
      <div className="space-y-2">
        {activities.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedItem(item);
              onOpenItem?.(item);
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

            {/* Right: Amount with flanking dashes: - $30.00 - */}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <span className="font-sans text-[13px] font-extrabold text-[#04222B] tracking-tight tabular-nums">
                {item.amount}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Activity Detail Modal / Sheet (User's direct request: "activity其中一个我点进去会direct去那个activity的detail") */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-[390px] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-[0_20px_60px_rgba(4,34,43,0.3)] border border-white/90 animate-rise-in max-h-[85vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Dismiss */}
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
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Amount Hero */}
            <div className="py-4 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">Total Amount</p>
              <h2 className="text-[32px] font-black tracking-tight text-[#04222B] mt-0.5">
                {selectedItem.amount.replace(/-/g, '').trim()}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#059669]">
                  <CheckCircle2 className="h-3 w-3" /> Settled & Verified
                </span>
                {selectedItem.isExtractedFromNotification && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E2F4F0] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#10606F]">
                    <Sparkles className="h-3 w-3" /> AI Intercepted
                  </span>
                )}
              </div>
            </div>

            {/* AI Auto-Categorization & Intelligence Box */}
            <div className="rounded-[20px] bg-gradient-to-br from-[#E2F4F0]/60 via-white to-[#E0F2FE]/50 p-3.5 border border-[#98D8D0]/50 mb-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-[#10606F]" />
                  <span className="text-[11.5px] font-black text-[#04222B]">AI Smart Categorization</span>
                </div>
                <span className="text-[10px] font-extrabold text-[#10606F] bg-white px-2 py-0.5 rounded-full border border-[#98D8D0]/40">
                  {selectedItem.aiConfidence ?? 98}% match
                </span>
              </div>
              <p className="text-[11.5px] text-[#0A3D4A] leading-relaxed">
                {selectedItem.aiCategorizationNote ||
                  `Classified under ${selectedItem.category} based on recipient history and spending limits.`}
              </p>
            </div>

            {/* If Extracted from Bank Notification: Show Raw Captured Push */}
            {selectedItem.isExtractedFromNotification && selectedItem.rawNotificationText && (
              <div className="rounded-[18px] bg-slate-50 p-3 border border-slate-200/80 mb-3.5">
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                  <Bell className="h-3 w-3 text-[#1D8B94]" />
                  <span>Original Push Notification</span>
                </div>
                <p className="text-[11.5px] font-mono text-slate-700 leading-snug bg-white p-2 rounded-lg border border-slate-200/60">
                  &ldquo;{selectedItem.rawNotificationText}&rdquo;
                </p>
              </div>
            )}

            {/* Transaction Data Fields */}
            <div className="space-y-2.5 text-[12px] bg-slate-50/70 p-3.5 rounded-[20px] border border-slate-100 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-semibold">Recipient / Merchant</span>
                <span className="font-extrabold text-[#04222B]">{selectedItem.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-semibold">Payment Rail</span>
                <span className="font-bold text-[#04222B]">{selectedItem.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-semibold">Category</span>
                <span className="font-extrabold text-[#10606F] inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {selectedItem.category}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-semibold">Date & Time</span>
                <span className="font-bold text-[#04222B]">{selectedItem.timestamp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#64748B] font-semibold">Reference ID</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(selectedItem.referenceId);
                    setCopiedTxn(true);
                    setTimeout(() => setCopiedTxn(false), 2000);
                  }}
                  className="font-mono text-[11px] font-bold text-[#1D8B94] inline-flex items-center gap-1 hover:underline"
                >
                  <span>{selectedItem.referenceId}</span>
                  <Copy className="h-3 w-3" />
                  {copiedTxn && <span className="text-[9px] text-[#10B981]">Copied</span>}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  alert(`Receipt for ${selectedItem.title} exported!`);
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-[#04222B] text-[12px] font-extrabold transition-colors active:scale-98"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Split Bill</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-2.5 rounded-full bg-[#04222B] hover:bg-[#0A3D4A] text-white text-[12px] font-extrabold shadow-sm transition-colors active:scale-98"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
