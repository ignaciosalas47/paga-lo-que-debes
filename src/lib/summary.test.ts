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
      '*Total de gastos $ 120,00*',
      '($ 30,00 por persona)',
      '',
      'Pusieron',
      '- A: $ 100,00',
      '- B: $ 20,00',
      '- C: $ 0,00',
      '- D: $ 0,00',
      '',
      'Tienen que pagar',
      expect.stringMatching(/^- \*[BCD]: \$ (10|30),00\* a \*A\*$/),
      expect.stringMatching(/^- \*[BCD]: \$ (10|30),00\* a \*A\*$/),
      expect.stringMatching(/^- \*[BCD]: \$ (10|30),00\* a \*A\*$/),
    ]);
  });

  it('shows one rounded-down amount when the total does not divide evenly', () => {
    const text = resultToText(
      splitBill([
        { name: 'A', paid: 5000 },
        { name: 'B', paid: 0 },
        { name: 'C', paid: 0 },
      ]),
    );
    expect(text.split('\n')).toEqual([
      '*Total de gastos $ 50,00*',
      '($ 16,66 por persona)',
      '',
      'Pusieron',
      '- A: $ 50,00',
      '- B: $ 0,00',
      '- C: $ 0,00',
      '',
      'Tienen que pagar',
      expect.stringMatching(/^- \*[BC]: \$ 16,66\* a \*A\*$/),
      expect.stringMatching(/^- \*[BC]: \$ 16,66\* a \*A\*$/),
    ]);
  });

  it('says everyone is even when there are no transfers', () => {
    const text = resultToText(
      splitBill([
        { name: 'A', paid: 1000 },
        { name: 'B', paid: 1000 },
      ]),
    );
    expect(text).toContain('Todos quedan a mano.');
    expect(text).not.toContain('Tienen que pagar');
  });
});
