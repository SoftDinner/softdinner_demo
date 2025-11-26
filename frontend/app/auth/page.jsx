"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Header from "@/components/common/header"
import Footer from "@/components/common/footer"
import { authAPI } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

export default function AuthPage() {
  const router = useRouter()
  const { refreshUser } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [role, setRole] = useState("customer")
  const [staffKey, setStaffKey] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvc, setCvc] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignup = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // 직원 키 검증
      if (role === "staff" && staffKey !== "softdinner") {
        setError("직원 키가 올바르지 않습니다.")
        setLoading(false)
        return
      }

      // Spring Boot API 회원가입
      const signupData = {
        email,
        password,
        fullName,
        phone,
        role
      }

      // 고객인 경우 주소와 결제 정보 추가
      if (role === "customer") {
        signupData.address = address
        signupData.paymentInfo = {
          cardNumber,
          expiryDate,
          cvc
        }
      }

      const response = await authAPI.signup(signupData)

      // 회원가입 성공 - 토큰이 없으므로 로그인 페이지로 전환
      alert(response.message || "회원가입이 완료되었습니다! 로그인해주세요.")
      setIsLogin(true)
      setEmail(email) // 이메일은 유지하여 로그인 편의성 제공
      setPassword("")
      setFullName("")
      setPhone("")
      setAddress("")
      setStaffKey("")
      setCardNumber("")
      setExpiryDate("")
      setCvc("")
    } catch (err) {
      setError(err.message || "회원가입 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Spring Boot API 로그인
      const response = await authAPI.login({
        email,
        password
      })

      console.log('Login response:', response) // 디버깅용

      // 토큰 저장
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken)
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken)
        }
        
        // AuthContext 업데이트 (사용자 정보 새로고침)
        try {
          await refreshUser()
        } catch (err) {
          console.warn('Failed to refresh user context:', err)
          // Continue anyway - user data might be in response
        }
        
        // 역할에 따라 자동 라우팅
        if (response.role === 'staff') {
          router.push('/staff')
        } else {
          router.push('/dashboard')
        }
      } else {
        console.error('No accessToken in response:', response)
        setError('로그인 응답에 토큰이 없습니다. 다시 시도해주세요.')
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || "로그인 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    if (isLogin) {
      await handleLogin(e)
    } else {
      await handleSignup(e)
    }
  }

  return (
    <>
      <Header />
      <main className="flex-1 min-h-screen flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-lg p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-center text-foreground mb-2">
              {isLogin ? "로그인" : "회원가입"}
            </h1>
            <p className="text-center text-muted-foreground mb-8">
              {isLogin
                ? "Mr. 대박 디너서비스에 오신 것을 환영합니다"
                : "새로운 계정을 만들어보세요"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">이름</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="홍길동"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required={!isLogin}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">전화번호</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="010-1234-5678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required={!isLogin}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">역할</Label>
                    <select
                      id="role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={role}
                      onChange={(e) => {
                        setRole(e.target.value)
                        setStaffKey("")
                      }}
                      required={!isLogin}
                    >
                      <option value="customer">고객</option>
                      <option value="staff">직원</option>
                    </select>
                  </div>

                  {role === "customer" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="address">주소</Label>
                        <Input
                          id="address"
                          type="text"
                          placeholder="서울시 강남구..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required={role === "customer"}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">카드 번호</Label>
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
                          maxLength={19}
                          required={role === "customer"}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">만료일 (MM/YY)</Label>
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
                            required={role === "customer"}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvc">CVC</Label>
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
                            required={role === "customer"}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {role === "staff" && (
                    <div className="space-y-2">
                      <Label htmlFor="staffKey">직원 키 *</Label>
                      <Input
                        id="staffKey"
                        type="password"
                        placeholder="직원 키를 입력하세요"
                        value={staffKey}
                        onChange={(e) => setStaffKey(e.target.value)}
                        required={role === "staff"}
                      />
                      <p className="text-xs text-muted-foreground">
                        직원으로 회원가입하려면 직원 키가 필요합니다.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">이메일</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "처리 중..." : isLogin ? "로그인" : "회원가입"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {isLogin
                  ? "계정이 없으신가요? 회원가입"
                  : "이미 계정이 있으신가요? 로그인"}
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

