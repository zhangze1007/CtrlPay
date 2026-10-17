'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ExpenseCategory {
  id: string;
  name: string;
  percentage: number;
  amount: number;
  formattedAmount: string;
  colorStart: string;
  colorEnd: string;
  glowColor: string;
  subItems?: {
    name: string;
    amount: string;
    icon: 'netflix' | 'epic' | 'other';
  }[];
}

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    id: 'meal',
    name: 'Meal',
    percentage: 51,
    amount: 1186,
    formattedAmount: '$ 1,186',
    colorStart: '#00E5FF',
    colorEnd: '#0070F3',
    glowColor: 'rgba(0, 180, 255, 0.65)',
  },
  {
    id: 'family',
    name: 'Family',
    percentage: 25,
    amount: 593,
    formattedAmount: '$ 593',
    colorStart: '#C084FC',
    colorEnd: '#7C3AED',
    glowColor: 'rgba(168, 85, 247, 0.65)',
  },
  {
    id: 'entertainments',
    name: 'Entertainments',
    percentage: 12,
    amount: 286,
    formattedAmount: '$ 286',
    colorStart: '#FF3366',
    colorEnd: '#FF5E62',
    glowColor: 'rgba(255, 46, 110, 0.65)',
    subItems: [
      { name: 'Netflix', amount: '-$50', icon: 'netflix' },
      { name: 'Epic games', amount: '-$236', icon: 'epic' },
    ],
  },
  {
    id: 'study',
    name: 'Study',
    percentage: 12,
    amount: 286,
    formattedAmount: '$ 286',
    colorStart: '#FFD000',
    colorEnd: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.65)',
  },
];

export interface ExpensesCircleGraphProps {
  categories?: ExpenseCategory[];
  totalAmount?: number;
  trendPercentage?: string;
  onOpenAnalytics?: () => void;
  className?: string;
}

export function ExpensesCircleGraph({
  categories = DEFAULT_EXPENSE_CATEGORIES,
  totalAmount = 2372,
  trendPercentage = '- 13%',
  onOpenAnalytics,
  className,
}: ExpensesCircleGraphProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [isHovered, setIsHovered] = React.useState(false);
  const [period, setPeriod] = React.useState<'this month' | 'last month' | 'this year'>('this month');
  const [showPeriodMenu, setShowPeriodMenu] = React.useState(false);
  const [expandedSubItems, setExpandedSubItems] = React.useState<Record<string, boolean>>({
    entertainments: false,
  });

  const activeCategory = React.useMemo(
    () => categories.find((c) => c.id === activeId) || null,
    [categories, activeId]
  );

  // Geometry configuration for high-definition compact side-by-side layout
  const size = 166;
  const center = size / 2;
  const radius = 58;
  const baseStrokeWidth = 13;
  const activeStrokeWidth = 16.5;

  // Arc calculation with precise gaps
  // Clockwise order matching reference UI screenshot:
  // 1. Meal (Blue/Cyan) ~51%
  // 2. Entertainments (Pink) ~12%
  // 3. Study (Yellow) ~12%
  // 4. Family (Purple) ~25%
  const gapDeg = 6.5;
  const totalGapDeg = gapDeg * 4;
  const availableDeg = 360 - totalGapDeg; // 334 degrees

  const orderedSlices = React.useMemo(() => {
    const sliceOrder = ['meal', 'entertainments', 'study', 'family'];
    let currentAngle = -60; // Start at ~1 o'clock

    return sliceOrder.map((catId) => {
      const cat = categories.find((c) => c.id === catId) || categories[0];
      const sweepAngle = (cat.percentage / 100) * availableDeg;
      const startAngle = currentAngle;
      const endAngle = startAngle + sweepAngle;
      currentAngle = endAngle + gapDeg;

      // Polar to Cartesian
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = sweepAngle > 180 ? 1 : 0;
      const pathData = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;

      return {
        ...cat,
        startAngle,
        endAngle,
        sweepAngle,
        pathData,
      };
    });
  }, [categories, availableDeg, radius, center, gapDeg]);

  // Navigate through categories via left/right chevron buttons
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = orderedSlices.findIndex((s) => s.id === activeId);
    if (currentIndex <= 0) {
      setActiveId(orderedSlices[orderedSlices.length - 1].id);
    } else {
      setActiveId(orderedSlices[currentIndex - 1].id);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = orderedSlices.findIndex((s) => s.id === activeId);
    if (currentIndex === -1 || currentIndex >= orderedSlices.length - 1) {
      setActiveId(orderedSlices[0].id);
    } else {
      setActiveId(orderedSlices[currentIndex + 1].id);
    }
  };

  return (
    <section
      className={cn(
        // Frosted Glassmorphism Styling matching user request ("玻璃的风格")
        'relative rounded-[28px] p-4 sm:p-5 overflow-hidden select-none transition-all duration-300',
        'backdrop-blur-2xl bg-white/70 border border-white/80',
        'shadow-[0_16px_36px_rgba(11,30,63,0.07),inset_0_1px_1px_rgba(255,255,255,0.95)]',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setActiveId(null);
      }}
    >
      {/* Dynamic ambient background radial glow */}
      <div
        className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full blur-[50px] opacity-40 transition-all duration-700"
        style={{
          background: activeCategory
            ? `radial-gradient(circle, ${activeCategory.colorStart} 0%, ${activeCategory.colorEnd} 60%, transparent 80%)`
            : 'radial-gradient(circle, #00D2FF 0%, #C084FC 50%, transparent 80%)',
        }}
      />

      {/* 1. Header Bar: < Back Button, Expenses Title, this month ⌵ Dropdown */}
      <div className="relative z-10 flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenAnalytics}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/80 border border-white/90 text-[#0B1E3F] shadow-sm hover:bg-white active:scale-95 transition-all"
            aria-label="Back / History"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-[18px] font-black tracking-tight text-[#0B1E3F] font-sans">
            Expenses
          </h2>
        </div>

        {/* Period Selector Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowPeriodMenu(!showPeriodMenu)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-white/90 text-[12px] font-bold text-[#0B1E3F] shadow-sm hover:bg-white active:scale-95 transition-all"
          >
            <span>{period}</span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
          </button>

          {showPeriodMenu && (
            <div className="absolute right-0 mt-2 w-32 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/90 p-1.5 shadow-xl z-30 animate-fade-in text-[12px]">
              {(['this month', 'last month', 'this year'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPeriod(p);
                    setShowPeriodMenu(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-1.5 rounded-xl transition-colors font-bold',
                    period === p ? 'bg-[#0070F3]/10 text-[#0070F3]' : 'text-slate-600 hover:text-[#0B1E3F] hover:bg-black/5'
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Side-by-Side Layout: Graph on Left, Categories on Right ("expenses graph可以在左边 然后category在右边") */}
      <div className="relative z-10 grid grid-cols-[152px_1fr] sm:grid-cols-[164px_1fr] items-center gap-3">
        {/* Left Column: Enlarged Glowing Segmented Circle Graph with Fluid Flowing Hover */}
        <div className="relative flex items-center justify-center">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-[152px] sm:w-[164px] h-auto overflow-visible select-none drop-shadow-sm"
          >
            <defs>
              {/* Vibrant neon linear gradients for the segments */}
              <linearGradient id="glass-grad-meal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00E5FF" />
                <stop offset="100%" stopColor="#0070F3" />
              </linearGradient>

              <linearGradient id="glass-grad-family" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C084FC" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>

              <linearGradient id="glass-grad-entertainments" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF3366" />
                <stop offset="100%" stopColor="#FF5E62" />
              </linearGradient>

              <linearGradient id="glass-grad-study" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFD000" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>

              {/* Liquid Stream Flow Animated Shimmer Gradient */}
              <linearGradient id="fluid-stream-shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
                <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.1" />
                <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
                <stop offset="65%" stopColor="#FFFFFF" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>

              {/* Glowing Drop Shadow Filters for each segment */}
              <filter id="glass-glow-meal" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#0070F3" floodOpacity="0.75" />
                <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#00E5FF" floodOpacity="0.5" />
              </filter>
              <filter id="glass-glow-family" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#7C3AED" floodOpacity="0.75" />
                <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#C084FC" floodOpacity="0.5" />
              </filter>
              <filter id="glass-glow-entertainments" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#FF3366" floodOpacity="0.75" />
                <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#FF5E62" floodOpacity="0.5" />
              </filter>
              <filter id="glass-glow-study" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#F59E0B" floodOpacity="0.75" />
                <feDropShadow dx="0" dy="0" stdDeviation="9" floodColor="#FFD000" floodOpacity="0.5" />
              </filter>
            </defs>

            {/* Subtle Frosted Guide Track Ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="rgba(11, 30, 63, 0.06)"
              strokeWidth={baseStrokeWidth}
            />

            {/* Glowing Segment Arcs */}
            {orderedSlices.map((slice) => {
              const isActive = activeId === slice.id;
              const isAnyActive = activeId !== null;
              const opacity = isAnyActive ? (isActive ? 1 : 0.35) : 1;
              const strokeWidth = isActive ? activeStrokeWidth : baseStrokeWidth;
              const glowFilter = `url(#glass-glow-${slice.id})`;

              return (
                <g
                  key={slice.id}
                  className="cursor-pointer transition-all duration-300"
                  onMouseEnter={() => setActiveId(slice.id)}
                  onMouseLeave={() => setActiveId(null)}
                  onClick={() => setActiveId(activeId === slice.id ? null : slice.id)}
                >
                  {/* Base Neon Arc */}
                  <path
                    d={slice.pathData}
                    fill="none"
                    stroke={`url(#glass-grad-${slice.id})`}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    style={{
                      opacity,
                      filter: isActive || isHovered ? glowFilter : undefined,
                      transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />

                  {/* Flowing Liquid Shimmer Stream along Arc Path on hover */}
                  {(isHovered || isActive) && (
                    <path
                      d={slice.pathData}
                      fill="none"
                      stroke="url(#fluid-stream-shimmer)"
                      strokeWidth={strokeWidth + 0.8}
                      strokeLinecap="round"
                      strokeDasharray="16 110"
                      className="pointer-events-none"
                      style={{
                        animation: 'arc-flowing-stream 2s linear infinite',
                      }}
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Center Content: Amount & Subtitle with smooth spring transition */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2">
            {activeCategory ? (
              <div className="animate-fade-in space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {activeCategory.name}
                </span>
                <div className="text-[18px] font-black text-[#0B1E3F] tracking-tight leading-none">
                  {activeCategory.formattedAmount}
                </div>
                <div
                  className="text-[10px] font-extrabold tracking-tight px-1.5 py-0.5 rounded-full inline-block mt-0.5"
                  style={{
                    backgroundColor: `${activeCategory.colorStart}22`,
                    color: activeCategory.colorEnd,
                  }}
                >
                  {activeCategory.percentage}%
                </div>
              </div>
            ) : (
              <div className="space-y-0.5">
                <div className="text-[20px] font-black text-[#0B1E3F] tracking-tight font-sans leading-none">
                  ${totalAmount.toLocaleString()}
                </div>
                <div className="text-[11px] font-bold text-slate-500 tracking-tight mt-0.5">
                  {trendPercentage}
                </div>
              </div>
            )}
          </div>

          {/* Micro Left/Right Chevrons overlay */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between pointer-events-auto px-0.5">
            <button
              type="button"
              onClick={handlePrev}
              className="grid h-6 w-6 place-items-center rounded-full bg-white/70 hover:bg-white border border-white/80 shadow-xs text-slate-500 hover:text-[#0B1E3F] active:scale-90 transition-all"
              aria-label="Previous category"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="grid h-6 w-6 place-items-center rounded-full bg-white/70 hover:bg-white border border-white/80 shadow-xs text-slate-500 hover:text-[#0B1E3F] active:scale-90 transition-all"
              aria-label="Next category"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Category List ("然后category在右边") */}
        <div className="flex flex-col gap-1.5">
          {categories.map((category) => {
            const isActive = activeId === category.id;
            const hasSubItems = category.subItems && category.subItems.length > 0;
            const isExpanded = expandedSubItems[category.id] ?? false;

            return (
              <div
                key={category.id}
                className={cn(
                  'rounded-xl transition-all duration-200 overflow-hidden',
                  isActive
                    ? 'bg-white/95 border border-white shadow-md -translate-y-0.5'
                    : 'bg-white/50 border border-white/60 hover:bg-white/80'
                )}
                onMouseEnter={() => setActiveId(category.id)}
                onMouseLeave={() => setActiveId(null)}
              >
                {/* Compact Category Row */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(activeId === category.id ? null : category.id);
                    if (hasSubItems) {
                      setExpandedSubItems((prev) => ({
                        ...prev,
                        [category.id]: !prev[category.id],
                      }));
                    }
                  }}
                  className="w-full flex items-center justify-between py-2 px-2.5 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {/* Glowing Gradient Pill */}
                    <div
                      className="h-3.5 w-5 rounded-full shrink-0 transition-all duration-300"
                      style={{
                        background: `linear-gradient(135deg, ${category.colorStart}, ${category.colorEnd})`,
                        boxShadow: isActive
                          ? `0 0 10px ${category.glowColor}`
                          : `0 0 5px ${category.glowColor}`,
                      }}
                    />
                    <span className="text-[13px] font-bold text-[#0B1E3F] tracking-tight">
                      {category.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-right">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {category.percentage}%
                    </span>
                    <span className="text-[13px] font-black text-[#0B1E3F]">
                      {category.formattedAmount}
                    </span>
                  </div>
                </button>

                {/* Sub-items if expanded (Netflix, Epic Games) */}
                {hasSubItems && isExpanded && (
                  <div className="px-2.5 pb-2 pt-0.5 space-y-1.5 border-t border-slate-100 bg-white/40">
                    {category.subItems!.map((sub, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11.5px]"
                      >
                        <div className="flex items-center gap-2">
                          {sub.icon === 'netflix' ? (
                            <div className="h-4.5 w-4.5 rounded bg-black flex items-center justify-center shrink-0">
                              <span className="text-[#E50914] font-black text-[10px] leading-none">
                                N
                              </span>
                            </div>
                          ) : (
                            <div className="h-4.5 w-4.5 rounded bg-black flex items-center justify-center shrink-0">
                              <span className="text-white font-black text-[7px] uppercase tracking-tighter">
                                EPIC
                              </span>
                            </div>
                          )}
                          <span className="font-semibold text-slate-700">{sub.name}</span>
                        </div>
                        <span className="font-bold text-slate-600">{sub.amount}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
