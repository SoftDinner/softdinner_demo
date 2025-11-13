const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(url, config)
    
    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorMessage
      } catch (e) {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
    console.error('API request error:', error)
    console.error('Request URL:', url)
    console.error('Request config:', config)
    
    // More specific error messages
    if (error.message === 'Failed to fetch') {
      throw new Error('백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.')
    }
    
    throw error
  }
}

export const authAPI = {
  signup: async (signupData) => {
    return apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(signupData),
    })
  },

  login: async (loginData) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    })
  },

  getCurrentUser: async () => {
    return apiRequest('/api/auth/me', {
      method: 'GET',
    })
  },

  logout: async () => {
    return apiRequest('/api/auth/logout', {
      method: 'POST',
    })
  },
}

export const orderAPI = {
  createOrder: async (orderData) => {
    return apiRequest('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
  },
}

