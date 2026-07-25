import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from '@/lib/api'

export interface AuthUser {
  id: string
  username: string
  email: string
  avatarUrl?: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  loginWithOAuth: (provider: 'google' | 'discord' | 'github', accessToken: string) => Promise<void>
  fetchMe: () => Promise<void>
  logout: () => void
  setUser: (user: AuthUser) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          })
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      register: async (username: string, email: string, password: string) => {
        set({ isLoading: true })
        try {
          const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
          })
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      loginWithOAuth: async (provider: 'google' | 'discord' | 'github', accessToken: string) => {
        set({ isLoading: true })
        try {
          const data = await apiFetch<{ token: string; user: AuthUser }>(`/auth/oauth/${provider}`, {
            method: 'POST',
            body: JSON.stringify({ accessToken }),
          })
          set({ user: data.user, token: data.token, isAuthenticated: true, isLoading: false })
        } catch (e) {
          set({ isLoading: false })
          throw e
        }
      },

      fetchMe: async () => {
        try {
          const data = await apiFetch<AuthUser & { xp: number; level: number }>('/auth/me')
          set({ user: { id: data.id, username: data.username, email: data.email, avatarUrl: data.avatarUrl }, isAuthenticated: true })
        } catch {
          set({ user: null, token: null, isAuthenticated: false })
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false })
      },

      setUser: (user: AuthUser) => {
        set({ user, isAuthenticated: true })
      },
    }),
    {
      name: 'minado-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
