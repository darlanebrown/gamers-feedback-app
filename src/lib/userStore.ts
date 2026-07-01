import { prisma } from './prisma';

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  gamerTag: string;
  createdAt: Date;
};

export async function createUser(
  email: string,
  passwordHash: string,
  gamerTag: string,
): Promise<User> {
  return prisma.user.create({ data: { email, passwordHash, gamerTag } }) as Promise<User>;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } }) as Promise<User | null>;
}

export async function findUserByTag(gamerTag: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { gamerTag } }) as Promise<User | null>;
}
