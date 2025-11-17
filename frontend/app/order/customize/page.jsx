"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, X, Loader2 } from "lucide-react"
import useOrderStore from "@/store/orderStore"
import { menuAPI } from "@/lib/services/menu.service"
import { orderService } from "@/lib/services/order.service"


// 하드코딩된 MENU_ITEMS 제거 - 모든 데이터는 API에서 가져옵니다

export default function CustomizePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dinnerId = searchParams.get("dinner")
  const styleId = searchParams.get("style")
  const reorderId = searchParams.get("reorder")

  // Zustand store 사용
  const {
    customizations,
    totalPrice,
    updateCustomization,
    removeCustomization,
    initializeCustomizations,
  } = useOrderStore()

  // 로컬 계산용 totalPrice (Zustand와 별도로 계산)
  const [localTotalPrice, setLocalTotalPrice] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const loadingRef = useRef(false) // 중복 API 호출 방지

  useEffect(() => {
    let isMounted = true
    
    const loadMenuItems = async () => {
      if (!dinnerId) {
        if (isMounted) {
          setLoading(false)
          setItems([])
        }
        return
      }

      // 이미 로딩 중이면 중복 호출 방지
      if (loadingRef.current) {
        console.log("이미 메뉴 항목을 로딩 중입니다. 중복 호출을 방지합니다.")
        return
      }

      try {
        loadingRef.current = true
        if (isMounted) {
          setLoading(true)
          setItems([]) // 기존 items 초기화
        }
        
        // API에서 메뉴 항목 조회
        console.log("🔍 메뉴 항목 조회 시작 - dinnerId:", dinnerId)
        const menuItems = await menuAPI.getMenuItemsByDinnerId(dinnerId)
        
        if (!isMounted) return
        
        // API 응답이 있고 비어있지 않으면 사용
        if (menuItems && menuItems.length > 0) {
          console.log("📦 API에서 받은 메뉴 항목 수:", menuItems.length)
          console.log("📦 API 응답 전체:", JSON.stringify(menuItems, null, 2))
          
          // 중복 ID 확인
          const ids = menuItems.map(item => item?.id).filter(Boolean)
          const uniqueIds = [...new Set(ids)]
          if (ids.length !== uniqueIds.length) {
            console.error("⚠️ API 응답에 중복된 ID가 있습니다!", {
              총개수: ids.length,
              고유개수: uniqueIds.length,
              중복ID: ids.filter((id, index) => ids.indexOf(id) !== index)
            })
          }
          
          // 1단계: API 응답에서 id 기준으로 중복 제거
          const itemMap = new Map()
          const seenIds = new Set()
          
          menuItems.forEach((item) => {
            if (item && item.id) {
              // id가 이미 본 적이 있으면 스킵
              if (seenIds.has(item.id)) {
                console.warn("중복된 메뉴 항목 발견 (API 응답):", item.id, item.name)
                return
              }
              seenIds.add(item.id)
              itemMap.set(item.id, item)
            }
          })
          
          const uniqueMenuItems = Array.from(itemMap.values())
          console.log("1단계 중복 제거 후 메뉴 항목 수:", uniqueMenuItems.length)
          
          // 2단계: DB 응답을 프론트엔드 형식으로 변환하면서 중복 확인
          const formattedItemMap = new Map()
          uniqueMenuItems.forEach((item) => {
            if (item && item.id && !formattedItemMap.has(item.id)) {
              formattedItemMap.set(item.id, {
                id: item.id,
                name: item.name,
                unit: item.unit,
                defaultQuantity: item.defaultQuantity ?? 0, // 0도 유효한 값이므로 ?? 사용
                pricePerUnit: item.additionalPrice ?? 0,
                minQuantity: item.minQuantity ?? 0,
                maxQuantity: item.maxQuantity ?? 999,
                isRequired: item.isRequired ?? false,
                canRemove: item.canRemove !== false, // 기본값 true
                canIncrease: item.canIncrease !== false, // 기본값 true
                canDecrease: item.canDecrease !== false, // 기본값 true
              })
            } else if (item && item.id && formattedItemMap.has(item.id)) {
              console.warn("중복된 메뉴 항목 발견 (포맷팅 중):", item.id, item.name)
            }
          })
          
          const finalItems = Array.from(formattedItemMap.values())
          console.log("최종 메뉴 항목 수 (중복 제거 완료):", finalItems.length)
          
          if (isMounted) {
            setItems(finalItems)
          }
          
          // 재주문인 경우 이전 주문의 커스터마이징 복원
          if (reorderId && finalItems.length > 0) {
            try {
              const orders = await orderService.getUserOrders()
              const previousOrder = orders.find(o => o.id === reorderId)
              
              if (previousOrder && previousOrder.orderItems?.customizations) {
                // 이전 주문의 커스터마이징을 복원
                const previousCustomizations = previousOrder.orderItems.customizations
                
                // 먼저 기본값으로 초기화
                if (isMounted) {
                  initializeCustomizations(finalItems)
                }
                
                // 이전 커스터마이징 복원 (0개도 포함)
                Object.entries(previousCustomizations).forEach(([itemId, qty]) => {
                  const item = finalItems.find(i => i.id === itemId)
                  if (item && isMounted) {
                    // 수량이 최소/최대 범위 내인지 확인 (0도 허용)
                    const validQty = qty === 0 ? 0 : Math.max(item.minQuantity, Math.min(item.maxQuantity, qty))
                    updateCustomization(itemId, { quantity: validQty })
                  }
                })
              } else {
                // 재주문 데이터가 없으면 기본값으로 초기화
                if (isMounted) {
                  initializeCustomizations(finalItems)
                }
              }
            } catch (error) {
              console.error("재주문 데이터 로드 실패:", error)
              // 실패 시 기본값으로 초기화
              if (isMounted) {
                initializeCustomizations(finalItems)
              }
            }
          } else {
            // 일반 주문인 경우 기본값으로 초기화
            if (finalItems.length > 0 && isMounted) {
              initializeCustomizations(finalItems)
            }
          }
        } else {
          // API 응답이 비어있으면 에러 표시
          if (isMounted) {
            console.error("API에서 메뉴 항목이 비어있습니다.")
            setItems([])
          }
        }
      } catch (error) {
        console.error("메뉴 항목 조회 실패:", error)
        // 에러 발생 시 빈 배열로 설정
        if (isMounted) {
          setItems([])
        }
      } finally {
        loadingRef.current = false
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    // dinnerId가 변경될 때만 실행 (reorderId는 재주문 데이터 복원에만 사용)
    if (dinnerId) {
      loadMenuItems()
    }
    
    return () => {
      isMounted = false
      loadingRef.current = false // cleanup 시 로딩 상태 초기화
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dinnerId]) // reorderId는 의존성에서 제거 (재주문 데이터는 loadMenuItems 내부에서 처리)
  
  // 중복 방지: useMemo를 사용하여 id 기준으로 확실하게 중복 제거 (메모이제이션)
  const uniqueItems = useMemo(() => {
    const uniqueItemsMap = new Map()
    items.forEach((item) => {
      if (item && item.id && !uniqueItemsMap.has(item.id)) {
        uniqueItemsMap.set(item.id, item)
      }
    })
    return Array.from(uniqueItemsMap.values())
  }, [items])

  useEffect(() => {
    // 로컬 가격 계산 (기본 수량 제외, 추가/감소분 반영)
    let total = 0
    uniqueItems.forEach((item) => {
      // 기본 수량이 설정되지 않았으면 defaultQuantity 사용
      const currentQty = customizations[item.id] !== undefined 
        ? customizations[item.id] 
        : (item.defaultQuantity ?? 0)
      const defaultQty = item.defaultQuantity ?? 0
      // 기본 수량과의 차이를 가격에 반영 (추가분은 더하고, 감소분은 빼기)
      const quantityDiff = currentQty - defaultQty
      total += quantityDiff * item.pricePerUnit
    })
    setLocalTotalPrice(total)
  }, [customizations, uniqueItems])

  const handleIncrease = (itemId) => {
    const item = uniqueItems.find((i) => i.id === itemId)
    if (!item) return

    // can_increase가 false이면 증가 불가
    if (item.canIncrease === false) {
      return
    }

    const current = customizations[itemId] || 0
    if (current < item.maxQuantity) {
      updateCustomization(itemId, { quantity: current + 1 })
    }
  }

  const handleDecrease = (itemId) => {
    const item = uniqueItems.find((i) => i.id === itemId)
    if (!item) return

    // can_decrease가 false이면 감소 불가
    if (item.canDecrease === false) {
      return
    }

    const current = customizations[itemId] || 0
    if (current > item.minQuantity) {
      updateCustomization(itemId, { quantity: current - 1 })
    }
  }

  const handleRemove = (itemId) => {
    const item = uniqueItems.find((i) => i.id === itemId)
    if (!item) return
    
    // 제약 조건 확인: is_required가 true이면 삭제 불가
    if (item.isRequired) {
      alert(`${item.name}은(는) 필수 항목입니다. 삭제할 수 없습니다.`)
      return
    }
    
    // can_remove가 false이면 삭제 불가
    if (item.canRemove === false) {
      alert(`${item.name}은(는) 삭제할 수 없습니다.`)
      return
    }
    
    // min_quantity가 0이면 0개로 설정, 아니면 완전히 삭제
    if (item.minQuantity === 0) {
      updateCustomization(itemId, { quantity: 0 })
    } else {
      removeCustomization(itemId)
    }
  }

  const handleNext = () => {
    // 커스터마이징 정보 확인
    console.log("✅ 커스터마이징 페이지 - 다음 버튼 클릭:", {
      dinnerId,
      styleId,
      customizations,
      customizationsCount: Object.keys(customizations || {}).length
    })
    
    // 주문 폼으로 이동
    router.push(`/order/checkout?dinner=${dinnerId}&style=${styleId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <Button variant="ghost" className="mb-6" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>

        <h1 className="text-3xl font-bold mb-2">메뉴 커스터마이징</h1>
        <p className="text-muted-foreground mb-8">
          메뉴를 자유롭게 추가하거나 삭제할 수 있습니다. 수량을 조절하면 가격이 자동으로 계산됩니다.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 왼쪽: 커스터마이징 */}
          <div className="lg:col-span-2 space-y-4">
            {uniqueItems.length === 0 && !loading ? (
              <Card className="p-6">
                <p className="text-muted-foreground text-center">메뉴 항목이 없습니다.</p>
              </Card>
            ) : (
              uniqueItems.map((item) => {
              // 기본 수량이 설정되지 않았으면 defaultQuantity 사용
              const currentQty = customizations[item.id] !== undefined 
                ? customizations[item.id] 
                : (item.defaultQuantity || 0)

              return (
                <Card key={item.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* 아이템 정보 */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold">{item.name}</h3>
                          {currentQty === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              제거됨
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-primary">
                          {item.unit}당 ₩{item.pricePerUnit.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          기본 {item.defaultQuantity}
                          {item.unit} • 최대 {item.maxQuantity}
                          {item.unit}
                        </p>
                      </div>
                    </div>

                    {/* 컨트롤 */}
                    <div className="flex items-center gap-2">
                      {/* 감소 버튼 */}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleDecrease(item.id)}
                        disabled={currentQty <= item.minQuantity || item.canDecrease === false}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>

                      {/* 수량 표시 */}
                      <div className="w-16 text-center">
                        <span className="text-xl font-bold">{currentQty}</span>
                        <span className="text-sm text-muted-foreground ml-1">{item.unit}</span>
                      </div>

                      {/* 증가 버튼 */}
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleIncrease(item.id)}
                        disabled={currentQty >= item.maxQuantity || item.canIncrease === false}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>

                      {/* 삭제 버튼 (필수 항목이 아니고 can_remove가 true일 때만 표시) */}
                      {(!item.isRequired && item.canRemove !== false) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleRemove(item.id)}
                          disabled={currentQty === 0}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                      {/* 필수 항목 표시 */}
                      {item.isRequired && (
                        <Badge variant="outline" className="text-xs">
                          필수
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* 항목별 추가/감소 가격 표시 (기본 수량 제외) */}
                  {currentQty !== item.defaultQuantity && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          기본 {item.defaultQuantity}{item.unit} 포함, {currentQty > item.defaultQuantity ? '추가' : '감소'} {Math.abs(currentQty - item.defaultQuantity)}
                          {item.unit} × ₩{item.pricePerUnit.toLocaleString()}
                        </span>
                        <span className={`font-bold text-lg ${currentQty > item.defaultQuantity ? 'text-primary' : 'text-green-600'}`}>
                          {currentQty > item.defaultQuantity ? '+' : ''}₩{((currentQty - item.defaultQuantity) * item.pricePerUnit).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              )
            }))}
          </div>

          {/* 오른쪽: 주문 요약 */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <h3 className="text-xl font-bold mb-4">주문 요약</h3>

              <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
                {uniqueItems.map((item) => {
                  // 기본 수량이 설정되지 않았으면 defaultQuantity 사용
                  const currentQty = customizations[item.id] !== undefined 
                    ? customizations[item.id] 
                    : (item.defaultQuantity || 0)
                  const defaultQty = item.defaultQuantity || 0
                  const quantityDiff = currentQty - defaultQty
                  
                  // 기본 수량과 다른 경우만 표시
                  if (quantityDiff === 0) return null

                  return (
                    <div key={item.id} className="flex justify-between text-sm gap-2">
                      <span className="text-muted-foreground">
                        {item.name} {quantityDiff > 0 ? '추가' : '감소'} {Math.abs(quantityDiff)}
                        {item.unit}
                      </span>
                      <span className={`font-medium whitespace-nowrap ${quantityDiff > 0 ? 'text-primary' : 'text-green-600'}`}>
                        {quantityDiff > 0 ? '+' : ''}₩{(quantityDiff * item.pricePerUnit).toLocaleString()}
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold">추가 가격</span>
                  <span className="text-2xl font-bold text-primary">₩{localTotalPrice.toLocaleString()}</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleNext}>
                다음: 배달 정보 입력
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                * 단골 등급에 따른 할인은 결제 단계에서 적용됩니다
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
