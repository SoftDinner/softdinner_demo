"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, ChefHat, Truck, LogOut, ArrowLeft, ShoppingBag } from "lucide-react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/context/AuthContext"
import { apiRequest } from "@/lib/api"

export default function StaffDashboardPage() {
  const router = useRouter()
  const { signOut } = useAuth()
  const [recentActivities, setRecentActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecentActivities()
  }, [])

  const loadRecentActivities = async () => {
    try {
      setLoading(true)
      // 최근 활동 조회 (재료 입출고, 요리 작업, 배달 작업)
      const [ingredientLogs, cookingTasks, deliveryTasks] = await Promise.all([
        apiRequest('/api/ingredients/logs?limit=20').catch(() => []),
        apiRequest('/api/cooking-tasks').catch(() => []),
        apiRequest('/api/delivery-tasks').catch(() => []),
      ])

      const activities = []
      
      // 재료 입출고 기록 (입고만 표시)
      if (ingredientLogs && Array.isArray(ingredientLogs)) {
        ingredientLogs
          .filter(log => log.action === 'in') // 입고만 필터링
          .forEach(log => {
            // timestamp 정규화 (여러 필드명 확인)
            const timestamp = log.createdAt || log.created_at || log.timestamp
            activities.push({
              type: 'ingredient',
              message: `${log.ingredientName || '재료'} ${Number(log.quantity).toLocaleString()}${log.ingredientUnit || ''} 입고 완료`,
              timestamp: timestamp,
              color: 'bg-green-600'
            })
          })
      }

      // 재료 차감 기록 (요리 시작 시)
      if (ingredientLogs && Array.isArray(ingredientLogs)) {
        ingredientLogs
          .filter(log => log.action === 'out' && log.orderId) // 출고 중 주문 관련만
          .forEach(log => {
            // notes가 있으면 notes를 사용, 없으면 기본 형식 사용
            let message = ''
            if (log.notes && log.notes.trim()) {
              message = `주문번호 ${log.orderId?.substring(0, 8) || '알 수 없음'} - ${log.notes}`
            } else {
              message = `주문번호 ${log.orderId?.substring(0, 8) || '알 수 없음'} - ${log.ingredientName || '재료'} ${Number(log.quantity).toLocaleString()}${log.ingredientUnit || ''} 차감`
            }
            // timestamp 정규화 (여러 필드명 확인)
            const timestamp = log.createdAt || log.created_at || log.timestamp
            activities.push({
              type: 'ingredient-deduction',
              message: message,
              timestamp: timestamp,
              color: 'bg-red-600'
            })
          })
      }

      // 요리 작업 기록 (시작/완료)
      const cookingTasksList = cookingTasks?.tasks || (Array.isArray(cookingTasks) ? cookingTasks : [])
      if (Array.isArray(cookingTasksList)) {
        cookingTasksList.forEach(task => {
          const orderId = task.orderId ? task.orderId.substring(0, 8) : '알 수 없음'
          
          // 요리 시작
          if (task.status === 'in_progress' && (task.startedAt || task.started_at)) {
            const timestamp = task.startedAt || task.started_at || task.timestamp
            activities.push({
              type: 'cooking-start',
              message: `주문번호 ${orderId} 요리 시작`,
              timestamp: timestamp,
              color: 'bg-orange-500'
            })
          }
          
          // 요리 완료
          if (task.status === 'completed' && (task.completedAt || task.completed_at)) {
            const timestamp = task.completedAt || task.completed_at || task.timestamp
            activities.push({
              type: 'cooking-complete',
              message: `주문번호 ${orderId} 요리 완료`,
              timestamp: timestamp,
              color: 'bg-orange-600'
            })
          }
        })
      }

      // 배달 작업 기록 (시작/완료)
      const deliveryTasksList = deliveryTasks?.tasks || (Array.isArray(deliveryTasks) ? deliveryTasks : [])
      if (Array.isArray(deliveryTasksList)) {
        deliveryTasksList.forEach(task => {
          const orderId = task.orderId ? task.orderId.substring(0, 8) : '알 수 없음'
          
          // 배달 시작
          if (task.status === 'in_transit' && (task.startedAt || task.started_at)) {
            const timestamp = task.startedAt || task.started_at || task.timestamp
            activities.push({
              type: 'delivery-start',
              message: `주문번호 ${orderId} 배달 시작`,
              timestamp: timestamp,
              color: 'bg-blue-500'
            })
          }
          
          // 배달 완료
          if (task.status === 'completed' && (task.completedAt || task.completed_at)) {
            const timestamp = task.completedAt || task.completed_at || task.timestamp
            activities.push({
              type: 'delivery-complete',
              message: `주문번호 ${orderId} 배달 완료, 주문처리완료`,
              timestamp: timestamp,
              color: 'bg-blue-600'
            })
          }
        })
      }

      // 시간순 정렬 (최신순)
      activities.sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0
        return timeB - timeA
      })

      setRecentActivities(activities.slice(0, 10))
    } catch (error) {
      console.error("최근 활동 조회 실패:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "알 수 없음"
    try {
      // ISO 문자열을 Date 객체로 변환
      const date = new Date(timestamp)
      
      // 유효한 날짜인지 확인
      if (isNaN(date.getTime())) {
        console.warn("유효하지 않은 timestamp:", timestamp)
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
      console.error("시간 포맷팅 실패:", timestamp, e)
      return "알 수 없음"
    }
  }

  const menuItems = [
    {
      title: "재료 관리",
      description: "재료 입고 및 재고 관리",
      icon: Package,
      href: "/staff/ingredients",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "요리 관리",
      description: "주문 요리 및 재료 차감",
      icon: ChefHat,
      href: "/staff/cooking",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "배달 관리",
      description: "배달 작업 및 완료 처리",
      icon: Truck,
      href: "/staff/delivery",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "고객별 주문 내역",
      description: "모든 고객의 주문 내역 조회",
      icon: ShoppingBag,
      href: "/staff/orders",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ]


  return (
    <ProtectedRoute requiredRole="staff">
      <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">직원 대시보드</h1>
            <p className="text-muted-foreground">SoftDinner 관리 시스템에 오신 것을 환영합니다</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>


        {/* 메뉴 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {menuItems.map((item, idx) => (
            <Card
              key={idx}
              className="p-6 hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => router.push(item.href)}
            >
              <div
                className={`w-12 h-12 rounded-lg ${item.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <item.icon className={`w-6 h-6 ${item.color}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
              <Button variant="outline" className="w-full bg-transparent">
                관리하기
              </Button>
            </Card>
          ))}
        </div>

        {/* 최근 활동 */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-bold mb-4">최근 활동</h3>
          {loading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">활동 내역을 불러오는 중...</p>
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">최근 활동이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${activity.color}`}></div>
                  <span className="text-muted-foreground min-w-[150px]">{formatTimestamp(activity.timestamp)}</span>
                  <span>{activity.message}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
    </ProtectedRoute>
  )
}
