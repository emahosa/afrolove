
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
