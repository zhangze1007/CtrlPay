'use client';

import * as React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BudgetItem {
  id: string;
  name: string;
  amount: number;
  shortAmount: string;
  color: string;
  glowColor: string;
}

const DEFAULT_BUDGET_ITEMS: BudgetItem[] = [
  {
    id: 'shopping',
    name: 'Shopping',
    amount: 3320,
    shortAmount: '$3320',
    color: '#10606F', // Holst 800 (Deep Sea Teal)
    glowColor: 'rgba(16, 96, 111, 0.35)',
  },
  {
    id: 'health',
    name: 'Health',
    amount: 2300,
    shortAmount: '$2300',
    color: '#1D8B94', // Holst 600 (Cyan Jade)
    glowColor: 'rgba(29, 139, 148, 0.35)',
  },
  {
    id: 'invest',
    name: 'Invest',
    amount: 2000,
    shortAmount: '$2000',
    color: '#2DA096', // Mint Emerald
    glowColor: 'rgba(45, 160, 150, 0.35)',
  },
  {
    id: 'tax',
    name: 'Tax',
    amount: 1600,
    shortAmount: '$1600',
    color: '#4FB8B4', // Holst 400 (Sky Foam)
    glowColor: 'rgba(79, 184, 180, 0.35)',
  },
  {
    id: 'charity',
    name: 'Charity',
    amount: 1400,
    shortAmount: '$1400',
    color: '#98D8D0', // Holst 200 (Glacier Mint)
    glowColor: 'rgba(152, 216, 208, 0.35)',
  },
];

export interface BudgetingDonutChartProps {
  totalBudget?: number;
  items?: BudgetItem[];
  onOpenAnalytics?: () => void;
  className?: string;
}

export function BudgetingDonutChart({
  totalBudget = 10000,
  items = DEFAULT_BUDGET_ITEMS,
  onOpenAnalytics,
  className,
}: BudgetingDonutChartProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const totalAmount = React.useMemo(
    () => items.reduce((acc, curr) => acc + curr.amount, 0),
    [items],
  );

  const activeItem = React.useMemo(
    () => items.find((it) => it.id === activeId) || null,
    [items, activeId],
  );

  // Enlarged SVG Geometry for Donut Ring (prevents any overlapping text)
  const size = 230;
  const center = size / 2;
  const radius = 80;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  // Calculate arc slices with gaps
  const gapAngleDeg = 4.5;
  const totalGapDeg = gapAngleDeg * items.length;
  const availableDeg = 360 - totalGapDeg;

  let accumulatedDeg = -90; // Start at top

  const slices = items.map((item) => {
    const fraction = item.amount / totalAmount;
    const sweepDeg = fraction * availableDeg;
    const startDeg = accumulatedDeg;
    const endDeg = startDeg + sweepDeg;
    const midDeg = (startDeg + endDeg) / 2;

    accumulatedDeg = endDeg + gapAngleDeg;

    // Midpoint for pill badge on the arc
    const midRad = (midDeg * Math.PI) / 180;
    const pillX = center + radius * Math.cos(midRad);
    const pillY = center + radius * Math.sin(midRad);

    // SVG arc strokeDasharray and strokeDashoffset
    const arcLength = (sweepDeg / 360) * circumference;
    const dashArray = `${arcLength} ${circumference - arcLength}`;
    const dashOffset = -((startDeg + 90) / 360) * circumference;

    const percentage = Math.round(fraction * 100);

    return {
      ...item,
      percentage,
      dashArray,
      dashOffset,
      pillX,
      pillY,
      midDeg,
    };
  });

  return (
    <section
      className={cn(
        'rounded-[28px] bg-white/95 p-4 sm:p-5 shadow-[0_12px_36px_rgba(4,34,43,0.06)] border border-white/90 backdrop-blur-md relative overflow-hidden transition-all',
        className,
      )}
    >
      {/* Header: Budgeting + View Analytics */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[17px] font-black tracking-tight text-[#04222B]">Budgeting</h3>
        <button
          type="button"
          onClick={onOpenAnalytics}
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#1D8B94] hover:text-[#10606F] transition-colors group"
        >
          <span>View Analytics</span>
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>

      {/* Main Content: Larger Donut on Left, Legend on Right */}
      <div className="grid grid-cols-[1.25fr_1fr] items-center gap-2">
        {/* Left Column: Enlarged Donut Ring */}
        <div className="relative flex items-center justify-center p-1">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full max-w-[205px] h-auto drop-shadow-sm select-none overflow-visible"
          >
            <defs>
              <filter id="pill-shadow-v2" x="-40%" y="-40%" width="180%" height="180%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#04222B" floodOpacity="0.25" />
              </filter>
            </defs>

            {/* Background subtle guide ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#E2F4F0"
              strokeWidth={strokeWidth}
              opacity="0.6"
            />

            {/* Segmented Donut Arcs */}
            {slices.map((slice) => {
              const isActive = activeId === slice.id;
              const isAnyActive = activeId !== null;
              const opacity = isAnyActive ? (isActive ? 1 : 0.35) : 1;
              const currentStrokeWidth = isActive ? strokeWidth + 4 : strokeWidth;

              return (
                <g key={slice.id} className="cursor-pointer transition-all duration-200">
                  <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={currentStrokeWidth}
                    strokeDasharray={slice.dashArray}
                    strokeDashoffset={slice.dashOffset}
                    strokeLinecap="round"
                    style={{
                      opacity,
                      transition: 'all 0.25s ease',
                      filter: isActive ? `drop-shadow(0 0 8px ${slice.glowColor})` : undefined,
                    }}
                    onMouseEnter={() => setActiveId(slice.id)}
                    onMouseLeave={() => setActiveId(null)}
                    onClick={() => setActiveId(activeId === slice.id ? null : slice.id)}
                  />

                  {/* Little Pill Badge stamped on each Arc segment */}
                  <g
                    transform={`translate(${slice.pillX}, ${slice.pillY})`}
                    style={{
                      opacity: isAnyActive && !isActive ? 0.3 : 1,
                      transition: 'transform 0.2s ease, opacity 0.2s ease',
                      transform: isActive
                        ? `translate(${slice.pillX}px, ${slice.pillY}px) scale(1.18)`
                        : `translate(${slice.pillX}px, ${slice.pillY}px) scale(1)`,
                    }}
                    onMouseEnter={() => setActiveId(slice.id)}
                    onMouseLeave={() => setActiveId(null)}
                    onClick={() => setActiveId(activeId === slice.id ? null : slice.id)}
                  >
                    <rect
                      x="-15"
                      y="-7"
                      width="30"
                      height="14"
                      rx="7"
                      fill="#FFFFFF"
                      stroke="rgba(4,34,43,0.12)"
                      strokeWidth="0.8"
                      filter="url(#pill-shadow-v2)"
                    />
                    <text
                      x="0"
                      y="2.8"
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="800"
                      fill={slice.color}
                      className="font-sans select-none tracking-tight"
                    >
                      {slice.shortAmount}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Center Content inside Donut (Generously Sized, Zero Collisions) */}
          <div
            className="absolute inset-0 m-auto flex flex-col items-center justify-center text-center cursor-pointer pointer-events-auto w-[112px] h-[112px] rounded-full transition-transform active:scale-95"
            onClick={() => setActiveId(null)}
            title="Tap to reset view"
          >
            {activeItem ? (
              <div className="animate-fade-in px-1.5">
                <span className="text-[9.5px] font-black uppercase tracking-wider text-[#1D8B94] block leading-tight">
                  {activeItem.name}
                </span>
                <span className="text-[19px] font-black tracking-tight text-[#04222B] block leading-none mt-1">
                  ${activeItem.amount.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-[#64748B] block mt-1">
                  {Math.round((activeItem.amount / totalAmount) * 100)}% of budget
                </span>
              </div>
            ) : (
              <div className="animate-fade-in px-1.5">
                <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-[#64748B] block leading-tight">
                  Monthly Budget
                </span>
                <span className="text-[21px] font-black tracking-tight text-[#04222B] block leading-none mt-1">
                  ${totalBudget.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Category Legend matching reference image */}
        <div className="space-y-2.5 pl-1">
          {items.map((item) => {
            const isActive = activeId === item.id;
            const isAnyActive = activeId !== null;

            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'w-full flex items-center justify-between text-left py-1 px-1.5 rounded-xl transition-all',
                  isActive
                    ? 'bg-[#E2F4F0]/90 scale-[1.02] shadow-sm'
                    : isAnyActive
                    ? 'opacity-40 hover:opacity-100 hover:bg-slate-50'
                    : 'hover:bg-slate-50',
                )}
                onMouseEnter={() => setActiveId(item.id)}
                onMouseLeave={() => setActiveId(null)}
                onClick={() => setActiveId(isActive ? null : item.id)}
              >
                {/* Left: Dot + Category Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform"
                    style={{
                      backgroundColor: item.color,
                      transform: isActive ? 'scale(1.3)' : 'scale(1)',
                      boxShadow: isActive ? `0 0 6px ${item.glowColor}` : undefined,
                    }}
                  />
                  <span
                    className={cn(
                      'text-[12.5px] transition-colors truncate',
                      isActive ? 'font-black text-[#04222B]' : 'font-semibold text-[#04222B]/85',
                    )}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Right: Amount */}
                <span
                  className={cn(
                    'text-[12.5px] tabular-nums tracking-tight transition-colors shrink-0 ml-1',
                    isActive ? 'font-black text-[#04222B]' : 'font-bold text-[#04222B]/90',
                  )}
                >
                  ${item.amount.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
