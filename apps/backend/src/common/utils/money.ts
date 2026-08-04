import { Prisma } from '@prisma/client';

/**
 * Money is integer cents everywhere. Quantity is a Decimal (3 dp) for stock
 * units. Line total = round(quantity × unit price). All BigInt to avoid
 * floating-point drift.
 */
export function lineTotalCents(quantity: Prisma.Decimal, unitPriceCents: bigint): bigint {
  return BigInt(quantity.times(unitPriceCents.toString()).round().toString());
}

export interface LineInput {
  description: string;
  quantity: Prisma.Decimal | number | string;
  unitPriceCents: bigint | number;
  position?: number;
}

export interface Totals {
  subtotalCents: bigint;
  totalCents: bigint;
}

export function computeTotals(lines: LineInput[], discountCents: bigint, taxCents: bigint): Totals {
  const subtotal = lines.reduce(
    (sum, l) => sum + lineTotalCents(new Prisma.Decimal(l.quantity.toString()), BigInt(l.unitPriceCents)),
    0n,
  );
  const total = subtotal - discountCents + taxCents;
  return { subtotalCents: subtotal, totalCents: total };
}
