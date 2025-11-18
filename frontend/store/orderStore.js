import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const useOrderStore = create(
  devtools(
    (set, get) => ({
      // 선택된 디너 정보
      selectedDinner: null,
      selectedStyle: null,
      
      // 커스터마이징 상태
      // { [menuItemId]: quantity }
      customizations: {},
      
      // 배달 정보
      deliveryAddress: '',
      deliveryDate: null,
      
      // 가격 정보
      basePrice: 0,
      stylePriceModifier: 0,
      customizationAdditions: 0,
      totalPrice: 0,
      
      // Actions
      setSelectedDinner: (dinner) => {
        set({ selectedDinner: dinner })
      },
      
      setSelectedStyle: (style) => {
        set({ selectedStyle: style })
      },
      
      // 커스터마이징 추가
      addCustomization: (item) => {
        const currentQty = get().customizations[item.id] || 0
        const newQty = Math.min(currentQty + 1, item.maxQuantity || 999)
        
        set((state) => ({
          customizations: {
            ...state.customizations,
            [item.id]: newQty,
          },
        }))
        
        // 가격 자동 계산
        get().calculateTotalPrice()
      },
      
      // 커스터마이징 제거
      removeCustomization: (itemId) => {
        set((state) => {
          const newCustomizations = { ...state.customizations }
          delete newCustomizations[itemId]
          return { customizations: newCustomizations }
        })
        
        // 가격 자동 계산
        get().calculateTotalPrice()
      },
      
      // 커스터마이징 수량 업데이트
      updateCustomization: (itemId, updates) => {
        set((state) => ({
          customizations: {
            ...state.customizations,
            [itemId]: updates.quantity !== undefined 
              ? updates.quantity 
              : state.customizations[itemId] || 0,
          },
        }))
        
        // 가격 자동 계산
        get().calculateTotalPrice()
      },
      
      // 초기 커스터마이징 설정 (기본 수량으로)
      initializeCustomizations: (menuItems) => {
        const initial = {}
        menuItems.forEach((item) => {
          // 0도 유효한 값이므로 ?? 사용
          initial[item.id] = item.defaultQuantity ?? 0
        })
        set({ customizations: initial })
        get().calculateTotalPrice()
      },
      
      // 배달 주소 설정
      setDeliveryAddress: (address) => {
        set({ deliveryAddress: address })
      },
      
      // 배달 날짜 설정
      setDeliveryDate: (date) => {
        set({ deliveryDate: date })
      },
      
      // 가격 계산
      calculateTotalPrice: () => {
        const state = get()
        const { customizations, basePrice, stylePriceModifier, selectedDinner } = state
        
        // 커스터마이징 추가 가격 계산
        let customizationAdditions = 0
        if (selectedDinner && selectedDinner.menuItems) {
          selectedDinner.menuItems.forEach((item) => {
            const qty = customizations[item.id] || 0
            const defaultQty = item.defaultQuantity || 0
            const additionalQty = Math.max(0, qty - defaultQty)
            
            // 추가 수량에 대한 가격만 계산 (기본 수량은 포함된 가격)
            if (item.additionalPrice) {
              customizationAdditions += additionalQty * item.additionalPrice
            } else if (item.basePrice) {
              customizationAdditions += additionalQty * item.basePrice
            }
          })
        }
        
        const totalPrice = basePrice + stylePriceModifier + customizationAdditions
        
        set({
          customizationAdditions,
          totalPrice,
        })
      },
      
      // 기본 가격 및 스타일 가격 설정
      setBasePrice: (price) => {
        set({ basePrice: price })
        get().calculateTotalPrice()
      },
      
      setStylePriceModifier: (modifier) => {
        set({ stylePriceModifier: modifier })
        get().calculateTotalPrice()
      },
      
      // 주문 초기화
      resetOrder: () => {
        set({
          selectedDinner: null,
          selectedStyle: null,
          customizations: {},
          deliveryAddress: '',
          deliveryDate: null,
          basePrice: 0,
          stylePriceModifier: 0,
          customizationAdditions: 0,
          totalPrice: 0,
        })
      },
    }),
    { name: 'OrderStore' }
  )
)

export default useOrderStore

