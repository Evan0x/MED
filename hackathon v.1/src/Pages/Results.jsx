import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthHeader from '../Components/AuthHeader';
import PlaceDetailModal from '../Components/PlaceDetailModal';

// ── Bayesian rating helpers ───────────────────────────────────────────────────

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

function getSecondResult(filtered, sortMethod, bestOverallId) {
  const available = filtered.filter((p) => p.place_id !== bestOverallId);
  if (available.length === 0) return null;
  const stats = poolStats(available);
  switch (sortMethod) {
    case 'distance':
      return available[0];
    case 'cheapest': {
      const sorted = [...available].sort((a, b) => (a.price_level ?? 2) - (b.price_level ?? 2));
      return sorted[0];
    }
    case 'highest_rating': {
      const rated = available
        .filter((p) => p.rating != null)
        .map((p) => ({
          place: p,
          adjustedRating: bayesianRating(p.rating, p.user_ratings_total, stats.meanRating, stats.meanReviews),
        }))
        .sort((a, b) => b.adjustedRating - a.adjustedRating);
      return rated[0]?.place ?? available[0];
    }
    case 'most_reviewed': {
      const byReviews = [...available].sort((a, b) => (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0));
      return byReviews[0];
    }
    case 'insurance': {
      const byInsurance = [...available]
        .map((p) => ({ place: p, insuranceScore: calculateInsuranceScore(p) }))
        .sort((a, b) => b.insuranceScore - a.insuranceScore);
      return byInsurance[0]?.place ?? available[0];
    }
    default:
      return available[0];
  }
}

// ── Search helpers ─────────────────────────────────────────────────────────────

function nearbySearchPromise(service, params) {
  return new Promise((resolve) => {
    service.nearbySearch(params, (results, status) => {
      resolve({ results: results ?? [], status });
    });
  });
}

function placeDetailsPromise(service, placeId) {
  return new Promise((resolve) => {
    service.getDetails(
      { placeId, fields: ['opening_hours', 'website', 'formatted_phone_number', 'photos', 'reviews', 'url'] },
      (result, status) => { resolve({ placeId, data: result, status }); }
    );
  });
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

// ── Category & section config ─────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'medical', label: 'Medical',
    icon: '🏥',
    categories: [
      { id: 'pharmacy', label: 'Pharmacy', searchParams: { type: 'pharmacy' }, filter: (p) => (p.types ?? []).includes('pharmacy') },
      { id: 'er', label: 'ER / Emergency', searchParams: { type: 'hospital', keyword: 'emergency' }, filter: (p) => (p.types ?? []).includes('hospital') },
      { id: 'dentist', label: 'Dentist', searchParams: { type: 'dentist' }, filter: (p) => (p.types ?? []).includes('dentist') },
      {
        id: 'clinic', label: 'Clinic',
        searchParams: { type: 'doctor', keyword: 'clinic urgent care walk-in' },
        filter: (p) => {
          const types = p.types ?? []; const name = (p.name ?? '').toLowerCase();
          return types.includes('doctor') || types.includes('health') || name.includes('clinic') || name.includes('urgent') || name.includes('walk-in') || name.includes('walk in');
        },
      },
      {
        id: 'optician', label: 'Optician',
        searchParams: { keyword: 'optician optometrist eye care vision' },
        filter: (p) => { const name = (p.name ?? '').toLowerCase(); return name.includes('optic') || name.includes('optom') || name.includes('vision') || name.includes('eye') || name.includes('lens') || name.includes('spectacl') || name.includes('eyeglass'); },
      },
    ],
  },
  {
    id: 'wellness', label: 'Wellness',
    icon: '🌿',
    categories: [
      {
        id: 'gym', label: 'Gym', searchParams: { type: 'gym' },
        filter: (p) => { const types = p.types ?? []; const name = (p.name ?? '').toLowerCase(); return types.includes('gym') || name.includes('gym') || name.includes('fitness') || name.includes('crossfit') || name.includes('yoga') || name.includes('pilates'); },
      },
      { id: 'outdoor', label: 'Outdoor Space', searchParams: { type: 'park' }, filter: (p) => { const types = p.types ?? []; return types.includes('park') || types.includes('natural_feature') || types.includes('campground') || types.includes('stadium'); } },
      {
        id: 'community', label: 'Community Center', searchParams: { keyword: 'community center recreation center' },
        filter: (p) => { const name = (p.name ?? '').toLowerCase(); return name.includes('community') || name.includes('recreation') || name.includes('rec ') || name.includes('civic') || name.includes('centre') || name.includes('center') || name.includes('ymca') || name.includes('ywca'); },
      },
      {
        id: 'therapist', label: 'Therapist', searchParams: { keyword: 'therapist counseling mental health psychology' },
        filter: (p) => { const types = p.types ?? []; const name = (p.name ?? '').toLowerCase(); return types.includes('physiotherapist') || name.includes('therap') || name.includes('counsel') || name.includes('mental') || name.includes('psych') || name.includes('behav'); },
      },
      {
        id: 'healthy_eating', label: 'Healthy Eating', searchParams: { keyword: 'healthy organic vegan salad juice bar' },
        filter: (p) => {
          const types = p.types ?? []; const name = (p.name ?? '').toLowerCase();
          const foodTypes = ['restaurant', 'food', 'cafe', 'bakery', 'meal_takeaway', 'meal_delivery', 'health_food_store', 'grocery_or_supermarket'];
          return types.some((t) => foodTypes.includes(t)) || name.includes('health') || name.includes('organic') || name.includes('vegan') || name.includes('salad') || name.includes('juice') || name.includes('natural') || name.includes('wholesome');
        },
      },
    ],
  },
];

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'highest_rating', label: 'Highest Rating' },
  { value: 'most_reviewed', label: 'Most Reviewed' },
  { value: 'insurance', label: 'Likely Accepts Insurance' },
];

const TEAL = '#0f766e';
const AMBER = '#f59e0b';

// ── Result Card ───────────────────────────────────────────────────────────────

const ResultCard = ({ place, label, catLabel, details, showInsuranceIndicator, onClick }) => {
  const [hovered, setHovered] = useState(false);
  const photoUrl = place.photos?.[0]?.getUrl?.({ maxWidth: 160, maxHeight: 160 });
  const isOpen = place.opening_hours?.open_now;
  const insuranceScore = showInsuranceIndicator ? calculateInsuranceScore(place) : 0;

  const labelColor = label === 'Best Overall'
    ? { bg: '#f0fdf4', color: TEAL, border: '#bbf7d0' }
    : { bg: '#fffbeb', color: '#92400e', border: '#fde68a' };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: '14px',
        padding: '16px',
        borderRadius: '14px',
        border: `1px solid ${hovered ? '#cbd5e1' : '#e2e8f0'}`,
        cursor: 'pointer',
        marginBottom: '12px',
        backgroundColor: hovered ? '#f8fafc' : 'white',
        transition: 'all 0.15s ease',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
        alignItems: 'flex-start',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: '80px', height: '80px', borderRadius: '10px', flexShrink: 0, overflow: 'hidden',
        backgroundColor: '#f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {photoUrl ? (
          <img src={photoUrl} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: '28px' }}>🏥</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', lineHeight: 1.3 }}>{place.name}</span>
          {place.rating != null && (
            <span style={{ flexShrink: 0, fontSize: '13px', color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span style={{ color: AMBER }}>★</span>
              {place.rating.toFixed(1)}
              <span style={{ color: '#94a3b8', fontWeight: 400 }}>({place.user_ratings_total ?? 0})</span>
            </span>
          )}
        </div>

        {/* Category + label badges */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{
            padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            backgroundColor: '#f1f5f9', color: '#475569',
          }}>{catLabel}</span>
          <span style={{
            padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
            backgroundColor: labelColor.bg, color: labelColor.color, border: `1px solid ${labelColor.border}`,
          }}>{label}</span>
          {showInsuranceIndicator && insuranceScore > 15 && (
            <span style={{
              padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
              backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
            }}>💳 Insurance</span>
          )}
        </div>

        {place.vicinity && (
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>📍</span> {place.vicinity}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {place.opening_hours && (
            <span style={{ fontSize: '12px', fontWeight: 600, color: isOpen ? '#16a34a' : '#dc2626' }}>
              {isOpen ? '● Open' : '● Closed'}
            </span>
          )}
          {details?.hours?.weekday_text?.[((new Date().getDay() + 6) % 7)] && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              · {details.hours.weekday_text[((new Date().getDay() + 6) % 7)].split(': ')[1]}
            </span>
          )}
        </div>
      </div>

      {/* Chevron */}
      <div style={{ color: '#cbd5e1', fontSize: '18px', flexShrink: 0, alignSelf: 'center', marginLeft: '4px' }}>›</div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const Results = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const mapDivRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);

  const [activeSection, setActiveSection] = useState(0);
  const [categoryData, setCategoryData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('Searching nearby places…');
  const [excludeClosed, setExcludeClosed] = useState(false);
  const [placeDetails, setPlaceDetails] = useState({});
  const [secondSortMethod, setSecondSortMethod] = useState('distance');
  const [selectedPlace, setSelectedPlace] = useState(null);

  // ── Initialize map + run searches ──
  useEffect(() => {
    if (!state) return;
    const { lat, lng } = state;

    const runAllSearches = () => {
      const mapInstance = new window.google.maps.Map(mapDivRef.current, {
        center: { lat, lng },
        zoom: 14,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
        ],
      });
      mapInstanceRef.current = mapInstance;

      // User location marker
      userMarkerRef.current = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstance,
        title: 'Your Location',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: TEAL,
          fillOpacity: 1,
          strokeColor: 'white',
          strokeWeight: 3,
        },
        zIndex: 999,
      });

      const service = new window.google.maps.places.PlacesService(mapInstance);
      const allCategories = SECTIONS.flatMap((s) => s.categories);
      const center = new window.google.maps.LatLng(lat, lng);

      const searches = allCategories.map((cat) => {
        const params = { location: center, rankBy: window.google.maps.places.RankBy.DISTANCE, ...cat.searchParams };
        return nearbySearchPromise(service, params).then(({ results }) => {
          const filtered = results.filter(cat.filter).slice(0, 20);
          return { id: cat.id, allPlaces: filtered };
        });
      });

      Promise.all(searches).then((results) => {
        const data = {};
        results.forEach((r) => { data[r.id] = { allPlaces: r.allPlaces }; });
        setCategoryData(data);
        setLoadingStatus('');

        // Fetch detailed info for all places
        const allPlaces = results.flatMap((r) => r.allPlaces).filter(Boolean);
        const detailsPromises = allPlaces.map((place) =>
          placeDetailsPromise(service, place.place_id)
        );

        Promise.all(detailsPromises).then((detailResults) => {
          const detailsMap = {};
          detailResults.forEach((d) => {
            detailsMap[d.placeId] = {
              hours: d.data?.opening_hours,
              website: d.data?.website,
              phone: d.data?.formatted_phone_number,
              photos: d.data?.photos,
              reviews: d.data?.reviews,
              url: d.data?.url,
            };
          });
          setPlaceDetails(detailsMap);
        });
      });
    };

    if (window.google?.maps?.places) {
      runAllSearches();
    } else {
      const existing = document.querySelector('#gmaps-script');
      if (existing) {
        existing.addEventListener('load', runAllSearches);
      } else {
        setLoadingStatus('Google Maps failed to load.');
      }
    }
  }, [state]);

  // ── Update map markers when section / data changes ──
  useEffect(() => {
    if (!categoryData || !mapInstanceRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const activeCategories = SECTIONS[activeSection].categories;
    activeCategories.forEach((cat) => {
      const places = categoryData[cat.id]?.allPlaces ?? [];
      places.forEach((place) => {
        if (!place.geometry?.location) return;
        const marker = new window.google.maps.Marker({
          position: place.geometry.location,
          map: mapInstanceRef.current,
          title: place.name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: place.opening_hours?.open_now ? '#16a34a' : '#dc2626',
            fillOpacity: 0.9,
            strokeColor: 'white',
            strokeWeight: 2,
          },
        });
        marker.addListener('click', () => setSelectedPlace(place));
        markersRef.current.push(marker);
      });
    });
  }, [categoryData, activeSection]);

  if (!state) {
    return (
      <div style={{ fontFamily: 'system-ui, sans-serif' }}>
        <AuthHeader showBack onBack={() => navigate('/')} />
        <div style={{ padding: '60px', textAlign: 'center' }}>
          <p style={{ color: '#64748b', marginBottom: '20px' }}>No location data found.</p>
          <button onClick={() => navigate('/')} style={{ padding: '12px 24px', backgroundColor: TEAL, color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  const activeCategories = SECTIONS[activeSection].categories;
  const cityName = state.address?.split(',').slice(0, 2).join(',') ?? state.address;

  // Count results for active section
  let resultCount = 0;
  if (categoryData) {
    activeCategories.forEach((cat) => {
      const data = categoryData[cat.id];
      const places = excludeClosed
        ? (data?.allPlaces ?? []).filter((p) => p.opening_hours?.open_now)
        : (data?.allPlaces ?? []);
      if (places.length > 0) resultCount += Math.min(2, places.length);
    });
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <AuthHeader showBack onBack={() => navigate('/')} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ── Left panel: results list ── */}
        <div style={{
          width: '480px', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          {/* Panel header */}
          <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
              Healthcare near{' '}
              <span style={{ color: TEAL }}>{cityName}</span>
            </h2>
            {!loadingStatus && categoryData && (
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94a3b8' }}>
                {resultCount} result{resultCount !== 1 ? 's' : ''} found
              </p>
            )}
            {loadingStatus && (
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#94a3b8' }}>
                {loadingStatus}
              </p>
            )}

            {/* Section tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {SECTIONS.map((section, i) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(i)}
                  style={{
                    padding: '8px 18px', borderRadius: '24px', border: 'none',
                    backgroundColor: activeSection === i ? TEAL : '#f1f5f9',
                    color: activeSection === i ? 'white' : '#475569',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {section.icon} {section.label}
                </button>
              ))}
            </div>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
              <button
                onClick={() => setExcludeClosed(!excludeClosed)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '20px',
                  border: `1px solid ${excludeClosed ? TEAL : '#e2e8f0'}`,
                  backgroundColor: excludeClosed ? '#f0fdf4' : 'white',
                  color: excludeClosed ? TEAL : '#475569',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                🕐 Open Now
              </button>

              <select
                value={secondSortMethod}
                onChange={(e) => setSecondSortMethod(e.target.value)}
                style={{
                  padding: '7px 12px', borderRadius: '20px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'white', color: '#475569',
                  fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                  appearance: 'none', paddingRight: '28px',
                  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                }}
              >
                <option value="" disabled>Sort by…</option>
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>⇅ {opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Scrollable results */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
            {loadingStatus && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
                <p style={{ margin: 0, fontWeight: 500 }}>{loadingStatus}</p>
              </div>
            )}

            {categoryData && activeCategories.map((cat) => {
              const data = categoryData[cat.id];
              let allPlaces = data?.allPlaces ?? [];
              if (excludeClosed) allPlaces = allPlaces.filter((p) => p.opening_hours?.open_now);
              if (allPlaces.length === 0) return null;

              const bestOverall = getBestOverall(allPlaces);
              const secondResult = bestOverall
                ? getSecondResult(allPlaces, secondSortMethod, bestOverall.place_id)
                : null;
              const sortLabel = SORT_OPTIONS.find((o) => o.value === secondSortMethod)?.label ?? 'Alternative';

              return (
                <div key={cat.id} style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '11px', fontWeight: 700, color: '#94a3b8',
                    textTransform: 'uppercase', letterSpacing: '1px',
                    padding: '12px 0 8px',
                  }}>
                    {cat.label}
                  </div>
                  {bestOverall && (
                    <ResultCard
                      place={bestOverall}
                      label="Best Overall"
                      catLabel={cat.label}
                      details={placeDetails[bestOverall.place_id]}
                      showInsuranceIndicator={secondSortMethod === 'insurance'}
                      onClick={() => setSelectedPlace(bestOverall)}
                    />
                  )}
                  {secondResult && (
                    <ResultCard
                      place={secondResult}
                      label={sortLabel}
                      catLabel={cat.label}
                      details={placeDetails[secondResult.place_id]}
                      showInsuranceIndicator={secondSortMethod === 'insurance'}
                      onClick={() => setSelectedPlace(secondResult)}
                    />
                  )}
                </div>
              );
            })}

            {categoryData && !loadingStatus && resultCount === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>😔</div>
                <p style={{ margin: 0, fontWeight: 500 }}>
                  {excludeClosed ? 'No open places found. Try disabling the "Open Now" filter.' : 'No results found nearby.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right panel: Google Map ── */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />
          {!categoryData && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              backgroundColor: '#f0f9f7', color: '#94a3b8', pointerEvents: 'none',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.4 }}>📍</div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '16px' }}>Interactive Map</p>
              <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Clinic locations will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Place detail popup ── */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          details={placeDetails[selectedPlace.place_id]}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  );
};

export default Results;
