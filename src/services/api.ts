const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Export API_BASE_URL for other services
export const API_BASE_URL = API_URL;

interface SignupData {
  email: string;
  password: string;
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  mobileNumber?: string;
  address?: string;
  pincode?: string;
  state?: string;
  profilePhoto?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface VerifyOTPData {
  email: string;
  otp: string;
}

interface AuthResponse {
  message: string;
  token?: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    role?: 'user' | 'admin';
    dateOfBirth?: string;
    gender?: string;
    mobileNumber?: string;
    address?: string;
    pincode?: string;
    state?: string;
    avatar?: string;
  };
  email?: string;
}

// Helper function for API calls
const apiCall = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  try {
    const token = localStorage.getItem('auth_token');
    const fullUrl = `${API_URL}${endpoint}`;
    
    console.log('🌐 API Call:', fullUrl);
    console.log('🔑 Token available:', !!token);
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    console.log('📡 Response status:', response.status);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    if (!response.ok) {
      // If it's not JSON (like HTML error page), throw a generic error
      if (!isJson) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Try to parse JSON error
      try {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      } catch (parseError) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Parse successful JSON response
    if (isJson) {
      const data = await response.json();
      console.log('✅ API Success:', data);
      return data;
    } else {
      throw new Error('Response is not JSON');
    }
  } catch (error) {
    console.error('🚨 API Call failed:', error);
    // Re-throw with more context for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server');
    }
    throw error;
  }
};

// Auth API functions
export const authAPI = {
  signup: async (data: SignupData): Promise<AuthResponse> => {
    return apiCall('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  verifyOTP: async (data: VerifyOTPData): Promise<AuthResponse> => {
    const response = await apiCall('/api/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store token in localStorage
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  resendOTP: async (email: string): Promise<AuthResponse> => {
    return apiCall('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  login: async (data: LoginData): Promise<AuthResponse> => {
    const response = await apiCall('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    // Store token in localStorage (this will be done again in AuthContext, but keeping for consistency)
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }

    return response;
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('auth_token');
  },
};
