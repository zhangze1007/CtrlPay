'use client';

import * as React from 'react';
import { CalendarClock, FastForward, Radar, SkipForward, Smartphone, Timer, Zap } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { PAYMENT_EVENTS } from '@/lib/mock-data';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import type { PermissionTier } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';

function formatClock(ms: number): string {
  return `${new Date(ms).toISOString().replace('T', ' ').slice(0, 16)} UTC`;
}

const TIER_INFO: Array<{ tier: PermissionTier; label: string; hint: string }> = [
  { tier: 'T0', label: 'T0 Read-only insights', hint: 'Always on. Analysis, CFaR, Zombie Radar.' },
  { tier: 'T1', label: 'T1 Low-risk organization', hint: 'Tagging, reminders, suspected-zombie flags.' },
  { tier: 'T2', label: 'T2 Assisted preparation', hint: 'Draft mailto: cancellations, deep-link drawers.' },
  { tier: 'T3', label: 'T3 Financial state change', hint: 'Always requires an explicit per-action click.' },
];

/** Phase 9 numbered dock section header (1. Time Machine, 2. Webhooks, 3. Tier matrix). */
function SectionLabel({ n, title, hint }: { n: number; title: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#18181B]/10 pb-1.5">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#18181B] text-[10px] font-black text-white">
        {n}
      </span>
      <p className="text-xs font-bold">{title}</p>
      {hint && <p className="ml-auto font-mono text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Judge simulation dock (Phase 9 restyle).
 *
 * Purely presentational regrouping into the numbered narrative the judges follow:
 * 1. Time Machine · 2. Checkout Webhook Triggers · 3. Autonomy & Tier Matrix.
 * All controls, labels and store actions are unchanged.
 */
export function SimulationToolbar({
  onOpenQuickLog,
  onOpenRadar,
}: {
  onOpenQuickLog?: () => void;
  onOpenRadar?: () => void;
}) {
  const { format } = useDisplayCurrency();
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const advanceClock = useCtrlPayStore((s) => s.advanceClock);
  const jumpToMonthEnd = useCtrlPayStore((s) => s.jumpToMonthEnd);
  const simulatePaymentIntent = useCtrlPayStore((s) => s.simulatePaymentIntent);
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);
  const enabledTiers = useCtrlPayStore((s) => s.enabledTiers);
  const setTier = useCtrlPayStore((s) => s.setTier);
  const plan = useCtrlPayStore((s) => s.plan);
  const setPlan = useCtrlPayStore((s) => s.setPlan);

  return (
    <Card className="dock-card">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Judge simulation dock
          </CardTitle>
          <CardDescription>
            Deterministic sandbox controls — every button writes an audit entry.
          </CardDescription>
        </div>
        <Badge variant="outline" className="font-mono">
          {masterAutonomyEnabled ? 'AUTONOMY ON' : 'T0 ADVISORY ONLY'}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        <section className="space-y-2">
          <SectionLabel n={1} title="Time Machine" hint={formatClock(sandboxClock)} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => advanceClock(24)}>
              <FastForward className="h-4 w-4" /> +24 Hours
            </Button>
            <Button size="sm" variant="outline" onClick={() => advanceClock(24 * 7)}>
              <FastForward className="h-4 w-4" /> +7 Days
            </Button>
            <Button size="sm" variant="outline" onClick={() => jumpToMonthEnd()}>
              <SkipForward className="h-4 w-4" /> Jump to Month-End
            </Button>
            {onOpenQuickLog && (
              <Button
                size="sm"
                className="bg-amber-500 text-zinc-950 hover:bg-amber-400"
                onClick={onOpenQuickLog}
              >
                <Smartphone className="h-4 w-4" /> Back-Tap Quick Log (2× tap B)
              </Button>
            )}
            {onOpenRadar && (
              <Button size="sm" variant="secondary" onClick={onOpenRadar}>
                <Radar className="h-4 w-4" /> Zombie Radar console
              </Button>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <SectionLabel n={2} title="Checkout Webhook Triggers" hint="mock Open Banking / merchant events" />
          <div className="flex flex-wrap gap-2">
            {PAYMENT_EVENTS.map((ev) => (
              <Button
                key={ev.id}
                size="sm"
                variant={ev.merchant === 'Shopee' ? 'destructive' : 'secondary'}
                onClick={() =>
                  simulatePaymentIntent({
                    merchant: ev.merchant,
                    amount: ev.amount,
                    category: ev.category,
                    isNeed: ev.isNeed,
                  })
                }
              >
                <Zap className="h-4 w-4" />
                Simulate {ev.merchant} {format(ev.amount)}
                {ev.merchant === 'Shopee' ? ' Impulse Buy' : ' Checkout'}
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <SectionLabel n={3} title="Autonomy & Tier Matrix" hint="default OFF · T3 always needs a click" />
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#18181B]/10 bg-white p-3">
            <div>
              <p className="text-sm font-medium">Master AI Autonomy Switch</p>
              <p className="text-xs text-muted-foreground">
                Default OFF. When OFF, CtrlPay runs T0 advisory/analysis mode only.
              </p>
            </div>
            <Switch
              checked={masterAutonomyEnabled}
              onCheckedChange={setMasterAutonomy}
              aria-label="Master AI Autonomy Switch"
            />
          </div>

          <div className="space-y-2 pt-1">
            {TIER_INFO.map(({ tier, label, hint }) => {
              const isMasterDependent = tier !== 'T0';
              const disabled = tier === 'T0' || !masterAutonomyEnabled;
              const checked = tier === 'T0' ? true : enabledTiers[tier];
              return (
                <div key={tier} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                  <Switch
                    checked={tier === 'T3' ? false : checked}
                    disabled={disabled || tier === 'T3'}
                    onCheckedChange={(v) => setTier(tier, v)}
                    aria-label={`${tier} toggle`}
                    className={isMasterDependent ? '' : 'opacity-60'}
                  />
                </div>
              );
            })}
            <p className="text-[11px] text-muted-foreground">
              T3 is never toggleable: it always needs an explicit per-action confirmation click.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#18181B]/10 bg-white p-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium">
                <Timer className="h-4 w-4" /> Plan (gates Pro modules only)
              </p>
              <p className="text-xs text-muted-foreground">
                Safety modules are never gated by the plan flag.
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant={plan === 'FREE' ? 'default' : 'outline'} onClick={() => setPlan('FREE')}>
                Free
              </Button>
              <Button size="sm" variant={plan === 'PRO' ? 'default' : 'outline'} onClick={() => setPlan('PRO')}>
                Pro
              </Button>
            </div>
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
