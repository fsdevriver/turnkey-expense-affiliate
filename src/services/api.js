import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('turnkey_partner_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const handlePartnerSessionExpired = () => {
  localStorage.removeItem('turnkey_partner_token');
  localStorage.removeItem('turnkey_partner_profile');
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

api.interceptors.response.use(
  (response) => {
    const data = response?.data;
    if (
      data &&
      (data.code === 401 ||
        data.code === 403 ||
        data.status === 401 ||
        data.status === 403 ||
        data.message === 'Unauthenticated' ||
        data.message === 'Unauthenticated.' ||
        data.message === 'Unauthorized')
    ) {
      handlePartnerSessionExpired();
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const msg = error.response?.data?.message;
    if (
      status === 401 ||
      status === 403 ||
      msg === 'Unauthenticated' ||
      msg === 'Unauthenticated.' ||
      msg === 'Unauthorized'
    ) {
      handlePartnerSessionExpired();
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
