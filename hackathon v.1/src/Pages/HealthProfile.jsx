import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import AuthHeader from '../Components/AuthHeader';

const TEAL = '#0f766e';
const AMBER = '#f59e0b';
const STORAGE_KEY = 'medmap_health_profile';
const PROFILE_ID_KEY = 'medmap_profile_id';
const PIN_KEY = 'medmap_health_pin';

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const EMPTY_PROFILE = {
  firstName: '', lastName: '',
  bloodType: '', allergies: '', conditions: '',
  pastProcedures: '',
  medications: '',
  emergencyName: '', emergencyPhone: '', emergencyEmail: '',
  insuranceProvider: '', insurancePolicy: '',
};

// ── Small reusable pieces ─────────────────────────────────────────────────────

const SectionTitle = ({ children }) => (
  <h3 style={{
    margin: '28px 0 14px', fontSize: '15px', fontWeight: 700,
    color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px',
  }}>
    {children}
  </h3>
);

const Field = ({ label, value, onChange, placeholder, type = 'text', half = false }) => (
  <div style={{ gridColumn: half ? 'auto' : '1 / -1' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || label}
      style={{
        width: '100%', padding: '10px 13px',
        border: '1px solid #e2e8f0', borderRadius: '8px',
        fontSize: '14px', color: '#1e293b', backgroundColor: 'white',
        outline: 'none', boxSizing: 'border-box',
        transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.target.style.borderColor = TEAL; }}
      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
    />
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: '44px', height: '24px', borderRadius: '12px',
      backgroundColor: checked ? TEAL : '#cbd5e1',
      border: 'none', cursor: 'pointer', position: 'relative',
      transition: 'background-color 0.2s', flexShrink: 0, padding: 0,
    }}
  >
    <div style={{
      width: '18px', height: '18px', borderRadius: '50%',
      backgroundColor: 'white', position: 'absolute',
      top: '3px', left: checked ? '23px' : '3px',
      transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    }} />
  </button>
);

// ── PIN modal ─────────────────────────────────────────────────────────────────

const PinModal = ({ mode, onConfirm, onCancel, error }) => {
  const [digits, setDigits] = useState(['', '', '', '']);
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const handleDigit = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 3) refs[i + 1].current?.focus();
    if (next.every(d => d !== '') && next.filter(d => d).length === 4) {
      setTimeout(() => onConfirm(next.join('')), 80);
    }
  };

  const handleKey = (i, e) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus();
    if (e.key === 'Enter' && digits.every(d => d)) onConfirm(digits.join(''));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      backgroundColor: 'rgba(15,23,42,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '20px', padding: '40px',
        width: '360px', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔐</div>
        <h2 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: '20px', fontWeight: 700 }}>
          {mode === 'setup' ? 'Set a PIN' : 'Enter PIN'}
        </h2>
        <p style={{ margin: '0 0 28px', color: '#64748b', fontSize: '14px' }}>
          {mode === 'setup'
            ? 'Choose a 4-digit PIN to protect your health profile'
            : 'Enter your PIN to access your health profile'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '24px' }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              autoFocus={i === 0}
              style={{
                width: '52px', height: '56px', textAlign: 'center',
                fontSize: '22px', fontWeight: 700,
                border: `2px solid ${error ? '#fca5a5' : d ? TEAL : '#e2e8f0'}`,
                borderRadius: '10px', outline: 'none',
                backgroundColor: d ? '#f0fdf4' : 'white',
                color: '#1e293b', transition: 'all 0.15s',
              }}
            />
          ))}
        </div>
        {error && <p style={{ color: '#dc2626', fontSize: '13px', marginBottom: '16px' }}>{error}</p>}
        <button
          onClick={onCancel}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#64748b', fontSize: '14px', textDecoration: 'underline',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const HealthProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [profileId, setProfileId] = useState('');
  const [requirePin, setRequirePin] = useState(false);
  const [storedPin, setStoredPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinError, setPinError] = useState('');
  const [savedIndicator, setSavedIndicator] = useState(false);
  const saveTimer = useRef(null);

  // ── Load from localStorage ──
  useEffect(() => {
    let id = localStorage.getItem(PROFILE_ID_KEY);
    if (!id) {
      id = generateId();
      localStorage.setItem(PROFILE_ID_KEY, id);
      console.log('Generated new profile ID:', id);
    } else {
      console.log('Loaded existing profile ID:', id);
    }
    setProfileId(id);

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const profileData = JSON.parse(raw);
        setProfile(profileData);
        console.log('Loaded profile data:', profileData);
        // Immediately migrate existing profile to ID-based storage
        localStorage.setItem(`medmap_profile_${id}`, raw);
        console.log('Saved profile to ID-based storage:', `medmap_profile_${id}`);
      } catch (_) { /* ignore */ }
    } else {
      // Initialize with empty profile and save it
      console.log('No existing profile, initializing empty profile');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(EMPTY_PROFILE));
      localStorage.setItem(`medmap_profile_${id}`, JSON.stringify(EMPTY_PROFILE));
    }
    
    const pin = localStorage.getItem(PIN_KEY);
    if (pin) {
      setStoredPin(pin);
      setRequirePin(true);
      setShowPinEntry(true);
    } else {
      setUnlocked(true);
    }
  }, []);

  // ── Auto-save on profile change ──
  const updateField = useCallback((field, value) => {
    setProfile(prev => {
      const next = { ...prev, [field]: value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        localStorage.setItem(`medmap_profile_${profileId}`, JSON.stringify(next));
        console.log('Auto-saved profile to:', `medmap_profile_${profileId}`, next);
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2500);
      }, 700);
      return next;
    });
  }, [profileId]);

  // ── Build QR URL with profile data embedded in hash ──
  const qrValue = (() => {
    if (!profileId) return 'Loading...';
    const data = {
      n: [profile.firstName, profile.lastName].filter(Boolean).join(' '),
      b: profile.bloodType,
      a: profile.allergies,
      c: profile.conditions,
      m: profile.medications,
      p: profile.pastProcedures,
      en: profile.emergencyName,
      ep: profile.emergencyPhone,
      ee: profile.emergencyEmail,
      ip: profile.insuranceProvider,
      ipo: profile.insurancePolicy,
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const base = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
    return `${base}/health-profile/${profileId}#${encoded}`;
  })();

  // ── Download QR as SVG ──
  const downloadQR = () => {
    const svg = document.getElementById('health-qr-svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'health-passport-qr.svg'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Download PDF ──
  const downloadPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    let y = 20;

    const heading = (text, size = 22) => {
      doc.setFontSize(size);
      doc.setTextColor(15, 118, 110);
      doc.setFont('helvetica', 'bold');
      doc.text(text, 20, y); y += size * 0.5 + 2;
    };
    const section = (title) => {
      y += 4;
      doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
      doc.text(title, 20, y); y += 6;
      doc.setDrawColor(226, 232, 240); doc.line(20, y, pageW - 20, y); y += 5;
    };
    const row = (label, value) => {
      if (!value) return;
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(100, 116, 139);
      doc.text(label, 22, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(value, pageW - 80);
      doc.text(lines, 70, y); y += Math.max(7, lines.length * 5.5);
    };

    heading('Med Map Health Passport');
    doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y); y += 14;

    section('Personal Information');
    row('First Name', profile.firstName); row('Last Name', profile.lastName);

    section('Critical Medical Info');
    row('Blood Type', profile.bloodType); row('Allergies', profile.allergies);
    row('Conditions', profile.conditions);

    section('Past Procedures');
    row('Procedures', profile.pastProcedures || 'None listed');

    section('Medications');
    row('Medications', profile.medications || 'None listed');

    section('Emergency Contact');
    row('Name', profile.emergencyName); row('Phone', profile.emergencyPhone);
    row('Email', profile.emergencyEmail);

    section('Insurance Details');
    row('Provider', profile.insuranceProvider); row('Policy Number', profile.insurancePolicy);

    y += 10;
    doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'italic');
    doc.text('Generated by Med Map · For emergency use only · Not a substitute for professional medical records', 20, y);

    doc.save(`${profile.firstName || 'health'}-passport.pdf`);
  };

  // ── PIN handlers ──
  const handleTogglePin = (val) => {
    if (val) {
      setShowPinSetup(true);
    } else {
      setRequirePin(false);
      setStoredPin('');
      localStorage.removeItem(PIN_KEY);
    }
  };

  const handlePinSetup = (pin) => {
    setStoredPin(pin);
    setRequirePin(true);
    localStorage.setItem(PIN_KEY, pin);
    setShowPinSetup(false);
  };

  const handlePinEntry = (pin) => {
    if (pin === storedPin) {
      setUnlocked(true);
      setShowPinEntry(false);
      setPinError('');
    } else {
      setPinError('Incorrect PIN. Please try again.');
    }
  };

  // ── PIN screens ──
  if (showPinSetup) {
    return (
      <PinModal
        mode="setup"
        onConfirm={handlePinSetup}
        onCancel={() => setShowPinSetup(false)}
        error={pinError}
      />
    );
  }

  if (showPinEntry && !unlocked) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, sans-serif' }}>
        <AuthHeader showBack onBack={() => navigate('/')} />
        <PinModal
          mode="entry"
          onConfirm={handlePinEntry}
          onCancel={() => navigate('/')}
          error={pinError}
        />
      </div>
    );
  }

  // ── Main render ──
  const grid2 = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <AuthHeader showBack onBack={() => navigate('/')} />

      <SignedOut>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#64748b' }}>
          <div style={{ fontSize: '48px' }}>🔒</div>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Please sign in to view your health profile</p>
        </div>
      </SignedOut>

      <SignedIn>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 64px)' }}>

          {/* ── Left: Form ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', minWidth: 0 }}>
            {/* Page header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#1e293b' }}>
                Health Profile Editor
              </h1>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '12px', color: savedIndicator ? TEAL : 'transparent',
                fontWeight: 600, transition: 'color 0.3s',
              }}>
                <span style={{ fontSize: '16px' }}>↻</span> Auto-saved
              </div>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: '#94a3b8' }}>
              Your data is stored locally on this device only.
            </p>

            {/* Personal Info */}
            <SectionTitle>Personal Info</SectionTitle>
            <div style={grid2}>
              <Field half label="First name" value={profile.firstName} onChange={v => updateField('firstName', v)} placeholder="Susanne" />
              <Field half label="Last name" value={profile.lastName} onChange={v => updateField('lastName', v)} placeholder="Doe" />
            </div>

            {/* Critical Medical Info */}
            <SectionTitle>Critical Medical Info</SectionTitle>
            <div style={grid2}>
              <Field half label="Blood Type" value={profile.bloodType} onChange={v => updateField('bloodType', v)} placeholder="O+" />
              <Field half label="Allergies" value={profile.allergies} onChange={v => updateField('allergies', v)} placeholder="Penicillin, Peanuts" />
            </div>
            <div style={{ marginTop: '12px' }}>
              <Field label="Conditions" value={profile.conditions} onChange={v => updateField('conditions', v)} placeholder="Hypertension, Diabetes…" />
            </div>

            {/* Past Procedures */}
            <SectionTitle>Past Procedures</SectionTitle>
            <Field label="Past Procedures" value={profile.pastProcedures} onChange={v => updateField('pastProcedures', v)} placeholder="Appendectomy 2018, Knee surgery 2021…" />

            {/* Medications */}
            <SectionTitle>Medications</SectionTitle>
            <Field label="Medications" value={profile.medications} onChange={v => updateField('medications', v)} placeholder="Lisinopril 10mg daily, Metformin 500mg…" />

            {/* Emergency Contacts */}
            <SectionTitle>Emergency Contacts</SectionTitle>
            <div style={grid2}>
              <Field half label="Name" value={profile.emergencyName} onChange={v => updateField('emergencyName', v)} placeholder="Jane Doe" />
              <Field half label="Phone" value={profile.emergencyPhone} onChange={v => updateField('emergencyPhone', v)} placeholder="+1 (555) 000-0000" type="tel" />
            </div>
            <div style={{ marginTop: '12px' }}>
              <Field label="Email Address" value={profile.emergencyEmail} onChange={v => updateField('emergencyEmail', v)} placeholder="jane@example.com" type="email" />
            </div>

            {/* Insurance */}
            <SectionTitle>Insurance Details</SectionTitle>
            <div style={grid2}>
              <Field half label="Insurance Provider" value={profile.insuranceProvider} onChange={v => updateField('insuranceProvider', v)} placeholder="Blue Cross" />
              <Field half label="Policy Number" value={profile.insurancePolicy} onChange={v => updateField('insurancePolicy', v)} placeholder="POL-123456" />
            </div>

            <div style={{ height: '40px' }} />
          </div>

          {/* ── Right: QR Panel ── */}
          <div style={{
            width: '420px', flexShrink: 0,
            backgroundColor: '#f0f9f7',
            borderLeft: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '32px 28px', overflowY: 'auto',
            gap: '20px',
          }}>
            {/* Fullscreen icon */}
            <div style={{ alignSelf: 'flex-end', color: '#94a3b8', cursor: 'pointer', fontSize: '18px' }}>⛶</div>

            {/* QR card */}
            <div style={{
              backgroundColor: 'white', borderRadius: '20px',
              padding: '24px', border: `2px solid ${TEAL}`,
              boxShadow: '0 4px 20px rgba(15,118,110,0.12)',
              display: 'inline-block',
            }}>
              <QRCodeSVG
                id="health-qr-svg"
                value={qrValue}
                size={220}
                fgColor={TEAL}
                bgColor="white"
                style={{ display: 'block' }}
              />
            </div>

            {/* Require PIN toggle */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '13px', fontWeight: 600, color: '#475569',
            }}>
              <span>🔒</span>
              <span>Require PIN to view full profile</span>
              <Toggle checked={requirePin} onChange={handleTogglePin} />
            </div>

            {/* Divider */}
            <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e8f0' }} />

            {/* Passport info */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#1e293b', lineHeight: 1.3 }}>
                Your Shareable Health Passport
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Scan QR to view full medical profile</p>
            </div>

            {/* Shareable link preview */}
            <div style={{
              width: '100%', backgroundColor: 'white', borderRadius: '12px',
              padding: '14px 16px', border: '1px solid #e2e8f0',
            }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Shareable Link
              </div>
              <div style={{
                fontSize: '12px',
                color: TEAL,
                fontFamily: 'monospace',
                padding: '8px 10px',
                backgroundColor: '#f0fdf4',
                borderRadius: '6px',
                wordBreak: 'break-all',
                lineHeight: 1.5,
                marginBottom: '8px',
              }}>
                {qrValue}
              </div>
              <button
                onClick={() => {
                  // Fallback copy method that works in all browsers
                  const textArea = document.createElement('textarea');
                  textArea.value = qrValue;
                  textArea.style.position = 'fixed';
                  textArea.style.opacity = '0';
                  document.body.appendChild(textArea);
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    alert('✅ Link copied to clipboard!\n\n' + qrValue);
                  } catch (err) {
                    alert('⚠️ Could not copy. Please copy manually:\n\n' + qrValue);
                  }
                  document.body.removeChild(textArea);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: TEAL,
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                📋 Copy Shareable Link
              </button>
              {profile.firstName && profile.lastName && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                    <strong>Preview:</strong>
                  </div>
                  <div style={{ fontSize: '13px', color: '#1e293b', fontWeight: 600 }}>
                    {[profile.firstName, profile.lastName].filter(Boolean).join(' ')}
                  </div>
                  {profile.bloodType && (
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                      Blood Type: {profile.bloodType}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
              <button
                onClick={downloadQR}
                style={{
                  flex: 1, padding: '13px', borderRadius: '28px',
                  backgroundColor: AMBER, border: 'none',
                  color: 'white', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                ↓ Download QR
              </button>
              <button
                onClick={downloadPDF}
                style={{
                  flex: 1, padding: '13px', borderRadius: '28px',
                  backgroundColor: TEAL, border: 'none',
                  color: 'white', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                ↗ Share Profile
              </button>
            </div>
          </div>
        </div>
      </SignedIn>
    </div>
  );
};

export default HealthProfile;
