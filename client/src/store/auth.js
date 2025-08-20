import { create } from 'zustand';

// Helper function to decode JWT token
function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
}

// Initialize user from existing token
function initializeUser() {
  const token = localStorage.getItem('token');
  if (token) {
    const decoded = decodeJWT(token);
    if (decoded) {
      return {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        name: decoded.name
      };
    }
  }
  return null;
}

export const useAuth = create((set) => ({
  user: initializeUser(),
  token: localStorage.getItem('token') || null,
  setAuth: (token, userOverride) => {
    localStorage.setItem('token', token);

    // Decode user info from JWT token
    const decoded = decodeJWT(token);
    const user = userOverride || (decoded ? {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    } : null);

    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null });
  }
}));