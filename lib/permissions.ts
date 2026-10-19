/**
 * Permission tiers T0–T3 and the Master AI Autonomy Switch (plan.md Section 6.1).
 *
 * Enforcement points:
 *   - `assertTier(...)` runs inside the API route before every tool executes.
 *   - The card's Approve handler runs it again with the user's click authorization ref.
 *
 * Rules:
 *   T0 — read-only, always allowed (still logged).
 *   T1 — requires Master ON + T1 enabled; reversible, no money state.
 *   T2 — requires Master ON + T2 enabled; nothing executes.
 *   T3 — requires Master ON + an explicit per-action user click authorization ref.
 */
export type PermissionTier = 'T0' | 'T1' | 'T2' | 'T3';

export interface TierState {
  masterAutonomyEnabled: boolean;
  enabledTiers: Record<PermissionTier, boolean>;
}

export const TOOL_TIERS: Record<string, PermissionTier> = {
  run_what_if_simulation: 'T0',
  get_budget_insights: 'T0',
  analyze_zombies: 'T0',
  generate_roast: 'T0',
  flag_suspected_zombie: 'T1',
  draft_cancellation: 'T2',
  propose_quarantine: 'T3',
  propose_escrow: 'T3',
  propose_sweep: 'T3',
};

export interface TierCheck {
  ok: boolean;
  tier: PermissionTier;
  reason?: string;
}

/**
 * Per-action T3 authorization refs. Two formats are accepted:
 *   - `USER_CLICK_APPROVE_PROPOSAL_*` — a plain per-action click.
 *   - `FIDO2_PASSKEY_BIOMETRIC_AUTH_*` — the same click performed through the
 *     simulated device passkey (Face ID / fingerprint), recorded for audit evidence.
 */
export const CLICK_AUTH_RE =
  /^(USER_CLICK_APPROVE_PROPOSAL|FIDO2_PASSKEY_BIOMETRIC_AUTH)_[A-Za-z0-9]+$/;

export function tierOf(toolName: string): PermissionTier {
  return TOOL_TIERS[toolName] ?? 'T3';
}

export function assertTier(
  toolName: string,
  state: TierState,
  opts?: { authorizationRef?: string },
): TierCheck {
  const tier = tierOf(toolName);

  if (tier === 'T0') return { ok: true, tier };

  if (!state.masterAutonomyEnabled) {
    return {
      ok: false,
      tier,
      reason: 'MASTER_AUTONOMY_OFF: CtrlPay is in T0 advisory/analysis mode only.',
    };
  }

  if (tier === 'T1' && !state.enabledTiers.T1) {
    return { ok: false, tier, reason: 'TIER_T1_DISABLED' };
  }
  if (tier === 'T2' && !state.enabledTiers.T2) {
    return { ok: false, tier, reason: 'TIER_T2_DISABLED' };
  }
  if (tier === 'T3') {
    const ref = opts?.authorizationRef;
    if (!ref || !CLICK_AUTH_RE.test(ref)) {
      return {
        ok: false,
        tier,
        reason: 'T3_REQUIRES_EXPLICIT_USER_CLICK: a valid USER_CLICK_APPROVE_PROPOSAL_* ref is required.',
      };
    }
  }
  return { ok: true, tier };
}
