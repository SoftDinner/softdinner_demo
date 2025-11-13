"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Home, Receipt, Loader2 } from "lucide-react"
import { orderService } from "@/lib/services/order.service"
import { menuAPI } from "@/lib/services/menu.service"
import { apiRequest } from "@/lib/api"

export default function OrderSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderId = searchParams.get("orderId")

  const [loading, setLoading] = useState(true)
  const [orderData, setOrderData] = useState(null)
  const [menuItemMap, setMenuItemMap] = useState({})
  const [customizationDetails, setCustomizationDetails] = useState([])

  useEffect(() => {
    if (orderId) {
      loadOrderData()
    } else {
      setLoading(false)
    }
  }, [orderId])

  const loadOrderData = async () => {
    try {
      setLoading(true)
      
      // 주문 정보 가져오기
      const order = await apiRequest(`/api/orders/${orderId}`, {
        method: 'GET',
      })
      
      if (!order) {
        console.error("주문 정보를 찾을 수 없습니다")
        setLoading(false)
        return
      }

      console.log("주문 정보:", order)

      // 날짜 포맷팅
      let orderDateStr = null
      let deliveryDateStr = null
      
      // orderDate, order_date, created_at 등 여러 필드명 확인
      const orderDateValue = order.orderDate || order.order_date || order.created_at
      console.log("주문일 원본 데이터:", {
        orderDate: order.orderDate,
        order_date: order.order_date,
        created_at: order.created_at,
        orderDateValue: orderDateValue
      })
      
      if (orderDateValue) {
        if (typeof orderDateValue === 'string') {
          // ISO 형식 문자열인지 확인
          orderDateStr = orderDateValue
        } else if (orderDateValue instanceof Date) {
          orderDateStr = orderDateValue.toISOString()
        } else {
          try {
            // 숫자나 다른 형식도 처리
            const date = new Date(orderDateValue)
            if (!isNaN(date.getTime())) {
              orderDateStr = date.toISOString()
            } else {
              console.warn("유효하지 않은 주문일:", orderDateValue)
              orderDateStr = new Date().toISOString()
            }
          } catch (e) {
            console.warn("주문일 변환 실패:", orderDateValue, e)
            orderDateStr = new Date().toISOString()
          }
        }
      } else {
        // 주문일이 없으면 현재 시간 사용
        console.warn("주문일이 없어 현재 시간 사용")
        orderDateStr = new Date().toISOString()
      }
      
      console.log("최종 주문일 문자열:", orderDateStr)
      
      if (order.deliveryDate) {
        if (typeof order.deliveryDate === 'string') {
          deliveryDateStr = order.deliveryDate
        } else if (order.deliveryDate instanceof Date) {
          deliveryDateStr = order.deliveryDate.toISOString()
        } else {
          try {
            deliveryDateStr = new Date(order.deliveryDate).toISOString()
          } catch (e) {
            console.warn("배달일 변환 실패:", order.deliveryDate)
          }
        }
      }

      // 가격 파싱
      let finalPriceValue = 0
      if (order.finalPrice !== null && order.finalPrice !== undefined) {
        if (typeof order.finalPrice === 'number') {
          finalPriceValue = order.finalPrice
        } else if (typeof order.finalPrice === 'string') {
          finalPriceValue = Number(order.finalPrice) || 0
        } else if (order.finalPrice && typeof order.finalPrice === 'object') {
          if (order.finalPrice.value !== undefined) {
            finalPriceValue = Number(order.finalPrice.value) || 0
          } else {
            finalPriceValue = Number(String(order.finalPrice)) || 0
          }
        }
      }

      let discountValue = 0
      if (order.discountApplied !== null && order.discountApplied !== undefined) {
        if (typeof order.discountApplied === 'number') {
          discountValue = order.discountApplied
        } else if (typeof order.discountApplied === 'string') {
          discountValue = Number(order.discountApplied) || 0
        } else if (order.discountApplied && typeof order.discountApplied === 'object') {
          if (order.discountApplied.value !== undefined) {
            discountValue = Number(order.discountApplied.value) || 0
          } else {
            discountValue = Number(String(order.discountApplied)) || 0
          }
        }
      }

      let totalPriceValue = 0
      if (order.totalPrice !== null && order.totalPrice !== undefined) {
        if (typeof order.totalPrice === 'number') {
          totalPriceValue = order.totalPrice
        } else if (typeof order.totalPrice === 'string') {
          totalPriceValue = Number(order.totalPrice) || 0
        } else if (order.totalPrice && typeof order.totalPrice === 'object') {
          if (order.totalPrice.value !== undefined) {
            totalPriceValue = Number(order.totalPrice.value) || 0
          } else {
            totalPriceValue = Number(String(order.totalPrice)) || 0
          }
        }
      }

      // 커스터마이징 정보 처리
      let customizations = {}
      if (order.orderItems?.customizations) {
        if (typeof order.orderItems.customizations === 'string') {
          try {
            customizations = JSON.parse(order.orderItems.customizations)
          } catch (e) {
            console.warn("커스터마이징 파싱 실패:", e)
            customizations = {}
          }
        } else {
          customizations = order.orderItems.customizations
        }
      }
      console.log("파싱된 커스터마이징:", customizations)
      const dinnerName = order.dinnerName || order.orderItems?.dinner_name || "알 수 없음"
      
      // 메뉴 항목 이름 로드 및 커스터마이징 상세 정보 생성
      let menuItems = []
      try {
        menuItems = await menuAPI.getMenuItemsByDinnerId(dinnerName) || []
        const itemMap = {}
        const details = []
        
        if (menuItems && menuItems.length > 0) {
          menuItems.forEach(item => {
            itemMap[item.id] = item
          })

          // 커스터마이징 상세 정보 생성
          Object.entries(customizations).forEach(([itemId, qty]) => {
            const item = itemMap[itemId]
            if (item) {
              const defaultQty = item.defaultQuantity || 0
              const quantityDiff = Number(qty) - defaultQty
              
              if (quantityDiff !== 0) {
                details.push({
                  name: item.name,
                  icon: item.icon || "🍽️",
                  unit: item.unit || "개",
                  quantityDiff,
                  pricePerUnit: item.pricePerUnit || 0,
                  priceChange: quantityDiff * (item.pricePerUnit || 0),
                })
              }
            }
          })
        }
        
        setMenuItemMap(itemMap)
        setCustomizationDetails(details)
      } catch (error) {
        console.error("메뉴 항목 로드 실패:", error)
      }

      // 등급 정보 가져오기 (주문 시점의 등급 정보 사용)
      let loyaltyTier = order.orderItems?.loyalty_tier || null
      let discountRate = 0
      
      // orderItems에 저장된 주문 시점의 할인율 사용
      if (order.orderItems?.discount_rate !== undefined) {
        discountRate = Number(order.orderItems.discount_rate) * 100
      } else {
        // 없으면 현재 등급 정보 조회 (fallback)
        try {
          const loyaltyInfo = await apiRequest('/api/users/loyalty', { method: 'GET' })
          if (loyaltyInfo) {
            if (!loyaltyTier) {
              loyaltyTier = loyaltyInfo.tier
            }
            discountRate = Number(loyaltyInfo.discountRate || 0) * 100
          }
        } catch (error) {
          console.error("등급 정보 로드 실패:", error)
        }
      }

      // 가격 정보 계산
      // 디너와 스타일 정보를 가져와서 정확한 가격 계산
      let basePrice = 0
      let stylePrice = 0
      let customizationPrice = 0
      
      try {
        // 디너 정보 가져오기
        const dinnerData = await menuAPI.getDinnerById(dinnerName)
        if (dinnerData) {
          basePrice = Number(dinnerData.basePrice || 0)
        }
        
        // 스타일 정보 가져오기
        const styleId = order.orderItems?.style_id
        const styleName = order.styleName || order.orderItems?.style_name
        if (styleId || styleName) {
          const stylesData = await menuAPI.getAllStyles()
          let selectedStyle = null
          if (styleId) {
            selectedStyle = stylesData.find(s => s.id === styleId)
          }
          if (!selectedStyle && styleName) {
            selectedStyle = stylesData.find(s => s.name?.toLowerCase() === styleName?.toLowerCase())
          }
          if (selectedStyle && selectedStyle.priceModifier) {
            stylePrice = Number(selectedStyle.priceModifier || 0)
          }
        }
        
        // 커스터마이징 가격 계산
        console.log("커스터마이징 가격 계산 시작:", {
          customizationsKeys: Object.keys(customizations),
          customizations: customizations,
          menuItemsIds: menuItems.map(m => m.id),
          menuItemsCount: menuItems.length
        })
        
        if (menuItems && menuItems.length > 0 && Object.keys(customizations).length > 0) {
          Object.entries(customizations).forEach(([itemId, qty]) => {
            console.log(`아이템 ID 찾기: ${itemId}, 수량: ${qty}`)
            const item = menuItems.find(m => m.id === itemId)
            if (item) {
              const defaultQty = item.defaultQuantity ?? 0
              const quantityDiff = Number(qty) - defaultQty
              console.log(`아이템 찾음: ${item.name}, 기본: ${defaultQty}, 현재: ${qty}, 차이: ${quantityDiff}, 단가: ${item.pricePerUnit}`)
              if (quantityDiff !== 0 && item.pricePerUnit) {
                const itemPrice = quantityDiff * Number(item.pricePerUnit)
                customizationPrice += itemPrice
                console.log(`커스터마이징 가격 계산: ${item.name} ${quantityDiff > 0 ? '+' : ''}${quantityDiff} × ${item.pricePerUnit} = ${itemPrice}`)
              } else {
                console.log(`가격 계산 스킵: quantityDiff=${quantityDiff}, pricePerUnit=${item.pricePerUnit}`)
              }
            } else {
              console.warn(`아이템을 찾을 수 없음: ${itemId}`)
            }
          })
        } else {
          console.warn("메뉴 항목 또는 커스터마이징이 없음:", {
            menuItemsLength: menuItems?.length || 0,
            customizationsLength: Object.keys(customizations).length
          })
        }
        console.log("최종 커스터마이징 가격:", customizationPrice)
      } catch (error) {
        console.error("가격 정보 계산 실패:", error)
        // 계산 실패 시 대략적인 값 사용
        basePrice = totalPriceValue - discountValue
      }

        console.log("주문 완료 페이지 - 최종 가격 정보:", {
        basePrice,
        stylePrice,
        customizationPrice,
        subtotal: totalPriceValue,
        discountAmount: discountValue,
        finalPrice: finalPriceValue,
        customizationsCount: Object.keys(customizations).length,
        menuItemsCount: menuItems.length,
        customizations: customizations,
        menuItems: menuItems.map(m => ({ id: m.id, name: m.name, pricePerUnit: m.pricePerUnit, defaultQuantity: m.defaultQuantity }))
      })

      setOrderData({
        orderId: order.id,
        dinnerName: dinnerName,
        style: order.styleName || order.orderItems?.style_name || "알 수 없음",
        deliveryDate: deliveryDateStr ? formatDate(deliveryDateStr) : null,
        deliveryAddress: order.deliveryAddress || order.delivery_address || "",
        basePrice: basePrice,
        stylePrice: stylePrice,
        customizationPrice: customizationPrice,
        subtotal: totalPriceValue,
        loyaltyTier: loyaltyTier,
        discountRate: discountRate,
        discountAmount: discountValue,
        finalPrice: finalPriceValue,
        orderDate: orderDateStr || null,
      })
    } catch (error) {
      console.error("주문 정보 로드 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (e) {
      return dateString
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return "알 수 없음"
    try {
      // ISO 문자열을 Date 객체로 변환
      const date = new Date(dateString)
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn("유효하지 않은 timestamp:", dateString)
        return "알 수 없음"
      }
      
      // UTC 시간을 밀리초로 가져오기
      const utcTime = date.getTime()
      
      // 한국 시간대(UTC+9)로 변환: 9시간 = 9 * 60 * 60 * 1000 밀리초
      const koreaOffset = 9 * 60 * 60 * 1000
      const koreaTime = new Date(utcTime + koreaOffset)
      
      // UTC 메서드를 사용하여 포맷팅 (이미 offset이 적용된 상태)
      const year = koreaTime.getUTCFullYear()
      const month = String(koreaTime.getUTCMonth() + 1).padStart(2, '0')
      const day = String(koreaTime.getUTCDate()).padStart(2, '0')
      const hours = String(koreaTime.getUTCHours()).padStart(2, '0')
      const minutes = String(koreaTime.getUTCMinutes()).padStart(2, '0')
      
      return `${year}-${month}-${day} ${hours}:${minutes}`
    } catch (e) {
      console.error("시간 포맷팅 실패:", dateString, e)
      return "알 수 없음"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">주문 정보를 불러오는 중...</p>
          </Card>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="p-12 text-center">
            <p className="text-muted-foreground mb-4">주문 정보를 찾을 수 없습니다</p>
            <Button onClick={() => router.push("/dashboard")}>
              주문 내역으로 이동
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* 성공 메시지 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-2">주문이 완료되었습니다!</h1>
          <p className="text-muted-foreground">맛있는 디너를 준비하여 배달해드리겠습니다</p>
        </div>

        {/* 주문 정보 */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <h3 className="text-lg font-bold">주문 번호</h3>
            <Badge variant="outline" className="text-base font-mono">
              {orderData.orderId.substring(0, 8)}
            </Badge>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">주문일</span>
              <span className="font-medium">
                {orderData.orderDate ? formatDateTime(orderData.orderDate) : formatDateTime(new Date().toISOString())}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">디너</span>
              <span className="font-medium">{orderData.dinnerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">스타일</span>
              <span className="font-medium">{orderData.style}</span>
            </div>
            {customizationDetails.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">커스터마이징</span>
                <div className="text-right">
                  {customizationDetails.map((detail, idx) => (
                    <div key={idx} className="text-sm font-medium">
                      {detail.icon} {detail.name} {detail.quantityDiff > 0 ? '추가' : '감소'} {Math.abs(detail.quantityDiff)}{detail.unit}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 mb-4">
            {orderData.deliveryDate && (
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">배달 예정일</span>
                <span className="font-bold text-primary">{orderData.deliveryDate}</span>
              </div>
            )}
            {orderData.deliveryAddress && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">배달 주소</span>
                <span className="font-medium text-right max-w-xs">{orderData.deliveryAddress}</span>
              </div>
            )}
          </div>
        </Card>

        {/* 가격 정보 */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold mb-4">결제 내역</h3>

          <div className="space-y-2 mb-4">
            {orderData.basePrice !== null && orderData.basePrice !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">기본 가격</span>
                <span>₩{Number(orderData.basePrice || 0).toLocaleString()}</span>
              </div>
            )}
            {orderData.stylePrice !== null && orderData.stylePrice !== undefined && orderData.stylePrice !== 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">스타일 추가</span>
                <span>₩{Number(orderData.stylePrice).toLocaleString()}</span>
              </div>
            )}
            {(orderData.customizationPrice !== null && orderData.customizationPrice !== undefined && orderData.customizationPrice !== 0) && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">메뉴 커스터마이징 가격</span>
                <span className={orderData.customizationPrice > 0 ? '' : 'text-green-600'}>
                  {orderData.customizationPrice > 0 ? '+' : '-'}₩{Math.abs(Number(orderData.customizationPrice)).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">소계</span>
              <span className="font-medium">₩{Number(orderData.subtotal).toLocaleString()}</span>
            </div>
            {orderData.discountAmount > 0 && orderData.loyaltyTier && (
              <div className="flex justify-between text-sm text-green-600">
                <span>
                  단골 할인 ({orderData.loyaltyTier.toUpperCase()} {orderData.discountRate.toFixed(0)}%)
                </span>
                <span>-₩{Number(orderData.discountAmount).toLocaleString()}</span>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-baseline">
              <span className="text-lg font-bold">최종 결제 금액</span>
              <span className="text-3xl font-bold text-primary">₩{Number(orderData.finalPrice).toLocaleString()}</span>
            </div>
          </div>

          {/* 할인 혜택 강조 */}
          {orderData.discountAmount > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="text-sm font-bold text-green-800">단골 고객님께 특별 할인이 적용되었습니다!</p>
                  <p className="text-xs text-green-700">
                    {Number(orderData.discountAmount).toLocaleString()}원을 절약하셨습니다
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* 액션 버튼 */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            size="lg"
            onClick={() => router.push("/dashboard")}
          >
            <Receipt className="w-4 h-4 mr-2" />
            주문 내역 보기
          </Button>
          <Button className="flex-1" size="lg" onClick={() => router.push("/")}>
            <Home className="w-4 h-4 mr-2" />
            홈으로
          </Button>
        </div>
      </div>
    </div>
  )
}
