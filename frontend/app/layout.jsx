import { Noto_Sans_KR, Playfair_Display } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/context/AuthContext"
import { Toaster } from "@/components/ui/sonner"

const notoSansKR = Noto_Sans_KR({ 
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
})

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-display",
  display: "swap",
})

export const metadata = {
  title: "Mr. 대박 디너서비스 - 프리미엄 디너 배달 서비스",
  description: "특별한 날을 더욱 특별하게, Mr. 대박 디너서비스",
  generator: "v0.app",
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${playfairDisplay.variable}`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  )
}
