'use client';

import {
  CURRENCY_CODES,
  CURRENCY_PPP_REGISTRY,
} from '@/lib/currency-ppp';
import { useCtrlPayStore } from '@/lib/store';
import { cn } from '@/lib/utils';

/**
 * Compact display-currency switcher.
 *
 * Switching NEVER mutates the ledger or any engine input — the store keeps every
 * amount in MYR and only the render layer maps it through `formatDisplayCurrency`.
 * Each switch appends a T0 read-only `CURRENCY_VIEW_SWITCH` audit entry.
 */
export function CurrencySwitcherPill({ className }: { className?: string }) {
  const displayCurrency = useCtrlPayStore((s) => s.displayCurrency);
  const setDisplayCurrency = useCtrlPayStore((s) => s.setDisplayCurrency);
  const active = CURRENCY_PPP_REGISTRY[displayCurrency];

  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      <div
        role="group"
        aria-label="Display currency (base ledger stays in MYR)"
        className="inline-flex items-center gap-0.5 rounded-full border border-[#18181B]/10 bg-white/90 p-1 shadow-[0_4px_16px_rgba(11,30,63,0.06)]"
      >
        {CURRENCY_CODES.map((code) => {
          const p = CURRENCY_PPP_REGISTRY[code];
          const on = code === displayCurrency;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setDisplayCurrency(code)}
              aria-pressed={on}
              title={`${p.regionLabel} · local canteen meal ${p.symbol}${p.localCanteenMealCost.toFixed(2)}`}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-extrabold transition-colors',
                on
                  ? 'bg-[#0B1E3F] text-white shadow-sm'
                  : 'text-[#0B1E3F]/60 hover:bg-[#0B1E3F]/5',
              )}
            >
              <span aria-hidden>{p.flag}</span>
              <span>{p.symbol}</span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-[9.5px] font-medium leading-tight text-[#64748B]">
        {active.regionLabel} · local canteen {active.symbol} {active.localCanteenMealCost.toFixed(2)}
        /meal · base ledger MYR
      </p>
    </div>
  );
}
