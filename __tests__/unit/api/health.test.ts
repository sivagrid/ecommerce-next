/**
 * @jest-environment node
 */
import { GET } from '@/app/api/health/route';

jest.mock('@/lib/db',    () => ({ connectDB: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/redis', () => ({
  connectRedis: jest.fn(),
  cache: { isAvailable: true },
}));

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('ok');
    expect(body.data).toHaveProperty('timestamp');
  });
});
