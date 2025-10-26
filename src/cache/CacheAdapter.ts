export interface CacheRecord<T = unknown> {
  value: T;
  expiresAt: number | null;
}

export interface CacheAdapter {
  get<T = unknown>(key: string): Promise<T | undefined> | T | undefined;
  set<T = unknown>(key: string, value: T, ttl: number): Promise<void> | void;
  delete(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}
