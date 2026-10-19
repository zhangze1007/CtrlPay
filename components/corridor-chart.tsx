'use client';

import * as React from 'react';
import { cn, formatRM } from '@/lib/utils';

export interface CorridorPoint {
  /** Axis label, e.g. a weekday. */
  label: string;
  /** Normal balance path (upper boundary). */
  upper: number;
  /** 95% CFaR / ES95 tail lower boundary. */
  lower: number;
  /** Small chip under the axis label (e.g. a scheduled deduction). */
  note?: string;
}

const W = 360;
const H = 176;
const PAD_TOP = 44;
const PAD_BOTTOM = 26;
const PAD_X = 26;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export interface CorridorBill {
  dueDay: number;
  amountRM: number;
  paid: boolean;
}

/**
 * Projects the next N days into a corridor: the upper boundary is the normal balance path
 * (allowance + scheduled bills, minus any proposed spend on day 0) and the lower boundary
 * is that path minus the engine's ES95 tail, widening with √t (diffusion scaling).
 */
export function buildCorridor({
  clock,
  balance,
  allowance,
  bills,
  tail,
  proposedOnDay0 = 0,
  days = 7,
}: {
  clock: number;
  balance: number;
  allowance: number;
  bills: CorridorBill[];
  tail: number;
  proposedOnDay0?: number;
  days?: number;
}): { points: CorridorPoint[]; riskIndex: number } {
  const today = new Date(clock).getUTCDate();
  const points: CorridorPoint[] = [];
  let bal = balance - proposedOnDay0;

  for (let i = 0; i < days; i++) {
    const due = bills
      .filter((b) => !b.paid && b.dueDay === today + i)
      .reduce((sum, b) => sum + b.amountRM, 0);
    if (i > 0) bal -= allowance;
    bal -= due;
    const widen = tail * Math.sqrt(i / Math.max(1, days - 1));
    const day = new Date(clock + i * 86_400_000);
    points.push({
      label: WEEKDAYS[day.getUTCDay()],
      upper: Math.round(bal * 100) / 100,
      lower: Math.round((bal - widen) * 100) / 100,
      note: due > 0 ? `-${formatRM(due)}` : undefined,
    });
  }

  const riskIndex = points.reduce((best, p, i) => (p.upper < points[best].upper ? i : best), 0);
  return { points, riskIndex };
}

/**
 * 45° hatched corridor band: every node carries a 4px dot on the normal balance path and
 * one on the tail bound, the two boundaries are joined into a polygon and the key risk day
 * gets a dumbbell plus a white capsule showing the exact money.
 */
export function CorridorChart({
  points,
  riskIndex,
  onSelectDay,
  idPrefix = 'ct-corridor',
  className,
}: {
  points: CorridorPoint[];
  riskIndex: number;
  onSelectDay?: (index: number) => void;
  idPrefix?: string;
  className?: string;
}) {
  const n = Math.max(points.length, 1);
  const all = points.flatMap((p) => [p.upper, p.lower]);
  const rawMax = Math.max(...all, 1);
  const rawMin = Math.min(...all);
  // 8% headroom so the risk capsule and the tail dots never touch the frame.
  const pad = (rawMax - rawMin || 1) * 0.08;
  const max = rawMax + pad;
  const min = rawMin - pad;
  const span = max - min || 1;

  const x = (i: number) => (n <= 1 ? W / 2 : PAD_X + (i / (n - 1)) * (W - PAD_X * 2));
  const y = (v: number) => PAD_TOP + (1 - (v - min) / span) * (H - PAD_TOP - PAD_BOTTOM);

  const upper = points.map((p, i) => ({ x: x(i), y: y(p.upper) }));
  const lower = points.map((p, i) => ({ x: x(i), y: y(p.lower) }));

  const band = [
    ...upper.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    ...[...lower].reverse().map((p) => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    'Z',
  ].join(' ');

  const risk = Math.max(0, Math.min(riskIndex, n - 1));
  const riskUpper = upper[risk];
  const riskLower = lower[risk];
  const riskPoint = points[risk];

  const hatchId = `${idPrefix}-hatch`;
  const clipId = `${idPrefix}-clip`;
  const capId = `${idPrefix}-cap`;

  const frac = riskUpper.x / W;
  // Keep the capsule inside the card and slide its caret back under the risk dot.
  const tx = frac > 0.62 ? -92 : frac < 0.38 ? -8 : -50;
  const caret = frac > 0.62 ? 92 : frac < 0.38 ? 8 : 50;

  return (
    <div className={cn('relative', className)}>
      {/* Positioning box for the capsule: matches the SVG box exactly. */}
      <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[176px] w-full" aria-hidden>
        <defs>
          <pattern id={hatchId} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#0A3D4A" strokeWidth="3" strokeOpacity="0.34" />
          </pattern>
          <linearGradient id={capId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D8B94" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#98D8D0" stopOpacity="0.05" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d={band} />
          </clipPath>
        </defs>

        {/* Hatched corridor interior. */}
        <path d={band} fill={`url(#${capId})`} />
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width={W} height={H} fill={`url(#${hatchId})`} />
        </g>

        {/* Upper + lower boundaries. */}
        <path
          d={upper.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')}
          fill="none"
          stroke="#04222B"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={lower.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')}
          fill="none"
          stroke="#0A3D4A"
          strokeWidth="1.2"
          strokeOpacity="0.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />

        {/* 4px node dots on both boundaries. */}
        {upper.map((p, i) => (
          <circle key={`u${i}`} cx={p.x} cy={p.y} r="2" fill="#04222B" />
        ))}
        {lower.map((p, i) => (
          <circle key={`l${i}`} cx={p.x} cy={p.y} r="2" fill="#0A3D4A" fillOpacity="0.6" />
        ))}

        {/* Dumbbell on the key risk day. */}
        <line
          x1={riskUpper.x}
          y1={riskUpper.y}
          x2={riskLower.x}
          y2={riskLower.y}
          stroke="#B3253F"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx={riskUpper.x} cy={riskUpper.y} r="4.4" fill="#04222B" stroke="#FFFFFF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <circle cx={riskLower.x} cy={riskLower.y} r="4.4" fill="#F43F5E" stroke="#FFFFFF" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>

      {/* White capsule on the risk day. */}
      <span
        className="ct-chart-bubble"
        style={{
          left: `${(riskUpper.x / W) * 100}%`,
          top: `${(riskUpper.y / H) * 100}%`,
          transform: `translate(${tx}%, -132%)`,
          ['--caret-x' as string]: `${caret}%`,
        }}
      >
        {riskPoint ? (riskPoint.upper >= 100 ? `RM ${Math.round(riskPoint.upper)}` : formatRM(riskPoint.upper)) : 'RM 240.00'}
      </span>
      </div>

      {/* Axis with clickable day columns. */}
      <div className="relative mt-2 h-7 flex items-center justify-between px-3">
        {points.map((p, i) => (
          <button
            key={`${p.label}-${i}`}
            type="button"
            onClick={() => onSelectDay?.(i)}
            className={cn(
              'text-center text-[10.5px] font-bold tracking-tight transition-colors',
              i === risk ? 'text-[#04222B] font-extrabold' : 'text-[#04222B]/60 hover:text-[#04222B]',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The Expense-Overview card that hosts a corridor band: ice-mint rounded-[28px] surface, a
 * 42px thin-stroke circle + title on the left, calendar and ↗ round buttons on the right.
 */
export function CorridorCard({
  icon: Icon,
  kicker,
  title,
  badge,
  points,
  riskIndex,
  metrics,
  footer,
  children,
  className,
  onDrill,
  defaultOpen = false,
  calendarLabel = 'Toggle day breakdown',
  drillLabel = 'Run to the end of the corridor',
}: {
  icon: React.ElementType;
  kicker: string;
  title: string;
  badge?: React.ReactNode;
  points: CorridorPoint[];
  riskIndex: number;
  metrics: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onDrill?: () => void;
  defaultOpen?: boolean;
  calendarLabel?: string;
  drillLabel?: string;
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <section className={cn('ct-corridor p-4', className)}>
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="ct-corridor-icon shrink-0">
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="ct-kicker duo-muted">{kicker}</p>
            <h2 className="text-[15px] font-extrabold tracking-[-0.02em] text-holst-950">{title}</h2>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            className="ct-round-btn"
            aria-label={calendarLabel}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <CalendarGlyph />
          </button>
          <button type="button" className="ct-round-btn" aria-label={drillLabel} onClick={onDrill}>
            <DrillGlyph />
          </button>
        </div>
      </header>

      {badge && <div className="mt-2.5">{badge}</div>}

      <CorridorChart points={points} riskIndex={riskIndex} className="mt-2" />

      <div className="mt-2">{metrics}</div>

      {footer && <div className="mt-3">{footer}</div>}

      {open && children && <div className="mt-3">{children}</div>}
    </section>
  );
}

/**
 * Image 2: Exact "Expense Overview" Card.
 * Electric lime-green background (#D4F435), 42px hand-coins icon,
 * dual 42px round buttons (Calendar + Arrow ↗), $120.00 34px geometric sans amount,
 * and 45° hatched corridor graph with Sun-Sat columns and Wed dumbbell + white capsule.
 */
export function ExpenseOverviewCard({
  amount = 'RM 120.00',
  points,
  riskIndex: defaultRiskIndex = 3, // Default to Wednesday
  onCalendarClick,
  onDrillClick,
  className,
}: {
  amount?: string;
  points?: CorridorPoint[];
  riskIndex?: number;
  onCalendarClick?: () => void;
  onDrillClick?: () => void;
  className?: string;
}) {
  const [selectedDay, setSelectedDay] = React.useState(defaultRiskIndex);

  // Default 7-day points if not provided, exactly mirroring Image 2 trajectory
  const defaultPoints: CorridorPoint[] = React.useMemo(() => [
    { label: 'Sun', upper: 72, lower: 38 },
    { label: 'Mon', upper: 96, lower: 64 },
    { label: 'Tue', upper: 145, lower: 98 },
    { label: 'Wed', upper: 142, lower: 92 },
    { label: 'Thu', upper: 144, lower: 110 },
    { label: 'Fri', upper: 145, lower: 124 },
    { label: 'Sat', upper: 138, lower: 104 },
  ], []);

  const chartPoints = points && points.length >= 7 ? points.slice(0, 7) : defaultPoints;

  return (
    <section
      className={cn(
        'relative rounded-[32px] p-5 shadow-[0_20px_48px_-24px_rgba(4,34,43,0.35)] transition-all',
        className,
      )}
      style={{
        background: 'linear-gradient(155deg, #E2F93C 0%, #D4F435 52%, #C2E824 100%)',
        color: '#04222B',
      }}
    >
      {/* Top Bar (3-round button layout) */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-[42px] w-[42px] place-items-center rounded-full border border-[#04222B]/25 bg-white/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 text-[#04222B]"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="12" cy="7" r="3.5" />
              <path d="M12 5.5v3M10.8 6.5h2.4" />
              <path d="M3 16c2.5-1.5 5-2 8-2 2.5 0 4.5.8 7 2.2l2.5 1.5a2 2 0 0 1 .5 2.8l-.5.8a2 2 0 0 1-2.5.7L14 20" />
              <path d="M3 16v4a2 2 0 0 0 2 2h6" />
            </svg>
          </div>
          <h2 className="text-[16px] font-bold tracking-tight text-[#04222B]">Expense Overview</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Calendar round button */}
          <button
            type="button"
            onClick={onCalendarClick}
            aria-label="Toggle calendar view"
            className="grid h-[42px] w-[42px] place-items-center rounded-full border border-[#04222B]/20 bg-[#04222B]/5 text-[#04222B] transition-transform hover:scale-105 active:scale-95"
          >
            <CalendarGlyph />
          </button>
          {/* Arrow ↗ pure white round button */}
          <button
            type="button"
            onClick={onDrillClick}
            aria-label="Expand stress test details"
            className="grid h-[42px] w-[42px] place-items-center rounded-full bg-white text-[#04222B] shadow-[0_4px_14px_rgba(4,34,43,0.15)] transition-transform hover:scale-105 active:scale-95"
          >
            <DrillGlyph />
          </button>
        </div>
      </header>

      {/* Main value display: left-aligned 34px geometric sans */}
      <div className="mt-4">
        <h1 className="text-[34px] font-extrabold leading-none tracking-[-0.035em] text-[#04222B] tabular-nums">
          {amount}
        </h1>
      </div>

      {/* 45° Hatched Corridor Band Graph */}
      <div className="mt-2">
        <CorridorChart
          points={chartPoints}
          riskIndex={selectedDay}
          onSelectDay={setSelectedDay}
          idPrefix="expense-ov"
        />
      </div>
    </section>
  );
}

export function CalendarGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2.5" y="3.5" width="13" height="12" rx="3" />
      <path d="M2.5 7.5h13M6 2v3M12 2v3" />
      <circle cx="6.5" cy="11.5" r=".75" fill="currentColor" />
      <circle cx="11.5" cy="11.5" r=".75" fill="currentColor" />
    </svg>
  );
}

export function DrillGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 13 13 5M6.5 5H13v6.5" />
    </svg>
  );
}
