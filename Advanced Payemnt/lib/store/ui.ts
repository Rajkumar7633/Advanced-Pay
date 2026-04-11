import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface ModalState {
  id: string;
  isOpen: boolean;
  data?: any;
}

interface UiState {
  theme: Theme;
  modals: Record<string, ModalState>;
  
  setTheme: (theme: Theme) => void;
  openModal: (id: string, data?: any) => void;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  isModalOpen: (id: string) => boolean;
  getModalData: (id: string) => any;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: 'system',
  modals: {},

  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
      
      // Apply theme to document
      const html = document.documentElement;
      if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  },

  openModal: (id, data) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [id]: {
          id,
          isOpen: true,
          data,
        },
      },
    }));
  },

  closeModal: (id) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [id]: {
          ...state.modals[id],
          isOpen: false,
        },
      },
    }));
  },

  closeAllModals: () => {
    set({ modals: {} });
  },

  isModalOpen: (id) => {
    const state = get();
    return state.modals[id]?.isOpen ?? false;
  },

  getModalData: (id) => {
    const state = get();
    return state.modals[id]?.data ?? null;
  },
}));
