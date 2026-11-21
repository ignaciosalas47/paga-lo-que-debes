import assert from 'node:assert/strict'
import { formatAmount, formatARS, parseArsToCents } from '../src/money.ts'
import { buildSettlement, fairShares } from '../src/settle.ts'
import type { RawPerson } from '../src/settle.ts'

assert.equal(formatARS(123456), '$ 1.234,56')
assert.equal(formatARS(3000), '$ 30,00')
assert.equal(formatARS(1000), '$ 10,00')
assert.equal(formatAmount(0), '0,00')
assert.equal(parseArsToCents(''), 0)
assert.equal(parseArsToCents('100'), 10000)
assert.equal(parseArsToCents('20,5'), 2050)
assert.equal(parseArsToCents('1.234,56'), 123456)
assert.equal(parseArsToCents('100.50'), 10050)
assert.equal(parseArsToCents('1.234'), 123400)
assert.equal(parseArsToCents('-1'), null)
assert.equal(parseArsToCents('1,234'), null)

const example = buildSettlement([
  row('a', 'A', '100'),
  row('b', 'B', '20'),
  row('c', 'C', '0'),
  row('d', 'D', '0'),
])
assert.equal(example.ok, true)
if (!example.ok) throw new Error('example should settle')
assert.equal(example.settlement.totalCents, 12000)
assert.equal(example.settlement.shareBaseCents, 3000)
assert.equal(example.settlement.remainderCount, 0)
assert.deepEqual(
  example.settlement.people.map((person) => person.shareCents),
  [3000, 3000, 3000, 3000],
)
assert.deepEqual(
  example.settlement.transfers.map(
    (transfer) =>
      `${transfer.fromName} le paga ${formatARS(transfer.cents)} a ${transfer.toName}`,
  ),
  [
    'B le paga $ 10,00 a A',
    'C le paga $ 30,00 a A',
    'D le paga $ 30,00 a A',
  ],
)

assert.deepEqual(fairShares(100, 3), [34, 33, 33])
assert.equal(
  fairShares(100, 3).reduce((sum, share) => sum + share, 0),
  100,
)

const cases: number[][] = [
  [10000, 2000, 0, 0],
  [1, 0, 0],
  [0, 0, 1],
  [5000, 5000],
  [1, 1, 1],
  [10, 0, 0, 0],
  [999, 1],
  [150, 50, 0, 0],
  [100, 0, 0],
  [0, 50, 70],
  [3, 0, 0, 0, 0],
]

for (const amounts of cases) {
  const prepared = buildSettlement(
    amounts.map((cents, index) =>
      row(String(index), `P${index}`, formatAmount(cents)),
    ),
  )
  assert.equal(prepared.ok, true)
  if (!prepared.ok) continue
  const { settlement } = prepared
  const shareSum = sum(settlement.people.map((person) => person.shareCents))
  const balanceSum = sum(settlement.people.map((person) => person.balanceCents))
  const credit = sum(
    settlement.people
      .map((person) => person.balanceCents)
      .filter((balance) => balance > 0),
  )
  const transferSum = sum(settlement.transfers.map((transfer) => transfer.cents))
  assert.equal(shareSum, settlement.totalCents)
  assert.equal(balanceSum, 0)
  assert.equal(transferSum, credit)

  const net = new Map(
    settlement.people.map((person) => [person.id, person.balanceCents]),
  )
  for (const transfer of settlement.transfers) {
    assert.ok(transfer.cents > 0)
    net.set(transfer.fromId, (net.get(transfer.fromId) ?? 0) + transfer.cents)
    net.set(transfer.toId, (net.get(transfer.toId) ?? 0) - transfer.cents)
  }
  for (const value of net.values()) assert.equal(value, 0)
  assert.equal(settlement.settled, credit === 0)
}

const empty = buildSettlement([])
assert.equal(empty.ok, false)
const one = buildSettlement([row('a', 'Ana', '10')])
assert.equal(one.ok, false)
const zeros = buildSettlement([row('a', 'Ana', '0'), row('b', 'Luis', '0')])
assert.equal(zeros.ok, false)
const negative = buildSettlement([
  row('a', 'Ana', '-5'),
  row('b', 'Luis', '5'),
])
assert.equal(negative.ok, false)

const even = buildSettlement([
  row('a', 'Ana', '40,00'),
  row('b', 'Luis', '40'),
])
assert.equal(even.ok, true)
if (even.ok) assert.equal(even.settlement.settled, true)

console.log('ok')
console.log(example.settlement.transfers.map(
  (transfer) =>
    `${transfer.fromName} le paga ${formatARS(transfer.cents)} a ${transfer.toName}`,
).join('\n'))

function row(id: string, name: string, amountText: string): RawPerson {
  return { id, name, amountText }
}

function sum(values: number[]): number {
  let total = 0
  for (const value of values) total += value
  return total
}
