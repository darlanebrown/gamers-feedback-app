import { prisma } from './prisma';
import { randomBytes } from 'crypto';

export interface PasswordResetRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export async function createPasswordReset(userId: string): Promise<PasswordResetRecord> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return prisma.passwordReset.create({ data: { userId, token, expiresAt } });
}

export async function findValidReset(token: string): Promise<PasswordResetRecord | null> {
  const record = await prisma.passwordReset.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) return null;
  return record;
}

export async function markResetUsed(id: string): Promise<void> {
  await prisma.passwordReset.update({ where: { id }, data: { used: true } });
}
