import { useState, useEffect } from "react"
import { taskService } from "@/lib/services/task.service"

/**
 * 요리 작업 관리를 위한 커스텀 훅
 */
export function useCookingTasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 작업 목록 로드
  const loadTasks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await taskService.getCookingTasks()
      setTasks(response.tasks || [])
    } catch (err) {
      console.error("Error loading cooking tasks:", err)
      setError(err.message || "요리 작업 목록을 불러오는데 실패했습니다")
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  // 요리 시작
  const startCooking = async (taskId) => {
    try {
      const response = await taskService.startCooking(taskId)
      await loadTasks() // 목록 새로고침
      return { 
        success: true,
        message: response.message || "요리가 시작되었습니다",
        deductionResult: response.deductionResult
      }
    } catch (err) {
      console.error("Error starting cooking:", err)
      return { success: false, error: err.message || "요리 시작에 실패했습니다" }
    }
  }

  // 요리 완료
  const completeCooking = async (taskId) => {
    try {
      const response = await taskService.completeCooking(taskId)
      await loadTasks() // 목록 새로고침
      return { 
        success: true, 
        message: response.message || "요리가 완료되었습니다",
        deductionResult: response.deductionResult
      }
    } catch (err) {
      console.error("Error completing cooking:", err)
      return { success: false, error: err.message || "요리 완료에 실패했습니다" }
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
    startCooking,
    completeCooking,
  }
}

