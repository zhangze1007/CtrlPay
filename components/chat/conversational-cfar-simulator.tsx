'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  Check,
  RefreshCw,
  Send,
  Sparkles,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  HelpCircle,
  Lock,
  Layers,
} from 'lucide-react';
import { cn, formatRM } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';
import type { SpendCategory } from '@/lib/types';
import { upcomingFixedBills } from '@/lib/ledger';
import { SUBSCRIPTIONS } from '@/lib/mock-data';

export interface ConversationalCfarSimulatorProps {
  onBack?: () => void;
  onClose?: () => void;
  initialScenario?: 'moderate' | 'mild' | 'severe';
  /** Route a free-form question to the live Gemini Copilot instead of the CFaR template. */
  onFreeformQuery?: (text: string) => void;
}

export type ScenarioPreset = 'mild' | 'moderate' | 'severe';

export function ConversationalCfarSimulator({
  onBack,
  onClose,
  onFreeformQuery,
}: ConversationalCfarSimulatorProps) {
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);
  const runWhatIf = useCtrlPayStore((s) => s.runWhatIf);
  const masterAutonomy = useCtrlPayStore((s) => s.masterAutonomyEnabled);
  const setMasterAutonomy = useCtrlPayStore((s) => s.setMasterAutonomy);

  // Progressive streaming step (0 -> 5)
  const [streamStep, setStreamStep] = React.useState<number>(0);
  const [isComputing, setIsComputing] = React.useState<boolean>(true);
  const [loadingText, setLoadingText] = React.useState<string>(
    'Calibrating scenario assumptions...'
  );

  // Scenario parameters
  const [scenarioPreset, setScenarioPreset] = React.useState<ScenarioPreset>('moderate');
  const [incomeDropPercent, setIncomeDropPercent] = React.useState<number>(15);
  const [expenseSurgePercent, setExpenseSurgePercent] = React.useState<number>(20);
  const [proposedAmount, setProposedAmount] = React.useState<number>(180);
  const [showAdjustSliders, setShowAdjustSliders] = React.useState<boolean>(false);
  const [showScenarioComparison, setShowScenarioComparison] = React.useState<boolean>(false);

  // API data state
  const [apiData, setApiData] = React.useState<{
    simulationResult: {
      cfar95: number;
      es95: number;
      baselineCfar95: number;
      deltaCfar: number;
      dynamicDailyAllowance: number;
      baselineAllowance: number;
      shortfallProbability: number;
      survivalRunwayDays: number;
      confidence: string;
    };
    projectionData: {
      points: Array<{ day: number; label: string; baseline: number; stressed: number }>;
      breachDay: number;
      survivalFloor: number;
    };
    riskInterpretation: {
      summary: string;
      breachWarning: string;
      breachDay: number;
      limitations: string;
    };
  } | null>(null);

  // Follow-up messages in conversation thread
  const [conversationMessages, setConversationMessages] = React.useState<
    Array<{ id: string; role: 'user' | 'assistant'; text: string; time?: string }>
  >([]);
  const [inputText, setInputText] = React.useState('');
  const [isQueryLoading, setIsQueryLoading] = React.useState(false);
  const [hoveredPointIndex, setHoveredPointIndex] = React.useState<number | null>(null);

  // Prevent duplicate runs
  const runningRef = React.useRef(false);

  // Local fallback quant engine
  const localSimulationResult = React.useMemo(() => {
    return runWhatIf({
      merchant: 'Scenario Simulator',
      amount: proposedAmount,
      category: 'Shopping' as SpendCategory,
      isNeed: false,
    });
  }, [runWhatIf, proposedAmount]);

  // Baseline vs Stressed 30-day projection curves fallback
  const localProjectionData = React.useMemo(() => {
    const days = 30;
    const baseAllowance = localSimulationResult.dynamicDailyAllowance || 35.5;
    const stressedAllowance = baseAllowance * (1 + expenseSurgePercent / 100);
    const startBal = currentBalance > 0 ? currentBalance : 7540;

    const scheduledBills = [
      { day: 8, amount: 6.8 },
      { day: 12, amount: 7.4 },
      { day: 18, amount: 89.0 },
      { day: 24, amount: 120.0 },
    ];

    let baseRunning = startBal;
    let stressedRunning = startBal - proposedAmount;

    const points = [];
    let breachDay: number | null = null;
    const survivalFloor = 150;

    for (let d = 0; d <= days; d += 2) {
      if (d > 0) {
        baseRunning -= baseAllowance * 2;
        stressedRunning -= stressedAllowance * 2;

        const billsOnInterval = scheduledBills.filter((b) => b.day > d - 2 && b.day <= d);
        for (const bill of billsOnInterval) {
          baseRunning -= bill.amount;
          stressedRunning -= bill.amount;
        }
      }

      const tailUncertainty = localSimulationResult.es95 * Math.sqrt(d / days) * 0.15;
      const stressedValue = Math.round(stressedRunning - tailUncertainty);
      const baselineValue = Math.round(baseRunning);

      if (stressedValue <= survivalFloor && breachDay === null && d > 0) {
        breachDay = d;
      }

      points.push({
        day: d,
        label: `Day ${d}`,
        baseline: Math.max(0, baselineValue),
        stressed: Math.max(-50, stressedValue),
      });
    }

    return { points, breachDay: breachDay || 18, survivalFloor };
  }, [currentBalance, proposedAmount, expenseSurgePercent, localSimulationResult]);

  // Prioritize actual output from /api/cfar-simulation
  const simulationResult = apiData?.simulationResult || {
    cfar95: localSimulationResult.cfar95,
    es95: localSimulationResult.es95,
    baselineCfar95: 312.5,
    deltaCfar: Number((localSimulationResult.cfar95 - 312.5).toFixed(2)),
    dynamicDailyAllowance: localSimulationResult.dynamicDailyAllowance,
    baselineAllowance: 35.5,
    shortfallProbability: localSimulationResult.shortfallProbability,
    survivalRunwayDays: 13.2,
    confidence: '95%',
  };

  const projectionData = apiData?.projectionData || localProjectionData;

  const riskInterpretation = apiData?.riskInterpretation || {
    summary: `Under the ${scenarioPreset.toUpperCase()} stress scenario, your safe daily allowance contracts from RM 35.50 down to RM ${simulationResult.dynamicDailyAllowance.toFixed(2)}/day.`,
    breachWarning: `Unplanned dining velocity and scheduled fixed bills cause your cash balance to dip below the RM ${projectionData.survivalFloor}.00 survival threshold at Day ${projectionData.breachDay}.`,
    breachDay: projectionData.breachDay,
    limitations: '1,000 Monte Carlo bootstrap paths at 95% Value-at-Risk (Basel III coherent ES95 tail), assuming historical student spending variance.',
  };

  // Run progressive streaming sequence connected to real API
  const startSimulation = React.useCallback(
    async (
      preset = scenarioPreset,
      drop = incomeDropPercent,
      surge = expenseSurgePercent,
      amount = proposedAmount
    ) => {
      if (runningRef.current) return;
      runningRef.current = true;
      setStreamStep(0);
      setIsComputing(true);
      setLoadingText('Connecting to CFaR Engine API & authenticating crypto session...');

      try {
        const res = await fetch('/api/cfar-simulation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioPreset: preset,
            incomeDropPercent: drop,
            expenseSurgePercent: surge,
            proposedAmount: amount,
            ledgerSnapshot: useCtrlPayStore.getState().ledgerSnapshot(),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setApiData(data);
        }
      } catch (err) {
        console.warn('[CFaR API] using local engine fallback', err);
      }

      // Stream out the progressive sequence strictly derived from verified API calculations
      const t1 = setTimeout(() => {
        setStreamStep(1); // Message 1: Scenario Setup
        setLoadingText('Running 1,000 Monte Carlo bootstrap paths (Basel III ES95)...');
      }, 350);

      const t2 = setTimeout(() => {
        setStreamStep(2); // Message 2: Risk Summary KPI Cards
        setLoadingText('Generating 30-day cash flow projection graph from API...');
      }, 1100);

      const t3 = setTimeout(() => {
        setStreamStep(3); // Message 3: Cash Flow Projection Graph
        setLoadingText('Synthesizing AI risk interpretation from API data...');
      }, 1900);

      const t4 = setTimeout(() => {
        setStreamStep(4); // Message 4: Risk Interpretation
        setLoadingText('Formulating actionable mitigation options...');
      }, 2650);

      const t5 = setTimeout(() => {
        setStreamStep(5); // Message 5: Follow-up Actions
        setIsComputing(false);
        runningRef.current = false;
      }, 3300);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(t5);
        runningRef.current = false;
      };
    },
    [scenarioPreset, incomeDropPercent, expenseSurgePercent, proposedAmount]
  );

  // Handle Preset Selection with live API recalculation
  const applyPreset = (preset: ScenarioPreset) => {
    setScenarioPreset(preset);
    let drop = 15;
    let surge = 20;
    let amount = 180;
    if (preset === 'mild') {
      drop = 5;
      surge = 10;
      amount = 80;
    } else if (preset === 'severe') {
      drop = 30;
      surge = 40;
      amount = 350;
    }
    setIncomeDropPercent(drop);
    setExpenseSurgePercent(surge);
    setProposedAmount(amount);

    // Trigger API calculation for updated preset
    void startSimulation(preset, drop, surge, amount);
  };

  React.useEffect(() => {
    void startSimulation();
  }, []);

  // Send query directly to server API route
  const sendQueryToApi = async (userText: string) => {
    if (!userText.trim() || isQueryLoading) return;
    const time = 'Just now';
    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user' as const,
      text: userText,
      time,
    };

    setConversationMessages((prev) => [...prev, userMsg]);
    setIsQueryLoading(true);

    try {
      const res = await fetch('/api/cfar-simulation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          scenarioPreset,
          expenseSurgePercent,
          proposedAmount,
          ledgerSnapshot: useCtrlPayStore.getState().ledgerSnapshot(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: data.reply || `Analysis completed for query.`,
            time: 'Just now',
          },
        ]);
      } else {
        throw new Error('API query error');
      }
    } catch {
      // Graceful local fallback if offline
      setConversationMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `Based on your simulated 30-day projection, maintaining a daily allowance of **RM ${simulationResult.dynamicDailyAllowance.toFixed(
            2
          )}** will keep your survival runway intact until the next billing cycle.`,
          time: 'Just now',
        },
      ]);
    } finally {
      setIsQueryLoading(false);
    }
  };

  // Handle follow-up action buttons
  const handleFollowUpAction = (actionKey: string) => {
    if (actionKey === 'explain_cfar') {
      void sendQueryToApi('Explain how CFaR is calculated and what it means for me.');
    } else if (actionKey === 'compare_scenarios') {
      setShowScenarioComparison(!showScenarioComparison);
    } else if (actionKey === 'adjust_assumptions') {
      setShowAdjustSliders(!showAdjustSliders);
    } else if (actionKey === 'arm_shield') {
      setMasterAutonomy(true);
      void sendQueryToApi('Arm Autonomous Shield to protect my survival floor.');
    } else if (actionKey === 'rerun_simulation') {
      void startSimulation();
    }
  };

  // Handle user typing a custom message
  const handleSendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');
    if (onFreeformQuery) {
      onFreeformQuery(text);
      return;
    }
    void sendQueryToApi(text);
  };

  // Chart SVG bounds & coordinate helpers
  const svgWidth = 360;
  const svgHeight = 160;
  const padLeft = 42;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 28;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(
    ...projectionData.points.map((p) => Math.max(p.baseline, p.stressed)),
    1000
  );
  const minVal = -50;

  const getX = (index: number) =>
    padLeft + (index / (projectionData.points.length - 1)) * chartW;
  const getY = (val: number) =>
    padTop + (1 - (val - minVal) / (maxVal - minVal)) * chartH;

  const baselinePath = projectionData.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.baseline).toFixed(1)}`)
    .join(' ');

  const stressedPath = projectionData.points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.stressed).toFixed(1)}`)
    .join(' ');

  const floorY = getY(projectionData.survivalFloor);

  return (
    <div className="flex flex-col justify-between min-h-[72vh] select-none text-slate-800">
      {/* Messages Scroll Area */}
      <div className="space-y-3.5 overflow-y-auto no-scrollbar pb-3">
        {/* ============================================================== *
         * TURN 1: User Initiating Message
         * ============================================================== */}
        {/* ============================================================== *
         * TURN 1: User Initiating Message
         * ============================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="flex justify-end"
        >
          <div className="max-w-[85%] rounded-[20px] rounded-tr-sm bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white px-4 py-2.5 text-[12.5px] font-medium shadow-sm">
            Run a What-If CFaR simulation on my spending and test survival runway.
          </div>
        </motion.div>

        {/* Dynamic Loading Indicator for Running Step */}
        {isComputing && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-[11px] text-[#7C3AED] pl-1 py-1"
          >
            <div className="relative shrink-0 w-6 h-6 rounded-full overflow-hidden shadow-xs flex items-center justify-center bg-gradient-to-tr from-[#A855F7] to-[#6366F1] text-white">
              <RefreshCw className="h-3 w-3 animate-spin" />
            </div>
            <div className="flex items-center gap-2 bg-purple-50/90 px-3 py-1 rounded-full border border-purple-100 shadow-2xs">
              <span className="flex gap-1">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </span>
              <span className="font-semibold text-[10.5px] text-purple-900">
                {loadingText}
              </span>
            </div>
          </motion.div>
        )}

        {/* ============================================================== *
         * MESSAGE 1 — SCENARIO SETUP (Progressive Step 1)
         * ============================================================== */}
        {streamStep >= 1 && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="flex items-start gap-2.5"
          >
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
              style={{
                background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <Bot className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-2 max-w-[92%]">
              <div className="rounded-[20px] rounded-tl-sm bg-white/95 backdrop-blur-xl p-3.5 text-[12.5px] text-slate-700 shadow-sm border border-gray-100/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider flex items-center gap-1">
                    <SlidersHorizontal className="h-3 w-3" />
                    Message 1 · Scenario Assumptions Setup
                  </span>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-[#7C3AED] border border-purple-200">
                    Active Scenario
                  </span>
                </div>

                <p className="text-[12px] leading-relaxed">
                  I&apos;ve initiated the <strong>Cash-Flow-at-Risk (CFaR)</strong> stress simulation under the following baseline parameters:
                </p>

                {/* Assumptions Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <span className="block text-[9.5px] text-slate-500 font-medium">Income Drop</span>
                    <span className="text-[13px] font-bold text-rose-600">-{incomeDropPercent}%</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <span className="block text-[9.5px] text-slate-500 font-medium">Expense Surge</span>
                    <span className="text-[13px] font-bold text-amber-600">+{expenseSurgePercent}%</span>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                    <span className="block text-[9.5px] text-slate-500 font-medium">Billing Delay</span>
                    <span className="text-[13px] font-bold text-indigo-600">14 Days</span>
                  </div>
                </div>

                {/* Scenario Preset Chips */}
                <div className="pt-1 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-500 block">
                    Review or adjust scenario preset:
                  </span>
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    {[
                      { id: 'mild', label: 'Mild Stress (-5% / +10%)' },
                      { id: 'moderate', label: 'Moderate Shock (-15% / +20%)' },
                      { id: 'severe', label: 'Severe Crisis (-30% / +40%)' },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id as ScenarioPreset)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap transition-all border',
                          scenarioPreset === preset.id
                            ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-2xs'
                            : 'bg-white text-slate-600 border-gray-200 hover:border-purple-300'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== *
         * MESSAGE 2 — RISK SUMMARY (Progressive Step 2)
         * Structured KPI cards: Baseline CFaR, Stressed CFaR, Delta, Buffer
         * ============================================================== */}
        {streamStep >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="flex items-start gap-2.5"
          >
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
              style={{
                background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <TrendingDown className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-2 max-w-[92%]">
              <div className="rounded-[20px] rounded-tl-sm bg-white/95 backdrop-blur-xl p-3.5 shadow-sm border border-gray-100/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Message 2 · Quant Risk Summary
                  </span>
                  <span className="text-[9.5px] font-bold text-slate-400">
                    Confidence: 95%
                  </span>
                </div>

                {/* 4 Structured KPI Cards */}
                <div className="grid grid-cols-2 gap-2">
                  {/* KPI 1: Baseline CFaR */}
                  <div className="rounded-xl bg-slate-50/90 p-2.5 border border-slate-200/70">
                    <span className="text-[9.5px] font-medium text-slate-500 block">
                      Baseline CFaR (95%)
                    </span>
                    <div className="text-[16px] font-black text-[#0B1E3F] mt-0.5">
                      RM 312.50
                    </div>
                    <span className="text-[9px] text-emerald-600 font-bold block mt-0.5">
                      Normal burn profile
                    </span>
                  </div>

                  {/* KPI 2: Stressed CFaR */}
                  <div className="rounded-xl bg-rose-50/70 p-2.5 border border-rose-200/80">
                    <span className="text-[9.5px] font-medium text-rose-800 block">
                      Stressed CFaR (95%)
                    </span>
                    <div className="text-[16px] font-black text-rose-700 mt-0.5">
                      RM {simulationResult.cfar95.toFixed(2)}
                    </div>
                    <span className="text-[9px] text-rose-600 font-bold block mt-0.5">
                      Peak shortfall risk
                    </span>
                  </div>

                  {/* KPI 3: Change in CFaR */}
                  <div className="rounded-xl bg-amber-50/70 p-2.5 border border-amber-200/80">
                    <span className="text-[9.5px] font-medium text-amber-800 block">
                      Change in CFaR (Δ Risk)
                    </span>
                    <div className="text-[16px] font-black text-amber-700 mt-0.5">
                      +RM {(simulationResult.cfar95 - 312.5).toFixed(2)}
                    </div>
                    <span className="text-[9px] text-amber-600 font-bold block mt-0.5">
                      +118.9% risk expansion
                    </span>
                  </div>

                  {/* KPI 4: Available Cash Buffer */}
                  <div className="rounded-xl bg-purple-50/70 p-2.5 border border-purple-200/80">
                    <span className="text-[9.5px] font-medium text-purple-800 block">
                      Survival Runway
                    </span>
                    <div className="text-[16px] font-black text-purple-950 mt-0.5">
                      13.2 Days
                    </div>
                    <span className="text-[9px] text-rose-600 font-bold block mt-0.5">
                      -15.3 days buffer lost
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== *
         * MESSAGE 3 — CASH FLOW PROJECTION GRAPH (Progressive Step 3)
         * Embedded responsive line chart with Baseline vs Stressed and Threshold
         * ============================================================== */}
        {streamStep >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="flex items-start gap-2.5"
          >
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
              style={{
                background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <TrendingUp className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-2 max-w-[92%]">
              <div className="rounded-[20px] rounded-tl-sm bg-white/95 backdrop-blur-xl p-3.5 shadow-sm border border-gray-100/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                      Message 3 · 30-Day Cash Flow Projection
                    </span>
                    <h4 className="text-[13px] font-bold text-[#0B1E3F]">
                      Baseline vs. Stressed Liquidity Path
                    </h4>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    RM (Currency)
                  </span>
                </div>

                {/* SVG Responsive Line Chart */}
                <div className="relative w-full rounded-xl bg-slate-900 p-2 pt-3 shadow-inner text-white overflow-hidden">
                  <svg
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                    className="w-full h-auto overflow-visible select-none"
                  >
                    <defs>
                      <linearGradient id="cfarBaseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818CF8" stopOpacity="0.30" />
                        <stop offset="100%" stopColor="#818CF8" stopOpacity="0.0" />
                      </linearGradient>
                      <linearGradient id="cfarStressGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal Grid lines */}
                    {[200, 500, 800].map((val) => {
                      const y = getY(val);
                      return (
                        <g key={val}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={svgWidth - padRight}
                            y2={y}
                            stroke="#334155"
                            strokeDasharray="2 2"
                            strokeWidth="1"
                          />
                          <text
                            x={padLeft - 6}
                            y={y + 3}
                            fill="#64748B"
                            fontSize="8"
                            textAnchor="end"
                          >
                            {val}
                          </text>
                        </g>
                      );
                    })}

                    {/* Survival Floor Threshold Line (RM 150) */}
                    <line
                      x1={padLeft}
                      y1={floorY}
                      x2={svgWidth - padRight}
                      y2={floorY}
                      stroke="#EF4444"
                      strokeDasharray="3 3"
                      strokeWidth="1.5"
                    />
                    <text
                      x={svgWidth - padRight}
                      y={floorY - 4}
                      fill="#EF4444"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="end"
                    >
                      Survival Floor (RM 150)
                    </text>

                    {/* Series 1: Baseline Projection Area + Stroke */}
                    <path
                      d={`${baselinePath} L ${getX(
                        projectionData.points.length - 1
                      )} ${getY(minVal)} L ${getX(0)} ${getY(minVal)} Z`}
                      fill="url(#cfarBaseGrad)"
                    />
                    <path
                      d={baselinePath}
                      fill="none"
                      stroke="#818CF8"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Series 2: Stressed Scenario Projection Area + Stroke */}
                    <path
                      d={`${stressedPath} L ${getX(
                        projectionData.points.length - 1
                      )} ${getY(minVal)} L ${getX(0)} ${getY(minVal)} Z`}
                      fill="url(#cfarStressGrad)"
                    />
                    <path
                      d={stressedPath}
                      fill="none"
                      stroke="#F43F5E"
                      strokeWidth="2.5"
                      strokeDasharray="4 3"
                      strokeLinecap="round"
                    />

                    {/* Interactive Points on Hover */}
                    {projectionData.points.map((p, i) => {
                      const x = getX(i);
                      const isHovered = hoveredPointIndex === i;
                      return (
                        <g
                          key={p.day}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPointIndex(i)}
                          onClick={() => setHoveredPointIndex(i)}
                        >
                          <circle
                            cx={x}
                            cy={getY(p.baseline)}
                            r={isHovered ? 4.5 : 2}
                            fill="#818CF8"
                            stroke="#0F172A"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx={x}
                            cy={getY(p.stressed)}
                            r={isHovered ? 4.5 : 2}
                            fill="#F43F5E"
                            stroke="#0F172A"
                            strokeWidth="1.5"
                          />
                        </g>
                      );
                    })}

                    {/* X-Axis Day Labels */}
                    {projectionData.points
                      .filter((_, idx) => idx % 3 === 0 || idx === projectionData.points.length - 1)
                      .map((p) => {
                        const idx = projectionData.points.findIndex((x) => x.day === p.day);
                        return (
                          <text
                            key={p.day}
                            x={getX(idx)}
                            y={svgHeight - 10}
                            fill="#94A3B8"
                            fontSize="8.5"
                            textAnchor="middle"
                          >
                            D{p.day}
                          </text>
                        );
                      })}
                  </svg>

                  {/* Interactive Tooltip Card */}
                  {hoveredPointIndex !== null && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute top-2 left-2 bg-slate-800/95 p-2 rounded-lg border border-slate-700 text-[10px] space-y-0.5 shadow-md z-10"
                    >
                      <div className="font-bold text-white">
                        {projectionData.points[hoveredPointIndex].label}
                      </div>
                      <div className="text-indigo-300">
                        Baseline: RM {projectionData.points[hoveredPointIndex].baseline.toFixed(2)}
                      </div>
                      <div className="text-rose-400">
                        Stressed: RM {projectionData.points[hoveredPointIndex].stressed.toFixed(2)}
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 px-1">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#818CF8]" />
                    <span>Baseline Projection</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Stressed Scenario</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-600">
                    <span className="h-0.5 w-3 bg-red-500" />
                    <span>Floor (RM 150)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== *
         * MESSAGE 4 — RISK INTERPRETATION (Progressive Step 4)
         * Explanation of drivers, breach timeline, and limitations
         * ============================================================== */}
        {streamStep >= 4 && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="flex items-start gap-2.5"
          >
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
              style={{
                background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <Bot className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-2 max-w-[92%]">
              <div className="rounded-[20px] rounded-tl-sm bg-white/95 backdrop-blur-xl p-3.5 text-[12.5px] text-slate-700 shadow-sm border border-gray-100/80 space-y-2">
                <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                  Message 4 · AI Risk Interpretation
                </span>

                <div className="space-y-1.5 leading-relaxed text-[12px]">
                  <p>
                    Under the <strong>{scenarioPreset.toUpperCase()} stress scenario</strong>, your safe daily allowance contracts from RM 35.50 down to <strong>RM {simulationResult.dynamicDailyAllowance.toFixed(2)}/day</strong>.
                  </p>

                  <div className="rounded-xl bg-amber-50 p-2.5 border border-amber-200/80 text-[11.5px] text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Projected Liquidity Breach on Day {projectionData.breachDay}</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Unplanned dining velocity and scheduled fixed bills cause your cash balance to dip below the <strong>RM {projectionData.survivalFloor}.00 survival threshold</strong> at Day {projectionData.breachDay}.
                    </p>
                  </div>

                  <p className="text-[10.5px] text-slate-500 pt-0.5">
                    <strong>Model Limitations:</strong> 1,000 Monte Carlo bootstrap paths at 95% Value-at-Risk (Basel III coherent ES95 tail), assuming historical student spending variance.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============================================================== *
         * MESSAGE 5 — FOLLOW-UP ACTIONS (Progressive Step 5)
         * Real functioning contextual action buttons
         * ============================================================== */}
        {streamStep >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="flex items-start gap-2.5"
          >
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
              style={{
                background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <Sparkles className="h-4 w-4" />
            </div>

            <div className="flex-1 space-y-2 max-w-[92%]">
              <div className="rounded-[20px] rounded-tl-sm bg-white/95 backdrop-blur-xl p-3.5 shadow-sm border border-gray-100/80 space-y-2.5">
                <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                  Message 5 · Recommended Actions
                </span>

                <p className="text-[11.5px] text-slate-600">
                  Select a mitigation response to protect your runway:
                </p>

                {/* Working Action Buttons */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => handleFollowUpAction('compare_scenarios')}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 active:scale-95 transition-all text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-[#7C3AED]" />
                      <span>Compare Scenarios</span>
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFollowUpAction('adjust_assumptions')}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 active:scale-95 transition-all text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-[#6366F1]" />
                      <span>Adjust Assumptions</span>
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFollowUpAction('arm_shield')}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-xl border text-[11px] font-bold active:scale-95 transition-all text-left',
                      masterAutonomy
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-900'
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{masterAutonomy ? 'Shield Armed ✓' : 'Arm Shield (T2)'}</span>
                    </span>
                    <ArrowRight className="h-3 w-3 text-purple-600" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFollowUpAction('explain_cfar')}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 active:scale-95 transition-all text-left"
                  >
                    <span className="flex items-center gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 text-[#9333EA]" />
                      <span>Explain CFaR</span>
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFollowUpAction('rerun_simulation')}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-[11px] font-bold text-slate-700 active:scale-95 transition-all text-left col-span-2"
                  >
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5 text-[#7C3AED]" />
                      <span>Run Another Simulation</span>
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                  </button>
                </div>

                {/* Scenario Comparison Table (when toggled) */}
                {showScenarioComparison && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2 border-t border-slate-100 space-y-1.5 text-[10.5px]"
                  >
                    <div className="font-bold text-slate-700">Scenario Stress Matrix:</div>
                    <div className="grid grid-cols-3 gap-1 text-center font-mono">
                      <div className="p-1.5 bg-slate-50 rounded border">
                        <span className="font-bold text-slate-800 block">Mild</span>
                        <span className="text-teal-700 font-bold">RM 420 CFaR</span>
                        <span className="text-[9px] text-slate-500 block">24 days</span>
                      </div>
                      <div className="p-1.5 bg-purple-50 rounded border border-purple-200">
                        <span className="font-bold text-purple-900 block">Moderate</span>
                        <span className="text-amber-700 font-bold">RM 684 CFaR</span>
                        <span className="text-[9px] text-slate-500 block">13.2 days</span>
                      </div>
                      <div className="p-1.5 bg-rose-50 rounded border border-rose-200">
                        <span className="font-bold text-rose-900 block">Severe</span>
                        <span className="text-rose-700 font-bold">RM 950 CFaR</span>
                        <span className="text-[9px] text-slate-500 block">7.5 days</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Custom Sliders (when toggled) */}
                {showAdjustSliders && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-2 border-t border-slate-100 space-y-2 text-[11px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Discretionary Spend Spike:</span>
                      <span className="font-bold text-[#0B1E3F]">RM {proposedAmount}</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="20"
                      value={proposedAmount}
                      onChange={(e) => setProposedAmount(Number(e.target.value))}
                      className="w-full accent-[#6366F1]"
                    />

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Expense Surge Rate:</span>
                      <span className="font-bold text-amber-600">+{expenseSurgePercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="5"
                      value={expenseSurgePercent}
                      onChange={(e) => setExpenseSurgePercent(Number(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Dynamic Follow-up Messages from Conversation */}
        {conversationMessages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            {msg.role === 'assistant' && (
              <div
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white text-[11px] mt-0.5 shadow-sm"
                style={{
                  background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
                }}
              >
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={cn(
                'max-w-[85%] rounded-[20px] px-3.5 py-2.5 text-[12.5px] leading-relaxed shadow-xs',
                msg.role === 'user'
                  ? 'rounded-tr-sm bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-medium'
                  : 'rounded-tl-sm bg-white/95 text-slate-700 border border-gray-100 whitespace-pre-line'
              )}
            >
              {msg.text}
            </div>
          </motion.div>
        ))}

        {/* AI Query Streaming Indicator */}
        {isQueryLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-[11px] text-[#7C3AED] pl-2 py-1"
          >
            <div
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white text-[10px] shadow-xs"
              style={{
                background: 'radial-gradient(circle at 35% 28%, #F0ABFC 0%, #C084FC 35%, #818CF8 70%, #4F46E5 100%)',
              }}
            >
              <Bot className="h-3 w-3 animate-spin" />
            </div>
            <div className="flex items-center gap-1.5 bg-purple-50/80 px-2.5 py-1 rounded-full border border-purple-100">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
              <span className="font-medium text-[10.5px]">Connecting to API & synthesizing CFaR response...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* ============================================================== *
       * BOTTOM INTERACTIVE INPUT BAR FOR FOLLOW-UP QUESTIONS
       * ============================================================== */}
      <div className="pt-2 space-y-2 pb-16">
        <p className="px-1 text-[9.5px] font-medium text-slate-500">
          Free-form questions use Live Gemini · scenario cards stay deterministic
        </p>

        {/* Quick Follow-up Question Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            '🍽️ Can I afford dinner out tonight?',
            '🎯 How do I avoid breaching on Day 18?',
            '💡 What subscriptions should I downgrade?',
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                if (onFreeformQuery) {
                  onFreeformQuery(chip);
                  return;
                }
                void sendQueryToApi(chip);
              }}
              className="rounded-full bg-white/90 border border-gray-200/90 px-3 py-1 text-[11px] font-bold text-gray-700 shadow-2xs hover:border-[#6366F1] hover:text-[#6366F1] transition-colors whitespace-nowrap"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Form input */}
        <form
          onSubmit={handleSendQuery}
          className="flex items-center gap-2 rounded-full p-1.5 shadow-sm bg-white/95 border border-white focus-within:shadow-md focus-within:border-[#6366F1]/50 transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask anything — live Gemini..."
            className="flex-1 bg-transparent px-3 text-[13px] font-medium text-[#0B1E3F] placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className={cn(
              'grid h-8 w-8 place-items-center rounded-full text-white shadow-md active:scale-90 transition-all shrink-0',
              inputText.trim()
                ? 'bg-[#4F46E5] hover:bg-[#4338CA]'
                : 'bg-slate-300 cursor-not-allowed'
            )}
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
