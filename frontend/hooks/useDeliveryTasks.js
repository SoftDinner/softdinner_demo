import { useState, useEffect } from "react"
import { taskService } from "@/lib/services/task.service"

/**
 * 배달 작업 관리를 위한 커스텀 훅
 */
export function useDeliveryTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 작업 목록 로드
  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await taskService.getDeliveryTasks()
      setTasks(response.tasks || [])
    } catch (err) {
      console.error("Error loading delivery tasks:", err)
      setError(err.message || "배달 작업 목록을 불러오는데 실패했습니다")
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  // 배달 시작
  const startDelivery = async (taskId) => {
    try {
      await taskService.startDelivery(taskId)
      await loadTasks() // 목록 새로고침
      return { success: true }
    } catch (err) {
      console.error("Error starting delivery:", err)
      return { success: false, error: err.message || "배달 시작에 실패했습니다" }
    }
  }

  // 배달 완료
  const completeDelivery = async (taskId) => {
    try {
      const response = await taskService.completeDelivery(taskId)
      await loadTasks() // 목록 새로고침
      return { 
        success: true, 
        message: response.message || "배달이 완료되었습니다"
      }
    } catch (err) {
      console.error("Error completing delivery:", err)
      return { success: false, error: err.message || "배달 완료에 실패했습니다" }
    }
  }

  // 초기 로드
  useEffect(() => {
    loadTasks()
  }, [])

  return {
    tasks,
    loading,
    error,
    loadTasks,
    startDelivery,
    completeDelivery,
  }
}

