'use client';

import { useCallback } from 'react';
import {
  CURRENCY_PPP_REGISTRY,
  formatDisplayCurrency,
  localizeMYRText,
  type CurrencyCode,
} from './currency-ppp';
import { useCtrlPayStore } from './store';

export interface DisplayCurrencyApi {
  currency: CurrencyCode;
  profile: (typeof CURRENCY_PPP_REGISTRY)[CurrencyCode];
  /** Format a MYR ledger amount for the currently selected display currency. */
  format: (
    amountMYR: number,
    options?: { showBaseAnchor?: boolean; decimals?: number },
  ) => string;
  /** Convert any "RM 12.34" fragments in display copy (never audit/engine text). */
  localize: (text: string) => string;
}

/**
 * Single render-layer entry point for display currency.
 *
 * The store, ledger and engine stay in MYR; this hook only maps numbers/strings
 * to the selected display currency at render time.
 */
export function useDisplayCurrency(): DisplayCurrencyApi {
  const currency = useCtrlPayStore((s) => s.displayCurrency);

  const format = useCallback(
    (amountMYR: number, options?: { showBaseAnchor?: boolean; decimals?: number }) =>
      formatDisplayCurrency(amountMYR, currency, options),
    [currency],
  );

  const localize = useCallback(
    (text: string) => localizeMYRText(text, currency),
    [currency],
  );

  return {
    currency,
    profile: CURRENCY_PPP_REGISTRY[currency],
    format,
    localize,
  };
}
