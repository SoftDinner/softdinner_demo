import { apiRequest } from "../api"

/**
 * 작업 관련 API 서비스 (요리 작업 + 배달 작업)
 */
export const taskService = {
  /**
   * 요리 작업 목록 조회
   */
  async getCookingTasks() {
    return apiRequest("/api/cooking-tasks", {
      method: "GET",
    })
  },

  /**
   * 요리 시작
   */
  async startCooking(taskId) {
    return apiRequest(`/api/cooking-tasks/${taskId}/start`, {
      method: "POST",
    })
  },

  /**
   * 요리 완료
   */
  async completeCooking(taskId) {
    return apiRequest(`/api/cooking-tasks/${taskId}/complete`, {
      method: "POST",
    })
  },

  /**
   * 배달 작업 목록 조회
   */
  async getDeliveryTasks() {
    return apiRequest("/api/delivery-tasks", {
      method: "GET",
    })
  },

  /**
   * 배달 시작
   */
  async startDelivery(taskId) {
    return apiRequest(`/api/delivery-tasks/${taskId}/start`, {
      method: "POST",
    })
  },

  /**
   * 배달 완료
   */
  async completeDelivery(taskId) {
    return apiRequest(`/api/delivery-tasks/${taskId}/complete`, {
      method: "POST",
    })
  },
}

