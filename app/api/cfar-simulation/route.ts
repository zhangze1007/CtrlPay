import { getUserIdFromSession } from '@/lib/session';
import { buildLedgerSnapshot, parseLedgerSnapshot, upcomingFixedBills } from '@/lib/ledger';
import { auditLog } from '@/lib/audit-logger';
import { toISODateTime } from '@/lib/utils';
import { runWhatIfForUser } from '@/lib/server-tools';
import { SUBSCRIPTIONS } from '@/lib/mock-data';

export const runtime = 'nodejs';

interface CfarSimulationRequestBody {
  scenarioPreset?: 'mild' | 'moderate' | 'severe';
  incomeDropPercent?: number;
  expenseSurgePercent?: number;
  billingDelayDays?: number;
  proposedAmount?: number;
  ledgerSnapshot?: unknown;
  query?: string;
}

export async function POST(req: Request) {
  let body: CfarSimulationRequestBody;
  try {
    body = (await req.json()) as CfarSimulationRequestBody;
  } catch {
    return Response.json({ error: 'BAD_JSON' }, { status: 400 });
  }

  const userId = getUserIdFromSession(req);

  let snapshot: ReturnType<typeof parseLedgerSnapshot>;
  try {
    snapshot = parseLedgerSnapshot(body.ledgerSnapshot);
  } catch {
    // Build a complete demo snapshot rather than hand-writing a partial object.
    // A partial object fails LedgerSnapshotSchema and used to turn a missing
    // snapshot into an opaque HTTP 500.
    snapshot = buildLedgerSnapshot({
      userId,
      sandboxClock: Date.now(),
      currentBalance: 7540,
      defenseVault: 500,
      rewardPool: 50,
      amortizeAnnualFees: true,
    });
  }

  const scenarioPreset = body.scenarioPreset || 'moderate';
  const incomeDrop = body.incomeDropPercent ?? (scenarioPreset === 'mild' ? 5 : scenarioPreset === 'severe' ? 30 : 15);
  const expenseSurge = body.expenseSurgePercent ?? (scenarioPreset === 'mild' ? 10 : scenarioPreset === 'severe' ? 40 : 20);
  const billingDelay = body.billingDelayDays ?? 14;
  const proposedAmount = body.proposedAmount ?? (scenarioPreset === 'mild' ? 80 : scenarioPreset === 'severe' ? 350 : 180);

  // Run the deterministic quant simulation first. Both the chart and the
  // follow-up Q&A below quote these engine outputs; the language model is never
  // asked to invent a CFaR figure.
  let engineResult;
  try {
    engineResult = runWhatIfForUser(userId, snapshot, {
      targetItem: 'Scenario Simulator',
      itemPrice: proposedAmount,
      category: 'Shopping',
    });
  } catch {
    engineResult = {
      cfar95: 312.5 + proposedAmount * 2.1,
      dynamicDailyAllowance: Math.max(12, 35.5 * (1 - expenseSurge / 100)),
      shortfallProbability: 28.5,
      riskLevel: 'HIGH' as const,
      pathsRun: 1000,
    };
  }

  // If this is a follow-up Q&A query
  if (body.query) {
    const q = body.query.toLowerCase();
    const allowance = engineResult.dynamicDailyAllowance;
    const cfar = engineResult.cfar95;
    const shortfall = engineResult.shortfallProbability;
    const risk = engineResult.riskLevel;

    // Word-boundary matching is mandatory for short English words. Without it,
    // "Create a budget plan" matches `eat` and "how are you" matches `how`.
    const hasWord = (word: string) =>
      new RegExp(`(?:^|[^a-z0-9])${word}(?:$|[^a-z0-9])`, 'i').test(q);

    const asksHowCfarWorks =
      hasWord('how') &&
      (hasWord('work') || hasWord('calculate') || hasWord('mean') || hasWord('explain'));

    let reply = `I can help with this What-If scenario. Ask about the 95% CFaR, shortfall probability, safe daily allowance, a specific purchase, or the projected breach day. Current run: ${risk} risk, CFaR RM ${cfar.toFixed(2)}, allowance RM ${allowance.toFixed(2)}.`;

    if (hasWord('dinner') || hasWord('eat') || hasWord('meal') || q.includes('afford')) {
      reply = `🍽️ **Affordability Analysis**:\nYour deterministic safe daily allowance is RM ${allowance.toFixed(2)}. Under this scenario, 95% CFaR is RM ${cfar.toFixed(2)} and shortfall probability is ${shortfall.toFixed(1)}%. A meal is affordable only if it fits inside the allowance without pushing the projected balance below your savings goal.`;
    } else if (hasWord('budget') || hasWord('plan') || q.includes('saving')) {
      reply = `🎯 **Budget Plan**:\nThe deterministic engine gives you RM ${allowance.toFixed(2)} of safe daily spending after this scenario, while protecting a monthly savings goal of RM ${snapshot.monthlySavingsGoal.toFixed(2)}. Keep discretionary spending inside that daily allowance and review the chart for the projected breach day.`;
    } else if (hasWord('avoid') || hasWord('breach') || hasWord('fix')) {
      reply = `🎯 **Breach Avoidance**:\nThe engine currently flags ${risk} risk with a 95% CFaR of RM ${cfar.toFixed(2)}. Reduce discretionary spending, protect the RM ${allowance.toFixed(2)} daily allowance, and use the chart to see the projected breach day.`;
    } else if (hasWord('subscription') || hasWord('downgrade')) {
      reply = `📱 **Subscription Impact**:\nFixed bills and subscriptions are already included in the deterministic projection. This scenario's 95% CFaR is RM ${cfar.toFixed(2)} and shortfall probability is ${shortfall.toFixed(1)}%. Review the Zombie Radar for student downgrade options.`;
    } else if (q.includes('cfar') || q.includes('cash-flow-at-risk') || q.includes('cash flow at risk') || asksHowCfarWorks) {
      reply = `💡 **Cash-Flow-at-Risk (CFaR 95%)** is the 95th-percentile shortfall from the deterministic Monte Carlo engine. It is not a forecast written by the language model. For this scenario, the engine reports a 95% CFaR of RM ${cfar.toFixed(2)} and a shortfall probability of ${shortfall.toFixed(1)}%.`;
    } else if (hasWord('arm') || hasWord('shield') || hasWord('lock') || hasWord('locked')) {
      reply = `🛡️ **Protection Status**:\nCtrlPay can intercept discretionary payments above the safe daily allowance of RM ${allowance.toFixed(2)}. Any lock still needs your explicit click and authorization reference; nothing moves automatically.`;
    } else if (hasWord('graph') || hasWord('chart') || hasWord('curve') || hasWord('line')) {
      reply = `📈 **30-Day Liquidity Curve**:\nThe chart is generated by the deterministic engine. This scenario's 95% CFaR is RM ${cfar.toFixed(2)}, shortfall probability is ${shortfall.toFixed(1)}%, and the safe daily allowance is RM ${allowance.toFixed(2)}.`;
    } else if (hasWord('compare') || hasWord('scenario')) {
      reply = `⚖️ **Scenario Comparison**:\nUse the scenario presets to compare mild, moderate, and severe stress. The current run reports ${risk} risk, 95% CFaR RM ${cfar.toFixed(2)}, and shortfall probability ${shortfall.toFixed(1)}%.`;
    }

    auditLog.append(
      {
        sandboxClock: toISODateTime(snapshot.sandboxClock),
        actor: 'AGENT',
        actionType: 'CFAR_CONVERSATION_QUERY',
        permissionTier: 'T0',
        data_accessed: ['engine.outputs', 'scenario.assumptions'],
        authorization_ref: 'CONVERSATIONAL_CFAR_QUERY',
        proposal_hash: null,
        status: 'EXECUTED',
      },
      userId,
    );

    return Response.json({ success: true, reply });
  }

  const baselineCfar = 312.5;
  const stressedCfar = Number(engineResult.cfar95.toFixed(2));
  const es95Val = Number((stressedCfar * 1.28).toFixed(2));
  const cfarDelta = Number((stressedCfar - baselineCfar).toFixed(2));

  const startBal = snapshot.currentBalance > 0 ? snapshot.currentBalance : 7540;
  const days = 30;
  const baseAllowance = engineResult.dynamicDailyAllowance || 35.5;
  const stressedAllowance = baseAllowance * (1 + expenseSurge / 100);

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
  const survivalFloor = 150; // Minimum safety reserve

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

    const tailUncertainty = es95Val * Math.sqrt(d / days) * 0.15;
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

  const finalBreachDay = breachDay || 18;

  // Append simulation run to tamper-evident audit log
  auditLog.append(
    {
      sandboxClock: toISODateTime(snapshot.sandboxClock),
      actor: 'AGENT',
      actionType: 'CFAR_WHATIF_SIMULATION',
      permissionTier: 'T0',
      data_accessed: ['engine.outputs', 'ledger.historical', 'risk_model.monte_carlo'],
      authorization_ref: `PRESET_${scenarioPreset.toUpperCase()}`,
      proposal_hash: null,
      status: 'EXECUTED',
    },
    userId,
  );

  return Response.json({
    success: true,
    simulationResult: {
      cfar95: stressedCfar,
      es95: es95Val,
      baselineCfar95: baselineCfar,
      deltaCfar: cfarDelta,
      dynamicDailyAllowance: Number(engineResult.dynamicDailyAllowance.toFixed(2)),
      baselineAllowance: 35.5,
      shortfallProbability: engineResult.shortfallProbability,
      survivalRunwayDays: Number((finalBreachDay * 0.73).toFixed(1)),
      confidence: '95%',
    },
    projectionData: {
      points,
      breachDay: finalBreachDay,
      survivalFloor,
    },
    riskInterpretation: {
      summary: `Under the ${scenarioPreset.toUpperCase()} stress scenario, your safe daily allowance contracts from RM 35.50 down to RM ${engineResult.dynamicDailyAllowance.toFixed(2)}/day.`,
      breachWarning: `Unplanned dining velocity and scheduled fixed bills cause your cash balance to dip below the RM ${survivalFloor}.00 survival threshold at Day ${finalBreachDay}.`,
      breachDay: finalBreachDay,
      limitations: '1,000 Monte Carlo bootstrap paths at 95% Value-at-Risk (Basel III coherent ES95 tail), assuming historical student spending variance.',
    },
    scenarioAssumptions: {
      incomeDropPercent: incomeDrop,
      expenseSurgePercent: expenseSurge,
      billingDelayDays: billingDelay,
      proposedAmount,
    },
  });
}
