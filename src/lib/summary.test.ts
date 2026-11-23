import { describe, expect, it } from 'vitest';
import { splitBill } from './split';
import { resultToText, whatsappUrl } from './summary';

describe('whatsappUrl', () => {
  it('encodes line breaks and special characters in the message', () => {
    expect(whatsappUrl('Total $ 1,00\nA le paga a B')).toBe(
      'https://wa.me/?text=Total%20%24%201%2C00%0AA%20le%20paga%20a%20B',
    );
  });
});

describe('resultToText', () => {
  it('formats the reference example for pasting', () => {
    const text = resultToText(
      splitBill([
        { name: 'A', paid: 10000 },
        { name: 'B', paid: 2000 },
        { name: 'C', paid: 0 },
        { name: 'D', paid: 0 },
      ]),
    );
    expect(text.split('\n')).toEqual([
      'Gastos en Total $ 120,00',
      '(Total por persona $ 30,00)',
      '',
      '- A puso $ 100,00',
      '- B puso $ 20,00',
      '- C puso $ 0,00',
      '- D puso $ 0,00',
      '',
      expect.stringMatching(/^- \*[BCD]\* le paga \*\$ (10|30),00\* a \*A\*$/),
      expect.stringMatching(/^- \*[BCD]\* le paga \*\$ (10|30),00\* a \*A\*$/),
      expect.stringMatching(/^- \*[BCD]\* le paga \*\$ (10|30),00\* a \*A\*$/),
    ]);
  });

  it('puts the per-person total in parentheses and lists what each person paid', () => {
    const text = resultToText(
      splitBill([
        { name: 'A', paid: 1000 },
        { name: 'B', paid: 0 },
        { name: 'C', paid: 0 },
      ]),
    );
    expect(text.split('\n').slice(0, 6)).toEqual([
      'Gastos en Total $ 10,00',
      '(Total por persona entre $ 3,33 y $ 3,34)',
      '',
      '- A puso $ 10,00',
      '- B puso $ 0,00',
      '- C puso $ 0,00',
    ]);
  });

  it('says everyone is even when there are no transfers', () => {
    const text = resultToText(
      splitBill([
        { name: 'A', paid: 1000 },
        { name: 'B', paid: 1000 },
      ]),
    );
    expect(text).toContain('- Todos quedan a mano.');
  });
});
