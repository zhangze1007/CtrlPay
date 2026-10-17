'use client';

import * as React from 'react';
import {
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Clapperboard,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Flame,
  ShieldCheck,
} from 'lucide-react';
import { SteppedLogo, UnequalMenuIcon } from '@/components/ui/design-icons';
import { BrandLogo } from '@/components/brand-logos';
import { FolderTabCard } from '@/components/folder-tab-card';
import { FluidCircleGauge, type FluidCategory } from '@/components/fluid-circle-gauge';
import { useCtrlPayStore } from '@/lib/store';

export function SubscriptionTab({
  onOpenSheet,
  onVerifyStudent,
}: {
  onOpenSheet: (s: 'notifications' | 'sandbox' | 'audit' | 'expense') => void;
  onVerifyStudent?: () => void;
}) {
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>('all');

  // Categories for the interactive fluid circle gauge
  const categories: FluidCategory[] = [
    {
      id: 'all',
      label: 'Total Burn',
      icon: BarChart2,
      amount: studentVerified ? 124.3 : 131.7,
      subCount: 6,
      fillPercent: 72,
      color: '#1C7EC8',
    },
    {
      id: 'streaming',
      label: 'Streaming',
      icon: Clapperboard,
      amount: 76.2,
      subCount: 3,
      fillPercent: 55,
      color: '#FF0000',
    },
    {
      id: 'ai_music',
      label: 'AI & Music',
      icon: Sparkles,
      amount: studentVerified ? 48.1 : 55.5,
      subCount: 3,
      fillPercent: 42,
      color: '#10A37F',
    },
  ];

  return (
    <div className="animate-fade-in -mx-1 pb-10 space-y-3.5">
      {/* 1. Header: Stepped Logo + "Subscription" on left, Bell & Menu on right */}
      <header className="flex items-center justify-between pt-1 px-1">
        <div className="flex items-center gap-2.5">
          <SteppedLogo className="h-5 w-7 text-[#0B1E3F]" />
          <h1 className="text-[21px] font-black tracking-tight text-[#0B1E3F]">
            Subscription
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Unequal Menu Icon Button */}
          <button
            type="button"
            onClick={() => onOpenSheet('sandbox')}
            className="grid h-9 w-9 place-items-center rounded-full bg-white/80 border border-white/90 shadow-sm text-[#0B1E3F] hover:bg-white transition-all active:scale-95"
            aria-label="Menu"
          >
            <UnequalMenuIcon className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 2. Interactive Circular Fluid Liquid Donut Gauge ("液体流动的") */}
      <div className="relative pt-1">
        <FluidCircleGauge
          categories={categories}
          activeId={activeCategoryId}
          onSelect={setActiveCategoryId}
        />
      </div>

      {/* 3. Real Subscriptions Stack with Authentic Brand Logos */}
      <div className="space-y-3 pt-1">
        {/* Subscription 1: YouTube Premium */}
        {(activeCategoryId === 'all' || activeCategoryId === 'streaming') && (
          <FolderTabCard
            tone="sky"
            tab="Active · Video & Music"
            metaTime="18:00"
            metaDate="24-10-2026"
            title="YouTube Premium"
            subtitle="Family Plan · 5 Members"
            logo={<BrandLogo brand="youtube" />}
            pills={
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                  <ArrowUpRight className="h-3 w-3 text-[#FF0000]" /> Ad-free 4K
                </span>
                <span className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F]">
                  +$17.90/mo
                </span>
              </>
            }
            footerLeft="Billed via Apple App Store"
            footerRight="Auto-renew: Active ✓"
          />
        )}

        {/* Subscription 2: Spotify Premium (with Student Arbitrage) */}
        {(activeCategoryId === 'all' || activeCategoryId === 'ai_music') && (
          <FolderTabCard
            tone="sky"
            tab={
              studentVerified
                ? 'Student Arbitrage · 47% OFF ✓'
                : 'Student Arbitrage · 47% OFF'
            }
            metaTime="09:15"
            metaDate="02-11-2026"
            title="Spotify Premium"
            subtitle={studentVerified ? 'Student verified plan active' : 'Individual plan · Claim discount'}
            logo={<BrandLogo brand="spotify" />}
            pills={
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                  <ArrowUpRight className="h-3 w-3 text-[#10B981]" />{' '}
                  {studentVerified ? 'Saving $7.40/mo' : 'Save $7.40/mo'}
                </span>
                <button
                  type="button"
                  onClick={onVerifyStudent}
                  className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/40 hover:bg-white text-[11px] font-bold text-[#0B1E3F] transition-colors"
                >
                  {studentVerified ? 'Verified ✓' : 'Verify Student →'}
                </button>
              </>
            }
            footerLeft={studentVerified ? 'Discount rate applied' : 'Full price : $15.90/mo'}
            footerRight={studentVerified ? 'Student Rate : $8.50' : 'Student Rate : $8.50'}
          />
        )}

        {/* Subscription 3: Netflix */}
        {(activeCategoryId === 'all' || activeCategoryId === 'streaming') && (
          <FolderTabCard
            tone="sky"
            tab="Active · Cinema"
            metaTime="20:30"
            metaDate="30-10-2026"
            title="Netflix Standard"
            subtitle="Ultra HD 4K · 2 Screens"
            logo={<BrandLogo brand="netflix" />}
            pills={
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                  <ArrowUpRight className="h-3 w-3 text-[#E50914]" /> Spatial Audio
                </span>
                <span className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F]">
                  +$45.00/mo
                </span>
              </>
            }
            footerLeft="Household sharing active"
            footerRight="Renews in 13 days"
          />
        )}

        {/* Subscription 4: ChatGPT Plus (OpenAI) */}
        {(activeCategoryId === 'all' || activeCategoryId === 'ai_music') && (
          <FolderTabCard
            tone="sky"
            tab="Active · AI Copilot"
            metaTime="14:00"
            metaDate="05-11-2026"
            title="ChatGPT Plus"
            subtitle="GPT-4o, Canvas & Voice"
            logo={<BrandLogo brand="chatgpt" />}
            pills={
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                  <Sparkles className="h-3 w-3 text-[#10A37F]" /> Fast Reasoning
                </span>
                <span className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F]">
                  +$20.00/mo
                </span>
              </>
            }
            footerLeft="Tax invoice claimable"
            footerRight="High Usage 🔥"
          />
        )}

        {/* Subscription 5: Apple One (iCloud+) */}
        {(activeCategoryId === 'all' || activeCategoryId === 'ai_music') && (
          <FolderTabCard
            tone="sky"
            tab="Active · Cloud Storage"
            metaTime="11:00"
            metaDate="08-11-2026"
            title="Apple One"
            subtitle="2TB iCloud+ & Music"
            logo={<BrandLogo brand="apple" />}
            pills={
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                  <ShieldCheck className="h-3 w-3 text-[#0B1E3F]" /> Private Relay
                </span>
                <span className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F]">
                  +$19.90/mo
                </span>
              </>
            }
            footerLeft="Storage: 1.4TB of 2TB"
            footerRight="Auto-renewal ✓"
          />
        )}

        {/* Subscription 6: Disney+ Hotstar (Zombie Detection) */}
        {(activeCategoryId === 'all' || activeCategoryId === 'streaming') && (
          <FolderTabCard
            tone="sky"
            tab="⚠️ Suspected Zombie"
            metaTime="34d idle"
            metaDate="15-11-2026"
            title="Disney+ Hotstar"
            subtitle="0 streams logged past 30 days"
            logo={<BrandLogo brand="disney" />}
            pills={
              <>
                <span className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-white/50 text-[11px] font-bold text-[#0B1E3F]">
                  <AlertTriangle className="h-3 w-3 text-[#F59E0B]" /> 1.43× impulse
                </span>
                <button
                  type="button"
                  onClick={() => onOpenSheet('sandbox')}
                  className="inline-flex items-center h-7 px-3 rounded-full border border-white/70 bg-white/30 text-[11px] font-bold text-[#0B1E3F] hover:bg-white/60"
                >
                  Flag Zombie →
                </button>
              </>
            }
            footerLeft="Quarterly fee : $39.90"
            footerRight="Recoverable : +$39.90"
          />
        )}
      </div>
    </div>
  );
}
