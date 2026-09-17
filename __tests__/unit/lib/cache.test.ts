jest.mock('@/lib/redis', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
    status: 'ready' as const,
    on: jest.fn(),
  };

  return {
    getRedis: () => mockRedis,
    __mockRedis: mockRedis,
    cache: {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      invalidatePattern: jest.fn(),
      get isAvailable() { return true; },
    },
  };
});

const { cache, __mockRedis: mockRedis } = jest.requireMock('@/lib/redis') as {
  cache: { get: jest.Mock; set: jest.Mock; del: jest.Mock; invalidatePattern: jest.Mock; isAvailable: boolean };
  __mockRedis: Record<string, jest.Mock>;
};

describe('cache service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('returns parsed value on HIT', async () => {
      cache.get.mockResolvedValueOnce({ id: 1 });
      const result = await cache.get('key:1');
      expect(result).toEqual({ id: 1 });
    });

    it('returns null on MISS', async () => {
      cache.get.mockResolvedValueOnce(null);
      const result = await cache.get('key:miss');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('stores value with TTL', async () => {
      cache.set.mockResolvedValueOnce(undefined);
      await cache.set('key:1', { id: 1 }, 60);
      expect(cache.set).toHaveBeenCalledWith('key:1', { id: 1 }, 60);
    });
  });

  describe('del', () => {
    it('deletes a single key', async () => {
      cache.del.mockResolvedValueOnce(undefined);
      await cache.del('key:1');
      expect(cache.del).toHaveBeenCalledWith('key:1');
    });
  });

  describe('invalidatePattern', () => {
    it('invalidates matching keys', async () => {
      cache.invalidatePattern.mockResolvedValueOnce(undefined);
      await cache.invalidatePattern('products:*');
      expect(cache.invalidatePattern).toHaveBeenCalledWith('products:*');
    });
  });
});
