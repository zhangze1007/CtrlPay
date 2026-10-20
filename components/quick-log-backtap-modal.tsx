'use client';

import * as React from 'react';
import { Check, Smartphone, X } from 'lucide-react';
import { CURRENCY_PPP_REGISTRY, formatDisplayCurrency } from '@/lib/currency-ppp';
import { useCtrlPayStore } from '@/lib/store';
import { formatRM } from '@/lib/utils';

export interface QuickLogTransactionInput {
  type: 'EXPENSE' | 'INCOME';
  amountMYR: number;
  merchantOrTitle: string;
  category: 'NEEDS' | 'WANTS';
  subCategory: 'Food & Dining' | 'Transport' | 'Shopping' | 'Entertainment' | 'Utilities' | 'Allowance';
  paymentAccount: 'Touch n Go eWallet' | 'GrabPay Wallet' | 'WeBank / Bank Savings' | 'Campus Card';
  authorizedTransfer: boolean;
}

interface QuickLogBackTapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalanceMYR: number;
  currentDynamicDailyAllowanceMYR: number;
  unpaidBillsMYR: number;
  savingsGoalMYR: number;
  daysLeftInMonth: number;
  onCommitTransaction: (tx: QuickLogTransactionInput) => void;
}

/**
 * Quick Logging with Back-Tap + live Dynamic Budget Management.
 *
 * Three entry points (all wired in the app shell):
 *   1. iOS Shortcut deep link `?trigger=backtap`
 *   2. Judge sandbox button (Simulation Dock / Home header)
 *   3. Double-tap the `B` key on desktop
 *
 * The projected daily allowance is previewed with the same formula the engine
 * uses: (balance − unpaid bills − savings goal) ÷ remaining days. Committing only
 * appends to the MYR ledger; nothing leaves the sandbox.
 */
export function QuickLogBackTapModal({
  isOpen,
  onClose,
  currentBalanceMYR,
  currentDynamicDailyAllowanceMYR,
  unpaidBillsMYR,
  savingsGoalMYR,
  daysLeftInMonth,
  onCommitTransaction,
}: QuickLogBackTapModalProps) {
  const displayCurrency = useCtrlPayStore((s) => s.displayCurrency);
  const [type, setType] = React.useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amountStr, setAmountStr] = React.useState<string>('18.50');
  const [merchantOrTitle, setMerchantOrTitle] = React.useState<string>('Tealive & Campus Lunch');
  const [category, setCategory] = React.useState<'NEEDS' | 'WANTS'>('WANTS');
  const [subCategory, setSubCategory] =
    React.useState<QuickLogTransactionInput['subCategory']>('Food & Dining');
  const [paymentAccount, setPaymentAccount] =
    React.useState<QuickLogTransactionInput['paymentAccount']>('Touch n Go eWallet');
  const [authorizedTransfer, setAuthorizedTransfer] = React.useState<boolean>(true);

  React.useEffect(() => {
    if (isOpen) {
      setType('EXPENSE');
      setAuthorizedTransfer(true);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedAmount = Math.max(0, parseFloat(amountStr) || 0);
  const safeDays = Math.max(1, daysLeftInMonth);

  const projectedBalance =
    type === 'EXPENSE' ? currentBalanceMYR - parsedAmount : currentBalanceMYR + parsedAmount;
  const projectedSpendablePool = Math.max(
    0,
    projectedBalance - unpaidBillsMYR - savingsGoalMYR,
  );
  const projectedDailyAllowance = projectedSpendablePool / safeDays;
  const allowanceDelta = projectedDailyAllowance - currentDynamicDailyAllowanceMYR;
  const profile = CURRENCY_PPP_REGISTRY[displayCurrency];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!authorizedTransfer || parsedAmount <= 0) return;
    onCommitTransaction({
      type,
      amountMYR: parsedAmount,
      merchantOrTitle: merchantOrTitle.trim() || 'Quick Back-Tap Entry',
      category,
      subCategory,
      paymentAccount,
      authorizedTransfer,
    });
    onClose();
  }

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col justify-end bg-[rgba(4,34,43,0.5)] backdrop-blur-[2px]"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Back-Tap quick logging"
        className="max-h-full w-full animate-sheet-up overflow-hidden rounded-t-[30px] bg-[#0B1E3F] text-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3">
          <span className="h-1 w-9 rounded-full bg-white/25" />
        </div>
        <div className="max-h-[78vh] overflow-y-auto no-scrollbar px-4 pb-5">
          <header className="flex items-start justify-between gap-2 pb-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F5B84D]/30 bg-[#F5B84D]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#F5B84D]">
                <Smartphone className="h-3 w-3" /> iOS Back-Tap / Shortcut Triggered
              </span>
              <h3 className="mt-1.5 text-[17px] font-extrabold tracking-tight">
                Quick Logging &amp; Dynamic Budget Sync
              </h3>
              <p className="mt-0.5 text-[10.5px] text-white/55">
                Double-tap the back of your iPhone (Shortcut → this URL) or press B twice on desktop.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close quick logging"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-sm">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/8 p-1">
              <button
                type="button"
                onClick={() => setType('EXPENSE')}
                className={`rounded-lg py-1.5 text-[12px] font-bold transition ${
                  type === 'EXPENSE' ? 'bg-[#F26D6D] text-white shadow' : 'text-white/55 hover:text-white'
                }`}
              >
                − Expense
              </button>
              <button
                type="button"
                onClick={() => setType('INCOME')}
                className={`rounded-lg py-1.5 text-[12px] font-bold transition ${
                  type === 'INCOME' ? 'bg-[#31C48D] text-[#04222B] shadow' : 'text-white/55 hover:text-white'
                }`}
              >
                + Income
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="min-w-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">
                  Amount (RM)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0.01"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-[13px] font-bold text-white outline-none focus:border-[#F5B84D]"
                  required
                />
              </div>
              <div className="col-span-2 min-w-0">
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">
                  Merchant / Note
                </label>
                <input
                  type="text"
                  value={merchantOrTitle}
                  onChange={(e) => setMerchantOrTitle(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-white/12 bg-white/8 px-3 py-2 text-[13px] text-white outline-none focus:border-[#F5B84D]"
                  placeholder="e.g. GrabFood / Campus Meal"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">
                  Protection Tier
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as 'NEEDS' | 'WANTS')}
                  className="w-full rounded-xl border border-white/12 bg-[#122A54] px-2.5 py-2 text-[12px] text-white outline-none"
                >
                  <option value="WANTS">WANTS (flexible)</option>
                  <option value="NEEDS">NEEDS (protected)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">
                  Category
                </label>
                <select
                  value={subCategory}
                  onChange={(e) =>
                    setSubCategory(e.target.value as QuickLogTransactionInput['subCategory'])
                  }
                  className="w-full rounded-xl border border-white/12 bg-[#122A54] px-2.5 py-2 text-[12px] text-white outline-none"
                >
                  <option value="Food & Dining">Food &amp; Dining</option>
                  <option value="Transport">Transport</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Allowance">Allowance</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/50">
                Payment Account
              </label>
              <select
                value={paymentAccount}
                onChange={(e) =>
                  setPaymentAccount(e.target.value as QuickLogTransactionInput['paymentAccount'])
                }
                className="w-full rounded-xl border border-white/12 bg-[#122A54] px-3 py-2 text-[12px] text-white outline-none"
              >
                <option value="Touch n Go eWallet">Touch &apos;n Go eWallet</option>
                <option value="GrabPay Wallet">GrabPay Wallet</option>
                <option value="WeBank / Bank Savings">WeBank / Bank Savings</option>
                <option value="Campus Card">University Campus Card</option>
              </select>
            </div>

            <div className="space-y-1.5 rounded-xl border border-white/12 bg-white/6 p-3">
              <div className="flex items-center justify-between text-[10px] text-white/50">
                <span>Real-time dynamic budget formula</span>
                <span className="font-mono">(Bal − Bills − Goal) ÷ {safeDays}d</span>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-[11px] text-white/70">Updated daily spendable</span>
                <div className="text-right">
                  <span className="text-[15px] font-extrabold">
                    {formatDisplayCurrency(projectedDailyAllowance, displayCurrency)} / day
                  </span>
                  <span
                    className={`ml-2 text-[11px] font-bold ${
                      allowanceDelta >= 0 ? 'text-[#5EE1B0]' : 'text-[#FF8F8F]'
                    }`}
                  >
                    ({allowanceDelta >= 0 ? '+' : ''}
                    {formatDisplayCurrency(allowanceDelta, displayCurrency)})
                  </span>
                </div>
              </div>
              {displayCurrency !== 'MYR' && (
                <p className="text-[9.5px] text-white/40">
                  {profile.regionLabel} PPP view · base ledger {formatRM(projectedDailyAllowance)}/day
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-white/5 p-2.5 text-[10.5px] leading-relaxed text-white/65">
              <input
                type="checkbox"
                checked={authorizedTransfer}
                onChange={(e) => setAuthorizedTransfer(e.target.checked)}
                className="mt-0.5 rounded border-white/30"
              />
              <span>
                <strong className="text-white">Authorise structured data transfer.</strong> Log this
                entry to the local sandbox ledger and recalculate my Dynamic Daily Allowance (PII
                redacted).
              </span>
            </label>

            <button
              type="submit"
              disabled={!authorizedTransfer || parsedAmount <= 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#F5B84D] py-2.5 text-[13px] font-extrabold text-[#08243B] transition hover:bg-[#FFCB6E] disabled:opacity-40"
            >
              <Check className="h-4 w-4" /> Authorise &amp; save to ledger
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
