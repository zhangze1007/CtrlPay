'use client';

import * as React from 'react';
import Image from 'next/image';
import { Camera, Check, ShieldCheck, Sparkles, User, CreditCard, LogOut } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { Slider } from '@/components/ui/slider';

export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const profile = useCtrlPayStore((s) => s.profile);
  const setProfile = useCtrlPayStore((s) => s.setProfile);
  const userLimits = useCtrlPayStore((s) => s.userLimits);
  const aiMandate = useCtrlPayStore((s) => s.aiMandate);
  const setAiMandate = useCtrlPayStore((s) => s.setAiMandate);
  const authSession = useCtrlPayStore((s) => s.authSession);
  const loginAsDemo = useCtrlPayStore((s) => s.loginAsDemo);
  const resetToZeroData = useCtrlPayStore((s) => s.resetToZeroData);
  const logout = useCtrlPayStore((s) => s.logout);

  const [name, setName] = React.useState(profile.fullName);
  const [email, setEmail] = React.useState(profile.studentEmail);
  const [saved, setSaved] = React.useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile({ fullName: name.trim() || 'Jerome Bell', studentEmail: email.trim() || 'jerome.bell@fintech.io' });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 900);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4 pt-1">
      {/* Avatar Header */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="relative group">
          <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-white shadow-lg bg-[#0B1E3F]">
            <Image
              src={profile.avatar || '/avatar.jpg'}
              alt={name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
              unoptimized
            />
          </div>
          <button
            type="button"
            className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-[#1C7EC8] text-white shadow-md transition-transform hover:scale-110 active:scale-95"
            aria-label="Change avatar"
            onClick={() => {
              // Toggle avatar or simulate upload
              const nextAvatar = profile.avatar.includes('avatar.jpg') ? '/avatar.jpg' : '/avatar.jpg';
              setProfile({ avatar: nextAvatar });
            }}
          >
            <Camera className="h-3.5 w-3.5" />
          </button>
        </div>

        <h3 className="mt-2.5 text-[17px] font-extrabold text-[#0B1E3F] tracking-tight">{name}</h3>
        <p className="text-[11.5px] font-medium text-[#64748B]">{email}</p>

        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#EBF4FF] px-3 py-1 text-[10.5px] font-bold text-[#1C7EC8]">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Neo-Banking Verified · Member #{profile.memberId}</span>
        </div>
      </div>

      {/* Profile Details Card */}
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm border border-white/80 space-y-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
            Display Name
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              className="w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#0B1E3F] focus:border-[#1C7EC8] focus:outline-none focus:ring-1 focus:ring-[#1C7EC8]"
            />
            <User className="absolute right-3.5 top-3 h-4 w-4 text-[#94A3B8]" />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            className="w-full rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#0B1E3F] focus:border-[#1C7EC8] focus:outline-none focus:ring-1 focus:ring-[#1C7EC8]"
          />
        </div>
      </div>

      {/* Wallet Overview & Digital Vault */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B1E3F] via-[#102A54] to-[#1C7EC8] p-4 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/20 text-white backdrop-blur-md">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-[12px] font-bold text-white/80">Digital Wallet & Payout</span>
          </div>
          <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-300">
            Active ✓
          </span>
        </div>

        <div className="mt-3">
          <p className="text-[11px] font-medium text-white/70">Total Available Balance</p>
          <p className="text-[26px] font-black tracking-tight text-white leading-tight">
            RM 56,750.00
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/15 pt-2.5 text-[11px]">
          <div>
            <p className="text-white/70 font-medium">Safe Allowance</p>
            <p className="font-extrabold text-white text-[13px]">RM 89.40 / day</p>
          </div>
          <div>
            <p className="text-white/70 font-medium">Defense Vault</p>
            <p className="font-extrabold text-white text-[13px]">RM 150.00 saved</p>
          </div>
        </div>
      </div>

      {/* Spending Limits & Budget Controls */}
      <div className="rounded-2xl bg-white/90 p-4 shadow-sm border border-white/80 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-[#0B1E3F]">Monthly Budget Cap</p>
          <span className="text-[12.5px] font-extrabold text-[#1C7EC8]">
            RM {userLimits.monthlyPayLimit.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[12px] font-bold text-[#0B1E3F]">AI Mandate Max Lock</p>
          <span className="text-[12.5px] font-extrabold text-[#1C7EC8]">
            RM {aiMandate.maxLockAmountRM}
          </span>
        </div>
        <Slider
          className="mt-1"
          min={10}
          max={500}
          step={10}
          value={aiMandate.maxLockAmountRM}
          onValueChange={(v) => setAiMandate({ maxLockAmountRM: v })}
          aria-label="Max lock amount"
        />

        <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#64748B]">
            <CreditCard className="h-3.5 w-3.5 text-[#1C7EC8]" /> Active Card
          </span>
          <span className="font-mono text-[11px] font-bold text-[#0B1E3F]">Visa Signature · 4850 **** 7459</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        type="submit"
        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#0B1E3F] py-3.5 text-[13.5px] font-extrabold text-white shadow-lg transition-transform active:scale-98 hover:bg-[#122A54]"
      >
        {saved ? (
          <>
            <Check className="h-4 w-4 text-[#10B981]" />
            <span>Profile Saved!</span>
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 text-[#62AEED]" />
            <span>Save Profile</span>
          </>
        )}
      </button>

      {/* Account Switching & Log Out */}
      <div className="pt-2 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={() => {
            if (authSession?.isDemo) {
              resetToZeroData();
            } else {
              loginAsDemo();
            }
            onClose();
          }}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-[12.5px] font-bold text-slate-700 transition-all active:scale-98"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#10606F]" />
            <span>{authSession?.isDemo ? 'Switch to Zero-Data User Mode' : 'Switch to Demo Account'}</span>
          </span>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-white text-slate-600 shadow-2xs">
            {authSession?.isDemo ? 'Zero Mode' : 'Demo'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            logout();
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-[12.5px] font-bold transition-all active:scale-98"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out to Sign In Screen</span>
        </button>
      </div>
    </form>
  );
}
