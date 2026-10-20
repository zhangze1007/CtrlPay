'use client';

import * as React from 'react';
import { Clock3, Hourglass, ShieldAlert, TrendingDown } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { calculateBehavioralMetrics, DEMO_CONFIG } from '@/lib/quant-engine';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { cn } from '@/lib/utils';
import type { WhatIfResult } from '@/lib/domain';
import type { SpendCategory } from '@/lib/types';

export interface RiskTailStripProps {
  amount: number;
  category: SpendCategory;
  isNeed?: boolean;
  /** Pre-computed engine result (the interceptor modal already has one). */
  result?: WhatIfResult;
  /** `grid` = full telemetry tiles; `inline` = compact chip row for contract cards. */
  variant?: 'grid' | 'inline';
  className?: string;
}

/**
 * Phase 8 fintech telemetry strip.
 *
 * Surfaces the Basel III tail-risk metrics (ES95, mid-month NSF probability, pre-auth
 * latency) and the Laibson present-bias markup on ONE shared component so the payment
 * interceptor, the commitment-device cards and the mobile app never drift apart.
 */
export function RiskTailStrip({
  amount,
  category,
  isNeed = false,
  result,
  variant = 'grid',
  className,
}: RiskTailStripProps) {
  const { format } = useDisplayCurrency();
  const runWhatIf = useCtrlPayStore((s) => s.runWhatIf);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const amortizeAnnualFees = useCtrlPayStore((s) => s.amortizeAnnualFees);

  const engine = React.useMemo<WhatIfResult>(() => {
    if (result) return result;
    return runWhatIf({ merchant: 'risk-preview', amount, category, isNeed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    result,
    runWhatIf,
    amount,
    category,
    isNeed,
    sandboxClock,
    currentBalance,
    spentThisWeek,
    spentThisMonth,
    amortizeAnnualFees,
  ]);

  const behavioral = React.useMemo(
    () => calculateBehavioralMetrics(amount, engine.shortfallProbability, rewardPool),
    [amount, engine.shortfallProbability, rewardPool],
  );

  // The pre-auth latency is a real wall-clock measurement, so it must not be part of the
  // server-rendered markup — hydration would flag the two values as a mismatch.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const latency = mounted ? `${engine.executionTimeMs.toFixed(2)} ms` : '… ms';

  const nsfRisk = engine.intraMonthLiquidityBreachProb;
  const nsfTone =
    nsfRisk >= 20 ? 'text-[#B3253F]' : nsfRisk > 0 ? 'text-[#8A5408]' : 'text-holst-600';

  if (variant === 'inline') {
    return (
      <div className={cn('flex flex-wrap items-center gap-1.5 text-[11px]', className)}>
        <span className="rounded-full bg-holst-50 px-2 py-0.5 font-semibold text-holst-600">
          ES95 {format(engine.es95)}
        </span>
        <span className={cn('rounded-full bg-holst-50/70 px-2 py-0.5 font-semibold', nsfTone)}>
          NSF dip {nsfRisk.toFixed(2)}%
        </span>
        <span className="rounded-full bg-holst-50 px-2 py-0.5 font-semibold text-holst-800">
          Pre-auth {latency}
        </span>
        <span className="rounded-full bg-[#FFF3E6] px-2 py-0.5 font-semibold text-[#8A5408]">
          Present bias β={DEMO_CONFIG.presentBiasBeta.toFixed(2)} ·{' '}
          {behavioral.presentBiasInflationRatio.toFixed(2)}×
        </span>
        {behavioral.riskElasticRewardRM > behavioral.baseRewardRM ? (
          <span className="rounded-full bg-holst-50 px-2 py-0.5 font-semibold text-holst-600">
            Reward {format(behavioral.baseRewardRM)} → {format(behavioral.riskElasticRewardRM)}{' '}
            risk-elastic
          </span>
        ) : null}
      </div>
    );
  }

  const tiles: Array<{ icon: React.ReactNode; label: string; value: string; tone: string }> = [
    {
      icon: <TrendingDown className="h-3.5 w-3.5" />,
      label: 'ES95 tail risk',
      value: format(engine.es95),
      tone: 'text-holst-600',
    },
    {
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      label: 'Mid-month NSF dip',
      value: `${nsfRisk.toFixed(2)}%`,
      tone: nsfTone,
    },
    {
      icon: <Clock3 className="h-3.5 w-3.5" />,
      label: 'Pre-auth engine',
      value: latency,
      tone: 'text-holst-600',
    },
    {
      icon: <Hourglass className="h-3.5 w-3.5" />,
      label: 'Present-bias markup',
      value: `${behavioral.presentBiasInflationRatio.toFixed(2)}× (β=${behavioral.presentBiasBeta.toFixed(2)})`,
      tone: 'text-[#8A5408]',
    },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="ct-metric">
            <div className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]', t.tone)}>
              {t.icon}
              {t.label}
            </div>
            <div className={cn('duo-num mt-1 text-[13px] font-bold', t.tone)}>{t.value}</div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed duo-muted">
        Basel III expected shortfall (Artzner et al., 1999) · intra-month path-minimum barrier ·
        Laibson (1997) present bias with a risk-elastic reward of{' '}
        {format(behavioral.baseRewardRM)} → {format(behavioral.riskElasticRewardRM)}.
      </p>
    </div>
  );
}
