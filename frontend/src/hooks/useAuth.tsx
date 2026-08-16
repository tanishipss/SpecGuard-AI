import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  clearToken,
  fetchMe,
  login as apiLogin,
  signup as apiSignup,
  setToken,
  updateProfile as apiUpdateProfile,
} from '../api/client'
import type { UserOut } from '../api/types'

interface AuthContextValue {
  user: UserOut | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (fullName: string, email: string, password: string) => Promise<void>
  updateProfile: (fullName: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (email: string, password: string) => {
    const result = await apiLogin({ email, password })
    setToken(result.access_token)
    setUser(result.user)
  }

  const signup = async (fullName: string, email: string, password: string) => {
    const result = await apiSignup({ full_name: fullName, email, password })
    setToken(result.access_token)
    setUser(result.user)
  }

  const updateProfile = async (fullName: string) => {
    const result = await apiUpdateProfile({ full_name: fullName })
    setUser(result)
  }

  const logout = () => {
    clearToken()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
