'use client';

import * as React from 'react';
import {
  ArrowRight,
  ChevronRight,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  X,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  CalendarDays,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { BrandLogo, type BrandId } from '@/components/brand-logos';

export interface CollectionCardData {
  id: string;
  brand: BrandId;
  title: string;
  category: string;
  amount: number;
  progressPercent: number; // e.g. 23%, 78%, 98%
  pills: string[]; // e.g. ['Family Plan', '4K UHD']
  bgColor: string; // card background matching Image 2
  textColor: string;
  pillBg: string;
  pillBorder: string;
  arrowBg: string;
  arrowColor: string;
  billingCycle: string;
  nextRenewal: string;
  features: string[];
  isZombie?: boolean;
  studentDiscount?: boolean;
}

const COLLECTION_SUBSCRIPTIONS: CollectionCardData[] = [
  {
    id: 'youtube',
    brand: 'youtube',
    title: 'YouTube Premium',
    category: 'Streaming & Video',
    amount: 17.9,
    progressPercent: 23,
    pills: ['Family 4K', '4.8 hrs/mo · Ad-Free'],
    bgColor: '#DDD6FE', // pastel lavender matching card 1
    textColor: '#1E1B4B',
    pillBg: 'rgba(255, 255, 255, 0.45)',
    pillBorder: 'rgba(30, 27, 75, 0.25)',
    arrowBg: '#1E1B4B',
    arrowColor: '#FFFFFF',
    billingCycle: 'Monthly · Renews 24th',
    nextRenewal: 'May 24, 2026',
    features: ['Ad-free video on all devices', 'Background playback & YouTube Music', 'Download for offline viewing'],
  },
  {
    id: 'spotify',
    brand: 'spotify',
    title: 'Spotify Individual',
    category: 'Audio & Music',
    amount: 8.5, // student discounted
    progressPercent: 78,
    pills: ['Student 47% OFF', '2.6 hrs/mo · Lossless'],
    bgColor: '#E9F562', // lime-yellow matching card 2
    textColor: '#1A2E05',
    pillBg: 'rgba(255, 255, 255, 0.55)',
    pillBorder: 'rgba(26, 46, 5, 0.25)',
    arrowBg: '#1A2E05',
    arrowColor: '#FFFFFF',
    billingCycle: 'Monthly · Renews 2nd',
    nextRenewal: 'June 2, 2026',
    features: ['Save RM 7.40/mo with student arbitrage', '320kbps high fidelity streaming', 'Unlimited skips & offline podcasts'],
    studentDiscount: true,
  },
  {
    id: 'netflix',
    brand: 'netflix',
    title: 'Netflix Standard',
    category: 'Cinema & Shows',
    amount: 45.0,
    progressPercent: 98,
    pills: ['Ultra HD 4K', '16.7 hrs/mo · 2 Screens'],
    bgColor: '#3B82F6', // royal sapphire blue matching card 3
    textColor: '#FFFFFF',
    pillBg: 'rgba(255, 255, 255, 0.25)',
    pillBorder: 'rgba(255, 255, 255, 0.35)',
    arrowBg: '#0F172A',
    arrowColor: '#FFFFFF',
    billingCycle: 'Monthly · Renews 12th',
    nextRenewal: 'May 12, 2026',
    features: ['Spatial audio & 4K HDR playback', 'Household simultaneous streaming', 'Unlimited award-winning originals'],
  },
  {
    id: 'chatgpt',
    brand: 'chatgpt',
    title: 'ChatGPT Plus',
    category: 'AI & Developer',
    amount: 20.0,
    progressPercent: 100,
    pills: ['GPT-4o & Canvas', '9.6 hrs/mo · Voice'],
    bgColor: '#FB923C', // vibrant coral-orange matching card 4
    textColor: '#FFFFFF',
    pillBg: 'rgba(255, 255, 255, 0.25)',
    pillBorder: 'rgba(255, 255, 255, 0.35)',
    arrowBg: '#7C2D12',
    arrowColor: '#FFFFFF',
    billingCycle: 'Monthly · Renews 25th',
    nextRenewal: 'May 25, 2026',
    features: ['Access to GPT-4o, o1-preview & Canvas', 'Advanced Voice Mode', 'High daily usage limits'],
  },
  {
    id: 'claude',
    brand: 'claude',
    title: 'Claude Max',
    category: 'AI & Reasoning',
    amount: 299.0,
    progressPercent: 92,
    pills: ['Anthropic Opus', '200k Context'],
    bgColor: '#E879F9', // mauve plum matching card 5
    textColor: '#4A044E',
    pillBg: 'rgba(255, 255, 255, 0.45)',
    pillBorder: 'rgba(74, 4, 78, 0.25)',
    arrowBg: '#4A044E',
    arrowColor: '#FFFFFF',
    billingCycle: 'Monthly · Renews 15th',
    nextRenewal: 'May 15, 2026',
    features: ['Extended thinking & deep code analysis', '200,000 token context window', 'Priority compute during peak hours'],
  },
  {
    id: 'apple',
    brand: 'apple',
    title: 'Apple One Family',
    category: 'Cloud Storage & Services',
    amount: 19.9,
    progressPercent: 84,
    pills: ['2TB iCloud+', 'Apple Arcade'],
    bgColor: '#93C5FD', // soft sky blue
    textColor: '#0C4A6E',
    pillBg: 'rgba(255, 255, 255, 0.5)',
    pillBorder: 'rgba(12, 74, 110, 0.25)',
    arrowBg: '#0C4A6E',
    arrowColor: '#FFFFFF',
    billingCycle: 'Monthly · Renews 18th',
    nextRenewal: 'May 18, 2026',
    features: ['Shared with 5 family members', 'iCloud Private Relay & Hide My Email', 'Lossless Apple Music catalog'],
  },
  {
    id: 'disney',
    brand: 'disney',
    title: 'Disney+ Hotstar',
    category: 'Streaming Video',
    amount: 13.3,
    progressPercent: 14,
    pills: ['⚠️ 1.43× impulse', '30d idle'],
    bgColor: '#CBD5E1', // slate muted
    textColor: '#0F172A',
    pillBg: 'rgba(255, 255, 255, 0.65)',
    pillBorder: 'rgba(15, 23, 42, 0.25)',
    arrowBg: '#0F172A',
    arrowColor: '#FFFFFF',
    billingCycle: 'Quarterly · RM 39.90 / 3mo',
    nextRenewal: 'June 15, 2026',
    features: ['0 active streams logged past 30 days', 'Flagged as potential zombie subscription', 'Save RM 39.90 if cancelled before next cycle'],
    isZombie: true,
  },
];

export function CollectionSubscriptionCards({
  onVerifyStudent,
}: {
  onVerifyStudent?: () => void;
}) {
  const { format, localize } = useDisplayCurrency();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedItem, setSelectedItem] = React.useState<CollectionCardData | null>(null);

  const filteredItems = COLLECTION_SUBSCRIPTIONS.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 -mt-2">
      {/* 1. Header matching Image 2 right phone: "My collections +" */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[24px] font-black tracking-tight text-[#0B1E3F]">
          My collections +
        </h3>
        <span className="text-[12px] font-bold text-[#64748B]">
          {filteredItems.length} platforms
        </span>
      </div>

      {/* 2. Search Bar matching Image 2: Q Search + filter sliders button */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#94A3B8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search subscriptions, plans..."
            className="w-full rounded-2xl bg-white/90 border border-[#E2E8F0] pl-10 pr-4 py-2.5 text-[13.5px] font-bold text-[#0B1E3F] placeholder-[#94A3B8] shadow-xs focus:border-[#2563EB] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
          />
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-2xl bg-white/90 border border-[#E2E8F0] shadow-xs text-[#0B1E3F] hover:bg-white active:scale-95 transition-transform"
          aria-label="Filter"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {/* 3. The Colorful Collection Cards matching Image 2 right phone 1:1 */}
      <div className="space-y-3 pt-1">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedItem(item)}
            className="group relative overflow-hidden rounded-[26px] p-4 shadow-sm transition-all duration-200 active:scale-[0.98] cursor-pointer hover:shadow-md"
            style={{ backgroundColor: item.bgColor, color: item.textColor }}
          >
            {/* Top Row: Title + Platform Logo on left, Percentage / Price on right */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BrandLogo brand={item.brand} className="h-8 w-8 p-1.5 rounded-xl shadow-xs" />
                <h4 className="text-[18px] font-extrabold tracking-tight leading-tight">
                  {item.title}
                </h4>
              </div>

              <div className="text-right">
                <span className="text-[13px] font-extrabold tracking-tight opacity-90">
                  {item.progressPercent}%
                </span>
                <p className="text-[10px] font-bold opacity-75 leading-none">
                  {format(item.amount)}/mo
                </p>
              </div>
            </div>

            {/* Bottom Row: Two Rounded Pills with dark border + Arrow Button on right */}
            <div className="mt-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.pills.map((p, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold"
                    style={{
                      backgroundColor: item.pillBg,
                      border: `1.5px solid ${item.pillBorder}`,
                      color: item.textColor,
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>

              {/* Arrow circle button (→) matching Image 2 */}
              <div
                className="grid h-8 w-8 place-items-center rounded-full transition-transform group-hover:translate-x-0.5"
                style={{ backgroundColor: item.arrowBg, color: item.arrowColor }}
              >
                <ArrowRight className="h-4 w-4 stroke-[2.5]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. Rich Subscription Details Modal (Opened on click) */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-[34px] bg-white p-5 shadow-2xl border border-white space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BrandLogo brand={selectedItem.brand} className="h-12 w-12 p-2.5 rounded-2xl" />
                <div>
                  <h3 className="text-[18px] font-black text-[#0B1E3F]">
                    {selectedItem.title}
                  </h3>
                  <p className="text-[12px] font-bold text-[#64748B]">
                    {format(selectedItem.amount)} / month · {selectedItem.category}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#F1F5F9] text-[#64748B] hover:text-[#0B1E3F]"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Action Buttons matching image: Pay now & Cancel */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#2563EB] text-white text-[12.5px] font-black shadow-md shadow-[#2563EB]/25 active:scale-95"
              >
                <span>Pay now</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex items-center justify-center gap-1.5 h-10 rounded-full bg-[#DC2626] text-white text-[12.5px] font-black shadow-md shadow-[#DC2626]/25 active:scale-95"
              >
                <span>Cancel</span>
                <span>✕</span>
              </button>
            </div>

            {/* Billing Cycle Card */}
            <div className="rounded-2xl bg-[#F8FAFC] p-3.5 border border-[#E2E8F0] space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#64748B]">
                  Billing Schedule
                </p>
                <span className="text-[11px] font-bold text-[#2563EB]">
                  {selectedItem.nextRenewal}
                </span>
              </div>
              <p className="text-[14px] font-bold text-[#0B1E3F]">
                {localize(selectedItem.billingCycle)}
              </p>
            </div>

            {/* Plan Highlights */}
            <div className="rounded-2xl bg-[#F8FAFC] p-3.5 border border-[#E2E8F0] space-y-2">
              <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Included Features
              </p>
              <ul className="space-y-1.5 text-[12px] font-semibold text-[#1E293B]">
                {selectedItem.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                    <span>{localize(f)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Student Discount claim if applicable */}
            {selectedItem.studentDiscount && (
              <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200 flex items-center justify-between">
                <div>
                  <p className="text-[12.5px] font-black text-emerald-950">
                    Student Arbitrage Active
                  </p>
                  <p className="text-[10.5px] font-semibold text-emerald-700">
                    {localize('Saving RM 7.40 every month (RM 88.80/year)')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onVerifyStudent}
                  className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-extrabold text-white"
                >
                  Verified ✓
                </button>
              </div>
            )}

            {/* Zombie detection flag if applicable */}
            {selectedItem.isZombie && (
              <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200 flex items-center justify-between">
                <div>
                  <p className="text-[12.5px] font-black text-amber-950 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-amber-600" /> Zombie Warning
                  </p>
                  <p className="text-[10.5px] font-semibold text-amber-700">
                    30+ days without usage. Safe to terminate.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="rounded-full bg-amber-600 px-3 py-1 text-[11px] font-extrabold text-white"
                >
                  Auto-Pause
                </button>
              </div>
            )}

            {/* Toggle Controls */}
            <div className="space-y-2.5 pt-1 border-t border-[#F1F5F9]">
              <div className="flex items-center justify-between py-1">
                <span className="text-[12.5px] font-bold text-[#0B1E3F]">
                  Auto-Renewal Push Alerts
                </span>
                <span className="text-[11.5px] font-black text-[#10B981]">
                  Enabled ✓
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[12.5px] font-bold text-[#0B1E3F]">
                  24h AI Impulse Quarantine
                </span>
                <span className="text-[11.5px] font-black text-[#2563EB]">
                  Active Lock
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
