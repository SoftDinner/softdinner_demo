"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Package, Loader2, ArrowLeft } from "lucide-react"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { useIngredients } from "@/hooks/useIngredients"
import { ingredientAPI } from "@/lib/services/ingredient.service"

// 아이콘 매핑
const getIngredientIcon = (name) => {
  const iconMap = {
    "고기": "🥩",
    "채소": "🥬",
    "와인": "🍷",
    "샴페인": "🍾",
    "커피": "☕",
    "바게트빵": "🥖",
    "계란": "🥚",
  }
  return iconMap[name] || "📦"
}

export default function StaffIngredientsPage() {
  const router = useRouter()
  const { ingredients, loading, error, loadIngredients, addStock } = useIngredients()
  const [selectedIngredient, setSelectedIngredient] = useState("")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [logs, setLogs] = useState([])

  useEffect(() => {
    loadLogs()
  }, [])

  const loadLogs = async () => {
    try {
      const logsData = await ingredientAPI.getIngredientLogs(null, 10)
      setLogs(logsData || [])
    } catch (error) {
      console.error("입출고 기록 조회 실패:", error)
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

  const handleStockIn = async () => {
    if (!selectedIngredient || !quantity) {
      alert("재료와 수량을 입력해주세요")
      return
    }

    const qty = parseFloat(quantity)
    if (qty <= 0 || isNaN(qty)) {
      alert("올바른 수량을 입력해주세요")
      return
    }

    try {
      setSubmitting(true)
      await addStock(selectedIngredient, qty, notes || null)
      
      // 로그 새로고침
      await loadLogs()
      
      // 폼 초기화
      setQuantity("")
      setNotes("")
      
      const ingredient = ingredients.find((i) => i.id === selectedIngredient)
      alert(`${ingredient?.name || "재료"} ${qty}${ingredient?.unit || ""} 입고 완료!`)
    } catch (error) {
      alert(`입고 실패: ${error.message || "알 수 없는 오류가 발생했습니다."}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="staff">
      <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <Button variant="ghost" className="mb-6" onClick={() => router.push("/staff")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          뒤로가기
        </Button>
        <h1 className="text-3xl font-bold mb-2">재료 입고 관리</h1>
        <p className="text-muted-foreground mb-8">재료를 입고하고 재고를 관리하세요</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 입고 폼 */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                재료 입고
              </h3>

              <div className="space-y-4">
                <div>
                  <Label>재료 선택 *</Label>
                  <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="재료를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {loading ? (
                        <SelectItem value="loading" disabled>로딩 중...</SelectItem>
                      ) : ingredients.length === 0 ? (
                        <SelectItem value="empty" disabled>재료가 없습니다</SelectItem>
                      ) : (
                        ingredients.map((ingredient) => (
                          <SelectItem key={ingredient.id} value={ingredient.id}>
                            <span className="flex items-center gap-2">
                              <span>{getIngredientIcon(ingredient.name)}</span>
                              <span>{ingredient.name}</span>
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">입고 수량 *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="수량 입력"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="mt-2 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">비고 (선택사항)</Label>
                  <Input
                    id="notes"
                    type="text"
                    placeholder="비고 입력"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleStockIn} 
                  disabled={!selectedIngredient || !quantity || submitting || loading}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      입고 처리
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* 최근 입출고 기록 */}
            <Card className="p-6 mt-6">
              <h3 className="text-lg font-bold mb-4">최근 입출고 기록</h3>
              <div className="space-y-3">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">입출고 기록이 없습니다</p>
                ) : (
                  logs.slice(0, 10).map((log) => {
                    const qty = Number(log.quantity)
                    const action = (log.action || '').toLowerCase()
                    const isOut = action === 'out'
                    const isIn = action === 'in'
                    return (
                      <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getIngredientIcon(log.ingredientName || "")}</span>
                          <span>{log.ingredientName || "알 수 없음"}</span>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${isOut ? 'text-red-600' : 'text-green-600'}`}>
                            {isOut ? '-' : '+'}{qty.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(log.createdAt || log.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </Card>
          </div>

          {/* 현재 재고 현황 */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5" />
                현재 재고 현황
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-red-600 mb-2">재고 정보를 불러오는데 실패했습니다</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button onClick={loadIngredients} className="mt-4">다시 시도</Button>
                </div>
              ) : ingredients.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">재료가 없습니다</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ingredients.map((ingredient) => {
                    const stock = Number(ingredient.quantity || 0)
                    const isLow = stock < 10

                    return (
                      <Card key={ingredient.id} className={`p-4 ${isLow ? "border-red-300 bg-red-50" : ""}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{getIngredientIcon(ingredient.name)}</span>
                            <div>
                              <p className="font-bold">{ingredient.name}</p>
                              <p className="text-xs text-muted-foreground">{ingredient.unit}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${isLow ? "text-red-600" : "text-primary"}`}>
                              {stock % 1 === 0 ? stock.toLocaleString() : stock.toFixed(1)}
                            </p>
                            <p className="text-xs text-muted-foreground">{ingredient.unit}</p>
                          </div>
                        </div>
                        {isLow && <p className="text-xs text-red-600 mt-2">⚠️ 재고 부족</p>}
                      </Card>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
    </ProtectedRoute>
  )
}
