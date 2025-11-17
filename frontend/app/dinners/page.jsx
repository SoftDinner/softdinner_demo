"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import { menuAPI } from "@/lib/services/menu.service"
import { useAuth } from "@/context/AuthContext"

// 이미지 매핑 (DB에 없는 필드이므로 이름으로 매핑)
const getDinnerImage = (name) => {
  const imageMap = {
    "Valentine Dinner": "/images/valentine.png",
    "French Dinner": "/images/french.png",
    "English Dinner": "/images/english.png",
    "Champagne Feast": "/images/champagne.png",
  }
  return imageMap[name] || "/images/valentine.png"
}

export default function DinnersPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [dinners, setDinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }

    // 직원은 직원 대시보드로 리다이렉트
    if (user && role === "staff") {
      router.push("/staff")
      return
    }

    if (user) {
      loadDinners()
    }
  }, [user, role, authLoading, router])

  const loadDinners = async () => {
    try {
      setLoading(true)
      setError(null)
      const dinnersData = await menuAPI.getAllDinners()
      
      // 디너 이름을 키로 변환 (예: "French Dinner" -> "french")
      const formattedDinners = dinnersData.map((dinner) => {
        const nameKey = dinner.name.toLowerCase().replace(/\s+/g, '').replace('dinner', '')
        const id = nameKey === 'french' ? 'french' : 
                   nameKey === 'english' ? 'english' : 
                   nameKey === 'valentine' ? 'valentine' : 
                   nameKey === 'champagne' || nameKey === 'champagnefeast' ? 'champagne' : 
                   dinner.id
        
        return {
          id: id,
          name: dinner.name,
          description: dinner.description || "",
          basePrice: Number(dinner.basePrice || 0),
          image: getDinnerImage(dinner.name),
          availableStyles: dinner.availableStyles || ["simple", "grand", "deluxe"],
        }
      })
      
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
      setError(err.message || "디너 목록을 불러오는데 실패했습니다.")
      setDinners([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectDinner = (dinner) => {
    router.push(`/dinners/${dinner.id}`)
  }

  if (loading || authLoading) {
    return (
      <>
        <Header user={user} role="customer" />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header user={user} role="customer" />
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">프리미엄 디너 선택</h1>
            <p className="text-lg text-muted-foreground">특별한 날을 위한 완벽한 디너를 선택하세요</p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-center">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadDinners} variant="outline" className="mt-2">다시 시도</Button>
            </div>
          )}

          {/* 디너 그리드 */}
          {dinners.length === 0 && !loading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">디너가 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {dinners.map((dinner) => (
                <Card
                  key={dinner.id}
                  className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                  onClick={() => handleSelectDinner(dinner)}
                >
                  {/* 이미지 */}
                  <div className="relative h-48 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden">
                    <img 
                      src={dinner.image} 
                      alt={dinner.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* 내용 */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-2">{dinner.name}</h3>
                    {dinner.description && (() => {
                      const [shortDesc, ...detailParts] = dinner.description.split('\n')
                      const detailDesc = detailParts.join('\n')
                      return (
                        <div className="mb-4">
                          <p className="text-sm font-semibold text-foreground mb-1">{shortDesc}</p>
                          {detailDesc && <p className="text-sm text-muted-foreground line-clamp-2">{detailDesc}</p>}
                        </div>
                      )
                    })()}

                    {/* 기본 가격 */}
                    <div className="mb-4">
                      <span className="text-sm text-muted-foreground">기본 가격</span>
                      <p className="text-2xl font-bold text-primary">₩{dinner.basePrice.toLocaleString()}</p>
                    </div>

                    {/* 버튼 */}
                    <Button className="w-full group-hover:bg-primary/90">선택하기</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 안내 메시지 */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              디너 선택 후 서빙 스타일과 메뉴를 커스터마이징할 수 있습니다
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
