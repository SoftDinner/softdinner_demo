const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export async function apiRequest(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const headers = {
    ...options.headers,
  }

  // multipart/form-data가 아닌 경우에만 Content-Type 설정
  if (!options.isMultipart) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    ...options,
    headers,
  }
  
  // isMultipart 플래그 제거 (fetch에 전달하지 않음)
  delete config.isMultipart

  try {
    const response = await fetch(url, config)
    
    console.log(`API 요청: ${options.method || 'GET'} ${url}, 상태: ${response.status}`)
    
    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      
      // 403 Forbidden인 경우 권한 관련 메시지
      if (response.status === 403) {
        errorMessage = '접근 권한이 없습니다. 직원 계정으로 로그인했는지 확인하세요.'
      }
      // 401 Unauthorized인 경우 인증 관련 메시지
      else if (response.status === 401) {
        errorMessage = '인증이 필요합니다. 다시 로그인해주세요.'
      }
      
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
    // 음성 인식 관련 에러는 조용히 처리 (콘솔 에러 출력 안 함)
    const isVoiceTranscribeError = endpoint.includes('/voice-order/transcribe')
    
    if (!isVoiceTranscribeError) {
      console.error('API request error:', error)
      console.error('Request URL:', url)
      console.error('Request config:', config)
    }
    
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

