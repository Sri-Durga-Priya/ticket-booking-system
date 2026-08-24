const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('ticketnow_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${cleanEndpoint}`;

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or unauthorized
      }
      throw new ApiError(data.message || `Request failed with status ${response.status}`, response.status, data.details || data);
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;

    // Detect browser network failure (Failed to fetch, connection refused, CORS error, server down)
    const isNetworkFailure =
      error.name === 'TypeError' ||
      error.message?.toLowerCase().includes('failed to fetch') ||
      error.message?.toLowerCase().includes('fetch failed') ||
      error.message?.toLowerCase().includes('networkerror') ||
      error.message?.toLowerCase().includes('load failed');

    if (isNetworkFailure) {
      throw new ApiError(
        `Can't reach Ticket Booking System server at ${API_BASE}. Please verify the backend server is running on port 5000 and try again shortly.`,
        0
      );
    }

    throw new ApiError(error.message || 'An unexpected error occurred. Please try again.', 0);
  }
};

export const api = {
  get: (endpoint, options) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => request(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => request(endpoint, { ...options, method: 'PUT', body }),
  patch: (endpoint, body, options) => request(endpoint, { ...options, method: 'PATCH', body }),
  delete: (endpoint, options) => request(endpoint, { ...options, method: 'DELETE' }),
};

export default api;
