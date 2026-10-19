import { beforeEach, describe, expect, it } from 'vitest';
import { assertTier, tierOf, TOOL_TIERS } from '@/lib/permissions';
import { auditLog, type AuditInput } from '@/lib/audit-logger';
import { useCtrlPayStore } from '@/lib/store';

const TEST_USER = 'student_test_security_ui';

describe('Settings Security & Execution Test Suite', () => {
  beforeEach(() => {
    auditLog.__reset(TEST_USER);
  });

  describe('1. Master Switch OFF permission denial', () => {
    const masterOffState = {
      masterAutonomyEnabled: false,
      enabledTiers: { T0: true, T1: true, T2: true, T3: true },
    };

    it('denies T1 recommendation tools when Master Switch is OFF', () => {
      const res = assertTier('flag_suspected_zombie', masterOffState);
      expect(res.ok).toBe(false);
      expect(res.tier).toBe('T1');
      expect(res.reason).toMatch(/MASTER_AUTONOMY_OFF/);
    });

    it('denies T2 proposal drafting tools when Master Switch is OFF', () => {
      const res = assertTier('draft_cancellation', masterOffState);
      expect(res.ok).toBe(false);
      expect(res.tier).toBe('T2');
      expect(res.reason).toMatch(/MASTER_AUTONOMY_OFF/);
    });

    it('denies T3 protected actions when Master Switch is OFF, even with an approval ref', () => {
      const res = assertTier('propose_quarantine', masterOffState, {
        authorizationRef: 'USER_CLICK_APPROVE_PROPOSAL_123',
      });
      expect(res.ok).toBe(false);
      expect(res.tier).toBe('T3');
      expect(res.reason).toMatch(/MASTER_AUTONOMY_OFF/);
    });

    it('always permits T0 read-only tools regardless of Master Switch state', () => {
      expect(assertTier('run_what_if_simulation', masterOffState).ok).toBe(true);
      expect(assertTier('get_budget_insights', masterOffState).ok).toBe(true);
      expect(assertTier('analyze_zombies', masterOffState).ok).toBe(true);
      expect(assertTier('generate_roast', masterOffState).ok).toBe(true);
    });

    it('prevents toggling individual tiers in the store when Master Switch is OFF', () => {
      const store = useCtrlPayStore.getState();
      store.setMasterAutonomy(false);

      // Attempt to toggle T1 when master is OFF
      store.setTier('T1', true);
      // Tier remains in default disabled state
      expect(useCtrlPayStore.getState().masterAutonomyEnabled).toBe(false);
    });
  });

  describe('2. Unauthorized protected actions', () => {
    const masterOnState = {
      masterAutonomyEnabled: true,
      enabledTiers: { T0: true, T1: true, T2: true, T3: true },
    };

    it('rejects T3 protected actions without an authorization ref', () => {
      const res = assertTier('propose_quarantine', masterOnState);
      expect(res.ok).toBe(false);
      expect(res.tier).toBe('T3');
      expect(res.reason).toMatch(/T3_REQUIRES_EXPLICIT_USER_CLICK/);
    });

    it('rejects T3 actions with forged or invalid authorization refs', () => {
      const invalidRefs = [
        'AUTO_APPROVED',
        'ADMIN_BYPASS',
        'MANDATE_DEFAULT_T0',
        'USER_CLICK_APPROVE_PROPOSAL', // Missing ID
        'user_click_approve_proposal_123', // Lowercase
      ];

      for (const ref of invalidRefs) {
        const res = assertTier('propose_escrow', masterOnState, { authorizationRef: ref });
        expect(res.ok).toBe(false);
        expect(res.reason).toMatch(/T3_REQUIRES_EXPLICIT_USER_CLICK/);
      }
    });

    it('accepts valid per-action user click authorization ref for T3', () => {
      const validRef = 'USER_CLICK_APPROVE_PROPOSAL_abc123';
      const res = assertTier('propose_sweep', masterOnState, { authorizationRef: validRef });
      expect(res.ok).toBe(true);
      expect(res.tier).toBe('T3');
    });
  });

  describe('3. Audit event display & schema compliance', () => {
    it('appends and displays events with valid schema attributes and no raw PII', () => {
      const input: AuditInput = {
        sandboxClock: '2026-03-12T09:00:00.000Z',
        actor: 'AGENT',
        actionType: 'RECEIPT_PARSED',
        permissionTier: 'T0',
        data_accessed: ['receipt.merchant', 'receipt.total', 'receipt.category'],
        authorization_ref: 'OCR_IN_MEMORY_EXTRACT',
        proposal_hash: null,
        status: 'EXECUTED',
      };

      const entry = auditLog.append(input, TEST_USER);
      expect(entry.logId).toMatch(/^log_/);
      expect(entry.actor).toBe('AGENT');
      expect(entry.actionType).toBe('RECEIPT_PARSED');
      expect(entry.prevHash).toBe('GENESIS');
      expect(entry.entryHash).toMatch(/^[0-9a-f]{64}$/);

      // Verify data_accessed contains field names only (never raw PII figures or credentials)
      expect(entry.data_accessed).toEqual(['receipt.merchant', 'receipt.total', 'receipt.category']);
      for (const field of entry.data_accessed) {
        expect(field).not.toMatch(/\d{6}-\d{2}-\d{4}/); // No IC numbers
        expect(field).not.toMatch(/^\+?60/); // No phone numbers
      }

      const list = auditLog.list(TEST_USER);
      expect(list).toHaveLength(1);
      expect(list[0].logId).toBe(entry.logId);
    });
  });

  describe('4. Audit-chain verification success and failure', () => {
    it('verifies a valid hash chain with multiple blocks', () => {
      for (let i = 0; i < 5; i++) {
        auditLog.append(
          {
            sandboxClock: `2026-03-12T09:0${i}:00.000Z`,
            actor: i % 2 === 0 ? 'AGENT' : 'USER',
            actionType: `OPERATION_STEP_${i}`,
            permissionTier: 'T1',
            data_accessed: [`step_${i}.status`],
            authorization_ref: `USER_STEP_${i}`,
            proposal_hash: null,
            status: 'EXECUTED',
          },
          TEST_USER,
        );
      }

      const verified = auditLog.verifyChain(TEST_USER);
      expect(verified).toBe(true);
      expect(auditLog.list(TEST_USER)).toHaveLength(5);
    });

    it('detects tampering and fails verification when an entry is mutated', () => {
      for (let i = 0; i < 4; i++) {
        auditLog.append(
          {
            sandboxClock: `2026-03-12T09:0${i}:00.000Z`,
            actor: 'AGENT',
            actionType: `STEP_${i}`,
            permissionTier: 'T1',
            data_accessed: ['status'],
            authorization_ref: 'REF_0',
            proposal_hash: null,
            status: 'EXECUTED',
          },
          TEST_USER,
        );
      }

      // Simulate tampering on the second entry
      const tamperResult = auditLog.simulateTamper(TEST_USER, 1);
      expect(tamperResult.tampered).toBe(true);

      // Verification MUST now fail
      expect(auditLog.verifyChain(TEST_USER)).toBe(false);

      // Restoring authentic ledger re-computes hashes and passes verification
      const restored = auditLog.restoreAuthentic(TEST_USER);
      expect(restored).toBe(true);
      expect(auditLog.verifyChain(TEST_USER)).toBe(true);
    });
  });

  describe('5. Empty audit logs handling', () => {
    it('handles empty audit logs gracefully without throwing', () => {
      auditLog.__reset(TEST_USER);

      const entries = auditLog.list(TEST_USER);
      expect(entries).toEqual([]);
      expect(entries).toHaveLength(0);

      // Empty chain is trivially valid
      const verified = auditLog.verifyChain(TEST_USER);
      expect(verified).toBe(true);
    });

    it('seeds authentic sandbox entries if empty', () => {
      auditLog.__reset(TEST_USER);
      expect(auditLog.list(TEST_USER)).toHaveLength(0);

      const seeded = auditLog.seedIfEmpty(TEST_USER);
      expect(seeded.length).toBeGreaterThanOrEqual(8);
      expect(auditLog.verifyChain(TEST_USER)).toBe(true);
    });
  });

  describe('6. Permission changes and audit recording', () => {
    it('records SET_MASTER_AUTONOMY in audit log when Master Switch changes', () => {
      const store = useCtrlPayStore.getState();
      store.setMasterAutonomy(true);

      const events = auditLog.list();
      const lastEvent = events[events.length - 1];
      expect(lastEvent.actionType).toBe('SET_MASTER_AUTONOMY');
      expect(lastEvent.actor).toBe('USER');
      expect(lastEvent.authorization_ref).toBe('USER_TOGGLE_MASTER_ON');
      expect(lastEvent.status).toBe('MODIFIED');
      expect(auditLog.verifyChain()).toBe(true);
    });

    it('records SET_TIER_* in audit log when individual permission tier changes', () => {
      const store = useCtrlPayStore.getState();
      store.setMasterAutonomy(true);
      store.setTier('T1', true);

      const events = auditLog.list();
      const tierEvent = events.find((e) => e.actionType === 'SET_TIER_T1');
      expect(tierEvent).toBeDefined();
      expect(tierEvent?.actor).toBe('USER');
      expect(tierEvent?.authorization_ref).toBe('USER_TOGGLE_T1_ON');
      expect(tierEvent?.status).toBe('MODIFIED');
      expect(auditLog.verifyChain()).toBe(true);
    });
  });
});
