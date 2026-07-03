import { prisma } from './prisma';

export interface NotificationPreferences {
  gamerTag:        string;
  newFollower:     boolean;
  tipReceived:     boolean;
  commentOnReview: boolean;
  mention:         boolean;
  newGameReview:   boolean;
  replyToComment:  boolean;
}

const DEFAULTS: Omit<NotificationPreferences, 'gamerTag'> = {
  newFollower:     true,
  tipReceived:     true,
  commentOnReview: true,
  mention:         true,
  newGameReview:   true,
  replyToComment:  true,
};

function toPrefs(r: any): NotificationPreferences {
  return {
    gamerTag:        r.gamerTag,
    newFollower:     r.newFollower,
    tipReceived:     r.tipReceived,
    commentOnReview: r.commentOnReview,
    mention:         r.mention,
    newGameReview:   r.newGameReview,
    replyToComment:  r.replyToComment,
  };
}

export async function getPreferences(gamerTag: string): Promise<NotificationPreferences> {
  const row = await (prisma as any).notificationPreference.findUnique({ where: { gamerTag } });
  if (row) return toPrefs(row);
  return { gamerTag, ...DEFAULTS };
}

export async function upsertPreferences(
  gamerTag: string,
  updates: Partial<Omit<NotificationPreferences, 'gamerTag'>>,
): Promise<NotificationPreferences> {
  const row = await (prisma as any).notificationPreference.upsert({
    where:  { gamerTag },
    create: { gamerTag, ...DEFAULTS, ...updates },
    update: updates,
  });
  return toPrefs(row);
}
