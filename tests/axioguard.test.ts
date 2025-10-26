import MockAdapter from 'axios-mock-adapter';
import { Axioguard } from '../src/axioguard';
import { AxioguardError } from '../src/errors/AxioguardError';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('Axioguard', () => {
  it('returns cached response on subsequent requests', async () => {
    const api = new Axioguard({ cache: { enabled: true } });
    const mock = new MockAdapter(api.axios);

    mock.onGet('/users').reply(200, { id: 1 });

    const first = await api.get<{ id: number }>('/users', { cache: true });
    expect(first.data.id).toBe(1);
    expect(mock.history.get).toHaveLength(1);

    const second = await api.get<{ id: number }>('/users', { cache: true });
    expect(second.data.id).toBe(1);
    expect(mock.history.get).toHaveLength(1);

    const stats = api.getCacheStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.writes).toBe(1);

    mock.restore();
  });

  it('expires cache entries based on TTL', async () => {
    const api = new Axioguard({ cache: { enabled: true, defaultTTL: 10 } });
    const mock = new MockAdapter(api.axios);

    mock.onGet('/ttl').replyOnce(200, { value: 1 });
    mock.onGet('/ttl').reply(200, { value: 2 });

    const first = await api.get<{ value: number }>('/ttl', { cache: true });
    expect(first.data.value).toBe(1);

    await wait(20);

    const second = await api.get<{ value: number }>('/ttl', { cache: true });
    expect(second.data.value).toBe(2);
    expect(mock.history.get).toHaveLength(2);

    mock.restore();
  });

  it('deduplicates identical concurrent requests', async () => {
    const api = new Axioguard({ deduplicate: true });
    const mock = new MockAdapter(api.axios);
    let callCount = 0;

    mock.onGet('/dedupe').reply(async () => {
      callCount += 1;
      await wait(10);
      return [200, { ok: true }];
    });

    const [first, second] = await Promise.all([
      api.get<{ ok: boolean }>('/dedupe', { deduplicate: true }),
      api.get<{ ok: boolean }>('/dedupe', { deduplicate: true })
    ]);

    expect(first.data.ok).toBe(true);
    expect(second.data.ok).toBe(true);
    expect(callCount).toBe(1);

    mock.restore();
  });

  it('supports custom cache keys and manual invalidation', async () => {
    const api = new Axioguard({ cache: { enabled: true } });
    const mock = new MockAdapter(api.axios);
    let counter = 0;

    mock.onGet('/custom').reply(() => {
      counter += 1;
      return [200, { counter }];
    });

    const cacheKey = 'custom-key';
    const first = await api.get<{ counter: number }>('/custom', { cache: true, cacheKey });
    expect(first.data.counter).toBe(1);

    const second = await api.get<{ counter: number }>('/custom', { cache: true, cacheKey });
    expect(second.data.counter).toBe(1);

    await api.removeCacheByKey(cacheKey);

    const third = await api.get<{ counter: number }>('/custom', { cache: true, cacheKey });
    expect(third.data.counter).toBe(2);

    mock.restore();
  });

  it('wraps errors into AxioguardError', async () => {
    const api = new Axioguard();
    const mock = new MockAdapter(api.axios);

    mock.onGet('/error').reply(500);

    await expect(api.get('/error')).rejects.toBeInstanceOf(AxioguardError);

    mock.restore();
  });
});
