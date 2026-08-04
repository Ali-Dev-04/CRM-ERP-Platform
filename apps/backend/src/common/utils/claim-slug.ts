import { randomBytes } from 'crypto';
import type { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { toSlug } from './slug';

/**
 * Resolves a globally-unique organization slug. Tries the natural slug first,
 * appends a short random suffix on collision (bounded retries). The DB unique
 * constraint is the final backstop against races.
 */
export async function claimOrgSlug(prisma: PrismaService, name: string): Promise<string> {
  const base = toSlug(name);
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${randomBytes(2).toString('hex')}`;
    const existing = await prisma.organization.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
  }
  // Extremely unlikely; fall back to a longer random slug.
  return `${base}-${randomBytes(4).toString('hex')}`;
}
