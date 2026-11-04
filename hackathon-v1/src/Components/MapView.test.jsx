/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';

const { FakeMap, FakeMarker, FakePopup } = vi.hoisted(() => {
  class FakeMap {
    static instances = [];

    constructor(opts) {
      this.opts = opts;
      this.handlers = {};
      this.sources = {};
      this.layers = [];
      this.removed = false;
      this.zoom = 13;
      this.center = { lng: opts.center[0], lat: opts.center[1] };
      this._canvas = { style: {} };
      FakeMap.instances.push(this);
    }

    on(type, layerOrFn, maybeFn) {
      const handler = typeof layerOrFn === 'function' ? layerOrFn : maybeFn;
      const key = typeof layerOrFn === 'string' ? `${type}:${layerOrFn}` : type;
      this.handlers[key] = this.handlers[key] || [];
      this.handlers[key].push(handler);
      if (type === 'load' && typeof layerOrFn === 'function') {
        queueMicrotask(() => layerOrFn());
      }
    }

    emit(key, event) {
      (this.handlers[key] || []).forEach((fn) => fn(event));
    }

    addSource(id, src) { this.sources[id] = { ...src, setData: (data) => { this.sources[id].data = data; } }; }
    addLayer(layer) { this.layers.push(layer); }
    getSource(id) { return this.sources[id]; }
    getCanvas() { return this._canvas; }
    getZoom() { return this.zoom; }
    getCenter() { return this.center; }
    getBounds() {
      return {
        getSouth: () => 40.6,
        getWest: () => -74.1,
        getNorth: () => 40.8,
        getEast: () => -73.9,
      };
    }
    flyTo(opts) { this.fly = opts; this.center = { lng: opts.center[0], lat: opts.center[1] }; }
    easeTo(opts) { this.ease = opts; }
    zoomIn() { this.zoom += 1; }
    zoomOut() { this.zoom -= 1; }
    resize() { this.resized = true; }
    remove() { this.removed = true; }
  }

  class FakeMarker {
    setLngLat(lngLat) { this.lngLat = lngLat; return this; }
    addTo(map) { this.map = map; return this; }
    remove() { this.removed = true; }
  }

  class FakePopup {
    setLngLat(lngLat) { this.lngLat = lngLat; return this; }
    setHTML(html) { this.html = html; return this; }
    addTo(map) { this.map = map; return this; }
    remove() { this.removed = true; }
  }

  return { FakeMap, FakeMarker, FakePopup };
});

vi.mock('../location/mapEngine.js', () => ({
  ensureMapWorker() {},
  Map: FakeMap,
  Marker: FakeMarker,
  Popup: FakePopup,
}));

import MapView from './MapView.jsx';
import { mapStyleConfig, DEFAULT_STYLE_LIGHT } from '../location/tiles.js';

beforeEach(() => {
  FakeMap.instances = [];
  globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const place = {
  place_id: 'node/9',
  name: 'Harbor Clinic',
  lat: 40.71,
  lng: -74.01,
  vicinity: '12 Front St',
  categories: ['clinic'],
  opening_hours: { open_now: true },
};

describe('map style config', () => {
  it('uses OpenFreeMap vector styles with OSM attribution', () => {
    const tiles = mapStyleConfig(false);
    expect(tiles.url).toBe(DEFAULT_STYLE_LIGHT);
    expect(tiles.url).toContain('tiles.openfreemap.org/styles/');
    expect(tiles.attribution).toContain('OpenStreetMap');
    expect(tiles.attribution).toContain('OpenFreeMap');
  });
});

describe('MapView', () => {
  it('initializes MapLibre, renders clustered GeoJSON, and cleans up', async () => {
    const { unmount, getByTestId, getByLabelText } = render(
      createElement(MapView, {
        center: { lat: 40.7, lng: -74 },
        places: [place],
        selectedPlace: null,
        onSelectPlace: vi.fn(),
      }),
    );

    expect(getByTestId('map')).toBeTruthy();
    await waitFor(() => expect(FakeMap.instances.length).toBe(1));
    const map = FakeMap.instances[0];
    expect(map.opts.style).toContain('openfreemap.org');
    expect(map.opts.attributionControl.customAttribution).toContain('OpenStreetMap');
    await waitFor(() => expect(map.sources.places).toBeTruthy());
    expect(map.sources.places.cluster).toBe(true);
    expect(map.sources.places.data.features[0].properties.id).toBe('node/9');

    getByLabelText('Zoom in').click();
    expect(map.zoom).toBe(14);
    getByLabelText('Zoom out').click();
    expect(map.zoom).toBe(13);

    unmount();
    expect(map.removed).toBe(true);
  });

  it('selects a place from a marker click and flies to the selected card', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      createElement(MapView, {
        center: { lat: 40.7, lng: -74 },
        places: [place],
        selectedPlace: null,
        onSelectPlace: onSelect,
      }),
    );

    await waitFor(() => expect(FakeMap.instances[0]?.sources.places).toBeTruthy());
    FakeMap.instances[0].emit('click:places-points', {
      features: [{ properties: { id: 'node/9' } }],
    });
    expect(onSelect).toHaveBeenCalledWith(place);

    rerender(createElement(MapView, {
      center: { lat: 40.7, lng: -74 },
      places: [place],
      selectedPlace: place,
      onSelectPlace: onSelect,
    }));
    await waitFor(() => expect(FakeMap.instances[0].fly?.center).toEqual([-74.01, 40.71]));
  });
});
