'use client';

import * as React from 'react';
import {
  BadgeCheck,
  ExternalLink,
  GraduationCap,
  Mail,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { SUBSCRIPTION_REGISTRY, type SubscriptionId } from '@/lib/subscription-registry';
import { calculateSubscriptionMetrics } from '@/lib/quant-engine';
import { buildMailto, requestProposal, submitDecision } from '@/lib/api-client';
import { approveProposal, passkeyAuthorizationRef } from '@/lib/tool-resolution';
import { PasskeySigningPulse } from '@/components/biometric-passkey-gate';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn, formatRM } from '@/lib/utils';

interface Props {
  subscriptionId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Assisted cancellation / student-downgrade sheet (T2 preparation + T3 click).
 *
 * Two channels, both whitelist-driven:
 *   A. Deep link — the ONLY URL shown, read from `SUBSCRIPTION_REGISTRY`.
 *   B. In-app email preview — the mailto body is rendered before the user sends it,
 *      so judges (with no default mail client) can still see the full draft.
 *
 * Nothing is ever sent by CtrlPay. "I've sent it" writes a PENDING sweep, and the
 * saved amount only enters the Defense Vault after the next billing date verifies.
 */
export function SubscriptionCancelEmailSheet({ subscriptionId, open, onClose }: Props) {
  const entry = SUBSCRIPTION_REGISTRY[subscriptionId as SubscriptionId];
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);
  const setStudentVerified = useCtrlPayStore((s) => s.setStudentVerified);
  const applyDecision = useCtrlPayStore((s) => s.applyDecision);
  const profile = useCtrlPayStore((s) => s.profile);

  const [otp, setOtp] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [signing, setSigning] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setOtp('');
      setError(null);
      setDone(false);
      setBusy(false);
    }
  }, [open, subscriptionId]);

  if (!open || !entry) return null;

  const metrics = calculateSubscriptionMetrics({
    fullPriceRM: entry.fullPriceRM,
    studentPriceRM: entry.studentPriceRM,
  });
  const mailto = entry.mailtoTemplate ? buildMailto(entry.mailtoTemplate, profile) : null;
  const annualCancelSavings = entry.fullPriceRM * 12;
  const needsOtp = entry.requiresStudentEmailOTP && entry.studentPriceRM !== null && !studentVerified;

  function verifyOtp() {
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your student email (any 6 digits work in the sandbox).');
      return;
    }
    setStudentVerified(true);
    setError(null);
  }

  async function confirmSweep(action: 'STUDENT_DOWNGRADE' | 'CANCEL') {
    setBusy(true);
    setError(null);
    try {
      const proposal = await requestProposal('SWEEP', { subscriptionId, action });
      const authorizationRef = passkeyAuthorizationRef(proposal.proposalId);
      setSigning(proposal.proposalId);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSigning(null);
      const out = await submitDecision(
        proposal,
        approveProposal(proposal.proposalId, proposal.terms, authorizationRef).decision!,
      );
      applyDecision(out.proposal, 'APPROVED', undefined, authorizationRef);
      setDone(true);
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
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Cancel or downgrade ${entry.merchantName}`}
        className="flex max-h-full w-full animate-sheet-up flex-col overflow-hidden rounded-t-[30px] bg-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 justify-center pt-3">
          <span className="ct-grabber" />
        </div>
        <div className="max-h-[84vh] overflow-y-auto no-scrollbar px-4 pb-5">
          <header className="flex items-start justify-between gap-2 pb-2">
            <div>
              <h3 className="flex items-center gap-2 text-[16px] font-extrabold text-[#04222B]">
                <GraduationCap className="h-5 w-5 text-[#10606F]" /> {entry.merchantName} · cancel / downgrade
              </h3>
              <p className="mt-0.5 text-[11px] text-[#04222B]/60">
                Full price {formatRM(entry.fullPriceRM)}/mo
                {entry.studentPriceRM !== null && (
                  <> → student {formatRM(entry.studentPriceRM)}/mo</>
                )}
                {metrics.studentAnnualSavings !== null && (
                  <> · saves {formatRM(metrics.studentAnnualSavings)}/yr</>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 place-items-center rounded-full bg-[#04222B]/5 text-[#04222B]/60 hover:bg-[#04222B]/10"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="flex flex-wrap gap-1.5 pb-3">
            <Badge variant="outline">{formatRM(metrics.annualizedCost)}/yr</Badge>
            <Badge variant="outline">≈ {metrics.opportunityCostMeals} mixed-rice meals/mo</Badge>
            <Badge variant="outline">≈ {metrics.opportunityCostBubbleTea} bubble tea/mo</Badge>
            {entry.requiresStudentEmailOTP && (
              <Badge variant={studentVerified ? 'success' : 'warning'}>
                {studentVerified ? 'Student verified' : 'Student OTP required'}
              </Badge>
            )}
          </div>

          {done ? (
            <div className="space-y-2 rounded-2xl bg-[#E9F8F1] p-4 text-[12px] leading-relaxed text-[#0B5F4A]">
              <p className="font-extrabold">Recorded as a PENDING sweep ✓</p>
              <p>
                Fast-forward the sandbox clock past the next billing date (Judge sandbox → +7 Days or
                Jump to Month-End). CtrlPay only credits the Defense Vault after the old charge
                verifiably disappears.
              </p>
              <Button size="sm" variant="outline" onClick={onClose}>
                Back to the app
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Channel A — whitelisted deep link */}
              <section className="rounded-2xl border border-[#04222B]/10 bg-[#F7FAFC] p-3">
                <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#04222B]">
                  <ExternalLink className="h-3.5 w-3.5" /> Channel A · official page (whitelisted)
                </p>
                <p className="mt-1 text-[10.5px] leading-relaxed text-[#04222B]/60">
                  CtrlPay never sends model-generated URLs. This link is read from the reviewed
                  SUBSCRIPTION_REGISTRY by subscription id.
                </p>
                {entry.officialCancelDeepLink ? (
                  <a
                    href={entry.officialCancelDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-2')}
                  >
                    <ExternalLink className="h-4 w-4" /> Open {entry.merchantName} account page
                  </a>
                ) : (
                  <p className="mt-2 rounded-xl bg-[#FFF7E6] p-2 text-[10.5px] text-[#8A5408]">
                    No reviewed deep link for this merchant — use the email channel below.
                  </p>
                )}
              </section>

              {/* Student OTP */}
              {needsOtp && (
                <section className="rounded-2xl border border-[#04222B]/10 bg-white p-3">
                  <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#04222B]">
                    <BadgeCheck className="h-3.5 w-3.5 text-[#10606F]" /> Student verification (mock OTP)
                  </p>
                  <p className="mt-1 text-[10.5px] text-[#04222B]/60">
                    Sent to {profile.studentEmail}. We only ask for the one-time code — never your
                    password or full student ID.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit code"
                      aria-label="Student OTP"
                      className="w-36 rounded-xl border border-[#04222B]/10 bg-white px-3 py-2 text-sm text-[#04222B] outline-none focus:border-[#10606F]"
                    />
                    <Button size="sm" onClick={verifyOtp}>
                      Verify
                    </Button>
                  </div>
                  <p className="mt-1 text-[9.5px] text-[#04222B]/45">
                    Sandbox: submit literally any 6 digits.
                  </p>
                </section>
              )}

              {/* Channel B — in-app email preview */}
              {entry.mailtoTemplate && (
                <section className="rounded-2xl border border-[#04222B]/10 bg-white p-3">
                  <p className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#04222B]">
                    <Mail className="h-3.5 w-3.5 text-[#10606F]" /> Channel B · AI-assisted cancellation email (T2 draft)
                  </p>
                  <div className="mt-2 overflow-hidden rounded-xl border border-[#04222B]/10">
                    <div className="space-y-1 bg-[#F4F8FC] px-3 py-2 text-[10.5px]">
                      <p>
                        <span className="font-bold text-[#04222B]/50">To: </span>
                        {entry.mailtoTemplate.to}
                      </p>
                      <p>
                        <span className="font-bold text-[#04222B]/50">Subject: </span>
                        {entry.mailtoTemplate.subject
                          .replaceAll('{{MEMBER_ID}}', profile.memberId)
                          .replaceAll('{{FULL_NAME}}', profile.fullName)}
                      </p>
                    </div>
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap bg-white px-3 py-2 font-sans text-[10.5px] leading-relaxed text-[#04222B]/80">
                      {entry.mailtoTemplate.body
                        .replaceAll('{{MEMBER_ID}}', profile.memberId)
                        .replaceAll('{{FULL_NAME}}', profile.fullName)}
                    </pre>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {mailto && (
                      <a href={mailto} className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}>
                        <Mail className="h-4 w-4" /> Open in mail app
                      </a>
                    )}
                    <Button size="sm" disabled={busy} onClick={() => void confirmSweep('CANCEL')}>
                      <ShieldCheck className="h-4 w-4" /> I&apos;ve sent it — start PendingSweep (T3)
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[9.5px] leading-relaxed text-[#04222B]/45">
                    Nothing moves into the Vault until the next billing date proves the charge stopped.
                    Annual savings at stake: {formatRM(annualCancelSavings)}.
                  </p>
                </section>
              )}

              {/* Student downgrade sweep */}
              {entry.studentPriceRM !== null && (
                <section className="rounded-2xl border border-[#04222B]/10 bg-[#F4FBF8] p-3">
                  <p className="text-[12px] font-extrabold text-[#04222B]">
                    Student downgrade · {formatRM(entry.fullPriceRM)} → {formatRM(entry.studentPriceRM)}/mo
                  </p>
                  <p className="mt-1 text-[10.5px] text-[#04222B]/60">
                    Record the downgrade as a two-stage sweep. The Vault is credited only after the next
                    billing date verifies the new price.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    disabled={busy || (entry.requiresStudentEmailOTP && !studentVerified)}
                    onClick={() => void confirmSweep('STUDENT_DOWNGRADE')}
                  >
                    <ShieldCheck className="h-4 w-4" /> Record student downgrade (T3)
                  </Button>
                  {entry.requiresStudentEmailOTP && !studentVerified && (
                    <p className="mt-1.5 text-[9.5px] text-[#8A5408]">
                      Verify your student email above first.
                    </p>
                  )}
                </section>
              )}

              {error && <p className="rounded-xl bg-[#FDE7EC] p-2.5 text-[11px] text-[#B3253F]">{error}</p>}
            </div>
          )}
        </div>
        <PasskeySigningPulse active={signing !== null} proposalId={signing} />
      </section>
    </div>
  );
}
