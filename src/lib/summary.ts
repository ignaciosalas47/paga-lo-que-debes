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

/** Builds the plain-text version of a result, ready to paste into a chat. */
export function resultToText(result: SplitResult): string {
  const lines = [`Total ${formatCents(result.total)}`, shareLine(result.shares), ''];
  if (result.transfers.length === 0) {
    lines.push('Todos quedan a mano.');
  } else {
    for (const t of result.transfers) lines.push(`${t.from} le paga ${formatCents(t.amount)} a ${t.to}`);
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
