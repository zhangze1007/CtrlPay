'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  ChevronRight,
  Info,
  X,
  ShieldCheck,
  CreditCard,
  FileText,
  Activity,
  Sparkles,
  User,
  SlidersHorizontal,
  Lock,
  ArrowUpRight,
  CheckCircle2,
  TrendingUp,
  Receipt,
  Scale,
  Zap,
  Building,
  KeyRound,
  Download,
  GraduationCap,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';

export interface FinTechProfileItem {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeCount?: number;
  gradient: string;
  icon: React.ElementType;
  details: {
    heading: string;
    description: string;
    metrics: Array<{ label: string; value: string }>;
    statusText: string;
  };
}

export function ClinicalProfileView({
  onClose,
}: {
  onClose: () => void;
}) {
  const profile = useCtrlPayStore((s) => s.profile);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const allowance = useCtrlPayStore((s) => s.dynamicDailyAllowance());
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const studentVerified = useCtrlPayStore((s) => s.studentVerified);

  const [selectedItem, setSelectedItem] = React.useState<FinTechProfileItem | null>(null);

  // FinTech Profile Rows matching financial Neo-Banking controls with rich gradients
  const fintechItems: FinTechProfileItem[] = [
    {
      id: 'limits',
      title: 'Spending Limits & Risk Controls',
      subtitle: 'Daily allowance & weekly containment thresholds',
      badgeCount: 2,
      gradient: 'from-[#F59E0B] via-[#F97316] to-[#EF4444]',
      icon: Scale,
      details: {
        heading: 'Dual-Constraint Spending Limits',
        description:
          'Automated financial circuit breakers that prevent impulsive overdrafts while maintaining your daily survival floor.',
        metrics: [
          { label: 'Daily Allowance', value: `$${allowance.toFixed(0)} / day` },
          { label: 'Weekly Pay Limit', value: '$800.00' },
          { label: 'Monthly Cap', value: '$3,200.00' },
          { label: 'Circuit Breaker', value: 'Active · Dual-Shield' },
        ],
        statusText: 'Dual constraints on user transactions & autonomous AI agents are active.',
      },
    },
    {
      id: 'solvency',
      title: 'CFaR Solvency & Stress Test',
      subtitle: 'Monte Carlo cash-flow projections & risk score',
      badgeCount: 3,
      gradient: 'from-[#EC4899] via-[#D946EF] to-[#8B5CF6]',
      icon: Activity,
      details: {
        heading: 'Cash-Flow at Risk (CFaR) Engine',
        description:
          'Continuous 30-day projection modeling upcoming bills, subscription amortizations, and daily allowance variance.',
        metrics: [
          { label: 'Solvency Confidence', value: '99.4% (AAA)' },
          { label: 'Projected Month-End', value: `$${(currentBalance - 420).toLocaleString()}` },
          { label: 'Daily Survival Floor', value: '$30.00 / day' },
          { label: 'Breach Probability', value: '< 0.05% Safe' },
        ],
        statusText: 'All 3 stress test scenarios passed with comfortable liquidity margin.',
      },
    },
    {
      id: 'audit',
      title: 'Cryptographic Audit & Hash Chain',
      subtitle: 'Immutable SHA-256 append-only transaction ledger',
      gradient: 'from-[#06B6D4] via-[#0EA5E9] to-[#3B82F6]',
      icon: KeyRound,
      details: {
        heading: 'Append-Only Merkle Audit Chain',
        description:
          'Every booking, allowance sweep, and subscription renewal is cryptographically signed and hashed into an immutable audit log.',
        metrics: [
          { label: 'Latest Block Hash', value: '0x8f3c...d92a' },
          { label: 'Confirmed Transactions', value: '1,482 blocks' },
          { label: 'Hash Algorithm', value: 'SHA-256 Tamper-Proof' },
          { label: 'Audit Status', value: 'Synchronized ✓' },
        ],
        statusText: 'Audit log verified against local enclave cryptographic keypair.',
      },
    },
    {
      id: 'mandates',
      title: 'Automated Mandates & Subscriptions',
      subtitle: 'Smart subscription manager & student arbitrage',
      badgeCount: 24,
      gradient: 'from-[#10B981] via-[#059669] to-[#06B6D4]',
      icon: Zap,
      details: {
        heading: 'Automated Payment Mandates',
        description:
          'Autonomous micro-mandates that manage recurring subscriptions, schedule payment amortizations, and trigger discounts.',
        metrics: [
          { label: 'Active Subscriptions', value: '6 Platforms' },
          { label: 'Scheduled Rules', value: '24 Smart Mandates' },
          { label: 'Student Discount Arbitrage', value: studentVerified ? 'Active (-47% Spotify)' : 'Pending Verification' },
          { label: 'Monthly Burn Rate', value: studentVerified ? '$124.30' : '$131.70' },
        ],
        statusText: 'Zombie subscription detection running continuously in background.',
      },
    },
    {
      id: 'vault',
      title: 'Anti-Impulse Defense Vault',
      subtitle: '24-hour quarantine & biometric escrow protection',
      gradient: 'from-[#6366F1] via-[#7C3AED] to-[#8B5CF6]',
      icon: Lock,
      details: {
        heading: 'Anti-Impulse Defense Vault',
        description:
          'High-risk or impulsive purchases are placed into a 24-hour cooling-off escrow with biometric approval required to unlock.',
        metrics: [
          { label: 'Vault Balance', value: `$${Number(defenseVault || 0).toLocaleString()}` },
          { label: 'Auto-Sweep Threshold', value: '$100.00' },
          { label: 'Quarantine Window', value: '24 Hours Cooling-Off' },
          { label: 'Biometric Lock', value: 'FaceID Required' },
        ],
        statusText: 'Vault shield active. 0 unapproved sweeps detected.',
      },
    },
    {
      id: 'statements',
      title: 'Tax Invoices & Financial Statements',
      subtitle: 'Official PDF bank statements & OCR receipt archive',
      gradient: 'from-[#3B82F6] via-[#2563EB] to-[#1D4ED8]',
      icon: FileText,
      details: {
        heading: 'Statements & Tax Compliance',
        description:
          'Export verified bank statements, multimodal OCR receipt records, and automated tax expense categorizations.',
        metrics: [
          { label: 'Current Tax Period', value: '2026 Q1 - Ready' },
          { label: 'Scanned Receipts', value: '38 OCR Records' },
          { label: 'Deductible Expenses', value: '$840.00' },
          { label: 'Format', value: 'PDF / CSV / JSON' },
        ],
        statusText: 'Official bank stamp verified with digital SHA-256 certificate.',
      },
    },
  ];

  const fullName = profile.fullName || 'Ashley Cooper';
  const nameParts = fullName.trim().split(' ');
  const firstName = nameParts[0] || 'Ashley';
  const lastName = nameParts.slice(1).join(' ') || 'Cooper';

  return (
    <div className="relative min-h-full bg-gradient-to-b from-[#F0F5FF] via-[#E8F1FD] to-[#FCE7F3] px-4 pt-3 pb-16 font-sans text-[#0B1E3F] select-none">
      {/* Decorative ambient glowing gradient highlights */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-72 -left-12 h-56 w-56 rounded-full bg-gradient-to-tr from-purple-500/20 to-pink-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 right-0 h-56 w-56 rounded-full bg-gradient-to-tl from-emerald-400/20 to-teal-500/20 blur-3xl" />

      {/* Top Header with Close Button */}
      <div className="relative z-10 flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#0070F3] to-[#00B4D8] animate-pulse" />
          <span className="text-[11.5px] font-black uppercase tracking-widest text-[#0070F3]">
            FinTech KYC & Account Profile
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/90 border border-white text-[#0B1E3F] shadow-sm hover:bg-white transition-all active:scale-95 cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 1. Profile Identity Header: Squircle photo with gradient ring & name */}
      <div className="relative z-10 flex items-start gap-4 pt-1">
        {/* Squircle Photo with gradient border ring */}
        <div className="relative shrink-0">
          <div className="relative h-[92px] w-[92px] overflow-hidden rounded-[26px] bg-gradient-to-tr from-[#0070F3] via-[#8B5CF6] to-[#EC4899] p-[3px] shadow-[0_12px_28px_rgba(0,112,243,0.3)]">
            <div className="relative h-full w-full overflow-hidden rounded-[23px] bg-white">
              <Image
                src={profile.avatar || '/avatar.jpg'}
                alt={fullName}
                width={92}
                height={92}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
          </div>

          {/* Gradient edit pencil badge */}
          <div
            className="absolute -top-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full bg-gradient-to-tr from-[#EC4899] to-[#F43F5E] text-white shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-transform border border-white"
            title="Edit profile photo"
          >
            <span className="text-[12px]">✏️</span>
          </div>
        </div>

        {/* Name and FinTech Demographics */}
        <div className="flex-1">
          <h2 className="text-[27px] font-black tracking-tight leading-[1.08] text-[#0B1E3F]">
            {firstName}
            <br />
            {lastName}
          </h2>

          {/* FinTech Key Metric Badges with Gradients */}
          <div className="mt-3 flex items-center gap-2 text-[12px]">
            <div className="rounded-xl bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-400/25 px-2.5 py-1">
              <p className="font-black text-[#0070F3] text-[13px] leading-tight">785</p>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Credit Score
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-400/25 px-2.5 py-1">
              <p className="font-black text-[#7C3AED] text-[13px] leading-tight">${allowance.toFixed(0)}/d</p>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Daily Cap
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-400/25 px-2.5 py-1">
              <p className="font-black text-[#059669] text-[13px] leading-tight">AAA</p>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#64748B]">
                Solvency
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Gradient Pill Banner: FinTech KYC ID & Expiration */}
      <div
        className="relative z-10 mt-4 flex items-center justify-between rounded-full px-4 py-2.5 text-white shadow-[0_8px_24px_rgba(0,112,243,0.3)] select-none transition-transform hover:scale-[1.01]"
        style={{
          background: 'linear-gradient(135deg, #0070F3 0%, #00B4D8 45%, #10B981 100%)',
        }}
      >
        <div className="flex items-center gap-2 text-[12.5px] font-black tracking-wide">
          <span>{profile.memberId || 'FP88-9204-KL72'}</span>
          <span className="rounded-full bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
            KYC Verified ✓
          </span>
          <Info className="h-3.5 w-3.5 opacity-90 cursor-pointer" />
        </div>
        <span className="text-[12px] font-extrabold text-white/95">Exp: 12/12/2027</span>
      </div>

      {/* 3. "FinTech Profile & Security Controls" Section */}
      <div className="relative z-10 mt-5 space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[18px] font-black tracking-tight text-[#0B1E3F]">
            FinTech & Risk Profile
          </h3>
          <span className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
            6 Safeguards Active
          </span>
        </div>

        {/* Gradient Frosted Glass Container with 6 rounded rows */}
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-b from-white/95 via-white/90 to-white/80 p-2 space-y-1.5 border border-white/80 shadow-[0_12px_36px_rgba(11,30,63,0.08)] backdrop-blur-xl">
          {fintechItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedItem(item)}
                className="group flex items-center justify-between rounded-2xl p-3 hover:bg-gradient-to-r hover:from-[#F0F6FD] hover:to-[#FDF2F8] active:scale-[0.99] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Vibrant Radiant Gradient Icon Badge */}
                  <div
                    className={cn(
                      'grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white shadow-md bg-gradient-to-tr transition-transform group-hover:scale-110',
                      item.gradient
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-extrabold text-[#0B1E3F]">
                      {item.title}
                    </p>
                    <p className="truncate text-[11px] font-medium text-[#64748B]">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.badgeCount !== undefined && (
                    <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-[#0B1E3F] px-1.5 text-[10px] font-black text-white shadow-xs">
                      {item.badgeCount}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. "Settings & Accounts" Section */}
      <div className="relative z-10 mt-5 space-y-2">
        <h3 className="px-1 text-[18px] font-black tracking-tight text-[#0B1E3F]">
          Settings & Identity
        </h3>

        <div className="overflow-hidden rounded-[26px] bg-gradient-to-b from-white/95 via-white/90 to-white/80 p-2 space-y-1.5 border border-white/80 shadow-[0_12px_36px_rgba(11,30,63,0.08)] backdrop-blur-xl">
          {/* Item 1: Personal KYC */}
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              setSelectedItem({
                id: 'kyc',
                title: 'Personal KYC & Biometric Identity',
                subtitle: 'Government ID verification & FaceID keypass',
                gradient: 'from-[#EC4899] via-[#F43F5E] to-[#FB7185]',
                icon: User,
                details: {
                  heading: 'Verified Biometric Identity',
                  description:
                    'Your institutional bank-grade KYC profile is cryptographically bonded to your device secure hardware enclave.',
                  metrics: [
                    { label: 'Full Legal Name', value: fullName },
                    { label: 'KYC Level', value: 'Level 3 (Enterprise Unlimited)' },
                    { label: 'Biometric Keypass', value: 'Apple Secure Enclave ✓' },
                    { label: 'Jurisdiction', value: 'Global FinTech Passthrough' },
                  ],
                  statusText: 'No re-authentication required until 2027.',
                },
              })
            }
            className="group flex items-center justify-between rounded-2xl p-3 hover:bg-gradient-to-r hover:from-[#F0F6FD] hover:to-[#FDF2F8] active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#EC4899] via-[#F43F5E] to-[#FB7185] text-white shadow-md group-hover:scale-105 transition-transform">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13.5px] font-extrabold text-[#0B1E3F]">
                  Personal KYC & Biometrics
                </p>
                <p className="text-[11px] font-medium text-[#64748B]">
                  Level 3 Enterprise Verified
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-[#94A3B8] group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Item 2: Digital Wallet Quick Card */}
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              setSelectedItem({
                id: 'wallet',
                title: 'Neo-Banking Digital Wallet',
                subtitle: 'Multi-currency ledger & dynamic escrow accounts',
                gradient: 'from-[#0070F3] via-[#00B4D8] to-[#10B981]',
                icon: CreditCard,
                details: {
                  heading: 'Neo-Banking Digital Wallet',
                  description:
                    'Master multi-currency liquidity pool connected to Visa/Mastercard virtual cards with automated daily allowances.',
                  metrics: [
                    { label: 'Total Liquidity', value: `$${currentBalance.toLocaleString()}` },
                    { label: 'Survival Floor', value: '$30.00 / day' },
                    { label: 'Virtual Card', value: 'Visa Platinum ···· 3534' },
                    { label: 'Escrow Status', value: 'Guaranteed 100%' },
                  ],
                  statusText: 'All balances insured under institutional depository protections.',
                },
              })
            }
            className="group flex items-center justify-between rounded-2xl p-3 hover:bg-gradient-to-r hover:from-[#F0F6FD] hover:to-[#FDF2F8] active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#0070F3] via-[#00B4D8] to-[#10B981] text-white shadow-md group-hover:scale-105 transition-transform">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13.5px] font-extrabold text-[#0B1E3F]">
                  Digital Wallet & Cards
                </p>
                <p className="text-[11px] font-bold text-[#0070F3]">
                  ${currentBalance.toLocaleString()} · ${allowance.toFixed(0)}/day
                </p>
              </div>
            </div>
            <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
              Active ✓
            </span>
          </div>

          {/* Item 3: Student Discount Arbitrage */}
          <div
            role="button"
            tabIndex={0}
            onClick={() =>
              setSelectedItem({
                id: 'student',
                title: 'Student Discount Arbitrage',
                subtitle: 'USM campus verification & subsidy tier',
                gradient: 'from-[#8B5CF6] via-[#6366F1] to-[#3B82F6]',
                icon: GraduationCap,
                details: {
                  heading: 'Student Subsidy Arbitrage',
                  description:
                    'Active academic credential routing qualifies your account for up to 50% automated savings on Spotify, Apple Music, and developer tooling.',
                  metrics: [
                    { label: 'University', value: 'USM Engineering' },
                    { label: 'Campus ID', value: profile.studentEmail || 'student@usm.my' },
                    { label: 'Verification', value: studentVerified ? 'Verified Active ✓' : 'Instant Pre-Approved' },
                    { label: 'Annual Savings', value: '$428.00 / yr' },
                  ],
                  statusText: 'Next institutional re-check in September 2026.',
                },
              })
            }
            className="group flex items-center justify-between rounded-2xl p-3 hover:bg-gradient-to-r hover:from-[#F0F6FD] hover:to-[#FDF2F8] active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-tr from-[#8B5CF6] via-[#6366F1] to-[#3B82F6] text-white shadow-md group-hover:scale-105 transition-transform">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[13.5px] font-extrabold text-[#0B1E3F]">
                  Student Arbitrage Privileges
                </p>
                <p className="text-[11px] font-medium text-[#64748B]">
                  USM Campus Verified
                </p>
              </div>
            </div>
            <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-xs">
              -47% Off
            </span>
          </div>
        </div>
      </div>

      {/* Note: The duplicate bottom floating navigation bar has been removed as requested */}

      {/* Interactive Detail Toast/Modal if any item is tapped */}
      {selectedItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1E3F]/55 backdrop-blur-md p-4 animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-[34px] bg-gradient-to-b from-white via-white to-[#F0F6FF] p-5 shadow-2xl border border-white space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto no-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#E2E8F0]/70">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'grid h-9 w-9 place-items-center rounded-xl text-white shadow-md bg-gradient-to-tr',
                    selectedItem.gradient
                  )}
                >
                  <selectedItem.icon className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-[15px] font-black text-[#0B1E3F] leading-tight">
                    {selectedItem.details.heading}
                  </h4>
                  <p className="text-[10.5px] font-bold text-[#64748B]">
                    ID: {profile.memberId || 'FP88-9204-KL72'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="grid h-8 w-8 place-items-center rounded-full bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] active:scale-95 transition-transform cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-[12px] font-medium leading-relaxed text-[#475569]">
              {selectedItem.details.description}
            </p>

            {/* Metrics Grid with Gradient Backdrops */}
            <div className="grid grid-cols-2 gap-2">
              {selectedItem.details.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-gradient-to-b from-[#F8FAFC] to-[#EFF6FF] p-3 border border-[#E2E8F0]/80 shadow-xs"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B]">
                    {m.label}
                  </p>
                  <p className="mt-0.5 text-[12.5px] font-black text-[#0B1E3F]">
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Status Callout with Gradient Accent */}
            <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-400/30 p-3 text-emerald-900">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="text-[11px] font-bold leading-tight">
                {selectedItem.details.statusText}
              </p>
            </div>

            {/* Action Button with Vibrant Gradient */}
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className="w-full rounded-2xl bg-gradient-to-r from-[#0070F3] via-[#6366F1] to-[#EC4899] py-3 text-[13px] font-black text-white shadow-md active:scale-[0.98] hover:opacity-95 transition-all cursor-pointer"
            >
              Done & Save Controls
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
