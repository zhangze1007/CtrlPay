'use client';

/**
 * Backwards-compatible export.
 *
 * The original student-downgrade drawer has been upgraded into the full
 * two-channel cancellation sheet (whitelisted deep link + in-app email preview +
 * two-stage PendingSweep). Keeping this alias means every existing import site
 * keeps working while the feature set grows.
 */
export { SubscriptionCancelEmailSheet as StudentDowngradeDrawer } from './subscription-cancel-email-sheet';
