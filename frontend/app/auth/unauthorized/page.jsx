"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import { useAuth } from "@/context/AuthContext"

export default function UnauthorizedPage() {
  const router = useRouter()
  const { user, role } = useAuth()

  return (
    <>
      <Header user={user} role={role} />
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <Card className="p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-yellow-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h1>
          <p className="text-muted-foreground mb-6">
            이 페이지에 접근하려면 적절한 권한이 필요합니다.
          </p>
          <div className="space-y-2">
            <Button
              onClick={() => router.push(role === "staff" ? "/staff" : "/dashboard")}
              className="w-full"
            >
              {role === "staff" ? "직원 대시보드로" : "고객 대시보드로"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full"
            >
              홈으로 돌아가기
            </Button>
          </div>
        </Card>
      </div>
      <Footer />
    </>
  )
}

