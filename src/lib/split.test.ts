import { describe, expect, it } from 'vitest';
import { formatCents, parseCents } from './money';
import { splitBill } from './split';

const pay = (name: string, pesos: number) => ({ name, paid: pesos * 100 });

describe('money', () => {
  it('parses es-AR amounts into cents', () => {
    expect(parseCents('1.234,56')).toBe(123456);
    expect(parseCents('100')).toBe(10000);
    expect(parseCents('10,5')).toBe(1050);
    expect(parseCents('10.5')).toBe(1050);
    expect(parseCents('1.234')).toBe(123400);
    expect(parseCents('')).toBe(0);
    expect(parseCents('-5')).toBe(-500);
    expect(parseCents('abc')).toBeNull();
  });

  it('formats cents with two decimals', () => {
    expect(formatCents(123456)).toBe('$ 1.234,56');
    expect(formatCents(1000)).toBe('$ 10,00');
    expect(formatCents(5)).toBe('$ 0,05');
  });
});

describe('splitBill', () => {
  it('solves the reference example', () => {
    const r = splitBill([pay('A', 100), pay('B', 20), pay('C', 0), pay('D', 0)]);
    expect(r.total).toBe(12000);
    expect(r.shares).toEqual([3000, 3000, 3000, 3000]);
    expect(r.transfers).toHaveLength(3);
    expect(r.transfers).toEqual(
      expect.arrayContaining([
        { from: 'B', to: 'A', amount: 1000 },
        { from: 'C', to: 'A', amount: 3000 },
        { from: 'D', to: 'A', amount: 3000 },
      ]),
    );
  });

  it('gives leftover cents to the first people and keeps the sum exact', () => {
    const r = splitBill([
      { name: 'A', paid: 1000 },
      { name: 'B', paid: 0 },
      { name: 'C', paid: 0 },
    ]);
    expect(r.shares).toEqual([334, 333, 333]);
    expect(r.shares.reduce((a, b) => a + b, 0)).toBe(1000);
  });

  it('returns no transfers when everyone is even', () => {
    expect(splitBill([pay('A', 10), pay('B', 10)]).transfers).toEqual([]);
  });

  it('uses fewer transfers than plain greedy when independent pairs exist', () => {
    // Balances +10, -10, +20, -20 form two independent pairs: 2 transfers, greedy would need 3.
    const r = splitBill([pay('A', 30), pay('B', 10), pay('C', 40), pay('D', 0)]);
    expect(r.shares).toEqual([2000, 2000, 2000, 2000]);
    expect(r.transfers).toHaveLength(2);
  });
});
