import { apiRequest } from '../api'

export const menuAPI = {
  // 모든 디너 목록 조회
  getAllDinners: async () => {
    return apiRequest('/api/menus', {
      method: 'GET',
    })
  },

  // 특정 디너 상세 정보 조회
  getDinnerById: async (dinnerId) => {
    return apiRequest(`/api/menus/${dinnerId}`, {
      method: 'GET',
    })
  },

  // 디너별 메뉴 항목 조회
  getMenuItemsByDinnerId: async (dinnerId) => {
    return apiRequest(`/api/menus/${dinnerId}/items`, {
      method: 'GET',
    })
  },

  // 모든 스타일 조회
  getAllStyles: async () => {
    return apiRequest('/api/menus/styles', {
      method: 'GET',
    })
  },
}

