import { apiRequest } from '../api'

export const ingredientAPI = {
  // 모든 재료 목록 조회
  getAllIngredients: async () => {
    return apiRequest('/api/ingredients', {
      method: 'GET',
    })
  },

  // 재료 입고 처리
  addStock: async (ingredientId, quantity, notes = null) => {
    return apiRequest('/api/ingredients/stock', {
      method: 'POST',
      body: JSON.stringify({
        ingredientId,
        quantity,
        notes,
      }),
    })
  },

  // 입출고 기록 조회
  getIngredientLogs: async (ingredientId = null, limit = 50) => {
    const params = new URLSearchParams()
    if (ingredientId) {
      params.append('ingredientId', ingredientId)
    }
    params.append('limit', limit.toString())

    return apiRequest(`/api/ingredients/logs?${params.toString()}`, {
      method: 'GET',
    })
  },
}

