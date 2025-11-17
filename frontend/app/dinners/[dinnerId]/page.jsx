"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Check, Loader2 } from "lucide-react"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import { menuAPI } from "@/lib/services/menu.service"
import { useAuth } from "@/context/AuthContext"

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

export default function DinnerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const dinnerId = params.dinnerId
  const { user, loading: authLoading } = useAuth()

  const [dinner, setDinner] = useState(null)
  const [styles, setStyles] = useState([])
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [totalPrice, setTotalPrice] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }

    if (user && dinnerId) {
      loadDinnerData()
    }
  }, [user, authLoading, dinnerId, router])

  const loadDinnerData = async () => {
    try {
      setLoading(true)
      setError(null)

      // 디너 정보 조회
      const dinnerData = await menuAPI.getDinnerById(dinnerId)
      if (!dinnerData) {
        setError("디너를 찾을 수 없습니다")
        return
      }

      // 디너 이름을 키로 변환
      const nameKey = dinnerData.name.toLowerCase().replace(/\s+/g, '').replace('dinner', '')
      const id = nameKey === 'french' ? 'french' : 
                 nameKey === 'english' ? 'english' : 
                 nameKey === 'valentine' ? 'valentine' : 
                 nameKey === 'champagne' || nameKey === 'champagnefeast' ? 'champagne' : 
                 dinnerData.id

      const formattedDinner = {
        id: id,
        name: dinnerData.name,
        description: dinnerData.description || "",
        basePrice: Number(dinnerData.basePrice || 0),
        image: getDinnerImage(dinnerData.name),
        availableStyles: dinnerData.availableStyles || ["simple", "grand", "deluxe"],
      }

      setDinner(formattedDinner)
      setTotalPrice(formattedDinner.basePrice)

      // 스타일 목록 조회
      const stylesData = await menuAPI.getAllStyles()
      const formattedStyles = stylesData.map((style) => ({
        id: style.id,
        name: style.name,
        description: style.details || "",
        priceModifier: Number(style.priceModifier || 0),
      }))
      setStyles(formattedStyles)
    } catch (err) {
      console.error("디너 데이터 조회 실패:", err)
      setError(err.message || "디너 정보를 불러오는데 실패했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleStyleSelect = (styleId) => {
    setSelectedStyle(styleId)
    const style = styles.find(s => s.id === styleId)
    if (style && dinner) {
      setTotalPrice(dinner.basePrice + style.priceModifier)
    }
  }

  const handleNext = () => {
    if (!selectedStyle) {
      alert("서빙 스타일을 선택해주세요")
      return
    }
    // 선택 정보를 저장하고 커스터마이징 페이지로 이동
    router.push(`/order/customize?dinner=${dinnerId}&style=${selectedStyle}`)
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

  if (error || !dinner) {
    return (
      <>
        <Header user={user} role="customer" />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{error || "디너를 찾을 수 없습니다"}</p>
            <Button onClick={() => router.push("/dinners")}>디너 목록으로</Button>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header user={user} role="customer" />
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* 뒤로가기 */}
          <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            디너 목록으로
          </Button>

          {/* 디너 정보 */}
          <Card className="p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
                <img 
                  src={dinner.image} 
                  alt={dinner.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{dinner.name}</h1>
                {dinner.description && (() => {
                  const [shortDesc, ...detailParts] = dinner.description.split('\n')
                  const detailDesc = detailParts.join('\n')
                  return (
                    <div className="mb-4">
                      <p className="text-base font-semibold text-foreground mb-2">{shortDesc}</p>
                      {detailDesc && <p className="text-muted-foreground">{detailDesc}</p>}
                    </div>
                  )
                })()}
                <div className="flex items-baseline gap-2">
                  <span className="text-sm text-muted-foreground">기본 가격</span>
                  <span className="text-2xl font-bold text-primary">₩{dinner.basePrice.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* 스타일 선택 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">서빙 스타일 선택</h2>
            <p className="text-muted-foreground mb-6">
              원하시는 서빙 스타일을 선택해주세요
              {dinnerId === "champagne" && (
                <span className="text-primary font-medium ml-2">
                  샴페인 축제 디너는 그랜드/디럭스 스타일만 가능합니다
                </span>
              )}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {styles.map((style) => {
                const isAvailable = dinner.availableStyles.includes(style.id) || 
                                   dinner.availableStyles.includes(style.name.toLowerCase())
                const isSelected = selectedStyle === style.id

                return (
                  <Card
                    key={style.id}
                    className={`p-6 cursor-pointer transition-all ${
                      !isAvailable
                        ? "opacity-40 cursor-not-allowed"
                        :                       isSelected
                          ? "border-2 border-primary shadow-lg"
                          : "hover:shadow-md"
                    }`}
                    onClick={() => isAvailable && handleStyleSelect(style.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2">{style.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{style.description}</p>
                    <div className="flex items-baseline gap-2">
                      {style.priceModifier === 0 ? (
                        <span className="text-lg font-bold text-green-600">무료</span>
                      ) : (
                        <>
                          <span className="text-lg font-bold text-primary">
                            +₩{style.priceModifier.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">추가</span>
                        </>
                      )}
                    </div>
                    {!isAvailable && (
                      <Badge variant="secondary" className="mt-2">
                        선택 불가
                      </Badge>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>

          {/* 현재 가격 & 다음 버튼 */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">현재 총 가격</p>
                <p className="text-3xl font-bold text-primary">₩{totalPrice.toLocaleString()}</p>
              </div>
              <Button size="lg" onClick={handleNext} disabled={!selectedStyle}>
                다음: 메뉴 커스터마이징
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  )
}
