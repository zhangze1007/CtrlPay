import { resolveGroqApiKey, resolveGroqModel } from '@/lib/groq-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * TEMPORARY deployment diagnostic. Returns only env var NAMES and booleans,
 * never values. Remove after production AI configuration is verified.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== 'ctrlpay-diag-9f3a') {
    return new Response('Not found', { status: 404 });
  }

  const groqEnvNames = Object.keys(process.env)
    .filter((name) => /groq/i.test(name))
    .sort();

  return Response.json(
    {
      groqConfigured: Boolean(resolveGroqApiKey()),
      model: resolveGroqModel(),
      groqEnvNames,
      signingSecretConfigured: Boolean(process.env.CTRLPAY_SIGNING_SECRET),
      nodeEnv: process.env.NODE_ENV,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
