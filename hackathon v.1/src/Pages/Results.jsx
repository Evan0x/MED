import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthHeader from '../Components/AuthHeader';

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
      return available[0]; // Already sorted by distance from API
      
    case 'cheapest':
      const sorted = [...available].sort((a, b) => {
        const priceA = a.price_level ?? 2;
        const priceB = b.price_level ?? 2;
        return priceA - priceB;
      });
      return sorted[0];
      
    case 'highest_rating':
      const rated = available
        .filter((p) => p.rating != null)
        .map((p) => ({
          place: p,
          adjustedRating: bayesianRating(
            p.rating,
            p.user_ratings_total,
            stats.meanRating,
            stats.meanReviews
          )
        }))
        .sort((a, b) => b.adjustedRating - a.adjustedRating);
      return rated[0]?.place ?? available[0];
      
    case 'most_reviewed':
      const byReviews = [...available].sort((a, b) => 
        (b.user_ratings_total ?? 0) - (a.user_ratings_total ?? 0)
      );
      return byReviews[0];
      
    case 'insurance':
      const byInsurance = [...available]
        .map((p) => ({
          place: p,
          insuranceScore: calculateInsuranceScore(p)
        }))
        .sort((a, b) => b.insuranceScore - a.insuranceScore);
      return byInsurance[0]?.place ?? available[0];
      
    default:
      return available[0];
  }
}

// ── Search helper ─────────────────────────────────────────────────────────────

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
      { placeId, fields: ['opening_hours', 'website', 'reviews'] },
      (result, status) => {
        resolve({ result, status });
      }
    );
  });
}

function calculateInsuranceScore(place) {
  let score = 0;
  const name = (place.name ?? '').toLowerCase();
  const types = place.types ?? [];
  
  // Check for insurance-related keywords in name
  const insuranceKeywords = [
    'insurance', 'medicare', 'medicaid', 'hmo', 'ppo', 
    'blue cross', 'blue shield', 'aetna', 'cigna', 'united healthcare',
    'network', 'in-network', 'accepts insurance'
  ];
  
  insuranceKeywords.forEach(keyword => {
    if (name.includes(keyword)) score += 20;
  });
  
  // Prioritize certain facility types likely to accept insurance
  if (types.includes('hospital')) score += 15;
  if (types.includes('clinic') || types.includes('health')) score += 12;
  if (types.includes('doctor')) score += 10;
  if (types.includes('pharmacy') && !name.includes('independent')) score += 8;
  
  // Chain/franchise medical facilities more likely to accept insurance
  const chainKeywords = [
    'cvs', 'walgreens', 'rite aid', 'walmart', 'target', 'costco',
    'kaiser', 'urgent care', 'minuteclinic', 'one medical',
    'planned parenthood', 'community health'
  ];
  
  chainKeywords.forEach(keyword => {
    if (name.includes(keyword)) score += 15;
  });
  
  // Higher review count might indicate established practice
  if (place.user_ratings_total > 100) score += 5;
  if (place.user_ratings_total > 500) score += 5;
  
  return score;
}

// ── Category & section config ─────────────────────────────────────────────────

const SECTIONS = [
  {
    id: 'medical',
    label: 'Medical',
    categories: [
      {
        id: 'pharmacy',
        label: 'Pharmacy',
        searchParams: { type: 'pharmacy' },
        // Keep real pharmacies; hospital-based pharmacies carry the 'pharmacy' type too
        filter: (p) => (p.types ?? []).includes('pharmacy'),
      },
      {
        id: 'er',
        label: 'ER / Emergency',
        searchParams: { type: 'hospital', keyword: 'emergency' },
        filter: (p) => (p.types ?? []).includes('hospital'),
      },
      {
        id: 'dentist',
        label: 'Dentist',
        searchParams: { type: 'dentist' },
        filter: (p) => (p.types ?? []).includes('dentist'),
      },
      {
        id: 'clinic',
        label: 'Clinic',
        // Use keyword to surface urgent care / walk-in clinics alongside doctor offices
        searchParams: { type: 'doctor', keyword: 'clinic urgent care walk-in' },
        filter: (p) => {
          const types = p.types ?? [];
          const name = (p.name ?? '').toLowerCase();
          return (
            types.includes('doctor') ||
            types.includes('health') ||
            name.includes('clinic') ||
            name.includes('urgent') ||
            name.includes('walk-in') ||
            name.includes('walk in')
          );
        },
      },
      {
        id: 'optician',
        label: 'Optician',
        searchParams: { keyword: 'optician optometrist eye care vision' },
        filter: (p) => {
          const name = (p.name ?? '').toLowerCase();
          return (
            name.includes('optic') ||
            name.includes('optom') ||
            name.includes('vision') ||
            name.includes('eye') ||
            name.includes('lens') ||
            name.includes('spectacl') ||
            name.includes('eyeglass')
          );
        },
      },
    ],
  },
  {
    id: 'wellness',
    label: 'Wellness',
    categories: [
      {
        id: 'gym',
        label: 'Gym',
        searchParams: { type: 'gym' },
        filter: (p) => {
          const types = p.types ?? [];
          const name = (p.name ?? '').toLowerCase();
          return (
            types.includes('gym') ||
            name.includes('gym') ||
            name.includes('fitness') ||
            name.includes('crossfit') ||
            name.includes('yoga') ||
            name.includes('pilates')
          );
        },
      },
      {
        id: 'outdoor',
        label: 'Outdoor Space',
        searchParams: { type: 'park' },
        filter: (p) => {
          const types = p.types ?? [];
          return (
            types.includes('park') ||
            types.includes('natural_feature') ||
            types.includes('campground') ||
            types.includes('stadium')
          );
        },
      },
      {
        id: 'community',
        label: 'Community Center',
        searchParams: { keyword: 'community center recreation center' },
        filter: (p) => {
          const name = (p.name ?? '').toLowerCase();
          return (
            name.includes('community') ||
            name.includes('recreation') ||
            name.includes('rec ') ||
            name.includes('civic') ||
            name.includes('centre') ||
            name.includes('center') ||
            name.includes('ymca') ||
            name.includes('ywca')
          );
        },
      },
      {
        id: 'therapist',
        label: 'Therapist',
        searchParams: { keyword: 'therapist counseling mental health psychology' },
        filter: (p) => {
          const types = p.types ?? [];
          const name = (p.name ?? '').toLowerCase();
          return (
            types.includes('physiotherapist') ||
            name.includes('therap') ||
            name.includes('counsel') ||
            name.includes('mental') ||
            name.includes('psych') ||
            name.includes('behav')
          );
        },
      },
      {
        id: 'healthy_eating',
        label: 'Healthy Eating',
        searchParams: { keyword: 'healthy organic vegan salad juice bar' },
        filter: (p) => {
          const types = p.types ?? [];
          const name = (p.name ?? '').toLowerCase();
          const foodTypes = [
            'restaurant', 'food', 'cafe', 'bakery',
            'meal_takeaway', 'meal_delivery',
            'health_food_store', 'grocery_or_supermarket',
          ];
          return (
            types.some((t) => foodTypes.includes(t)) ||
            name.includes('health') ||
            name.includes('organic') ||
            name.includes('vegan') ||
            name.includes('salad') ||
            name.includes('juice') ||
            name.includes('natural') ||
            name.includes('wholesome')
          );
        },
      },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const PlaceCard = ({ label, place, detailedHours, showInsuranceIndicator }) => {
  const [showHours, setShowHours] = useState(false);
  const insuranceScore = showInsuranceIndicator ? calculateInsuranceScore(place) : 0;

  return (
    <li style={{ marginBottom: '16px' }}>
      <div>
        <strong>[{label}]</strong> {place.name}
        {showInsuranceIndicator && insuranceScore > 15 && (
          <span style={{ 
            marginLeft: '6px',
            padding: '2px 8px',
            background: '#e8f5e9',
            color: '#2e7d32',
            fontSize: '11px',
            borderRadius: '12px',
            fontWeight: 'bold',
            border: '1px solid #4caf50'
          }}>
            💳 Likely Accepts Insurance
          </span>
        )}
        {place.vicinity && <span> — {place.vicinity}</span>}
        {place.rating != null && (
          <span> | {place.rating} ★ ({place.user_ratings_total ?? 0} reviews)</span>
        )}
        {place.price_level != null && (
          <span> | {place.price_level === 0 ? 'Free' : '$'.repeat(place.price_level)}</span>
        )}
        {place.opening_hours && (
          <span> | <strong style={{ color: place.opening_hours.open_now ? 'green' : 'red' }}>
            {place.opening_hours.open_now ? '✓ Open now' : '✗ Closed'}
          </strong></span>
        )}
      </div>

      {detailedHours && (
        <div style={{ marginTop: '8px' }}>
          <button
            onClick={() => setShowHours(!showHours)}
            style={{
              fontSize: '12px',
              padding: '4px 8px',
              cursor: 'pointer',
              background: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '4px'
            }}
          >
            {showHours ? '▼' : '▶'} {showHours ? 'Hide' : 'Show'} Hours
          </button>
          {showHours && (
            <div style={{ marginTop: '6px', fontSize: '13px', color: '#555' }}>
              {detailedHours.weekday_text?.map((day, i) => (
                <div key={i} style={{ padding: '2px 0' }}>{day}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
};

const SORT_OPTIONS = [
  { value: 'distance', label: 'Nearest' },
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'highest_rating', label: 'Highest Rating' },
  { value: 'most_reviewed', label: 'Most Reviewed' },
  { value: 'insurance', label: 'Likely Accepts Insurance' },
];

const Results = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const mapDivRef = useRef(null);
  const [activeSection, setActiveSection] = useState(0);
  const [categoryData, setCategoryData] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState('Searching nearby places…');
  const [excludeClosed, setExcludeClosed] = useState(false);
  const [placeDetails, setPlaceDetails] = useState({});
  const [secondSortMethod, setSecondSortMethod] = useState('distance');

  useEffect(() => {
    if (!state) return;

    const { lat, lng } = state;

    const runAllSearches = () => {
      const center = new window.google.maps.LatLng(lat, lng);
      const service = new window.google.maps.places.PlacesService(mapDivRef.current);

      const allCategories = SECTIONS.flatMap((s) => s.categories);

      const searches = allCategories.map((cat) => {
        const params = {
          location: center,
          rankBy: window.google.maps.places.RankBy.DISTANCE,
          ...cat.searchParams,
        };
        return nearbySearchPromise(service, params).then(({ results }) => {
          const filtered = results.filter(cat.filter).slice(0, 20);
          return { id: cat.id, allPlaces: filtered };
        });
      });

      Promise.all(searches).then((results) => {
        const data = {};
        results.forEach((r) => {
          data[r.id] = { allPlaces: r.allPlaces };
        });
        setCategoryData(data);
        setLoadingStatus('');

        // Fetch detailed hours for all places
        const allPlaces = results.flatMap((r) => r.allPlaces).filter(Boolean);
        const detailsPromises = allPlaces.map((place) =>
          placeDetailsPromise(service, place.place_id)
            .then(({ result }) => ({
              placeId: place.place_id,
              hours: result?.opening_hours
            }))
        );

        Promise.all(detailsPromises).then((details) => {
          const detailsMap = {};
          details.forEach((d) => {
            if (d.hours) {
              detailsMap[d.placeId] = d.hours;
            }
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

  if (!state) {
    return (
      <div>
        <p>No location data found.</p>
        <button onClick={() => navigate('/')}>Go back</button>
      </div>
    );
  }

  const activeCategories = SECTIONS[activeSection].categories;

  return (
    <div>
      <AuthHeader />
      
      <div ref={mapDivRef} style={{ display: 'none' }} />

      <div style={{ padding: '0 30px' }}>
        <p style={{ fontSize: '16px', marginBottom: '10px' }}>
          <strong>Location:</strong> {state.address}
        </p>
        <button 
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px',
            cursor: 'pointer',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '20px'
          }}
        >
          ← Go back
        </button>

        <div style={{ marginTop: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setExcludeClosed(!excludeClosed)}
            style={{
              padding: '8px 16px',
              background: excludeClosed ? '#1a7f5a' : '#f0f0f0',
              color: excludeClosed ? 'white' : 'black',
              border: '1px solid #ccc',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {excludeClosed ? '✓' : '○'} Exclude Closed Places
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label htmlFor="sort-method" style={{ fontWeight: 'bold', fontSize: '14px' }}>
              Sort 2nd Result By:
            </label>
            <select
              id="sort-method"
              value={secondSortMethod}
              onChange={(e) => setSecondSortMethod(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ccc',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                background: 'white'
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          {SECTIONS.map((section, i) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(i)}
              disabled={activeSection === i}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 30px' }}>
        {loadingStatus && <p>{loadingStatus}</p>}

        {categoryData && activeCategories.map((cat) => {
        const data = categoryData[cat.id];
        let allPlaces = data?.allPlaces ?? [];
        
        // Filter out closed places if the option is enabled
        if (excludeClosed) {
          allPlaces = allPlaces.filter((p) => p.opening_hours?.open_now);
        }
        
        if (allPlaces.length === 0) {
          return (
            <div key={cat.id}>
              <h3>{cat.label}</h3>
              <p>{excludeClosed ? 'No open places found nearby.' : 'None found nearby.'}</p>
            </div>
          );
        }
        
        const bestOverall = getBestOverall(allPlaces);
        const secondResult = bestOverall 
          ? getSecondResult(allPlaces, secondSortMethod, bestOverall.place_id)
          : null;
        
        const sortLabel = SORT_OPTIONS.find(opt => opt.value === secondSortMethod)?.label || 'Second Choice';

        return (
          <div key={cat.id}>
            <h3>{cat.label}</h3>
            <ul>
              {bestOverall && (
                <PlaceCard
                  label="Best Overall"
                  place={bestOverall}
                  detailedHours={placeDetails[bestOverall.place_id]}
                  showInsuranceIndicator={secondSortMethod === 'insurance'}
                />
              )}
              {secondResult && (
                <PlaceCard
                  label={sortLabel}
                  place={secondResult}
                  detailedHours={placeDetails[secondResult.place_id]}
                  showInsuranceIndicator={secondSortMethod === 'insurance'}
                />
              )}
            </ul>
          </div>
        );
      })}
      </div>
    </div>
  );
};

export default Results;
