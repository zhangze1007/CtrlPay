'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  X,
  MoreVertical,
  Sparkles,
  User,
  Gem,
  Palette,
  Landmark,
  Shield,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Bell,
  Lock,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { cn, formatRM } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';
import { PrivacySecurityView, AuditTrailView } from './privacy-and-security-view';

export interface ModernSettingsViewProps {
  onClose: () => void;
  onOpenSandbox?: () => void;
  onOpenAudit?: () => void;
}

export function ModernSettingsView({
  onClose,
  onOpenSandbox,
  onOpenAudit,
}: ModernSettingsViewProps) {
  const profile = useCtrlPayStore((s) => s.profile);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const masterAutonomy = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);

  // Subview routing: 'main' -> 'privacy' (页面 A) -> 'audit' (页面 B)
  const [settingsSubView, setSettingsSubView] = React.useState<'main' | 'privacy' | 'audit'>('main');
  const [activeItem, setActiveItem] = React.useState<string | null>(null);
  const [trialSetupOpen, setTrialSetupOpen] = React.useState(false);

  // Animated trial gauge percentage
  const [gaugePercent, setGaugePercent] = React.useState(0);
  React.useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1000;
    const target = 62;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      setGaugePercent(Math.round(ease * target));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Menu items exactly matching Pic 2
  const SETTINGS_ITEMS = [
    {
      id: 'connec_ai',
      icon: Sparkles,
      title: 'ConnecQ AI',
      subtitle: 'Manage Ai settings',
      detailTitle: 'Autonomous Financial Intelligence',
      detailDesc: 'ConnecQ AI monitors active subscriptions, predicts cash-flow insolvencies, and enforces real-time payment locks before overdraft events occur.',
      badge: masterAutonomy ? 'Autonomous Active' : 'Advisory Mode',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'account_details',
      icon: User,
      title: 'Account Details',
      subtitle: 'Update info, website, description',
      detailTitle: 'Account & Identification',
      detailDesc: 'Primary profile details linked to campus biometric and DuitNow identity registry.',
      badge: 'Verified Student',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'subscription_plan',
      icon: Gem,
      title: 'Subscription Plan',
      subtitle: 'Get the right plan for you business',
      detailTitle: 'Pro Student Tier Active',
      detailDesc: 'Access to unlimited OCR receipt scanning, CFaR solvency projection engine, and automated subscription downgrade interception.',
      badge: '7 Days Left',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'brand_elements',
      icon: Palette,
      title: 'Brand Elements',
      subtitle: 'Add your brand to invoice, emails',
      detailTitle: 'Theme & Brand Tokens',
      detailDesc: 'Customize app interface, campus color themes, dark mode contrast, and automated email receipt styling.',
      badge: 'Mint Campus',
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
    },
    {
      id: 'bank_account',
      icon: Landmark,
      title: 'Bank Account',
      subtitle: 'Manage connected accounts and payouts',
      detailTitle: 'Open Banking Integrations',
      detailDesc: 'Directly linked with Maybank MAE, Touch n Go eWallet, and Public Bank DuitNow push streams.',
      badge: '3 Accounts Connected',
      badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      id: 'privacy_security',
      icon: Shield,
      title: 'Privacy & Security',
      subtitle: 'Data sharing, AI consent, audit trail',
      detailTitle: 'Privacy & Cryptographic Security',
      detailDesc: 'Manage financial data access, autonomous AI consents, and cryptographic audit records.',
      badge: 'Protected',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'cfar_engine',
      icon: ShieldCheck,
      title: 'CFaR Solvency Engine',
      subtitle: 'Cash Flow at Risk & Autonomy settings',
      detailTitle: 'Zero-Overdraft Safeguard',
      detailDesc: 'Monte Carlo cash-flow simulation running 250 daily paths to prevent end-of-semester starvation.',
      badge: 'Alpha 99.4%',
      badgeColor: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    },
  ];

  // Subview rendering for 页面 A (Privacy & Security) and 页面 B (Audit Trail)
  if (settingsSubView === 'privacy') {
    return (
      <PrivacySecurityView
        onBack={() => setSettingsSubView('main')}
        onOpenAudit={() => setSettingsSubView('audit')}
      />
    );
  }

  if (settingsSubView === 'audit') {
    return (
      <AuditTrailView
        onBack={() => setSettingsSubView('privacy')}
      />
    );
  }

  // Circular gauge SVG calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (gaugePercent / 100) * circumference;

  return (
    <div className="min-h-full bg-[#F3F4F1] pb-24 text-[#1E293B] antialiased select-none font-sans">
      {/* 1. Header with Circular Close & More Button (Matching Pic 2) */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-3 pb-2 bg-[#F3F4F1]/90 backdrop-blur-md">
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#1E293B] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-gray-50 active:scale-95 transition-all"
          aria-label="Close Settings"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>

        <h1 className="text-[17px] font-bold text-[#1E293B] tracking-tight">Settings</h1>

        <button
          type="button"
          onClick={() => setTrialSetupOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#1E293B] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-gray-50 active:scale-95 transition-all"
          aria-label="More Options"
        >
          <MoreVertical className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>

      <div className="px-5 pt-3 space-y-4">
        {/* 2. User Info Profile Section (Avatar + Name + Email) - Synced with Home persona */}
        <div className="flex items-center gap-3.5 pt-1 pb-1">
          <div className="relative h-14 w-14 shrink-0 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
            <Image
              src="/alex-smith.jpg"
              alt="Alex Smith"
              fill
              className="object-cover"
              sizes="56px"
              priority
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[19px] font-bold text-[#0F172A] tracking-tight truncate leading-tight">
              Alex Smith
            </h2>
            <p className="text-[13px] text-[#64748B] truncate mt-0.5 font-normal">
              alex.smith@student.edu.my
            </p>
          </div>
        </div>

        {/* 3. 7 Days Trial Card with Circular 62% Gauge (Exact Pic 2 Matching) */}
        <div className="relative overflow-hidden rounded-[26px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-white">
          <div className="flex items-center justify-between">
            {/* Left Info */}
            <div className="space-y-1">
              <h3 className="text-[32px] font-extrabold tracking-tight text-[#0F172A] leading-none">
                7days
              </h3>
              <p className="text-[13px] text-[#64748B] pt-0.5">
                left in your trial.{' '}
                <button
                  type="button"
                  onClick={() => setTrialSetupOpen(true)}
                  className="font-semibold text-[#F59E0B] hover:text-[#D97706] transition-colors"
                >
                  Continue Setup
                </button>
              </p>
            </div>

            {/* Right Circular Gauge (62%) */}
            <div className="relative grid h-[70px] w-[70px] place-items-center">
              <svg className="h-[70px] w-[70px] -rotate-90 transform" viewBox="0 0 70 70">
                {/* Background Ring */}
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke="#E2E8F0"
                  strokeWidth="5"
                  fill="transparent"
                />
                {/* Foreground Progress Ring */}
                <circle
                  cx="35"
                  cy="35"
                  r={radius}
                  stroke="#475569"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[15px] font-bold text-[#0F172A] tracking-tight">
                  {gaugePercent}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. "All Settings" Section Header */}
        <div className="pt-2">
          <h4 className="text-[13.5px] font-bold text-[#334155] px-1 pb-2">
            All Settings
          </h4>

          {/* 5. Rounded Setting Item Buttons (Matching Pic 2) */}
          <div className="space-y-2.5">
            {SETTINGS_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'privacy_security') {
                      setSettingsSubView('privacy');
                    } else {
                      setActiveItem(activeItem === item.id ? null : item.id);
                    }
                  }}
                  className="group flex w-full flex-col rounded-[22px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-white hover:border-gray-200/80 active:scale-[0.99] transition-all text-left"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#F8FAFC] text-[#1E293B] group-hover:bg-[#F1F5F9] transition-colors">
                        <Icon className="h-5 w-5 stroke-[2]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[15px] font-bold text-[#0F172A] leading-tight truncate">
                          {item.title}
                        </p>
                        <p className="text-[12px] text-[#64748B] leading-tight mt-1 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-[#94A3B8] transition-transform duration-200',
                        activeItem === item.id ? 'rotate-90 text-[#0F172A]' : 'group-hover:translate-x-0.5'
                      )}
                    />
                  </div>

                  {/* Expandable detail card */}
                  {activeItem === item.id && (
                    <div className="mt-3.5 pt-3.5 border-t border-gray-100 text-[12px] text-[#475569] space-y-2 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0F172A]">{item.detailTitle}</span>
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                            item.badgeColor
                          )}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="leading-relaxed text-[#64748B]">{item.detailDesc}</p>

                      {item.id === 'connec_ai' && (
                        <div className="pt-2 flex items-center justify-between">
                          <span className="font-semibold text-[#0F172A]">AI Master Autonomy</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMasterAutonomy(!masterAutonomy);
                            }}
                            className={cn(
                              'px-3 py-1 rounded-full text-[11px] font-bold text-white transition-all',
                              masterAutonomy ? 'bg-emerald-600' : 'bg-gray-600'
                            )}
                          >
                            {masterAutonomy ? 'Enabled (T3)' : 'Advisory (T1)'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Setup Modal Dialog */}
        {trialSetupOpen && (
          <div className="rounded-[22px] bg-white p-4 shadow-md border border-amber-200/60 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-[#0F172A]">Complete Your Setup</span>
              <button
                type="button"
                onClick={() => setTrialSetupOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11.5px] text-[#64748B]">
              Connect your student ID card or campus bank account to unlock the full zero-overdraft CFaR shield and automatic student tier discounts.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTrialSetupOpen(false)}
                className="flex-1 py-2 rounded-xl bg-[#0F172A] text-white text-[11.5px] font-bold text-center"
              >
                Verify Student Card
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
