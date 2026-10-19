'use client';

import * as React from 'react';
import {
  Check,
  GraduationCap,
  Info,
  Lock,
  RefreshCw,
  ShieldCheck,
  Timer,
  X,
} from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { requestProposal, submitDecision } from '@/lib/api-client';
import { syncServerAudit } from '@/lib/audit-sync';
import {
  approveProposal,
  declineProposal,
  dismissProposal,
  modifyProposal,
  passkeyAuthorizationRef,
} from '@/lib/tool-resolution';
import { PasskeySigningPulse } from '@/components/biometric-passkey-gate';
import { formatRM } from '@/lib/utils';
import type { SignedProposal, EscrowTerms, ModifiedTerms, QuarantineTerms, SweepTerms } from '@/lib/types';
import type { SpendCategory } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { RiskTailStrip } from '@/components/risk-tail-strip';
import { TierGateHint } from '@/components/tier-gate-hint';

export interface CardProps {
  toolCallId: string;
  args: Record<string, unknown>;
  result?: unknown;
  addToolResult: (opts: { toolCallId: string; result: unknown }) => void;
}

type Kind = 'QUARANTINE' | 'ESCROW' | 'SWEEP';

/**
 * Shared lifecycle for the three interactive contract cards.
 *
 * 1. POST /api/proposals to obtain a SERVER-SIGNED proposal (terms + integrity hash).
 * 2. Approve / Modify / Decline -> POST /api/proposals/:id/decision (T3 gate).
 * 3. Apply the decision to the sandbox store.
 * 4. ALWAYS call addToolResult so the conversation can continue.
 */
function useProposalCard(kind: Kind, args: Record<string, unknown>, toolCallId: string, result: unknown, addToolResult: CardProps['addToolResult']) {
  const applyDecision = useCtrlPayStore((s) => s.applyDecision);
  const masterAutonomyEnabled = useCtrlPayStore((s) => s.masterAutonomyEnabled);

  const [proposal, setProposal] = React.useState<SignedProposal | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [signing, setSigning] = React.useState(false);
  const resolvedRef = React.useRef(Boolean(result));
  const mountedAtRef = React.useRef(Date.now());
  const proposalIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    requestProposal(kind, args)
      .then((p) => {
        if (!cancelled) {
          proposalIdRef.current = p.proposalId;
          setProposal(p);
        }
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, toolCallId]);

  const finish = React.useCallback(
    (payload: Record<string, unknown>) => {
      resolvedRef.current = true;
      addToolResult({ toolCallId, result: payload });
    },
    [addToolResult, toolCallId],
  );

  // Guaranteed resolution: if the card unmounts before a decision, resolve with DISMISSED.
  // The 600ms guard avoids firing during React StrictMode's dev double-mount.
  React.useEffect(() => {
    return () => {
      // Reading the ref at cleanup time is intentional here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (!resolvedRef.current && Date.now() - mountedAtRef.current > 600) {
        resolvedRef.current = true;
        addToolResult({ toolCallId, result: dismissProposal(proposalIdRef.current).resolution });
      }
    };
  }, [addToolResult, toolCallId]);

  async function decide(status: 'APPROVED' | 'DECLINED' | 'MODIFIED', newTerms?: ModifiedTerms) {
    if (!proposal) return;
    setBusy(true);
    setError(null);
    try {
      // T3 signing runs through the simulated device passkey gate: a 0.5s
      // "Verifying Device FIDO2 Passkey (Face ID)" pulse, then a structured
      // FIDO2 authorization ref is attached to the decision and the audit entry.
      const ref =
        status === 'DECLINED' ? undefined : passkeyAuthorizationRef(proposal.proposalId);
      if (ref) {
        setSigning(true);
        await new Promise((resolve) => setTimeout(resolve, 500));
        setSigning(false);
      }

      const built =
        status === 'APPROVED'
          ? approveProposal(proposal.proposalId, proposal.terms, ref)
          : status === 'MODIFIED'
            ? modifyProposal(proposal.proposalId, newTerms ?? {}, proposal.terms, ref)
            : declineProposal(proposal.proposalId);

      if (!built.decision) throw new Error('DECISION_MISSING');

      const out = await submitDecision(proposal, built.decision);
      if (status !== 'DECLINED') {
        applyDecision(out.proposal, status, newTerms, ref);
      }
      // Fold the server-recorded AGENT decision entry into the local audit chain.
      void syncServerAudit();
      finish({
        ...built.resolution,
        proposalId: proposal.proposalId,
        authorizationRef: out.authorizationRef,
        terms: out.proposal.terms,
      });
    } catch (e) {
      setSigning(false);
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return { proposal, error, busy, signing, decided: Boolean(result), masterAutonomyEnabled, decide };
}

function DecisionButtons({
  children,
  onApprove,
  onDecline,
  busy,
  approveLabel,
  disabled,
  signing,
  proposalId,
}: {
  children?: React.ReactNode;
  onApprove: () => void;
  onDecline: () => void;
  busy: boolean;
  approveLabel: string;
  disabled?: boolean;
  signing?: boolean;
  proposalId?: string | null;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <PasskeySigningPulse active={Boolean(signing)} proposalId={proposalId} />
      <Button size="sm" disabled={busy || disabled} onClick={onApprove}>
        <Check className="h-4 w-4" /> {approveLabel}
      </Button>
      {children}
      <Button size="sm" variant="ghost" disabled={busy} onClick={onDecline}>
        <X className="h-4 w-4" /> Decline
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Quarantine                                                          */
/* ------------------------------------------------------------------ */

export function QuarantineCard({ toolCallId, args, result, addToolResult }: CardProps) {
  const { proposal, error, busy, signing, decided, masterAutonomyEnabled, decide } = useProposalCard(
    'QUARANTINE',
    args,
    toolCallId,
    result,
    addToolResult,
  );
  const terms = proposal?.terms.kind === 'QUARANTINE' ? (proposal.terms as QuarantineTerms) : null;

  if (decided) {
    const r = result as { status?: string } | undefined;
    return (
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Quarantine decision recorded: {r?.status ?? 'RESOLVED'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-4 w-4" /> 24h Commitment Quarantine
        </CardTitle>
        <CardDescription>
          Signed, server-computed terms. Nothing is locked until you click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!proposal && !error && <p className="text-xs text-muted-foreground">Computing signed terms…</p>}
        {error && <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
        <TierGateHint error={error} />
        {terms && (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{terms.targetItem}</p>
                <p className="text-xs text-muted-foreground">{formatRM(terms.itemPrice)}</p>
              </div>
              <Badge variant={terms.riskLevel === 'CRITICAL' ? 'danger' : 'warning'}>{terms.riskLevel}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border p-2">
                <p className="text-[11px] text-muted-foreground">Reward if you wait</p>
                <p className="text-sm font-semibold">{formatRM(terms.premiumReward)}</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-[11px] text-muted-foreground">Shortfall prob.</p>
                <p className="text-sm font-semibold">{terms.shortfallProbability}%</p>
              </div>
              <div className="rounded-md border p-2">
                <p className="text-[11px] text-muted-foreground">CFaR 95</p>
                <p className="text-sm font-semibold">{formatRM(terms.cfar95)}</p>
              </div>
            </div>
            <RiskTailStrip
              amount={terms.itemPrice}
              category={
                typeof args.category === 'string' ? (args.category as SpendCategory) : 'Shopping'
              }
              isNeed={false}
              variant="grid"
            />
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Info className="h-3 w-3" /> Locks for {terms.quarantineHours}h. After that you choose: claim the
              reward or proceed with the purchase.
            </p>
            <p className="flex">
              <span className="cp-chip cp-chip-indigo">
                <ShieldCheck className="h-3 w-3" /> Principal 100% yours · Zero penalty escape hatch
              </span>
            </p>
            {!masterAutonomyEnabled && (
              <p className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">
                Master Autonomy is OFF — approving a Quarantine is blocked. Turn it on in the Simulation Toolbar.
              </p>
            )}
            <DecisionButtons
              busy={busy}
              signing={signing}
              proposalId={proposal?.proposalId}
              approveLabel="Accept 24h Quarantine (T3)"
              onApprove={() => decide('APPROVED')}
              onDecline={() => decide('DECLINED')}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Escrow                                                              */
/* ------------------------------------------------------------------ */

export function EscrowCard({ toolCallId, args, result, addToolResult }: CardProps) {
  const { proposal, error, busy, signing, decided, masterAutonomyEnabled, decide } = useProposalCard(
    'ESCROW',
    args,
    toolCallId,
    result,
    addToolResult,
  );
  const base = proposal?.terms.kind === 'ESCROW' ? (proposal.terms as EscrowTerms) : null;

  const [durationDays, setDurationDays] = React.useState<number>(base?.durationDays ?? 7);
  const [reduction, setReduction] = React.useState<number>(base?.dailyBudgetReduction ?? 1);

  React.useEffect(() => {
    if (base) {
      setDurationDays(base.durationDays);
      setReduction(base.dailyBudgetReduction);
    }
  }, [base]);

  if (decided) {
    const r = result as { status?: string } | undefined;
    return (
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Escrow decision recorded: {r?.status ?? 'RESOLVED'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-4 w-4" /> WANTS-Category Budget Escrow
        </CardTitle>
        <CardDescription>
          Locks only WANTS categories. Your NEEDS daily survival floor is protected by the engine.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!base && !error && <p className="text-xs text-muted-foreground">Computing signed terms…</p>}
        {error && <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
        <TierGateHint error={error} />
        {base && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline">{base.targetItem}</Badge>
              <Badge variant="outline">{base.lockedCategories.join(', ').replaceAll('_', ' ')}</Badge>
              <Badge variant="outline">max {formatRM(base.maxAllowedReduction)}/day</Badge>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between text-xs">
                <span>Duration</span>
                <span className="font-medium">{durationDays} days</span>
              </div>
              <Slider
                value={durationDays}
                min={1}
                max={14}
                step={1}
                onValueChange={setDurationDays}
                aria-label="Escrow duration in days"
              />
              <div className="flex items-center justify-between text-xs">
                <span>Daily budget reduction</span>
                <span className="font-medium">{formatRM(reduction)}/day</span>
              </div>
              <Slider
                value={reduction}
                min={0.1}
                max={Math.max(0.1, base.maxAllowedReduction)}
                step={0.1}
                onValueChange={setReduction}
                aria-label="Daily budget reduction"
              />
              <p className="text-[11px] text-muted-foreground">
                Total locked ≈ {formatRM(reduction * durationDays)} · capped by the 40% rule, the RM 15 survival
                floor and the AI Mandate.
              </p>
            </div>

            <RiskTailStrip
              amount={base.itemPrice}
              category={(base.lockedCategories[0] ?? 'Shopping') as SpendCategory}
              isNeed={false}
              variant="grid"
            />
            <p className="flex">
              <span className="cp-chip cp-chip-indigo">
                <ShieldCheck className="h-3 w-3" /> Principal 100% yours · Zero penalty escape hatch
              </span>
            </p>

            {!masterAutonomyEnabled && (
              <p className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">
                Master Autonomy is OFF — approving an Escrow is blocked.
              </p>
            )}

            <DecisionButtons
              busy={busy}
              signing={signing}
              proposalId={proposal?.proposalId}
              approveLabel="Accept Escrow (T3)"
              onApprove={() => decide('APPROVED')}
              onDecline={() => decide('DECLINED')}
            >
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => decide('MODIFIED', { durationDays, dailyBudgetReduction: reduction })}
              >
                <RefreshCw className="h-4 w-4" /> Save my terms
              </Button>
            </DecisionButtons>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Sweep                                                               */
/* ------------------------------------------------------------------ */

export function SweepCard({ toolCallId, args, result, addToolResult }: CardProps) {
  const { proposal, error, busy, signing, decided, masterAutonomyEnabled, decide } = useProposalCard(
    'SWEEP',
    args,
    toolCallId,
    result,
    addToolResult,
  );
  const terms = proposal?.terms.kind === 'SWEEP' ? (proposal.terms as SweepTerms) : null;

  if (decided) {
    const r = result as { status?: string } | undefined;
    return (
      <Card className="border-emerald-200 bg-emerald-50/60">
        <CardContent className="flex items-center gap-2 p-3 text-xs text-emerald-800">
          <ShieldCheck className="h-4 w-4" /> Sweep decision recorded: {r?.status ?? 'RESOLVED'}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-sky-200">
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4" /> Subscription Sweep
        </CardTitle>
        <CardDescription>
          Two-stage settlement: nothing moves until the next billing date proves the saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!terms && !error && <p className="text-xs text-muted-foreground">Computing signed terms…</p>}
        {error && <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{error}</p>}
        <TierGateHint error={error} />
        {terms && (
          <>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">{terms.merchantName}</p>
                <p className="text-xs text-muted-foreground">
                  {terms.action === 'STUDENT_DOWNGRADE' ? 'Student downgrade' : 'Cancel'} · saves{' '}
                  {formatRM(terms.monthlySavings)}/mo
                </p>
              </div>
              <Badge variant="success">{formatRM(terms.annualSavings)}/yr</Badge>
            </div>
            {terms.requiresStudentEmailOTP && (
              <p className="text-[11px] text-muted-foreground">
                Requires student email verification — use the Zombie Radar “Student downgrade” drawer.
              </p>
            )}
            <p className="flex">
              <span className="cp-chip cp-chip-indigo">
                <ShieldCheck className="h-3 w-3" /> Principal 100% yours · Zero penalty escape hatch
              </span>
            </p>
            {!masterAutonomyEnabled && (
              <p className="rounded-md bg-secondary p-2 text-xs text-muted-foreground">
                Master Autonomy is OFF — approving a Sweep is blocked.
              </p>
            )}
            <DecisionButtons
              busy={busy}
              signing={signing}
              proposalId={proposal?.proposalId}
              approveLabel="Approve sweep (T3)"
              onApprove={() => decide('APPROVED')}
              onDecline={() => decide('DECLINED')}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
