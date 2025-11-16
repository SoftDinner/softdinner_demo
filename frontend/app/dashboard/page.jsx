"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShoppingBag, ChevronRight, Package, Loader2 } from "lucide-react"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import LoyaltyCard from "@/components/common/loyalty-card"
import { useAuth } from "@/context/AuthContext"
import { orderService } from "@/lib/services/order.service"
import { apiRequest } from "@/lib/api"
import { menuAPI } from "@/lib/services/menu.service"

export default function DashboardPage() {
  const router = useRouter()
  const { user, role, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [reordering, setReordering] = useState(null)
  const [loyaltyInfo, setLoyaltyInfo] = useState(null)
  const [menuItemMap, setMenuItemMap] = useState({}) // 메뉴 항목 ID -> 이름 매핑
  const [dinnerMap, setDinnerMap] = useState({}) // 디너 이름 -> 디너 정보 매핑
  const [styleMap, setStyleMap] = useState({}) // 스타일 이름 -> 스타일 정보 매핑

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
      loadOrders()
      loadLoyaltyInfo()
    }
  }, [user, role, authLoading, router])
  
  const loadLoyaltyInfo = async () => {
    try {
      const info = await apiRequest('/api/users/loyalty', {
        method: 'GET',
      })
      setLoyaltyInfo(info)
    } catch (error) {
      console.error('단골 정보 조회 실패:', error)
      // 실패해도 계속 진행 (기본값 사용)
    }
  }

  const loadOrders = async () => {
    try {
      setLoading(true)
      const ordersData = await orderService.getUserOrders()
      console.log("주문 내역 API 응답:", ordersData)
      console.log("주문 내역 개수:", ordersData?.length || 0)
      
      if (!ordersData || ordersData.length === 0) {
        console.warn("주문 내역이 없습니다")
        setOrders([])
        setLoading(false)
        return
      }
      
      // API 응답을 기존 형식에 맞게 변환
      const formattedOrders = ordersData.map((order) => {
        // 날짜 처리: LocalDateTime이 문자열로 오거나 객체로 올 수 있음
        let orderDateStr = null
        let deliveryDateStr = null
        
        if (order.orderDate) {
          if (typeof order.orderDate === 'string') {
            orderDateStr = order.orderDate
          } else if (order.orderDate instanceof Date) {
            orderDateStr = order.orderDate.toISOString()
          } else {
            // 배열 형식 [년, 월, 일, 시, 분, 초]일 수 있음
            try {
              orderDateStr = new Date(order.orderDate).toISOString()
            } catch (e) {
              console.warn("주문일 변환 실패:", order.orderDate)
            }
          }
        }
        
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
        
        // finalPrice 파싱 (BigDecimal 객체일 수 있음)
        let finalPriceValue = 0
        if (order.finalPrice !== null && order.finalPrice !== undefined) {
          if (typeof order.finalPrice === 'number') {
            finalPriceValue = order.finalPrice
          } else if (typeof order.finalPrice === 'string') {
            finalPriceValue = Number(order.finalPrice) || 0
          } else if (order.finalPrice && typeof order.finalPrice === 'object') {
            // BigDecimal 객체인 경우 (Java에서 온 경우)
            // { value: "123.45", scale: 2 } 형식이거나 직접 숫자로 변환 가능한 경우
            if (order.finalPrice.value !== undefined) {
              finalPriceValue = Number(order.finalPrice.value) || 0
            } else {
              // 객체를 문자열로 변환 후 파싱
              const priceStr = String(order.finalPrice)
              finalPriceValue = Number(priceStr) || 0
            }
          }
        }
        
        // 할인 정보도 함께 저장
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
        
        // 원래 총액 (할인 전)
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
        
        console.log(`주문 ${order.id} 가격 정보:`, {
          totalPrice: totalPriceValue,
          discountApplied: discountValue,
          finalPrice: finalPriceValue,
          rawFinalPrice: order.finalPrice
        })
        
        // 주문 상태 결정 (우선순위: 배달 완료 > 배달 시작 > 요리 완료 > 요리 시작 > 결제 대기)
        let orderStatus = "pending" // 기본값: 결제 대기
        if (order.deliveryStatus === "completed") {
          orderStatus = "delivered" // 배달 완료
        } else if (order.deliveryStatus === "in_transit") {
          orderStatus = "delivering" // 배달 시작
        } else if (order.cookingStatus === "completed") {
          orderStatus = "cooking_completed" // 요리 완료
        } else if (order.cookingStatus === "in_progress") {
          orderStatus = "cooking_started" // 요리 시작
        } else if (order.paymentStatus === "completed") {
          orderStatus = "pending" // 결제 완료되었지만 아직 요리 시작 전
        }
        
        // 커스터마이징 가격 계산을 위해 필요한 정보 저장
        const customizations = order.orderItems?.customizations || {}
        
        return {
          id: order.id,
          dinner_name: order.dinnerName || order.orderItems?.dinner_name || "알 수 없음",
          dinner_style: order.styleName || order.orderItems?.style_name || "알 수 없음",
          dinner_style_id: order.orderItems?.style_id || null, // 스타일 UUID (재주문 시 사용)
          created_at: orderDateStr,
          delivery_date: deliveryDateStr,
          total_price: finalPriceValue || totalPriceValue, // 할인 및 커스터마이징이 반영된 최종 가격 (없으면 원래 가격)
          original_price: totalPriceValue, // 할인 전 총액
          discount_applied: discountValue, // 할인 금액
          status: orderStatus,
          customizations: customizations,
          // 가격 계산을 위한 추가 정보
          orderItems: order.orderItems,
        }
      })
      
      console.log("변환된 주문 내역:", formattedOrders)
      setOrders(formattedOrders)
      
      // 각 주문의 디너에 대한 메뉴 항목, 디너 정보, 스타일 정보를 로드
      const loadMenuItemNames = async () => {
        const itemMap = {}
        const dinnerInfoMap = {}
        const styleInfoMap = {}
        const uniqueDinners = [...new Set(formattedOrders.map(o => o.dinner_name))]
        const uniqueStyles = [...new Set(formattedOrders.map(o => o.dinner_style).filter(Boolean))]
        
        // 디너 정보 로드
        for (const dinnerName of uniqueDinners) {
          try {
            const dinnerData = await menuAPI.getDinnerById(dinnerName)
            if (dinnerData) {
              dinnerInfoMap[dinnerName] = {
                basePrice: Number(dinnerData.basePrice || 0),
              }
            }
          } catch (error) {
            console.error(`디너 정보 로드 실패 (${dinnerName}):`, error)
          }
        }
        
        // 스타일 정보 로드
        try {
          const stylesData = await menuAPI.getAllStyles()
          if (stylesData && Array.isArray(stylesData)) {
            stylesData.forEach(style => {
              styleInfoMap[style.name] = {
                priceModifier: Number(style.priceModifier || 0),
              }
              // ID로도 매핑 (스타일 ID가 있는 경우)
              if (style.id) {
                styleInfoMap[style.id] = {
                  priceModifier: Number(style.priceModifier || 0),
                }
              }
            })
          }
        } catch (error) {
          console.error(`스타일 정보 로드 실패:`, error)
        }
        
        // 메뉴 항목 로드
        for (const dinnerName of uniqueDinners) {
          try {
            const menuItems = await menuAPI.getMenuItemsByDinnerId(dinnerName)
            if (menuItems && menuItems.length > 0) {
              menuItems.forEach(item => {
                itemMap[item.id] = {
                  name: item.name,
                  pricePerUnit: item.additionalPrice || item.pricePerUnit || 0,
                  defaultQuantity: item.defaultQuantity ?? 0,
                }
              })
            }
          } catch (error) {
            console.error(`메뉴 항목 로드 실패 (${dinnerName}):`, error)
          }
        }
        
        setMenuItemMap(itemMap)
        setDinnerMap(dinnerInfoMap)
        setStyleMap(styleInfoMap)
      }
      
      loadMenuItemNames()
    } catch (error) {
      console.error("주문 내역 조회 실패:", error)
      console.error("에러 상세:", error.message, error.stack)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleReorder = async (order) => {
    setReordering(order.id)

    // 재주문: 커스터마이징 정보를 체크아웃 페이지로 전달
    console.log("[v0] 재주문:", order)

    // 디너 이름을 키로 변환 (예: "French Dinner" -> "french")
    const dinnerKey = order.dinner_name.toLowerCase().replace(/\s+/g, '').replace('dinner', '')
    const dinnerId = dinnerKey === 'french' ? 'french' : 
                     dinnerKey === 'english' ? 'english' : 
                     dinnerKey === 'valentine' ? 'valentine' : 
                     dinnerKey === 'champagne' ? 'champagne' : order.dinner_name
    
    // 스타일 ID 우선 사용 (없으면 이름 사용)
    const styleId = order.dinner_style_id || order.dinner_style
    
    // 잠시 로딩 표시 후 커스터마이징 페이지로 이동
    setTimeout(() => {
      router.push(`/order/customize?dinner=${dinnerId}&style=${styleId}&reorder=${order.id}`)
    }, 500)
  }

  const getStatusText = (status) => {
    const statusMap = {
      pending: "결제 대기",
      confirmed: "주문 확인",
      cooking_started: "요리 시작",
      cooking_completed: "요리 완료",
      delivering: "배달 시작",
      delivered: "배달 완료",
      cancelled: "취소됨",
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status) => {
    const colorMap = {
      pending: "text-yellow-600 bg-yellow-50",
      confirmed: "text-blue-600 bg-blue-50",
      cooking_started: "text-orange-600 bg-orange-50",
      cooking_completed: "text-orange-600 bg-orange-50",
      delivering: "text-purple-600 bg-purple-50",
      delivered: "text-green-600 bg-green-50",
      cancelled: "text-red-600 bg-red-50",
    }
    return colorMap[status] || "text-gray-600 bg-gray-50"
  }

  if (loading) {
    return (
      <>
        <Header user={user} role="customer" />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    )
  }

  return (
    <>
      <Header user={user} role="customer" />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-serif font-bold text-foreground mb-2">내 대시보드</h1>
            <p className="text-muted-foreground">주문 내역을 확인하고 새로운 디너를 주문하세요</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <LoyaltyCard 
                tier={loyaltyInfo?.tier || user?.loyaltyTier || user?.loyalty_tier || 'bronze'} 
                totalOrders={loyaltyInfo?.totalOrders || user?.totalOrders || user?.total_orders || 0}
                totalSpent={loyaltyInfo?.totalSpent || user?.totalSpent || user?.total_spent || 0}
                discountRate={loyaltyInfo?.discountRate || 0}
                nextTier={loyaltyInfo?.nextTier}
              />
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 flex flex-col justify-center items-center text-center">
              <ShoppingBag className="w-12 h-12 text-primary mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">새로운 디너 주문</h3>
              <p className="text-sm text-muted-foreground mb-4">특별한 날을 위한 프리미엄 디너</p>
              <Button asChild className="w-full">
                <Link href="/dinners">
                  디너 메뉴 보기
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-4">주문 내역</h2>
          </div>

          {orders.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">아직 주문 내역이 없습니다</h3>
              <p className="text-muted-foreground mb-6">첫 디너를 주문해보세요!</p>
              <Button asChild>
                <Link href="/dinners">디너 메뉴 보기</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-card rounded-lg border border-border overflow-hidden">
                  <div className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-1">
                          {order.dinner_name} ({order.dinner_style})
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          주문일: {order.created_at ? new Date(order.created_at).toLocaleDateString("ko-KR") : "알 수 없음"} | 배달일:{" "}
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString("ko-KR") : "알 수 없음"}
                        </p>
                      </div>
                      <div className="mt-3 md:mt-0 flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>

                    {order.customizations && Object.keys(order.customizations).length > 0 && (
                      <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">커스터마이징</h4>
                        <div className="space-y-1">
                          {Object.entries(order.customizations).map(([itemId, qty]) => {
                            const itemInfo = menuItemMap[itemId]
                            const itemName = itemInfo && typeof itemInfo === 'object' ? itemInfo.name : (itemInfo || itemId)
                            return (
                              <div key={itemId} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {itemName} x {qty}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="w-full">
                        <div className="bg-secondary/30 rounded-lg p-4 mb-2">
                          <div className="space-y-2 text-sm">
                            {(() => {
                              // 가격 계산
                              let basePrice = 0
                              let stylePrice = 0
                              let customizationPrice = 0
                              
                              // 디너 기본 가격 가져오기 (API에서 로드한 정보 사용)
                              const dinnerName = order.dinner_name
                              if (dinnerName && dinnerMap[dinnerName]) {
                                basePrice = dinnerMap[dinnerName].basePrice || 0
                              } else {
                                // API에서 로드되지 않은 경우 fallback으로 original_price 사용
                                basePrice = order.original_price || 0
                              }
                              
                              // 스타일 가격 계산 (API에서 로드한 정보 사용)
                              const styleName = order.dinner_style
                              const styleId = order.dinner_style_id
                              if (styleName || styleId) {
                                // 스타일 이름 또는 ID로 매핑 찾기
                                const styleInfo = styleMap[styleName] || styleMap[styleId]
                                if (styleInfo && styleInfo.priceModifier) {
                                  stylePrice = styleInfo.priceModifier
                                }
                              }
                              
                              // 커스터마이징 가격 계산
                              if (order.customizations && Object.keys(order.customizations).length > 0) {
                                Object.entries(order.customizations).forEach(([itemId, qty]) => {
                                  const itemInfo = menuItemMap[itemId]
                                  if (itemInfo && typeof itemInfo === 'object' && itemInfo.pricePerUnit) {
                                    const defaultQty = itemInfo.defaultQuantity ?? 0
                                    const quantityDiff = Number(qty) - defaultQty
                                    if (quantityDiff !== 0 && itemInfo.pricePerUnit) {
                                      customizationPrice += quantityDiff * Number(itemInfo.pricePerUnit)
                                    }
                                  }
                                })
                              }
                              
                              const subtotal = basePrice + stylePrice + customizationPrice
                              
                              return (
                                <>
                                  {basePrice > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">기본 가격</span>
                                      <span>₩{Number(basePrice).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {stylePrice > 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">스타일 추가</span>
                                      <span>₩{Number(stylePrice).toLocaleString()}</span>
                                    </div>
                                  )}
                                  {customizationPrice !== 0 && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">메뉴 커스터마이징 가격</span>
                                      <span className={customizationPrice > 0 ? '' : 'text-green-600'}>
                                        {customizationPrice > 0 ? '+' : '-'}₩{Math.abs(Number(customizationPrice)).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex justify-between pt-2 border-t">
                                    <span className="text-muted-foreground">소계</span>
                                    <span className="font-medium">₩{Number(subtotal).toLocaleString()}</span>
                                  </div>
                                  {order.discount_applied > 0 && (
                                    <div className="flex justify-between text-green-600">
                                      <span>단골 할인 ({order.orderItems?.loyalty_tier?.toUpperCase() || ''} {order.orderItems?.discount_rate ? (Number(order.orderItems.discount_rate) * 100).toFixed(0) : ''}%)</span>
                                      <span>-₩{Number(order.discount_applied || 0).toLocaleString()}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between pt-2 border-t font-bold text-lg">
                                    <span>최종 결제 금액</span>
                                    <span className="text-primary">₩{Number(order.total_price || 0).toLocaleString()}</span>
                                  </div>
                                </>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleReorder(order)} disabled={reordering === order.id}>
                          {reordering === order.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              처리중...
                            </>
                          ) : (
                            <>똑같이 재주문</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
