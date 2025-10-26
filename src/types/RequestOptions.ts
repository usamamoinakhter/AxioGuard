import type { AxiosRequestConfig } from 'axios';

export interface AxioguardRequestConfig<D = any> extends AxiosRequestConfig<D> {
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  deduplicate?: boolean;
}
