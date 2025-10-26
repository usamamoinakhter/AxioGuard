export const DEFAULT_CACHE_TTL = 60_000;

export const resolveTTL = (ttl: number | undefined, fallback: number): number => {
  if (typeof ttl === 'number' && Number.isFinite(ttl) && ttl >= 0) {
    return ttl;
  }

  return fallback;
};
