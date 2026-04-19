import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../Supabase';

const HealthProfileOverview = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('health_profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (data && !error) {
        setProfile({
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
        });
      }
      setLoading(false);
    };
    loadProfile();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleEmergencyCall = () => {
    if (profile?.emergencyPhone) {
      window.location.href = `tel:${profile.emergencyPhone}`;
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
          <p style={{ color: '#64748b', fontSize: '16px' }}>Loading health profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#f8fafc',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '32px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>📋</div>
          <h2 style={{ margin: '0 0 12px', color: '#1e293b', fontSize: '24px' }}>
            Profile Not Found
          </h2>
          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6 }}>
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
        backgroundColor: '#f8fafc',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
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
              width: '80px',
              height: '80px',
              margin: '0 auto 16px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
            }}>
              ❤️
            </div>
            <h1 style={{
              margin: '0 0 8px',
              fontSize: '32px',
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}>
              {fullName}
            </h1>
            <p style={{
              margin: 0,
              fontSize: '16px',
              opacity: 0.9,
              fontWeight: 500,
            }}>
              Medical Health Passport
            </p>
          </div>

          {/* Content */}
          <div style={{ padding: '40px 32px' }}>
            {/* Critical Info Section */}
            <div style={{
              backgroundColor: '#fef3c7',
              border: '2px solid #fbbf24',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '32px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}>
                <span style={{ fontSize: '24px' }}>⚠️</span>
                <h2 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#92400e',
                }}>
                  Critical Medical Information
                </h2>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '20px',
              }}>
                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#78716c',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Blood Type
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#dc2626',
                  }}>
                    {profile.bloodType || 'Not specified'}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#78716c',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}>
                    Allergies
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#1e293b',
                  }}>
                    {profile.allergies || 'None reported'}
                  </div>
                </div>
              </div>
            </div>

            {/* Conditions */}
            {profile.conditions && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Medical Conditions
                </h3>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#1e293b',
                  lineHeight: 1.6,
                }}>
                  {profile.conditions}
                </div>
              </div>
            )}

            {/* Medications */}
            {profile.medications && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Current Medications
                </h3>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#1e293b',
                  lineHeight: 1.6,
                }}>
                  {profile.medications}
                </div>
              </div>
            )}

            {/* Past Procedures */}
            {profile.pastProcedures && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Past Procedures
                </h3>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#1e293b',
                  lineHeight: 1.6,
                }}>
                  {profile.pastProcedures}
                </div>
              </div>
            )}

            {/* Emergency Contact */}
            {(profile.emergencyName || profile.emergencyPhone) && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '2px solid #dc2626',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '32px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                  <span style={{ fontSize: '24px' }}>🚨</span>
                  <h2 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#7f1d1d',
                  }}>
                    Emergency Contact
                  </h2>
                </div>

                {profile.emergencyName && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#78716c',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Name
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#1e293b',
                    }}>
                      {profile.emergencyName}
                    </div>
                  </div>
                )}

                {profile.emergencyPhone && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#78716c',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Phone
                    </div>
                    <div style={{
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#dc2626',
                    }}>
                      {profile.emergencyPhone}
                    </div>
                  </div>
                )}

                {profile.emergencyEmail && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#78716c',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}>
                      Email
                    </div>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#1e293b',
                    }}>
                      {profile.emergencyEmail}
                    </div>
                  </div>
                )}

                {profile.emergencyPhone && (
                  <button
                    onClick={handleEmergencyCall}
                    className="no-print"
                    style={{
                      width: '100%',
                      padding: '16px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '16px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
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
            {(profile.insuranceProvider || profile.insurancePolicy) && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  margin: '0 0 12px',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  Insurance Information
                </h3>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '8px',
                }}>
                  {profile.insuranceProvider && (
                    <div style={{ marginBottom: profile.insurancePolicy ? '12px' : '0' }}>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '2px',
                      }}>
                        Provider
                      </div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#1e293b',
                      }}>
                        {profile.insuranceProvider}
                      </div>
                    </div>
                  )}
                  {profile.insurancePolicy && (
                    <div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#64748b',
                        marginBottom: '2px',
                      }}>
                        Policy Number
                      </div>
                      <div style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#1e293b',
                        fontFamily: 'monospace',
                      }}>
                        {profile.insurancePolicy}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div style={{
              borderTop: '2px solid #e2e8f0',
              paddingTop: '24px',
              textAlign: 'center',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  backgroundColor: '#0f766e',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                }}>
                  ❤️
                </div>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#1e293b',
                }}>
                  Med Map
                </span>
              </div>
              <p style={{
                margin: '0 0 24px',
                fontSize: '13px',
                color: '#94a3b8',
              }}>
                Digital Health Passport · For emergency use only
              </p>

              {/* Download PDF Button */}
              <button
                onClick={handlePrint}
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
