'use client';

import * as React from 'react';
import {
  BookOpen,
  Home,
  Smartphone,
  Zap,
  ArrowRight,
  ArrowUpRight,
  X,
  Target,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';
import { useDisplayCurrency } from '@/lib/use-display-currency';

export interface BudgetDetailsViewProps {
  onClose: () => void;
  onOpenTimeline?: () => void;
  onOpenSimulator?: () => void;
}

export function BudgetDetailsView({
  onClose,
  onOpenTimeline,
  onOpenSimulator,
}: BudgetDetailsViewProps) {
  const { format } = useDisplayCurrency();
  const money0 = (value: number) => format(value, { decimals: 0 });
  const [affordTestAmount, setAffordTestAmount] = React.useState(85);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const totalBudget = 850;
  const remainingBudget = Math.max(0, 240.0 - (spentThisMonth || 0));

  return (
    <div className="flex h-full flex-col bg-[#F8FAF8] overflow-hidden font-sans select-none">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-3 pb-3 bg-[#F8FAF8]/95 backdrop-blur-md border-b border-gray-100">
        <div className="space-y-0.5">
          <h2 className="text-[18px] font-black text-[#0F172A] tracking-tight">
            Budget & Commitments
          </h2>
          <p className="text-[12px] text-[#64748B]">
            Remaining:{' '}
            <strong className={remainingBudget < 50 ? 'text-[#EF4444]' : 'text-[#10B981]'}>
              {format(remainingBudget)}
            </strong>{' '}
            of {money0(totalBudget)}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#1E293B] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-gray-50 active:scale-95 transition-all"
          aria-label="Close"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5 pb-24">
        {/* Part A: Upcoming Expenses */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[16px] font-bold text-[#0F172A]">
              Upcoming Expenses
            </h3>
            {onOpenTimeline && (
              <button
                type="button"
                onClick={onOpenTimeline}
                className="text-[12px] font-bold text-[#10606F] hover:underline"
              >
                View calendar →
              </button>
            )}
          </div>

          <div className="rounded-[24px] bg-white p-3.5 shadow-sm border border-gray-100 space-y-2.5">
            {/* Item 1 */}
            <div className="flex items-center justify-between py-1 px-1">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#0F172A] leading-tight">
                    Textbooks & Notes
                  </p>
                  <p className="text-[11.5px] text-[#64748B] leading-none mt-1">
                    Apr 12 · Campus Bookstore
                  </p>
                </div>
              </div>
              <span className="text-[14.5px] font-bold text-[#0F172A] duo-num">
                {money0(120)}
              </span>
            </div>

            <div className="h-px bg-gray-100 mx-1" />

            {/* Item 2 */}
            <div className="flex items-center justify-between py-1 px-1">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FEE2E2] text-[#DC2626]">
                  <Home className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#0F172A] leading-tight">
                    Hostel / Room Rent
                  </p>
                  <p className="text-[11.5px] text-[#64748B] leading-none mt-1">
                    Apr 15 · Due in 3 days
                  </p>
                </div>
              </div>
              <span className="text-[14.5px] font-bold text-[#0F172A] duo-num">
                {money0(600)}
              </span>
            </div>

            <div className="h-px bg-gray-100 mx-1" />

            {/* Item 3 */}
            <div className="flex items-center justify-between py-1 px-1">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#E0F2FE] text-[#0284C7]">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#0F172A] leading-tight">
                    Postpaid Phone Bill
                  </p>
                  <p className="text-[11.5px] text-[#64748B] leading-none mt-1">
                    Apr 18 · Auto-Debit
                  </p>
                </div>
              </div>
              <span className="text-[14.5px] font-bold text-[#0F172A] duo-num">
                {money0(65)}
              </span>
            </div>

            <div className="h-px bg-gray-100 mx-1" />

            {/* Item 4 */}
            <div className="flex items-center justify-between py-1 px-1">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#FEF3C7] text-[#D97706]">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#0F172A] leading-tight">
                    Internet / Wi-Fi Utilities
                  </p>
                  <p className="text-[11.5px] text-[#64748B] leading-none mt-1">
                    Apr 22 · High Speed Fiber
                  </p>
                </div>
              </div>
              <span className="text-[14.5px] font-bold text-[#0F172A] duo-num">
                {money0(45)}
              </span>
            </div>
          </div>
        </div>

        {/* Part B: Savings Goals */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[16px] font-bold text-[#0F172A]">
              Savings Goals
            </h3>
            {onOpenTimeline && (
              <button
                type="button"
                onClick={onOpenTimeline}
                className="text-[12px] font-bold text-[#10606F] hover:underline"
              >
                Manage goals →
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {/* Goal 1: Laptop */}
            <div className="rounded-[22px] bg-[#D6EFE3] p-4 border border-[#C5E8D6] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-black text-[#0F172A]">
                    New Laptop
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#16A34A] text-white">
                    Target Dec 2026
                  </span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#15803D]" />
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-bold text-[#166534]">{money0(320)} / {money0(1200)}</span>
                <span className="font-extrabold text-[#166534]">27%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#B2E1C9] overflow-hidden">
                <div className="h-full bg-[#16A34A] rounded-full w-[27%]" />
              </div>
            </div>

            {/* Goal 2: Emergency Fund */}
            <div className="rounded-[22px] bg-white p-4 border border-gray-100 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-black text-[#0F172A]">
                    Emergency Fund
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Safety Buffer
                  </span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-[#475569]" />
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-bold text-[#475569]">{money0(150)} / {money0(500)}</span>
                <span className="font-extrabold text-[#475569]">30%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#3B82F6] rounded-full w-[30%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Part C: Can I Afford It? */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[16px] font-bold text-[#0F172A] flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#F59E0B]" />
              Can I afford it?
            </h3>
            <span className="text-[11px] text-[#64748B]">Instant Solvency Check</span>
          </div>

          <div className="rounded-[24px] bg-white p-4 shadow-sm border border-gray-100 space-y-3">
            <p className="text-[12px] text-[#64748B]">
              Check if a discretionary purchase will risk your end-of-month food survival floor.
            </p>

            {/* Test Amount Selector */}
            <div className="flex items-center gap-2">
              {[35, 60, 85, 120].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAffordTestAmount(val)}
                  className={cn(
                    'flex-1 py-1.5 rounded-xl text-[12px] font-bold transition-all',
                    affordTestAmount === val
                      ? 'bg-[#0F172A] text-white shadow-sm'
                      : 'bg-gray-100 text-[#64748B] hover:bg-gray-200'
                  )}
                >
                  {money0(val)}
                </button>
              ))}
            </div>

            {/* Calculation Result */}
            <div className="rounded-2xl bg-[#F0FDF4] p-3.5 border border-[#BBF7D0]">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#166534]">
                  After testing {format(affordTestAmount)} purchase:
                </span>
                <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  SAFE TO SPEND
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-[20px] font-extrabold text-[#15803D]">
                  {format(240 - affordTestAmount)}
                </span>
                <span className="text-[11.5px] text-[#166534]">remaining in flexible budget</span>
              </div>
            </div>

            {onOpenSimulator && (
              <button
                type="button"
                onClick={onOpenSimulator}
                className="w-full py-2.5 rounded-xl bg-[#04222B] text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span>Run Full CFaR Interceptor</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
