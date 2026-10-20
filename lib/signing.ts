import { createHmac, randomBytes } from 'node:crypto';
import { canonicalJson } from './canonical';
import { SignedProposalSchema, type ProposalTerms, type SignedProposal } from './types';

export { canonicalJson };

const DEV_FALLBACK_SECRET = 'ctrlpay-sandbox-dev-secret-not-for-production';

function getServerSecret(): string {
  const secret = process.env.CTRLPAY_SIGNING_SECRET;
  if (secret && secret.length > 0) return secret;
  // FAIL CLOSED in production: the dev fallback is public in this repository.
  // Running production with it would let anyone forge proposal signatures.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY] CTRLPAY_SIGNING_SECRET is required in production; refusing the public dev fallback.',
    );
  }
  return DEV_FALLBACK_SECRET;
}

export function computeIntegrityHash(
  terms: ProposalTerms,
  proposalId: string,
  userId: string,
): string {
  return createHmac('sha256', getServerSecret())
    .update(canonicalJson(terms) + proposalId + userId)
    .digest('hex');
}

export function createProposalId(): string {
  return `prop_${randomBytes(8).toString('hex')}`;
}

export function signProposal(
  terms: ProposalTerms,
  userId: string,
  opts?: { proposalId?: string; expiresAt?: string; status?: SignedProposal['status'] },
): SignedProposal {
  const proposalId = opts?.proposalId ?? createProposalId();
  const expiresAt = opts?.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const integrityHash = computeIntegrityHash(terms, proposalId, userId);
  const proposal: SignedProposal = {
    proposalId,
    userId,
    terms,
    integrityHash,
    expiresAt,
    status: opts?.status ?? 'PROPOSED',
  };
  return SignedProposalSchema.parse(proposal);
}

export function verifyProposal(p: SignedProposal, userId: string): boolean {
  const parsed = SignedProposalSchema.safeParse(p);
  if (!parsed.success) return false;
  if (p.userId !== userId) return false;

  const expected = computeIntegrityHash(p.terms, p.proposalId, userId);
  if (expected.length !== p.integrityHash.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ p.integrityHash.charCodeAt(i);
  }
  return diff === 0;
}
