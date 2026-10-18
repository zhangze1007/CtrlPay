'use client';

import * as React from 'react';
import {
  BarChart2,
  Clapperboard,
  Sparkles,
} from 'lucide-react';
import { SteppedLogo, UnequalMenuIcon } from '@/components/ui/design-icons';
import { FluidCircleGauge, type FluidCategory } from '@/components/fluid-circle-gauge';
import { CollectionSubscriptionCards } from '@/components/collection-subscription-cards';
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
    <div className="animate-fade-in -mx-1 pb-10 space-y-2">
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

      {/* 3. Real Subscriptions Stack matching Image 2 "My collections +" */}
      <CollectionSubscriptionCards onVerifyStudent={onVerifyStudent} />
    </div>
  );
}
