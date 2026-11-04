import { formatDistance } from '../location/place';

const TEAL = '#0f766e';
const TEAL_DARK = '#2dd4bf';

const PlaceResultCard = ({
  place,
  label,
  catLabel,
  details,
  selected = false,
  onClick,
  onOpenDetails,
  fallbackIcon = '🏥',
  dark = false,
}) => {
  const accent = dark ? TEAL_DARK : TEAL;
  const phone = details?.phone || place.phone;
  const distance = formatDistance(place.distanceMeters);
  const hoursText = details?.hours?.weekday_text?.[((new Date().getDay() + 6) % 7)];

  return (
    <article
      data-testid="result-card"
      data-selected={selected ? 'true' : 'false'}
      data-place-id={place.place_id}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      role="button"
      tabIndex={0}
      className={`place-result-card${selected ? ' is-selected' : ''}`}
      style={{
        display: 'flex',
        gap: '12px',
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        backgroundColor: selected
          ? (dark ? '#132a28' : '#f0fdfa')
          : 'transparent',
        borderLeft: `3px solid ${selected ? accent : 'transparent'}`,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: dark ? '#1e293b' : '#f1f5f9',
          fontSize: '22px',
        }}
      >
        {fallbackIcon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'flex-start' }}>
          <h3 style={{
            margin: 0,
            fontSize: '15px',
            fontWeight: 700,
            color: dark ? '#f8fafc' : '#0f172a',
            lineHeight: 1.3,
          }}
          >
            {place.name}
          </h3>
          {distance && (
            <span style={{ flexShrink: 0, fontSize: '12px', fontWeight: 700, color: accent }}>{distance}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
          {catLabel && (
            <span className="place-chip">{catLabel}</span>
          )}
          {label && (
            <span className="place-chip place-chip-muted">{label}</span>
          )}
          {place.opening_hours?.open_now === true && (
            <span className="place-chip is-open">Open</span>
          )}
          {place.opening_hours?.open_now === false && (
            <span className="place-chip is-closed">Closed</span>
          )}
        </div>
        {place.vicinity && (
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: dark ? '#94a3b8' : '#64748b' }}>
            {place.vicinity}
          </p>
        )}
        {phone && (
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: dark ? '#cbd5e1' : '#334155' }}>
            {phone}
          </p>
        )}
        {hoursText && (
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            {hoursText}
          </p>
        )}
        {onOpenDetails && (
          <button
            type="button"
            className="place-details-link"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails(place);
            }}
          >
            Details
          </button>
        )}
      </div>
    </article>
  );
};

export default PlaceResultCard;
