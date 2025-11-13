"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, User, MapPin, Calendar, Package, ChevronRight, Award, ShoppingCart, DollarSign } from "lucide-react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { orderService } from "@/lib/services/order.service"
import { menuAPI } from "@/lib/services/menu.service"
import { apiRequest } from "@/lib/api"

export default function StaffOrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuItemMap, setMenuItemMap] = useState({})
  const [groupedOrders, setGroupedOrders] = useState({})
  const [customers, setCustomers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerLoyaltyInfo, setCustomerLoyaltyInfo] = useState(null)
  const [loadingLoyalty, setLoadingLoyalty] = useState(false)

  useEffect(() => {
    loadOrders()
  }, [])

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerLoyaltyInfo(selectedCustomer.userId)
    }
  }, [selectedCustomer])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const ordersData = await orderService.getAllOrders()
      console.log("모든 주문 내역 API 응답:", ordersData)
      
      if (!ordersData || ordersData.length === 0) {
        setOrders([])
        setGroupedOrders({})
        setCustomers([])
        setLoading(false)
        return
      }

      // 주문 데이터 포맷팅
      const formattedOrders = ordersData.map((order) => {
        // 날짜 처리
        let orderDateStr = null
        let deliveryDateStr = null
        
        if (order.orderDate) {
          if (typeof order.orderDate === 'string') {
            orderDateStr = order.orderDate
          } else if (order.orderDate instanceof Date) {
            orderDateStr = order.orderDate.toISOString()
          } else {
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

        // 주문 상태 결정
        let orderStatus = "pending"
        if (order.deliveryStatus === "completed") {
          orderStatus = "delivered"
        } else if (order.deliveryStatus === "in_transit") {
          orderStatus = "delivering"
        } else if (order.cookingStatus === "completed") {
          orderStatus = "cooking_completed"
        } else if (order.cookingStatus === "in_progress") {
          orderStatus = "cooking_started"
        } else if (order.paymentStatus === "completed") {
          orderStatus = "pending"
        }

        // 고객 정보 추출
        const userId = order.userId || null
        const customerName = order.customerName || null
        
        console.log("주문 고객 정보:", { orderId: order.id, userId, customerName })

        return {
          id: order.id,
          userId: userId,
          customerName: customerName,
          dinner_name: order.dinnerName || order.orderItems?.dinner_name || "알 수 없음",
          dinner_style: order.styleName || order.orderItems?.style_name || "알 수 없음",
          created_at: orderDateStr,
          delivery_date: deliveryDateStr,
          delivery_address: order.deliveryAddress || order.delivery_address || "",
          total_price: finalPriceValue || totalPriceValue,
          original_price: totalPriceValue,
          discount_applied: discountValue,
          status: orderStatus,
          customizations: order.orderItems?.customizations || {},
        }
      })

      // 고객별로 그룹화
      const grouped = {}
      formattedOrders.forEach(order => {
        const key = order.userId
        if (!key || key === "알 수 없음") {
          console.warn("userId가 없거나 알 수 없음:", order)
          return // userId가 없으면 건너뛰기
        }
        if (!grouped[key]) {
          grouped[key] = {
            userId: order.userId,
            customerName: order.customerName || "알 수 없음",
            orders: []
          }
        }
        grouped[key].orders.push(order)
      })

      console.log("그룹화된 고객:", grouped)
      console.log("고객 수:", Object.keys(grouped).length)

      // 고객 리스트 생성 (총 주문 금액 계산)
      const customerList = Object.values(grouped).map(customer => {
        const totalAmount = customer.orders.reduce((sum, order) => sum + (order.total_price || 0), 0)
        return {
          ...customer,
          totalAmount,
        }
      }).sort((a, b) => b.totalAmount - a.totalAmount) // 총 주문 금액 순으로 정렬

      console.log("고객 리스트:", customerList)

      setOrders(formattedOrders)
      setGroupedOrders(grouped)
      setCustomers(customerList)

      // 메뉴 항목 이름 로드
      const loadMenuItemNames = async () => {
        const itemMap = {}
        const uniqueDinners = [...new Set(formattedOrders.map(o => o.dinner_name))]
        
        for (const dinnerName of uniqueDinners) {
          try {
            const menuItems = await menuAPI.getMenuItemsByDinnerId(dinnerName)
            if (menuItems && menuItems.length > 0) {
              menuItems.forEach(item => {
                itemMap[item.id] = item.name
              })
            }
          } catch (error) {
            console.error(`메뉴 항목 로드 실패 (${dinnerName}):`, error)
          }
        }
        
        setMenuItemMap(itemMap)
      }
      
      loadMenuItemNames()
    } catch (error) {
      console.error("주문 내역 조회 실패:", error)
      setOrders([])
      setGroupedOrders({})
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerLoyaltyInfo = async (userId) => {
    try {
      setLoadingLoyalty(true)
      const loyaltyInfo = await apiRequest(`/api/users/${userId}/loyalty`, {
        method: 'GET',
      })
      setCustomerLoyaltyInfo(loyaltyInfo)
    } catch (error) {
      console.error("고객 등급 정보 조회 실패:", error)
      setCustomerLoyaltyInfo(null)
    } finally {
      setLoadingLoyalty(false)
    }
  }

  const getTierName = (tier) => {
    const tierMap = {
      bronze: "브론즈",
      silver: "실버",
      gold: "골드",
      platinum: "플래티넘",
    }
    return tierMap[tier?.toLowerCase()] || tier || "알 수 없음"
  }

  const getTierColor = (tier) => {
    const colorMap = {
      bronze: "text-amber-600 bg-amber-50",
      silver: "text-gray-600 bg-gray-50",
      gold: "text-yellow-600 bg-yellow-50",
      platinum: "text-purple-600 bg-purple-50",
    }
    return colorMap[tier?.toLowerCase()] || "text-gray-600 bg-gray-50"
  }

  const getStatusText = (status) => {
    const statusMap = {
      pending: "결제 대기",
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
      cooking_started: "text-orange-600 bg-orange-50",
      cooking_completed: "text-orange-600 bg-orange-50",
      delivering: "text-purple-600 bg-purple-50",
      delivered: "text-green-600 bg-green-50",
      cancelled: "text-red-600 bg-red-50",
    }
    return colorMap[status] || "text-gray-600 bg-gray-50"
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "알 수 없음"
    try {
      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    } catch (e) {
      return "알 수 없음"
    }
  }

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer)
  }

  const handleBackToList = () => {
    setSelectedCustomer(null)
    setCustomerLoyaltyInfo(null)
  }

  return (
    <ProtectedRoute requiredRole="staff">
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <Button variant="ghost" className="mb-6" onClick={() => router.push("/staff")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>
          <h1 className="text-3xl font-bold mb-2">고객별 주문 내역</h1>
          <p className="text-muted-foreground mb-8">모든 고객의 주문 내역을 확인할 수 있습니다</p>

          {loading ? (
            <Card className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">주문 내역을 불러오는 중...</p>
            </Card>
          ) : selectedCustomer ? (
            // 고객 상세 보기
            <div className="space-y-6">
              <Button variant="ghost" onClick={handleBackToList}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                고객 목록으로
              </Button>

              {/* 고객 정보 카드 */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-6 border-b">
                  <User className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-bold">{selectedCustomer.customerName || "알 수 없음"}</h2>
                </div>

                {loadingLoyalty ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">고객 정보를 불러오는 중...</p>
                  </div>
                ) : customerLoyaltyInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="p-4 bg-secondary/30">
                      <div className="flex items-center gap-3 mb-2">
                        <Award className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">등급</span>
                      </div>
                      <Badge className={`${getTierColor(customerLoyaltyInfo.tier)} text-base px-3 py-1`}>
                        {getTierName(customerLoyaltyInfo.tier)}
                      </Badge>
                    </Card>
                    <Card className="p-4 bg-secondary/30">
                      <div className="flex items-center gap-3 mb-2">
                        <ShoppingCart className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">총 주문 횟수</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {Number(customerLoyaltyInfo.totalOrders || 0).toLocaleString()}회
                      </p>
                    </Card>
                    <Card className="p-4 bg-secondary/30">
                      <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium text-muted-foreground">총 주문 금액</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">
                        ₩{Number(customerLoyaltyInfo.totalSpent || 0).toLocaleString()}
                      </p>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">고객 정보를 불러올 수 없습니다</p>
                  </div>
                )}

                {/* 주문 내역 */}
                <div className="mt-6">
                  <h3 className="text-lg font-bold mb-4">주문 내역 ({selectedCustomer.orders.length}건)</h3>
                  <div className="space-y-4">
                    {selectedCustomer.orders.map((order) => (
                      <Card key={order.id} className="p-4 bg-secondary/30">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">
                              {order.dinner_name} ({order.dinner_style})
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                주문: {formatTimestamp(order.created_at)}
                              </span>
                              {order.delivery_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  배달: {formatTimestamp(order.delivery_date)}
                                </span>
                              )}
                              {order.delivery_address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {order.delivery_address}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 md:mt-0 flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </div>
                        </div>

                        {order.customizations && Object.keys(order.customizations).length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm font-medium mb-1">커스터마이징:</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(order.customizations).map(([itemId, qty]) => (
                                <Badge key={itemId} variant="outline" className="text-xs">
                                  {menuItemMap[itemId] || itemId}: {qty}개
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center pt-3 border-t">
                          <div className="text-sm">
                            {order.original_price > 0 && order.original_price !== order.total_price && (
                              <span className="line-through text-muted-foreground mr-2">
                                ₩{Number(order.original_price || 0).toLocaleString()}
                              </span>
                            )}
                            {order.discount_applied > 0 && (
                              <span className="text-green-600 mr-2">
                                -₩{Number(order.discount_applied || 0).toLocaleString()}
                              </span>
                            )}
                            <span className="font-bold text-lg text-primary">
                              ₩{Number(order.total_price || 0).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            주문번호: {order.id.substring(0, 8)}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          ) : customers.length === 0 ? (
            <Card className="p-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">주문 내역이 없습니다</p>
            </Card>
          ) : (
            // 고객 리스트
            <div className="space-y-3">
              {customers.map((customer) => (
                <Card
                  key={customer.userId}
                  className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                  onClick={() => handleCustomerClick(customer)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <User className="w-5 h-5 text-primary" />
                      <div>
                        <h3 className="text-lg font-semibold">{customer.customerName || "알 수 없음"}</h3>
                        <p className="text-sm text-muted-foreground">
                          주문 {customer.orders.length}건 · 총 ₩{Number(customer.totalAmount || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
