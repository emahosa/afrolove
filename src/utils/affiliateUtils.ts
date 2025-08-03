
export const handleAffiliateReferral = () => {
  // Check URL for referral code
  const urlParams = new URLSearchParams(window.location.search);
  const refCode = urlParams.get('ref');
  
  if (refCode) {
    // Store referral code in localStorage for later tracking
    localStorage.setItem('affiliate_referrer', refCode);
    
    // Clean URL by removing the ref parameter
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('ref');
    window.history.replaceState({}, document.title, newUrl.toString());
  }
};

export const getStoredReferrer = (): string | null => {
  return localStorage.getItem('affiliate_referrer');
};

export const clearReferrer = () => {
  localStorage.removeItem('affiliate_referrer');
};

// Generate a unique device ID
export const generateDeviceId = (): string => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    // Create a unique device ID based on browser fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    deviceId = btoa(fingerprint).slice(0, 32);
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

// Get client IP address (approximate)
export const getClientIP = async (): Promise<string | null> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return null;
  }
};
