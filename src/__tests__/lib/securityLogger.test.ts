import { logSecurityEvent } from '@/lib/securityLogger';

describe('logSecurityEvent', () => {
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it('writes a JSON line prefixed with [SECURITY] to stderr', () => {
    logSecurityEvent('login_failed', '127.0.0.1');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toMatch(/^\[SECURITY\]/);
    const parsed = JSON.parse(output.replace('[SECURITY] ', ''));
    expect(parsed.event).toBe('login_failed');
    expect(parsed.actor).toBe('127.0.0.1');
  });

  it('includes target and detail when provided', () => {
    logSecurityEvent('admin_ban', 'Admin#1', 'u-abc123', 'repeated spam');

    const output = stderrSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.replace('[SECURITY] ', ''));
    expect(parsed.target).toBe('u-abc123');
    expect(parsed.detail).toBe('repeated spam');
  });

  it('includes a valid ISO timestamp', () => {
    logSecurityEvent('rate_limit_exceeded', 'Darla#1');

    const output = stderrSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.replace('[SECURITY] ', ''));
    expect(() => new Date(parsed.timestamp)).not.toThrow();
    expect(parsed.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('omits undefined target and detail from JSON', () => {
    logSecurityEvent('flag_submitted', 'Player#1', 'r-xyz');

    const output = stderrSpy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output.replace('[SECURITY] ', ''));
    expect(parsed.target).toBe('r-xyz');
    expect('detail' in parsed).toBe(false);
  });
});
