'use client';

import * as React from 'react';
import Image from 'next/image';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Flag,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CentroHeroCardProps {
  userName?: string;
  avatarUrl?: string;
  balance?: number;
  onAddIncome?: () => void;
  onAddExpense?: () => void;
  onOpenPortfolio?: () => void;
  onOpenGoal?: () => void;
  onOpenNotifications?: () => void;
  className?: string;
}

export function CentroHeroCard({
  userName = 'Ashley',
  avatarUrl = '/avatar.jpg',
  balance = 150850,
  onAddIncome,
  onAddExpense,
  onOpenPortfolio,
  onOpenGoal,
  onOpenNotifications,
  className,
}: CentroHeroCardProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Vibrant Gradient Hero Card (Exact recreation of Image 1) */}
      <section
        className="relative overflow-hidden rounded-[34px] p-5 text-white shadow-[0_20px_50px_rgba(0,119,230,0.38)] border border-white/30 select-none transition-all"
        style={{
          background:
            'linear-gradient(145deg, #0070F3 0%, #00B4D8 28%, #5B21B6 65%, #DB2777 88%, #F43F5E 100%)',
        }}
      >
        {/* Soft internal gradient ambient highlights */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-cyan-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-pink-500/30 blur-2xl" />

        {/* Top Header: Avatar + "Hello, Ashley" + Right Button */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-11 w-11 overflow-hidden rounded-full ring-2 ring-white/70 shadow-md bg-white/20 shrink-0">
              <Image
                src={avatarUrl}
                alt={userName}
                width={44}
                height={44}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
            <div className="text-left">
              <h3 className="text-[17px] font-black tracking-tight text-white leading-tight">
                Hello, {userName}
              </h3>
              <p className="text-[11px] font-medium text-white/80 leading-tight mt-0.5">
                Welcome back to Centro
              </p>
            </div>
          </div>

          {/* Right Frosted Minimal Button matching Image 1 */}
          <button
            type="button"
            onClick={onOpenNotifications}
            className="grid h-10 w-10 place-items-center rounded-2xl bg-white/20 hover:bg-white/30 border border-white/35 backdrop-blur-md text-white shadow-sm transition-all active:scale-95"
            aria-label="Account and Notifications"
          >
            <svg
              className="h-5 w-5 fill-none stroke-current stroke-[2]"
              viewBox="0 0 24 24"
            >
              <rect x="3" y="5" width="18" height="14" rx="4" />
              <path d="M7 15h4" strokeLinecap="round" />
              <circle cx="16" cy="9" r="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* Center: Total Balance & Huge Amount */}
        <div className="relative z-10 py-6 text-center">
          <p className="text-[12.5px] font-medium tracking-wider text-white/85 uppercase">
            Total Balance
          </p>
          <h1 className="mt-1 text-[40px] sm:text-[44px] font-black tracking-tight text-white leading-none drop-shadow-sm">
            ${balance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </h1>
        </div>

        {/* 4 Frosted Glass Quick Action Squircle Buttons */}
        <div className="relative z-10 grid grid-cols-4 gap-2 pt-1">
          {/* 1. Add Income */}
          <button
            type="button"
            onClick={onAddIncome}
            className="group flex flex-col items-center justify-center rounded-[22px] bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md p-2.5 transition-all active:scale-95"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/25 border border-white/35 text-white transition-transform group-hover:scale-105 shadow-sm">
              <div className="flex items-center">
                <span className="text-[12px] font-black">$</span>
                <ArrowDownLeft className="h-3.5 w-3.5 -ml-0.5" />
              </div>
            </div>
            <span className="mt-2 text-[10.5px] font-bold text-white leading-tight text-center">
              Add<br />Income
            </span>
          </button>

          {/* 2. Add Expense */}
          <button
            type="button"
            onClick={onAddExpense}
            className="group flex flex-col items-center justify-center rounded-[22px] bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md p-2.5 transition-all active:scale-95"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/25 border border-white/35 text-white transition-transform group-hover:scale-105 shadow-sm">
              <div className="flex items-center">
                <span className="text-[12px] font-black">$</span>
                <ArrowUpRight className="h-3.5 w-3.5 -ml-0.5" />
              </div>
            </div>
            <span className="mt-2 text-[10.5px] font-bold text-white leading-tight text-center">
              Add<br />Expense
            </span>
          </button>

          {/* 3. Finance Portfolio */}
          <button
            type="button"
            onClick={onOpenPortfolio}
            className="group flex flex-col items-center justify-center rounded-[22px] bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md p-2.5 transition-all active:scale-95"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/25 border border-white/35 text-white transition-transform group-hover:scale-105 shadow-sm">
              <Wallet className="h-4 w-4" />
            </div>
            <span className="mt-2 text-[10.5px] font-bold text-white leading-tight text-center">
              Finance<br />Portfolio
            </span>
          </button>

          {/* 4. Budget Goal */}
          <button
            type="button"
            onClick={onOpenGoal}
            className="group flex flex-col items-center justify-center rounded-[22px] bg-white/20 hover:bg-white/30 border border-white/30 backdrop-blur-md p-2.5 transition-all active:scale-95"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-white/25 border border-white/35 text-white transition-transform group-hover:scale-105 shadow-sm">
              <Flag className="h-4 w-4" />
            </div>
            <span className="mt-2 text-[10.5px] font-bold text-white leading-tight text-center">
              Budget<br />Goal
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
