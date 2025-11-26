import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { Toaster } from "@/components/ui/sonner"

export const metadata = {
  title: "Mr. 대박 디너서비스 - 프리미엄 디너 배달 서비스",
  description: "특별한 날을 더욱 특별하게, Mr. 대박 디너서비스",
  generator: "v0.app",
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
