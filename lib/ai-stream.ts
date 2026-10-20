/**
 * Minimal reader for the AI SDK v4 data-stream protocol.
 *
 * The proposal Copilot is a plain React surface (not `useChat`), but it must use
 * the same live Groq route as the main AgentChat. This helper aggregates the
 * `0:` text parts from the stream so the existing bubble UI can render the
 * reply without duplicating the server agent loop.
 */
export interface DataStreamTextResult {
  text: string;
  error?: string;
  toolCalls: number;
  finishReason?: string;
}

export async function consumeDataStreamText(response: Response): Promise<DataStreamTextResult> {
  if (!response.body) {
    return { text: '', error: 'The AI response had no body.', toolCalls: 0 };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let error: string | undefined;
  let toolCalls = 0;
  let finishReason: string | undefined;

  const consumeLine = (line: string) => {
    const clean = line.endsWith('\r') ? line.slice(0, -1) : line;
    if (!clean) return;
    const separator = clean.indexOf(':');
    if (separator < 0) return;

    const code = clean.slice(0, separator);
    const raw = clean.slice(separator + 1);

    try {
      const value: unknown = JSON.parse(raw);
      if (code === '0' && typeof value === 'string') {
        text += value;
      } else if (code === '3' && typeof value === 'string') {
        error = value;
      } else if (code === '9') {
        toolCalls += 1;
      } else if (
        code === 'd' &&
        value !== null &&
        typeof value === 'object' &&
        'finishReason' in value &&
        typeof (value as { finishReason?: unknown }).finishReason === 'string'
      ) {
        finishReason = (value as { finishReason: string }).finishReason;
      }
    } catch {
      // A malformed part must not take down the whole chat bubble.
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf('\n');
      while (newline >= 0) {
        consumeLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf('\n');
      }
    }

    buffer += decoder.decode();
    if (buffer) consumeLine(buffer);
  } finally {
    reader.releaseLock();
  }

  return { text: text.trim(), error, toolCalls, finishReason };
}
