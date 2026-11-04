/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { createElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, waitFor, fireEvent } from '@testing-library/react';

const searchNearby = vi.fn();
const getCurrentPosition = vi.fn();
const reverseGeocode = vi.fn();

vi.mock('../location/locationService.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    searchNearby: (...args) => searchNearby(...args),
    getCurrentPosition: (...args) => getCurrentPosition(...args),
    reverseGeocode: (...args) => reverseGeocode(...args),
  };
});

vi.mock('../Components/AuthHeader.jsx', () => ({
  default: () => createElement('div', { 'data-testid': 'header' }, 'header'),
}));

vi.mock('../Components/MapView.jsx', () => ({
  default: function MockMap({ places, onSelectPlace, onViewportChange, onLocateMe }) {
    return createElement(
      'div',
      { 'data-testid': 'map' },
      (places || []).map((place) => createElement('button', {
        key: place.place_id,
        type: 'button',
        'data-testid': `marker-${place.place_id}`,
        onClick: () => onSelectPlace(place),
      }, place.name)),
      createElement('button', {
        type: 'button',
        'data-testid': 'move-map',
        onClick: () => onViewportChange({
          lat: 42.5,
          lng: -71.2,
          bounds: { south: 42.4, west: -71.3, north: 42.6, east: -71.1 },
        }),
      }, 'move'),
      createElement('button', {
        type: 'button',
        'data-testid': 'locate',
        onClick: () => onLocateMe?.(),
      }, 'locate'),
    );
  },
}));

import Results from './Results.jsx';

const clinic = {
  place_id: 'node/9',
  name: 'Harbor Clinic',
  lat: 42.36,
  lng: -71.05,
  vicinity: '12 Front St',
  phone: '555-0100',
  categories: ['clinic'],
  types: ['clinic'],
  distanceMeters: 240,
  opening_hours: { open_now: true },
};

function renderResults(state = { lat: 42.3588, lng: -71.0578, address: 'Boston, MA' }) {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [{ pathname: '/results', state }] },
      createElement(Routes, null, createElement(Route, { path: '/results', element: createElement(Results) })),
    ),
  );
}

beforeEach(() => {
  searchNearby.mockReset();
  getCurrentPosition.mockReset();
  reverseGeocode.mockReset();
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Results map experience', () => {
  it('loads nearby places into cards and syncs marker clicks', async () => {
    searchNearby.mockResolvedValue({ places: [clinic], grouped: {} });
    const screen = renderResults();
    await waitFor(() => expect(screen.getAllByTestId('result-card').length).toBeGreaterThan(0));
    expect(screen.getAllByText('Harbor Clinic').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12 Front St').length).toBeGreaterThan(0);
    expect(screen.getAllByText('555-0100').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId('marker-node/9'));
    expect(screen.getAllByTestId('result-card')[0].getAttribute('data-selected')).toBe('true');
  });

  it('does not search while panning, then searches this area on demand', async () => {
    searchNearby.mockResolvedValue({ places: [clinic], grouped: {} });
    const screen = renderResults();
    await waitFor(() => expect(searchNearby).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getAllByTestId('move-map')[0]);
    expect(searchNearby).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('search-this-area')).toBeNull();
    const button = await screen.findByTestId('search-this-area');
    fireEvent.click(button);
    await waitFor(() => expect(searchNearby).toHaveBeenCalledTimes(2));
    expect(searchNearby.mock.calls[1][0].bounds).toMatchObject({ south: 42.4, west: -71.3 });
  });

  it('uses locate-me through the existing geolocation helpers', async () => {
    searchNearby.mockResolvedValue({ places: [clinic], grouped: {} });
    getCurrentPosition.mockResolvedValue({ lat: 42.4, lng: -71.1 });
    reverseGeocode.mockResolvedValue({ address: 'Cambridge, MA', lat: 42.4, lng: -71.1 });
    const screen = renderResults();
    await waitFor(() => expect(searchNearby).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getAllByTestId('locate')[0]);
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalled());
    await waitFor(() => expect(reverseGeocode).toHaveBeenCalled());
  });

  it('shows empty and error states without fake places', async () => {
    searchNearby.mockResolvedValueOnce({ places: [], grouped: {} });
    const empty = renderResults();
    await waitFor(() => expect(empty.getAllByText(/No results found nearby/i).length).toBeGreaterThan(0));
    empty.unmount();

    searchNearby.mockRejectedValueOnce(new Error('Nearby search is temporarily unavailable. Please try again.'));
    const failed = renderResults({ lat: 40.7, lng: -74, address: 'New York' });
    await waitFor(() => expect(failed.getAllByText(/temporarily unavailable/i).length).toBeGreaterThan(0));
    expect(failed.queryAllByTestId('result-card')).toHaveLength(0);
  });
});
