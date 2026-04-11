import { useState, useCallback } from 'react';

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface UsePaginationReturn {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setLimit: (limit: number) => void;
  setTotal: (total: number) => void;
  reset: () => void;
}

const INITIAL_PAGE = 1;
const INITIAL_LIMIT = 10;

export function usePagination(initialLimit: number = INITIAL_LIMIT): UsePaginationReturn {
  const [state, setState] = useState<PaginationState>({
    page: INITIAL_PAGE,
    limit: initialLimit,
    total: 0,
    pages: 0,
  });

  const calculatePages = useCallback(
    (total: number, limit: number) => {
      return Math.ceil(total / limit);
    },
    []
  );

  const goToPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.pages)),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.pages),
    }));
  }, []);

  const previousPage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setState((prev) => ({
      ...prev,
      limit,
      page: 1,
      pages: calculatePages(prev.total, limit),
    }));
  }, [calculatePages]);

  const setTotal = useCallback(
    (total: number) => {
      setState((prev) => ({
        ...prev,
        total,
        pages: calculatePages(total, prev.limit),
      }));
    },
    [calculatePages]
  );

  const reset = useCallback(() => {
    setState({
      page: INITIAL_PAGE,
      limit: initialLimit,
      total: 0,
      pages: 0,
    });
  }, [initialLimit]);

  return {
    page: state.page,
    limit: state.limit,
    total: state.total,
    pages: state.pages,
    hasNextPage: state.page < state.pages,
    hasPreviousPage: state.page > 1,
    goToPage,
    nextPage,
    previousPage,
    setLimit,
    setTotal,
    reset,
  };
}
