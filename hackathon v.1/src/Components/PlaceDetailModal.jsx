import { useEffect } from 'react';

const TEAL = '#0f766e';
const AMBER = '#f59e0b';

const formatType = (type) =>
  type?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? '';

const InfoRow = ({ icon, label, value, href }) => {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'flex-start' }}>
      <span style={{ color: TEAL, fontSize: '18px', flexShrink: 0, width: '22px', textAlign: 'center', marginTop: '1px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: TEAL, fontSize: '14px', wordBreak: 'break-all', textDecoration: 'none', fontWeight: 500 }}>
            {value}
          </a>
        ) : (
          <div style={{ color: '#1e293b', fontSize: '14px', lineHeight: 1.5 }}>{value}</div>
        )}
      </div>
    </div>
  );
};

const PlaceDetailModal = ({ place, details, onClose }) => {
  const photoUrl =
    details?.photos?.[0]?.getUrl?.({ maxWidth: 900, maxHeight: 400 }) ||
    place.photos?.[0]?.getUrl?.({ maxWidth: 900, maxHeight: 400 });

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    (place.name ?? '') + ' ' + (place.vicinity ?? '')
  )}&destination_place_id=${place.place_id}`;

  const websiteUrl = details?.website;

  const primaryTypes = (place.types ?? [])
    .filter((t) => !['point_of_interest', 'establishment'].includes(t))
    .slice(0, 5);

  const todayIndex = new Date().getDay();
  const weekdays = details?.hours?.weekday_text ?? [];

  const firstReview = details?.reviews?.[0];

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(15,23,42,0.55)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          maxWidth: '740px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '14px', right: '14px', zIndex: 10,
            background: 'rgba(255,255,255,0.95)',
            border: 'none', borderRadius: '50%',
            width: '36px', height: '36px',
            cursor: 'pointer', fontSize: '16px', color: '#475569',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontWeight: 700,
          }}
        >
          ✕
        </button>

        {/* Hero image */}
        <div style={{
          height: '220px',
          background: photoUrl
            ? `url(${photoUrl}) center/cover no-repeat`
            : `linear-gradient(135deg, ${TEAL} 0%, #14b8a6 100%)`,
          borderRadius: '20px 20px 0 0',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '20px 24px 18px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.72))',
            borderRadius: '0',
          }}>
            {primaryTypes[0] && (
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px', fontWeight: 600 }}>
                {formatType(primaryTypes[0])}
              </div>
            )}
            <div style={{ color: 'white', fontSize: '24px', fontWeight: 700, lineHeight: 1.2 }}>
              {place.name}
            </div>
            {place.rating != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' }}>
                <span style={{ color: AMBER, fontSize: '14px' }}>★</span>
                <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>{place.rating.toFixed(1)}</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px' }}>({place.user_ratings_total ?? 0} reviews)</span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ padding: '20px 24px 0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 22px', borderRadius: '28px',
              backgroundColor: AMBER, color: 'white',
              fontWeight: 600, fontSize: '14px', textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            Get Directions
          </a>
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 22px', borderRadius: '28px',
                backgroundColor: TEAL, color: 'white',
                fontWeight: 600, fontSize: '14px', textDecoration: 'none',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Book Appointment
            </a>
          )}
          {!websiteUrl && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '12px 22px', borderRadius: '28px',
              backgroundColor: TEAL, color: 'white',
              fontWeight: 600, fontSize: '14px', opacity: 0.6,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Book Appointment
            </div>
          )}
        </div>

        {/* Info + About */}
        <div style={{
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px',
        }}>
          {/* Information */}
          <div>
            <h3 style={{ margin: '0 0 18px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Information</h3>
            <InfoRow icon="📍" label="Address" value={place.vicinity} />
            <InfoRow icon="📞" label="Phone" value={details?.phone} href={details?.phone ? `tel:${details.phone}` : null} />
            <InfoRow icon="🌐" label="Website"
              value={websiteUrl ? new URL(websiteUrl).hostname.replace('www.', '') : null}
              href={websiteUrl}
            />
            {place.opening_hours && (
              <InfoRow
                icon="🕐"
                label="Status"
                value={place.opening_hours.open_now ? '✅ Open Now' : '❌ Currently Closed'}
              />
            )}
            {place.price_level != null && (
              <InfoRow
                icon="💰"
                label="Price Level"
                value={place.price_level === 0 ? 'Free' : '$'.repeat(place.price_level)}
              />
            )}
          </div>

          {/* About */}
          <div>
            <h3 style={{ margin: '0 0 18px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>About</h3>
            {firstReview ? (
              <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6, fontStyle: 'italic' }}>
                "{firstReview.text?.slice(0, 220)}{firstReview.text?.length > 220 ? '…' : ''}"
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
                No description available for this location.
              </p>
            )}

            {/* Specialties / types */}
            {primaryTypes.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>Specialties</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {primaryTypes.map((t) => (
                    <span key={t} style={{
                      padding: '4px 12px', borderRadius: '20px',
                      backgroundColor: '#f0fdf4', color: TEAL,
                      fontSize: '12px', fontWeight: 600,
                      border: `1px solid #bbf7d0`,
                    }}>
                      {formatType(t)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hours */}
        {weekdays.length > 0 && (
          <div style={{ padding: '0 24px 24px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>Hours</h3>
            <div style={{
              backgroundColor: '#f8fafc', borderRadius: '12px',
              overflow: 'hidden', border: '1px solid #e2e8f0',
            }}>
              {weekdays.map((day, i) => {
                const [dayName, ...rest] = day.split(': ');
                const isToday = i === ((todayIndex + 6) % 7);
                return (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 16px',
                    borderBottom: i < weekdays.length - 1 ? '1px solid #e2e8f0' : 'none',
                    backgroundColor: isToday ? '#f0fdf4' : 'transparent',
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: isToday ? 700 : 500, color: isToday ? TEAL : '#475569' }}>
                      {dayName}
                    </span>
                    <span style={{ fontSize: '13px', color: isToday ? TEAL : '#64748b', fontWeight: isToday ? 600 : 400 }}>
                      {rest.join(': ')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating & Reviews */}
        {place.rating != null && (
          <div style={{ padding: '0 24px 28px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              Rating & Reviews
              <span style={{
                marginLeft: '12px', padding: '4px 12px',
                backgroundColor: '#fffbeb', borderRadius: '20px',
                fontSize: '13px', color: '#92400e',
                border: '1px solid #fde68a',
              }}>
                ★ {place.rating.toFixed(1)} &nbsp;·&nbsp; {place.user_ratings_total ?? 0} reviews
              </span>
            </h3>
            {details?.reviews?.slice(0, 2).map((review, i) => (
              <div key={i} style={{
                padding: '14px 16px', marginBottom: '10px',
                backgroundColor: '#f8fafc', borderRadius: '12px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <img
                    src={review.profile_photo_url}
                    alt={review.author_name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{review.author_name}</div>
                    <div style={{ fontSize: '12px', color: AMBER }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: 1.55 }}>
                  {review.text?.slice(0, 200)}{review.text?.length > 200 ? '…' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlaceDetailModal;
