// Dynamically determine the API URL based on the host
export const getAPIURL = () => {
  // Point to backend server on port 5000 with /api prefix
  const hostname = window.location.hostname || 'localhost';
  return `http://${hostname}:5000/api`;
};

export const API_URL = getAPIURL();

console.log('🔌 API URL:', API_URL);
console.log('📍 Hostname:', window.location.hostname);
console.log('🔒 Protocol:', window.location.protocol);
