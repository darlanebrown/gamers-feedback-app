import { prisma } from './prisma';

export const PREFERENCE_TYPES = ['follow', 'vote', 'reclassify', 'comment', 'digest'] as const;
export type PreferenceType = (typeof PREFERENCE_TYPES)[number];

export type EmailPreferences = Record<PreferenceType, boolean>;

export async function getEmailPreferences(userId: string): Promise<EmailPreferences> {
  const rows = await prisma.emailPreference.findMany({ where: { userId } });
  const saved = Object.fromEntries(rows.map((r) => [r.type, r.enabled]));
  // Default to true for any type not yet stored
  return Object.fromEntries(
    PREFERENCE_TYPES.map((type) => [type, saved[type] ?? true]),
  ) as EmailPreferences;
}

export async function setEmailPreference(
  userId: string,
  type: PreferenceType,
  enabled: boolean,
): Promise<void> {
  await prisma.emailPreference.upsert({
    where: { userId_type: { userId, type } },
    create: { userId, type, enabled },
    update: { enabled },
  });
}
