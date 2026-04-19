import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HealthChatbot from '../Components/Healthchatbot';
import AuthHeader from '../Components/AuthHeader';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(callback) {
  if (window.google?.maps) { callback(); return; }
  if (document.querySelector('#gmaps-script')) {
    document.querySelector('#gmaps-script').addEventListener('load', callback);
    return;
  }
  const script = document.createElement('script');
  script.id = 'gmaps-script';
  script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
  script.async = true;
  script.defer = true;
  script.onload = callback;
  document.head.appendChild(script);
}

const Landing = () => {
  const inputRef = useRef(null);
  const [location, setLocation] = useState({ address: '', lat: null, lng: null });
  const [status, setStatus] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadGoogleMaps(() => {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
      });
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;
        const loc = {
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setLocation(loc);
        navigate('/results', { state: loc });
      });
    });
  }, []);

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setStatus('Geolocation is not supported by your browser.');
      return;
    }
    setStatus('Locating…');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        if (!window.google?.maps) {
          setStatus('Google Maps has not loaded yet. Please wait and try again.');
          return;
        }
        new window.google.maps.Geocoder().geocode(
          { location: { lat: latitude, lng: longitude } },
          (results, geocoderStatus) => {
            if (geocoderStatus === 'OK' && results[0]) {
              const address = results[0].formatted_address;
              const loc = { address, lat: latitude, lng: longitude };
              setLocation(loc);
              if (inputRef.current) inputRef.current.value = address;
              setStatus('');
              navigate('/results', { state: loc });
            } else {
              setStatus('Could not convert your coordinates to an address.');
            }
          }
        );
      },
      ({ message }) => setStatus(`Geolocation error: ${message}`)
    );
  };

  const handleSearch = () => {
    if (location.lat !== null) {
      navigate('/results', { state: location });
      return;
    }
    const val = inputRef.current?.value?.trim();
    if (!val) { setStatus('Please enter an address.'); return; }
    if (!window.google?.maps) { setStatus('Google Maps has not loaded yet.'); return; }
    setStatus('Searching…');
    new window.google.maps.Geocoder().geocode({ address: val }, (results, geocoderStatus) => {
      if (geocoderStatus === 'OK' && results[0]) {
        const loc = {
          address: results[0].formatted_address,
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        };
        navigate('/results', { state: loc });
      } else {
        setStatus('Address not found. Try selecting from the dropdown.');
      }
    });
  };

  const stats = [
    { label: '50,000+ Clinics' },
    { label: '120+ Countries' },
    { label: 'Verified Reviews' },
  ];

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden' }}>
      <AuthHeader />

      {/* Hero */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px 20px 40px',
      }}>
        {/* Background image */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/landing-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(1px) brightness(1.05)',
          transform: 'scale(1.02)',
        }} />
        {/* Warm overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(255,252,245,0.82) 0%, rgba(245,240,230,0.78) 50%, rgba(240,235,225,0.70) 100%)',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '700px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 800,
            lineHeight: 1.15,
            margin: '0 0 8px',
            letterSpacing: '-1px',
          }}>
            <span style={{ color: '#1e293b' }}>Find the right care,</span>
            <br />
            <span style={{ color: '#0f766e' }}>anywhere in the world</span>
          </h1>

          {/* Search bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'white',
            borderRadius: '18px',
            padding: '6px 6px 6px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            marginTop: '28px',
            border: '1px solid rgba(255,255,255,0.8)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Your location..."
              onChange={() => setLocation({ address: '', lat: null, lng: null })}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: '16px',
                color: '#1e293b',
                backgroundColor: 'transparent',
                padding: '10px 14px',
                minWidth: 0,
              }}
            />
            <button
              onClick={handleLocateMe}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '12px 18px',
                borderRadius: '12px',
                backgroundColor: '#0f766e',
                border: 'none',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginRight: '6px',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Find Me
            </button>
            <button
              onClick={handleSearch}
              style={{
                padding: '12px 22px',
                borderRadius: '12px',
                backgroundColor: '#f59e0b',
                border: 'none',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Search
            </button>
          </div>

          {status && (
            <p style={{
              marginTop: '14px',
              color: status.startsWith('Geolocation error') || status.startsWith('Could not') || status.startsWith('Address not') ? '#dc2626' : '#0f766e',
              fontSize: '14px',
              fontWeight: 500,
            }}>
              {status}
            </p>
          )}

          {/* Stats */}
          <div style={{
            display: 'flex',
            gap: '32px',
            marginTop: '28px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            {stats.map(({ label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: '#f59e0b', flexShrink: 0,
                }} />
                <span style={{ fontSize: '14px', color: '#475569', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <HealthChatbot />
    </div>
  );
};

export default Landing;
