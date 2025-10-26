# Axioguard

Axioguard is a production-ready, fully typed Axios wrapper that adds intelligent response caching and optional request deduplication to any JavaScript or TypeScript project. It reduces redundant network calls, helps teams control API spend, and keeps codebases clean with a simple, well-documented API.

## Key Features

- **Deterministic caching** – Cache any Axios request with configurable TTLs and deterministic cache keys.
- **Request deduplication** – Reuse an in-flight request when identical calls are made in parallel.
- **Pluggable adapters** – Use the built-in in-memory or localStorage adapters, or plug in custom storage backends.
- **Graceful fallbacks** – Cache failures never surface as runtime errors; Axioguard automatically falls back to live requests.
- **Typed from top to bottom** – Written in TypeScript with generated declaration files for first-class DX.
- **Helpful diagnostics** – Optional debug logging and cache statistics to aid profiling and troubleshooting.

## Installation

```bash
npm install axioguard
```

## Quick Start

```ts
import { axioguard } from 'axioguard';

async function loadUsers() {
  const response = await axioguard.get('/users', {
    cache: true,
    cacheTTL: 60_000,
  });

  return response.data;
}
```

## Global Configuration

Create a dedicated instance when you need custom defaults, interceptors, or global cache policies.

```ts
import { Axioguard, MemoryCacheAdapter } from 'axioguard';

const api = new Axioguard({
  baseURL: 'https://api.example.com',
  cache: {
    enabled: true,
    adapter: new MemoryCacheAdapter(),
    defaultTTL: 120_000,
    includeHeaders: false,
  },
  deduplicate: true,
  debug: true,
});

api.axios.interceptors.request.use((config) => ({
  ...config,
  headers: {
    ...config.headers,
    Authorization: 'Bearer token',
  },
}));
```

## Per-request Options

Every method accepts the full `AxiosRequestConfig` alongside Axioguard additions:

```ts
await api.post('/reports', payload, {
  cache: true,
  cacheTTL: 5 * 60_000,
  cacheKey: 'reports:list',
  deduplicate: false,
});
```

Per-request options always override global configuration.

## Custom Cache Adapters

Implement the `CacheAdapter` interface to connect Redis, IndexedDB, or any other storage engine.

```ts
import type { CacheAdapter } from 'axioguard';

class RedisCacheAdapter implements CacheAdapter {
  constructor(private readonly client: RedisClient) {}

  async get<T>(key: string) {
    const raw = await this.client.get(key);
    return raw ? JSON.parse(raw) as T : undefined;
  }

  async set<T>(key: string, value: T, ttl: number) {
    const payload = JSON.stringify(value);
    if (ttl > 0) {
      await this.client.setEx(key, Math.ceil(ttl / 1000), payload);
    } else {
      await this.client.set(key, payload);
    }
  }

  async delete(key: string) {
    await this.client.del(key);
  }

  async clear() {
    await this.client.flushAll();
  }
}

const api = new Axioguard({
  cache: { enabled: true, adapter: new RedisCacheAdapter(redis) },
});
```

Switch adapters on the fly:

```ts
api.setAdapter('localStorage');
```

## API Reference

### Constructors

- `new Axioguard(options?: AxioguardOptions)` – create a configured instance.

### Core Methods

- `request(config)` – Execute a request with caching/deduplication support.
- `get`, `post`, `put`, `patch`, `delete`, `head`, `options` – Standard Axios methods supporting all Axioguard extras.

### Utility Methods

- `clearCache()` – Remove all cached entries.
- `removeCacheByKey(key)` – Delete a single cached response.
- `setAdapter(adapter)` – Switch the cache adapter at runtime (`'memory'`, `'localStorage'`, or a custom adapter).
- `setCacheOptions(options)` – Update cache defaults.
- `setDebug(enabled)` – Toggle diagnostic logging.
- `getCacheStats()` – Retrieve hit/miss/write/delete counters.
- `axios` – Access the underlying Axios instance for interceptors or advanced configuration.

### Configuration Types

```ts
interface CacheConfiguration {
  enabled?: boolean;
  adapter?: CacheAdapter | 'memory' | 'localStorage';
  defaultTTL?: number;
  includeHeaders?: boolean;
}

interface AxioguardOptions extends AxiosRequestConfig {
  cache?: CacheConfiguration;
  deduplicate?: boolean;
  debug?: boolean;
}

interface AxioguardRequestConfig<D = any> extends AxiosRequestConfig<D> {
  cache?: boolean;
  cacheTTL?: number;
  cacheKey?: string;
  deduplicate?: boolean;
}
```

## Examples

### LocalStorage Caching (Browser)

```ts
import { Axioguard } from 'axioguard';

const browserApi = new Axioguard({
  baseURL: '/api',
  cache: { enabled: true, adapter: 'localStorage', defaultTTL: 30_000 },
});

await browserApi.get('/profile', { cache: true });
```

### Node.js Service with Deduplication

```ts
import { Axioguard } from 'axioguard';

const serviceApi = new Axioguard({
  baseURL: 'https://api.partner.com',
  cache: { enabled: true },
  deduplicate: true,
});

const [a, b] = await Promise.all([
  serviceApi.get('/expensive', { cache: true, deduplicate: true }),
  serviceApi.get('/expensive', { cache: true, deduplicate: true }),
]);
```

### React Query Integration

```ts
import { axioguard } from 'axioguard';
import { useQuery } from '@tanstack/react-query';

function useUsers() {
  return useQuery(['users'], async () => {
    const response = await axioguard.get('/users', { cache: true });
    return response.data;
  });
}
```

## TypeScript Support

Axioguard is authored in TypeScript and ships with `.d.ts` definitions and source maps. All public APIs are typed, and Axios generics flow through seamlessly for fully inferred response types.

## Testing

The project uses Jest with extensive coverage for caching logic, adapters, deduplication, and error handling. Run the test suite with:

```bash
npm test
```

## Building

Axioguard ships both ESM and CommonJS bundles via `tsup`.

```bash
npm run build
```

## License

[MIT](./LICENSE)
