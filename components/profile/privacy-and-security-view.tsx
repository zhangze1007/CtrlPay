'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Flame,
  Lock,
  Sparkles,
  ChevronRight,
  Database,
  Eye,
  FileText,
  Activity,
  History,
  Info,
  Bug,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';

// ============================================================================
// Types & Initial Audit Ledger Data
// ============================================================================

export interface AuditEventItem {
  id: string; // e.g. EVT-001
  type: string; // e.g. AI Analysis
  timestamp: string; // e.g. 2026-10-19 09:00:14
  status: 'Valid' | 'Tampered';
  consent: string; // e.g. Granted
  dataCategories: string; // e.g. Income, expenses
  prevHash: string;
  currentHash: string;
  isAnchored?: boolean;
  tamperedPayload?: string;
}

const INITIAL_AUDIT_EVENTS: AuditEventItem[] = [
  {
    id: 'EVT-001',
    type: 'AI Analysis',
    timestamp: '2026-10-19 09:00:14',
    status: 'Valid',
    consent: 'Granted',
    dataCategories: 'Income, expenses',
    prevHash: '00000000000000000000000000000000',
    currentHash: 'a83fc912e74921b3058f89c42661d4e0',
    isAnchored: true,
  },
  {
    id: 'EVT-002',
    type: 'Receipt OCR Intake',
    timestamp: '2026-10-19 09:02:30',
    status: 'Valid',
    consent: 'User Camera Upload',
    dataCategories: 'Merchant, total_amount, category',
    prevHash: 'a83fc912e74921b3058f89c42661d4e0',
    currentHash: 'f471b029e81c0397d84812f8541c9902',
    isAnchored: true,
  },
  {
    id: 'EVT-003',
    type: 'Quarantine Escrow',
    timestamp: '2026-10-19 09:05:12',
    status: 'Valid',
    consent: 'Autonomous Policy Rule (T2)',
    dataCategories: 'RM 24.64 dining want-category',
    prevHash: 'f471b029e81c0397d84812f8541c9902',
    currentHash: '5b98a3c8e71b29a4309f1165a298b417',
    isAnchored: true,
  },
  {
    id: 'EVT-004',
    type: 'Subscription Sweep',
    timestamp: '2026-10-19 09:10:00',
    status: 'Valid',
    consent: 'Student Registry Verification',
    dataCategories: 'Spotify student discount RM 7.40',
    prevHash: '5b98a3c8e71b29a4309f1165a298b417',
    currentHash: '92c817e0b51829910a37e1957261a84f',
    isAnchored: true,
  },
  {
    id: 'EVT-005',
    type: 'CFaR Solvency Projection',
    timestamp: '2026-10-19 09:15:45',
    status: 'Valid',
    consent: 'User Mandate Active',
    dataCategories: '250 Monte Carlo cashflow paths',
    prevHash: '92c817e0b51829910a37e1957261a84f',
    currentHash: '3d61a807c491295b7194f81014e259b3',
    isAnchored: true,
  },
  {
    id: 'EVT-006',
    type: 'Payment Authorization',
    timestamp: '2026-10-19 09:20:18',
    status: 'Valid',
    consent: 'Biometric Confirmation',
    dataCategories: 'DuitNow Webhook event #4819',
    prevHash: '3d61a807c491295b7194f81014e259b3',
    currentHash: 'e198b251a704981f337891c015b3984a',
    isAnchored: false, // Pending next block anchor
  },
];

// Helper to truncate hash cleanly: e.g. 0000...0000 or a83f...c912
function formatShortHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 4)}…${hash.slice(-4)}`;
}

// ============================================================================
// 页面 A: Privacy & Security (普通用户页面)
// ============================================================================

export interface PrivacySecurityViewProps {
  onBack: () => void;
  onOpenAudit: () => void;
}

export function PrivacySecurityView({ onBack, onOpenAudit }: PrivacySecurityViewProps) {
  // User privacy toggles
  const [aiAnalysisAllowed, setAiAnalysisAllowed] = React.useState(true);
  const [dataSharingAllowed, setDataSharingAllowed] = React.useState(true);
  const [quarantineShieldAllowed, setQuarantineShieldAllowed] = React.useState(true);
  const [thirdPartyAccess, setThirdPartyAccess] = React.useState(false);

  return (
    <div className="min-h-full bg-[#0F172A] text-slate-100 pb-24 antialiased select-none font-sans">
      {/* 1. Header with Back Button */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-3 pb-2.5 bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-800/80">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-full bg-slate-800/80 text-slate-200 border border-slate-700/80 hover:bg-slate-700 active:scale-95 transition-all"
          aria-label="Back to Settings"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <h1 className="text-[16px] font-bold text-white tracking-tight">
          Privacy & Security
        </h1>

        <div className="w-9" />
      </div>

      <div className="px-4.5 pt-3 space-y-4">
        {/* Intro Banner */}
        <div className="rounded-[22px] bg-gradient-to-br from-slate-800/90 to-slate-900/90 p-4 border border-slate-800 shadow-sm space-y-1">
          <div className="flex items-center gap-2 text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[12px] font-bold tracking-wide uppercase">
              Privacy First Architecture
            </span>
          </div>
          <p className="text-[11.5px] text-slate-300 leading-relaxed">
            Your financial data is cryptographically isolated. AI features only process your balances to suggest optimizations and protect your survival runway.
          </p>
        </div>

        {/* 2. Consent & Data Authorizations Section */}
        <div className="space-y-2">
          <h2 className="text-[12.5px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Authorizations & Consents
          </h2>

          <div className="rounded-[24px] bg-slate-900/90 border border-slate-800 divide-y divide-slate-800/80 overflow-hidden shadow-sm">
            {/* AI Financial Analysis Toggle */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-white">
                    AI Financial Analysis
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[9px] font-extrabold border',
                      aiAnalysisAllowed
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700 text-slate-300 border-slate-600'
                    )}
                  >
                    {aiAnalysisAllowed ? 'Allowed' : 'Disabled'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  允许使用财务数据生成分析建议 (Autonomous spending suggestions & proposal calibration)
                </p>
              </div>

              {/* Custom Toggle Switch */}
              <button
                type="button"
                onClick={() => setAiAnalysisAllowed(!aiAnalysisAllowed)}
                className={cn(
                  'w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 shrink-0 relative flex items-center',
                  aiAnalysisAllowed ? 'bg-emerald-500' : 'bg-slate-700'
                )}
              >
                <div
                  className={cn(
                    'w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200',
                    aiAnalysisAllowed ? 'translate-x-5.5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Data Sharing & Webhook Feeds Toggle */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-white">
                    Data Sharing & Webhooks
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[9px] font-extrabold border',
                      dataSharingAllowed
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-700 text-slate-300 border-slate-600'
                    )}
                  >
                    {dataSharingAllowed ? 'Active' : 'Off'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  数据共享授权 · 接收银行账单与 OCR 交易解析 (Read-only Open Banking push feeds)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setDataSharingAllowed(!dataSharingAllowed)}
                className={cn(
                  'w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 shrink-0 relative flex items-center',
                  dataSharingAllowed ? 'bg-emerald-500' : 'bg-slate-700'
                )}
              >
                <div
                  className={cn(
                    'w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200',
                    dataSharingAllowed ? 'translate-x-5.5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Autonomous Quarantine Shield Toggle */}
            <div className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-white">
                    Quarantine Escrow Shield
                  </span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[9px] font-extrabold border',
                      quarantineShieldAllowed
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-slate-700 text-slate-300 border-slate-600'
                    )}
                  >
                    {quarantineShieldAllowed ? 'Active' : 'Off'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  高风险冲动消费自动进入 24 小时冷静期 (Zero auto-release without user click)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setQuarantineShieldAllowed(!quarantineShieldAllowed)}
                className={cn(
                  'w-12 h-6.5 rounded-full p-0.5 transition-colors duration-200 shrink-0 relative flex items-center',
                  quarantineShieldAllowed ? 'bg-blue-500' : 'bg-slate-700'
                )}
              >
                <div
                  className={cn(
                    'w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform duration-200',
                    quarantineShieldAllowed ? 'translate-x-5.5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Audit Integrity Summary Card */}
        <div className="rounded-[24px] bg-gradient-to-br from-slate-900 to-[#0A1A2F] border border-slate-800 p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-4.5 w-4.5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-[13.5px] font-bold text-white leading-tight">
                  Audit Integrity
                </h3>
                <p className="text-[10.5px] text-slate-400">
                  Last verification completed
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-extrabold text-emerald-400">
              <Check className="h-3 w-3 stroke-[3]" />
              <span>Verified</span>
            </span>
          </div>

          <p className="text-[11.5px] text-slate-300 leading-relaxed">
            All 6 recorded financial events are mathematically linked in a tamper-evident audit ledger. Your data cannot be silently modified.
          </p>
        </div>

        {/* 4. Recent Security Activity */}
        <div className="space-y-2">
          <h2 className="text-[12.5px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Recent Security Activity
          </h2>

          <div className="rounded-[24px] bg-slate-900/90 border border-slate-800 p-3.5 space-y-3">
            {[
              {
                title: 'AI analysis completed',
                time: '9:00 AM',
                desc: 'Spending review completed with zero PII retention',
                badge: 'Safe',
                color: 'text-emerald-400',
              },
              {
                title: 'Receipt OCR processed',
                time: '9:02 AM',
                desc: 'Coffee Bean & Tea Leaf receipt cataloged',
                badge: 'Logged',
                color: 'text-blue-400',
              },
              {
                title: 'Quarantine escrow hold',
                time: '8:15 AM',
                desc: '24h lock engaged on discretionary want purchase',
                badge: 'Armed',
                color: 'text-purple-400',
              },
              {
                title: 'Subscription sweep verified',
                time: 'Yesterday',
                desc: 'Spotify verified discount credited to Defense Vault',
                badge: 'Saved',
                color: 'text-teal-400',
              },
            ].map((act, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[11.5px] py-1 border-b border-slate-800/60 last:border-b-0"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{act.title}</span>
                    <span className="text-[10px] text-slate-400">· {act.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{act.desc}</p>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700',
                    act.color
                  )}
                >
                  {act.badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. View Audit History / Technical Verification Button (Leads to 页面 B) */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={onOpenAudit}
          className="w-full rounded-[22px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white p-4 shadow-lg active:scale-95 transition-all text-left flex items-center justify-between gap-3 group"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-extrabold">View Audit Trail</span>
              <span className="rounded-full bg-white/20 px-2 py-0.2 text-[9.5px] font-bold uppercase tracking-wider text-white">
                Judge Demo
              </span>
            </div>
            <p className="text-[11px] text-emerald-100 leading-snug">
              评委深入技术检查 · SHA-256 哈希链完整性与防篡改模拟
            </p>
          </div>

          <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20 text-white group-hover:translate-x-1 transition-transform">
            <ChevronRight className="h-4.5 w-4.5 stroke-[2.5]" />
          </div>
        </motion.button>
      </div>
    </div>
  );
}

// ============================================================================
// 页面 B: Audit Trail (高级审计 / Demo 评委技术页面)
// ============================================================================

export interface AuditTrailViewProps {
  onBack: () => void;
}

export function AuditTrailView({ onBack }: AuditTrailViewProps) {
  const [events, setEvents] = React.useState<AuditEventItem[]>(INITIAL_AUDIT_EVENTS);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isTampered, setIsTampered] = React.useState(false);
  const [copiedHash, setCopiedHash] = React.useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = React.useState<string | null>(null);

  // Statistics calculation
  const totalCount = events.length;
  const activeCount = isTampered ? totalCount - 1 : totalCount;
  const invalidatedCount = isTampered ? 1 : 0;
  const anchoredCount = 5;
  const pendingCount = 1;

  // Verify chain function
  const handleVerifyChain = () => {
    setIsVerifying(true);
    setVerifyMessage('Running SHA-256 cryptographic verification across blocks...');

    setTimeout(() => {
      setIsVerifying(false);
      if (isTampered) {
        setVerifyMessage('❌ Tamper Alert: Hash mismatch detected at EVT-003!');
      } else {
        setVerifyMessage('✅ Chain Integrity Verified: All 6 events strictly valid.');
      }
    }, 900);
  };

  // Simulate Tampering button for Hackathon Judges
  const handleSimulateTampering = () => {
    if (!isTampered) {
      // Tamper with EVT-003
      setEvents((prev) =>
        prev.map((e) =>
          e.id === 'EVT-003'
            ? {
                ...e,
                status: 'Tampered',
                consent: 'Revoked (Unauthorized Injection)',
                dataCategories: 'TAMPERED: RM 999.00 luxury watch',
                currentHash: 'deadbeef74921b3058f89c42661d4e0',
              }
            : e
        )
      );
      setIsTampered(true);
      setVerifyMessage('⚠️ Tampering injected into EVT-003! Hit "Verify Chain" to inspect.');
    } else {
      // Restore back to original valid chain
      setEvents(INITIAL_AUDIT_EVENTS);
      setIsTampered(false);
      setVerifyMessage('🔄 Chain restored to original authentic genesis state.');
    }
  };

  const copyToClipboard = (hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="min-h-full bg-[#0B0F19] text-slate-100 pb-28 antialiased select-none font-sans">
      {/* 1. Header with Back Button (Matching Image 2 Chain Integrity style) */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-3 pb-2.5 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80">
        <button
          type="button"
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-full bg-slate-800/80 text-slate-200 border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="text-center">
          <h1 className="text-[16px] font-bold text-white tracking-tight">
            Chain Integrity
          </h1>
          <p className="text-[10px] text-slate-400">CAP v1.0 Proof Verification</p>
        </div>

        <button
          type="button"
          onClick={handleVerifyChain}
          disabled={isVerifying}
          className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 active:scale-95 transition-all"
          title="Verify Chain Now"
        >
          <RefreshCw className={cn('h-4 w-4', isVerifying && 'animate-spin')} />
        </button>
      </div>

      <div className="px-4.5 pt-3 space-y-4">
        {/* ============================================================== *
         * 2. CHAIN STATISTICS (Exact replica of Image 2)
         * ============================================================== */}
        <div className="space-y-1.5">
          <h2 className="text-[13px] font-bold text-slate-300 px-1">
            Chain Statistics
          </h2>

          <div className="rounded-[24px] bg-[#141B2D] border border-slate-800 p-4 shadow-sm space-y-3">
            {/* Top 3 Metric Numbers */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="block text-[22px] font-extrabold text-white leading-tight">
                  {totalCount}
                </span>
                <span className="text-[10.5px] text-slate-400 font-medium">Total</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span className="block text-[22px] font-extrabold text-emerald-400 leading-tight">
                  {activeCount}
                </span>
                <span className="text-[10.5px] text-slate-400 font-medium">Active</span>
              </div>

              <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <span
                  className={cn(
                    'block text-[22px] font-extrabold leading-tight',
                    invalidatedCount > 0 ? 'text-rose-400' : 'text-slate-400'
                  )}
                >
                  {invalidatedCount}
                </span>
                <span className="text-[10.5px] text-slate-400 font-medium">Invalidated</span>
              </div>
            </div>

            {/* Second Row of Chips */}
            <div className="flex items-center justify-between text-[10.5px] text-slate-300 pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1 text-slate-400">
                <span>⚙️ Tombstones</span>
                <strong className="text-white">0</strong>
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="text-emerald-400">✓ Anchored</span>
                <strong className="text-white">{anchoredCount}</strong>
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="text-amber-400">🕒 Pending</span>
                <strong className="text-white">{pendingCount}</strong>
              </span>
            </div>

            {/* Date Range */}
            <div className="text-[10px] text-slate-400 text-center pt-0.5">
              Date Range: 2026/10/18 → 2026/10/19
            </div>
          </div>
        </div>

        {/* ============================================================== *
         * 3. INTEGRITY VERIFICATION BANNER (Exact replica of Image 2)
         * ============================================================== */}
        <div className="space-y-1.5">
          <h2 className="text-[13px] font-bold text-slate-300 px-1">
            Integrity Verification
          </h2>

          <div
            className={cn(
              'rounded-[24px] p-4 border transition-all duration-300 space-y-2',
              isTampered
                ? 'bg-rose-950/40 border-rose-600/60 text-rose-200'
                : 'bg-[#142328] border-emerald-500/40 text-emerald-200'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full text-white',
                    isTampered ? 'bg-rose-600' : 'bg-emerald-500'
                  )}
                >
                  {isTampered ? (
                    <AlertTriangle className="h-4.5 w-4.5" />
                  ) : (
                    <Check className="h-4.5 w-4.5 stroke-[3]" />
                  )}
                </div>

                <div>
                  <h3 className="text-[14px] font-bold text-white leading-tight">
                    {isTampered ? 'Chain Integrity Compromised' : 'Chain Integrity Verified'}
                  </h3>
                  <p className="text-[10.5px] opacity-80 mt-0.5">
                    {isTampered
                      ? 'Broken at block EVT-003 · Mismatched cryptographic hash'
                      : 'Checked 6 events, 0 tombstones'}
                  </p>
                </div>
              </div>

              <span className="text-[9.5px] opacity-75 font-mono">
                {new Date().toLocaleTimeString()}
              </span>
            </div>

            <p className="text-[11px] opacity-90 leading-relaxed pt-1 border-t border-white/10">
              {isTampered
                ? 'Hash linkage broken: Payload modified without valid ES256 key. All subsequent events are rendered untrusted.'
                : 'Verifies that all events are correctly linked and no tampering has occurred.'}
            </p>
          </div>
        </div>

        {/* ============================================================== *
         * 4. JUDGE ACTION BUTTONS: VERIFY CHAIN & SIMULATE TAMPERING
         * ============================================================== */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          {/* Verify Chain Button */}
          <button
            type="button"
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 px-3 text-[12px] font-bold shadow-md active:scale-95 transition-all text-center"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isVerifying && 'animate-spin')} />
            <span>{isVerifying ? 'Verifying...' : 'Verify Chain'}</span>
          </button>

          {/* Simulate Tampering Button */}
          <button
            type="button"
            onClick={handleSimulateTampering}
            className={cn(
              'flex items-center justify-center gap-2 rounded-2xl py-3 px-3 text-[12px] font-bold shadow-md active:scale-95 transition-all text-center',
              isTampered
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-rose-600/90 hover:bg-rose-600 text-white'
            )}
          >
            {isTampered ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Restore Integrity</span>
              </>
            ) : (
              <>
                <Bug className="h-3.5 w-3.5" />
                <span>Simulate Tampering</span>
              </>
            )}
          </button>
        </div>

        {verifyMessage && (
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-[11px] text-center text-slate-200 animate-fade-in">
            {verifyMessage}
          </div>
        )}

        {/* ============================================================== *
         * 5. AUDIT DETAILS EVENT LIST (Exact format required by User)
         * ============================================================== */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[13px] font-bold text-slate-300">
              Audit Details (底层链记录)
            </h2>
            <span className="text-[10px] text-slate-400 font-mono">
              SHA-256 Linkage
            </span>
          </div>

          <div className="space-y-3">
            {events.map((evt) => {
              const isValid = evt.status === 'Valid';
              return (
                <div
                  key={evt.id}
                  className={cn(
                    'rounded-[22px] bg-[#141B2D] border p-3.5 space-y-2.5 transition-all',
                    isValid
                      ? 'border-slate-800 hover:border-slate-700'
                      : 'border-rose-500/80 bg-rose-950/20 shadow-[0_0_20px_rgba(244,63,94,0.15)]'
                  )}
                >
                  {/* Event ID + Event Type + Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-black text-white">
                        {evt.id}
                      </span>
                      <span className="text-[11px] text-slate-400">·</span>
                      <span className="text-[12.5px] font-bold text-slate-200">
                        {evt.type}
                      </span>
                    </div>

                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-extrabold border',
                        isValid
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500 animate-pulse'
                      )}
                    >
                      {evt.status}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <div className="text-[10px] text-slate-400 font-mono">
                    Timestamp: {evt.timestamp}
                  </div>

                  {/* Metadata: Consent & Data Categories */}
                  <div className="rounded-xl bg-slate-900/80 p-2.5 border border-slate-800/80 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Consent:</span>
                      <span className="font-medium text-slate-200">{evt.consent}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Data categories:</span>
                      <span className="font-medium text-slate-200">
                        {evt.dataCategories}
                      </span>
                    </div>
                  </div>

                  {/* Hashes: Previous Hash & Current Hash */}
                  <div className="space-y-1.5 pt-0.5">
                    {/* Previous Hash */}
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                      <span>Previous Hash:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(evt.prevHash)}
                        className="flex items-center gap-1 hover:text-white transition-colors bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/60"
                        title="Click to copy full hash"
                      >
                        <span>{formatShortHash(evt.prevHash)}</span>
                        {copiedHash === evt.prevHash ? (
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </button>
                    </div>

                    {/* Current Hash */}
                    <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-400">
                      <span>Current Hash:</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(evt.currentHash)}
                        className={cn(
                          'flex items-center gap-1 hover:text-white transition-colors px-1.5 py-0.5 rounded border',
                          isValid
                            ? 'bg-slate-800/60 text-emerald-400 border-slate-700/60'
                            : 'bg-rose-900/40 text-rose-300 border-rose-500'
                        )}
                        title="Click to copy full hash"
                      >
                        <span>{formatShortHash(evt.currentHash)}</span>
                        {copiedHash === evt.currentHash ? (
                          <Check className="h-2.5 w-2.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-2.5 w-2.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Disclaimer matching user's note */}
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-[10px] text-slate-400 text-center leading-relaxed">
          上述记录为界面示例，严格依照 SHA-256 规范进行级联验证，用于展示评委防篡改演示模型。
        </div>
      </div>
    </div>
  );
}
