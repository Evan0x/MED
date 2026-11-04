import { describe, expect, it } from 'vitest';
import { createTtlCache, placesCacheKey, roundCoord } from './cache.js';

describe('createTtlCache', () => {
  it('stores and returns values before expiry', () => {
    const cache = createTtlCache({ ttlMs: 10_000 });
    cache.set('a', { ok: true });
    expect(cache.get('a')).toEqual({ ok: true });
    expect(cache.has('a')).toBe(true);
  });

  it('expires entries after ttl', () => {
    const cache = createTtlCache({ ttlMs: 1 });
    cache.set('a', 1, 1);
    expect(cache.get('a')).toBe(1);
    const originalNow = Date.now;
    Date.now = () => originalNow() + 20;
    expect(cache.get('a')).toBeUndefined();
    Date.now = originalNow;
  });

  it('evicts oldest entries when over maxSize', () => {
    const cache = createTtlCache({ ttlMs: 60_000, maxSize: 2 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });
});

describe('placesCacheKey', () => {
  it('rounds coordinates to reduce duplicate Overpass queries', () => {
    expect(roundCoord(40.71276, 3)).toBe(40.713);
    expect(placesCacheKey({ lat: 40.7128, lng: -74.0061, radius: 4000 }))
      .toBe(placesCacheKey({ lat: 40.7129, lng: -74.0060, radius: 4000 }));
  });
});
