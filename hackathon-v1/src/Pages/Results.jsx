import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthHeader from '../Components/AuthHeader';
import PlaceDetailModal from '../Components/PlaceDetailModal';
import PlaceResultCard from '../Components/PlaceResultCard';
import MapView from '../Components/MapView';
import AddressAutocomplete from '../Components/AddressAutocomplete';
import { useSystemDarkMode } from '../useSystemDarkMode';
import { SECTIONS, groupPlaces, uniquePlaces } from '../location/categories';
import { detailsMapFromPlaces, LIST_PER_CATEGORY, SEARCH_RADIUS_METERS } from '../location/place';
import {
  debounce,
  getCurrentPosition,
  reverseGeocode,
  searchNearby,
  shouldRefetchForMove,
} from '../location/locationService';

function bayesianRating(rating, reviewCount, poolMeanRating, confidenceThreshold) {
  const v = reviewCount ?? 0;
  const R = rating ?? 0;
  return (v * R + confidenceThreshold * poolMeanRating) / (v + confidenceThreshold);
}

function poolStats(places) {
  const rated = places.filter((p) => p.rating != null && p.user_ratings_total != null);
  if (rated.length === 0) return { meanRating: 3.5, meanReviews: 10 };
  const totalReviews = rated.reduce((s, p) => s + p.user_ratings_total, 0);
  const meanReviews = totalReviews / rated.length;
  const weightedRatingSum = rated.reduce((s, p) => s + p.rating * p.user_ratings_total, 0);
  const meanRating = totalReviews > 0 ? weightedRatingSum / totalReviews : 3.5;
  return { meanRating, meanReviews };
}

function overallScore(place, index, total, { meanRating, meanReviews }) {
  const adjRating = bayesianRating(place.rating, place.user_ratings_total, meanRating, meanReviews);
  const ratingScore = adjRating / 5;
  const distanceScore = total > 1 ? 1 - index / (total - 1) : 1;
  const openBonus = place.opening_hours?.open_now ? 1 : 0;
  const priceScore = place.price_level != null ? (4 - place.price_level) / 4 : 0.5;
  return ratingScore * 0.50 + distanceScore * 0.30 + openBonus * 0.12 + priceScore * 0.08;
}

function getBestOverall(filtered) {
  if (filtered.length === 0) return null;
  const stats = poolStats(filtered);
  const scored = filtered
    .map((place, i) => ({ place, score: overallScore(place, i, filtered.length, stats) }))
    .sort((a, b) => b.score - a.score);
  return scored[0]?.place ?? null;
}

function sortRemaining(available, sortMethod) {
  if (available.length === 0) return [];
  const stats = poolStats(available);
  switch (sortMethod) {
    case 'cheapest':
      return [...available].sort((a, b) => (a.price_level ?? 2) - (b.price_level ?? 2));
    case 'highest_rating': {
      const rated = available
        .filter((p) => p.rating != null)
        .map((p) => ({
          place: p,
          adjustedRating: bayesianRating(p.rating, p.user_ratings_total, stats.meanRating, stats.meanReviews),
        }))
        .sort((a, b) => b.adjustedRating - a.adjustedRating)
        .map((row) => row.place);
      return rated.length ? [...rated, ...available.filter((p) => p.rating == null)] : [...available];
    }
    case 'most_reviewed':
      return [...available].sort((a, b) => (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0));
    case 'insurance':
      return [...available]
        .map((p) => ({ place: p, insuranceScore: calculateInsuranceScore(p) }))
        .sort((a, b) => b.insuranceScore - a.insuranceScore)
        .map((row) => row.place);
    default:
      return [...available];
  }
}

function getListedPlaces(filtered, sortMethod, limit = LIST_PER_CATEGORY) {
  if (filtered.length === 0) return [];
  const hasRatings = filtered.some((p) => p.rating != null);
  const lead = hasRatings ? getBestOverall(filtered) : filtered[0];
  if (!lead) return [];
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortMethod)?.label ?? 'Nearby';
  const rest = sortRemaining(
    filtered.filter((p) => p.place_id !== lead.place_id),
    sortMethod,
  ).slice(0, Math.max(0, limit - 1));
  return [
    { place: lead, label: hasRatings ? 'Best Overall' : 'Nearest' },
    ...rest.map((place, index) => ({ place, label: index === 0 ? sortLabel : 'Nearby' })),
  ];
}

function calculateInsuranceScore(place) {
  let score = 0;
  const name = (place.name ?? '').toLowerCase();
  const types = place.types ?? [];
  const insuranceKeywords = ['insurance', 'medicare', 'medicaid', 'hmo', 'ppo',
    'blue cross', 'blue shield', 'aetna', 'cigna', 'united healthcare',
    'network', 'in-network', 'accepts insurance'];
  insuranceKeywords.forEach((k) => { if (name.includes(k)) score += 20; });
  if (types.includes('hospital')) score += 15;
  if (types.includes('clinic') || types.includes('health')) score += 12;
  if (types.includes('doctor')) score += 10;
  if (types.includes('pharmacy') && !name.includes('independent')) score += 8;
  const chainKeywords = ['cvs', 'walgreens', 'rite aid', 'walmart', 'target', 'costco',
    'kaiser', 'urgent care', 'minuteclinic', 'one medical', 'planned parenthood', 'community health'];
  chainKeywords.forEach((k) => { if (name.includes(k)) score += 15; });
  if (place.user_ratings_total > 100) score += 5;
  if (place.user_ratings_total > 500) score += 5;
  return score;
}

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'highest_rating', label: 'Highest Rating' },
  { value: 'most_reviewed', label: 'Most Reviewed' },
  { value: 'insurance', label: 'Likely Accepts Insurance' },
];

const TEAL = '#0f766e';
const TEAL_DARK = '#2dd4bf';

function DiscoveryList({
  sections,
  activeSection,
  categoryData,
  excludeClosed,
  sortMethod,
  selectedId,
  placeDetails,
  dark,
  onSelect,
  onOpenDetails,
}) {
  const activeCategories = sections[activeSection].categories;
  const sectionAccent = dark
    ? (sections[activeSection].accentDark ?? TEAL_DARK)
    : (sections[activeSection].accent ?? TEAL);

  return (
    <div className="discovery-list" data-testid="discovery-list">
      {activeCategories.map((cat) => {
        let allPlaces = categoryData?.[cat.id]?.allPlaces ?? [];
        if (excludeClosed) allPlaces = allPlaces.filter((p) => p.opening_hours?.open_now);
        if (allPlaces.length === 0) return null;
        const listed = getListedPlaces(allPlaces, sortMethod);
        return (
          <section key={cat.id} className="discovery-group">
            <header className="discovery-group-header" style={{ borderLeftColor: sectionAccent }}>
              <span aria-hidden="true">{cat.icon ?? '🏥'}</span>
              <div>
                <h2>{cat.label}</h2>
                <p>{listed.length} {listed.length === 1 ? 'match' : 'matches'}</p>
              </div>
            </header>
            {listed.map((item) => (
              <PlaceResultCard
                key={item.place.place_id}
                place={item.place}
                label={item.label}
                catLabel={cat.label}
                details={placeDetails[item.place.place_id]}
                selected={item.place.place_id === selectedId}
                onClick={() => onSelect(item.place)}
                onOpenDetails={onOpenDetails}
                fallbackIcon={cat.icon ?? '🏥'}
                dark={dark}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}

const Results = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const dark = useSystemDarkMode();
  const accent = dark ? TEAL_DARK : TEAL;
  const searchInputRef = useRef(null);

  const [activeSection, setActiveSection] = useState(0);
  const [categoryData, setCategoryData] = useState(null);
  const [excludeClosed, setExcludeClosed] = useState(false);
  const [placeDetails, setPlaceDetails] = useState({});
  const [secondSortMethod, setSecondSortMethod] = useState('distance');
  const [selection, setSelection] = useState(null);
  const [detailPlace, setDetailPlace] = useState(null);
  const [error, setError] = useState('');
  const [dataKey, setDataKey] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [areaPrompt, setAreaPrompt] = useState(null);
  const [areaSearching, setAreaSearching] = useState(false);
  const lastSearchRef = useRef(null);
  const viewportAbortRef = useRef(null);
  const viewportHandlerRef = useRef(() => {});
  const searchKeyRef = useRef('');
  const searchKey = state?.lat != null && state?.lng != null ? `${state.lat},${state.lng}` : '';
  searchKeyRef.current = searchKey;
  const selectedPlace = selection?.key === searchKey ? selection.place : null;
  const liveAreaPrompt = areaPrompt?.key === searchKey ? areaPrompt : null;
  const loadingStatus = searchKey && dataKey !== searchKey && !error ? 'Searching nearby places…' : '';
  const visibleCategoryData = dataKey === searchKey ? categoryData : null;

  useEffect(() => {
    if (!state?.lat || !state?.lng) return undefined;
    const controller = new AbortController();
    const key = `${state.lat},${state.lng}`;
    lastSearchRef.current = { lat: state.lat, lng: state.lng };

    searchNearby({
      lat: state.lat,
      lng: state.lng,
      radius: SEARCH_RADIUS_METERS,
      signal: controller.signal,
    }).then((data) => {
      setCategoryData(groupPlaces(data.places));
      setPlaceDetails(detailsMapFromPlaces(data.places));
      setError('');
      setDataKey(key);
    }).catch((err) => {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Nearby search is temporarily unavailable. Please try again.');
      setCategoryData(null);
      setDataKey(key);
    });

    return () => controller.abort();
  }, [state]);

  useEffect(() => {
    if (!selectedPlace?.place_id) return undefined;
    const node = document.querySelector(`[data-place-id="${selectedPlace.place_id}"]`);
    node?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    return undefined;
  }, [selectedPlace]);

  viewportHandlerRef.current = (next) => {
    if (!shouldRefetchForMove(lastSearchRef.current, next)) {
      setAreaPrompt(null);
      return;
    }
    setAreaPrompt({ key: searchKeyRef.current, ...next });
  };

  const handleViewportChange = useMemo(
    () => debounce((next) => viewportHandlerRef.current(next), 280),
    [],
  );

  useEffect(() => () => handleViewportChange.cancel?.(), [handleViewportChange]);

  const applyPlaces = (data) => {
    setCategoryData(groupPlaces(data.places));
    setPlaceDetails(detailsMapFromPlaces(data.places));
  };

  const searchThisArea = () => {
    if (!liveAreaPrompt) return;
    viewportAbortRef.current?.abort();
    const controller = new AbortController();
    viewportAbortRef.current = controller;
    lastSearchRef.current = { lat: liveAreaPrompt.lat, lng: liveAreaPrompt.lng };
    setAreaSearching(true);
    searchNearby({
      lat: liveAreaPrompt.lat,
      lng: liveAreaPrompt.lng,
      radius: SEARCH_RADIUS_METERS,
      bounds: liveAreaPrompt.bounds,
      signal: controller.signal,
    }).then((data) => {
      applyPlaces(data);
      setAreaPrompt(null);
      setError('');
    }).catch((err) => {
      if (err?.name === 'AbortError') return;
    }).finally(() => setAreaSearching(false));
  };

  const goToLocation = (loc) => {
    navigate('/results', { state: loc, replace: true });
  };

  const handleLocateMe = async () => {
    try {
      const coords = await getCurrentPosition();
      let address = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      try {
        const result = await reverseGeocode(coords.lat, coords.lng);
        if (result?.address) address = result.address;
      } catch {
        // Continue with coordinates when reverse geocoding is unavailable.
      }
      goToLocation({
        address,
        lat: coords.lat,
        lng: coords.lng,
      });
    } catch (err) {
      setError(err?.message || 'Could not use your current location.');
    }
  };

  const retrySearch = () => {
    if (!state?.lat) return;
    setError('');
    setDataKey('');
    searchNearby({ lat: state.lat, lng: state.lng, radius: SEARCH_RADIUS_METERS })
      .then((data) => {
        applyPlaces(data);
        setDataKey(`${state.lat},${state.lng}`);
      })
      .catch((err) => {
        setError(err?.message || 'Nearby search is temporarily unavailable. Please try again.');
        setCategoryData(null);
        setDataKey(`${state.lat},${state.lng}`);
      });
  };

  if (!state) {
    return (
      <div className="results-page" style={{ backgroundColor: dark ? '#0b1120' : 'white' }}>
        <AuthHeader />
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>No location data found.</p>
          <button className="results-primary-btn" onClick={() => navigate('/')}>Go back</button>
        </div>
      </div>
    );
  }

  const activeCategories = SECTIONS[activeSection].categories;
  const cityName = state.address?.split(',').slice(0, 2).join(',') ?? state.address;
  const mapPlaces = uniquePlaces(
    activeCategories.flatMap((cat) => {
      const places = visibleCategoryData?.[cat.id]?.allPlaces ?? [];
      return excludeClosed ? places.filter((p) => p.opening_hours?.open_now) : places;
    }),
  );

  let resultCount = 0;
  if (visibleCategoryData) {
    activeCategories.forEach((cat) => {
      const places = excludeClosed
        ? (visibleCategoryData[cat.id]?.allPlaces ?? []).filter((p) => p.opening_hours?.open_now)
        : (visibleCategoryData[cat.id]?.allPlaces ?? []);
      if (places.length > 0) resultCount += Math.min(LIST_PER_CATEGORY, places.length);
    });
  }

  const listProps = {
    sections: SECTIONS,
    activeSection,
    categoryData: visibleCategoryData,
    excludeClosed,
    sortMethod: secondSortMethod,
    selectedId: selectedPlace?.place_id,
    placeDetails,
    dark,
    onSelect: (place) => {
      setSelection({ key: searchKey, place });
      setSheetExpanded(true);
    },
    onOpenDetails: setDetailPlace,
  };

  const emptyList = visibleCategoryData && !loadingStatus && resultCount === 0;

  return (
    <div className={`results-page${dark ? ' is-dark' : ''}`}>
      <AuthHeader />
      <div className={`results-stage${sidebarOpen ? '' : ' sidebar-collapsed'}`}>
        <aside className="discovery-sidebar" data-testid="discovery-sidebar">
          <div className="discovery-toolbar">
            <div>
              <p className="discovery-kicker">Healthcare nearby</p>
              <h1>{cityName}</h1>
              {!loadingStatus && visibleCategoryData && (
                <p className="discovery-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</p>
              )}
              {loadingStatus && <p className="discovery-count">{loadingStatus}</p>}
              {error && !loadingStatus && <p className="discovery-error">{error}</p>}
            </div>
            <button
              type="button"
              className="sidebar-collapse"
              aria-label="Collapse list"
              onClick={() => setSidebarOpen(false)}
            >
              ‹
            </button>
          </div>

          <div className="discovery-filters" role="tablist" aria-label="Section">
            {SECTIONS.map((section, i) => (
              <button
                key={section.id}
                role="tab"
                aria-selected={activeSection === i}
                className={activeSection === i ? 'is-active' : ''}
                onClick={() => setActiveSection(i)}
              >
                {section.icon} {section.label}
              </button>
            ))}
          </div>

          <div className="discovery-sort-row">
            <button
              type="button"
              aria-pressed={excludeClosed}
              className={`open-now-toggle${excludeClosed ? ' is-on' : ''}`}
              onClick={() => setExcludeClosed(!excludeClosed)}
            >
              Open now
            </button>
            <label>
              Sort
              <select value={secondSortMethod} onChange={(e) => setSecondSortMethod(e.target.value)}>
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="discovery-scroll">
            {loadingStatus && <div className="discovery-status">Searching nearby places…</div>}
            {error && !loadingStatus && !visibleCategoryData && (
              <div className="discovery-status">
                <p>{error}</p>
                <button className="results-primary-btn" onClick={retrySearch}>Try again</button>
              </div>
            )}
            {visibleCategoryData && <DiscoveryList {...listProps} />}
            {emptyList && (
              <div className="discovery-status">
                {excludeClosed ? 'No open places found. Try disabling Open now.' : 'No results found nearby.'}
              </div>
            )}
          </div>
        </aside>

        <div className="map-stage">
          <div className="map-float-search">
            {!sidebarOpen && (
              <button
                type="button"
                className="sidebar-open"
                aria-label="Open list"
                onClick={() => setSidebarOpen(true)}
              >
                ☰
              </button>
            )}
            <div className="map-search-card">
              <AddressAutocomplete
                inputRef={searchInputRef}
                dark={dark}
                placeholder="Search a new address…"
                onResolved={(item) => goToLocation({ address: item.address, lat: item.lat, lng: item.lng })}
              />
            </div>
          </div>

          {liveAreaPrompt && (
            <button
              type="button"
              className="search-area-btn"
              data-testid="search-this-area"
              onClick={searchThisArea}
              disabled={areaSearching}
            >
              {areaSearching ? 'Searching…' : 'Search this area'}
            </button>
          )}

          <MapView
            center={{ lat: state.lat, lng: state.lng }}
            places={mapPlaces}
            selectedPlace={selectedPlace}
            onSelectPlace={(place) => {
              setSelection({ key: searchKey, place });
              setSheetExpanded(true);
              setSidebarOpen(true);
            }}
            onViewportChange={handleViewportChange}
            onLocateMe={handleLocateMe}
            accent={accent}
            dark={dark}
          />
        </div>

        <section className={`discovery-sheet${sheetExpanded ? ' is-expanded' : ''}`} data-testid="discovery-sheet">
          <button
            type="button"
            className="sheet-handle"
            aria-label={sheetExpanded ? 'Collapse results' : 'Expand results'}
            onClick={() => setSheetExpanded((open) => !open)}
          >
            <span />
          </button>
          <div className="sheet-head">
            <div>
              <p className="discovery-kicker">Healthcare nearby</p>
              <h1>{cityName}</h1>
            </div>
            <span className="discovery-count">{loadingStatus || `${resultCount} results`}</span>
          </div>
          <div className="discovery-filters">
            {SECTIONS.map((section, i) => (
              <button
                key={section.id}
                className={activeSection === i ? 'is-active' : ''}
                onClick={() => setActiveSection(i)}
              >
                {section.label}
              </button>
            ))}
          </div>
          <div className="discovery-scroll">
            {visibleCategoryData && <DiscoveryList {...listProps} />}
            {emptyList && <div className="discovery-status">No results found nearby.</div>}
            {error && !visibleCategoryData && (
              <div className="discovery-status">
                <p>{error}</p>
                <button className="results-primary-btn" onClick={retrySearch}>Try again</button>
              </div>
            )}
          </div>
        </section>
      </div>

      {detailPlace && (
        <PlaceDetailModal
          place={detailPlace}
          details={placeDetails[detailPlace.place_id]}
          origin={{ lat: state.lat, lng: state.lng }}
          onClose={() => setDetailPlace(null)}
        />
      )}
    </div>
  );
};

export default Results;
