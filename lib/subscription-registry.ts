import { z } from 'zod';

export const SubscriptionIdSchema = z.enum([
  'spotify_my',
  'youtube_my',
  'netflix_my',
  'icloud_my',
  'disney_plus_my',
  'anytime_fitness_my',
]);
export type SubscriptionId = z.infer<typeof SubscriptionIdSchema>;

export interface RegistryEntry {
  merchantName: string;
  fullPriceRM: number; // DEMO_CONFIG sandbox price
  studentPriceRM: number | null; // null = no student plan
  requiresStudentEmailOTP: boolean;
  officialCancelDeepLink: string | null; // HTTPS only; null for manual contracts
  mailtoTemplate: {
    to: string;
    subject: string;
    body: string; // contains {{MEMBER_ID}} and {{FULL_NAME}} placeholders
  } | null;
}

/**
 * Hardcoded, team-maintained subscription whitelist.
 *
 * CRITICAL SECURITY INVARIANT: the LLM may only ever reference a subscription by
 * the `subscriptionId` enum. It can never supply a URL. All deep links live here.
 *
 * Prices and URLs are sandbox/demo values maintained by the team.
 */
export const SUBSCRIPTION_REGISTRY: Readonly<Record<SubscriptionId, RegistryEntry>> = Object.freeze({
  // last verified: 2026-03-01
  spotify_my: {
    merchantName: 'Spotify',
    fullPriceRM: 15.9,
    studentPriceRM: 8.5, // DEMO_CONFIG: verify against the merchant page before any production use
    requiresStudentEmailOTP: true,
    officialCancelDeepLink: 'https://www.spotify.com/my-en/account/subscription/',
    mailtoTemplate: null,
  },
  // last verified: 2026-03-01
  youtube_my: {
    merchantName: 'YouTube Premium',
    fullPriceRM: 17.9,
    studentPriceRM: 8.9, // DEMO_CONFIG
    requiresStudentEmailOTP: true,
    officialCancelDeepLink: 'https://www.youtube.com/paid_memberships',
    mailtoTemplate: null,
  },
  // last verified: 2026-03-01
  netflix_my: {
    merchantName: 'Netflix',
    fullPriceRM: 55, // matches the timeline demo event (-RM 55 on the 15th)
    studentPriceRM: null, // no student plan: cancel/downgrade-tier only
    requiresStudentEmailOTP: false,
    officialCancelDeepLink: 'https://www.netflix.com/cancelplan',
    mailtoTemplate: null,
  },
  // last verified: 2026-03-01
  icloud_my: {
    merchantName: 'iCloud+',
    fullPriceRM: 4.9, // DEMO_CONFIG
    studentPriceRM: null,
    requiresStudentEmailOTP: false,
    officialCancelDeepLink: 'https://support.apple.com/en-my/118428',
    mailtoTemplate: null,
  },
  // last verified: 2026-03-01
  disney_plus_my: {
    merchantName: 'Disney+',
    fullPriceRM: 54.9, // DEMO_CONFIG
    studentPriceRM: null,
    requiresStudentEmailOTP: false,
    officialCancelDeepLink: 'https://www.disneyplus.com/account',
    mailtoTemplate: null,
  },
  // last verified: 2026-03-01
  anytime_fitness_my: {
    merchantName: 'Anytime Fitness',
    fullPriceRM: 180, // DEMO_CONFIG
    studentPriceRM: null,
    requiresStudentEmailOTP: false,
    officialCancelDeepLink: null, // manual contract: email only
    mailtoTemplate: {
      to: 'membership@anytimefitness.example', // placeholder address in sandbox; replace with the verified club address
      subject: 'Request to Terminate Membership: Member ID {{MEMBER_ID}}',
      body:
        'Dear Membership Team,\n\n' +
        'I am writing to formally request the termination of my membership (Member ID: {{MEMBER_ID}}, Name: {{FULL_NAME}}), ' +
        'effective at the end of my current billing period, in accordance with the terms of my agreement.\n\n' +
        'Kindly confirm in writing the effective termination date, any outstanding balance, and that no further charges will be made ' +
        'after that date.\n\nThank you for your assistance.\n\nYours sincerely,\n{{FULL_NAME}}',
    },
  },
});

export const ALL_SUBSCRIPTION_IDS: readonly SubscriptionId[] = Object.freeze(
  SubscriptionIdSchema.options,
);

/**
 * Reserved example domains (RFC 2606) identify DEMONSTRATION placeholder
 * addresses, not real merchant mailboxes. The UI must label these explicitly so
 * no judge or user mistakes a sandbox address for a production support channel.
 */
export function isDemoPlaceholderAddress(address: string): boolean {
  return /\.example$/i.test(address.trim());
}
