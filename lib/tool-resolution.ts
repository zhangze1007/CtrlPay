/**
 * Multi-turn tool-call integrity (plan.md Section 2.3).
 *
 * The three contract tools (`propose_quarantine`, `propose_escrow`, `propose_sweep`)
 * are CLIENT-RESOLVED: the server declares them with no `execute`, and the chat UI
 * must call `addToolResult` for every one of them or the next turn fails with a
 * "dangling tool call".
 *
 * This module centralises that contract so it is unit-testable without a DOM:
 *   - `approve/modify/decline/dismiss` build BOTH the `CardDecision` sent to the
 *     server and the `ToolResolution` handed to `addToolResult`.
 *   - `pendingT3ToolCallIds` proves whether any contract tool call is still open.
 */

import { CLICK_AUTH_RE } from './permissions';
import type { CardDecision, ModifiedTerms, ProposalTerms } from './types';

export const T3_CONTRACT_TOOLS = ['propose_quarantine', 'propose_escrow', 'propose_sweep'] as const;
export type T3ContractTool = (typeof T3_CONTRACT_TOOLS)[number];

const T3_TOOL_SET: ReadonlySet<string> = new Set(T3_CONTRACT_TOOLS);

export function isT3ContractTool(name: string): name is T3ContractTool {
  return T3_TOOL_SET.has(name);
}

/** Payload handed back to `addToolResult({ toolCallId, result })`. */
export type ToolResolution =
  | { status: 'APPROVED'; proposalId: string; authorizationRef: string; terms: ProposalTerms }
  | { status: 'MODIFIED'; proposalId: string; newTerms: ModifiedTerms; authorizationRef: string; terms: ProposalTerms }
  | { status: 'DECLINED'; proposalId: string | null; reason: string };

export interface ResolvedDecision<
  D extends CardDecision = CardDecision,
  R extends ToolResolution = ToolResolution,
> {
  /** Decision sent to POST /api/proposals/:id/decision (null when nothing should be sent). */
  decision: D | null;
  /** Result given to addToolResult so the conversation can continue. */
  resolution: R;
}

export type ApproveResolution = Extract<ToolResolution, { status: 'APPROVED' }>;
export type ModifyResolution = Extract<ToolResolution, { status: 'MODIFIED' }>;
export type DeclineResolution = Extract<ToolResolution, { status: 'DECLINED' }>;

export const DISMISSED_REASON = 'DISMISSED';

/** The per-action click authorization ref required by the T3 gate (Section 6.1). */
export function clickAuthorizationRef(proposalId: string): string {
  const ref = `USER_CLICK_APPROVE_PROPOSAL_${proposalId.slice(-4)}`;
  if (!CLICK_AUTH_RE.test(ref)) {
    throw new Error(`INVALID_PROPOSAL_ID_FOR_AUTH_REF: "${proposalId}"`);
  }
  return ref;
}

/**
 * Structured passkey authorization ref used when the user signs a T3 contract
 * through the simulated FIDO2/Face ID gate. It still contains the per-proposal
 * identifier, so it is just as action-specific as the plain click ref.
 */
export function passkeyAuthorizationRef(proposalId: string): string {
  const compact = proposalId.replace(/[^A-Za-z0-9]/g, '');
  const ref = `FIDO2_PASSKEY_BIOMETRIC_AUTH_${compact.slice(0, 8)}`;
  if (!CLICK_AUTH_RE.test(ref)) {
    throw new Error(`INVALID_PROPOSAL_ID_FOR_PASSKEY_REF: "${proposalId}"`);
  }
  return ref;
}

export function approveProposal(
  proposalId: string,
  terms: ProposalTerms,
  authorizationRef: string = clickAuthorizationRef(proposalId),
): ResolvedDecision<Extract<CardDecision, { status: 'APPROVED' }>, ApproveResolution> {
  return {
    decision: { status: 'APPROVED', proposalId, authorizationRef },
    resolution: { status: 'APPROVED', proposalId, authorizationRef, terms },
  };
}

export function modifyProposal(
  proposalId: string,
  newTerms: ModifiedTerms,
  terms: ProposalTerms,
  authorizationRef: string = clickAuthorizationRef(proposalId),
): ResolvedDecision<Extract<CardDecision, { status: 'MODIFIED' }>, ModifyResolution> {
  return {
    decision: { status: 'MODIFIED', proposalId, newTerms, authorizationRef },
    resolution: { status: 'MODIFIED', proposalId, newTerms, authorizationRef, terms },
  };
}

export function declineProposal(
  proposalId: string,
  reason = 'not now',
): ResolvedDecision<Extract<CardDecision, { status: 'DECLINED' }>, DeclineResolution> {
  return {
    decision: { status: 'DECLINED', proposalId, reason: reason.slice(0, 40) },
    resolution: { status: 'DECLINED', proposalId, reason },
  };
}

/**
 * Unmount safety: a card that goes away before a decision still resolves the tool
 * call with `{ status: 'DECLINED', proposalId, reason: 'DISMISSED' }`.
 */
export function dismissProposal(proposalId: string | null = null): ResolvedDecision<never, DeclineResolution> {
  return {
    decision: null,
    resolution: { status: 'DECLINED', proposalId, reason: DISMISSED_REASON },
  };
}

/* ------------------------------------------------------------------ *
 * Dangling-tool-call detector
 * ------------------------------------------------------------------ */

/** Minimal shape of an AI SDK v4 `message.parts` entry. */
export interface LooseMessagePart {
  type?: string;
  toolInvocation?: {
    toolCallId?: string;
    toolName?: string;
    state?: string;
  };
}

export interface LooseMessageLike {
  parts?: LooseMessagePart[];
}

/**
 * Returns the `toolCallId`s of contract tool calls that are still awaiting a
 * decision (`state !== 'result'`). An empty array means the transcript is clean
 * and the next turn cannot fail with a dangling tool call.
 */
export function pendingT3ToolCallIds(messages: readonly LooseMessageLike[]): string[] {
  const pending: string[] = [];
  for (const message of messages) {
    for (const part of message.parts ?? []) {
      const inv = part.toolInvocation;
      if (!inv?.toolCallId || !inv.toolName) continue;
      if (!isT3ContractTool(inv.toolName)) continue;
      if (inv.state === 'result') continue;
      pending.push(inv.toolCallId);
    }
  }
  return pending;
}

/**
 * Simulates what the transcript looks like after the user resolves every pending
 * contract tool call: marks each `toolCallId` as `result`.
 */
export function applyResolutions(
  messages: readonly LooseMessageLike[],
  resolvedToolCallIds: readonly string[],
): LooseMessageLike[] {
  const resolved = new Set(resolvedToolCallIds);
  return messages.map((message) => ({
    ...message,
    parts: (message.parts ?? []).map((part) => {
      const inv = part.toolInvocation;
      if (inv?.toolCallId && resolved.has(inv.toolCallId)) {
        return { ...part, toolInvocation: { ...inv, state: 'result' } };
      }
      return part;
    }),
  }));
}
