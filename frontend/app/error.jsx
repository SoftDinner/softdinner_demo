"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"

export default function Error({ error, reset }) {
  useEffect(() => {
    // 에러 로깅
    console.error("Application error:", error)
  }, [error])

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-foreground mb-4">오류가 발생했습니다</h1>
          <p className="text-muted-foreground mb-8">
            예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={reset}>다시 시도</Button>
            <Button variant="outline" asChild>
              <a href="/">홈으로</a>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

