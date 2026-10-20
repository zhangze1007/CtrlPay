import { beforeEach, describe, expect, it } from 'vitest';
import {
  CURRENCY_CODES,
  CURRENCY_PPP_REGISTRY,
  formatActivityAmount,
  formatCanteenMealsEquivalent,
  formatDisplayCurrency,
  localizeMYRText,
} from '@/lib/currency-ppp';
import { useCtrlPayStore } from '@/lib/store';

describe('currency / PPP display layer', () => {
  it('formats MYR as the base display with grouping', () => {
    expect(formatDisplayCurrency(100, 'MYR')).toBe('RM 100.00');
    expect(formatDisplayCurrency(56750, 'MYR')).toBe('RM 56,750.00');
  });

  it('converts with the registry FX rates (display only)', () => {
    expect(formatDisplayCurrency(100, 'CNY')).toBe('¥ 165.00');
    expect(formatDisplayCurrency(100, 'HKD')).toBe('HK$ 180.00');
    expect(formatDisplayCurrency(100, 'SGD')).toBe('S$ 30.00');
    expect(formatDisplayCurrency(100, 'USD')).toBe('$ 23.00');
  });

  it('optionally anchors the converted value back to the MYR base', () => {
    expect(formatDisplayCurrency(100, 'USD', { showBaseAnchor: true })).toBe('$ 23.00 (Base: RM 100.00)');
    expect(formatDisplayCurrency(100, 'MYR', { showBaseAnchor: true })).toBe('RM 100.00');
  });

  it('formats signed transaction rows from raw MYR in the selected display currency', () => {
    expect(formatActivityAmount(30, 'MYR', 'out')).toBe('- RM 30.00 -');
    expect(formatActivityAmount(30, 'HKD', 'out')).toBe('- HK$ 54.00 -');
    expect(formatActivityAmount(77.77, 'USD', 'in')).toBe('+ $ 17.89 +');
  });

  it('localizes RM fragments in presentation copy only', () => {
    expect(localizeMYRText('Saving RM 7.40 every month (RM 88.80/year)', 'HKD')).toBe(
      'Saving HK$ 13.32 every month (HK$ 159.84/year)',
    );
    expect(localizeMYRText('+RM 1,286 - Today', 'HKD')).toBe('+HK$ 2,314.80 - Today');
    expect(localizeMYRText('Saving RM 7.40 every month', 'MYR')).toBe(
      'Saving RM 7.40 every month',
    );
  });

  it('expresses purchasing power in campus canteen meals (baseline RM 9.00)', () => {
    expect(formatCanteenMealsEquivalent(90, 'MYR')).toContain('10 campus canteen meals');
    expect(formatCanteenMealsEquivalent(0, 'MYR')).toContain('1 campus canteen meals'); // clamped, never 0
    expect(formatCanteenMealsEquivalent(90, 'CNY')).toContain('Shenzhen');
  });

  it('keeps every registry entry consistent', () => {
    expect(CURRENCY_CODES).toHaveLength(5);
    for (const code of CURRENCY_CODES) {
      const p = CURRENCY_PPP_REGISTRY[code];
      expect(p.code).toBe(code);
      expect(p.fxRateFromMYR).toBeGreaterThan(0);
      expect(p.localCanteenMealCost).toBeGreaterThan(0);
      expect(p.localSurvivalFloorDisplay).toBeGreaterThan(0);
    }
  });

  it('switching display currency NEVER mutates the MYR ledger (single-base invariant)', () => {
    useCtrlPayStore.setState({
      currentBalance: 56750,
      defenseVault: 0,
      rewardPool: 24,
      displayCurrency: 'MYR',
    });
    const before = useCtrlPayStore.getState();

    useCtrlPayStore.getState().setDisplayCurrency('USD');
    const after = useCtrlPayStore.getState();

    expect(after.displayCurrency).toBe('USD');
    expect(after.currentBalance).toBe(before.currentBalance);
    expect(after.defenseVault).toBe(before.defenseVault);
    expect(after.rewardPool).toBe(before.rewardPool);
    expect(after.masterAutonomyEnabled).toBe(before.masterAutonomyEnabled);

    useCtrlPayStore.getState().setDisplayCurrency('MYR');
  });
});
