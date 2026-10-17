'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Plus, Download, Send, Info, TrendingUp, Sparkles } from 'lucide-react';

export interface ExpenseSegment {
  id: string;
  label: string;
  icon: string; // Emoji / visual
  amount: number;
  percentage: number;
  color: string;
  textColor: string;
  description: string;
  accentDot?: string;
}

const EXPENSE_SEGMENTS: ExpenseSegment[] = [
  {
    id: 'tech',
    label: 'Tech & Electronics',
    icon: '💻',
    amount: 320.0,
    percentage: 22,
    color: '#DDD6FE', // pastel lavender
    textColor: '#5B21B6',
    description: 'Hardware, devices & software tools',
    accentDot: '#8B5CF6',
  },
  {
    id: 'subs',
    label: 'Night & Subscriptions',
    icon: '🌙',
    amount: 145.5,
    percentage: 12,
    color: '#E0E7FF', // pastel indigo
    textColor: '#3730A3',
    description: 'Netflix, Spotify & digital streaming',
    accentDot: '#EF4444',
  },
  {
    id: 'medical',
    label: 'Health & Pharmacy',
    icon: '💊',
    amount: 88.0,
    percentage: 8,
    color: '#D9F99D', // pastel lime/olive
    textColor: '#3F6212',
    description: 'Prescriptions, vitamins & medical care',
    accentDot: '#EAB308',
  },
  {
    id: 'fitness',
    label: 'Cardio & Sports',
    icon: '🫀',
    amount: 110.0,
    percentage: 9,
    color: '#FBCFE8', // pastel pink
    textColor: '#9D174D',
    description: 'Gym membership, gear & trainers',
    accentDot: '#F43F5E',
  },
  {
    id: 'food',
    label: 'Food & Dining',
    icon: '🥑',
    amount: 450.5,
    percentage: 32,
    color: '#FEF08A', // pastel yellow
    textColor: '#854D0E',
    description: 'Groceries, campus meals & dining out',
  },
  {
    id: 'utilities',
    label: 'Daily & Utilities',
    icon: '💧',
    amount: 165.0,
    percentage: 11,
    color: '#BBF7D0', // pastel soft green
    textColor: '#166534',
    description: 'Water, mobile data & household bills',
  },
  {
    id: 'wellness',
    label: 'Wellness & Yoga',
    icon: '🧘',
    amount: 85.0,
    percentage: 6,
    color: '#FCE7F3', // pastel rose
    textColor: '#831843',
    description: 'Meditation, self-care & relaxation',
  },
];

const CX = 140;
const CY = 140;
const R = 85;
const TH = 32;

function polar(deg: number, r: number) {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
}

function arcPath(fromDeg: number, toDeg: number, r: number): string {
  const a = polar(fromDeg, r);
  const b = polar(toDeg, r);
  let delta = toDeg - fromDeg;
  while (delta < 0) delta += 360;
  while (delta >= 360) delta -= 360;
  const large = delta > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function CircularExpenseDonut({
  onAddExpense,
}: {
  onAddExpense?: () => void;
}) {
  const [timeframe, setTimeframe] = React.useState<'Today' | 'Weekly' | 'Overall'>('Today');
  const [activeSegmentId, setActiveSegmentId] = React.useState<string | null>(null);

  const activeSegment = activeSegmentId
    ? EXPENSE_SEGMENTS.find((s) => s.id === activeSegmentId)
    : null;

  const totalExpense = EXPENSE_SEGMENTS.reduce((sum, s) => sum + s.amount, 0);

  // Layout 7 sausage segments with gaps around 360 deg
  const GAP = 12; // degrees gap between segments
  const totalGap = GAP * EXPENSE_SEGMENTS.length;
  const availDeg = 360 - totalGap;
  const segSpan = availDeg / EXPENSE_SEGMENTS.length;

  return (
    <section className="relative rounded-[32px] bg-white p-5 shadow-[0_16px_40px_rgba(11,30,63,0.06)] border border-[#F1F5F9] select-none">
      {/* 1. Top Timeframe Switcher matching Image 3: Today (black pill), Weekly, Overall */}
      <div className="flex items-center justify-center">
        <div className="flex items-center rounded-full bg-[#F1F5F9] p-1 border border-[#E2E8F0]/70">
          {(['Today', 'Weekly', 'Overall'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTimeframe(t)}
              className={cn(
                'rounded-full px-5 py-1.5 text-[12.5px] font-extrabold transition-all duration-200',
                timeframe === t
                  ? 'bg-[#18181B] text-white shadow-sm scale-100'
                  : 'text-[#71717A] hover:text-[#18181B]'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Interactive Segmented Sausage Donut Chart matching Image 3 */}
      <div className="relative mt-2 flex items-center justify-center">
        <div className="relative h-[280px] w-[280px]">
          <svg viewBox="0 0 280 280" className="h-full w-full overflow-visible">
            {EXPENSE_SEGMENTS.map((seg, i) => {
              const fromDeg = i * (segSpan + GAP) + GAP / 2;
              const toDeg = fromDeg + segSpan;
              const midDeg = (fromDeg + toDeg) / 2;
              const isHovered = activeSegmentId === seg.id;

              // Radius bumps out when hovered
              const currentR = isHovered ? R + 6 : R;
              const currentTH = isHovered ? TH + 6 : TH;
              const iconPos = polar(midDeg, currentR);

              return (
                <g
                  key={seg.id}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setActiveSegmentId(seg.id)}
                  onMouseLeave={() => setActiveSegmentId(null)}
                  onClick={() =>
                    setActiveSegmentId((prev) => (prev === seg.id ? null : seg.id))
                  }
                >
                  {/* Segment sausage curve */}
                  <path
                    d={arcPath(fromDeg, toDeg, currentR)}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={currentTH}
                    strokeLinecap="round"
                    className="transition-all duration-300"
                    style={{
                      filter: isHovered
                        ? `drop-shadow(0 6px 14px ${seg.color}99)`
                        : 'none',
                    }}
                  />

                  {/* Optional red/orange accent dot (from Image 3) */}
                  {seg.accentDot && (
                    <circle
                      cx={polar(fromDeg + 6, currentR - currentTH / 2 + 5).x}
                      cy={polar(fromDeg + 6, currentR - currentTH / 2 + 5).y}
                      r="2.5"
                      fill={seg.accentDot}
                    />
                  )}

                  {/* Floating Icon/Emoji placed on the segment */}
                  <g
                    transform={`translate(${iconPos.x}, ${iconPos.y})`}
                    className="pointer-events-none transition-transform duration-300"
                    style={{
                      transform: `translate(${iconPos.x}px, ${iconPos.y}px) scale(${
                        isHovered ? 1.25 : 1
                      })`,
                      transformOrigin: '0 0',
                    }}
                  >
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize="17"
                      className="select-none"
                    >
                      {seg.icon}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* 3. Center Info Area matching Image 3 (Dynamic category explanation on hover) */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            {activeSegment ? (
              <div className="animate-fade-in space-y-1">
                <span
                  className="inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs"
                  style={{
                    backgroundColor: activeSegment.color,
                    color: activeSegment.textColor,
                  }}
                >
                  {activeSegment.icon} {activeSegment.label}
                </span>
                <p className="text-[32px] font-black tracking-tight text-[#0B1E3F] leading-none">
                  ${activeSegment.amount.toFixed(0)}
                </p>
                <p className="text-[11px] font-bold text-[#64748B]">
                  {activeSegment.percentage}% of {timeframe} expenses
                </p>
                <p className="text-[10px] font-semibold text-[#0B1E3F]/75 max-w-[150px] leading-tight">
                  {activeSegment.description}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-[44px] font-black tracking-[-0.04em] text-[#0B1E3F] leading-none">
                  {timeframe === 'Today' ? '6.4' : `$${(totalExpense / 1000).toFixed(1)}k`}
                </p>
                <div className="flex items-center justify-center gap-1 text-[11.5px] font-bold text-[#1E293B]">
                  <span>
                    Your <strong className="font-black">daily habits</strong> are on track.
                  </span>
                  <Info className="h-3.5 w-3.5 text-[#94A3B8]" />
                </div>
                <p className="text-[10px] font-semibold text-[#64748B]">
                  Tap or hover any category to explore
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Row matching Image 3: Add habit / expense pill + export + send */}
      <div className="mt-4 flex items-center justify-center gap-2.5">
        <button
          type="button"
          onClick={onAddExpense}
          className="flex items-center gap-2 rounded-full bg-[#18181B] px-6 py-2.5 text-[13px] font-black text-white shadow-md transition-transform active:scale-95 hover:bg-black"
        >
          <span>Add habit</span>
        </button>

        <button
          type="button"
          onClick={onAddExpense}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#F4F4F5] text-[#18181B] hover:bg-[#E4E4E7] transition-colors"
          aria-label="Download receipt or statement"
        >
          <Download className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onAddExpense}
          className="grid h-10 w-10 place-items-center rounded-full bg-[#F4F4F5] text-[#18181B] hover:bg-[#E4E4E7] transition-colors"
          aria-label="Send or share"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
