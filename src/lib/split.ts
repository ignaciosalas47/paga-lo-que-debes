export interface Person {
  name: string;
  /** Amount paid, in integer cents. */
  paid: number;
}

export interface Transfer {
  from: string;
  to: string;
  /** Amount in integer cents. */
  amount: number;
}

export interface SplitResult {
  total: number;
  /** Fair share per person, in the same order as the input. Sums exactly to total. */
  shares: number[];
  /** Who paid what, in the same order as the input. */
  people: Person[];
  transfers: Transfer[];
}

/** Above this many non-zero balances the exact search is skipped in favour of a greedy pass. */
const EXACT_LIMIT = 18;

interface Balance {
  name: string;
  amount: number;
}

/**
 * Computes who pays whom. The fair share is floor(total / n); the leftover cents go
 * one each to the first people so the shares add up to the total exactly.
 */
export function splitBill(people: Person[]): SplitResult {
  const total = people.reduce((sum, p) => sum + p.paid, 0);
  const base = Math.floor(total / people.length);
  const extra = total - base * people.length;
  const shares = people.map((_, i) => base + (i < extra ? 1 : 0));

  const balances = people
    .map((p, i) => ({ name: p.name, amount: p.paid - shares[i]! }))
    .filter((b) => b.amount !== 0);

  return { total, shares, people, transfers: minimizeTransfers(balances) };
}

/**
 * Settles the balances with the fewest transfers: a group of k people whose balances sum
 * to zero can always be settled with k - 1 transfers, so we split the balances into the
 * maximum number of zero-sum groups (exact bitmask search) and settle each group greedily.
 */
function minimizeTransfers(balances: Balance[]): Transfer[] {
  if (balances.length === 0) return [];
  if (balances.length > EXACT_LIMIT) return settleGroup(balances);
  return partitionIntoZeroSumGroups(balances).flatMap(settleGroup);
}

/** Splits the balances into the maximum number of non-empty subsets that each sum to zero. */
function partitionIntoZeroSumGroups(balances: Balance[]): Balance[][] {
  const n = balances.length;
  const size = 1 << n;
  const sums = new Int32Array(size);
  const best = new Int32Array(size);

  for (let mask = 1; mask < size; mask++) {
    const low = Math.clz32(mask & -mask) ^ 31;
    sums[mask] = sums[mask & (mask - 1)]! + balances[low]!.amount;
    let max = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) max = Math.max(max, best[mask ^ (1 << i)]!);
    }
    best[mask] = max + (sums[mask] === 0 ? 1 : 0);
  }

  // Walk back from the full set to recover an order whose zero-sum prefixes are the groups.
  const order: number[] = [];
  let mask = size - 1;
  while (mask) {
    const target = best[mask]! - (sums[mask] === 0 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i) && best[mask ^ (1 << i)] === target) {
        order.push(i);
        mask ^= 1 << i;
        break;
      }
    }
  }
  order.reverse();

  const groups: Balance[][] = [];
  let current: Balance[] = [];
  let running = 0;
  for (const i of order) {
    current.push(balances[i]!);
    running += balances[i]!.amount;
    if (running === 0) {
      groups.push(current);
      current = [];
    }
  }
  return groups;
}

/** Greedy settlement: the biggest debtor pays the biggest creditor until everyone is even. */
function settleGroup(group: Balance[]): Transfer[] {
  const debtors = group.filter((b) => b.amount < 0).map((b) => ({ ...b, amount: -b.amount }));
  const creditors = group.filter((b) => b.amount > 0).map((b) => ({ ...b }));
  const transfers: Transfer[] = [];

  while (debtors.length && creditors.length) {
    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);
    const debtor = debtors[0]!;
    const creditor = creditors[0]!;
    const amount = Math.min(debtor.amount, creditor.amount);

    transfers.push({ from: debtor.name, to: creditor.name, amount });
    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtors.shift();
    if (creditor.amount === 0) creditors.shift();
  }
  return transfers;
}
