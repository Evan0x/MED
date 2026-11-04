import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiPost = vi.fn();
vi.mock('../api', () => ({
  apiPost: (...args) => apiPost(...args),
}));

import {
  clearLocationCache,
  debounce,
  geocodeAddress,
  searchNearby,
  shouldRefetchForMove,
  suggestAddresses,
} from './locationService.js';

describe('locationService', () => {
  beforeEach(() => {
    clearLocationCache();
    apiPost.mockReset();
  });

  it('caches nearby search results and avoids duplicate network calls', async () => {
    apiPost.mockResolvedValue({ places: [{ place_id: 'node/1' }], grouped: {} });
    const a = await searchNearby({ lat: 40.7128, lng: -74.006, radius: 4000 });
    const b = await searchNearby({ lat: 40.71281, lng: -74.00601, radius: 4000 });
    expect(a.places[0].place_id).toBe('node/1');
    expect(b).toBe(a);
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledWith('places', expect.objectContaining({ lat: 40.7128, lng: -74.006 }), expect.any(Object));
  });

  it('surfaces backend errors without caching the failure', async () => {
    apiPost.mockRejectedValueOnce(new Error('Nearby search is temporarily unavailable. Please try again.'));
    await expect(searchNearby({ lat: 1, lng: 2 })).rejects.toThrow('Nearby search is temporarily unavailable');
    apiPost.mockResolvedValueOnce({ places: [] });
    await expect(searchNearby({ lat: 1, lng: 2 })).resolves.toEqual({ places: [] });
    expect(apiPost).toHaveBeenCalledTimes(2);
  });

  it('forwards abort signals and geocode queries', async () => {
    const signal = new AbortController().signal;
    apiPost.mockResolvedValue({ address: 'Paris', lat: 48.8, lng: 2.3 });
    const result = await geocodeAddress('Paris', { signal });
    expect(result.address).toBe('Paris');
    expect(apiPost).toHaveBeenCalledWith('geocode', { action: 'forward', query: 'Paris' }, { signal });
  });

  it('skips autocomplete for short queries', async () => {
    await expect(suggestAddresses('a')).resolves.toEqual([]);
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('only refetches when the map has moved far enough', () => {
    expect(shouldRefetchForMove({ lat: 40.71, lng: -74.01 }, { lat: 40.7101, lng: -74.0101 }, 1600)).toBe(false);
    expect(shouldRefetchForMove({ lat: 40.71, lng: -74.01 }, { lat: 40.73, lng: -74.04 }, 1600)).toBe(true);
  });

  it('debounces repeated calls', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const d = debounce(fn, 300);
    d('a');
    d('b');
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('b');
    vi.useRealTimers();
  });
});
