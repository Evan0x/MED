const AVELA_FONT = "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

export const AvelaLogo = ({ size = 36, background = '#0f766e', iconScale = 0.55, color = '#ffffff' }) => {
  const iconSize = Math.round(size * iconScale);
  return (
    <div
      aria-label="Avela"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={color}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <path d="M12 21s-7.5-4.55-9.6-9.06C1.04 8.5 3.2 5 6.6 5c2.04 0 3.6 1.1 4.4 2.5C11.8 6.1 13.36 5 15.4 5c3.4 0 5.56 3.5 4.2 6.94C19.5 16.45 12 21 12 21z" />
      </svg>
    </div>
  );
};

export const AvelaWordmark = ({ size = 22, color = '#0f766e' }) => (
  <span
    style={{
      fontFamily: AVELA_FONT,
      fontWeight: 700,
      fontSize: size,
      color,
      letterSpacing: '-0.02em',
      lineHeight: 1,
      background: `linear-gradient(135deg, ${color} 0%, #14b8a6 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}
  >
    Avela
  </span>
);

export const AvelaLockup = ({ logoSize = 36, wordSize = 22, gap = 10, color = '#0f766e' }) => (
  <div style={{ display: 'inline-flex', alignItems: 'center', gap }}>
    <AvelaLogo size={logoSize} />
    <AvelaWordmark size={wordSize} color={color} />
  </div>
);

export default AvelaLogo;
