/** All amounts are integer cents; no floating point is used for arithmetic. */

/**
 * Parses a user-typed ARS amount ("1.234,56", "100", "10,5") into integer cents.
 * Dots are thousands separators and the comma is the decimal separator.
 * A lone dot followed by 1-2 digits and no comma ("10.5") is accepted as a decimal point.
 * Returns null when the text is not a valid amount; an empty string means 0.
 */
export function parseCents(input: string): number | null {
  const text = input.replace(/[\s$]/g, '');
  if (text === '') return 0;

  let normalized = text;
  if (!text.includes(',') && /^-?\d+\.\d{1,2}$/.test(text)) {
    normalized = text.replace('.', ',');
  }

  const match = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(normalized);
  if (!match) return null;

  const [, sign, whole, decimals = ''] = match;
  const cents = Number(whole!.replace(/\./g, '')) * 100 + Number(decimals.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return sign ? -cents : cents;
}

/** Formats integer cents as "$ 1.234,56" (es-AR) using string operations only. */
export function formatCents(cents: number): string {
  const abs = Math.abs(cents);
  const whole = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimals = String(abs % 100).padStart(2, '0');
  return `${cents < 0 ? '-' : ''}$ ${whole},${decimals}`;
}
