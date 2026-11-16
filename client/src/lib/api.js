import { toast } from 'sonner';

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

/**
 * Universal JSON API request helper with credentials (cookies)
 */
export async function apiRequest(endpoint, options = {}) {
  let url;
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    url = endpoint;
  } else {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    if (API_BASE.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      url = `${API_BASE}${cleanEndpoint.slice(4)}`;
    } else {
      url = `${API_BASE}${cleanEndpoint}`;
    }
  }
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isPublicPath =
        pathname === '/' ||
        pathname === '/login' ||
        pathname === '/signup' ||
        pathname === '/forgot-password' ||
        pathname.startsWith('/invite');
      const isAuthCall =
        endpoint.includes('/auth/login') ||
        endpoint.includes('/auth/signup') ||
        endpoint.includes('/auth/me');

      if (!isPublicPath && !isAuthCall) {
        toast.error('Your session has expired. Please sign in again.');
        const nextParam = encodeURIComponent(window.location.pathname + window.location.search);
        setTimeout(() => {
          window.location.href = `/login?next=${nextParam}`;
        }, 350);
      }
    }

    const error = new Error(data?.error?.message || `API Error: ${response.status} ${response.statusText}`);
    error.status = response.status;
    error.code = data?.error?.code || 'API_ERROR';
    error.details = data?.error?.details;
    throw error;
  }

  return data;
}

export const api = {
  get: (url) => apiRequest(url, { method: 'GET' }),
  post: (url, body = {}) => apiRequest(url, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: (url, body = {}) => apiRequest(url, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: (url, body = {}) => apiRequest(url, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),
};
