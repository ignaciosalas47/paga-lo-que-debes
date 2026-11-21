import { parseArsToCents } from './money.ts'

export type RawPerson = {
  id: string
  name: string
  amountText: string
}

export type RowIssue = {
  id: string
  name: boolean
  amount: boolean
}

export type ShareLine = {
  id: string
  name: string
  paidCents: number
  shareCents: number
  /** Paid minus share. Positive means others owe this person. */
  balanceCents: number
}

export type Transfer = {
  fromId: string
  fromName: string
  toId: string
  toName: string
  cents: number
}

export type Settlement = {
  totalCents: number
  shareBaseCents: number
  /** People at the start of the list who receive one extra cent. */
  remainderCount: number
  people: ShareLine[]
  transfers: Transfer[]
  settled: boolean
}

export type PrepareResult =
  | { ok: true; settlement: Settlement }
  | { ok: false; errors: string[]; rows: RowIssue[] }

type Bucket = {
  id: string
  name: string
  index: number
  left: number
}

/**
 * Fair shares in cents. Remainder cents go one each to the first people,
 * so the shares add up to the total exactly.
 */
export function fairShares(totalCents: number, count: number): number[] {
  if (!Number.isSafeInteger(totalCents) || totalCents < 0) {
    throw new Error('Total must be a non-negative safe integer')
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('Count must be a positive integer')
  }
  const total = BigInt(totalCents)
  const people = BigInt(count)
  const base = Number(total / people)
  const remainder = Number(total % people)
  return Array.from({ length: count }, (_, index) =>
    index < remainder ? base + 1 : base,
  )
}

/** Greedy settlement: largest debtor pays the largest creditor, repeatedly. */
export function settleBalances(lines: ShareLine[]): Transfer[] {
  const debtors: Bucket[] = []
  const creditors: Bucket[] = []
  lines.forEach((line, index) => {
    if (line.balanceCents < 0) {
      debtors.push({
        id: line.id,
        name: line.name,
        index,
        left: -line.balanceCents,
      })
    } else if (line.balanceCents > 0) {
      creditors.push({
        id: line.id,
        name: line.name,
        index,
        left: line.balanceCents,
      })
    }
  })

  const transfers: Transfer[] = []
  const guard = lines.length * lines.length + 1
  for (let step = 0; step < guard; step += 1) {
    const debtor = largestOpen(debtors)
    const creditor = largestOpen(creditors)
    if (!debtor || !creditor) break
    const cents = debtor.left < creditor.left ? debtor.left : creditor.left
    if (cents <= 0) break
    transfers.push({
      fromId: debtor.id,
      fromName: debtor.name,
      toId: creditor.id,
      toName: creditor.name,
      cents,
    })
    debtor.left -= cents
    creditor.left -= cents
  }

  transfers.sort(
    (a, b) =>
      indexOf(lines, a.fromId) - indexOf(lines, b.fromId) ||
      indexOf(lines, a.toId) - indexOf(lines, b.toId),
  )
  return transfers
}

export function buildSettlement(rows: RawPerson[]): PrepareResult {
  const rowsIssues: RowIssue[] = rows.map((row) => ({
    id: row.id,
    name: row.name.trim().length === 0,
    amount: parseArsToCents(row.amountText) === null,
  }))
  const errors: string[] = []

  if (rows.length < 2) {
    errors.push('Agregá al menos 2 personas.')
  }
  if (rows.length >= 1 && rowsIssues.some((row) => row.name)) {
    errors.push('Cada persona necesita un nombre.')
  }
  if (rowsIssues.some((row) => row.amount)) {
    errors.push(
      'Revisá los montos: usá cero o más, con hasta 2 decimales (por ejemplo 1.234,56).',
    )
  }

  const paid = rows.map((row) => parseArsToCents(row.amountText))
  const amountsKnown = paid.every((cents) => cents !== null)
  if (
    rows.length >= 2 &&
    amountsKnown &&
    paid.every((cents) => cents === 0)
  ) {
    errors.push('Alguien tiene que haber pagado.')
  }

  const totalCents = amountsKnown ? sumCents(paid as number[]) : null
  if (amountsKnown && totalCents === null) {
    errors.push('El total es demasiado grande.')
  }

  if (errors.length > 0 || totalCents === null) {
    return { ok: false, errors, rows: rowsIssues }
  }

  const shares = fairShares(totalCents, rows.length)
  const people: ShareLine[] = rows.map((row, index) => {
    const paidCents = paid[index] as number
    const shareCents = shares[index] as number
    return {
      id: row.id,
      name: row.name.trim(),
      paidCents,
      shareCents,
      balanceCents: paidCents - shareCents,
    }
  })
  const transfers = settleBalances(people)
  const peopleCount = BigInt(rows.length)
  const remainderCount = Number(BigInt(totalCents) % peopleCount)
  const shareBaseCents = Number(BigInt(totalCents) / peopleCount)

  return {
    ok: true,
    settlement: {
      totalCents,
      shareBaseCents,
      remainderCount,
      people,
      transfers,
      settled: transfers.length === 0,
    },
  }
}

function largestOpen(buckets: Bucket[]): Bucket | null {
  let best: Bucket | null = null
  for (const bucket of buckets) {
    if (bucket.left <= 0) continue
    if (
      !best ||
      bucket.left > best.left ||
      (bucket.left === best.left && bucket.index < best.index)
    ) {
      best = bucket
    }
  }
  return best
}

function indexOf(lines: ShareLine[], id: string): number {
  return lines.findIndex((line) => line.id === id)
}

function sumCents(values: number[]): number | null {
  let total = 0
  for (const value of values) {
    total += value
    if (!Number.isSafeInteger(total)) return null
  }
  return total
}
