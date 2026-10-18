'use client';

import * as React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Copy,
  Search,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActivityItem } from '@/components/activity-section';

export interface AllTransactionsSlideViewProps {
  onClose: () => void;
  onOpenItem?: (item: ActivityItem) => void;
}

const EXTENDED_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    title: 'Apple service subscription',
    subtitle: 'App Store, Tinder, and 2+',
    amount: '- RM 30.00 -',
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
    amount: '- RM 30.00 -',
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
    amount: '- RM 12.00 -',
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
    amount: '- RM 5.00 -',
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
    amount: '- RM 24.00 -',
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
  {
    id: 'act-6',
    title: 'Zus Coffee Mid Valley',
    subtitle: 'Iced Spanish Latte x2',
    amount: '- RM 15.50 -',
    rawAmount: 15.5,
    category: 'Food & Drinks',
    categoryType: 'food',
    iconBg: '#0055B8',
    iconType: 'tng',
    timestamp: '15 Oct, 3:15 PM',
    paymentMethod: "Touch 'n Go eWallet",
    referenceId: 'TNG-77402-ZUS',
    isExtractedFromNotification: true,
    rawNotificationText: "Touch 'n Go eWallet: Payment of RM 15.50 to Zus Coffee successful.",
    aiCategorizationNote: 'Extracted from TNG push notification. AI categorized as Food & Drinks.',
    aiConfidence: 99,
  },
  {
    id: 'act-7',
    title: 'Dinner Steamboat Split',
    subtitle: 'Mike Wong (DuitNow)',
    amount: '- RM 45.00 -',
    rawAmount: 45.0,
    category: 'Food & Dining',
    categoryType: 'food',
    iconBg: '#FFCE00',
    iconType: 'maybank',
    timestamp: '14 Oct, 8:45 PM',
    paymentMethod: 'Maybank MAE',
    referenceId: 'MAE-55102-SBT',
    isExtractedFromNotification: true,
    rawNotificationText: 'Maybank MAE: DuitNow Transfer RM 45.00 to Mike Wong. Ref: Dinner steamboat split.',
    aiCategorizationNote: 'Extracted from Maybank MAE notification. Peer transfer tagged to Dining.',
    aiConfidence: 98,
  },
  {
    id: 'act-8',
    title: 'Campus Bookstore',
    subtitle: 'Semester Textbooks & Stationery',
    amount: '- RM 120.00 -',
    rawAmount: 120.0,
    category: 'Education & Supplies',
    categoryType: 'shopping',
    iconBg: '#EEF2FF',
    iconType: 'custom',
    timestamp: '12 Oct, 10:30 AM',
    paymentMethod: 'Mastercard *4829',
    referenceId: 'BOK-33910-EDU',
    aiCategorizationNote: 'Matched to semester textbook allocation in CFaR student budget.',
    aiConfidence: 95,
  },
  {
    id: 'act-9',
    title: 'GrabCar to Sunway Uni',
    subtitle: 'Morning Ride · Sunway Velocity',
    amount: '- RM 14.00 -',
    rawAmount: 14.0,
    category: 'Transport',
    categoryType: 'bills',
    iconBg: '#ECFDF5',
    iconType: 'grab',
    timestamp: '11 Oct, 8:20 AM',
    paymentMethod: 'GrabPay Balance',
    referenceId: 'GP-99210-RIDE',
    aiCategorizationNote: 'Tagged under Campus Transport.',
    aiConfidence: 96,
  },
  {
    id: 'act-10',
    title: 'FamilyMart SS15',
    subtitle: 'Matcha Softserve & Oden',
    amount: '- RM 18.20 -',
    rawAmount: 18.2,
    category: 'Food & Snacks',
    categoryType: 'food',
    iconBg: '#0055B8',
    iconType: 'tng',
    timestamp: '10 Oct, 9:15 PM',
    paymentMethod: "Touch 'n Go eWallet",
    referenceId: 'TNG-22910-FM',
    aiCategorizationNote: 'Auto-categorized under Food & Snacks.',
    aiConfidence: 97,
  },
  {
    id: 'act-11',
    title: 'Netflix Premium 4K',
    subtitle: 'Monthly Family Entertainment',
    amount: '- RM 25.86 -',
    rawAmount: 25.86,
    category: 'Streaming',
    categoryType: 'subscription',
    iconBg: '#1C1C1E',
    iconType: 'apple',
    timestamp: '08 Oct, 9:00 AM',
    paymentMethod: 'Apple Pay · Mastercard *4829',
    referenceId: 'NFLX-88190-SUB',
    aiCategorizationNote: 'Recurring digital subscription. Verified active.',
    aiConfidence: 99,
  },
  {
    id: 'act-12',
    title: 'Allowance from Mom',
    subtitle: 'DuitNow Instant Transfer',
    amount: '+ RM 300.00 +',
    rawAmount: 300.0,
    category: 'Income / Allowance',
    categoryType: 'transfer',
    iconBg: '#FFCE00',
    iconType: 'maybank',
    timestamp: '05 Oct, 11:00 AM',
    paymentMethod: 'Maybank MAE Account',
    referenceId: 'MAE-11029-INC',
    aiCategorizationNote: 'Inbound family allowance. Added to monthly survival liquidity.',
    aiConfidence: 99,
  },
  {
    id: 'act-13',
    title: 'Unifi Home Fiber 100Mbps',
    subtitle: 'Monthly Internet Utility',
    amount: '- RM 89.00 -',
    rawAmount: 89.0,
    category: 'Utilities',
    categoryType: 'bills',
    iconBg: '#CC0000',
    iconType: 'publicbank',
    timestamp: '03 Oct, 2:10 PM',
    paymentMethod: 'Public Bank Auto-Debit',
    referenceId: 'PB-44019-UNIFI',
    aiCategorizationNote: 'Fixed commitment utility bill. Cleared.',
    aiConfidence: 98,
  },
  {
    id: 'act-14',
    title: 'Watsons Pharmacy',
    subtitle: 'Personal Care & Vitamins',
    amount: '- RM 22.50 -',
    rawAmount: 22.5,
    category: 'Health & Care',
    categoryType: 'shopping',
    iconBg: '#ECFDF5',
    iconType: 'grab',
    timestamp: '01 Oct, 5:40 PM',
    paymentMethod: 'GrabPay Balance',
    referenceId: 'GP-10294-WAT',
    aiCategorizationNote: 'Categorized as Health & Personal Care.',
    aiConfidence: 94,
  },
  {
    id: 'act-15',
    title: 'Steam Summer Game',
    subtitle: 'Indie Game Bundle',
    amount: '- RM 42.00 -',
    rawAmount: 42.0,
    category: 'Entertainment',
    categoryType: 'entertainment',
    iconBg: '#1C1C1E',
    iconType: 'custom',
    timestamp: '28 Sep, 10:15 PM',
    paymentMethod: 'Mastercard *4829',
    referenceId: 'STM-77301-GAM',
    aiCategorizationNote: 'Discretionary gaming expenditure.',
    aiConfidence: 96,
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
        <svg className="h-5 w-5 fill-[#22C55E]" viewBox="0 0 24 24">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10 5.524 0 10-4.476 10-10 0-5.523-4.476-10-10-10zm4.587 14.428c-.18.295-.562.387-.857.207-2.348-1.435-5.304-1.76-8.785-.964-.334.076-.666-.134-.742-.468-.077-.334.133-.666.468-.743 3.81-.87 7.076-.502 9.71 1.112.294.18.386.562.206.856zm1.223-2.72c-.226.368-.71.484-1.078.258-2.688-1.652-6.784-2.131-9.963-1.166-.413.126-.855-.108-.98-.52-.127-.414.107-.856.52-.981 3.633-1.103 8.147-.568 11.243 1.33.368.226.484.71.258 1.079zm.105-2.836C14.693 8.94 8.57 8.74 5.013 9.82c-.495.15-1.02-.132-1.17-.626-.15-.494.13-1.02.626-1.17 4.095-1.243 10.866-1.012 14.73 1.282.446.265.592.842.327 1.288-.266.446-.843.592-1.29.327z" />
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
        <div className="grid h-full w-full place-items-center rounded-full bg-[#FFCE00] text-[#111827] font-black text-[9px] tracking-tighter">
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

export function AllTransactionsSlideView({
  onClose,
  onOpenItem,
}: AllTransactionsSlideViewProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = React.useState<string>('all');
  const [selectedTxn, setSelectedTxn] = React.useState<ActivityItem | null>(null);
  const [copiedTxn, setCopiedTxn] = React.useState(false);

  const filtered = EXTENDED_ACTIVITIES.filter((item) => {
    const matchesCategory =
      activeCategoryFilter === 'all' || item.categoryType === activeCategoryFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const copyRefId = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopiedTxn(true);
    setTimeout(() => setCopiedTxn(false), 2000);
  };

  return (
    <div className="flex h-full flex-col bg-[#F8FAF8] overflow-hidden font-sans select-none">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-3 pb-3 bg-[#F8FAF8]/95 backdrop-blur-md border-b border-gray-100">
        <button
          type="button"
          onClick={onClose}
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
            {filtered.length} records found
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
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
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-[#94A3B8] text-[13px]">
            No matching transactions found.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedTxn(item);
                onOpenItem?.(item);
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

      {/* Transaction Receipt Drawer */}
      {selectedTxn && (
        <div className="absolute inset-0 z-50 flex items-end justify-center p-0 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-[390px] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-[0_20px_60px_rgba(4,34,43,0.3)] border border-white/90 animate-rise-in max-h-[85vh] overflow-y-auto no-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div
                  className="grid h-8 w-8 place-items-center rounded-full shadow-sm shrink-0"
                  style={{ backgroundColor: selectedTxn.iconBg }}
                >
                  <BrandIcon type={selectedTxn.iconType} />
                </div>
                <span className="text-[13px] font-black text-[#04222B]">Transaction Detail</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxn(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-[#04222B] hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Receipt Amount Hero */}
            <div className="text-center py-4 bg-slate-50/70 rounded-2xl my-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                Total Amount Paid
              </span>
              <div className="text-[28px] font-black tracking-tight text-[#04222B] mt-0.5">
                {selectedTxn.amount}
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E2F4F0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#10606F] mt-1">
                <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                Successful · {selectedTxn.timestamp}
              </span>
            </div>

            {/* Meta Table */}
            <div className="space-y-2.5 text-[12px]">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Merchant</span>
                <span className="font-bold text-[#04222B]">{selectedTxn.title}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Category</span>
                <span className="font-bold text-[#04222B] flex items-center gap-1">
                  <Tag className="h-3 w-3 text-[#1D8B94]" />
                  {selectedTxn.category}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Payment Method</span>
                <span className="font-bold text-[#04222B]">{selectedTxn.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Reference ID</span>
                <button
                  type="button"
                  onClick={() => copyRefId(selectedTxn.referenceId)}
                  className="font-mono font-bold text-[#10606F] flex items-center gap-1 hover:underline"
                >
                  <span>{selectedTxn.referenceId}</span>
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              {copiedTxn && (
                <p className="text-[10px] text-right text-[#10B981] font-bold">Copied to clipboard!</p>
              )}
            </div>

            {/* AI Note */}
            <div className="mt-3.5 rounded-2xl bg-[#E2F4F0]/60 p-3 border border-[#98D8D0]/40">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-[#10B981]" />
                <span className="text-[11px] font-black text-[#04222B]">
                  AI Auto-Extractor Note
                </span>
                <span className="text-[9.5px] font-bold text-[#10606F] ml-auto">
                  {selectedTxn.aiConfidence ?? 98}% Confidence
                </span>
              </div>
              <p className="text-[11px] text-[#0A3D4A] leading-relaxed">
                {selectedTxn.aiCategorizationNote ??
                  'Parsed automatically from background system notifications. Categorized according to the Campus CFaR student framework.'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedTxn(null)}
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
