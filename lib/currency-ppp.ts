/**
 * Multi-currency & purchasing-power-parity (PPP) DISPLAY-LAYER module.
 *
 * Architectural invariant (Single Base Ledger):
 *   The ledger, Zustand store, subscription registry and the server-side
 *   quant engine always operate in MYR (RM). Currency switching NEVER mutates
 *   underlying state values — it only maps MYR amounts to a display string at
 *   render time. This keeps the Post-LLM numeric-provenance guard and the
 *   HMAC-SHA256 integrity hash of every signed proposal valid.
 */

export type CurrencyCode = 'MYR' | 'CNY' | 'HKD' | 'SGD' | 'USD';

export interface CurrencyPPPProfile {
  code: CurrencyCode;
  symbol: string;
  flag: string;
  regionLabel: string;
  fxRateFromMYR: number;
  localCanteenMealCost: number;
  localSurvivalFloorDisplay: number;
  universityExample: string;
}

/** Display order used by the CurrencySwitcherPill. */
export const CURRENCY_CODES: CurrencyCode[] = ['MYR', 'CNY', 'HKD', 'SGD', 'USD'];

export const CURRENCY_PPP_REGISTRY: Record<CurrencyCode, CurrencyPPPProfile> = {
  MYR: {
    code: 'MYR',
    symbol: 'RM',
    flag: '🇲🇾',
    regionLabel: 'Malaysia (ASEAN)',
    fxRateFromMYR: 1.0,
    localCanteenMealCost: 9.0,
    localSurvivalFloorDisplay: 15.0,
    universityExample: 'USM / UPM (.edu.my)',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    flag: '🇨🇳',
    regionLabel: 'Shenzhen / Mainland (GBA)',
    fxRateFromMYR: 1.65,
    localCanteenMealCost: 15.0,
    localSurvivalFloorDisplay: 25.0,
    universityExample: 'Tsinghua SIGS / SZU (.edu.cn)',
  },
  HKD: {
    code: 'HKD',
    symbol: 'HK$',
    flag: '🇭🇰',
    regionLabel: 'Hong Kong (GBA)',
    fxRateFromMYR: 1.80,
    localCanteenMealCost: 40.0,
    localSurvivalFloorDisplay: 65.0,
    universityExample: 'HKU / HKUST (.edu.hk)',
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    flag: '🇸🇬',
    regionLabel: 'Singapore (ASEAN)',
    fxRateFromMYR: 0.30,
    localCanteenMealCost: 5.0,
    localSurvivalFloorDisplay: 8.0,
    universityExample: 'NUS / NTU (.edu.sg)',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    flag: '🌐',
    regionLabel: 'Global (USD)',
    fxRateFromMYR: 0.23,
    localCanteenMealCost: 10.0,
    localSurvivalFloorDisplay: 16.0,
    universityExample: 'Global University (.edu)',
  },
};

/**
 * Convert a MYR base-ledger amount into the selected display currency.
 * Pure function — never mutates state and never rounds the stored value.
 */
export function formatDisplayCurrency(
  amountInMYR: number,
  currency: CurrencyCode = 'MYR',
  options?: { showBaseAnchor?: boolean; decimals?: number }
): string {
  const profile = CURRENCY_PPP_REGISTRY[currency] || CURRENCY_PPP_REGISTRY.MYR;
  const decimals = options?.decimals ?? 2;
  const converted = amountInMYR * profile.fxRateFromMYR;
  const formatted = `${profile.symbol} ${converted.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

  if (currency !== 'MYR' && options?.showBaseAnchor) {
    return `${formatted} (Base: RM ${amountInMYR.toFixed(2)})`;
  }
  return formatted;
}

/**
 * Purchasing-power equivalent in campus canteen meals.
 * Baseline: 1 Malaysian university canteen meal ≈ RM 9.00.
 * The meal count is anchored to the MYR ledger, while the per-meal price
 * shown in the caption is localized for the selected region.
 */
export function formatCanteenMealsEquivalent(
  amountInMYR: number,
  currency: CurrencyCode = 'MYR'
): string {
  const profile = CURRENCY_PPP_REGISTRY[currency] || CURRENCY_PPP_REGISTRY.MYR;
  const meals = Math.max(1, Math.round(amountInMYR / 9.0));
  return `≈ ${meals.toLocaleString('en-US')} campus canteen meals · ${profile.regionLabel} avg ${profile.symbol} ${profile.localCanteenMealCost.toFixed(2)}/meal`;
}
