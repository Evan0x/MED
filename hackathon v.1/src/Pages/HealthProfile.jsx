import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import AuthHeader from '../Components/AuthHeader';
import { supabase } from '../Supabase';

const TEAL = '#0f766e';
const AMBER = '#f59e0b';
const PIN_KEY = 'medmap_health_pin';

const EMPTY_PROFILE = {
  firstName: '', lastName: '',
  bloodType: '', allergies: '', conditions: '',
  pastProcedures: '', medications: '',
  currentSymptoms: '',
  emergencyName: '', emergencyPhone: '', emergencyEmail: '',
  insuranceProvider: '', insurancePolicy: '',
};

const toRow = (p, userId) => ({
  user_id: userId,
  first_name: p.firstName,
  last_name: p.lastName,
  blood_type: p.bloodType,
  allergies: p.allergies,
  conditions: p.conditions,
  past_procedures: p.pastProcedures,
  medications: p.medications,
  current_symptoms: p.currentSymptoms,
  emergency_name: p.emergencyName,
  emergency_phone: p.emergencyPhone,
  emergency_email: p.emergencyEmail,
  insurance_provider: p.insuranceProvider,
  insurance_policy: p.insurancePolicy,
  updated_at: new Date().toISOString(),
});

const fromRow = (row) => ({
  firstName: row.first_name || '',
  lastName: row.last_name || '',
  bloodType: row.blood_type || '',
  allergies: row.allergies || '',
  conditions: row.conditions || '',
  pastProcedures: row.past_procedures || '',
  medications: row.medications || '',
  currentSymptoms: row.current_symptoms || '',
  emergencyName: row.emergency_name || '',
  emergencyPhone: row.emergency_phone || '',
  emergencyEmail: row.emergency_email || '',
  insuranceProvider: row.insurance_provider || '',
  insurancePolicy: row.insurance_policy || '',
});

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
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [requirePin, setRequirePin] = useState(false);
  const [storedPin, setStoredPin] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pinError, setPinError] = useState('');
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [targetLang, setTargetLang] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const saveTimer = useRef(null);
  const translationCache = useRef({});

  // ── Load from Supabase ──
  useEffect(() => {
    if (!isLoaded || !user) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (data && !error) {
        setProfile(fromRow(data));
      }
      setLoading(false);
    };
    load();

    const pin = localStorage.getItem(PIN_KEY);
    if (pin) {
      setStoredPin(pin);
      setRequirePin(true);
      setShowPinEntry(true);
    } else {
      setUnlocked(true);
    }
  }, [isLoaded, user]);

  // ── Auto-save to Supabase ──
  const updateField = useCallback((field, value) => {
    if (!user) return;
    setProfile(prev => {
      const next = { ...prev, [field]: value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await supabase
          .from('health_profiles')
          .upsert(toRow(next, user.id), { onConflict: 'user_id' });
        setSavedIndicator(true);
        setTimeout(() => setSavedIndicator(false), 2500);
      }, 700);
      return next;
    });
  }, [user]);

  // ── Build read-aloud summary for phone calls to hospitals/doctors ──
  const buildSummary = (p) => {
    const name = [p.firstName, p.lastName].filter(Boolean).join(' ');
    if (!name && !p.bloodType && !p.conditions && !p.currentSymptoms) return '';

    const lines = [];

    // Opening
    lines.push(
      `Hello, I am calling regarding a patient${name ? ` named ${name}` : ''}.`
    );

    // Blood type & allergies
    if (p.bloodType || p.allergies) {
      const bt = p.bloodType ? `Their blood type is ${p.bloodType}.` : '';
      const al = p.allergies
        ? `They have known allergies to ${p.allergies}.`
        : 'No known allergies.';
      lines.push([bt, al].filter(Boolean).join(' '));
    }

    // Current symptoms — most urgent, said early
    if (p.currentSymptoms) {
      lines.push(
        `The patient is currently experiencing the following symptoms: ${p.currentSymptoms}.`
      );
    }

    // Medical conditions
    if (p.conditions) {
      lines.push(`Their medical history includes: ${p.conditions}.`);
    }

    // Medications
    if (p.medications) {
      lines.push(`They are currently taking: ${p.medications}.`);
    }

    // Past procedures
    if (p.pastProcedures) {
      lines.push(`Past procedures include: ${p.pastProcedures}.`);
    }

    // Insurance
    if (p.insuranceProvider || p.insurancePolicy) {
      const ins = [
        p.insuranceProvider && `provider is ${p.insuranceProvider}`,
        p.insurancePolicy && `policy number ${p.insurancePolicy}`,
      ].filter(Boolean).join(', ');
      lines.push(`Insurance ${ins}.`);
    }

    // Emergency contact — closing
    if (p.emergencyName || p.emergencyPhone) {
      const ec = [p.emergencyName, p.emergencyPhone].filter(Boolean).join(', reachable at ');
      lines.push(
        `The emergency contact is ${ec}. Please reach out to them as soon as possible.`
      );
    }

    lines.push('Thank you.');
    return lines.join('\n\n');
  };

  const LANGUAGES = [
    { code: 'es', label: 'Spanish', voice: 'es-ES-Standard-A' },
    { code: 'fr', label: 'French', voice: 'fr-FR-Standard-A' },
    { code: 'zh', label: 'Chinese', voice: 'cmn-CN-Standard-A' },
    { code: 'ar', label: 'Arabic', voice: 'ar-XA-Standard-A' },
    { code: 'hi', label: 'Hindi', voice: 'hi-IN-Standard-A' },
    { code: 'pt', label: 'Portuguese', voice: 'pt-BR-Standard-A' },
    { code: 'de', label: 'German', voice: 'de-DE-Standard-A' },
    { code: 'ja', label: 'Japanese', voice: 'ja-JP-Standard-A' },
    { code: 'ko', label: 'Korean', voice: 'ko-KR-Standard-A' },
    { code: 'ru', label: 'Russian', voice: 'ru-RU-Standard-A' },
    { code: 'vi', label: 'Vietnamese', voice: 'vi-VN-Standard-A' },
    { code: 'tl', label: 'Tagalog', voice: 'fil-PH-Standard-A' },
  ];

  const handleTranslate = async (langCode) => {
    setTargetLang(langCode);
    setTranslatedText('');
    if (!langCode) return;

    const summary = buildSummary(profile);
    if (!summary) return;

    const cacheKey = `${langCode}::${summary}`;
    if (translationCache.current[cacheKey]) {
      setTranslatedText(translationCache.current[cacheKey]);
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${import.meta.env.VITE_GEMINI_TRANSLATE_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: summary,
            target: langCode,
            source: 'en',
            format: 'text',
          }),
        }
      );
      const json = await res.json();
      const text = json?.data?.translations?.[0]?.translatedText;
      if (text) {
        translationCache.current[cacheKey] = text;
        setTranslatedText(text);
      } else {
        setTranslatedText('Translation failed. Check your API key or Cloud Translation API is enabled.');
      }
    } catch (e) {
      console.error('Translation error:', e);
      setTranslatedText('Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };

  const handleSpeak = async (text, langCode) => {
    if (!text) return;
    if (speaking) {
      if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
      }
      setSpeaking(false);
      return;
    }

    setSpeaking(true);
    try {
      const voiceName = LANGUAGES.find(l => l.code === langCode)?.voice || 'en-US-Standard-A';
      const langCodeFull = voiceName.split('-').slice(0, 2).join('-');

      const res = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${import.meta.env.VITE_GEMINI_SPEECH_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input: { text: text },
            voice: {
              languageCode: langCodeFull,
              name: voiceName,
            },
            audioConfig: {
              audioEncoding: 'MP3',
              pitch: 0,
              speakingRate: 0.95,
            },
          }),
        }
      );

      if (!res.ok) {
        throw new Error(`TTS API error: ${res.status}`);
      }

      const json = await res.json();
      const audioContent = json.audioContent;

      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mp3' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      window.currentAudio = audio;

      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        window.currentAudio = null;
      };

      audio.onerror = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        window.currentAudio = null;
        alert('⚠️ Audio playback failed');
      };

      await audio.play();
    } catch (e) {
      console.error('Google TTS error:', e);
      setSpeaking(false);
      alert('⚠️ Text-to-speech failed. Check your Google Cloud TTS API key and ensure the API is enabled.');
    }
  };

  // ── Build QR URL (clean, points to Supabase-backed page) ──
  const qrValue = user
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/health-profile/${user.id}`
    : 'Loading...';

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

    heading('Avela Health Passport');
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
    doc.text('Generated by Avela · For emergency use only · Not a substitute for professional medical records', 20, y);

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
              {loading ? 'Loading your profile…' : 'Your data is securely synced to the cloud.'}
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

            {/* Current Symptoms */}
            <SectionTitle>Current Symptoms</SectionTitle>
            <Field label="Current Symptoms" value={profile.currentSymptoms} onChange={v => updateField('currentSymptoms', v)} placeholder="Chest pain, shortness of breath, dizziness…" />

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
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              fontSize: '13px', fontWeight: 600, color: '#475569',
            }}>
              <span>🔒</span>
              <span>Require PIN to view full profile</span>
              <Toggle checked={requirePin} onChange={handleTogglePin} />
            </div>

            <div style={{ width: '100%', height: '1px', backgroundColor: '#e2e8f0' }} />

            {/* Passport info */}
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#1e293b', lineHeight: 1.3 }}>
                Your Health Passport
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Scan QR to view full medical profile</p>
            </div>

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


            {/* Divider */}

            {/* Phone Call Summary */}
            <div style={{
              width: '100%', backgroundColor: 'white', borderRadius: '12px',
              padding: '16px', border: '1px solid #e2e8f0',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px' }}>📞</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Phone Call Script
                  </span>
                </div>
                {buildSummary(profile) && (
                  <button
                    onClick={() => {
                      const ta = document.createElement('textarea');
                      ta.value = buildSummary(profile);
                      ta.style.position = 'fixed'; ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                      alert('✅ Script copied to clipboard!');
                    }}
                    style={{
                      padding: '4px 10px', borderRadius: '6px',
                      backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
                      fontSize: '11px', fontWeight: 600, color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    📋 Copy
                  </button>
                )}
              </div>

              {buildSummary(profile) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {buildSummary(profile).split('\n\n').map((line, i) => (
                    <p key={i} style={{
                      margin: 0,
                      fontSize: '13px',
                      color: i === 0 ? '#0f766e' : '#374151',
                      fontWeight: i === 0 ? 600 : 400,
                      lineHeight: 1.7,
                      paddingLeft: i > 0 && i < buildSummary(profile).split('\n\n').length - 1 ? '10px' : '0',
                      borderLeft: i > 0 && i < buildSummary(profile).split('\n\n').length - 1 ? '2px solid #e2e8f0' : 'none',
                    }}>
                      {line}
                    </p>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                  Fill in your profile to generate a phone call script.
                </p>
              )}
            </div>

            {/* Translate & Speak Section */}
            {buildSummary(profile) && (
              <div style={{
                width: '100%', backgroundColor: 'white', borderRadius: '12px',
                padding: '16px', border: '1px solid #e2e8f0',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '15px' }}>🌐</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Translate & Read Aloud
                  </span>
                </div>

                <select
                  value={targetLang}
                  onChange={e => handleTranslate(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', fontSize: '13px',
                    color: '#1e293b', backgroundColor: 'white',
                    cursor: 'pointer', outline: 'none', marginBottom: '12px',
                  }}
                >
                  <option value="">Select a language…</option>
                  {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>

                {translating && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    color: '#94a3b8', fontSize: '13px', padding: '8px 0',
                  }}>
                    <div style={{
                      width: '14px', height: '14px', border: '2px solid #e2e8f0',
                      borderTopColor: TEAL, borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    Translating…
                  </div>
                )}

                {translatedText && !translating && (
                  <>
                    <div style={{
                      padding: '12px', backgroundColor: '#f8fafc',
                      borderRadius: '8px', border: '1px solid #e2e8f0',
                      fontSize: '13px', color: '#374151', lineHeight: 1.75,
                      whiteSpace: 'pre-line', marginBottom: '10px',
                    }}>
                      {translatedText}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleSpeak(translatedText, targetLang)}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '8px',
                          backgroundColor: speaking ? '#dc2626' : TEAL,
                          border: 'none', color: 'white',
                          fontSize: '13px', fontWeight: 700,
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', gap: '6px',
                          transition: 'background-color 0.2s',
                        }}
                      >
                        {speaking ? '⏹ Stop' : '🔊 Read Aloud'}
                      </button>
                      <button
                        onClick={() => {
                          const ta = document.createElement('textarea');
                          ta.value = translatedText;
                          ta.style.position = 'fixed'; ta.style.opacity = '0';
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand('copy');
                          document.body.removeChild(ta);
                          alert('✅ Translated text copied!');
                        }}
                        style={{
                          padding: '10px 14px', borderRadius: '8px',
                          backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
                          fontSize: '13px', fontWeight: 600, color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        📋
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
