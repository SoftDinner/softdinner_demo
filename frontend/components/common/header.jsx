"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

export default function Header() {
  const { user, role, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="text-2xl font-serif font-bold text-primary">Mr. 대박 디너서비스</div>
          </Link>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {role === "customer" && (
                  <Button variant="default" size="sm" asChild>
                    <Link href="/order/voice">
                      <Mic className="w-4 h-4 mr-2" />
                      AI 음성인식 주문
                    </Link>
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">{user.full_name || user.email}</span>
                {role === "staff" && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/staff">직원 대시보드</Link>
                  </Button>
                )}
                {role === "customer" && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/dashboard">내 대시보드</Link>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={signOut}>
                  로그아웃
                </Button>
              </div>
            ) : (
              <Button variant="default" size="sm" asChild>
                <Link href="/auth">로그인</Link>
              </Button>
            )}
          </div>

          <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <div className="pt-4 border-t border-border">
                {user ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-3">{user.full_name || user.email}</div>
                    {role === "customer" && (
                      <>
                        <Button variant="default" size="sm" className="w-full mb-2" asChild>
                          <Link href="/order/voice">
                            <Mic className="w-4 h-4 mr-2" />
                            AI 음성인식 주문
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="w-full mb-2" asChild>
                          <Link href="/dashboard">내 대시보드</Link>
                        </Button>
                      </>
                    )}
                    {role === "staff" && (
                      <Button variant="ghost" size="sm" className="w-full mb-2" asChild>
                        <Link href="/staff">직원 대시보드</Link>
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                      <Link href="/auth/logout">로그아웃</Link>
                    </Button>
                  </>
                ) : (
                  <Button variant="default" size="sm" className="w-full" asChild>
                    <Link href="/auth">로그인</Link>
                  </Button>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
