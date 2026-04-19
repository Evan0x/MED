import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';

const ProfileForm = () => {
  const { userId, isLoaded } = useAuth();
  
  const [formData, setFormData] = useState({
    fullName: '',
    bloodType: '',
    insuranceProvider: '',
    policyNumber: '',
  });
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch their existing data when the component loads
  useEffect(() => {
    if (userId) {
      fetch(`http://localhost:5000/api/profile/${userId}`)
        .then(res => res.json())
        .then(data => {
          // Check if data exists and has at least one key besides MongoDB's default _id
          if (data && Object.keys(data).length > 0) { 
            setFormData({
              fullName: data.fullName || '',
              bloodType: data.bloodType || '',
              insuranceProvider: data.insuranceProvider || '',
              policyNumber: data.policyNumber || '',
            });
          }
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching data:", err);
          setIsLoading(false);
        });
    }
  }, [userId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setStatus('');

    try {
      const response = await fetch('http://localhost:5000/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkUserId: userId, ...formData }),
      });

      if (response.ok) {
        setStatus('✅ Profile secured and saved!');
      } else {
        setStatus('❌ Server error. Please try again.');
      }
    } catch (error) {
      console.error("Save Error:", error);
      setStatus('❌ Network error. Is your backend running?');
    } finally {
      setIsSaving(false);
    }
  };

  // Modern UI Styles
  const styles = {
    container: {
      padding: '30px',
      maxWidth: '450px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
      border: '1px solid #eaeaea',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      marginTop: '0',
      color: '#1f2937',
      fontSize: '22px',
      marginBottom: '20px',
      borderBottom: '2px solid #f3f4f6',
      paddingBottom: '10px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      marginBottom: '15px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#4b5563',
      marginBottom: '6px'
    },
    input: {
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #d1d5db',
      fontSize: '15px',
      outline: 'none',
      transition: 'border-color 0.2s',
    },
    button: {
      marginTop: '10px',
      padding: '14px',
      backgroundColor: isSaving ? '#9ca3af' : '#6366f1', // Changes color when saving
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 'bold',
      cursor: isSaving ? 'not-allowed' : 'pointer',
      transition: 'background-color 0.2s',
      width: '100%'
    },
    status: {
      marginTop: '15px',
      padding: '10px',
      borderRadius: '6px',
      textAlign: 'center',
      fontWeight: '500',
      fontSize: '14px',
      backgroundColor: status.includes('✅') ? '#dcfce7' : '#fee2e2',
      color: status.includes('✅') ? '#166534' : '#991b1b',
      display: status ? 'block' : 'none'
    }
  };

  if (!isLoaded || !userId) return <p style={{ color: '#6b7280' }}>Please sign in to view your secure profile.</p>;
  if (isLoading) return <p style={{ color: '#6b7280' }}>Loading your medical profile...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>My Medical Profile</h2>
      <form onSubmit={handleSave}>
        
        <div style={styles.formGroup}>
          <label style={styles.label}>Full Name</label>
          <input style={styles.input} name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. John Doe" />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Blood Type</label>
          <input style={styles.input} name="bloodType" value={formData.bloodType} onChange={handleChange} placeholder="e.g. O Positive" />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Insurance Provider</label>
          <input style={styles.input} name="insuranceProvider" value={formData.insuranceProvider} onChange={handleChange} placeholder="e.g. Blue Cross" />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Policy Number</label>
          <input style={styles.input} name="policyNumber" value={formData.policyNumber} onChange={handleChange} type="password" placeholder="••••••••" />
        </div>

        <button type="submit" style={styles.button} disabled={isSaving}>
          {isSaving ? 'Saving securely...' : 'Save Profile'}
        </button>

      </form>

      {/* Dynamic Status Message Box */}
      <div style={styles.status}>
        {status}
      </div>
    </div>
  );
};

export default ProfileForm;