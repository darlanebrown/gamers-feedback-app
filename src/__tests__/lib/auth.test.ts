import { signToken, verifyToken } from '@/lib/auth';

describe('signToken / verifyToken', () => {
  const payload = { id: 'u1', email: 'darla@test.com', gamerTag: 'Darla#1' };

  it('round-trips a valid payload', async () => {
    const token = await signToken(payload);
    const result = await verifyToken(token);
    expect(result?.id).toBe(payload.id);
    expect(result?.email).toBe(payload.email);
    expect(result?.gamerTag).toBe(payload.gamerTag);
  });

  it('returns null for a tampered token', async () => {
    const token = await signToken(payload);
    const result = await verifyToken(token + 'tampered');
    expect(result).toBeNull();
  });

  it('returns null for an empty string', async () => {
    const result = await verifyToken('');
    expect(result).toBeNull();
  });

  it('returns null for a random string', async () => {
    const result = await verifyToken('not.a.jwt');
    expect(result).toBeNull();
  });

  it('produced token is a three-part JWT string', async () => {
    const token = await signToken(payload);
    expect(token.split('.')).toHaveLength(3);
  });
});
