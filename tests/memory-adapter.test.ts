import { MemoryCacheAdapter } from '../src/cache/MemoryCacheAdapter';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('MemoryCacheAdapter', () => {
  it('stores and retrieves values', async () => {
    const adapter = new MemoryCacheAdapter();
    await adapter.set('key', { value: 42 }, 1000);

    const result = await adapter.get<{ value: number }>('key');
    expect(result).toEqual({ value: 42 });
  });

  it('expires values after ttl', async () => {
    const adapter = new MemoryCacheAdapter();
    await adapter.set('key', { value: 42 }, 5);

    await wait(10);

    const result = await adapter.get('key');
    expect(result).toBeUndefined();
  });

  it('clears all entries', async () => {
    const adapter = new MemoryCacheAdapter();
    await adapter.set('key', 'value', 1000);

    await adapter.clear();

    const result = await adapter.get('key');
    expect(result).toBeUndefined();
  });
});
