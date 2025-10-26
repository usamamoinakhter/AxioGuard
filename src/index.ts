import { Axioguard as AxioguardClass } from './axioguard';

export { AxioguardClass as Axioguard };
export type { CacheStatistics } from './axioguard';
export { MemoryCacheAdapter } from './cache/MemoryCacheAdapter';
export { LocalStorageCacheAdapter } from './cache/LocalStorageCacheAdapter';
export type { CacheAdapter } from './cache/CacheAdapter';
export * from './types';
export { AxioguardError } from './errors/AxioguardError';

export const axioguard = new AxioguardClass();
