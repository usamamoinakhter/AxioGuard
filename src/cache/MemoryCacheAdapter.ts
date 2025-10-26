import { CacheAdapter, CacheRecord } from './CacheAdapter';

export class MemoryCacheAdapter implements CacheAdapter {
  private store = new Map<string, CacheRecord>();

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const record = this.store.get(key);
    if (!record) {
      return undefined;
    }

    if (record.expiresAt !== null && record.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return record.value as T;
  }

  async set<T = unknown>(key: string, value: T, ttl: number): Promise<void> {
    const expiresAt = ttl > 0 ? Date.now() + ttl : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
