'use client';

import * as React from 'react';
import {
  Compass,
  Crown,
  Flame,
  Layers,
  Menu,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { ESCROW_RULES } from '@/lib/quant-engine';
import { formatDisplayCurrency, type CurrencyCode } from '@/lib/currency-ppp';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { cn } from '@/lib/utils';
import { RiskTailStrip } from '@/components/risk-tail-strip';
import { Slider } from '@/components/ui/slider';

/* ------------------------------------------------------------------ *
 * Goal model — every number is read from the deterministic store.
 * ------------------------------------------------------------------ */

export interface AscentGoal {
  id: string;
  title: string;
  sub: string;
  target: number;
  current: number;
  /** `RM` renders currency, `count` renders plain integers. */
  unit: 'RM' | 'count';
  icon: React.ElementType;
}

export function useGoals(): AscentGoal[] {
  const defenseVault = useCtrlPayStore((s) => s.defenseVault);
  const rewardPool = useCtrlPayStore((s) => s.rewardPool);
  const quarantines = useCtrlPayStore((s) => s.quarantines);
  const pendingSweeps = useCtrlPayStore((s) => s.pendingSweeps);

  return React.useMemo(() => {
    const parked = quarantines.filter((q) => q.status === 'CLAIMED').length;
    const verified = pendingSweeps.filter((s) => s.status === 'VERIFIED').length;

    return [
      {
        id: 'park-3',
        title: 'Park 3 impulse buys',
        sub: '24-hour quarantine streak',
        target: 3,
        current: parked,
        unit: 'count' as const,
        icon: Timer,
      },
      {
        id: 'vault-100',
        title: 'RM 100 in the vault',
        sub: 'credits only from verified savings',
        target: 100,
        current: defenseVault,
        unit: 'RM' as const,
        icon: PiggyBank,
      },
      {
        id: 'cancel-2',
        title: 'Verify 2 cancellations',
        sub: 'swept savings land in the vault',
        target: 2,
        current: verified,
        unit: 'count' as const,
        icon: Layers,
      },
      {
        id: 'reward-100',
        title: 'RM 100 reward pool',
        sub: 'funded by real, verified savings',
        target: 100,
        current: rewardPool,
        unit: 'RM' as const,
        icon: Sparkles,
      },
      {
        id: 'vault-300',
        title: 'RM 300 buffer',
        sub: `${Math.round(300 / ESCROW_RULES.minDailySurvivalFloorRM)} days of basic meals`,
        target: 300,
        current: defenseVault,
        unit: 'RM' as const,
        icon: ShieldCheck,
      },
      {
        id: 'vault-500',
        title: 'RM 500 fortress',
        sub: 'a month of mandates + a buffer',
        target: 500,
        current: defenseVault,
        unit: 'RM' as const,
        icon: Crown,
      },
    ];
  }, [defenseVault, rewardPool, quarantines, pendingSweeps]);
}

export function goalAmount(
  goal: AscentGoal,
  value: number,
  currency: CurrencyCode = 'MYR',
): string {
  return goal.unit === 'RM' ? formatDisplayCurrency(value, currency) : `${Math.round(value)}`;
}

export function goalProgress(goal: AscentGoal): number {
  if (goal.target <= 0) return 0;
  return Math.max(0, Math.min(1, goal.current / goal.target));
}

/* ------------------------------------------------------------------ *
 * Mountain & Switchback Road Topology matching Image 2 (Duolingo Ascent)
 * ------------------------------------------------------------------ */

const VIEW_W = 360;
const VIEW_H = 500;

interface MilestoneConfig {
  x: number;
  y: number;
  badgeNumber: number;
  side: 'left' | 'right';
  badgeTitle: string;
  badgeSub: string;
  oppositeTitle?: string;
  oppositeSub?: string;
  haloColor: string;
}

const MOUNTAIN_MILESTONES: MilestoneConfig[] = [
  {
    x: 105,
    y: 440,
    badgeNumber: 20,
    side: 'left',
    badgeTitle: 'In Control',
    badgeSub: 'Park impulse buys',
    oppositeTitle: 'Peak State',
    oppositeSub: 'Daily survival safe',
    haloColor: '#F59E0B',
  },
  {
    x: 255,
    y: 365,
    badgeNumber: 20,
    side: 'right',
    badgeTitle: 'In Control',
    badgeSub: 'Amortized subs safe',
    oppositeTitle: '7 days',
    oppositeSub: 'Consistency streak',
    haloColor: '#38BDF8',
  },
  {
    x: 105,
    y: 285,
    badgeNumber: 40,
    side: 'left',
    badgeTitle: '7 days Consistency',
    badgeSub: 'Verified savings',
    oppositeTitle: 'Focused mind',
    oppositeSub: 'No leakages',
    haloColor: '#10B981',
  },
  {
    x: 255,
    y: 205,
    badgeNumber: 24,
    side: 'right',
    badgeTitle: 'Focused mind',
    badgeSub: 'Reward pool funded',
    oppositeTitle: 'Resilience',
    oppositeSub: 'Zero NSF risk',
    haloColor: '#2DD4BF',
  },
  {
    x: 140,
    y: 135,
    badgeNumber: 50,
    side: 'left',
    badgeTitle: 'OU Forte',
    badgeSub: 'RM 300 Buffer',
    oppositeTitle: 'Fortress',
    oppositeSub: '30-day runway',
    haloColor: '#818CF8',
  },
  {
    x: 180,
    y: 55,
    badgeNumber: 100,
    side: 'right',
    badgeTitle: 'Debt-Free Summit',
    badgeSub: 'RM 500 Fortress',
    oppositeTitle: 'Summit Pure',
    oppositeSub: 'Target Reached',
    haloColor: '#FBBF24',
  },
];

/**
 * Continuous cubic bezier switchback road matching Image 2
 */
const ROAD_SVG_PATH =
  'M 180 485 C 135 480, 105 460, 105 440 C 105 400, 255 400, 255 365 C 255 325, 105 325, 105 285 C 105 245, 255 245, 255 205 C 255 170, 140 170, 140 135 C 140 95, 180 95, 180 55';

/* ------------------------------------------------------------------ *
 * Vector Student Avatars for Milestone Nodes
 * ------------------------------------------------------------------ */

function StudentAvatar({ index, haloColor }: { index: number; haloColor: string }) {
  // Diverse student avatars matching Image 2 aesthetic
  switch (index % 5) {
    case 0:
      return (
        <svg viewBox="0 0 36 36" className="h-full w-full">
          <circle cx="18" cy="18" r="17" fill="#FDE68A" />
          {/* Hair Bun */}
          <circle cx="18" cy="9" r="6" fill="#1E293B" />
          <path d="M10 17 C10 11, 26 11, 26 17 C26 21, 10 21, 10 17 Z" fill="#1E293B" />
          {/* Face */}
          <circle cx="18" cy="17" r="7" fill="#FCD34D" />
          {/* Eyes & Smile */}
          <circle cx="15.5" cy="16" r="1" fill="#0F172A" />
          <circle cx="20.5" cy="16" r="1" fill="#0F172A" />
          <path d="M16 19 Q18 21 20 19" stroke="#0F172A" strokeWidth="1" fill="none" strokeLinecap="round" />
          {/* Clothes */}
          <path d="M9 35 C9 26, 27 26, 27 35 Z" fill="#3B82F6" />
        </svg>
      );
    case 1:
      return (
        <svg viewBox="0 0 36 36" className="h-full w-full">
          <circle cx="18" cy="18" r="17" fill="#BAE6FD" />
          {/* Curly Hair */}
          <circle cx="14" cy="11" r="5" fill="#451A03" />
          <circle cx="22" cy="11" r="5" fill="#451A03" />
          <circle cx="18" cy="9" r="5.5" fill="#451A03" />
          {/* Face */}
          <circle cx="18" cy="17" r="7.5" fill="#FBBF24" />
          {/* Eyes */}
          <circle cx="15" cy="16.5" r="1.1" fill="#1E293B" />
          <circle cx="21" cy="16.5" r="1.1" fill="#1E293B" />
          {/* Clothes */}
          <path d="M8 35 C8 26, 28 26, 28 35 Z" fill="#D97706" />
        </svg>
      );
    case 2:
      return (
        <svg viewBox="0 0 36 36" className="h-full w-full">
          <circle cx="18" cy="18" r="17" fill="#BBF7D0" />
          {/* Short Dark Hair */}
          <path d="M11 15 C11 9, 25 9, 25 15 Z" fill="#0F172A" />
          {/* Face */}
          <circle cx="18" cy="17" r="7" fill="#FDE047" />
          {/* Glasses */}
          <rect x="13" y="14" width="4" height="3" rx="1" fill="none" stroke="#0F172A" strokeWidth="0.9" />
          <rect x="19" y="14" width="4" height="3" rx="1" fill="none" stroke="#0F172A" strokeWidth="0.9" />
          <line x1="17" y1="15.5" x2="19" y2="15.5" stroke="#0F172A" strokeWidth="0.9" />
          {/* Clothes */}
          <path d="M8 35 C8 26, 28 26, 28 35 Z" fill="#059669" />
        </svg>
      );
    case 3:
      return (
        <svg viewBox="0 0 36 36" className="h-full w-full">
          <circle cx="18" cy="18" r="17" fill="#DDD6FE" />
          {/* Hair & Headphones */}
          <circle cx="18" cy="12" r="6" fill="#312E81" />
          <circle cx="18" cy="17" r="7" fill="#FCD34D" />
          <circle cx="15.5" cy="16" r="1" fill="#0F172A" />
          <circle cx="20.5" cy="16" r="1" fill="#0F172A" />
          {/* Headphones around neck */}
          <path d="M12 21 C12 25, 24 25, 24 21" stroke="#EF4444" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Clothes */}
          <path d="M8 35 C8 26, 28 26, 28 35 Z" fill="#4F46E5" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 36 36" className="h-full w-full">
          <circle cx="18" cy="18" r="17" fill="#FED7AA" />
          {/* Hair */}
          <path d="M10 16 C10 8, 26 8, 26 16 Z" fill="#78350F" />
          <circle cx="18" cy="17" r="7" fill="#FDE047" />
          <circle cx="15" cy="16.5" r="1" fill="#1E293B" />
          <circle cx="21" cy="16.5" r="1" fill="#1E293B" />
          {/* Clothes with backpack strap */}
          <path d="M8 35 C8 26, 28 26, 28 35 Z" fill="#0891B2" />
          <line x1="12" y1="27" x2="16" y2="35" stroke="#0F172A" strokeWidth="2" />
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ *
 * GoalsAscent Component — Duolingo "Your Ascent" Mountain Design
 * ------------------------------------------------------------------ */

export function GoalsAscent({
  goals,
  onOpenGoal,
  className,
}: {
  goals: AscentGoal[];
  onOpenGoal: (goalId: string) => void;
  className?: string;
}) {
  const { currency, localize } = useDisplayCurrency();
  const pathRef = React.useRef<SVGPathElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // States per goal
  const states = React.useMemo(() => {
    const firstOpen = goals.findIndex((g) => g.current < g.target);
    return goals.map((g, i) => {
      if (g.current >= g.target) return 'achieved' as const;
      if (firstOpen === -1 || i === firstOpen) return 'current' as const;
      return 'locked' as const;
    });
  }, [goals]);

  const achievedCount = states.filter((s) => s === 'achieved').length;
  const currentIndex = Math.max(0, states.findIndex((s) => s === 'current'));

  // Calculate overall progress percentage along the mountain
  const baseProgressPct = Math.round(
    (goals.reduce((acc, g) => acc + goalProgress(g), 0) / Math.max(1, goals.length)) * 100,
  );

  // Interactive scrubber state (User requirement: "或者可以滑hover的")
  const [sliderPct, setSliderPct] = React.useState<number>(Math.max(15, baseProgressPct));
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const [travelerCoords, setTravelerCoords] = React.useState<{ x: number; y: number }>({
    x: 105,
    y: 440,
  });

  // Keep slider synced when real progress advances, unless user is actively sliding
  React.useEffect(() => {
    if (!isScrubbing) {
      setSliderPct(Math.max(15, baseProgressPct));
    }
  }, [baseProgressPct, isScrubbing]);

  // Compute exact point on the switchback road using SVG native methods
  React.useEffect(() => {
    if (!pathRef.current) return;
    try {
      const totalLen = pathRef.current.getTotalLength();
      // Reverse direction: 0% is at base (entry), 100% is at summit
      const dist = (sliderPct / 100) * totalLen;
      const pt = pathRef.current.getPointAtLength(dist);
      setTravelerCoords({ x: pt.x, y: pt.y });
    } catch {
      // Fallback interpolation
      const nIdx = Math.min(
        MOUNTAIN_MILESTONES.length - 1,
        Math.floor((sliderPct / 100) * MOUNTAIN_MILESTONES.length),
      );
      setTravelerCoords({
        x: MOUNTAIN_MILESTONES[nIdx].x,
        y: MOUNTAIN_MILESTONES[nIdx].y,
      });
    }
  }, [sliderPct]);

  // Handle direct pointer/touch scrub on the mountain SVG
  const handleSvgPointer = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relY = clientY - rect.top;
    // Map vertical position: bottom is 0%, top is 100%
    const fracY = Math.max(0, Math.min(1, 1 - relY / rect.height));
    const nextPct = Math.round(fracY * 100);
    setSliderPct(nextPct);
  };

  const activeMilestoneIdx = Math.min(
    goals.length - 1,
    Math.floor((sliderPct / 100) * goals.length),
  );
  const activeGoal = goals[hoveredIndex ?? activeMilestoneIdx] ?? goals[0];

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[36px] bg-gradient-to-b from-[#D2E4F2] via-[#E8F3FA] to-[#EEF7FA] p-4 text-holst-950 shadow-[0_20px_50px_-20px_rgba(4,34,43,0.18)] border border-white/90',
        className,
      )}
    >
      {/* Top Header matching Image 2: Menu / Brand on left, Soul Pure style pill on right */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 shadow-sm backdrop-blur-sm"
            aria-label="Navigation menu"
          >
            <Menu className="h-4 w-4 text-[#04222B]" />
          </button>
          <span className="text-[13px] font-extrabold tracking-tight text-[#04222B]">CtrlPay</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenGoal(activeGoal.id)}
          className="flex items-center gap-1.5 rounded-full bg-[#04222B] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-transform active:scale-95"
        >
          <Crown className="h-3 w-3 text-amber-300" />
          <span>Summit Target</span>
        </button>
      </div>

      {/* Main Title matching Image 2: "Your Ascent" */}
      <div className="mt-3 text-center">
        <h2 className="text-[28px] font-black tracking-tight text-[#04222B]">Your Ascent</h2>
        <p className="mt-0.5 text-[11px] font-semibold text-[#04222B]/60">
          {achievedCount} of {goals.length} milestones reached · Climb to financial fortress
        </p>
      </div>

      {/* Mountain & Switchback Road Interactive Visual */}
      <div
        ref={containerRef}
        onPointerDown={(e) => {
          setIsScrubbing(true);
          handleSvgPointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0) handleSvgPointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => setIsScrubbing(false)}
        className="relative mt-2 aspect-[360/500] w-full touch-none select-none"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <defs>
            {/* Mountain Body Gradient from Image 2: Luminous Mint Peak -> Alpine Cyan -> Ocean Teal -> Midnight Navy Base */}
            <linearGradient id="mountain-body-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#87D9CE" />
              <stop offset="18%" stopColor="#43AEA6" />
              <stop offset="42%" stopColor="#227083" />
              <stop offset="70%" stopColor="#144458" />
              <stop offset="100%" stopColor="#0B2838" />
            </linearGradient>

            {/* Shaded mountain slope gradient (for 3D depth) */}
            <linearGradient id="mountain-shade-grad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#04222B" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#04222B" stopOpacity="0.25" />
            </linearGradient>

            {/* Radiant Summit Sun Orb Halos */}
            <radialGradient id="summit-sun-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
              <stop offset="25%" stopColor="#FEF08A" stopOpacity="0.9" />
              <stop offset="55%" stopColor="#5EEAD4" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
            </radialGradient>

            {/* Road Achieved Progress Gradient */}
            <linearGradient id="road-progress-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0D3F4D" />
              <stop offset="50%" stopColor="#1D8B94" />
              <stop offset="100%" stopColor="#5EEAD4" />
            </linearGradient>

            {/* Soft drop-shadow filter for the ribbon road */}
            <filter id="road-3d-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#04222B" floodOpacity="0.32" />
            </filter>
          </defs>

          {/* 1. Mountain Silhouette (Central Organic Peak matching Image 2) */}
          <path
            d="M 12 500
               C 24 420, 68 290, 118 165
               C 142 105, 162 62, 180 52
               C 198 62, 218 105, 242 165
               C 292 290, 336 420, 348 500
               Z"
            fill="url(#mountain-body-grad)"
          />

          {/* Mountain Ridge Shading on right slope for authentic Behance 3D contour */}
          <path
            d="M 180 52
               C 190 120, 215 240, 235 360
               C 245 425, 265 470, 280 500
               L 348 500
               C 336 420, 292 290, 242 165
               C 218 105, 198 62, 180 52
               Z"
            fill="url(#mountain-shade-grad)"
          />

          {/* 2. Summit Radiant Sun Orb at the Peak */}
          <g>
            {/* Outer soft radiant pulses */}
            <circle cx="180" cy="52" r="52" fill="url(#summit-sun-halo)" />
            <circle cx="180" cy="52" r="30" fill="url(#summit-sun-halo)" opacity="0.85" />
            {/* Core shining orb */}
            <circle cx="180" cy="52" r="14" fill="#FFFFFF" className="drop-shadow-md" />
            <circle cx="180" cy="52" r="8" fill="#FEF9C3" />
          </g>

          {/* 3. Winding Ribbon Road (Switchbacks) */}
          <g filter="url(#road-3d-shadow)">
            {/* Underlayer shadow track */}
            <path
              d={ROAD_SVG_PATH}
              fill="none"
              stroke="rgba(4, 34, 43, 0.28)"
              strokeWidth="38"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Main Road Surface (pale mist-lavender matching Image 2) */}
            <path
              ref={pathRef}
              d={ROAD_SVG_PATH}
              fill="none"
              stroke="#F3F8FA"
              strokeWidth="28"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Traveled / Progress Fill along the road */}
            <path
              d={ROAD_SVG_PATH}
              fill="none"
              stroke="url(#road-progress-grad)"
              strokeWidth="28"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="680"
              strokeDashoffset={680 - (sliderPct / 100) * 680}
              className="transition-[stroke-dashoffset] duration-200"
            />
            {/* Center dashed lane divider */}
            <path
              d={ROAD_SVG_PATH}
              fill="none"
              stroke="rgba(4, 34, 43, 0.15)"
              strokeWidth="2"
              strokeDasharray="3 7"
              strokeLinecap="round"
            />
          </g>

          {/* 4. Road Numeric Badges directly on the ribbon road (20, 20, 40, 24, etc.) */}
          {MOUNTAIN_MILESTONES.map((m, idx) => {
            if (idx >= goals.length) return null;
            // Position number slightly offset on the road
            const offsetX = m.side === 'left' ? m.x + 22 : m.x - 22;
            const offsetY = m.y + 4;
            return (
              <text
                key={`badge-${idx}`}
                x={offsetX}
                y={offsetY}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#04222B"
                fontSize="12"
                fontWeight="900"
                fontFamily="system-ui, sans-serif"
                opacity="0.8"
                className="pointer-events-none select-none"
              >
                {m.badgeNumber}
              </text>
            );
          })}

          {/* 5. Animated Interactive Traveler Beacon (Pin on the road) */}
          <g
            className="transition-all duration-150"
            transform={`translate(${travelerCoords.x}, ${travelerCoords.y})`}
          >
            {/* Pulsing beacon waves */}
            <circle r="14" fill="#FFFFFF" opacity="0.4" className="animate-ping" />
            <circle r="9" fill="#04222B" />
            <circle r="5" fill="#5EEAD4" />
          </g>
        </svg>

        {/* 6. Milestone Nodes with Glowing Student Avatars */}
        {MOUNTAIN_MILESTONES.map((m, i) => {
          if (i >= goals.length) return null;
          const goal = goals[i];
          const isAchieved = states[i] === 'achieved';
          const isCurrent = states[i] === 'current';
          const isHovered = hoveredIndex === i;

          const leftPct = (m.x / VIEW_W) * 100;
          const topPct = (m.y / VIEW_H) * 100;

          return (
            <React.Fragment key={goal.id}>
              {/* Circular Avatar Node with Aura Ring */}
              <button
                type="button"
                onClick={() => onOpenGoal(goal.id)}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                aria-label={`${localize(goal.title)} · ${goalAmount(goal, goal.current, currency)} of ${goalAmount(goal, goal.target, currency)}`}
                className={cn(
                  'group absolute z-20 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full transition-all duration-200 active:scale-95',
                  isHovered || isCurrent ? 'scale-115 ring-4' : 'hover:scale-110',
                )}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  boxShadow: `0 0 16px 2px ${m.haloColor}66`,
                }}
              >
                {/* Glowing Outer Ring */}
                <span
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: `2.5px solid ${isAchieved ? '#10B981' : m.haloColor}`,
                    backgroundColor: '#FFFFFF',
                  }}
                />

                {/* Avatar SVG Graphic */}
                <span className="relative z-10 h-8 w-8 overflow-hidden rounded-full">
                  <StudentAvatar index={i} haloColor={m.haloColor} />
                </span>

                {/* Status indicator pip */}
                {isAchieved && (
                  <span className="absolute -bottom-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[9px] font-black text-white shadow">
                    ✓
                  </span>
                )}
              </button>

              {/* Clean, non-overlapping milestone tag badge */}
              <div
                className={cn(
                  'absolute z-10 max-w-[40%] -translate-y-1/2 transition-all duration-200 pointer-events-auto',
                  m.side === 'left' ? 'text-right' : 'text-left',
                  isHovered || isCurrent ? 'scale-105 opacity-100' : 'opacity-90',
                )}
                style={
                  m.side === 'left'
                    ? { right: `calc(${100 - leftPct}% + 26px)`, top: `${topPct}%` }
                    : { left: `calc(${leftPct}% + 26px)`, top: `${topPct}%` }
                }
              >
                <button
                  type="button"
                  onClick={() => onOpenGoal(goal.id)}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="rounded-xl bg-[#0B1E3F]/85 backdrop-blur-md px-2.5 py-1 text-white shadow-md border border-white/20 transition-all hover:bg-[#0B1E3F] text-inherit"
                >
                  <p className="text-[11px] font-extrabold leading-tight text-white truncate">
                    {localize(goal.title)}
                  </p>
                  <p className="text-[9.5px] font-bold text-[#38BDF8] mt-0.5">
                    {isAchieved ? '✓ Reached' : `${goalAmount(goal, goal.current, currency)} / ${goalAmount(goal, goal.target, currency)}`}
                  </p>
                </button>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Interactive Road Scrubber Slider ("滑" / Slider Scrub) */}
      <div className="mt-2 rounded-2xl bg-white/85 p-3 shadow-sm border border-white/80 backdrop-blur-md">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#04222B]">
          <span className="flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-holst-600" />
            <span>Ascent Scrubber</span>
          </span>
          <span className="rounded-full bg-holst-950 px-2 py-0.5 text-[10px] text-white">
            {sliderPct}% to Summit
          </span>
        </div>

        <Slider
          className="mt-2"
          min={0}
          max={100}
          step={1}
          value={sliderPct}
          onValueChange={setSliderPct}
          aria-label="Slide to explore your ascent along the mountain"
        />

        <div className="mt-1.5 flex items-center justify-between text-[9.5px] font-semibold text-holst-800">
          <span>0% Basecamp</span>
          <span className="font-extrabold text-[#04222B] truncate max-w-[160px] text-center">
            {localize(activeGoal.title)}
          </span>
          <span>100% Summit</span>
        </div>
      </div>

      {/* Floating Bottom Frosted Dock matching Image 2 ("You are here") */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-full bg-[#04222B]/90 px-4 py-2.5 text-white shadow-xl backdrop-blur-xl border border-white/20">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-[#10B981]">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          </span>
          <div className="truncate text-left">
            <p className="text-[12px] font-extrabold leading-tight">
              You are here · Milestone {activeMilestoneIdx + 1}
            </p>
            <p className="truncate text-[10px] text-white/70">{localize(activeGoal.title)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenGoal(activeGoal.id)}
          className="shrink-0 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1D8B94] to-[#2BAAB4] px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow transition-transform active:scale-95"
        >
          <Zap className="h-3 w-3" />
          <span>Stress-Test</span>
        </button>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Zoom-in drill-down — the goal's What-If Monte-Carlo Simulator
 * ------------------------------------------------------------------ */

export function GoalZoom({ goal }: { goal: AscentGoal }) {
  const { currency, format, localize } = useDisplayCurrency();
  const runWhatIf = useCtrlPayStore((s) => s.runWhatIf);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const amortizeAnnualFees = useCtrlPayStore((s) => s.amortizeAnnualFees);

  const remaining = Math.max(0, goal.target - goal.current);
  const progress = goalProgress(goal);

  const [monthly, setMonthly] = React.useState(() => {
    const seed = Math.ceil((remaining || 40) / 6 / 5) * 5;
    return Math.max(5, Math.min(100, seed || 5));
  });

  const result = React.useMemo(
    () => runWhatIf({ merchant: goal.title, amount: monthly, category: 'Shopping', isNeed: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runWhatIf, goal.title, monthly, sandboxClock, currentBalance, spentThisWeek, spentThisMonth, amortizeAnnualFees],
  );

  const months = remaining <= 0 ? 0 : monthly <= 0 ? Number.POSITIVE_INFINITY : Math.ceil(remaining / monthly);
  const etaMs = Number.isFinite(months) ? sandboxClock + months * 30 * 86_400_000 : null;

  const Icon = goal.icon;
  const r = 30;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative grid h-[86px] w-[86px] shrink-0 place-items-center">
          <svg viewBox="0 0 76 76" className="absolute inset-0 h-full w-full -rotate-90">
            <circle cx="38" cy="38" r={r} fill="none" stroke="#EAF3F1" strokeWidth="8" />
            <circle
              cx="38"
              cy="38"
              r={r}
              fill="none"
              stroke="#1D8B94"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(circumference * progress).toFixed(2)} ${circumference.toFixed(2)}`}
            />
          </svg>
          <Icon className="relative z-10 h-6 w-6 text-holst-800" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold tracking-[-0.02em] text-holst-950">{localize(goal.title)}</p>
          <p className="text-[10.5px] duo-muted">{goal.sub}</p>
          <p className="mt-1.5 inline-flex items-baseline gap-1">
            <span className="ct-int text-[22px] text-holst-950">{goalAmount(goal, goal.current, currency)}</span>
            <span className="text-[11px] font-bold duo-muted">/ {goalAmount(goal, goal.target, currency)}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Progress</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">
            {Math.round(progress * 100)}%
          </p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Remaining</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">{goalAmount(goal, remaining, currency)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">At this rate</p>
          <p className="duo-num mt-1 text-[15px] font-extrabold text-holst-950">
            {remaining <= 0 ? 'done' : Number.isFinite(months) ? `${months} mo` : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-holst-50/70 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11.5px] font-bold text-holst-950">What-if · set aside each month</p>
          <span className="duo-num text-[13px] font-extrabold text-holst-800">{format(monthly)}</span>
        </div>
        <Slider
          className="mt-2.5"
          min={5}
          max={100}
          step={5}
          value={monthly}
          onValueChange={setMonthly}
          aria-label="Monthly set-aside for this goal"
        />
        <p className="mt-2 text-[10px] leading-relaxed duo-muted">
          {etaMs
            ? `Engine projects the milestone complete by ${new Date(etaMs).toISOString().slice(0, 10)} at this rate.`
            : 'Increase the set-aside to project a completion date.'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">CFaR95 shortfall</p>
          <p className="duo-num mt-1 text-[14px] font-extrabold text-holst-950">{format(result.cfar95)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">ES95 expected tail</p>
          <p className="duo-num mt-1 text-[14px] font-extrabold text-holst-600">{format(result.es95)}</p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Shortfall chance</p>
          <p className="duo-num mt-1 text-[14px] font-extrabold text-holst-950">
            {result.shortfallProbability.toFixed(1)}%
          </p>
        </div>
        <div className="ct-metric">
          <p className="ct-kicker duo-muted">Projected month-end</p>
          <p className="duo-num mt-1 text-[14px] font-extrabold text-holst-950">
            {format(result.projectedMonthEndBalance)}
          </p>
        </div>
      </div>

      <RiskTailStrip amount={monthly} category="Shopping" isNeed result={result} variant="inline" />

      <p className="text-[10px] leading-relaxed duo-muted">
        Read-only projection from the deterministic engine · {result.pathsRun} Monte-Carlo paths · risk{' '}
        <span className="font-bold text-holst-800">{result.riskLevel}</span>. Committing money always needs a per-action
        click in the Vault tab.
      </p>
    </div>
  );
}
