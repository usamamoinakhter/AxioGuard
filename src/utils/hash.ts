import type { AxiosRequestConfig } from 'axios';

type Serializable = string | number | boolean | null | undefined | Serializable[] | { [key: string]: Serializable };

const stableStringify = (value: Serializable): string => {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key] as Serializable)}`);
  return `{${entries.join(',')}}`;
};

const simpleHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `h${(hash >>> 0).toString(16)}`;
};

export interface CacheKeyOptions {
  includeHeaders?: boolean;
  customKey?: string;
}

export const createCacheKey = (
  config: AxiosRequestConfig,
  options: CacheKeyOptions = {}
): string => {
  if (options.customKey) {
    return options.customKey;
  }

  const method = (config.method ?? 'get').toUpperCase();
  const url = config.url ?? '';
  const params = stableStringify((config.params ?? {}) as Serializable);
  const data = stableStringify((config.data ?? {}) as Serializable);
  const headers = options.includeHeaders ? stableStringify((config.headers ?? {}) as Serializable) : '';

  const base = `${method}|${url}|${params}|${data}|${headers}`;
  return `axioguard:${simpleHash(base)}`;
};

export const serializeDeterministic = (value: unknown): string => {
  return stableStringify(value as Serializable);
};
