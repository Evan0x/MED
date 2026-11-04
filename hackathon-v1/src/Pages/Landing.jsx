import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HealthChatbot from '../Components/Healthchatbot';
import AuthHeader from '../Components/AuthHeader';
import AddressAutocomplete from '../Components/AddressAutocomplete';
import { useSystemDarkMode } from '../useSystemDarkMode';
import { geocodeAddress, getCurrentPosition, reverseGeocode } from '../location/locationService';

const Landing = () => {
  const inputRef = useRef(null);
  const [location, setLocation] = useState({ address: '', lat: null, lng: null });
  const [status, setStatus] = useState('');
  const navigate = useNavigate();
  const dark = useSystemDarkMode();
  const accent = dark ? '#2dd4bf' : '#0f766e';

  const goToResults = (loc) => {
    setLocation(loc);
    navigate('/results', { state: loc });
  };

  const handleLocateMe = async () => {
    setStatus('Locating…');
    try {
      const coords = await getCurrentPosition();
      let address = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
      try {
        const result = await reverseGeocode(coords.lat, coords.lng);
        if (result?.address) address = result.address;
      } catch {
        // Continue with coordinates when reverse geocoding is unavailable.
      }
      const loc = {
        address,
        lat: coords.lat,
        lng: coords.lng,
      };
      if (inputRef.current) inputRef.current.value = loc.address;
      setStatus('');
      goToResults(loc);
    } catch (err) {
      setStatus(err?.message || 'Could not access your current location.');
    }
  };

  const handleSearch = async () => {
    if (location.lat !== null) {
      navigate('/results', { state: location });
      return;
    }
    const val = inputRef.current?.value?.trim();
    if (!val) { setStatus('Please enter an address.'); return; }
    setStatus('Searching…');
    try {
      const result = await geocodeAddress(val);
      goToResults({
        address: result.address,
        lat: result.lat,
        lng: result.lng,
      });
    } catch (err) {
      setStatus(err?.message || 'Address not found. Try selecting from the dropdown.');
    }
  };

  const stats = [
    { label: '50,000+ Clinics' },
    { label: '120+ Countries' },
    { label: 'Verified Reviews' },
  ];

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif', overflow: 'hidden', backgroundColor: dark ? '#0b1220' : 'white' }}>
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
          filter: dark ? 'blur(1px) brightness(0.55) saturate(0.8)' : 'blur(1px) brightness(1.05)',
          transform: 'scale(1.02)',
        }} />
        {/* Warm overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: dark
            ? 'linear-gradient(160deg, rgba(11,18,32,0.88) 0%, rgba(15,23,42,0.84) 50%, rgba(15,23,42,0.78) 100%)'
            : 'linear-gradient(160deg, rgba(255,252,245,0.82) 0%, rgba(245,240,230,0.78) 50%, rgba(240,235,225,0.70) 100%)',
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
            <span style={{ color: dark ? '#f8fafc' : '#1e293b' }}>Find the right care,</span>
            <br />
            <span style={{ color: accent }}>anywhere in the world</span>
          </h1>

          {/* Search bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: dark ? '#1e293b' : 'white',
            borderRadius: '18px',
            padding: '6px 6px 6px 20px',
            boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.14)',
            marginTop: '28px',
            border: dark ? '1px solid #334155' : '1px solid rgba(255,255,255,0.8)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <AddressAutocomplete
              inputRef={inputRef}
              dark={dark}
              onTyping={() => setLocation({ address: '', lat: null, lng: null })}
              onResolved={(item) => goToResults({ address: item.address, lat: item.lat, lng: item.lng })}
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
              color: status.startsWith('Geolocation error') || status.startsWith('Could not') || status.startsWith('Address not') || status.startsWith('Please enter') || status.includes('unavailable') ? (dark ? '#f87171' : '#dc2626') : accent,
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
                <span style={{ fontSize: '14px', color: dark ? '#cbd5e1' : '#475569', fontWeight: 500 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <HealthChatbot />

      {dark && (
        <style>{`
          .landing-search-input::placeholder { color: #64748b; }
        `}</style>
      )}
    </div>
  );
};

export default Landing;
