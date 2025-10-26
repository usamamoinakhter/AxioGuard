import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, isAxiosError } from 'axios';
import type { CacheAdapter } from './cache/CacheAdapter';
import { MemoryCacheAdapter } from './cache/MemoryCacheAdapter';
import { LocalStorageCacheAdapter } from './cache/LocalStorageCacheAdapter';
import { createCacheKey } from './utils/hash';
import { Logger } from './utils/logger';
import { DEFAULT_CACHE_TTL, resolveTTL } from './utils/ttl';
import { AxioguardError } from './errors/AxioguardError';
import type { AxioguardOptions, CacheConfiguration } from './types/AxioguardConfig';
import type { AxioguardRequestConfig } from './types/RequestOptions';

export interface CacheStatistics {
  hits: number;
  misses: number;
  writes: number;
  deletes: number;
}

const defaultStats = (): CacheStatistics => ({ hits: 0, misses: 0, writes: 0, deletes: 0 });

export class Axioguard {
  private readonly axiosInstance: AxiosInstance;

  private cacheAdapter: CacheAdapter;

  private cacheSettings: CacheConfiguration;

  private readonly inFlightRequests = new Map<string, Promise<AxiosResponse>>();

  private readonly logger: Logger;

  private readonly cacheStats: CacheStatistics = defaultStats();

  private deduplicateRequests: boolean;

  private defaultTTL: number;

  constructor(options: AxioguardOptions = {}) {
    this.axiosInstance = axios.create(options);
    this.cacheSettings = options.cache ?? {};
    this.cacheAdapter = this.resolveAdapter(this.cacheSettings.adapter);
    this.deduplicateRequests = options.deduplicate ?? false;
    this.logger = new Logger(options.debug ?? false);
    this.defaultTTL = this.cacheSettings.defaultTTL ?? DEFAULT_CACHE_TTL;
  }

  private resolveAdapter(adapter?: CacheAdapter | 'memory' | 'localStorage'): CacheAdapter {
    if (!adapter || adapter === 'memory') {
      return new MemoryCacheAdapter();
    }

    if (adapter === 'localStorage') {
      return new LocalStorageCacheAdapter();
    }

    return adapter;
  }

  setAdapter(adapter: CacheAdapter | 'memory' | 'localStorage'): void {
    this.cacheAdapter = this.resolveAdapter(adapter);
    this.cacheSettings = {
      ...this.cacheSettings,
      adapter
    };
  }

  setDebug(enabled: boolean): void {
    this.logger.setEnabled(enabled);
  }

  setCacheOptions(cache: CacheConfiguration): void {
    this.cacheSettings = { ...this.cacheSettings, ...cache };
    this.defaultTTL = this.cacheSettings.defaultTTL ?? DEFAULT_CACHE_TTL;
    if (cache.adapter) {
      this.cacheAdapter = this.resolveAdapter(cache.adapter);
    }
  }

  get axios(): AxiosInstance {
    return this.axiosInstance;
  }

  async clearCache(): Promise<void> {
    try {
      await this.cacheAdapter.clear();
    } catch (error) {
      this.logger.warn('Failed to clear cache', error);
    }
  }

  async removeCacheByKey(key: string): Promise<void> {
    try {
      await this.cacheAdapter.delete(key);
      this.cacheStats.deletes += 1;
    } catch (error) {
      this.logger.warn(`Failed to delete cache entry for key ${key}`, error);
    }
  }

  getCacheStats(): CacheStatistics {
    return { ...this.cacheStats };
  }

  async request<T = unknown, D = unknown>(config: AxioguardRequestConfig<D>): Promise<AxiosResponse<T>> {
    const {
      cache: cacheRequested,
      cacheTTL,
      cacheKey: customCacheKey,
      deduplicate: dedupeRequested,
      ...rest
    } = config;

    const axiosConfig: AxiosRequestConfig<D> = { ...rest };

    const cacheEnabled = cacheRequested ?? this.cacheSettings.enabled ?? false;
    const dedupeEnabled = dedupeRequested ?? this.deduplicateRequests;
    const ttl = resolveTTL(cacheTTL, this.cacheSettings.defaultTTL ?? this.defaultTTL ?? DEFAULT_CACHE_TTL);

    const cacheKey = createCacheKey(axiosConfig, {
      includeHeaders: this.cacheSettings.includeHeaders,
      customKey: customCacheKey
    });

    if (cacheEnabled) {
      try {
        const cached = await this.cacheAdapter.get<AxiosResponse<T>>(cacheKey);
        if (cached) {
          this.cacheStats.hits += 1;
          this.logger.debug(`Cache HIT: ${axiosConfig.method ?? 'get'} ${axiosConfig.url ?? ''}`);
          return cached;
        }

        this.cacheStats.misses += 1;
        this.logger.debug(`Cache MISS: ${axiosConfig.method ?? 'get'} ${axiosConfig.url ?? ''}`);
      } catch (error) {
        this.logger.warn('Cache read failed', error);
      }
    }

    if (dedupeEnabled) {
      const inFlight = this.inFlightRequests.get(cacheKey);
      if (inFlight) {
        this.logger.debug(`Deduplicated request for key ${cacheKey}`);
        return inFlight as Promise<AxiosResponse<T>>;
      }
    }

    const requestPromise = this.axiosInstance
      .request<T, AxiosResponse<T, D>, D>(axiosConfig)
      .then(async (response) => {
        if (cacheEnabled) {
          try {
            await this.cacheAdapter.set(cacheKey, response, ttl);
            this.cacheStats.writes += 1;
            this.logger.debug(`Cache STORE: ${axiosConfig.method ?? 'get'} ${axiosConfig.url ?? ''}`);
          } catch (error) {
            this.logger.warn('Cache write failed', error);
          }
        }

        return response;
      })
      .catch((error: unknown) => {
        if (isAxiosError(error)) {
          throw new AxioguardError(error.message, error.config ?? axiosConfig, {
            code: error.code,
            request: error.request,
            response: error.response,
            cause: error
          });
        }

        throw new AxioguardError('Request failed', axiosConfig, { cause: error });
      })
      .finally(() => {
        if (dedupeEnabled) {
          this.inFlightRequests.delete(cacheKey);
        }
      });

    if (dedupeEnabled) {
      this.inFlightRequests.set(cacheKey, requestPromise as Promise<AxiosResponse>);
    }

    return requestPromise;
  }

  get<T = unknown, D = unknown>(url: string, config: AxioguardRequestConfig<D> = {}): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: 'get', url });
  }

  delete<T = unknown, D = unknown>(url: string, config: AxioguardRequestConfig<D> = {}): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: 'delete', url });
  }

  head<T = unknown, D = unknown>(url: string, config: AxioguardRequestConfig<D> = {}): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: 'head', url });
  }

  options<T = unknown, D = unknown>(url: string, config: AxioguardRequestConfig<D> = {}): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: 'options', url });
  }

  post<T = unknown, D = unknown>(url: string, data?: D, config: AxioguardRequestConfig<D> = {}): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: 'post', url, data });
  }

  put<T = unknown, D = unknown>(url: string, data?: D, config: AxioguardRequestConfig<D> = {}): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: 'put', url, data });
  }

  patch<T = unknown, D = unknown>(url: string, data?: D, config: AxioguardRequestConfig<D> = {}): Promise<AxiosResponse<T>> {
    return this.request<T, D>({ ...config, method: 'patch', url, data });
  }
}
