import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HealthChatbot from '../Components/Healthchatbot';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(callback) {
  if (window.google?.maps) {
    callback();
    return;
  }
  // Avoid injecting the script twice
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

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        placeholder="Enter your address"
      />
      <button onClick={handleLocateMe}>Locate Me</button>

      {status && <p>{status}</p>}
      
      <HealthChatbot />
    </div>
  );
};

export default Landing;
