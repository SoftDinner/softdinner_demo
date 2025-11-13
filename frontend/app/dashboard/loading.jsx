import { Loader2 } from "lucide-react"
import Header from "@/components/common/header"

export default function DashboardLoading() {
  return (
    <>
      <Header user={null} role="customer" />
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </>
  )
}
