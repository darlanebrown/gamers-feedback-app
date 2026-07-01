import { prisma } from './prisma';

export type Draft = {
  id: string;
  reviewerTag: string;
  gameTitle: string | null;
  platform: string | null;
  rating: number | null;
  headline: string | null;
  body: string | null;
  pros: string | null;
  cons: string | null;
  playtime: string | null;
  updatedAt: Date;
};

export type DraftFields = Partial<Omit<Draft, 'id' | 'reviewerTag' | 'updatedAt'>>;

export async function getDraft(reviewerTag: string): Promise<Draft | null> {
  return prisma.draft.findUnique({ where: { reviewerTag } }) as Promise<Draft | null>;
}

export async function upsertDraft(reviewerTag: string, fields: DraftFields): Promise<Draft> {
  return prisma.draft.upsert({
    where: { reviewerTag },
    create: { reviewerTag, ...fields },
    update: { ...fields },
  }) as Promise<Draft>;
}

export async function deleteDraft(reviewerTag: string): Promise<void> {
  await prisma.draft.deleteMany({ where: { reviewerTag } });
}
