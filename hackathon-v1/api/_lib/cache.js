export function createTtlCache({ ttlMs, maxSize = 200 } = {}) {
  const store = new Map();

  function pruneExpired(now = Date.now()) {
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
    while (store.size > maxSize) {
      const oldest = store.keys().next().value;
      store.delete(oldest);
    }
  }

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value, ttl = ttlMs) {
      if (store.has(key)) store.delete(key);
      store.set(key, { value, expiresAt: Date.now() + ttl });
      pruneExpired();
      return value;
    },
    has(key) {
      return this.get(key) !== undefined;
    },
    delete(key) {
      return store.delete(key);
    },
    clear() {
      store.clear();
    },
    get size() {
      pruneExpired();
      return store.size;
    },
  };
}

export function roundCoord(value, decimals = 3) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

export function placesCacheKey({ lat, lng, radius, bounds }) {
  if (bounds) {
    return [
      'bbox',
      roundCoord(bounds.south),
      roundCoord(bounds.west),
      roundCoord(bounds.north),
      roundCoord(bounds.east),
    ].join(':');
  }
  return ['around', roundCoord(lat), roundCoord(lng), Math.round(Number(radius) || 0)].join(':');
}
