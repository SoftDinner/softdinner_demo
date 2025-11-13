"use client"

import { X, CheckCircle, AlertCircle, Info, XCircle } from "lucide-react"
import { useEffect } from "react"

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
}

const colors = {
  success: "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800",
  error: "bg-red-50 dark:bg-red-950 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800",
  warning:
    "bg-yellow-50 dark:bg-yellow-950 text-yellow-900 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800",
  info: "bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800",
}

export default function Toast({ type = "info", message, onClose, duration = 3000 }) {
  const Icon = icons[type]

  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md ${colors[type]}`}
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <p className="text-sm flex-1">{message}</p>
      <button onClick={onClose} className="flex-shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
