import { signAccessToken, verifyAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/auth';

const payload = { userId: 'abc123', email: 'test@example.com', role: 'CUSTOMER' as const };

describe('auth token utilities', () => {
  describe('signAccessToken / verifyAccessToken', () => {
    it('signs and verifies a valid access token', () => {
      const token    = signAccessToken(payload);
      const decoded  = verifyAccessToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('throws on an invalid access token', () => {
      expect(() => verifyAccessToken('bad.token.here')).toThrow();
    });

    it('throws when the access token is signed with the wrong secret', () => {
      const token = signRefreshToken(payload);   // wrong secret
      expect(() => verifyAccessToken(token)).toThrow();
    });
  });

  describe('signRefreshToken / verifyRefreshToken', () => {
    it('signs and verifies a valid refresh token', () => {
      const token   = signRefreshToken(payload);
      const decoded = verifyRefreshToken(token);
      expect(decoded.userId).toBe(payload.userId);
    });

    it('throws on an invalid refresh token', () => {
      expect(() => verifyRefreshToken('garbage')).toThrow();
    });
  });
});
