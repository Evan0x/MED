import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';

const AuthHeader = () => {
  const { user } = useUser();

  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      padding: '15px 30px', 
      borderBottom: '2px solid #e0e0e0', 
      marginBottom: '20px',
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '28px', color: '#2c3e50' }}>Med Map</h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <SignedOut>
          <SignInButton mode="modal">
            <button style={{ 
              padding: '10px 20px', 
              cursor: 'pointer',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background-color 0.3s'
            }}>
              Sign In
            </button>
          </SignInButton>
        </SignedOut>
        
        <SignedIn>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '8px 16px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            border: '1px solid #e0e0e0'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: '#2c3e50'
              }}>
                {user?.fullName || user?.firstName || 'User'}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#666'
              }}>
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
