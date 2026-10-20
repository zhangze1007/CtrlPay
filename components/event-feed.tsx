'use client';

import * as React from 'react';
import { Bell, Flame, ShieldCheck, Timer, X } from 'lucide-react';
import { useCtrlPayStore, type SandboxEvent } from '@/lib/store';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { formatRM } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const INLINE_TYPES: SandboxEvent['type'][] = [
  'DAILY_SUMMARY',
  'SWEEP_VERIFIED',
  'SWEEP_NOT_VERIFIED',
  'QUARANTINE_READY',
  'QUARANTINE_CLAIMED',
  'QUARANTINE_RELEASED',
  'ESCROW_STARTED',
  'ESCROW_COMPLETED',
  'MONTH_END_ROAST',
  'PAYMENT_OK',
  'BOOKING',
];

interface Units {
  mixedRiceMeals: number;
  bubbleTea: number;
}

function describe(e: SandboxEvent): { title: string; body: string; variant: 'info' | 'success' | 'warning' | 'danger' } {
  const p = e.payload as Record<string, unknown>;
  switch (e.type) {
    case 'DAILY_SUMMARY': {
      const units = p.units as Units;
      return {
        title: '12:00 PM Daily Spending Summary',
        body: `Spent ~${formatRM(Number(p.spentToday))} today · today's allowance ${formatRM(
          Number(p.allowance),
        )} · ${units.mixedRiceMeals} mixed-rice meals / ${units.bubbleTea} bubble tea.`,
        variant: 'info',
      };
    }
    case 'SWEEP_VERIFIED':
      return {
        title: 'Subscription sweep verified',
        body: `Savings ${formatRM(Number(p.monthlySavings))} moved to the Defense Vault after the next billing date was crossed.`,
        variant: 'success',
      };
    case 'SWEEP_NOT_VERIFIED':
      return {
        title: 'No change detected',
        body: 'Savings not counted. The old price was still charged on the next billing date.',
        variant: 'warning',
      };
    case 'QUARANTINE_READY':
      return {
        title: 'Quarantine ready to decide',
        body: `24 hours passed for "${String(p.targetItem)}". Claim your reward or proceed with the purchase.`,
        variant: 'warning',
      };
    case 'QUARANTINE_CLAIMED':
      return {
        title: 'Reward claimed',
        body: `${formatRM(Number(p.reward))} moved from the rewardPool to the Defense Vault. Nice one.`,
        variant: 'success',
      };
    case 'QUARANTINE_RELEASED':
      return {
        title: 'Purchase released',
        body: `You chose to proceed with "${String(p.targetItem)}". No reward paid.`,
        variant: 'info',
      };
    case 'ESCROW_STARTED':
      return {
        title: 'Escrow active',
        body: 'WANTS-category budget lock started. Your NEEDS floor is protected.',
        variant: 'success',
      };
    case 'ESCROW_COMPLETED':
      return { title: 'Escrow completed', body: 'The budget lock has ended.', variant: 'success' };
    case 'MONTH_END_ROAST': {
      const units = p.units as Units;
      return {
        title: `Month-End Subscription Roast (${String(p.tone ?? 'GENTLE')})`,
        body: `Wasted subscription spend ~${formatRM(
          Number(p.wastedMonthly),
        )}/month (${formatRM(Number(p.wastedAnnual))}/year) · about ${units.mixedRiceMeals} USM cafeteria mixed-rice meals a month.`,
        variant: 'danger',
      };
    }
    case 'BOOKING': {
      const units = p.units as Units;
      return {
        title: `Booked: ${String(p.merchant)}`,
        body: `${formatRM(Number(p.amount))} · ${String(p.category).replaceAll('_', ' ')} · ${
          p.isNeed ? 'NEED' : 'WANT'
        } · ${units.mixedRiceMeals} mixed-rice meals.`,
        variant: 'success',
      };
    }
    case 'PAYMENT_OK':
      return {
        title: 'Looks fine',
        body: `Today's allowance after this: ${formatRM(
          Number((p.result as { dynamicDailyAllowance?: number })?.dynamicDailyAllowance ?? 0),
        )}.`,
        variant: 'info',
      };
    default:
      return { title: e.type, body: '', variant: 'info' };
  }
}

export function EventFeed({ bare = false }: { bare?: boolean } = {}) {
  const { localize } = useDisplayCurrency();
  const events = useCtrlPayStore((s) => s.events);
  const dismissEvent = useCtrlPayStore((s) => s.dismissEvent);

  const inline = events.filter((e) => INLINE_TYPES.includes(e.type));

  const rows = inline
    .slice(-6)
    .reverse()
    .map((e) => {
      const d = describe(e);
      const Icon = e.type === 'MONTH_END_ROAST' ? Flame : e.type === 'QUARANTINE_READY' ? Timer : ShieldCheck;
      return (
        <div key={e.id} className="flex items-start justify-between gap-2 rounded-2xl bg-holst-50/70 p-3">
          <div className="flex min-w-0 gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-holst-600" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-bold">{d.title}</p>
                <Badge variant={d.variant}>{e.type}</Badge>
              </div>
              <p className="text-[11px] leading-snug duo-muted">{localize(d.body)}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => dismissEvent(e.id)} aria-label={`Dismiss ${e.type}`}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    });

  if (bare) {
    return (
      <div className="space-y-2">
        {rows.length > 0 ? (
          rows
        ) : (
          <p className="rounded-2xl bg-[#F4F8F7] px-3 py-4 text-center text-[11px] duo-muted">
            Nothing yet — events appear as the sandbox clock advances and settlements resolve.
          </p>
        )}
      </div>
    );
  }

  return (
    <Card className="border-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="ct-well h-8 w-8 rounded-xl">
            <Bell className="h-4 w-4 text-holst-800" />
          </span>
          Proactive events
        </CardTitle>
        <CardDescription>Time-triggered and settlement events from the sandbox clock.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-2">
        {rows.length > 0 ? (
          rows
        ) : (
          <p className="rounded-2xl bg-[#F4F8F7] px-3 py-4 text-center text-[11px] duo-muted">
            Nothing yet — advance the sandbox clock or inject a payment and the agent&apos;s proactive events land
            here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
