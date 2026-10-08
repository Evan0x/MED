import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useParams } from 'react-router-dom';
import { supabase } from '../Supabase';
import { AvelaLogo, AvelaWordmark } from '../Components/AvelaLogo';
import { useSystemDarkMode } from '../useSystemDarkMode';

const LIGHT = {
  page: '#f8fafc', card: 'white', text: '#1e293b', muted: '#64748b', label: '#78716c', faint: '#94a3b8',
  section: '#f1f5f9', border: '#e2e8f0', shadow: '0 1px 3px rgba(0,0,0,0.1)',
  critBg: '#fef3c7', critBorder: '#fbbf24', critTitle: '#92400e', blood: '#dc2626',
  emergBg: '#fef2f2', emergBorder: '#dc2626', emergTitle: '#7f1d1d', phone: '#dc2626',
  inputBg: 'white', inputBorder: '#cbd5e1', error: '#dc2626',
};
const DARK = {
  page: '#0b1220', card: '#0f172a', text: '#e2e8f0', muted: '#94a3b8', label: '#a8a29e', faint: '#64748b',
  section: '#1e293b', border: '#243041', shadow: '0 1px 3px rgba(0,0,0,0.5)',
  critBg: '#2a2210', critBorder: '#a16207', critTitle: '#fcd34d', blood: '#f87171',
  emergBg: '#2a1215', emergBorder: '#dc2626', emergTitle: '#fca5a5', phone: '#f87171',
  inputBg: '#1e293b', inputBorder: '#334155', error: '#f87171',
};

const PIN_ERRORS = {
  wrong: 'Incorrect PIN. Please try again.',
  locked: 'Too many wrong attempts. Try again in 15 minutes.',
};

const fromResult = (data) => ({
  firstName: data.first_name || '',
  lastName: data.last_name || '',
  bloodType: data.blood_type || '',
  allergies: data.allergies || '',
  conditions: data.conditions || '',
  medications: data.medications || '',
  pastProcedures: data.past_procedures || '',
  emergencyName: data.emergency_name || '',
  emergencyPhone: data.emergency_phone || '',
  emergencyEmail: data.emergency_email || '',
  insuranceProvider: data.insurance_provider || '',
  insurancePolicy: data.insurance_policy || '',
  locked: Boolean(data.locked),
});

const Label = ({ C, children }) => (
  <div style={{
    fontSize: '12px', fontWeight: 600, color: C.label, marginBottom: '4px',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  }}>
    {children}
  </div>
);

const TextSection = ({ C, title, children }) => (
  <div style={{ marginBottom: '32px' }}>
    <h3 style={{
      margin: '0 0 12px', fontSize: '14px', fontWeight: 700, color: C.muted,
      textTransform: 'uppercase', letterSpacing: '0.5px',
    }}>
      {title}
    </h3>
    <div style={{
      padding: '16px', backgroundColor: C.section, borderRadius: '8px',
      fontSize: '15px', color: C.text, lineHeight: 1.6,
    }}>
      {children}
    </div>
  </div>
);

const HealthProfileOverview = () => {
  const { id } = useParams();
  const isDark = useSystemDarkMode();
  const [printing, setPrinting] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  // Print in light colours even when the screen is dark
  const C = isDark && !printing ? DARK : LIGHT;
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  // id is the profile's secret QR token; the RPC returns just that one profile,
  // and only the emergency basics unless the PIN (if set) is correct.
  const fetchProfile = useCallback(
    (pinAttempt = null) => supabase.rpc('get_profile_by_token', { token: id, pin: pinAttempt }),
    [id],
  );

  useEffect(() => {
    fetchProfile().then(({ data, error }) => {
      if (data && !error) setProfile(fromResult(data));
      setLoading(false);
    });
  }, [fetchProfile]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setPinError('Enter the 4-digit PIN.');
      return;
    }
    setUnlocking(true);
    const { data, error } = await fetchProfile(pin);
    setUnlocking(false);
    setPin('');
    if (error || !data) {
      setPinError('Something went wrong. Please try again.');
      return;
    }
    setProfile(fromResult(data));
    setPinError(data.locked ? PIN_ERRORS[data.pin_error] || PIN_ERRORS.wrong : '');
  };

  const handleEmergencyCall = () => {
    if (profile?.emergencyPhone) {
      window.location.href = `tel:${profile.emergencyPhone}`;
    }
  };

  const centered = {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: C.page,
  };

  if (loading) {
    return (
      <div style={centered}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: C.muted, fontSize: '16px' }}>Loading health profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={centered}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '32px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
          <h2 style={{ margin: '0 0 12px', color: C.text, fontSize: '24px' }}>
            Profile Not Found
          </h2>
          <p style={{ color: C.muted, fontSize: '15px', lineHeight: 1.6 }}>
            This health profile doesn't exist or hasn't been created yet.
          </p>
        </div>
      </div>
    );
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Not provided';

  return (
    <>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        backgroundColor: C.page,
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: C.card,
          borderRadius: '16px',
          boxShadow: C.shadow,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
            padding: '32px',
            color: 'white',
            textAlign: 'center',
          }}>
            <div style={{
              width: '80px', height: '80px', margin: '0 auto 16px',
              backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '40px',
            }}>
              ❤️
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {fullName}
            </h1>
            <p style={{ margin: 0, fontSize: '16px', opacity: 0.9, fontWeight: 500 }}>
              Medical Health Passport
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '40px 32px' }}>
            {/* Critical Info Section */}
            <div style={{
              backgroundColor: C.critBg,
              border: `2px solid ${C.critBorder}`,
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '32px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.critTitle }}>
                  Critical Medical Information
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <Label C={C}>Blood Type</Label>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: C.blood }}>
                    {profile.bloodType || 'Not specified'}
                  </div>
                </div>
                <div>
                  <Label C={C}>Allergies</Label>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: C.text }}>
                    {profile.allergies || 'None reported'}
                  </div>
                </div>
              </div>
            </div>

            {/* PIN-protected details */}
            {profile.locked ? (
              <form
                onSubmit={handleUnlock}
                className="no-print"
                style={{
                  marginBottom: '32px', padding: '24px', borderRadius: '12px',
                  backgroundColor: C.section, border: `1px solid ${C.border}`, textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔒</div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: C.text }}>
                  More medical details are PIN-protected
                </h3>
                <p style={{ margin: '0 0 16px', fontSize: '14px', color: C.muted, lineHeight: 1.5 }}>
                  Conditions, medications, past procedures and insurance need the owner's PIN.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={4}
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="PIN"
                    aria-label="4-digit PIN"
                    style={{
                      width: '120px', padding: '12px', borderRadius: '10px', textAlign: 'center',
                      fontSize: '20px', letterSpacing: '8px', outline: 'none',
                      border: `1.5px solid ${pinError ? C.error : C.inputBorder}`,
                      backgroundColor: C.inputBg, color: C.text,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={unlocking}
                    style={{
                      padding: '12px 22px', borderRadius: '10px', border: 'none',
                      backgroundColor: '#0f766e', color: 'white', fontSize: '15px', fontWeight: 600,
                      cursor: unlocking ? 'wait' : 'pointer', opacity: unlocking ? 0.7 : 1,
                    }}
                  >
                    {unlocking ? 'Checking…' : 'Unlock'}
                  </button>
                </div>
                {pinError && (
                  <p style={{ margin: '12px 0 0', fontSize: '13px', color: C.error }}>{pinError}</p>
                )}
              </form>
            ) : (
              <>
                {profile.conditions && (
                  <TextSection C={C} title="Medical Conditions">{profile.conditions}</TextSection>
                )}
                {profile.medications && (
                  <TextSection C={C} title="Current Medications">{profile.medications}</TextSection>
                )}
                {profile.pastProcedures && (
                  <TextSection C={C} title="Past Procedures">{profile.pastProcedures}</TextSection>
                )}
              </>
            )}

            {/* Emergency Contact */}
            {(profile.emergencyName || profile.emergencyPhone) && (
              <div style={{
                backgroundColor: C.emergBg,
                border: `2px solid ${C.emergBorder}`,
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '32px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '24px' }}>🚨</span>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: C.emergTitle }}>
                    Emergency Contact
                  </h2>
                </div>

                {profile.emergencyName && (
                  <div style={{ marginBottom: '12px' }}>
                    <Label C={C}>Name</Label>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: C.text }}>
                      {profile.emergencyName}
                    </div>
                  </div>
                )}

                {profile.emergencyPhone && (
                  <div style={{ marginBottom: '12px' }}>
                    <Label C={C}>Phone</Label>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: C.phone }}>
                      {profile.emergencyPhone}
                    </div>
                  </div>
                )}

                {profile.emergencyEmail && (
                  <div style={{ marginBottom: '16px' }}>
                    <Label C={C}>Email</Label>
                    <div style={{ fontSize: '15px', fontWeight: 500, color: C.text }}>
                      {profile.emergencyEmail}
                    </div>
                  </div>
                )}

                {profile.emergencyPhone && (
                  <button
                    onClick={handleEmergencyCall}
                    className="no-print"
                    style={{
                      width: '100%', padding: '16px',
                      backgroundColor: '#dc2626', color: 'white',
                      border: 'none', borderRadius: '10px',
                      fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#b91c1c'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#dc2626'}
                  >
                    📞 Call Emergency Contact Now
                  </button>
                )}
              </div>
            )}

            {/* Insurance */}
            {!profile.locked && (profile.insuranceProvider || profile.insurancePolicy) && (
              <TextSection C={C} title="Insurance Information">
                {profile.insuranceProvider && (
                  <div style={{ marginBottom: profile.insurancePolicy ? '12px' : '0' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '2px' }}>
                      Provider
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: C.text }}>
                      {profile.insuranceProvider}
                    </div>
                  </div>
                )}
                {profile.insurancePolicy && (
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '2px' }}>
                      Policy Number
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: C.text, fontFamily: 'monospace' }}>
                      {profile.insurancePolicy}
                    </div>
                  </div>
                )}
              </TextSection>
            )}

            {/* Footer */}
            <div style={{ borderTop: `2px solid ${C.border}`, paddingTop: '24px', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                <AvelaLogo size={26} />
                <AvelaWordmark size={18} color={isDark && !printing ? '#2dd4bf' : '#0f766e'} />
              </div>
              <p style={{ margin: '0 0 24px', fontSize: '13px', color: C.faint }}>
                Digital Health Passport · For emergency use only
              </p>

              {/* Download PDF Button */}
              <button
                onClick={() => window.print()}
                className="no-print"
                style={{
                  padding: '14px 32px',
                  backgroundColor: '#0f766e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#0d5d56'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0f766e'}
              >
                📄 Download as PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HealthProfileOverview;
