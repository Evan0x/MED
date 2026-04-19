import { useEffect, useRef, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";

// 1. IMPORT THE PROFILE FORM HERE
import ProfileForm from './ProfileForm'; 

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(callback) {
  if (window.google?.maps) {
    callback();
    return;
  }
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

const App = () => {
  const inputRef = useRef(null);
  const [location, setLocation] = useState({ address: '', lat: null, lng: null });
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadGoogleMaps(() => {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;
        setLocation({
          address: place.formatted_address,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
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
              setLocation({ address, lat: latitude, lng: longitude });
              if (inputRef.current) inputRef.current.value = address;
              setStatus('');
            } else {
              setStatus('Could not convert your coordinates to an address.');
            }
          }
        );
      },
      ({ message }) => setStatus(`Geolocation error: ${message}`)
    );
  };

  return (
    <div>
      {/* AUTH HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 30px', borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Med Map</h1>
        <div>
          <SignedOut>
            <SignInButton mode="modal">
              <button style={{ padding: '8px 16px', cursor: 'pointer' }}>Sign In</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
        </div>
      </header>

      {/* MAP CONTROLS */}
      <div style={{ padding: '0 30px' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter your address"
          style={{ padding: '8px', marginRight: '10px', width: '300px' }}
        />
        <button onClick={handleLocateMe} style={{ padding: '8px 16px' }}>Locate Me</button>

        {status && <p>{status}</p>}

        {location.lat !== null && (
          <p style={{ marginTop: '20px' }}>
            <strong>Selected:</strong> {location.address}
            <br />
            <strong>Coordinates:</strong> {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
        )}

        {/* 2. RENDER THE PROFILE FORM HERE */}
        <div style={{ marginTop: '40px' }}>
          <ProfileForm />
        </div>

      </div>
    </div>
  );
};

export default App;