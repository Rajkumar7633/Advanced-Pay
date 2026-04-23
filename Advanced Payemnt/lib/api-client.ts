import axios, { AxiosInstance, AxiosError } from 'axios';

// All API calls go through Next.js proxy: /api/v1/* → http://localhost:8081/api/v1/*
// This is configured in next.config.mjs rewrites() — no CORS issues.
const API_BASE_URL = '/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use((config) => {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('authToken')
        : null;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError<{ code?: string; error?: string }>) => {
        const code = error.response?.data?.code;
        if (error.response?.status === 403 && code === 'MERCHANT_INACTIVE') {
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            if (!currentPath.startsWith('/checkout') && !currentPath.startsWith('/payment')) {
              localStorage.removeItem('authToken');
              window.location.href = '/login?reason=account_inactive';
            }
          }
        }
        if (error.response?.status === 401) {
          // Handle unauthorized
          if (typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            if (!currentPath.startsWith('/checkout') && !currentPath.startsWith('/payment')) {
              localStorage.removeItem('authToken');
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  get instance() {
    return this.client;
  }
}

export const apiClient = new ApiClient();
export default apiClient.instance;
