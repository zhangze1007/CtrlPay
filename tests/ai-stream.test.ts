import { describe, expect, it } from 'vitest';
import { consumeDataStreamText } from '@/lib/ai-stream';

function chunkedResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body);
}

describe('consumeDataStreamText', () => {
  it('aggregates text parts across arbitrary network chunk boundaries', async () => {
    const response = chunkedResponse([
      '0:"Hel',
      'lo, "\n',
      '0:"Alex."\n',
      'd:{"finishReason":"stop"}\n',
    ]);

    const result = await consumeDataStreamText(response);

    expect(result.text).toBe('Hello, Alex.');
    expect(result.finishReason).toBe('stop');
    expect(result.toolCalls).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('captures a stream error without losing earlier text', async () => {
    const response = new Response(
      '0:"Partial answer."\n3:"Live AI is unavailable."\n',
    );

    const result = await consumeDataStreamText(response);

    expect(result.text).toBe('Partial answer.');
    expect(result.error).toBe('Live AI is unavailable.');
  });

  it('counts T3 tool calls when the agent stops for a contract card', async () => {
    const response = new Response(
      '9:{"toolCallId":"groq_x","toolName":"propose_quarantine","args":{"itemPrice":180}}\nd:{"finishReason":"tool-calls"}\n',
    );

    const result = await consumeDataStreamText(response);

    expect(result.text).toBe('');
    expect(result.toolCalls).toBe(1);
    expect(result.finishReason).toBe('tool-calls');
  });

  it('ignores malformed data parts instead of throwing', async () => {
    const response = new Response('0:"Safe."\nnot-a-part\n0:{broken}\n');

    const result = await consumeDataStreamText(response);

    expect(result.text).toBe('Safe.');
  });
});
