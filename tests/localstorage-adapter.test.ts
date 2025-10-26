import { LocalStorageCacheAdapter } from '../src/cache/LocalStorageCacheAdapter';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('LocalStorageCacheAdapter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores and retrieves values', async () => {
    const adapter = new LocalStorageCacheAdapter(window.localStorage);
    await adapter.set('key', { value: 'test' }, 1000);

    const result = await adapter.get<{ value: string }>('key');
    expect(result).toEqual({ value: 'test' });
  });

  it('expires values', async () => {
    const adapter = new LocalStorageCacheAdapter(window.localStorage);
    await adapter.set('key', { value: 'test' }, 5);

    await wait(10);

    const result = await adapter.get('key');
    expect(result).toBeUndefined();
  });

  it('clears entries', async () => {
    const adapter = new LocalStorageCacheAdapter(window.localStorage);
    await adapter.set('key', 'value', 1000);

    await adapter.clear();

    const result = await adapter.get('key');
    expect(result).toBeUndefined();
  });
});
