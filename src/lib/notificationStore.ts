import { prisma } from './prisma';

export type Notification = {
  id: string;
  userTag: string;
  type: string;
  actorTag: string | null;
  reviewId: string | null;
  gameTitle: string | null;
  read: boolean;
  createdAt: Date;
};

export type NotificationType = 'follow' | 'vote_up' | 'vote_down' | 'reclassify' | 'comment' | 'tip' | 'reply';

export async function createNotification(
  userTag: string,
  type: NotificationType,
  actorTag?: string,
  reviewId?: string,
  gameTitle?: string,
): Promise<Notification> {
  return prisma.notification.create({
    data: { userTag, type, actorTag, reviewId, gameTitle },
  }) as Promise<Notification>;
}

export async function getNotifications(
  userTag: string,
  { skip = 0, take = 20 }: { skip?: number; take?: number } = {},
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: { userTag },
    orderBy: { createdAt: 'desc' },
    skip,
    take,
  }) as Promise<Notification[]>;
}

export async function countNotifications(userTag: string): Promise<number> {
  return prisma.notification.count({ where: { userTag } });
}

export async function getUnreadCount(userTag: string): Promise<number> {
  return prisma.notification.count({ where: { userTag, read: false } });
}

export async function markAllRead(userTag: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userTag, read: false },
    data: { read: true },
  });
}

export async function markRead(id: string): Promise<void> {
  await prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markManyRead(ids: string[]): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: { in: ids } },
    data:  { read: true },
  });
}
