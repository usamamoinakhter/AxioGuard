import { CacheAdapter, CacheRecord } from './CacheAdapter';

const isLocalStorageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }

    const testKey = '__axioguard_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

export class LocalStorageCacheAdapter implements CacheAdapter {
  private readonly storage: Storage | null;

  constructor(storage?: Storage) {
    if (storage) {
      this.storage = storage;
    } else if (isLocalStorageAvailable()) {
      this.storage = window.localStorage;
    } else {
      this.storage = null;
    }
  }

  private getStorage(): Storage | null {
    return this.storage;
  }

  async get<T = unknown>(key: string): Promise<T | undefined> {
    const storage = this.getStorage();
    if (!storage) {
      return undefined;
    }

    try {
      const raw = storage.getItem(key);
      if (!raw) {
        return undefined;
      }

      const record = JSON.parse(raw) as CacheRecord<T>;
      if (record.expiresAt !== null && record.expiresAt <= Date.now()) {
        storage.removeItem(key);
        return undefined;
      }

      return record.value;
    } catch (error) {
      return undefined;
    }
  }

  async set<T = unknown>(key: string, value: T, ttl: number): Promise<void> {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    const record: CacheRecord<T> = {
      value,
      expiresAt: ttl > 0 ? Date.now() + ttl : null
    };

    try {
      storage.setItem(key, JSON.stringify(record));
    } catch (error) {
      // Swallow storage errors (quota, etc.)
    }
  }

  async delete(key: string): Promise<void> {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(key);
  }

  async clear(): Promise<void> {
    const storage = this.getStorage();
    if (!storage) {
      return;
    }

    storage.clear();
  }
}
