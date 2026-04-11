import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: AxiosError | null;
}

interface UseApiOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
}

export function useApi<T = any>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(
    async (
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
      url: string,
      body?: any,
      options?: UseApiOptions
    ) => {
      setState({ data: null, loading: true, error: null });

      try {
        const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';
        const token = typeof window !== 'undefined' 
          ? localStorage.getItem('authToken') 
          : null;

        const config: any = {
          method,
          url: `${baseURL}${url}`,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        };

        if (options?.params) {
          config.params = options.params;
        }

        if (body) {
          config.data = body;
        }

        const response = await axios(config);
        setState({ data: response.data, loading: false, error: null });
        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        setState({ data: null, loading: false, error: axiosError });
        throw axiosError;
      }
    },
    []
  );

  const get = useCallback(
    (url: string, options?: UseApiOptions) =>
      request('GET', url, undefined, options),
    [request]
  );

  const post = useCallback(
    (url: string, body?: any, options?: UseApiOptions) =>
      request('POST', url, body, options),
    [request]
  );

  const put = useCallback(
    (url: string, body?: any, options?: UseApiOptions) =>
      request('PUT', url, body, options),
    [request]
  );

  const del = useCallback(
    (url: string, options?: UseApiOptions) =>
      request('DELETE', url, undefined, options),
    [request]
  );

  return { ...state, request, get, post, put, delete: del };
}
