'use client';

import * as React from 'react';
import { Lock, LockOpen, Timer } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskTailStrip } from '@/components/risk-tail-strip';

/**
 * Commitment devices — the 24h quarantine, soft escrows and pending sweeps.
 *
 * The quarantine card carries the Laibson present-bias markup and the risk-elastic
 * reward, so the "abandon the impulse buy" button is priced, not moralised.
 */
export function QuarantineCards() {
  const { format, localize } = useDisplayCurrency();
  const quarantines = useCtrlPayStore((s) => s.quarantines);
  const claim = useCtrlPayStore((s) => s.claimQuarantineReward);
  const release = useCtrlPayStore((s) => s.releaseQuarantine);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);

  const escrows = useCtrlPayStore((s) => s.escrows);
  const sweeps = useCtrlPayStore((s) => s.pendingSweeps);

  if (quarantines.length === 0 && escrows.length === 0 && sweeps.length === 0) return null;

  return (
    <Card className="border-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2">
          <span className="ct-well h-8 w-8 rounded-xl">
            <Lock className="h-4 w-4 text-holst-800" />
          </span>
          Commitment devices
        </CardTitle>
        <CardDescription>
          Quarantines, escrows and pending sweeps. Everything here needed your click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-2">
        {quarantines.map((q) => {
          const ready = q.status === 'READY_TO_DECIDE';
          const payable = Math.min(q.premiumReward, rewardPool);
          return (
            <div key={q.proposalId} className="rounded-[22px] bg-holst-50/80 p-3.5 ring-1 ring-inset ring-holst-950/5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-holst-950">{localize(q.targetItem)}</p>
                  <p className="text-[11px] duo-muted">
                    reward {format(q.premiumReward)}
                    <span className="text-holst-800"> (from pool {format(payable)})</span>
                  </p>
                </div>
                <Badge
                  variant={
                    q.status === 'CLAIMED'
                      ? 'success'
                      : q.status === 'RELEASED'
                        ? 'secondary'
                        : ready
                          ? 'warning'
                          : 'info'
                  }
                >
                  {q.status}
                </Badge>
              </div>

              <div className="mt-2 flex items-end gap-1 text-holst-950">
                <span className="ct-kicker self-center text-holst-800">Quarantined</span>
                <span className="ct-int text-[26px]">{format(q.itemPrice).split('.')[0]}</span>
                <span className="ct-dec text-[22px]">.{format(q.itemPrice).split('.')[1] ?? '00'}</span>
              </div>

              <RiskTailStrip amount={q.itemPrice} category="Shopping" variant="inline" className="mt-2" />

              {(q.status === 'LOCKED_24H' || ready) && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={!ready}
                    onClick={() => claim(q.proposalId)}
                    title={ready ? 'Claim reward' : 'Available after +24h'}
                  >
                    <Timer className="h-4 w-4" />
                    {ready ? 'Abandon & claim reward' : 'Locked until +24h'}
                  </Button>
                  <Button size="sm" variant="outline" disabled={!ready} onClick={() => release(q.proposalId)}>
                    <LockOpen className="h-4 w-4" /> Proceed with purchase
                  </Button>
                </div>
              )}
              {q.status === 'LOCKED_24H' && (
                <p className="mt-1.5 text-[11px] duo-muted">
                  Fast-forward the sandbox clock +24h to unlock the decision.
                </p>
              )}
            </div>
          );
        })}

        {escrows.map((e) => (
          <div key={e.proposalId} className="flex items-center justify-between gap-2 rounded-[22px] bg-holst-50/80 p-3.5 ring-1 ring-inset ring-holst-950/5">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-holst-950">
                Escrow · {e.lockedCategories.join(', ').replaceAll('_', ' ')}
              </p>
              <p className="text-[11px] duo-muted">
                -{format(e.dailyBudgetReduction)}/day for {e.durationDays} days · total{' '}
                {format(e.dailyBudgetReduction * e.durationDays)}
              </p>
            </div>
            <Badge variant={e.status === 'ACTIVE' ? 'info' : 'success'}>{e.status}</Badge>
          </div>
        ))}

        {sweeps.map((s) => (
          <div key={s.proposalId} className="flex items-center justify-between gap-2 rounded-[22px] bg-holst-50/80 p-3.5 ring-1 ring-inset ring-holst-950/5">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-holst-950">Pending sweep · {s.subscriptionId}</p>
              <p className="text-[11px] duo-muted">
                {format(s.monthlySavings)}/month · verifies on{' '}
                {new Date(s.nextBillingDate).toISOString().slice(0, 10)}
              </p>
            </div>
            <Badge
              variant={s.status === 'VERIFIED' ? 'success' : s.status === 'NOT_VERIFIED' ? 'danger' : 'warning'}
            >
              {s.status === 'PENDING_NEXT_BILLING_VERIFICATION' ? 'PENDING' : s.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
