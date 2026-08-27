import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { resolveAvatarUrl } from '../utils/avatarUrl'

interface User {
  id: number
  email: string
  username: string
  full_name: string
  phone?: string
  avatar_url?: string
  is_admin: boolean
  is_active: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  setUser: (user: User) => void
  logout: () => void
}

function withResolvedAvatar(user: User): User {
  return {
    ...user,
    avatar_url: resolveAvatarUrl(user.avatar_url) || user.avatar_url,
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user: withResolvedAvatar(user), token }),
      setUser: (user) => set({ user: withResolvedAvatar(user) }),
      logout: () => set({ user: null, token: null }),
    }),
    {
      name: 'auth-storage',
      merge: (persisted, current) => {
        const p = persisted as Partial<AuthState> | undefined
        const user = p?.user ? withResolvedAvatar(p.user as User) : null
        return {
          ...current,
          ...p,
          user,
        }
      },
    }
  )
)

