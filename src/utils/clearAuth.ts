// Utility to clear all authentication data
export const clearAuthData = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('userProfile');
};

// Call this in browser console if needed: clearAuthData()
(window as any).clearAuthData = clearAuthData;