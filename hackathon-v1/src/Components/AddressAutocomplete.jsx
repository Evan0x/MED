import { useEffect, useRef, useState } from 'react';
import { suggestAddresses } from '../location/locationService';

const AddressAutocomplete = ({
  inputRef,
  dark,
  placeholder = 'Your location...',
  onResolved,
  onTyping,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const onDocClick = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (item) => {
    if (inputRef.current) inputRef.current.value = item.address;
    setSuggestions([]);
    setOpen(false);
    setActiveIndex(-1);
    onResolved?.(item);
  };

  const handleChange = (event) => {
    const value = event.target.value;
    onTyping?.(value);
    abortRef.current?.abort();
    clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const results = await suggestAddresses(value, { signal: controller.signal });
        setSuggestions(results);
        setOpen(results.length > 0);
        setActiveIndex(-1);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
  };

  const handleKeyDown = (event) => {
    if (!open || suggestions.length === 0) {
      if (event.key === 'Escape') setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      choose(suggestions[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ flex: 1, position: 'relative', minWidth: 0 }}>
      <input
        ref={inputRef}
        type="text"
        className="landing-search-input"
        placeholder={placeholder}
        autoComplete="off"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: 'none',
          outline: 'none',
          fontSize: '16px',
          color: dark ? '#e2e8f0' : '#1e293b',
          backgroundColor: 'transparent',
          padding: '10px 14px',
        }}
      />
      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 'calc(100% + 10px)',
            margin: 0,
            padding: '6px 0',
            listStyle: 'none',
            background: dark ? '#1e293b' : 'white',
            border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
            borderRadius: '12px',
            boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.5)' : '0 8px 24px rgba(15,23,42,0.12)',
            textAlign: 'left',
            zIndex: 20,
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {suggestions.map((item, i) => {
            const active = i === activeIndex;
            return (
              <li key={`${item.lat},${item.lng},${item.address}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(item)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    background: active ? (dark ? '#243041' : '#f1f5f9') : 'transparent',
                    color: dark ? '#e2e8f0' : '#1e293b',
                    padding: '10px 14px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  {item.address !== item.name && (
                    <span style={{ display: 'block', color: dark ? '#94a3b8' : '#64748b', fontSize: '12px', marginTop: '2px' }}>
                      {item.address}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default AddressAutocomplete;
