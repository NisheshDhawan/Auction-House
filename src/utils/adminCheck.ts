// Utility to manually check and set admin status for testing
export const forceAdminRole = (email: string) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.email === email) {
      user.role = 'admin';
      localStorage.setItem('user', JSON.stringify(user));
      window.location.reload();
    }
  }
};

// Make it available in console for testing
(window as any).forceAdminRole = forceAdminRole;