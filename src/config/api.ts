// API Configuration
export const API_CONFIG = {
  // Set to true to use mock data when backend is not available
  USE_MOCK_FALLBACK: true,
  
  // Base API URL
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  
  // Timeout for API calls (in milliseconds)
  TIMEOUT: 10000,
  
  // Enable API logging
  ENABLE_LOGGING: import.meta.env.DEV,
};

// Helper to check if we should use mock data
export const shouldUseMockData = (error: any): boolean => {
  if (!API_CONFIG.USE_MOCK_FALLBACK) {
    return false;
  }
  
  // Use mock data for network errors, 404s, connection refused, etc.
  return (
    error.message?.includes('fetch') ||
    error.message?.includes('404') ||
    error.message?.includes('Failed to fetch') ||
    error.message?.includes('NetworkError') ||
    error.message?.includes('ERR_CONNECTION_REFUSED')
  );
};