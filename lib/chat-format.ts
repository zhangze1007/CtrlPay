/**
 * Render assistant output as plain conversational text.
 *
 * Groq models occasionally fall back to Markdown tables and bold markers even
 * when asked not to. The chat bubbles are intentionally plain text, so we turn
 * any stray table into readable bullet lines and strip the markup that would
 * otherwise appear literally (`**`, `###`, code fences).
 */
function convertMarkdownTables(input: string): string {
  const lines = input.split('\n');
  const output: string[] = [];
  let table: string[][] = [];

  const flush = () => {
    if (table.length === 0) return;
    const [header, ...rows] = table;
    if (header && rows.length > 0) {
      for (const row of rows) {
        const cells = row.filter((cell) => cell.length > 0);
        if (cells.length === 0) continue;
        if (header.length === 2 && cells.length >= 2) {
          output.push(`- ${header[0]}: ${cells[0]}; ${header[1]}: ${cells[1]}`);
        } else {
          output.push(`- ${cells.join(' · ')}`);
        }
      }
    }
    table = [];
  };

  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map((cell) => cell.trim());
      if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) continue;
      table.push(cells);
    } else {
      flush();
      output.push(line);
    }
  }
  flush();
  return output.join('\n');
}

export function toPlainChatText(input: string): string {
  return convertMarkdownTables(input.replace(/\r\n?/g, '\n'))
    .replace(/^\s*```[\w-]*\s*$/gm, '')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
