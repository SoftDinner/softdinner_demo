"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import { menuAPI } from "@/lib/services/menu.service"

// 이미지 매핑
const getDinnerImage = (name) => {
  const imageMap = {
    "Valentine Dinner": "/images/valentine.png",
    "French Dinner": "/images/french.png",
    "English Dinner": "/images/english.png",
    "Champagne Feast": "/images/champagne.png",
  }
  return imageMap[name] || "/images/valentine.png"
}

export default function HomePage() {
  const [dinners, setDinners] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDinners()
  }, [])

  const loadDinners = async () => {
    try {
      setLoading(true)
      const dinnersData = await menuAPI.getAllDinners()
      
      const formattedDinners = dinnersData.map((dinner) => ({
        id: dinner.id,
        name: dinner.name,
        description: dinner.description || "",
        basePrice: Number(dinner.basePrice || 0),
        image: getDinnerImage(dinner.name),
      }))
      
      // 발렌타인, 프렌치, 잉글리시, 샴페인 순서로 정렬
      const dinnerOrder = ['Valentine Dinner', 'French Dinner', 'English Dinner', 'Champagne Feast']
      const sortedDinners = formattedDinners.sort((a, b) => {
        const indexA = dinnerOrder.indexOf(a.name)
        const indexB = dinnerOrder.indexOf(b.name)
        // 순서에 없는 항목은 맨 뒤로
        if (indexA === -1 && indexB === -1) return 0
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
      })
      
      setDinners(sortedDinners)
    } catch (err) {
      console.error("디너 목록 조회 실패:", err)
      setDinners([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="relative h-[600px] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: "url('/elegant-fine-dining-restaurant-interior.jpg')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-background/50" />
          </div>

          <div className="relative z-10 container mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 text-balance">
              특별한 날을 위한
              <br />
              프리미엄 디너
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-pretty">
              발렌타인, 프렌치, 잉글리시, 샴페인 축제
              <br />
              당신의 특별한 순간을 Mr. 대박 디너서비스와 함께하세요
            </p>
          </div>
        </section>

        <section className="py-16 bg-secondary/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-12">
              프리미엄 디너 컬렉션
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {dinners.map((dinner) => (
                  <div
                    key={dinner.id}
                    className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                  >
                    <div className="h-48 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                      <img 
                        src={dinner.image} 
                        alt={dinner.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-foreground mb-2">{dinner.name}</h3>
                      {dinner.description && (() => {
                        const [shortDesc, ...detailParts] = dinner.description.split('\n')
                        const detailDesc = detailParts.join('\n')
                        return (
                          <div className="mb-3">
                            <p className="text-sm font-semibold text-foreground mb-1">{shortDesc}</p>
                            {detailDesc && <p className="text-sm text-muted-foreground">{detailDesc}</p>}
                          </div>
                        )
                      })()}
                      <p className="text-lg font-bold text-primary mb-4">₩{dinner.basePrice.toLocaleString()}~</p>
                      <Button variant="outline" size="sm" className="w-full bg-transparent" asChild>
                        <Link href="/dinners">자세히 보기</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">단골 혜택 프로그램</h2>
              <p className="text-lg text-muted-foreground mb-12">
                주문할수록 커지는 할인 혜택
                <br />
                플래티넘 등급은 최대 20% 할인
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { tier: "브론즈", discount: "0%" },
                  { tier: "실버", discount: "5%" },
                  { tier: "골드", discount: "10%" },
                  { tier: "플래티넘", discount: "20%" },
                ].map((tier) => (
                  <div
                    key={tier.tier}
                    className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow"
                  >
                    <div className="text-lg font-semibold text-foreground mb-1">{tier.tier}</div>
                    <div className="text-2xl font-bold text-green-600">{tier.discount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
