"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authAPI } from "@/lib/api"

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // 초기 사용자 정보 확인
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        setUser(null)
        setRole(null)
        setLoading(false)
        return
      }

      // Spring Boot API로 현재 사용자 정보 조회
      const userData = await authAPI.getCurrentUser()
      setUser(userData)
      setRole(userData.role)
    } catch (error) {
      console.error('Error checking auth:', error)
      // 토큰이 유효하지 않으면 삭제
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      // 클라이언트에서 토큰 삭제
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      setUser(null)
      setRole(null)
      router.push('/')
    }
  }

  const value = {
    user,
    role,
    loading,
    signOut,
    refreshUser: checkAuth
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

