"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, role, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth")
        return
      }

      if (requiredRole && role !== requiredRole) {
        // 권한이 없으면 unauthorized 페이지로 리다이렉트
        router.push("/auth/unauthorized")
        return
      }
    }
  }, [user, role, loading, requiredRole, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (requiredRole && role !== requiredRole) {
    return null
  }

  return <>{children}</>
}

