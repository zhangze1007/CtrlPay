import {
  resolveAiApiKey,
  resolveGroqApiKey,
  resolveGroqModel,
} from '@/lib/groq-client';

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
  const aiEnvNames = Object.keys(process.env)
    .filter((name) => /(GROQ|GEMINI|GOOGLE|OPENAI|ANTHROPIC|CLAUDE|LLM|AI_)/i.test(name))
    .sort();
  const ctrlpayEnvNames = Object.keys(process.env)
    .filter((name) => /^CTRLPAY/i.test(name))
    .sort();

  return Response.json(
    {
      groqConfigured: Boolean(resolveAiApiKey()),
      provider: resolveGroqApiKey()
        ? 'groq-direct'
        : process.env.AI_GATEWAY_API_KEY
          ? 'vercel-ai-gateway'
          : 'none',
      model: resolveGroqModel(),
      groqEnvNames,
      aiEnvNames,
      ctrlpayEnvNames,
      signingSecretConfigured: Boolean(process.env.CTRLPAY_SIGNING_SECRET),
      nodeEnv: process.env.NODE_ENV,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
