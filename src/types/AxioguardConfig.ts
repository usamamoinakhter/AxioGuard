import type { AxiosRequestConfig } from 'axios';
import type { CacheAdapter } from '../cache/CacheAdapter';

export interface CacheConfiguration {
  enabled?: boolean;
  adapter?: CacheAdapter | 'memory' | 'localStorage';
  defaultTTL?: number;
  includeHeaders?: boolean;
}

export interface AxioguardOptions extends AxiosRequestConfig {
  cache?: CacheConfiguration;
  deduplicate?: boolean;
  debug?: boolean;
}
