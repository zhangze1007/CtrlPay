import { describe, expect, it } from 'vitest';
import { toPlainChatText } from '@/lib/chat-format';

describe('toPlainChatText', () => {
  it('removes bold markers and headings from a normal answer', () => {
    const input = '### Your budget\n\n**Balance:** RM 7,540.00\n\n- Keep dining inside **RM 30/day**.';
    expect(toPlainChatText(input)).toBe(
      'Your budget\n\nBalance: RM 7,540.00\n\n- Keep dining inside RM 30/day.',
    );
  });

  it('turns a Markdown table into readable bullet lines', () => {
    const input = [
      '| Item | Amount (RM) |',
      '| --- | --- |',
      '| Current balance | 7,540 |',
      '| Savings goal | 300 |',
    ].join('\n');
    expect(toPlainChatText(input)).toBe(
      '- Item: Current balance; Amount (RM): 7,540\n- Item: Savings goal; Amount (RM): 300',
    );
  });

  it('keeps ordinary paragraphs and list line breaks', () => {
    const input = 'Here is the short answer.\n\n- First point\n- Second point';
    expect(toPlainChatText(input)).toBe(input);
  });
});
