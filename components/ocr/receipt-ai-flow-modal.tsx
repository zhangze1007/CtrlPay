'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  TrendingUp,
  TrendingDown,
  BarChart2,
  BarChart3,
  AlertTriangle,
  ShieldCheck,
  Wallet,
  X,
  Bot,
  MessageSquare,
  Edit3,
  Save,
  Search,
  Receipt,
  UtensilsCrossed,
  ShoppingBag,
  Bus,
  Film,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';

export interface ReceiptAiFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (data: { merchant: string; amount: number; category: string }) => void;
  onComplete?: () => void;
}

type FlowStep = 1 | 2 | 3 | 4;

interface RecognizedItem {
  name: string;
  price: number;
}

export function ReceiptAiFlowModal({ isOpen, onClose, onSaveSuccess, onComplete }: ReceiptAiFlowModalProps) {
  const [step, setStep] = React.useState<FlowStep>(1);
  const [isScanning, setIsScanning] = React.useState(true);
  const [isEditingReceipt, setIsEditingReceipt] = React.useState(false);

  // Step 1: Recognized Receipt Data
  const [merchantName, setMerchantName] = React.useState('The Coffee Bean & Tea Leaf');
  const [receiptDate, setReceiptDate] = React.useState('18 Oct 2025, 10:32 AM');
  const [receiptTotal, setReceiptTotal] = React.useState(24.64);
  const [receiptCategory, setReceiptCategory] = React.useState('Food & Beverage');
  const [items, setItems] = React.useState<RecognizedItem[]>([
    { name: 'Iced Latte', price: 12.9 },
    { name: 'Croissant', price: 9.5 },
  ]);

  // Step 2: Search and Category Filter
  const [activeCategoryFilter, setActiveCategoryFilter] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  // Step 3 & 4: Budget Adjustment
  const [currentDiningBudget, setCurrentDiningBudget] = React.useState(400);
  const [newDiningBudget, setNewDiningBudget] = React.useState(350);
  const [isAdjustmentConfirmed, setIsAdjustmentConfirmed] = React.useState(false);

  const bookExpense = useCtrlPayStore((s) => s.bookExpense);

  // Auto-finish scanning simulation on step 1
  React.useEffect(() => {
    if (isOpen && step === 1) {
      setIsScanning(true);
      const timer = setTimeout(() => {
        setIsScanning(false);
      }, 1600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  if (!isOpen) return null;

  // Step 2 Transactions list
  const sampleTransactions = [
    {
      id: 'tx-new',
      merchant: merchantName,
      category: receiptCategory,
      amount: receiptTotal,
      date: 'Oct 18, 2025',
      icon: UtensilsCrossed,
      iconBg: '#FEF3C7',
      iconColor: '#D97706',
      isNew: true,
    },
    {
      id: 'tx-1',
      merchant: 'Grab Ride (Campus)',
      category: 'Transport',
      amount: 12.8,
      date: 'Oct 17, 2025',
      icon: Bus,
      iconBg: '#E0F2FE',
      iconColor: '#0284C7',
    },
    {
      id: 'tx-2',
      merchant: 'Watsons Pharmacy',
      category: 'Health & Beauty',
      amount: 56.9,
      date: 'Oct 16, 2025',
      icon: ShoppingBag,
      iconBg: '#ECFDF5',
      iconColor: '#059669',
    },
    {
      id: 'tx-3',
      merchant: 'Spotify Subscription',
      category: 'Entertainment',
      amount: 16.9,
      date: 'Oct 15, 2025',
      icon: Film,
      iconBg: '#F3E8FF',
      iconColor: '#9333EA',
    },
    {
      id: 'tx-4',
      merchant: 'Shell Petrol SS15',
      category: 'Transport',
      amount: 80.0,
      date: 'Oct 14, 2025',
      icon: Zap,
      iconBg: '#FEF2F2',
      iconColor: '#DC2626',
    },
  ];

  const filteredTransactions = sampleTransactions.filter((tx) => {
    const matchesCategory =
      activeCategoryFilter === 'all' ||
      (activeCategoryFilter === 'food' && tx.category.toLowerCase().includes('food')) ||
      (activeCategoryFilter === 'transport' && tx.category.toLowerCase().includes('transport')) ||
      (activeCategoryFilter === 'shopping' &&
        (tx.category.toLowerCase().includes('beauty') || tx.category.toLowerCase().includes('shopping')));
    const matchesSearch =
      tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSaveReceipt = () => {
    // Map receiptCategory to valid SpendCategory
    let storeCat: any = 'Bubble_Tea_Dining';
    const catLower = receiptCategory.toLowerCase();
    if (catLower.includes('transport')) storeCat = 'Transport_Essential';
    else if (catLower.includes('shopping')) storeCat = 'Shopping';
    else if (catLower.includes('entertainment')) storeCat = 'Entertainment';
    else if (catLower.includes('bill')) storeCat = 'Bills_Utilities';
    else if (catLower.includes('education') || catLower.includes('campus')) storeCat = 'Campus_Cafeteria_Basic';
    else if (catLower.includes('food') || catLower.includes('beverage') || catLower.includes('dining')) {
      storeCat = 'Bubble_Tea_Dining';
    }

    bookExpense({
      amount: receiptTotal,
      merchant: merchantName,
      category: storeCat,
      isNeed: true,
    });
    onSaveSuccess?.({
      merchant: merchantName,
      amount: receiptTotal,
      category: receiptCategory,
    });
    onClose();
  };

  const handleConfirmBudgetAdjustment = () => {
    setIsAdjustmentConfirmed(true);
    setTimeout(() => {
      onComplete?.();
      onClose();
    }, 1800);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#F8FAF8] text-[#0F172A] overflow-hidden select-none animate-fade-in">
      {/* Top Workflow Stepper Header */}
      <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 px-4 pt-3 pb-2.5 shrink-0 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as FlowStep)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100 text-gray-700 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#10606F]">
                Step {step} of 4
              </span>
              <h2 className="text-[15px] font-black text-[#04222B] leading-tight">
                {step === 1 && '1. 扫描收据 / 记录消费'}
                {step === 2 && '2. 消费记录与分类'}
                {step === 3 && '3. AI 分析与洞察'}
                {step === 4 && '4. 预算建议与调整'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 4-Step Progress Indicator Bar */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s as FlowStep)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                step >= s ? 'bg-[#10606F]' : 'bg-gray-200'
              )}
              title={`Go to step ${s}`}
            />
          ))}
        </div>
      </div>

      {/* Main Body per Step */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {/* ========================================================================= */}
        {/* STEP 1: 扫描收据 / 记录消费 */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            {isScanning ? (
              /* Camera Scanning Viewfinder */
              <div className="relative rounded-[28px] bg-black text-white p-4 shadow-xl overflow-hidden border border-gray-800">
                {/* Top Viewfinder Header */}
                <div className="flex items-center justify-between pb-3">
                  <span className="text-[13px] font-bold text-white/90 flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-cyan-400" />
                    Scan Receipt
                  </span>
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                    Live OCR
                  </span>
                </div>

                {/* Receipt Preview with Laser Scan Animation */}
                <div className="relative mx-auto w-full max-w-[280px] rounded-2xl bg-[#FFFDF7] p-4 text-[#1E293B] shadow-inner font-mono text-[11px] overflow-hidden border border-amber-100/60">
                  {/* Glowing Laser Scan Bar */}
                  <motion.div
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-cyan-400 via-[#10B981] to-cyan-400 shadow-[0_0_12px_#10B981]"
                    animate={{ y: [0, 220, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  />

                  {/* Receipt Text */}
                  <div className="text-center space-y-1 pb-2 border-b border-dashed border-gray-300">
                    <p className="font-bold text-[13px] tracking-tight text-[#04222B]">
                      THE COFFEE BEAN &amp; TEA LEAF
                    </p>
                    <p className="text-[9.5px] text-gray-500">MID VALLEY MEGAMALL · LOT G-044</p>
                  </div>

                  <div className="py-2.5 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Iced Latte</span>
                      <span>12.90</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Croissant</span>
                      <span>9.50</span>
                    </div>
                    <div className="border-t border-dashed border-gray-200 pt-1.5 flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>22.40</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Tax (SST 10%)</span>
                      <span>2.24</span>
                    </div>
                    <div className="border-t border-gray-800 pt-1.5 flex justify-between font-bold text-[13px] text-[#04222B]">
                      <span>Total</span>
                      <span>RM 24.64</span>
                    </div>
                  </div>

                  <div className="pt-2 text-center text-[9px] text-gray-400 border-t border-dashed border-gray-300">
                    <p>2025-10-18 10:32 AM</p>
                    <div className="mt-1 mx-auto h-8 w-8 rounded bg-gray-200 grid place-items-center text-[8px] font-bold text-gray-600">
                      [QR]
                    </div>
                  </div>
                </div>

                {/* Bottom Scanning Animation Status */}
                <div className="mt-4 rounded-2xl bg-white/10 backdrop-blur-md p-3 flex items-center gap-3">
                  <div className="relative h-7 w-7 shrink-0 grid place-items-center">
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-cyan-400 border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    />
                    <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-white">Scanning...</p>
                    <p className="text-[10px] text-cyan-200/80">AI is reading your receipt items...</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Receipt Recognized Result Card (Matching Screen 1 Right) */
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-3"
              >
                {/* Top Success Badge */}
                <div className="flex items-center gap-2 rounded-2xl bg-[#ECFDF5] p-3 border border-[#A7F3D0]">
                  <CheckCircle2 className="h-5 w-5 text-[#059669] shrink-0" />
                  <span className="text-[13px] font-extrabold text-[#059669]">
                    Receipt Recognized
                  </span>
                </div>

                {/* Recognized Info Card */}
                <div className="rounded-[24px] bg-white p-4 shadow-sm border border-gray-100 space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Merchant
                    </label>
                    {isEditingReceipt ? (
                      <input
                        type="text"
                        value={merchantName}
                        onChange={(e) => setMerchantName(e.target.value)}
                        className="w-full font-bold text-[14px] text-[#04222B] border-b border-[#10606F] focus:outline-none"
                      />
                    ) : (
                      <p className="font-bold text-[15px] text-[#04222B]">{merchantName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                        Date &amp; Time
                      </label>
                      <p className="text-[12px] font-semibold text-gray-700">{receiptDate}</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Category
                        </label>
                        {!isEditingReceipt && (
                          <button
                            type="button"
                            onClick={() => setIsEditingReceipt(true)}
                            className="text-[9.5px] font-bold text-[#10606F] hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                      {isEditingReceipt ? (
                        <div className="mt-1 space-y-1.5">
                          <select
                            value={receiptCategory}
                            onChange={(e) => setReceiptCategory(e.target.value)}
                            className="w-full rounded-xl bg-gray-50 border border-gray-200 px-2 py-1.5 text-[11.5px] font-bold text-[#04222B] focus:outline-none focus:ring-1 focus:ring-[#10606F]"
                          >
                            <option value="Food & Beverage">☕ Food & Beverage</option>
                            <option value="Transport">🚗 Transport</option>
                            <option value="Shopping">🛍️ Shopping</option>
                            <option value="Entertainment">🎬 Entertainment</option>
                            <option value="Education">📚 Education</option>
                            <option value="Bills & Utilities">⚡ Bills & Utilities</option>
                          </select>
                          {/* Quick Selectable Pill Chips */}
                          <div className="flex flex-wrap gap-1">
                            {[
                              { label: 'Food & Beverage', icon: '☕' },
                              { label: 'Transport', icon: '🚗' },
                              { label: 'Shopping', icon: '🛍️' },
                              { label: 'Entertainment', icon: '🎬' },
                              { label: 'Bills & Utilities', icon: '⚡' },
                            ].map((cat) => (
                              <button
                                key={cat.label}
                                type="button"
                                onClick={() => setReceiptCategory(cat.label)}
                                className={cn(
                                  'rounded-lg px-1.5 py-0.5 text-[9.5px] font-bold transition-all',
                                  receiptCategory === cat.label
                                    ? 'bg-[#10606F] text-white shadow-xs'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                )}
                              >
                                {cat.icon} {cat.label.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsEditingReceipt(true)}
                          className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-extrabold text-[#D97706] hover:bg-[#FDE68A] transition-colors"
                          title="Click to edit category"
                        >
                          <span>☕</span>
                          <span>{receiptCategory}</span>
                          <span className="text-[9px] text-[#B45309] font-normal ml-0.5">✎</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Total Amount Big Highlight */}
                  <div className="rounded-2xl bg-gradient-to-r from-[#F8FAF8] to-[#E2F4F0]/50 p-3 border border-[#E2F4F0]">
                    <span className="text-[10.5px] font-bold text-gray-500">Total Amount</span>
                    {isEditingReceipt ? (
                      <div className="relative mt-1 flex items-center">
                        <span className="font-sans text-[20px] font-black text-[#04222B] mr-1">RM</span>
                        <input
                          type="number"
                          step="0.01"
                          value={receiptTotal}
                          onChange={(e) => setReceiptTotal(parseFloat(e.target.value) || 0)}
                          className="w-full font-sans text-[24px] font-black text-[#04222B] bg-transparent border-b border-[#10606F] focus:outline-none"
                        />
                      </div>
                    ) : (
                      <p className="font-sans text-[26px] font-black text-[#04222B] tracking-tight mt-0.5">
                        RM {receiptTotal.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Items list */}
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Extracted Items
                    </label>
                    <div className="mt-1 divide-y divide-gray-100 text-[12px]">
                      {items.map((it, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between font-medium text-gray-700">
                          <span>{it.name}</span>
                          <span className="font-bold text-[#04222B]">RM {it.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions: Edit / Save & Next */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingReceipt(!isEditingReceipt)}
                    className="flex-1 rounded-2xl bg-white border border-gray-200 py-3 text-[13px] font-bold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>{isEditingReceipt ? 'Done Editing' : 'Edit Details'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveReceipt}
                    className="flex-1 rounded-2xl bg-[#04222B] text-white py-3 text-[13px] font-extrabold shadow-md hover:bg-[#0A3D4A] active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save &amp; Record</span>
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: 消费记录与分类 */}
        {/* ========================================================================= */}
        {step === 2 && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Header Description */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[18px] font-black text-[#04222B]">Transactions</h3>
                <p className="text-[11px] text-gray-500">Auto-categorized &amp; verified by AI</p>
              </div>
              <span className="rounded-full bg-[#E2F4F0] px-2.5 py-0.5 text-[11px] font-bold text-[#10606F]">
                {filteredTransactions.length} records
              </span>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All' },
                { id: 'food', label: 'Food & Beverage' },
                { id: 'transport', label: 'Transport' },
                { id: 'shopping', label: 'Shopping' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(c.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shadow-xs',
                    activeCategoryFilter === c.id
                      ? 'bg-[#04222B] text-white'
                      : 'bg-white text-gray-600 hover:text-[#04222B] border border-gray-100'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-full bg-white pl-10 pr-4 py-2 text-[12px] text-[#04222B] border border-gray-200/80 shadow-xs focus:outline-none focus:ring-2 focus:ring-[#10606F]/30"
              />
            </div>

            {/* Transactions Feed */}
            <div className="space-y-2">
              {filteredTransactions.map((tx) => {
                const Icon = tx.icon;
                return (
                  <div
                    key={tx.id}
                    className={cn(
                      'flex items-center justify-between rounded-[22px] bg-white p-3.5 shadow-xs border transition-all',
                      tx.isNew ? 'border-[#10606F] ring-1 ring-[#10606F]/30' : 'border-gray-100'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="grid h-10 w-10 place-items-center rounded-2xl shadow-xs shrink-0"
                        style={{ backgroundColor: tx.iconBg, color: tx.iconColor }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[13px] font-bold text-[#04222B] leading-tight truncate">
                            {tx.merchant}
                          </p>
                          {tx.isNew && (
                            <span className="shrink-0 rounded-full bg-[#10606F] px-1.5 py-0.2 text-[8.5px] font-black text-white">
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-[10.5px] text-gray-500 mt-0.5 truncate">
                          {tx.category} · {tx.date}
                        </p>
                      </div>
                    </div>

                    <span className="font-sans text-[13.5px] font-black text-[#04222B] tabular-nums shrink-0 ml-2">
                      RM {tx.amount.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Bottom Next Step Callout */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full rounded-2xl bg-[#04222B] text-white py-3.5 text-[13px] font-extrabold shadow-md hover:bg-[#0A3D4A] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <span>Generate AI Insights &amp; Graphs →</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: AI 分析与洞察 (Rich Visual Graphs as requested!) */}
        {/* ========================================================================= */}
        {step === 3 && (
          <div className="space-y-3.5 animate-fade-in">
            {/* AI Assistant Banner */}
            <div className="flex items-start gap-3 rounded-[24px] bg-gradient-to-br from-[#E2F4F0] via-white to-[#F0FDF4] p-4 border border-[#A7F3D0]/80 shadow-xs">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#10606F] text-white shrink-0 shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[15px] font-black text-[#04222B]">AI Financial Insights</h3>
                  <span className="rounded-full bg-[#10B981] px-1.5 py-0.2 text-[8.5px] font-black text-white">
                    LIVE
                  </span>
                </div>
                <p className="text-[11.5px] text-gray-600 mt-0.5 leading-relaxed">
                  Based on your recent coffee &amp; dining spending, here are your visual analysis and
                  recommendations:
                </p>
              </div>
            </div>

            {/* Visual Graph 1: Dining Budget Burn Bar (91% alert) */}
            <div className="rounded-[24px] bg-white p-4 shadow-xs border border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Dining Budget Utilization
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 border border-amber-200">
                  ⚠️ 91% Burned
                </span>
              </div>

              {/* Amount Counter */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-sans text-[22px] font-black text-[#04222B]">RM 365.00</span>
                  <span className="text-[12px] font-bold text-gray-400 ml-1">spent of RM 400.00</span>
                </div>
                <span className="text-[11px] font-extrabold text-rose-600">RM 35.00 left</span>
              </div>

              {/* Interactive Visual Progress Bar with Threshold Mark */}
              <div className="relative h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-rose-600"
                  initial={{ width: 0 }}
                  animate={{ width: '91.25%' }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] text-gray-500">
                You spent RM 365 on dining this month, which is 91% of your RM 400 budget with 13 days
                remaining.
              </p>
            </div>

            {/* Visual Graph 2: Comparative Category Bar Chart */}
            <div className="rounded-[24px] bg-white p-4 shadow-xs border border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-[#10606F]" />
                  Category Spending Breakdown
                </span>
                <span className="text-[10.5px] font-bold text-gray-400">Monthly</span>
              </div>

              {/* Visual Horizontal Bars */}
              <div className="space-y-2">
                {[
                  { name: 'Dining', amount: 365, max: 400, percent: 91, color: '#F59E0B' },
                  { name: 'Shopping', amount: 140, max: 400, percent: 35, color: '#EC4899', spike: '+40% spike' },
                  { name: 'Utilities', amount: 89, max: 400, percent: 22, color: '#0EA5E9' },
                  { name: 'Transport', amount: 65, max: 400, percent: 16, color: '#10B981' },
                ].map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className="text-gray-700 flex items-center gap-1.5">
                        {item.name}
                        {item.spike && (
                          <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full">
                            {item.spike}
                          </span>
                        )}
                      </span>
                      <span className="text-[#04222B]">RM {item.amount.toFixed(2)}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Metric Card 3: Potential Monthly Savings */}
            <div className="rounded-[24px] bg-gradient-to-br from-[#04222B] to-[#0A3D4A] p-4 text-white shadow-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[#10B981] text-white">
                  <TrendingDown className="h-3.5 w-3.5" />
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-200">
                  Potential Optimization
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="font-sans text-[24px] font-black text-white">Save ~RM 120.00</span>
                <span className="text-[11px] font-extrabold text-[#10B981]">/ month</span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                You could save approximately RM 120 this month if non-essential cafe visits are adjusted
                to campus options.
              </p>
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-full bg-white border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 shadow-xs hover:border-[#10606F] hover:text-[#10606F] transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <span>📊 Show spending chart</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                className="rounded-full bg-white border border-gray-200 px-3 py-1.5 text-[11px] font-bold text-gray-700 shadow-xs hover:border-[#10606F] hover:text-[#10606F] transition-colors whitespace-nowrap flex items-center gap-1.5"
              >
                <span>🎯 Create a budget plan</span>
              </button>
            </div>

            {/* Next Step Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-full rounded-2xl bg-[#04222B] text-white py-3.5 text-[13px] font-extrabold shadow-md hover:bg-[#0A3D4A] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
              >
                <span>Review Budget Adjustment Proposal →</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: 预算建议与调整 */}
        {/* ========================================================================= */}
        {step === 4 && (
          <div className="space-y-3.5 animate-fade-in">
            {/* Header Card: Proposal */}
            <div className="rounded-[24px] bg-white p-4 shadow-xs border border-gray-100 space-y-2">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#E2F4F0] text-[#10606F]">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <span className="text-[12px] font-extrabold uppercase tracking-wide text-[#10606F]">
                  Budget Adjustment Proposal
                </span>
              </div>
              <h3 className="text-[17px] font-black text-[#04222B] leading-tight">
                Reduce Dining Budget
              </h3>
              <p className="text-[12px] text-gray-600 leading-relaxed">
                To stay within your monthly student survival budget, AI suggests reducing your dining
                allocation by <span className="font-bold text-[#04222B]">RM 50</span> for next week.
              </p>
            </div>

            {/* Visual Before vs After Budget Comparison Chart */}
            <div className="rounded-[24px] bg-gradient-to-br from-white to-[#F8FAF8] p-4 shadow-xs border border-gray-200/80 space-y-3">
              <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">
                Current vs New Budget
              </span>

              {/* Side by Side Comparative Display */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Current Budget Box */}
                <div className="rounded-2xl bg-gray-50 p-3.5 border border-gray-200/70 text-center">
                  <span className="text-[11px] font-bold text-gray-500">Dining Budget</span>
                  <p className="font-sans text-[20px] font-black text-gray-700 mt-1">
                    RM {currentDiningBudget}
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-gray-400 w-full" />
                  </div>
                </div>

                {/* Proposed New Budget Box */}
                <div className="rounded-2xl bg-[#ECFDF5] p-3.5 border border-[#A7F3D0] text-center relative overflow-hidden">
                  <span className="absolute top-1.5 right-1.5 rounded-full bg-[#059669] text-white px-1.5 py-0.2 text-[8px] font-black">
                    -12.5%
                  </span>
                  <span className="text-[11px] font-bold text-[#059669]">After Adjustment</span>
                  <p className="font-sans text-[20px] font-black text-[#059669] mt-1">
                    RM {newDiningBudget}
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-emerald-200">
                    <div className="h-full rounded-full bg-[#059669] w-[87.5%]" />
                  </div>
                </div>
              </div>

              {/* Impact Callout Pill */}
              <div className="rounded-xl bg-[#E2F4F0] p-2.5 flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#10606F] flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Runway Protection
                </span>
                <span className="font-extrabold text-[#04222B]">+4.5 days safe survival</span>
              </div>
            </div>

            {/* AI Quantitative Reason Note */}
            <div className="rounded-2xl bg-white p-3.5 border border-gray-100 space-y-1">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-gray-400">
                Reason &amp; Quantitative Logic
              </span>
              <p className="text-[11.5px] text-gray-600 leading-relaxed">
                Your current dining spending is 91% of your monthly allocation. This adjustment prevents
                early month overdraft and frees up safety liquidity for campus study supplies.
              </p>
            </div>

            {/* Action Buttons: Confirm Adjustment / Cancel */}
            <div className="pt-2 space-y-2">
              {isAdjustmentConfirmed ? (
                <div className="w-full rounded-2xl bg-[#059669] text-white py-3.5 text-center font-extrabold text-[13px] shadow-lg flex items-center justify-center gap-2 animate-bounce">
                  <Check className="h-5 w-5 stroke-[3]" />
                  <span>Budget Adjusted to RM 350.00!</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleConfirmBudgetAdjustment}
                    className="w-full rounded-2xl bg-[#04222B] text-white py-3.5 text-[13.5px] font-extrabold shadow-md hover:bg-[#0A3D4A] active:scale-95 transition-all text-center flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                    <span>Confirm Adjustment</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full rounded-2xl bg-white border border-gray-200 py-3 text-[12.5px] font-bold text-gray-600 hover:bg-gray-50 active:scale-95 transition-all text-center"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
