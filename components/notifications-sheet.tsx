'use client';

import * as React from 'react';
import { Bell, CheckCheck, ShieldCheck, Sparkles, AlertCircle, ArrowDownLeft, ArrowUpRight, Bot, ArrowRight } from 'lucide-react';
import { useDisplayCurrency } from '@/lib/use-display-currency';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  amount?: string;
  isPositive?: boolean;
  type: 'transaction' | 'security' | 'insight';
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    title: 'Paypal Payment Received',
    description: 'Direct transfer from client completed.',
    time: 'Today, 5:32 PM',
    amount: '+RM 80.89',
    isPositive: true,
    type: 'transaction',
    read: false,
  },
  {
    id: 'notif_2',
    title: 'Google one Subscription',
    description: 'Auto-renewal for 2TB cloud storage booked.',
    time: 'Today, 2:40 PM',
    amount: '-RM 10.99',
    isPositive: false,
    type: 'transaction',
    read: false,
  },
  {
    id: 'notif_3',
    title: 'Apple Services',
    description: 'Monthly iCloud+ and Developer subscription.',
    time: 'Yesterday, 11:20 AM',
    amount: '-RM 15.00',
    isPositive: false,
    type: 'transaction',
    read: true,
  },
  {
    id: 'notif_4',
    title: 'CFaR Survival Floor Safe',
    description: 'Deterministic quant engine verified 0% NSF risk this month.',
    time: 'Yesterday, 9:00 AM',
    type: 'security',
    read: true,
  },
  {
    id: 'notif_5',
    title: 'Total Spending Trend +2.50%',
    description: 'Weekly expenditure remains optimal within your survival buffer.',
    time: '2 days ago',
    type: 'insight',
    read: true,
  },
];

export interface NotificationsSheetProps {
  onClose: () => void;
  onSelectProposal?: (proposal: { merchant: string; amount: number; category: string }) => void;
  aiNotification?: { merchant: string; amount: number; category: string } | null;
}

export function NotificationsSheet({ onClose, onSelectProposal, aiNotification }: NotificationsSheetProps) {
  const { format, localize } = useDisplayCurrency();
  const [items, setItems] = React.useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const markAllAsRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const clearAll = () => {
    setItems([]);
  };

  return (
    <div className="space-y-3 pt-1">
      {/* AI Proactive Budget Notification Card */}
      {aiNotification && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            onSelectProposal?.(aiNotification);
            onClose();
          }}
          className="rounded-2xl p-3.5 bg-gradient-to-br from-[#04222B] to-[#0A3D4A] text-white shadow-md border border-[#10606F]/50 cursor-pointer active:scale-98 transition-all group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#10606F] text-white shadow-xs">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-[13.5px] font-black text-white leading-snug">
                    AI Copilot · Budget Analysis Ready
                  </p>
                  <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                </div>
                <p className="text-[11.5px] text-gray-300 mt-1 leading-relaxed">
                  {format(aiNotification.amount)} recorded for{' '}
                  <span className="font-bold text-white">{aiNotification.merchant}</span>. Tap to review
                  interactive budget proposal &amp; visual charts.
                </p>
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#10606F] text-cyan-200 px-2.5 py-0.5 text-[10.5px] font-bold group-hover:bg-[#1D8B94] group-hover:text-white transition-colors">
                  <span>Open Proposal in Copilot</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </div>
            <span className="text-[10px] font-medium text-cyan-300 whitespace-nowrap">Just now</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pb-1">
        <span className="text-[11.5px] font-bold text-[#64748B]">
          {items.filter((i) => !i.read).length} unread alerts
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[11px] font-bold text-[#1C7EC8] hover:underline"
          >
            Mark all read
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-[11px] font-medium text-[#94A3B8] hover:text-[#0B1E3F]"
          >
            Clear
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#EBF4FF] text-[#1C7EC8]">
            <CheckCheck className="h-6 w-6" />
          </div>
          <p className="mt-3 text-[14px] font-bold text-[#0B1E3F]">You are all caught up!</p>
          <p className="mt-1 text-[11.5px] text-[#64748B]">No unread alerts or spending anomalies.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl p-3.5 transition-all border ${
                item.read
                  ? 'bg-white/80 border-[#E2E8F0]/70'
                  : 'bg-white border-[#BFDBFE] shadow-[0_4px_16px_rgba(28,126,200,0.08)]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      item.type === 'transaction'
                        ? item.isPositive
                          ? 'bg-[#E3F3EF] text-[#0F6B55]'
                          : 'bg-[#EBF4FF] text-[#1C7EC8]'
                        : item.type === 'security'
                          ? 'bg-[#E3F3EF] text-[#0F6B55]'
                          : 'bg-[#FFF7ED] text-[#C2410C]'
                    }`}
                  >
                    {item.type === 'transaction' ? (
                      item.isPositive ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )
                    ) : item.type === 'security' ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13.5px] font-bold text-[#0B1E3F] leading-snug">
                        {item.title}
                      </p>
                      {!item.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[#1C7EC8]" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-[#64748B] leading-relaxed">
                      {item.description}
                    </p>
                    <span className="mt-1 block text-[10px] font-medium text-[#94A3B8]">
                      {item.time}
                    </span>
                  </div>
                </div>

                {item.amount && (
                  <span
                    className={`shrink-0 font-mono text-[13px] font-black ${
                      item.isPositive ? 'text-[#10B981]' : 'text-[#0B1E3F]'
                    }`}
                  >
                    {localize(item.amount)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full mt-3 rounded-xl bg-[#F1F5F9] py-3 text-[12.5px] font-bold text-[#0B1E3F] hover:bg-[#E2E8F0] transition-colors"
      >
        Close Notifications
      </button>
    </div>
  );
}
