/**
 * Razorpay Payment Gateway Configuration
 *
 * 1. Log in to your Razorpay Dashboard: https://dashboard.razorpay.com/
 * 2. Go to Settings → API Keys → Generate Key (Test or Live).
 * 3. Replace the `keyId` below with your Key ID (e.g. 'rzp_test_XXXXXXXXXXXXXX' or 'rzp_live_XXXXXXXXXXXXXX').
 */

export const RAZORPAY_CONFIG = {
  // Replace with your Razorpay Test/Live Key ID from https://dashboard.razorpay.com/app/keys
  keyId: 'rzp_test_1DP5mmOlF5G5ag', // Sample test key ID (replace with yours)
  merchantName: 'LG Enterprises • G-Fresh Mart',
  description: 'Community Grocery & Fresh Store Order',
  currency: 'INR',
  themeColor: '#0A5C3E',
  logoUrl: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f34e.png',
};

export const isRazorpayConfigured = (): boolean => {
  return (
    typeof RAZORPAY_CONFIG.keyId === 'string' &&
    RAZORPAY_CONFIG.keyId.trim().length > 0 &&
    !RAZORPAY_CONFIG.keyId.includes('PASTE_KEY_HERE')
  );
};
