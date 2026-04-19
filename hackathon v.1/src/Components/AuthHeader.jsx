import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';

const AuthHeader = ({ showBack, onBack }) => {
  const { user } = useUser();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      height: '64px',
      backgroundColor: 'white',
      borderBottom: '1px solid #f0f0f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Left: back + logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {showBack && (
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#475569', fontSize: '14px', fontWeight: 500,
              padding: '6px 10px', borderRadius: '8px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            ← Back
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '34px', height: '34px', borderRadius: '50%',
            backgroundColor: '#0f766e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </div>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', letterSpacing: '-0.3px' }}>
            Med Map
          </span>
        </div>
      </div>

      {/* Right: auth */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <SignedOut>
          <SignInButton mode="modal">
            <button style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: 500, color: '#475569',
              padding: '8px 14px', borderRadius: '8px',
            }}>
              Login
            </button>
          </SignInButton>
          <SignInButton mode="modal">
            <button style={{
              padding: '9px 22px', borderRadius: '24px',
              backgroundColor: '#f59e0b', border: 'none',
              color: 'white', fontWeight: 600, fontSize: '14px',
              cursor: 'pointer', letterSpacing: '0.1px',
            }}>
              Get Started
            </button>
          </SignInButton>
        </SignedOut>

        <SignedIn>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>
                {user?.fullName || user?.firstName || 'User'}
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.3 }}>
                {user?.primaryEmailAddress?.emailAddress}
              </div>
            </div>
            <UserButton afterSignOutUrl="/" />
          </div>
        </SignedIn>
      </div>
    </header>
  );
};

export default AuthHeader;
