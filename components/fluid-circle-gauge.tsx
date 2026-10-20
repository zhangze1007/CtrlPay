'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useDisplayCurrency } from '@/lib/use-display-currency';
import { BarChart2, Clapperboard, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

export interface FluidCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  amount: number;
  subCount: number;
  fillPercent: number; // 0 to 100
  color: string;
}

export interface FluidCircleGaugeProps {
  categories: FluidCategory[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
}

const CX = 140;
const CY = 140;
const R = 88;
const TH = 26;
const ORBIT = R + TH / 2 + 18;
const CAPSULE_ANGLES = [-52, -26, 0];

function polar(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

function arcPathDir(fromDeg: number, toDeg: number, r: number, clockwise: boolean): string {
  const a = polar(fromDeg, r);
  const b = polar(toDeg, r);
  let delta = toDeg - fromDeg;
  if (clockwise) {
    while (delta < 0) delta += 360;
    while (delta >= 360) delta -= 360;
  } else {
    while (delta > 0) delta -= 360;
    while (delta <= -360) delta += 360;
  }
  const large = Math.abs(delta) > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} ${clockwise ? 1 : 0} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function FluidCircleGauge({
  categories,
  activeId,
  onSelect,
  className,
}: FluidCircleGaugeProps) {
  const { format, localize } = useDisplayCurrency();
  const activeCat = categories.find((c) => c.id === activeId) ?? categories[0];
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');

  // Liquid level: Y coordinates inside the 120px circular core
  // Center is (140, 140), radius is 60.
  // 0% -> y = 200, 100% -> y = 80
  const fillPercent = activeCat ? activeCat.fillPercent : 65;
  const liquidY = 200 - (fillPercent / 100) * 120;

  // Wave path: repeating sinusoidal Bézier curve spanning 400px so it loops seamlessly when translating -50% (200px)
  const waveW = 200;
  const waveAmp1 = 7;
  const waveAmp2 = 5;

  const buildWaveD = (amp: number) => `
    M 0 ${liquidY}
    q ${waveW / 4} ${-amp}, ${waveW / 2} 0
    t ${waveW / 2} 0
    t ${waveW / 2} 0
    t ${waveW / 2} 0
    V 240
    H 0
    Z
  `;

  return (
    <div className={cn('relative aspect-square w-full select-none', className)}>
      <svg
        viewBox="0 0 280 280"
        className="absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          {/* Circular mask for the inner liquid fluid chamber */}
          <clipPath id={`${uid}-liquid-clip`}>
            <circle cx={CX} cy={CY} r="60" />
          </clipPath>

          {/* Liquid gradient 1 (front luminous wave) */}
          <linearGradient id={`${uid}-liquid-grad-1`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#1C7EC8" stopOpacity="0.90" />
            <stop offset="100%" stopColor="#0B1E3F" stopOpacity="0.96" />
          </linearGradient>

          {/* Liquid gradient 2 (back ambient wave) */}
          <linearGradient id={`${uid}-liquid-grad-2`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#2563EB" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.80" />
          </linearGradient>

          {/* Outer glowing liquid ring stroke gradient */}
          <linearGradient id={`${uid}-ring-flow`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0B1E3F" />
            <stop offset="45%" stopColor="#1C7EC8" />
            <stop offset="75%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#93C5FD" />
          </linearGradient>

          {/* Inner glass reflection gradient */}
          <linearGradient id={`${uid}-glass-reflection`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.10" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* 1. Outer faint dashed concentric orbit */}
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT}
          fill="none"
          stroke="rgba(11, 30, 63, 0.12)"
          strokeWidth="1.2"
          strokeDasharray="2 6"
        />

        {/* 2. Outer track background */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke="rgba(11, 30, 63, 0.07)"
          strokeWidth={TH}
        />

        {/* 3. Donut Ring Segments matching Image 2 right screen */}
        {/* Segment A: Main active navy arc (Invested / Active) */}
        <path
          d={arcPathDir(30, 240, R, true)}
          fill="none"
          stroke="url(#${uid}-ring-flow)"
          strokeWidth={TH}
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Segment B: Secondary ice blue arc (Profit / Savings) */}
        <path
          d={arcPathDir(260, 345, R, true)}
          fill="none"
          stroke="#93C5FD"
          strokeWidth={TH}
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Curved Text riding the outer arc band via textPath */}
        <path id={`${uid}-path-a`} d={arcPathDir(55, 215, R, true)} fill="none" />
        <text
          fontSize="10.5"
          fontWeight="800"
          letterSpacing="0.06em"
          fill="#FFFFFF"
          dominantBaseline="central"
        >
          <textPath href={`#${uid}-path-a`} startOffset="24%" textAnchor="middle">
            ACTIVE
          </textPath>
        </text>
        <text
          fontSize="11"
          fontWeight="800"
          letterSpacing="0.03em"
          fill="#93C5FD"
          dominantBaseline="central"
        >
          <textPath href={`#${uid}-path-a`} startOffset="78%" textAnchor="middle">
            {format(132, { decimals: 0 })}/mo
          </textPath>
        </text>

        <path id={`${uid}-path-b`} d={arcPathDir(275, 335, R, true)} fill="none" />
        <text
          fontSize="10"
          fontWeight="800"
          letterSpacing="0.04em"
          fill="#0B1E3F"
          dominantBaseline="central"
        >
          <textPath href={`#${uid}-path-b`} startOffset="50%" textAnchor="middle">
            {localize('RM 1.5k/yr')}
          </textPath>
        </text>

        {/* 4. Center Circular Liquid Core ("液体流动的") */}
        {/* Glass core chamber backing */}
        <circle
          cx={CX}
          cy={CY}
          r="60"
          fill="#EBF4FE"
          stroke="rgba(255, 255, 255, 0.9)"
          strokeWidth="3"
          className="shadow-inner"
        />

        {/* Clipped flowing liquid waves */}
        <g clipPath={`url(#${uid}-liquid-clip)`}>
          {/* Back wave: smooth horizontal translate */}
          <path
            d={buildWaveD(waveAmp2)}
            fill={`url(#${uid}-liquid-grad-2)`}
            className="animate-liquid-wave-2"
            style={{ width: '400px' }}
          />

          {/* Front wave: smooth opposing horizontal translate */}
          <path
            d={buildWaveD(waveAmp1)}
            fill={`url(#${uid}-liquid-grad-1)`}
            className="animate-liquid-wave-1"
            style={{ width: '400px' }}
          />

          {/* Liquid surface highlight specular line */}
          <ellipse
            cx={CX}
            cy={liquidY}
            rx="52"
            ry="4.5"
            fill="none"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="1.5"
          />

          {/* Rising micro-bubbles */}
          <circle
            cx={CX - 22}
            cy={CY + 18}
            r="3"
            fill="rgba(255, 255, 255, 0.65)"
            style={{ animation: 'liquid-bubble 2.8s ease-in-out infinite' }}
          />
          <circle
            cx={CX + 28}
            cy={CY + 26}
            r="2"
            fill="rgba(255, 255, 255, 0.55)"
            style={{ animation: 'liquid-bubble 3.4s ease-in-out infinite 0.7s' }}
          />
          <circle
            cx={CX + 4}
            cy={CY + 36}
            r="2.5"
            fill="rgba(255, 255, 255, 0.5)"
            style={{ animation: 'liquid-bubble 2.2s ease-in-out infinite 1.4s' }}
          />
        </g>

        {/* Outer glass orb highlight ring */}
        <circle
          cx={CX}
          cy={CY}
          r="60"
          fill="none"
          stroke="rgba(255, 255, 255, 0.75)"
          strokeWidth="2.5"
        />
        {/* Diagonal glass reflection crescent */}
        <circle
          cx={CX}
          cy={CY}
          r="58"
          fill={`url(#${uid}-glass-reflection)`}
          pointerEvents="none"
        />
      </svg>

      {/* 5. Center Information Overlay - High Contrast Crisp Typography */}
      <div
        onClick={() => {
          // Tap to cycle through categories
          const nextIdx = (categories.findIndex((c) => c.id === activeId) + 1) % categories.length;
          onSelect(categories[nextIdx].id);
        }}
        className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer transition-transform active:scale-95 group"
        title="Tap to switch category"
      >
        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#0B1E3F]/80 drop-shadow-sm">
          {activeCat?.label ?? 'Monthly'}
        </span>
        <div className="mt-0.5 flex items-baseline gap-0.5">
          <span className="text-[28px] sm:text-[32px] font-black tracking-[-0.04em] text-[#0B1E3F] leading-none drop-shadow-sm">
            {format(activeCat?.amount ?? 0, { decimals: 0 })}
          </span>
          <span className="text-[12px] font-extrabold text-[#0B1E3F]/75">/mo</span>
        </div>
        <div className="mt-1 flex items-center gap-1 rounded-full bg-white/70 backdrop-blur-md px-2 py-0.5 shadow-xs border border-white/80">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[9.5px] font-bold text-[#0B1E3F]">
            {activeCat?.subCount ?? 6} Active
          </span>
        </div>
      </div>

      {/* 6. Orbital Capsule Switcher Buttons on the Top Arc */}
      {categories.slice(0, 3).map((c, i) => {
        const angle = CAPSULE_ANGLES[i] ?? -30;
        const p = polar(angle, ORBIT);
        const Icon = c.icon;
        const isActive = activeId === c.id;

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            aria-label={c.label}
            aria-pressed={isActive}
            className={cn(
              'absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border transition-all duration-200 active:scale-90',
              isActive
                ? 'bg-[#0B1E3F] text-white border-white shadow-md shadow-[#0B1E3F]/25 scale-110'
                : 'bg-white/90 text-[#0B1E3F] border-white/90 shadow-sm hover:bg-white'
            )}
            style={{
              left: `${(p.x / 280) * 100}%`,
              top: `${(p.y / 280) * 100}%`,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
