'use client';

/**
 * AI Money Assistant — daily Groq-generated insight cards (swipeable carousel).
 *
 * Behaviour (hackathon demo flow):
 * 1. On mount (and whenever the ledger activity fingerprint changes — e.g. a
 *    "Simulate Bank Push" lands via ActivitySection), posts the deterministic
 *    quant-engine snapshot + latest transactions to `/api/ai-analyze`
 *    (type: `daily_cards`) and renders the returned cards.
 * 2. Same-day results are cached in localStorage keyed by the real date AND
 *    the activity fingerprint, so repeatedly opening the app on the same day
 *    reads cache instantly (saves Groq tokens) while any NEW transaction
 *    re-triggers analysis automatically. The ↻ button forces re-analysis.
 * 3. Financial integrity: figures are computed by the deterministic engine in
 *    the browser and quoted to the model — the model narrates, never invents.
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { generateAiFinancialInsights } from '@/lib/ai-insights';
import { localizeMYRText } from '@/lib/currency-ppp';
import { formatRM, cn } from '@/lib/utils';

export interface AiInsightCard {
  id?: string;
  badge: string;
  title: string;
  summary: string;
  highlightPill: string;
  ctaText: string;
  ctaAction: string;
}

export interface AiMoneyAssistantCardProps {
  /**
   * Route a card's ctaAction to the right view:
   * 'cfar' → What-If CFaR simulator · 'budget' → budget details ·
   * 'transactions' → all transactions · 'timeline' → CFaR curve ·
   * 'notifications' → notifications sheet.
   */
  onCtaAction: (action: string) => void;
  className?: string;
}

const CACHE_PREFIX = 'ctrlpay_daily_insights_v1_';

/** First-paint card, byte-identical to the pre-AI handcrafted copy. */
const DEFAULT_CARD: AiInsightCard = {
  id: 'fallback-1',
  badge: 'CFaR 95% Safe',
  title: 'AI Money Assistant',
  summary: 'Dining spend surged +18% this week. Calibrated 30-day projection to defend cash runway.',
  highlightPill: 'Save ~RM 120/mo student discounts',
  ctaText: 'What-If CFaR',
  ctaAction: 'cfar',
};

const BADGE_BY_RISK: Record<string, string> = {
  CRITICAL: 'CFaR Depleted',
  HIGH: 'CFaR Watch',
  MEDIUM: 'CFaR Buffer Tight',
  LOW: 'CFaR 95% Safe',
};

interface CachePayload {
  cards: AiInsightCard[];
  fingerprint: string;
  savedAt: string;
}

function todayKey(): string {
  return `${CACHE_PREFIX}${new Date().toISOString().slice(0, 10)}`;
}

function readCache(key: string): CachePayload | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachePayload;
    if (!parsed || !Array.isArray(parsed.cards) || parsed.cards.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key: string, payload: CachePayload): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* private mode / quota exceeded — cache is best-effort */
  }
}

/** Badge colour follows the engine risk wording, never a hardcoded green. */
function badgeTone(badge: string): { text: string; dot: string } {
  const b = badge.toLowerCase();
  if (b.includes('depleted')) return { text: 'text-rose-600', dot: 'bg-rose-500' };
  if (b.includes('watch') || b.includes('tight')) return { text: 'text-amber-600', dot: 'bg-amber-500' };
  return { text: 'text-emerald-600', dot: 'bg-emerald-500' };
}

export function AiMoneyAssistantCard({ onCtaAction, className }: AiMoneyAssistantCardProps) {
  const userId = useCtrlPayStore((s) => s.userId);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);
  const totalExpenses = useCtrlPayStore((s) => s.totalExpenses);
  const categoryExpenses = useCtrlPayStore((s) => s.categoryExpenses);
  const activities = useCtrlPayStore((s) => s.activities);
  const displayCurrency = useCtrlPayStore((s) => s.displayCurrency);
  const getLedgerSnapshot = useCtrlPayStore((s) => s.ledgerSnapshot);

  const [cards, setCards] = React.useState<AiInsightCard[]>([DEFAULT_CARD]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [loading, setLoading] = React.useState(false);

  // Changing ledger activity → new fingerprint → auto re-analysis today.
  const fingerprint = `${activities?.length ?? 0}|${activities?.[0]?.referenceId ?? 'none'}`;
  const inFlightRef = React.useRef(false);
  const hasLoadedRef = React.useRef(false);

  const applyCards = React.useCallback((next: AiInsightCard[]) => {
    hasLoadedRef.current = true;
    setCards(next);
    setActiveIndex((i) => Math.min(i, Math.max(next.length - 1, 0)));
  }, []);

  const fetchDailyInsights = React.useCallback(
    async (force: boolean) => {
      const activityList = activities ?? [];
      const currentFingerprint = `${activityList.length}|${activityList[0]?.referenceId ?? 'none'}`;

      // Deterministic engine snapshot — every figure below is engine-computed,
      // the model is only asked to narrate them.
      const insights = generateAiFinancialInsights(userId, getLedgerSnapshot(), activityList.length);
      const cfar = insights.cfar;
      const topSaving =
        insights.subscriptions.find(
          (s) => s.status === 'ELIGIBLE_FOR_STUDENT_DISCOUNT' && s.monthlySavings > 0,
        ) ?? insights.subscriptions[0];

      // Engine-derived degradation card (shown while AI is unavailable).
      const fallbackCard: AiInsightCard = {
        badge: BADGE_BY_RISK[cfar.riskLevel] ?? 'CFaR 95% Safe',
        title: 'AI Money Assistant',
        summary: `Snapshot locked: ${formatRM(currentBalance)} on hand, safe runway ${formatRM(cfar.dynamicDailyAllowance)}/day for ${cfar.remainingDays} days.`,
        highlightPill:
          topSaving && topSaving.monthlySavings > 0
            ? `Save ~RM ${Math.round(topSaving.monthlySavings)}/mo ${topSaving.merchantName} student rate`
            : 'Student discount scan armed',
        ctaText: 'What-If CFaR',
        ctaAction: 'cfar',
      };

      const cacheKey = todayKey();
      if (!force) {
        const cached = readCache(cacheKey);
        if (cached) {
          applyCards(cached.cards);
          if (cached.fingerprint === currentFingerprint) return; // fresh enough — skip the API
          // stale: keep showing cached cards while we refresh below
        }
      }

      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setLoading(true);
      try {
        // Largest category by engine buckets, for narrative colour.
        const catMap = categoryExpenses ?? {};
        let topCategoryName = 'Dining & Food';
        let topCategoryAmount = 0;
        Object.entries(catMap).forEach(([name, value]) => {
          if (typeof value === 'number' && value > topCategoryAmount) {
            topCategoryAmount = value;
            topCategoryName = name;
          }
        });

        const res = await fetch('/api/ai-analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'daily_cards',
            ledgerSummary: {
              totalBalance: currentBalance,
              currentBalance,
              spentThisWeek,
              spentThisMonth,
              expenses: totalExpenses,
              totalExpenses,
              topCategory: topCategoryName,
              topCategoryAmount,
              cfar95: cfar.cfar95,
              projectedMonthEndBalance: cfar.projectedMonthEndBalance,
              shortfallProbability: cfar.shortfallProbability,
              riskLevel: cfar.riskLevel,
              dailyAllowance: cfar.dynamicDailyAllowance,
              remainingDays: cfar.remainingDays,
              unpaidBillsTotal: cfar.unpaidBillsTotal,
              topSaving: topSaving
                ? { label: topSaving.merchantName, monthlySavings: topSaving.monthlySavings }
                : null,
            },
            latestTransactions: activityList.slice(0, 6).map((t) => ({
              title: t.title,
              subtitle: t.subtitle,
              amount: t.rawAmount,
              category: t.category,
              timestamp: t.timestamp,
            })),
          }),
        });

        const data = (await res.json().catch(() => null)) as {
          cards?: AiInsightCard[];
          degraded?: boolean;
        } | null;
        const next = Array.isArray(data?.cards) ? data!.cards : [];

        if (next.length > 0) {
          applyCards(next);
          // Degraded = engine fallback served by the API; don't poison today's
          // cache with it — the next open should retry the real analysis.
          if (!data?.degraded) {
            writeCache(cacheKey, {
              cards: next,
              fingerprint: currentFingerprint,
              savedAt: new Date().toISOString(),
            });
          }
        } else if (!hasLoadedRef.current) {
          applyCards([fallbackCard]);
        }
      } catch {
        // Network/API failure: keep current cards; paint the engine card only
        // if nothing better was ever loaded.
        if (!hasLoadedRef.current) applyCards([fallbackCard]);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [
      activities,
      categoryExpenses,
      currentBalance,
      spentThisWeek,
      spentThisMonth,
      totalExpenses,
      userId,
      getLedgerSnapshot,
      applyCards,
    ],
  );

  // Mount + every ledger-activity change (Simulate Bank Push → auto Analyze).
  React.useEffect(() => {
    void fetchDailyInsights(false);
  }, [fetchDailyInsights]);

  const currentCard = cards[activeIndex] ?? cards[0] ?? DEFAULT_CARD;
  const tone = badgeTone(currentCard.badge);

  return (
    <div className={cn('relative mt-4 pt-2 mb-1.5', className)}>
      {/* Deepest Stacked Card Layer (peeking upward at top edge) */}
      <div className="absolute -top-2.5 inset-x-3.5 h-10 rounded-[26px] bg-white/40 backdrop-blur-xs border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.02)] pointer-events-none" />

      {/* Middle Stacked Card Layer (peeking upward at top edge) */}
      <div className="absolute -top-1.5 inset-x-2 h-10 rounded-[26px] bg-white/60 backdrop-blur-xs border border-white/70 shadow-[0_4px_12px_rgba(0,0,0,0.02)] pointer-events-none" />

      {/* Front AI Money Assistant White Frosted Card */}
      <div
        onClick={() => onCtaAction(currentCard.ctaAction || 'cfar')}
        className="relative rounded-[26px] bg-white/65 backdrop-blur-[26px] p-4 sm:p-5 shadow-[0_20px_44px_-8px_rgba(0,0,0,0.045)] border border-white/80 flex items-center justify-between overflow-hidden cursor-pointer group active:scale-[0.99] transition-all"
      >
        {/* Lavender/pink ambient glow accent in bottom right */}
        <div className="absolute -bottom-4 -right-2 w-44 h-36 rounded-full bg-gradient-to-tl from-purple-300/30 via-pink-200/20 to-transparent pointer-events-none" />

        <div className="flex-1 min-w-0 pr-3 z-10">
          {/* Top Header Row with status badge + manual re-analysis */}
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100/90 border border-purple-200/60 px-2 py-0.5 text-[9.5px] font-extrabold text-purple-700 tracking-wide uppercase shrink-0">
              <Sparkles className="h-2.5 w-2.5 text-purple-600" />
              AI Assistant
            </span>
            <span
              className={cn('inline-flex items-center gap-1 text-[9.5px] font-bold min-w-0', tone.text)}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0 animate-pulse', tone.dot)} />
              <span className="truncate">
                {localizeMYRText(currentCard.badge, displayCurrency)}
              </span>
            </span>
            {/* Right-top refresh: force a fresh Groq analysis for today */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void fetchDailyInsights(true);
              }}
              className={cn(
                'ml-auto shrink-0 grid h-6 w-6 place-items-center rounded-full text-slate-400 hover:text-purple-600 hover:bg-purple-50 active:scale-90 transition-all',
                loading && 'animate-spin text-purple-600',
              )}
              title="Re-run AI analysis on the live ledger"
              aria-label="Re-run AI analysis"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${activeIndex}-${currentCard.title}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <h3 className="text-[16px] font-bold text-[#0F172A] tracking-normal">
                {currentCard.title}
              </h3>
              <p
                className={cn(
                  'text-[12px] font-normal text-[#64748B] mt-1 leading-relaxed tracking-normal',
                  loading && 'animate-pulse',
                )}
              >
                {loading
                  ? 'Analyzing your live ledger snapshot…'
                  : localizeMYRText(currentCard.summary, displayCurrency)}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {currentCard.highlightPill ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50/90 border border-purple-100/90 px-2.5 py-1 text-[10px] font-bold text-purple-700 shadow-2xs max-w-full">
                <Sparkles className="h-2.5 w-2.5 text-purple-600 shrink-0" />
                <span className="truncate">
                  {localizeMYRText(currentCard.highlightPill, displayCurrency)}
                </span>
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#0F172A] text-white px-2.5 py-1 text-[10px] font-bold shadow-xs group-hover:bg-[#1E1B4B] transition-colors">
              <span>{currentCard.ctaText}</span>
              <ArrowRight className="h-2.5 w-2.5 text-purple-300" />
            </span>
          </div>

          {/* Carousel dots — switch between today's AI insight cards */}
          {cards.length > 1 && (
            <div
              className="flex justify-center gap-1.5 mt-3"
              onClick={(e) => e.stopPropagation()}
            >
              {cards.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIndex(idx);
                  }}
                  aria-label={`Show insight card ${idx + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    idx === activeIndex ? 'w-4 bg-[#0F172A]' : 'w-1.5 bg-slate-300',
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* 3D Iridescent Orb floating directly without an artificial white frame */}
        <div className="relative shrink-0 w-[64px] h-[64px] flex items-center justify-center z-10">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500/35 via-purple-500/30 to-sky-400/35 blur-md" />
          <div
            className="relative w-[58px] h-[58px] rounded-full overflow-hidden shadow-[0_12px_30px_rgba(168,85,247,0.32)] transition-transform duration-300 group-hover:scale-105"
            style={{
              background:
                'radial-gradient(circle at 32% 26%, #FFFFFF 0%, #FDF2F8 18%, #F472B6 42%, #C084FC 68%, #818CF8 85%, #3B82F6 100%)',
              boxShadow:
                'inset 0 3px 6px rgba(255, 255, 255, 0.98), inset -3px -5px 12px rgba(67, 56, 202, 0.4), 0 10px 24px rgba(236, 72, 153, 0.25)',
            }}
          >
            <div className="absolute top-1.5 left-2 w-4 h-2 rounded-full bg-white blur-[0.3px] -rotate-30 opacity-95" />
            <div className="absolute bottom-1 right-1 w-6 h-5 rounded-full bg-gradient-to-tr from-pink-600/50 to-purple-700/40 blur-[1.5px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
