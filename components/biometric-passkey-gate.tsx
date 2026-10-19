'use client';

import * as React from 'react';
import { CheckCircle2, Fingerprint, ScanFace, ShieldCheck, X } from 'lucide-react';

export const PASSKEY_COMPLIANCE_NOTE =
  'Zero-Knowledge Local Enclave Simulation (WebAuthn / FIDO2 standard) · Biometric templates never leave the user’s device or enter CtrlPay servers.';

/**
 * Full-screen black-glass Passkey gate.
 *
 * SIMULATION ONLY: no WebAuthn credential is created or transmitted. The component
 * demonstrates the product flow; the browser's real WebAuthn API can replace the
 * simulated scan without touching the audit or permission layers.
 */
export function BiometricPasskeyGate({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  const [phase, setPhase] = React.useState<'PROMPT' | 'SCANNING' | 'DONE'>('PROMPT');

  React.useEffect(() => {
    if (open) {
      setPhase('PROMPT');
    }
  }, [open]);

  React.useEffect(() => {
    if (!open || phase !== 'SCANNING') return;
    const scan = setTimeout(() => {
      setPhase('DONE');
      onUnlocked?.();
    }, 800);
    return () => clearTimeout(scan);
  }, [open, phase, onUnlocked]);

  React.useEffect(() => {
    if (!open || phase !== 'DONE') return;
    const close = setTimeout(() => onClose(), 550);
    return () => clearTimeout(close);
  }, [open, phase, onClose]);

  if (!open) return null;

  const scanning = phase === 'SCANNING';
  const done = phase === 'DONE';

  return (
    <div className="absolute inset-0 z-[80] flex flex-col items-center justify-center bg-[#04070C]/96 px-7 text-center text-white backdrop-blur-xl">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close passkey gate"
        className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/8 text-white/60 hover:bg-white/15 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#E8C766]">
        <ShieldCheck className="h-3 w-3" /> Zero-knowledge gate
      </span>

      <div className="relative mt-7 grid h-32 w-32 place-items-center">
        <span
          className={`absolute inset-0 rounded-full border border-[#D4AF37]/25 ${
            scanning ? 'animate-ping' : ''
          }`}
        />
        <span className={`absolute inset-3 rounded-full border ${done ? 'border-[#31C48D]/50' : 'border-[#D4AF37]/35'}`} />
        <span
          className={`grid h-20 w-20 place-items-center rounded-[28px] border ${
            done
              ? 'border-[#31C48D]/40 bg-[#31C48D]/15 text-[#5EE1B0]'
              : 'border-[#D4AF37]/40 bg-gradient-to-br from-[#1B1608] to-[#0B0F14] text-[#E8C766]'
          } transition-colors duration-300`}
        >
          {done ? (
            <CheckCircle2 className="h-9 w-9" />
          ) : scanning ? (
            <Fingerprint className="h-9 w-9 animate-pulse" />
          ) : (
            <ScanFace className="h-9 w-9" />
          )}
        </span>
      </div>

      <h2 className="mt-6 text-[19px] font-extrabold tracking-tight">
        {done ? 'Identity verified' : scanning ? 'Verifying…' : 'CtrlPay Passkey'}
      </h2>
      <p className="mt-1.5 max-w-[280px] text-[11.5px] leading-relaxed text-white/55">
        {done
          ? 'Local enclave unlocked. No biometric data was transmitted.'
          : scanning
            ? 'Verifying Device FIDO2 Passkey (Face ID)…'
            : 'Face ID / Touch ID protects your sandbox session. Tap once to unlock.'}
      </p>

      <button
        type="button"
        disabled={scanning || done}
        onClick={() => setPhase('SCANNING')}
        className="mt-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-[#E8C766] to-[#C9A227] px-6 py-2.5 text-[12.5px] font-extrabold text-[#1A1405] shadow-[0_10px_30px_rgba(212,175,55,0.25)] transition active:scale-95 disabled:opacity-60"
      >
        <ScanFace className="h-4 w-4" />
        {scanning ? 'Scanning…' : done ? 'Unlocked' : 'Authenticate with Face ID'}
      </button>

      <p className="mt-8 max-w-[300px] text-[9px] leading-relaxed text-white/35">
        {PASSKEY_COMPLIANCE_NOTE}
      </p>
    </div>
  );
}

/**
 * T3 signing pulse. Renders for the duration of the simulated 0.5s biometric
 * verification and is used by every contract card, the payment interceptor and
 * the assisted-cancellation drawer.
 */
export function PasskeySigningPulse({
  active,
  proposalId,
}: {
  active: boolean;
  proposalId?: string | null;
}) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-[#04070C]/88 px-8 text-center text-white backdrop-blur-md">
      <span className="grid h-16 w-16 animate-pulse place-items-center rounded-2xl border border-[#D4AF37]/40 bg-[#12100A] text-[#E8C766]">
        <Fingerprint className="h-7 w-7" />
      </span>
      <p className="mt-4 text-[13px] font-extrabold">Verifying Device FIDO2 Passkey (Face ID)…</p>
      <p className="mt-1 font-mono text-[9.5px] text-white/45">
        FIDO2_PASSKEY_BIOMETRIC_AUTH_{(proposalId ?? 'proposal').replace(/[^A-Za-z0-9]/g, '').slice(0, 8)}
      </p>
      <p className="mt-3 max-w-[280px] text-[9px] leading-relaxed text-white/35">
        {PASSKEY_COMPLIANCE_NOTE}
      </p>
    </div>
  );
}
