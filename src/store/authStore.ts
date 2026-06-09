import { create } from 'zustand';
import { AuthUser, UserRole, Permission } from '@/types';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // 액션
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;

  // 헬퍼
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: Permission) => boolean;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  isWriter: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false,
    });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
    });
  },

  hasRole: (role) => {
    const { user } = get();
    return user?.role === role;
  },

  hasPermission: (permission) => {
    const { user } = get();
    if (user?.role === 'ADMIN') return true;
    return user?.permissions?.includes(permission) ?? false;
  },

  isAdmin: () => {
    return get().user?.role === 'ADMIN';
  },

  isStaff: () => {
    return get().user?.role === 'STAFF';
  },

  isWriter: () => {
    return get().user?.role === 'WRITER';
  },
}));
