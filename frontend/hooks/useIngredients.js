import { useState, useEffect } from 'react'
import { ingredientAPI } from '@/lib/services/ingredient.service'

export function useIngredients() {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadIngredients = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await ingredientAPI.getAllIngredients()
      setIngredients(data || [])
    } catch (err) {
      console.error('재료 목록 조회 실패:', err)
      setError(err.message || '재료 목록을 불러오는데 실패했습니다.')
      setIngredients([])
    } finally {
      setLoading(false)
    }
  }

  const addStock = async (ingredientId, quantity, notes = null) => {
    try {
      setError(null)
      const updatedIngredient = await ingredientAPI.addStock(ingredientId, quantity, notes)
      
      // 재료 목록 업데이트
      setIngredients(prev => 
        prev.map(ing => 
          ing.id === ingredientId ? updatedIngredient : ing
        )
      )
      
      return updatedIngredient
    } catch (err) {
      console.error('재료 입고 실패:', err)
      setError(err.message || '재료 입고에 실패했습니다.')
      throw err
    }
  }

  useEffect(() => {
    loadIngredients()
  }, [])

  return {
    ingredients,
    loading,
    error,
    loadIngredients,
    addStock,
  }
}

