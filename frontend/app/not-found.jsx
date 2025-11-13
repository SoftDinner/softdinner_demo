import Link from "next/link"
import { Button } from "@/components/ui/button"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-4">페이지를 찾을 수 없습니다</h2>
          <p className="text-muted-foreground mb-8">
            요청하신 페이지가 존재하지 않거나 이동되었습니다.
          </p>
          <div className="flex gap-4 justify-center">
            <Button asChild>
              <Link href="/">홈으로</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dinners">디너 메뉴 보기</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

