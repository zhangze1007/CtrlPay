import { describe, expect, it } from 'vitest';
import {
  SUBSCRIPTION_REGISTRY,
  ALL_SUBSCRIPTION_IDS,
  isDemoPlaceholderAddress,
} from '@/lib/subscription-registry';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

describe('SUBSCRIPTION_REGISTRY', () => {
  it('covers every subscription id in the enum', () => {
    expect(Object.keys(SUBSCRIPTION_REGISTRY).sort()).toEqual([...ALL_SUBSCRIPTION_IDS].sort());
  });

  it('every officialCancelDeepLink is an HTTPS URL', () => {
    for (const id of ALL_SUBSCRIPTION_IDS) {
      const link = SUBSCRIPTION_REGISTRY[id].officialCancelDeepLink;
      if (link === null) continue;
      expect(link.startsWith('https://'), `${id} deep link must be https`).toBe(true);
      expect(() => new URL(link)).not.toThrow();
    }
  });

  it('every mailto recipient looks like a valid email address', () => {
    for (const id of ALL_SUBSCRIPTION_IDS) {
      const tpl = SUBSCRIPTION_REGISTRY[id].mailtoTemplate;
      if (tpl === null) continue;
      expect(EMAIL_RE.test(tpl.to), `${id} mailto recipient must be a valid email`).toBe(true);
    }
  });

  it('marks reserved .example recipients as demo placeholders (never a real mailbox)', () => {
    const tpl = SUBSCRIPTION_REGISTRY.anytime_fitness_my.mailtoTemplate;
    expect(tpl).not.toBeNull();
    expect(isDemoPlaceholderAddress(tpl!.to)).toBe(true);
    expect(isDemoPlaceholderAddress('support@spotify.com')).toBe(false);
  });

  it('every entry is either deep-linkable or has a mailto template', () => {
    for (const id of ALL_SUBSCRIPTION_IDS) {
      const e = SUBSCRIPTION_REGISTRY[id];
      expect(
        e.officialCancelDeepLink !== null || e.mailtoTemplate !== null,
        `${id} must expose at least one safe navigator path`,
      ).toBe(true);
    }
  });

  it('prices are demo-config positive numbers and student price never exceeds full price', () => {
    for (const id of ALL_SUBSCRIPTION_IDS) {
      const e = SUBSCRIPTION_REGISTRY[id];
      expect(e.fullPriceRM).toBeGreaterThan(0);
      if (e.studentPriceRM !== null) {
        expect(e.studentPriceRM).toBeLessThanOrEqual(e.fullPriceRM);
      }
    }
  });

  it('manual-contract merchants (no deep link) require a mailto template', () => {
    for (const id of ALL_SUBSCRIPTION_IDS) {
      const e = SUBSCRIPTION_REGISTRY[id];
      if (e.officialCancelDeepLink === null) {
        expect(e.mailtoTemplate, `${id} has no deep link so it needs a mailto template`).not.toBeNull();
      }
    }
  });

  it('is frozen (read-only registry the LLM cannot mutate)', () => {
    expect(Object.isFrozen(SUBSCRIPTION_REGISTRY)).toBe(true);
  });
});
