import { prisma } from './prisma';

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  gamerTag: string;
  displayName: string | null;
  bio: string | null;
  role: string;
  banned: boolean;
  banReason:   string | null;
  bannedUntil: Date | null;
  createdAt: Date;
};

export type PublicUser = Omit<User, 'passwordHash'>;

export async function createUser(
  email: string,
  passwordHash: string,
  gamerTag: string,
  role: string = 'user',
): Promise<User> {
  return prisma.user.create({ data: { email, passwordHash, gamerTag, role } }) as Promise<User>;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } }) as Promise<User | null>;
}

export async function findUserByTag(gamerTag: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { gamerTag } }) as Promise<User | null>;
}

export async function getAllUsers(): Promise<PublicUser[]> {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  return users.map(({ passwordHash: _, ...u }) => u) as PublicUser[];
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } }) as Promise<User | null>;
}

export async function updateUserById(
  id: string,
  data: Partial<Pick<User, 'role' | 'banned' | 'passwordHash'>>,
): Promise<PublicUser> {
  const updated = await prisma.user.update({ where: { id }, data });
  const { passwordHash: _, ...rest } = updated as unknown as User;
  return rest as PublicUser;
}

// Alias used by several routes
export const getUserByTag = findUserByTag;

export async function promoteUserByTag(gamerTag: string): Promise<PublicUser> {
  const updated = await prisma.user.update({ where: { gamerTag }, data: { role: 'admin' } });
  const { passwordHash: _, ...rest } = updated as unknown as User;
  return rest as PublicUser;
}

export async function updateUserByTag(
  gamerTag: string,
  data: Partial<Pick<User, 'displayName' | 'bio' | 'role' | 'banned'>>,
): Promise<PublicUser> {
  const updated = await (prisma.user as any).update({ where: { gamerTag }, data });
  const { passwordHash: _, ...rest } = updated as User;
  return rest as PublicUser;
}

export async function countUsers(): Promise<number> {
  return prisma.user.count();
}

export type ProfileUpdate = {
  displayName?: string;
  bio?: string;
  passwordHash?: string;
};

export async function updateProfile(id: string, data: ProfileUpdate): Promise<PublicUser> {
  const updated = await prisma.user.update({ where: { id }, data });
  const { passwordHash: _, ...rest } = updated as unknown as User;
  return rest as PublicUser;
}

export async function anonymizeUser(id: string): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: {
      email: `deleted_${id}@deleted.invalid`,
      passwordHash: '',
      displayName: null,
      bio: null,
      banned: true,
    },
  });
}

export interface BanOptions {
  banReason?:   string;
  bannedUntil?: Date;
}

export async function banUserByTag(gamerTag: string, opts: BanOptions = {}): Promise<PublicUser> {
  const user = await (prisma.user as any).update({
    where: { gamerTag },
    data:  { banned: true, banReason: opts.banReason ?? null, bannedUntil: opts.bannedUntil ?? null },
  });
  const { passwordHash: _, ...pub } = user;
  return pub as PublicUser;
}

export async function unbanUserByTag(gamerTag: string): Promise<PublicUser> {
  const user = await (prisma.user as any).update({
    where: { gamerTag },
    data:  { banned: false, banReason: null, bannedUntil: null },
  });
  const { passwordHash: _, ...pub } = user;
  return pub as PublicUser;
}

export async function searchUsers(q: string, limit: number): Promise<PublicUser[]> {
  const rows = await prisma.user.findMany({
    where:   { gamerTag: { contains: q, mode: 'insensitive' }, banned: false },
    orderBy: { gamerTag: 'asc' },
    take:    limit,
  });
  return rows.map(({ passwordHash: _, ...pub }) => pub as PublicUser);
}
