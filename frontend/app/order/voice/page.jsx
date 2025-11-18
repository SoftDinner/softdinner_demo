"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Loader2, SendHorizontal, ArrowLeft } from "lucide-react"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import { useAuth } from "@/context/AuthContext"
import { apiRequest } from "@/lib/api"
import { orderService } from "@/lib/services/order.service"

export default function VoiceOrderPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [sessionId, setSessionId] = useState(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState([])
  const [textInput, setTextInput] = useState("")
  const [pendingOrderData, setPendingOrderData] = useState(null) // 주문 완료 대기 중인 데이터
  
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const messagesContainerRef = useRef(null)

  // 스크롤 자동 이동 (대화 창 내에서만)
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth")
      return
    }
    
    if (user && !sessionId) {
      startVoiceSession()
    }
  }, [user, authLoading])

  // 세션 시작
  const startVoiceSession = async () => {
    try {
      setIsProcessing(true)
      const response = await apiRequest('/api/voice-order/start', {
        method: 'POST'
      })
      
      setSessionId(response.sessionId)
      setMessages([{
        role: 'assistant',
        content: response.assistantMessage
      }])
    } catch (error) {
      console.error("세션 시작 실패:", error)
      alert("음성 주문 세션 시작에 실패했습니다.")
    } finally {
      setIsProcessing(false)
    }
  }

  // 음성 녹음 시작
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // 브라우저 호환성 체크
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : 'audio/mp4'
      
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
      audioChunksRef.current = []
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        await processAudio(audioBlob)
        
        // 스트림 정리
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorderRef.current.start()
      setIsRecording(true)
      
    } catch (error) {
      console.error("녹음 시작 실패:", error)
      alert("마이크 접근에 실패했습니다. 브라우저 설정을 확인해주세요.")
    }
  }

  // 음성 녹음 중지
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // 음성 처리 (음성 -> 텍스트 -> 대화)
  const processAudio = async (audioBlob) => {
    try {
      setIsProcessing(true)
      
      // 1. Whisper API로 음성을 텍스트로 변환
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')
      
      let transcriptionResponse
      try {
        transcriptionResponse = await apiRequest('/api/voice-order/transcribe', {
          method: 'POST',
          body: formData,
          isMultipart: true
        })
      } catch (transcribeError) {
        // 음성 인식 실패 시 조용히 처리하고 사용자에게 자연스러운 메시지 표시
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '죄송합니다. 음성을 제대로 인식하지 못했습니다. 다시 말씀해 주시겠어요?'
        }])
        return
      }
      
      const userMessage = transcriptionResponse.transcription
      
      // 사용자 메시지 표시
      setMessages(prev => [...prev, {
        role: 'user',
        content: userMessage
      }])
      
      // 2. 대화 처리
      await processChatMessage(userMessage)
      
    } catch (error) {
      // 예상치 못한 에러 발생 시에도 조용히 처리
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '죄송합니다. 음성을 제대로 인식하지 못했습니다. 다시 말씀해 주시겠어요?'
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  // 텍스트 입력 전송
  const sendTextMessage = async () => {
    if (!textInput.trim()) return
    
    const userMessage = textInput.trim()
    setTextInput("")
    
    // 사용자 메시지 표시
    setMessages(prev => [...prev, {
      role: 'user',
      content: userMessage
    }])
    
    await processChatMessage(userMessage)
  }

  // 대화 처리
  const processChatMessage = async (userMessage) => {
    try {
      setIsProcessing(true)
      
      const response = await apiRequest('/api/voice-order/chat', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: sessionId,
          userMessage: userMessage
        })
      })
      
      console.log("💬 API 응답:", response)
      console.log("✅ isOrderComplete:", response.isOrderComplete)
      console.log("📦 orderData:", response.orderData)
      
      // [ORDER_COMPLETE] 태그 제거하고 AI 응답 표시
      let cleanMessage = response.assistantMessage || ""
      // [ORDER_COMPLETE] ... [/ORDER_COMPLETE] 태그와 내용 제거
      cleanMessage = cleanMessage.replace(/\[ORDER_COMPLETE\][\s\S]*?\[\/ORDER_COMPLETE\]/g, "").trim()
      
      // AI 응답 표시
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: cleanMessage
      }])
      
      // 주문 완료 확인 - 모든 데이터가 충족되면 버튼 표시
      if (response.isOrderComplete && response.orderData) {
        console.log("🎉 주문 완료! 버튼을 표시합니다.")
        setPendingOrderData(response.orderData)
      } else {
        // 주문 완료가 아니면 대기 중인 주문 데이터 초기화
        setPendingOrderData(null)
      }
      
    } catch (error) {
      console.error("대화 처리 실패:", error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요."
      }])
    } finally {
      setIsProcessing(false)
    }
  }

  // 주문 완료 처리 - 바로 주문 생성
  const handleOrderComplete = async (orderData) => {
    console.log("✅ 주문 완료 데이터:", orderData)
    
    try {
      // 디너 정보 조회
      const dinner = await apiRequest(`/api/menus/${orderData.dinnerId}`, {
        method: 'GET'
      })
      
      if (!dinner) {
        throw new Error("디너 정보를 찾을 수 없습니다.")
      }
      
      console.log("📦 디너 정보:", dinner)
      
      // 스타일 정보 조회
      const styles = await apiRequest('/api/menus/styles', {
        method: 'GET'
      })
      
      if (!styles || styles.length === 0) {
        throw new Error("스타일 정보를 찾을 수 없습니다.")
      }
      
      const style = styles.find(s => s.id === orderData.styleId)
      console.log("📦 스타일 정보:", style)
      
      if (!style) {
        throw new Error("선택한 스타일을 찾을 수 없습니다.")
      }
      
      // 커스터마이징 설정 - 기본값 먼저 설정 후 변경사항 반영
      let customizations = {}
      
      // 1. 먼저 모든 메뉴 아이템의 기본값 설정
      if (dinner.menuItems && dinner.menuItems.length > 0) {
        dinner.menuItems.forEach(item => {
          customizations[item.id] = item.defaultQuantity || 0
        })
        
        // 2. orderData.customizations가 있으면 덮어쓰기
        if (orderData.customizations && Object.keys(orderData.customizations).length > 0) {
          // GPT가 메뉴 아이템 이름으로 전달한 경우 ID로 변환
          Object.entries(orderData.customizations).forEach(([key, quantity]) => {
            // key가 이미 ID인 경우 그대로 사용
            if (customizations.hasOwnProperty(key)) {
              customizations[key] = quantity
            } else {
              // key가 이름인 경우 ID 찾기
              const item = dinner.menuItems.find(i => i.name === key)
              if (item) {
                customizations[item.id] = quantity
              } else {
                console.warn(`⚠️ 메뉴 아이템을 찾을 수 없습니다: ${key}`)
              }
            }
          })
        }
      } else {
        console.warn("⚠️ dinner.menuItems가 없습니다. orderData.customizations를 직접 사용합니다.")
        // menuItems가 없으면 orderData.customizations를 그대로 사용
        if (orderData.customizations && Object.keys(orderData.customizations).length > 0) {
          customizations = { ...orderData.customizations }
        }
      }
      
      console.log("📦 최종 커스터마이징 (전체 수량 포함):", customizations)
      
      // 배달 날짜 설정 (ISO 형식으로 변환)
      const deliveryDate = orderData.deliveryDate 
        ? new Date(orderData.deliveryDate).toISOString()
        : new Date(Date.now() + 86400000).toISOString() // 기본: 내일
      
      // 주문 생성 요청 데이터
      const createOrderRequest = {
        dinnerId: orderData.dinnerId,
        styleId: orderData.styleId,
        deliveryAddress: "서울시 강남구 테헤란로 123 (테스트 주소)",
        deliveryDate: deliveryDate,
        customizations: customizations,
        paymentInfo: {
          cardNumber: "4111-1111-1111-1111",
          expiryDate: "12/25",
          cvc: "123"
        }
      }
      
      console.log("📦 주문 생성 요청:", createOrderRequest)
      
      // 주문 생성
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🎉 주문을 생성하고 있습니다...'
      }])
      
      const orderResponse = await orderService.createOrder(createOrderRequest)
      
      console.log("✅ 주문 생성 성공:", orderResponse)
      
      // orderId는 response.id 필드에 있음
      const orderId = orderResponse.id
      
      if (!orderId) {
        throw new Error("주문 ID를 받지 못했습니다.")
      }
      
      // 성공 메시지 표시
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `✅ 주문이 완료되었습니다!\n주문 번호: ${orderId.substring(0, 8)}\n곧 주문 성공 페이지로 이동합니다.`
      }])
      
      // 주문 성공 페이지로 이동
      setTimeout(() => {
        router.push(`/order/success?orderId=${orderId}`)
      }, 2000)
      
    } catch (error) {
      console.error("주문 생성 실패:", error)
      const errorMessage = error.response?.data?.message || error.message || "알 수 없는 오류"
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ 주문 생성에 실패했습니다.\n오류: ${errorMessage}\n\n다시 시도해 주세요.`
      }])
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
          <Button variant="ghost" className="mb-6" onClick={() => router.push('/dinners')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로가기
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">🎤 음성 주문</h1>
            <p className="text-muted-foreground">
              마이크 버튼을 눌러 음성으로 주문하거나 텍스트로 대화하세요
            </p>
          </div>

          {/* 대화 창 */}
          <Card className="p-6 mb-6">
            <div 
              ref={messagesContainerRef}
              className="space-y-4 max-h-[500px] overflow-y-auto mb-6"
            >
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>처리 중...</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 주문 완료 버튼 (모든 데이터가 충족되었을 때만 표시) */}
              {pendingOrderData && (
                <div className="flex justify-center mt-4">
                  <Card className="p-4 bg-primary/10 border-primary/20">
                    <div className="text-center mb-4">
                      <p className="font-semibold text-lg mb-2">주문 정보가 모두 준비되었습니다</p>
                      <p className="text-sm text-muted-foreground">주문을 확정하시겠습니까?</p>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setPendingOrderData(null)
                          setMessages(prev => [...prev, {
                            role: 'user',
                            content: '주문을 수정하고 싶어요'
                          }])
                          processChatMessage('주문을 수정하고 싶어요')
                        }}
                        disabled={isProcessing}
                      >
                        다시 주문하기
                      </Button>
                      <Button
                        onClick={async () => {
                          if (pendingOrderData) {
                            await handleOrderComplete(pendingOrderData)
                            setPendingOrderData(null)
                          }
                        }}
                        disabled={isProcessing}
                      >
                        주문 확정
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* 입력 영역 */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-4">
                {/* 음성 입력 */}
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className="rounded-full w-14 h-14"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing || !sessionId || pendingOrderData}
                >
                  {isRecording ? (
                    <MicOff className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </Button>

                {/* 텍스트 입력 */}
                <div className="flex-1 flex space-x-2">
                  <input
                    type="text"
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="또는 여기에 입력하세요..."
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !isProcessing && !pendingOrderData) {
                        sendTextMessage()
                      }
                    }}
                    disabled={isProcessing || !sessionId || pendingOrderData}
                  />
                  <Button
                    onClick={sendTextMessage}
                    disabled={isProcessing || !textInput.trim() || !sessionId || pendingOrderData}
                  >
                    <SendHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {isRecording && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-red-600 animate-pulse">🔴 녹음 중...</p>
                </div>
              )}
            </div>
          </Card>

          {/* 안내 메시지 */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-2">💡 사용 방법</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• 마이크 버튼을 눌러 음성으로 말하거나, 텍스트로 입력할 수 있습니다</li>
              <li>• AI와 자연스럽게 대화하며 디너를 선택하세요</li>
              <li>• 주문이 완료되면 자동으로 주문이 생성되고 성공 페이지로 이동합니다</li>
              <li>• 테스트 결제 정보와 기본 배송지가 자동으로 설정됩니다</li>
            </ul>
          </Card>
        </div>
      </div>
      <Footer />
    </>
  )
}

