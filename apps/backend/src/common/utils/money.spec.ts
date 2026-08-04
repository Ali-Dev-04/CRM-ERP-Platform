import { Prisma } from '@prisma/client';
import { computeTotals, lineTotalCents } from './money';

describe('money utils', () => {
  it('computes a line total as quantity × unit price (rounded)', () => {
    expect(lineTotalCents(new Prisma.Decimal('2.5'), 1000n)).toBe(2500n);
    expect(lineTotalCents(new Prisma.Decimal('0.333'), 300n)).toBe(100n); // 99.9 → 100
  });

  it('sums lines into a subtotal', () => {
    const totals = computeTotals(
      [
        { description: 'a', quantity: 2, unitPriceCents: 1000 },
        { description: 'b', quantity: 1, unitPriceCents: 500 },
      ],
      0n,
      0n,
    );
    expect(totals.subtotalCents).toBe(2500n);
    expect(totals.totalCents).toBe(2500n);
  });

  it('applies discount then tax to reach the total', () => {
    const totals = computeTotals(
      [{ description: 'a', quantity: 1, unitPriceCents: 10000 }],
      1000n, // discount
      950n, // tax
    );
    expect(totals.subtotalCents).toBe(10000n);
    expect(totals.totalCents).toBe(9950n); // 10000 - 1000 + 950
  });

  it('never produces a fractional cent', () => {
    const totals = computeTotals(
      [{ description: 'a', quantity: 3, unitPriceCents: 333 }],
      0n,
      0n,
    );
    expect(totals.subtotalCents).toBe(999n);
    expect(typeof totals.subtotalCents).toBe('bigint');
  });
});
