/** Argentine peso amounts as integer cents. No floating-point money math. */

const MAX_CENT_DIGITS = 15

/**
 * Parse an es-AR amount into cents.
 * Comma is the decimal separator. A dot is a thousands separator, except a
 * single dot with 1–2 digits after it (mobile keyboards), which is decimal.
 * Empty input is 0. Invalid or negative input is null.
 */
export function parseArsToCents(raw: string): number | null {
  let text = raw.trim().replace(/\s/g, '')
  if (text.startsWith('$')) text = text.slice(1)
  if (text === '' || text === ',') return 0
  if (text.includes('+') || text.includes('-')) return null
  if (!/^[\d.,]+$/.test(text)) return null

  const commaCount = countChar(text, ',')
  const dotCount = countChar(text, '.')
  if (commaCount > 1) return null

  let intDigits = ''
  let decDigits = ''

  if (commaCount === 1) {
    const splitAt = text.indexOf(',')
    const intRaw = text.slice(0, splitAt)
    const decRaw = text.slice(splitAt + 1)
    if (decRaw.length > 2 || !/^\d*$/.test(decRaw)) return null
    if (dotCount > 0 && splitAt < text.lastIndexOf('.')) return null
    if (intRaw === '') {
      intDigits = '0'
    } else if (!isPlainOrThousands(intRaw)) {
      return null
    } else {
      intDigits = intRaw.replace(/\./g, '')
    }
    decDigits = decRaw
  } else if (isThousands(text)) {
    intDigits = text.replace(/\./g, '')
    decDigits = ''
  } else if (/^\d+\.\d{1,2}$/.test(text)) {
    const splitAt = text.indexOf('.')
    intDigits = text.slice(0, splitAt)
    decDigits = text.slice(splitAt + 1)
  } else if (/^\d+$/.test(text)) {
    intDigits = text
    decDigits = ''
  } else {
    return null
  }

  const centsDigits = `${intDigits}${decDigits.padEnd(2, '0')}`
  if (centsDigits.length > MAX_CENT_DIGITS) return null
  const cents = Number(centsDigits)
  if (!Number.isSafeInteger(cents)) return null
  return cents
}

/** `123456` → `1.234,56`. */
export function formatAmount(cents: number): string {
  if (!Number.isSafeInteger(cents)) {
    throw new Error('Amount is not a safe integer amount of cents')
  }
  const sign = cents < 0 ? '-' : ''
  const digits = String(Math.abs(cents)).padStart(3, '0')
  const fraction = digits.slice(-2)
  const whole = digits.slice(0, -2).replace(/^0+(?=\d)/, '')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}${grouped},${fraction}`
}

/** `123456` → `$ 1.234,56`. */
export function formatARS(cents: number): string {
  if (cents < 0) return `-$ ${formatAmount(-cents)}`
  return `$ ${formatAmount(cents)}`
}

function countChar(value: string, char: string): number {
  let count = 0
  for (const unit of value) {
    if (unit === char) count += 1
  }
  return count
}

function isThousands(value: string): boolean {
  return /^\d{1,3}(\.\d{3})+$/.test(value)
}

function isPlainOrThousands(value: string): boolean {
  return /^\d+$/.test(value) || isThousands(value)
}
