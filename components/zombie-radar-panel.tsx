'use client';

import * as React from 'react';
import { Layers, Radio } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTIONS } from '@/lib/mock-data';
import { SUBSCRIPTION_REGISTRY } from '@/lib/subscription-registry';
import { calculateAmortizedSubscriptions } from '@/lib/quant-engine';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

/** 40px circular two-letter monograms (Nexora Top-Holdings style) — never bare emoji. */
const MONOGRAM: Record<string, string> = {
  netflix_my: 'NF',
  disney_plus_my: 'DP',
  spotify_my: 'SP',
  youtube_my: 'YT',
  icloud_my: 'IC',
  anytime_fitness_my: 'AF',
};

const TAG_COPY: Record<string, string> = {
  ACTIVE: 'active',
  ENDANGERED: 'endangered',
  ZOMBIE: 'zombie',
  SUSPECTED_ZOMBIE: 'suspected',
};

/**
 * Module D — dark mandate roster + the capped double-bar "sinking fund" chart.
 *
 * Each column is the un-amortized bill shock (full-height ghost column, sealed by a
 * 1.5px white cap line) with the amortized daily-smoothed portion growing from the
 * bottom in bright jade. Turning the Sinking Fund on visibly empties the ghost column
 * for annual licences.
 */
export function ZombieRadarPanel({
  compact = false,
  onManageSubscription,
}: {
  compact?: boolean;
  onManageSubscription?: (subscriptionId: string) => void;
}) {
  const { format } = useDisplayCurrency();
  const zombieTags = useCtrlPayStore((s) => s.zombieTags);
  const amortize = useCtrlPayStore((s) => s.amortizeAnnualFees);
  const setAmortize = useCtrlPayStore((s) => s.setAmortize);

  const rows = React.useMemo(() => {
    const amort = new Map(calculateAmortizedSubscriptions(SUBSCRIPTIONS).map((a) => [a.subscriptionId, a]));
    const maxFull = Math.max(...SUBSCRIPTIONS.map((s) => s.amountRM));
    return SUBSCRIPTIONS.map((sub) => {
      const burden = amort.get(sub.subscriptionId)?.monthlyBurden ?? sub.amountRM;
      const effective = amortize ? burden : sub.amountRM;
      const tag = zombieTags[sub.subscriptionId] ?? 'ACTIVE';
      return {
        id: sub.subscriptionId,
        merchant: SUBSCRIPTION_REGISTRY[sub.subscriptionId].merchantName,
        mono: MONOGRAM[sub.subscriptionId] ?? sub.subscriptionId.slice(0, 2).toUpperCase(),
        amountRM: sub.amountRM,
        effectiveRM: effective,
        cycle: sub.billingCycle === 'ANNUAL' ? 'annual' : 'monthly',
        dueDay: new Date(sub.nextBillingDate).getUTCDate(),
        tag,
        ghostPct: Math.round((sub.amountRM / maxFull) * 100),
        solidPct: Math.max(6, Math.round((effective / maxFull) * 100)),
      };
    });
  }, [amortize, zombieTags]);

  const monthlyTotal = rows.reduce((sum, r) => sum + r.effectiveRM, 0);

  return (
    <section className="ct-glass-dark overflow-hidden">
      <header className="flex items-center justify-between gap-2 px-4 pt-4">
        <div>
          <p className="ct-kicker text-holst-200/80">Live mandate roster</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-white">
            {format(monthlyTotal)}
            <span className="ml-1 text-[11px] font-semibold text-holst-200/70">/ effective month</span>
          </p>
        </div>
        <Badge variant="outline" className="border-white/20 text-holst-100 ring-white/20">
          {rows.length} mandates
        </Badge>
      </header>

      <ul className="mt-3 divide-y divide-white/8">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="ct-mono ct-mono-light">{r.mono}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-bold uppercase tracking-[0.03em] text-white">{r.merchant}</p>
              <p className="text-[10.5px] text-holst-200/70">
                bills {r.dueDay} · {r.cycle}
                <span className="ml-1.5 text-holst-400">· {TAG_COPY[r.tag] ?? r.tag.toLowerCase()}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="duo-num text-[13px] font-extrabold text-white">{format(r.amountRM)}</p>
              {amortize && r.cycle === 'annual' ? (
                <p className="text-[10px] font-semibold text-holst-400">→ {format(r.effectiveRM)} /mo</p>
              ) : (
                <p className="text-[10px] font-semibold text-holst-200/60">{r.cycle}</p>
              )}
            </div>
            {onManageSubscription && (
              <button
                type="button"
                onClick={() => onManageSubscription(r.id)}
                className="ml-1 shrink-0 rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-[9.5px] font-bold text-holst-100 transition-colors hover:bg-white/15"
              >
                Manage
              </button>
            )}
          </li>
        ))}
      </ul>

      {!compact && (
        <div className="mx-4 mt-3 rounded-2xl bg-white/6 p-3 ring-1 ring-inset ring-white/12">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-holst-200/80">
              <Layers className="h-3.5 w-3.5" /> Bill shock vs smoothing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-holst-200/70">Sinking fund</span>
              <Switch
                checked={amortize}
                onCheckedChange={setAmortize}
                aria-label="Amortize annual fees into a sinking fund"
              />
            </span>
          </div>

          <div className="mt-3 flex h-[112px] items-end gap-2">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="relative h-[88px] w-full">
                  {/* Ghost column = the raw bill shock, sealed by a 1.5px white cap. */}
                  <div
                    className="ct-col-ghost absolute inset-x-0 bottom-0 rounded-xl"
                    style={{ height: `${r.ghostPct}%` }}
                  >
                    <div className="ct-cap absolute inset-x-0.5 top-0 rounded-full" />
                  </div>
                  {/* Solid jade = the amortized daily-smoothed portion. */}
                  <div
                    className="ct-bar-alt absolute inset-x-1.5 bottom-0 rounded-lg"
                    style={{ height: `${r.solidPct}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold text-holst-200/70">{r.mono}</span>
              </div>
            ))}
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[10px] leading-relaxed text-holst-200/60">
            <Radio className="h-3 w-3 shrink-0" />
            Ghost column = cash-out on the billing day · jade = the smoothed daily share once the fee is amortized
            Fee/12.
          </p>
        </div>
      )}
    </section>
  );
}
