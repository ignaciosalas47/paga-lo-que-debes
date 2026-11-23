import { formatCents } from './money';
import type { SplitResult } from './split';

/** Describes the fair share: a single amount, or a range when leftover cents make parts differ. */
export function shareLine(shares: number[]): string {
  const min = Math.min(...shares);
  const max = Math.max(...shares);
  return min === max
    ? `A cada uno le tocan ${formatCents(min)}`
    : `A cada uno le tocan entre ${formatCents(min)} y ${formatCents(max)}`;
}

/** Parenthetical fair share for the WhatsApp message. A range when leftover cents make parts differ. */
function whatsappShareLine(shares: number[]): string {
  const min = Math.min(...shares);
  const max = Math.max(...shares);
  const body =
    min === max
      ? `Total por persona ${formatCents(min)}`
      : `Total por persona entre ${formatCents(min)} y ${formatCents(max)}`;
  return `(${body})`;
}

/** Wraps a name or amount so WhatsApp renders it in bold. */
function bold(text: string): string {
  return `*${text}*`;
}

/** Builds the plain-text version of a result, ready to paste into WhatsApp. */
export function resultToText(result: SplitResult): string {
  const lines = [
    `Gastos en Total ${formatCents(result.total)}`,
    whatsappShareLine(result.shares),
    '',
    ...result.people.map((p) => `- ${p.name} puso ${formatCents(p.paid)}`),
    '',
  ];
  if (result.transfers.length === 0) {
    lines.push('- Todos quedan a mano.');
  } else {
    for (const t of result.transfers) {
      lines.push(`- ${bold(t.from)} le paga ${bold(formatCents(t.amount))} a ${bold(t.to)}`);
    }
  }
  return lines.join('\n');
}

/**
 * Builds a WhatsApp link with the text prefilled. It opens the app on phones and WhatsApp
 * Web/Desktop elsewhere, and lets the user pick the chat to send it to.
 */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
