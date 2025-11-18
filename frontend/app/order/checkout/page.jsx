"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, ArrowLeft, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import { orderAPI, apiRequest } from "@/lib/api"
import { menuAPI } from "@/lib/services/menu.service"
import { useAuth } from "@/context/AuthContext"
import useOrderStore from "@/store/orderStore"

export default function CheckoutPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  
  const dinnerId = searchParams.get("dinner")
  const styleId = searchParams.get("style")

  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [deliveryDate, setDeliveryDate] = useState(null)
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvc, setCvc] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  
  // 주문 정보
  const [dinner, setDinner] = useState(null)
  const [style, setStyle] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loyaltyInfo, setLoyaltyInfo] = useState(null)
  const [priceBreakdown, setPriceBreakdown] = useState({
    basePrice: 0,
    stylePrice: 0,
    customizationPrice: 0,
    subtotal: 0,
    discountRate: 0,
    discountAmount: 0,
    finalPrice: 0,
  })

  // Zustand store에서 커스터마이징 정보 가져오기
  const { customizations } = useOrderStore()
  const loadingRef = useRef(false) // 중복 API 호출 방지

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }
    
    if (user && dinnerId && styleId && !loadingRef.current) {
      loadingRef.current = true
      loadOrderData()
      loadLoyaltyInfo()
      
      // 사용자 정보에서 주소와 결제 정보 자동 입력
      if (user.address) {
        setDeliveryAddress(user.address)
      }
      if (user.cardNumber) {
        setCardNumber(user.cardNumber)
      }
      if (user.cardExpiry) {
        setExpiryDate(user.cardExpiry)
      }
      if (user.cardCvc) {
        setCvc(user.cardCvc)
      }
    }
  }, [user, authLoading, router, dinnerId, styleId])
  
  const loadOrderData = async () => {
    try {
      console.log("🔍 Checkout 페이지 - 주문 데이터 로드 시작:", { dinnerId, styleId, customizations })
      
      // 디너 정보
      const dinnerData = await menuAPI.getDinnerById(dinnerId)
      console.log("📦 디너 데이터:", dinnerData)
      setDinner(dinnerData)
      
      // 스타일 정보 (UUID 또는 이름으로 찾기)
      const stylesData = await menuAPI.getAllStyles()
      // 먼저 ID로 찾고, 없으면 이름으로 찾기
      let selectedStyleData = stylesData.find(s => s.id === styleId)
      if (!selectedStyleData) {
        // UUID가 아니면 이름으로 찾기
        selectedStyleData = stylesData.find(s => s.name?.toLowerCase() === styleId?.toLowerCase())
      }
      console.log("📦 스타일 데이터:", selectedStyleData, "styleId:", styleId)
      setStyle(selectedStyleData)
      
      // 메뉴 항목 (커스터마이징 가격 계산용)
      const itemsData = await menuAPI.getMenuItemsByDinnerId(dinnerId)
      console.log("📦 메뉴 항목 데이터:", itemsData)
      setMenuItems(itemsData || [])
    } catch (error) {
      console.error("주문 정보 로드 실패:", error)
      loadingRef.current = false
    }
  }
  
  const loadLoyaltyInfo = async () => {
    try {
      const info = await apiRequest('/api/users/loyalty', { method: 'GET' })
      setLoyaltyInfo(info)
    } catch (error) {
      console.error("단골 정보 조회 실패:", error)
    }
  }
  
  // 가격 계산
  useEffect(() => {
    if (!dinner || !style) {
      console.log("⚠️ 가격 계산 대기 중 - dinner:", dinner, "style:", style)
      return
    }
    
    const basePrice = Number(dinner.basePrice || 0)
    const stylePrice = Number(style.priceModifier || 0)
    
    // 커스터마이징 가격 계산 (기본 수량 제외, 추가분만 반영)
    let customizationPrice = 0
    if (menuItems && menuItems.length > 0 && customizations) {
      console.log("💰 커스터마이징 가격 계산:", {
        menuItemsCount: menuItems.length,
        customizations: customizations,
        customizationsKeys: Object.keys(customizations || {})
      })
      
      menuItems.forEach((item) => {
        const currentQty = customizations[item.id] || 0
        const defaultQty = item.defaultQuantity || 0
        const additionalPrice = Number(item.additionalPrice || 0)
        // 기본 수량과의 차이를 가격에 반영 (추가분은 더하고, 감소분은 빼기)
        const quantityDiff = currentQty - defaultQty
        const itemPriceChange = quantityDiff * additionalPrice
        if (quantityDiff !== 0) {
          console.log(`  - ${item.name}: 기본 ${defaultQty}개 포함, ${quantityDiff > 0 ? '추가' : '감소'} ${Math.abs(quantityDiff)}개 × ${additionalPrice} = ${itemPriceChange}`)
        }
        customizationPrice += itemPriceChange
      })
    } else {
      console.warn("⚠️ 커스터마이징 데이터 없음:", {
        menuItems: menuItems?.length || 0,
        customizations: customizations,
        customizationsType: typeof customizations
      })
    }
    
    const subtotal = basePrice + stylePrice + customizationPrice
    
    // 할인 계산 (discountRate는 0.05 형식이므로 그대로 사용)
    const discountRate = Number(loyaltyInfo?.discountRate || 0)
    const discountAmount = subtotal * discountRate
    const finalPrice = subtotal - discountAmount
    
    console.log("💰 최종 가격 계산:", {
      basePrice,
      stylePrice,
      customizationPrice,
      subtotal,
      discountRate,
      discountAmount,
      finalPrice,
      loyaltyTier: loyaltyInfo?.tier
    })
    
    setPriceBreakdown({
      basePrice,
      stylePrice,
      customizationPrice,
      subtotal,
      discountRate,
      discountAmount,
      finalPrice,
    })
  }, [dinner, style, menuItems, customizations, loyaltyInfo])

  const handleSubmitOrder = async () => {
    if (!deliveryAddress || !deliveryDate) {
      alert("배달 주소와 날짜를 입력해주세요")
      return
    }

    // 결제 정보 필수 검증
    if (!cardNumber || !expiryDate || !cvc) {
      alert("결제 정보를 모두 입력해주세요")
      return
    }

    // 카드 번호 형식 검증 (숫자만, 최소 13자리)
    const cardNumberClean = cardNumber.replace(/\s/g, "")
    if (cardNumberClean.length < 13 || !/^\d+$/.test(cardNumberClean)) {
      alert("올바른 카드 번호를 입력해주세요")
      return
    }

    // 만료일 형식 검증 (MM/YY)
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      alert("올바른 만료일 형식(MM/YY)을 입력해주세요")
      return
    }

    // CVC 검증 (3자리 숫자)
    if (!/^\d{3}$/.test(cvc)) {
      alert("올바른 CVC를 입력해주세요 (3자리 숫자)")
      return
    }

    if (!dinnerId || !styleId) {
      alert("주문 정보가 올바르지 않습니다. 다시 시도해주세요.")
      router.push("/dinners")
      return
    }

    setIsProcessing(true)

    try {
      // 주문 데이터 구성
      const orderData = {
        dinnerId: dinnerId,
        styleId: styleId,
        deliveryAddress: deliveryAddress,
        deliveryDate: format(deliveryDate, "yyyy-MM-dd'T'HH:mm:ss"),
        customizations: customizations || {},
        paymentInfo: {
          cardNumber: cardNumber,
          expiryDate: expiryDate,
          cvc: cvc,
        },
      }

      // API 호출하여 주문 생성
      const response = await orderAPI.createOrder(orderData)

      // 성공 시 완료 페이지로 이동 (주문 ID 전달)
      router.push(`/order/success?orderId=${response.id}`)
    } catch (error) {
      console.error("주문 실패:", error)
      alert(`주문에 실패했습니다: ${error.message}`)
      setIsProcessing(false)
    }
  }

  if (authLoading) {
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
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>

          <h1 className="text-3xl font-bold mb-2">주문 완료하기</h1>
          <p className="text-muted-foreground mb-8">배달 정보와 결제 정보를 입력해주세요</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 배달 & 결제 정보 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 배달 정보 */}
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">배달 정보</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">배달 주소 *</Label>
                    <Input
                      id="address"
                      placeholder="서울시 강남구 테헤란로 123"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>배달 날짜 *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left mt-2 bg-transparent">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {deliveryDate ? format(deliveryDate, "PPP", { locale: ko }) : <span>날짜 선택</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={deliveryDate}
                          onSelect={setDeliveryDate}
                          disabled={(date) => {
                            const today = new Date()
                            today.setHours(0, 0, 0, 0)
                            return date < today
                          }}
                          locale={ko}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </Card>

              {/* 결제 정보 */}
              <Card className="p-6">
                <h3 className="text-xl font-bold mb-4">결제 정보 *</h3>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cardNumber">카드 번호 *</Label>
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      value={cardNumber}
                      onChange={(e) => {
                        // 숫자만 추출
                        const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '')
                        // 4자리마다 공백 추가
                        const formatted = value.match(/.{1,4}/g)?.join(' ') || value
                        setCardNumber(formatted)
                      }}
                      maxLength={19} // 16자리 + 3개 공백
                      className="mt-2"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">만료일 (MM/YY) *</Label>
                      <Input
                        id="expiry"
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => {
                          // 숫자만 추출
                          const value = e.target.value.replace(/\D/g, '')
                          // MM/YY 형식으로 포맷팅
                          let formatted = value
                          if (value.length >= 2) {
                            formatted = value.substring(0, 2) + '/' + value.substring(2, 4)
                          }
                          setExpiryDate(formatted)
                        }}
                        maxLength={5}
                        className="mt-2"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvc">CVC *</Label>
                      <Input
                        id="cvc"
                        placeholder="123"
                        value={cvc}
                        onChange={(e) => {
                          // 숫자만 입력, 최대 3자리
                          const value = e.target.value.replace(/\D/g, '').slice(0, 3)
                          setCvc(value)
                        }}
                        maxLength={3}
                        className="mt-2"
                        required
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* 주문 요약 */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-6">
                <h3 className="text-xl font-bold mb-4">최종 결제 금액</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">기본 가격</span>
                    <span>₩{priceBreakdown.basePrice.toLocaleString()}</span>
                  </div>
                  {priceBreakdown.stylePrice > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">스타일 추가</span>
                      <span>₩{priceBreakdown.stylePrice.toLocaleString()}</span>
                    </div>
                  )}
                  {priceBreakdown.customizationPrice !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">메뉴 커스터마이징 가격</span>
                      <span>₩{priceBreakdown.customizationPrice.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-muted-foreground">소계</span>
                    <span className="font-medium">₩{priceBreakdown.subtotal.toLocaleString()}</span>
                  </div>
                  {priceBreakdown.discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>
                        단골 할인 ({loyaltyInfo?.tier?.toUpperCase() || 'BRONZE'} {(priceBreakdown.discountRate * 100).toFixed(0)}%)
                      </span>
                      <span>-₩{priceBreakdown.discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold">총 결제 금액</span>
                    <span className="text-2xl font-bold text-primary">₩{priceBreakdown.finalPrice.toLocaleString()}</span>
                  </div>
                </div>

                <Button className="w-full" size="lg" onClick={handleSubmitOrder} disabled={isProcessing}>
                  {isProcessing ? "처리 중..." : "결제하기"}
                </Button>

              </Card>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}
