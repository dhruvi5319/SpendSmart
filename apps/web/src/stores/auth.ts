import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, type AuthUser } from '@/lib/supabase';
import { apiClient } from '@spendsmart/shared';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null, token: string | null) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  checkSession: () => Promise<void>;
  initAuthListener: () => () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user, token) => {
        set({ user, token, isAuthenticated: !!user });
        if (token) {
          apiClient.setToken(token);
        }
      },

      signIn: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            return { error: error.message };
          }

          if (data.user && data.session) {
            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email!,
              user_metadata: data.user.user_metadata,
            };
            get().setUser(authUser, data.session.access_token);
          }

          return { error: null };
        } catch (err) {
          return { error: 'An unexpected error occurred' };
        }
      },

      signUp: async (email, password, displayName) => {
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                display_name: displayName,
              },
            },
          });

          if (error) {
            return { error: error.message };
          }

          if (data.user && data.session) {
            const authUser: AuthUser = {
              id: data.user.id,
              email: data.user.email!,
              user_metadata: data.user.user_metadata,
            };
            get().setUser(authUser, data.session.access_token);
          }

          return { error: null };
        } catch (err) {
          return { error: 'An unexpected error occurred' };
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, token: null, isAuthenticated: false });
        apiClient.setToken(null);
      },

      checkSession: async () => {
        set({ isLoading: true });
        try {
          const { data } = await supabase.auth.getSession();

          if (data.session?.user) {
            const authUser: AuthUser = {
              id: data.session.user.id,
              email: data.session.user.email!,
              user_metadata: data.session.user.user_metadata,
            };
            get().setUser(authUser, data.session.access_token);
          } else {
            set({ user: null, token: null, isAuthenticated: false });
          }
        } catch {
          set({ user: null, token: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      initAuthListener: () => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (session?.user) {
              const authUser: AuthUser = {
                id: session.user.id,
                email: session.user.email!,
                user_metadata: session.user.user_metadata,
              };
              get().setUser(authUser, session.access_token);
            } else {
              set({ user: null, token: null, isAuthenticated: false });
              apiClient.setToken(null);
            }
          }
        );
        return () => subscription.unsubscribe();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
