'use client';

import * as React from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Clock,
  Gift,
  Search,
  Check,
  Lock,
  ChevronRight,
  Info,
  Sparkles,
  Cloud,
  CheckCircle2,
  X,
  ArrowRight,
  Share2,
} from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface PiggyDefenseVaultTabProps {
  onOpenAudit?: () => void;
}

export function PiggyDefenseVaultTab({ onOpenAudit }: PiggyDefenseVaultTabProps) {
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const authSession = useCtrlPayStore((s) => s.authSession);

  // Dynamic values: in Demo mode fallback to seeded 18.5, in User mode zero out
  const displayVerified = authSession?.isDemo ? (defenseVault > 0 ? defenseVault : 18.5) : defenseVault;
  const displayReward = authSession?.isDemo ? (rewardPool > 0 ? rewardPool : 3.0) : rewardPool;
  const displayPending = authSession?.isDemo ? 6.8 : 0;

  // Mascot state for 1stpic cute animation
  const [mascotMood, setMascotMood] = React.useState<'hearts' | 'waving' | 'excited'>('hearts');
  const [mascotBubble, setMascotBubble] = React.useState<string | null>(null);
  const [sparkleCount, setSparkleCount] = React.useState(0);

  // Detail modals
  const [activeModal, setActiveModal] = React.useState<
    'whatIsVault' | 'savingsFlow' | 'verifiedSavings' | 'pendingVerification' | 'rewardPool' | null
  >(null);

  const handlePiggyTap = () => {
    setSparkleCount((c) => c + 1);
    const moods: Array<'hearts' | 'waving' | 'excited'> = ['excited', 'waving', 'hearts'];
    const nextMood = moods[sparkleCount % moods.length];
    setMascotMood(nextMood);

    const quotes = [
      'Oink! RM 18.50 safe in vault! 🐷✨',
      'Zero interest, 100% in your control! 🛡️',
      'Spotify discount verified! +RM 7.40 🎉',
      'Protected by SHA-256 ledger! 🔐',
      'Keep saving and earn bonus rewards! 🎁',
    ];
    setMascotBubble(quotes[sparkleCount % quotes.length]);

    setTimeout(() => {
      setMascotBubble(null);
    }, 3200);
  };

  return (
    <div className="animate-fade-in -mx-1 pb-20 space-y-4 select-none">
      {/* ============================================================== *
       * 1. TOP HEADER: Title & Animated Cute Piggy Mascot
       * ============================================================== */}
      <div className="relative pt-1 px-1">
        {/* Top bar with clean Title & Mascot */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            {/* Piggy Defense Vault Title */}
            <h1 className="text-[28px] font-extrabold text-[#0F172A] leading-tight tracking-tight">
              Piggy
            </h1>
            <h2 className="text-[17px] font-bold text-[#1E293B] leading-snug">
              Defense Vault
            </h2>
            <p className="text-[11.5px] font-medium text-[#64748B] mt-0.5">
              Your verified savings, protected.
            </p>
          </div>

          {/* Top Right Mascot Area */}
          <div className="flex flex-col items-end justify-center">
            {/* ----------------------------------------------------------- *
             * ANIMATED CUTE PIGGY MASCOT (Golden Scale 68x68)
             * Interactive bubble positioned to the left to avoid card obstruction
             * ----------------------------------------------------------- */}
            <div
              className="relative cursor-pointer group"
              onClick={handlePiggyTap}
              title="Tap me to play!"
            >
              {/* Soft ambient mint/emerald aura glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#34D399]/35 via-pink-200/35 to-emerald-200/25 blur-lg transform group-hover:scale-110 transition-transform" />

              {/* Floating Hearts Animation */}
              <motion.div
                animate={{
                  y: [-2, -8, -2],
                  opacity: [0.7, 1, 0.7],
                  scale: [0.95, 1.05, 0.95],
                }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-3 left-1 flex gap-1 pointer-events-none z-20"
              >
                <span className="text-[12px] text-pink-500 drop-shadow-xs">❤️</span>
                <span className="text-[10px] text-pink-400 drop-shadow-xs delay-300">💖</span>
              </motion.div>

              {/* Piggy Character Container with gentle bobbing/breathing (Golden 68x68) */}
              <motion.div
                animate={{
                  y: [0, -4, 0],
                  rotate: [0, 1.5, -1.5, 0],
                }}
                transition={{
                  duration: 3.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                whileTap={{ scale: 0.9, rotate: -4 }}
                className="relative w-[68px] h-[68px] flex items-center justify-center z-10"
              >
                {/* High-Res Mascot Sticker */}
                <Image
                  src={
                    mascotMood === 'hearts'
                      ? '/piggy-hearts.png'
                      : mascotMood === 'waving'
                      ? '/piggy-waving.png'
                      : '/piggy-excited.png'
                  }
                  alt="Cute Piggy Vault Mascot"
                  width={68}
                  height={68}
                  className="object-contain drop-shadow-md select-none transition-all duration-200"
                  priority
                />

                {/* Golden coin badge next to piggy */}
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity }}
                  className="absolute -bottom-0.5 -left-0.5 grid h-4.5 w-4.5 place-items-center rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border border-white text-[9.5px] shadow-xs"
                >
                  🪙
                </motion.div>
              </motion.div>

              {/* Interactive Speech Bubble: Positioned to the LEFT of mascot so it NEVER blocks the card below */}
              <AnimatePresence>
                {mascotBubble && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, x: 12 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.85, x: 8 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 280 }}
                    className="absolute right-[74px] top-1.5 w-44 rounded-2xl bg-white/95 backdrop-blur-md p-2.5 shadow-xl border border-pink-100 text-[10.5px] font-semibold text-slate-800 z-40 pointer-events-none text-left leading-snug"
                  >
                    {mascotBubble}
                    {/* Speech bubble pointer aiming right at the pig */}
                    <div className="absolute top-3.5 -right-1.5 h-3 w-3 rotate-45 bg-white border-t border-r border-pink-100" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== *
       * 2. MAIN HERO CARD: VERIFIED SAVINGS
       * Golden Ratio proportions (phi ~ 1.618) & Luminous Fresh Mint Theme
       * ============================================================== */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setActiveModal('verifiedSavings')}
        className="rounded-[26px] bg-gradient-to-br from-[#065F46] via-[#047857] to-[#022C22] text-white p-5 sm:p-[21px] shadow-[0_20px_48px_-10px_rgba(5,150,105,0.42)] border border-[#34D399]/40 relative overflow-hidden cursor-pointer"
      >
        {/* Luminous Mint Glow Highlights */}
        <div className="absolute -top-16 -right-10 w-52 h-52 rounded-full bg-[#34D399]/22 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-8 w-44 h-44 rounded-full bg-[#10B981]/18 blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Top Row: Fibonacci 34px height balance */}
          <div className="flex items-center justify-between">
            {/* Shield Icon + Label */}
            <div className="flex items-center gap-2.5">
              <div className="grid h-[34px] w-[34px] place-items-center rounded-[12px] bg-[#10B981]/25 border border-[#34D399]/50 text-[#6EE7B7] shadow-[0_0_16px_rgba(52,211,153,0.32)]">
                <Shield className="h-4.5 w-4.5 fill-[#34D399]/20 stroke-[2.2]" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-[#ECFDF5] tracking-wide">
                  Verified Savings
                </span>
                <Info className="h-3.5 w-3.5 text-[#6EE7B7]/80 hover:text-white transition-colors" />
              </div>
            </div>

            {/* Top Right: Trend & Sparkline Chevron */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span className="text-[13px] font-black text-[#34D399] flex items-center justify-end gap-0.5 drop-shadow-xs">
                  <span className="text-[14px]">↑</span>
                  <span>+RM 6.20</span>
                </span>
                <span className="text-[9.5px] font-medium text-[#A7F3D0]/80 block leading-tight">
                  vs. last month
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-[#6EE7B7]/80" />
            </div>
          </div>

          {/* Main Amount & Golden Ratio (89px x 42px) Mint Wave Sparkline */}
          <div className="flex items-end justify-between mt-3.5">
            <div>
              <div className="text-[34px] sm:text-[36px] font-black tracking-tight text-white leading-none drop-shadow-sm tabular-nums">
                RM {displayVerified.toFixed(2)}
              </div>
              <p className="text-[11.5px] font-medium text-[#A7F3D0]/90 mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#34D399] shrink-0" />
                <span>From confirmed subscription savings</span>
              </p>
            </div>

            {/* Glowing Mint Wave SVG Sparkline */}
            <div className="w-[89px] h-[42px] shrink-0 pb-0.5">
              <svg viewBox="0 0 100 45" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="vaultMintWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#34D399" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#34D399" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="mintGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#34D399" floodOpacity="0.6" />
                  </filter>
                </defs>
                <path
                  d="M0,36 Q22,38 42,24 T82,12 T100,5"
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  filter="url(#mintGlow)"
                />
                <path
                  d="M0,36 Q22,38 42,24 T82,12 T100,5 L100,45 L0,45 Z"
                  fill="url(#vaultMintWaveGrad)"
                />
                {/* Glowing Apex Dot */}
                <circle cx="100" cy="5" r="3.5" fill="#34D399" className="animate-pulse" />
                <circle cx="100" cy="5" r="6" fill="#34D399" opacity="0.3" className="animate-ping" />
              </svg>
            </div>
          </div>

          {/* Bottom Pill Badge */}
          <div className="mt-3.5 pt-0.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#022C22]/85 backdrop-blur-md border border-[#34D399]/40 px-3.5 py-1.5 text-[10.5px] font-semibold text-[#A7F3D0] shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
              </span>
              <span>Protected by SHA-256 Ledger · 100% In Your Control</span>
            </span>
          </div>
        </div>
      </motion.div>

      {/* ============================================================== *
       * 3. SECONDARY CARDS: PENDING VERIFICATION & REWARD POOL (2 Cols)
       * Golden Ratio padding & Mint Glass theme
       * ============================================================== */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Card 1: Pending Verification */}
        <motion.div
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => setActiveModal('pendingVerification')}
          className="rounded-[22px] bg-white/75 backdrop-blur-md p-4 border border-emerald-100 shadow-[0_8px_22px_-6px_rgba(5,150,105,0.06)] hover:bg-white/90 hover:border-emerald-300/60 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-[#059669] border border-emerald-200/80">
                <Clock className="h-4 w-4 stroke-[2.2]" />
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-1 mt-2.5">
              <span className="text-[11.5px] font-bold text-slate-700">Pending Verification</span>
              <Info className="h-3 w-3 text-slate-400" />
            </div>

            <div className="text-[20px] font-extrabold text-[#0F172A] mt-1 leading-none tabular-nums">
              RM {displayPending.toFixed(2)}
            </div>
          </div>

          <p className="text-[10px] font-normal text-[#64748B] mt-2.5 leading-snug">
            Awaiting next billing cycle
          </p>
        </motion.div>

        {/* Card 2: Reward Pool */}
        <motion.div
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          onClick={() => setActiveModal('rewardPool')}
          className="rounded-[22px] bg-white/75 backdrop-blur-md p-4 border border-emerald-100 shadow-[0_8px_22px_-6px_rgba(5,150,105,0.06)] hover:bg-white/90 hover:border-emerald-300/60 transition-all cursor-pointer flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-[#059669] border border-emerald-200/80">
                <Gift className="h-4 w-4 stroke-[2.2]" />
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="flex items-center gap-1 mt-2.5">
              <span className="text-[11.5px] font-bold text-slate-700">Reward Pool</span>
            </div>

            <div className="text-[20px] font-extrabold text-[#0F172A] mt-1 leading-none tabular-nums">
              RM {displayReward.toFixed(2)}
            </div>
          </div>

          <p className="text-[10px] font-normal text-[#64748B] mt-2.5 leading-snug">
            Available in demo ledger
          </p>
        </motion.div>
      </div>

      {/* ============================================================== *
       * 4. SECTION: YOUR SAVINGS FLOW (4-Step Horizontal Pipeline)
       * ============================================================== */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-[14px] font-bold text-[#0F172A] leading-tight">
              Your Savings Flow
            </h3>
            <p className="text-[10.5px] font-normal text-[#64748B] mt-0.5">
              From potential savings to your Defense Vault
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveModal('savingsFlow')}
            className="text-[11px] font-bold text-[#0F6B55] hover:underline flex items-center gap-0.5"
          >
            <span>View Details</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* 4-Step Stepper Card matching 2ndpic */}
        <div className="rounded-[24px] bg-white/75 backdrop-blur-md p-4 border border-emerald-100/90 shadow-[0_8px_22px_-6px_rgba(5,150,105,0.06)]">
          <div className="grid grid-cols-4 items-start relative">
            {/* Step 1: PendingSweep */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-[#059669] shadow-2xs border border-emerald-200/80">
                <Search className="h-4 w-4 stroke-[2.2]" />
              </div>
              <span className="text-[9.5px] font-bold text-[#0F172A] mt-1.5 leading-tight">
                PendingSweep
              </span>
              <p className="text-[8px] font-normal text-[#64748B] mt-0.5 leading-tight">
                Found potential savings from subscriptions
              </p>
            </div>

            {/* Connecting Arrow 1 */}
            <div className="absolute left-[22%] top-3.5 text-emerald-300 pointer-events-none">
              <ArrowRight className="h-3 w-3" />
            </div>

            {/* Step 2: Verified Savings */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-[#ECFDF5] text-[#059669] shadow-2xs border border-[#A7F3D0]">
                <Check className="h-4 w-4 stroke-[2.6]" />
              </div>
              <span className="text-[9.5px] font-bold text-[#0F172A] mt-1.5 leading-tight">
                Verified Savings
              </span>
              <p className="text-[8px] font-normal text-[#64748B] mt-0.5 leading-tight">
                Confirmed after next bill check
              </p>
            </div>

            {/* Connecting Arrow 2 */}
            <div className="absolute left-[47%] top-3.5 text-emerald-300 pointer-events-none">
              <ArrowRight className="h-3 w-3" />
            </div>

            {/* Step 3: Defense Vault */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-[#047857] shadow-2xs border border-emerald-200/60">
                <Lock className="h-3.5 w-3.5 stroke-[2.2]" />
              </div>
              <span className="text-[9.5px] font-bold text-[#0F172A] mt-1.5 leading-tight">
                Defense Vault
              </span>
              <p className="text-[8px] font-normal text-[#64748B] mt-0.5 leading-tight">
                Stored in your protected ledger
              </p>
            </div>

            {/* Connecting Arrow 3 */}
            <div className="absolute left-[72%] top-3.5 text-emerald-300 pointer-events-none">
              <ArrowRight className="h-3 w-3" />
            </div>

            {/* Step 4: Reward Pool */}
            <div className="flex flex-col items-center text-center px-1">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-amber-50 text-amber-700 shadow-2xs border border-amber-200/60">
                <Gift className="h-3.5 w-3.5 stroke-[2.2]" />
              </div>
              <span className="text-[9.5px] font-bold text-[#0F172A] mt-1.5 leading-tight">
                Reward Pool
              </span>
              <p className="text-[8px] font-normal text-[#64748B] mt-0.5 leading-tight">
                Available per program rules
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== *
       * 5. INFO CARD: WHAT IS DEFENSE VAULT?
       * ============================================================== */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => setActiveModal('whatIsVault')}
        className="rounded-[22px] bg-white/75 backdrop-blur-md p-4 border border-emerald-100 shadow-[0_8px_22px_-6px_rgba(5,150,105,0.06)] flex items-center justify-between gap-3 cursor-pointer hover:bg-white/90 hover:border-emerald-300/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100/90 text-[#059669] border border-emerald-200/80 shrink-0">
            <Shield className="h-4.5 w-4.5 fill-emerald-600/20 stroke-[2]" />
          </div>
          <div>
            <h4 className="text-[12px] font-bold text-[#0F172A] leading-tight">
              What is Defense Vault?
            </h4>
            <p className="text-[10.5px] font-normal text-[#64748B] mt-0.5 leading-relaxed">
              A no-interest sandbox ledger that records your verified subscription savings. It&apos;s not a bank account, and your money stays in your control.
            </p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
      </motion.div>

      {/* ============================================================== *
       * 6. SECTION: RECENT ACTIVITY (Spotify & iCloud items from 2ndpic)
       * ============================================================== */}
      <div className="space-y-2 pt-0.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[14px] font-bold text-[#0F172A]">Recent Activity</h3>
          <button
            type="button"
            onClick={onOpenAudit}
            className="text-[11px] font-bold text-[#0F6B55] hover:underline flex items-center gap-0.5"
          >
            <span>View All</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="space-y-2">
          {/* Activity 1: Spotify Premium */}
          <div className="rounded-[18px] bg-white/70 backdrop-blur-md p-3 border border-white/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Spotify Green Logo Icon */}
              <div className="grid h-10 w-10 place-items-center rounded-full bg-[#1DB954] text-white shrink-0 shadow-xs">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.435-5.308-1.76-8.792-.963-.335.077-.67-.133-.746-.468-.077-.334.132-.67.467-.746 3.808-.87 7.076-.496 9.72 1.115.295.18.388.563.208.855zm1.225-2.724c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.134-9.97-1.168-.413.125-.85-.11-.975-.522-.125-.413.11-.85.522-.975 3.633-1.102 8.147-.568 11.244 1.332.367.226.482.71.256 1.077zm.105-2.836C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.016-.13-1.166-.624-.15-.494.13-1.016.624-1.166 3.532-1.072 9.404-.87 13.115 1.333.444.263.59.84.327 1.284-.264.444-.84.59-1.284.327z" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13px] font-bold text-[#0F172A]">Spotify Premium</h4>
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-extrabold text-[#059669] border border-emerald-200">
                    Verified
                  </span>
                </div>
                <p className="text-[10.5px] font-normal text-[#64748B] mt-0.5">
                  Subscription savings • 12 Oct 2026
                </p>
              </div>
            </div>

            <div className="text-[13.5px] font-extrabold text-[#059669]">
              + RM 7.40
            </div>
          </div>

          {/* Activity 2: iCloud Storage */}
          <div className="rounded-[18px] bg-white/70 backdrop-blur-md p-3 border border-white/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* iCloud Blue Gradient Logo Icon */}
              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-tr from-[#0284C7] to-[#38BDF8] text-white shrink-0 shadow-xs">
                <Cloud className="h-5 w-5 fill-white stroke-none" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13px] font-bold text-[#0F172A]">iCloud Storage</h4>
                  <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[8.5px] font-extrabold text-[#D97706] border border-amber-200">
                    Pending
                  </span>
                </div>
                <p className="text-[10.5px] font-normal text-[#64748B] mt-0.5">
                  Awaiting next billing cycle • 8 Oct 2026
                </p>
              </div>
            </div>

            <div className="text-[13.5px] font-extrabold text-[#059669]">
              + RM 6.80
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== *
       * INTERACTIVE DETAIL MODAL / BOTTOM SHEET
       * ============================================================== */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs p-2">
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-sm rounded-[28px] bg-white p-5 shadow-2xl border border-gray-100 space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#0F172A]">
                      {activeModal === 'whatIsVault' && 'About Piggy Defense Vault'}
                      {activeModal === 'savingsFlow' && 'Autonomous Savings Flow'}
                      {activeModal === 'verifiedSavings' && 'Verified Savings Ledger'}
                      {activeModal === 'pendingVerification' && 'Pending Verification'}
                      {activeModal === 'rewardPool' && 'Reward Pool Explained'}
                    </h3>
                    <p className="text-[10.5px] text-gray-500">CtrlPay Sandbox Architecture</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="grid h-7 w-7 place-items-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="text-[12px] text-gray-600 space-y-2.5 leading-relaxed max-h-[60vh] overflow-y-auto no-scrollbar">
                {activeModal === 'whatIsVault' && (
                  <>
                    <p>
                      <strong>Defense Vault</strong> is CtrlPay’s non-custodial, no-interest sandbox ledger designed to lock in actual subscription savings without moving real bank balances.
                    </p>
                    <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100 space-y-1">
                      <span className="font-bold text-[#059669]">Zero Financial Risk</span>
                      <p className="text-[11px] text-emerald-800">
                        Money remains safely in your actual bank account. CtrlPay tracks verified discounts, downgraded plans, and student deals, demonstrating safe financial runway growth.
                      </p>
                    </div>
                  </>
                )}

                {activeModal === 'savingsFlow' && (
                  <div className="space-y-2">
                    <p>How CtrlPay verifies real money saved:</p>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <strong>1. PendingSweep:</strong> AI flags opportunities (e.g. Spotify student plan saves RM 7.40/mo).
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <strong>2. Next Bill Check:</strong> Webhook / push notification confirms the lower bill occurred.
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <strong>3. Defense Vault:</strong> Amount moves from Pending into Verified Ledger.
                      </div>
                      <div className="p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <strong>4. Reward Pool:</strong> Earn streak points and unlock higher autonomous privileges.
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === 'verifiedSavings' && (
                  <>
                    <p>
                      You have unlocked <strong>RM {displayVerified.toFixed(2)}</strong> in cumulative subscription reductions!
                    </p>
                    <div className="rounded-xl bg-teal-50 p-3 border border-teal-100">
                      <span className="font-bold text-teal-800">SHA-256 Verified</span>
                      <p className="text-[11px] text-teal-700 mt-0.5">
                        Transactions are hash-anchored in the local sandbox block log.
                      </p>
                    </div>
                  </>
                )}

                {activeModal === 'pendingVerification' && (
                  <p>
                    Your <strong>RM {displayPending.toFixed(2)}</strong> iCloud storage downgrade is active. Once Apple charges the next lower tier on 8 Oct, this amount automatically turns into Verified Savings!
                  </p>
                )}

                {activeModal === 'rewardPool' && (
                  <p>
                    Every verified savings action contributes points to your <strong>Reward Pool (RM {displayReward.toFixed(2)})</strong>, redeemable for student campus partner perks.
                  </p>
                )}
              </div>

              {/* Close / Action Button */}
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full rounded-xl bg-[#0F3841] text-white py-2.5 text-[12px] font-bold shadow-xs hover:bg-[#0D3038] active:scale-95 transition-all text-center"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
