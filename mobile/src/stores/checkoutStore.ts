/**
 * AquaPure — Checkout Store (Zustand)
 * Dedicated checkout session state management.
 * Keeps checkout items strictly isolated from the general shopping cart when doing "Buy Now"
 * (single product purchase), while supporting cart-based checkouts.
 * Supports real-time quantity updates, item removals, dynamic subtotal/delivery/total
 * recalculations, dealer pricing synchronization, and AsyncStorage persistence.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, CartItem } from '@/types';
import { useCartStore } from './cartStore';

export type CheckoutSource = 'cart' | 'buy_now';

interface CheckoutState {
  items: CartItem[];
  source: CheckoutSource;

  // Actions
  initCheckout: (items: CartItem[], source: CheckoutSource) => void;
  addItem: (product: Product, quantity?: number, isDealerApproved?: boolean) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCheckout: () => void;
  replaceItems: (items: CartItem[]) => void;
  syncDealerPrices: (isDealerApproved: boolean) => void;

  // Calculations
  getItemCount: () => number;
  getSubtotal: () => number;
  getShippingFee: () => number;
  getTotal: () => number;
}

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set, get) => ({
      items: [],
      source: 'cart',

      initCheckout: (items, source) => {
        // Sanitize items with valid quantities & prices
        const sanitized = items.map((item) => {
          const unitPrice =
            item.unitPrice ??
            item.price ??
            (item.product?.customerPrice ?? 0);
          const qty = Math.max(1, item.quantity || 1);
          return {
            ...item,
            unitPrice,
            price: unitPrice,
            quantity: qty,
            totalPrice: unitPrice * qty,
          };
        });
        set({ items: sanitized, source });
      },

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

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const currentSource = get().source;
        set((state) => ({
          items: state.items.map((item) => {
            if (item.product.id !== productId) return item;
            const maxLimit =
              item.maxQuantity ||
              (item.product.stockStatus === 'limited' ? 5 : 10);
            const validQty = Math.min(Math.max(1, quantity), maxLimit);
            return {
              ...item,
              quantity: validQty,
              totalPrice: item.unitPrice * validQty,
            };
          }),
        }));

        // If checkout was initiated from cart, keep cart in sync
        if (currentSource === 'cart') {
          useCartStore.getState().updateQuantity(productId, quantity);
        }
      },

      removeItem: (productId) => {
        const currentSource = get().source;
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        }));

        // If checkout was initiated from cart, also remove from cart
        if (currentSource === 'cart') {
          useCartStore.getState().removeItem(productId);
        }
      },

      clearCheckout: () => set({ items: [], source: 'cart' }),

      replaceItems: (items) => set({ items }),

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

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + (item?.quantity || 0), 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + (item?.totalPrice || 0), 0);
      },

      getShippingFee: () => {
        const subtotal = get().getSubtotal();
        if (subtotal === 0 || subtotal >= 999) return 0;
        return 99;
      },

      getTotal: () => {
        return get().getSubtotal() + get().getShippingFee();
      },
    }),
    {
      name: 'aquapure_checkout_storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ items: state.items, source: state.source }),
    }
  )
);
