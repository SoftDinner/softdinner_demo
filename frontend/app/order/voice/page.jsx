"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Mic, ArrowLeft } from "lucide-react"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import { useAuth } from "@/context/AuthContext"

export default function VoiceOrderPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }
    if (user && role === "staff") {
      router.push("/staff")
      return
    }
  }, [user, role, authLoading, router])

  if (authLoading || !user || role !== "customer") {
    return null
  }

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>

          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="w-12 h-12 text-primary" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold">AI 음성 주문</h1>
            <p className="text-muted-foreground">
              음성으로 주문하실 디너를 말씀해주세요
            </p>

            <div className="pt-8">
              <Button size="lg" disabled>
                <Mic className="w-5 h-5 mr-2" />
                음성 인식 시작
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

