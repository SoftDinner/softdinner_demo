import { apiRequest } from '../api'

export const orderService = {
  // 주문 생성
  createOrder: async (orderData) => {
    return apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  },

  // 사용자의 주문 목록 조회
  getUserOrders: async () => {
    return apiRequest('/api/orders', {
      method: 'GET',
    })
  },

  // 모든 주문 목록 조회 (직원용)
  getAllOrders: async () => {
    return apiRequest('/api/orders/all', {
      method: 'GET',
    })
  },

  // 주문 ID로 주문 정보 조회
  getOrderById: async (orderId) => {
    return apiRequest(`/api/orders/${orderId}`, {
      method: 'GET',
    })
  },
}

