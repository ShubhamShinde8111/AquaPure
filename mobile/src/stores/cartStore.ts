/**
 * AquaPure — Cart Store (Zustand)
 * Supports customer pricing and dealer wholesale pricing,
 * cart item management, persistent storage via AsyncStorage,
 * stock limit validation, and subtotal/total calculations.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, CartItem } from '@/types';

interface CartState {
  items: CartItem[];

  // Actions
  addItem: (product: Product, quantity?: number, isDealerApproved?: boolean) => void;
  removeItem: (productId: string) => void;
  restoreItem: (item: CartItem, index?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  replaceItems: (items: CartItem[]) => void;

  // Selectors / Helpers
  getItemCount: () => number;
  getSubtotal: () => number;
  getShippingFee: () => number;
  getTotal: () => number;
  syncDealerPrices: (isDealerApproved: boolean) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product, quantity = 1, isDealerApproved = false) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.product.id === product.id
          );

          const unitPrice =
            isDealerApproved && product.dealerPrice
              ? product.dealerPrice
              : (product.customerPrice ?? product.price ?? 0);

          const maxLimit = product.stockStatus === 'limited' ? 5 : 10;

          if (existingIndex > -1) {
            const nextItems = [...state.items];
            const current = nextItems[existingIndex];
            const newQty = Math.min(current.quantity + quantity, maxLimit);
            nextItems[existingIndex] = {
              ...current,
              quantity: newQty,
              maxQuantity: maxLimit,
              price: unitPrice,
              unitPrice,
              totalPrice: unitPrice * newQty,
            };
            return { items: nextItems };
          } else {
            const initialQty = Math.min(Math.max(1, quantity), maxLimit);
            const newItem: CartItem = {
              productId: product.id,
              name: product.name,
              imageUrl: product.imageUrl,
              price: unitPrice,
              unitPrice,
              totalPrice: unitPrice * initialQty,
              quantity: initialQty,
              maxQuantity: maxLimit,
              product,
            };
            return { items: [...state.items, newItem] };
          }
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));
      },

      restoreItem: (item, index) => {
        set((state) => {
          // If already in cart, do nothing
          if (state.items.some((i) => i.product.id === item.product.id)) {
            return state;
          }
          const nextItems = [...state.items];
          if (typeof index === 'number' && index >= 0 && index <= nextItems.length) {
            nextItems.splice(index, 0, item);
          } else {
            nextItems.push(item);
          }
          return { items: nextItems };
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            if (item.product.id !== productId) return item;

            const maxLimit = item.maxQuantity || (item.product.stockStatus === 'limited' ? 5 : 10);
            const validQty = Math.min(Math.max(1, quantity), maxLimit);

            return {
              ...item,
              quantity: validQty,
              totalPrice: item.unitPrice * validQty,
            };
          }),
        }));
      },

      clearCart: () => set({ items: [] }),

      replaceItems: (items) => set({ items }),

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + (item?.quantity || 0), 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + (item?.totalPrice || 0), 0);
      },

      getShippingFee: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0 || subtotal >= 999) return 0;
        return 99; // Standard flat delivery for orders under ₹999
      },

      getTotal: () => {
        return get().getSubtotal() + get().getShippingFee();
      },

      syncDealerPrices: (isDealerApproved) => {
        set((state) => ({
          items: state.items
            .filter((item) => Boolean(item && item.product))
            .map((item) => {
              const unitPrice =
                isDealerApproved && item.product.dealerPrice
                  ? item.product.dealerPrice
                  : (item.product.customerPrice ?? item.unitPrice ?? item.price ?? 0);
              return {
                ...item,
                price: unitPrice,
                unitPrice,
                totalPrice: unitPrice * (item.quantity || 1),
              };
            }),
        }));
      },
    }),
    {
      name: 'aquapure_cart_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
