'use client';

import * as React from 'react';
import { AlertTriangle, Lock, ShieldAlert, Wallet } from 'lucide-react';
import { useCtrlPayStore, type PaymentIntent } from '@/lib/store';
import { requestProposal, submitDecision } from '@/lib/api-client';
import { approveProposal, passkeyAuthorizationRef } from '@/lib/tool-resolution';
import { formatDisplayCurrency } from '@/lib/currency-ppp';
import { PasskeySigningPulse } from '@/components/biometric-passkey-gate';
import { formatRM } from '@/lib/utils';
import type { WhatIfResult } from '@/lib/domain';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RiskTailStrip } from '@/components/risk-tail-strip';
import { TierGateHint } from '@/components/tier-gate-hint';

interface Units {
  mixedRiceMeals: number;
  bubbleTea: number;
}

export function PaymentInterceptorModal() {
  const events = useCtrlPayStore((s) => s.events);
  const dismissEvent = useCtrlPayStore((s) => s.dismissEvent);
  const applyDecision = useCtrlPayStore((s) => s.applyDecision);
  const proceedPayment = useCtrlPayStore((s) => s.proceedPayment);
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const displayCurrency = useCtrlPayStore((s) => s.displayCurrency);

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [signing, setSigning] = React.useState<string | null>(null);

  const found = [...events].reverse().find((e) => e.type === 'PAYMENT_INTERCEPT');
  if (!found) return null;
  const intercept = found; // narrowed, stable for use inside async handlers

  const intent = intercept.payload.intent as PaymentIntent;
  const result = intercept.payload.result as WhatIfResult;
  const units = intercept.payload.units as Units;
  const isWant = !intent.isNeed;

  async function acceptQuarantine() {
    setBusy(true);
    setError(null);
    try {
      const proposal = await requestProposal('QUARANTINE', {
        targetItem: `${intent.merchant} ${formatRM(intent.amount)}`,
        itemPrice: intent.amount,
        category: intent.category,
      });
      const authorizationRef = passkeyAuthorizationRef(proposal.proposalId);
      setSigning(proposal.proposalId);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSigning(null);
      await submitDecision(
        proposal,
        approveProposal(proposal.proposalId, proposal.terms, authorizationRef).decision!,
      );
      applyDecision({ ...proposal, status: 'APPROVED' }, 'APPROVED', undefined, authorizationRef);
      dismissEvent(intercept.id);
    } catch (e) {
      setSigning(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function acceptEscrow() {
    setBusy(true);
    setError(null);
    try {
      const proposal = await requestProposal('ESCROW', {
        targetItem: `${intent.merchant} ${formatRM(intent.amount)}`,
        itemPrice: intent.amount,
        lockedCategories: [intent.category],
        durationDays: 7,
      });
      const authorizationRef = passkeyAuthorizationRef(proposal.proposalId);
      setSigning(proposal.proposalId);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSigning(null);
      await submitDecision(
        proposal,
        approveProposal(proposal.proposalId, proposal.terms, authorizationRef).decision!,
      );
      applyDecision({ ...proposal, status: 'APPROVED' }, 'APPROVED', undefined, authorizationRef);
      dismissEvent(intercept.id);
    } catch (e) {
      setSigning(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col justify-end bg-[rgba(4,34,43,0.45)] backdrop-blur-[2px]"
      onClick={() => dismissEvent(intercept.id)}
    >
      <PasskeySigningPulse active={signing !== null} proposalId={signing} />
      <Card
        className="flex max-h-full w-full animate-sheet-up flex-col overflow-hidden rounded-b-none rounded-t-[30px] border-0 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pt-3">
          <span className="ct-grabber" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-[#04222B]">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FDECEC] text-[#B3253F]">
                <ShieldAlert className="h-4 w-4" />
              </span>
              Payment intercepted
            </CardTitle>
            <CardDescription>
              CtrlPay ran a Cash-Flow-at-Risk simulation before the payment completed.
            </CardDescription>
          </div>
          <Badge variant={result.riskLevel === 'CRITICAL' ? 'danger' : 'warning'}>{result.riskLevel}</Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl bg-holst-50/70 p-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-holst-600" />
              <div>
                <p className="text-sm font-bold">
                  {intent.merchant} · {formatRM(intent.amount)}
                </p>
                <p className="text-[11px] duo-muted">{intent.category.replaceAll('_', ' ')}</p>
              </div>
            </div>
            <div className="text-right text-[11px] duo-muted">
              <p>
                ≈ {units.mixedRiceMeals} mixed-rice meals
              </p>
              <p>≈ {units.bubbleTea} bubble tea</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-holst-50/70 p-2.5">
              <p className="text-[10px] duo-muted">Shortfall prob.</p>
              <p className="duo-num text-[13px] font-bold">{result.shortfallProbability}%</p>
            </div>
            <div className="rounded-2xl bg-holst-50/70 p-2.5">
              <p className="text-[10px] duo-muted">CFaR 95</p>
              <p className="duo-num text-[13px] font-bold">
                {formatDisplayCurrency(result.cfar95, displayCurrency)}
              </p>
            </div>
            <div className="rounded-2xl bg-holst-50/70 p-2.5">
              <p className="text-[10px] duo-muted">Projected month-end</p>
              <p className="duo-num text-[13px] font-bold">
                {formatDisplayCurrency(result.projectedMonthEndBalance, displayCurrency)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-holst-50/70 p-2.5">
              <p className="text-[10px] duo-muted">ES95 tail risk</p>
              <p className="duo-num text-[13px] font-bold text-holst-600">
                {formatDisplayCurrency(result.es95, displayCurrency)}
              </p>
            </div>
            <div className="rounded-2xl bg-holst-50/70 p-2.5">
              <p className="text-[10px] duo-muted">NSF dip risk</p>
              <p
                className={
                  result.intraMonthLiquidityBreachProb > 0
                    ? 'duo-num text-[13px] font-bold text-[#B3253F]'
                    : 'duo-num text-[13px] font-bold text-holst-600'
                }
              >
                {result.intraMonthLiquidityBreachProb}%
              </p>
            </div>
            <div className="rounded-2xl bg-holst-50/70 p-2.5">
              <p className="text-[10px] duo-muted">Path floor (5th pct.)</p>
              <p className="duo-num text-[13px] font-bold">
                {formatDisplayCurrency(result.lowestProjectedBalanceRM, displayCurrency)}
              </p>
            </div>
          </div>

          <RiskTailStrip
            amount={intent.amount}
            category={intent.category}
            isNeed={intent.isNeed}
            result={result}
            variant="inline"
          />

          {(result.limitBreach.weekly || result.limitBreach.monthly) && (
            <p className="flex items-center gap-2 text-xs font-semibold text-[#B3253F]">
              <AlertTriangle className="h-4 w-4" /> This breaches your{' '}
              {result.limitBreach.weekly ? 'weekly' : 'monthly'} User Spending Limit.
            </p>
          )}

          {result.lowHistoryWarning && (
            <p className="text-xs font-semibold text-[#8A5408]">Based on limited history, estimate only.</p>
          )}

          {!masterAutonomyEnabled && (
            <p className="duo-warning p-2.5 text-xs">
              Master Autonomy is OFF, so Lock/Escrow (T3) is blocked. Turn it on in the ⚡ Sandbox drawer to
              accept a contract. You can still proceed or dismiss.
            </p>
          )}

          {error && <p className="rounded-2xl bg-[#FDE7EC] p-2.5 text-xs text-[#B3253F]">{error}</p>}
          <TierGateHint error={error} />

          <p className="text-xs duo-muted">
            You are always in control. Nothing moves until you click.
          </p>

          <div className="flex flex-wrap gap-2">
            {isWant && (
              <Button size="sm" disabled={busy} onClick={acceptQuarantine}>
                <Lock className="h-4 w-4" /> 24h Quarantine
              </Button>
            )}
            {isWant && (
              <Button size="sm" variant="secondary" disabled={busy} onClick={acceptEscrow}>
                <Lock className="h-4 w-4" /> Wants-Category Escrow
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                proceedPayment(intent);
              }}
            >
              Proceed anyway
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => dismissEvent(intercept.id)}>
              Dismiss
            </Button>
          </div>
        </CardContent>
        </div>
      </Card>
    </div>
  );
}
