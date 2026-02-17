// Dynamically determine the API URL based on the host
export const getAPIURL = () => {
  // Always use /api proxy endpoint which Vite will handle
  // This avoids mixed content (HTTPS->HTTP) issues
  return '/api';
};

export const API_URL = getAPIURL();

console.log('🔌 API URL:', API_URL);
console.log('📍 Hostname:', window.location.hostname);
console.log('🔒 Protocol:', window.location.protocol);
