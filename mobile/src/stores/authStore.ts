/**
 * AquaPure — Mobile Auth Store (Zustand)
 * Manages user session, role, and Firestore user profile.
 */

import { create } from 'zustand';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { UserProfile, UserRole, DealerStatus, Address, Product, ServiceType, CartItem } from '@/types';
import { useCartStore } from './cartStore';
import { useCheckoutStore } from './checkoutStore';

export interface PendingAuthAction {
  type: 'ADD_TO_CART' | 'BUY_NOW' | 'PROCEED_TO_CHECKOUT' | 'PLACE_ORDER' | 'BOOK_SERVICE';
  product?: Product;
  quantity?: number;
  bookingData?: {
    selectedType?: ServiceType;
    preferredDate?: string;
    preferredTime?: string;
    notes?: string;
    fullName?: string;
    phone?: string;
    addressLine?: string;
    city?: string;
    pincode?: string;
    productId?: string;
    productName?: string;
  };
  returnUrl?: string;
}

interface AuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isInitialized: boolean;
  error: string | null;
  pendingAction: PendingAuthAction | null;

  // Computed helper getters
  isAuthenticated: boolean;
  isDealer: boolean;
  isDealerApproved: boolean;
  isAdmin: boolean;

  // Actions
  initialize: () => () => void;
  waitForProfile: () => Promise<UserProfile | null>;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signUpCustomer: (params: {
    email: string;
    pass: string;
    name: string;
    phone: string;
  }) => Promise<{ success: boolean; error?: string }>;
  applyAsDealer: (params: {
    email: string;
    pass: string;
    name: string;
    phone: string;
    businessName: string;
    gstNumber?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserProfile: (params: { displayName?: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  saveAddress: (address: Address) => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  setPendingAction: (action: PendingAuthAction | null) => void;
  clearPendingAction: () => void;
  executePendingAction: (router: { replace: (url: any) => void; push?: (url: any) => void }) => boolean;
}

let activeAuthUnsubscribe: (() => void) | null = null;
let resolveProfileReady: ((profile: UserProfile | null) => void) | null = null;
const profileReadyPromise = new Promise<UserProfile | null>((resolve) => {
  resolveProfileReady = resolve;
});

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  isInitialized: false,
  error: null,
  pendingAction: null,

  isAuthenticated: false,
  isDealer: false,
  isDealerApproved: false,
  isAdmin: false,

  waitForProfile: async () => {
    if (get().isInitialized) {
      return get().profile;
    }
    return profileReadyPromise;
  },

  initialize: () => {
    // If listener is already active, return the existing unsubscribe handler
    if (activeAuthUnsubscribe) {
      return activeAuthUnsubscribe;
    }

    // Safety timeout: If Firebase auth or Firestore takes longer than 4s (e.g. offline hang),
    // mark initialized so app can proceed smoothly without hanging splash screen indefinitely
    const safetyTimer = setTimeout(() => {
      if (!get().isInitialized) {
        set({ isInitialized: true, loading: false });
        if (resolveProfileReady) {
          resolveProfileReady(get().profile);
          resolveProfileReady = null;
        }
      }
    }, 4000);

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      clearTimeout(safetyTimer);
      if (fbUser) {
        set({ user: fbUser, loading: true });
        try {
          const profileDoc = await getDoc(doc(db, 'users', fbUser.uid));
          let profile: UserProfile;
          if (profileDoc.exists()) {
            profile = profileDoc.data() as UserProfile;
          } else {
            // Default profile if doc doesn't exist yet
            profile = {
              uid: fbUser.uid,
              displayName: fbUser.displayName || 'Customer',
              email: fbUser.email || '',
              role: 'customer',
              addresses: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            // Seed doc in Firestore so future updates never fail
            setDoc(doc(db, 'users', fbUser.uid), profile).catch(() => {});
          }

          const isDealer = profile.role === 'dealer';
          const isDealerApproved = isDealer && profile.dealerStatus === 'approved';
          const isAdmin = profile.role === 'admin';

          set({
            user: fbUser,
            profile,
            isAuthenticated: true,
            isDealer,
            isDealerApproved,
            isAdmin,
            loading: false,
            isInitialized: true,
          });

          // Sync cart dealer prices if dealer status was recognized
          useCartStore.getState().syncDealerPrices(isDealerApproved);

          if (resolveProfileReady) {
            resolveProfileReady(profile);
            resolveProfileReady = null;
          }
        } catch (err) {
          console.warn('[authStore] Profile fetch fallback:', err);
          const fallbackProfile: UserProfile = {
            uid: fbUser.uid,
            displayName: fbUser.displayName || 'Customer',
            email: fbUser.email || '',
            role: 'customer',
            addresses: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          set({
            user: fbUser,
            profile: fallbackProfile,
            isAuthenticated: true,
            isDealer: false,
            isDealerApproved: false,
            isAdmin: false,
            loading: false,
            isInitialized: true,
          });
          if (resolveProfileReady) {
            resolveProfileReady(fallbackProfile);
            resolveProfileReady = null;
          }
        }
      } else {
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          isDealer: false,
          isDealerApproved: false,
          isAdmin: false,
          loading: false,
          isInitialized: true,
        });
        useCartStore.getState().syncDealerPrices(false);
        if (resolveProfileReady) {
          resolveProfileReady(null);
          resolveProfileReady = null;
        }
      }
    });

    activeAuthUnsubscribe = unsubscribe;
    return unsubscribe;
  },

  signIn: async (email, pass) => {
    set({ loading: true, error: null });
    try {
      const creds = await signInWithEmailAndPassword(auth, email, pass);
      const userDoc = await getDoc(doc(db, 'users', creds.user.uid));
      let profile: UserProfile;
      if (userDoc.exists()) {
        profile = userDoc.data() as UserProfile;
      } else {
        profile = {
          uid: creds.user.uid,
          displayName: creds.user.displayName || 'Customer',
          email: creds.user.email || email,
          role: 'customer',
          addresses: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        // Seed doc in Firestore
        setDoc(doc(db, 'users', creds.user.uid), profile).catch(() => { });
      }
      set({
        user: creds.user,
        profile,
        isAuthenticated: true,
        isDealer: profile.role === 'dealer',
        isDealerApproved: profile.role === 'dealer' && profile.dealerStatus === 'approved',
        isAdmin: profile.role === 'admin',
        loading: false,
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  signUpCustomer: async ({ email, pass, name, phone }) => {
    set({ loading: true, error: null });
    try {
      const creds = await createUserWithEmailAndPassword(auth, email, pass);
      const newProfile: UserProfile = {
        uid: creds.user.uid,
        displayName: name,
        email,
        phone,
        role: 'customer',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'users', creds.user.uid), newProfile);
      set({
        user: creds.user,
        profile: newProfile,
        isAuthenticated: true,
        isDealer: false,
        isDealerApproved: false,
        isAdmin: false,
        loading: false,
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create account';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  applyAsDealer: async ({ email, pass, name, phone, businessName, gstNumber }) => {
    set({ loading: true, error: null });
    try {
      const creds = await createUserWithEmailAndPassword(auth, email, pass);
      const newProfile: UserProfile = {
        uid: creds.user.uid,
        displayName: name,
        email,
        phone,
        role: 'dealer',
        dealerStatus: 'pending',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Store in users collection
      await setDoc(doc(db, 'users', creds.user.uid), {
        ...newProfile,
        businessName,
        gstNumber: gstNumber || null,
      });
      set({
        user: creds.user,
        profile: newProfile,
        isAuthenticated: true,
        isDealer: true,
        isDealerApproved: false,
        isAdmin: false,
        loading: false,
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to register dealer application';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await fbSignOut(auth);
    } finally {
      set({
        user: null,
        profile: null,
        isAuthenticated: false,
        isDealer: false,
        isDealerApproved: false,
        isAdmin: false,
        loading: false,
        isInitialized: true,
      });
      useCartStore.getState().syncDealerPrices(false);
    }
  },

  refreshProfile: async () => {
    const currentUser = get().user;
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        set({
          profile,
          isDealer: profile.role === 'dealer',
          isDealerApproved: profile.role === 'dealer' && profile.dealerStatus === 'approved',
          isAdmin: profile.role === 'admin',
        });
      }
    } catch {
      // Ignore
    }
  },

  updateUserProfile: async (params: { displayName?: string; phone?: string }) => {
    const currentUser = get().user;
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      const trimmedName = params.displayName !== undefined ? params.displayName.trim() : undefined;
      const trimmedPhone = params.phone !== undefined ? params.phone.trim() : undefined;

      // Update Firebase Auth display name if provided
      if (trimmedName && currentUser) {
        try {
          await updateProfile(currentUser, { displayName: trimmedName });
        } catch {
          // Non-critical if auth updateProfile fails
        }
      }

      if (!userSnap.exists()) {
        // Create full initial document in Firestore if it did not exist yet
        const initialProfile: UserProfile = {
          uid: currentUser.uid,
          displayName: trimmedName || currentUser.displayName || 'Customer',
          email: currentUser.email || '',
          phone: trimmedPhone || '',
          role: 'customer',
          addresses: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userRef, initialProfile);
        set({ profile: initialProfile });
        return { success: true };
      }

      // Document exists: merge updated fields
      const updates: Record<string, any> = {
        updatedAt: new Date().toISOString(),
      };
      if (trimmedName !== undefined) updates.displayName = trimmedName;
      if (trimmedPhone !== undefined) updates.phone = trimmedPhone;

      await setDoc(userRef, updates, { merge: true });
      if (get().profile) {
        set({ profile: { ...get().profile!, ...updates } });
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      return { success: false, error: msg };
    }
  },

  saveAddress: async (address: Address) => {
    const currentUser = get().user;
    if (!currentUser) return { success: false, error: 'Not authenticated' };
    try {
      const currentAddresses = get().profile?.addresses || [];
      const trimmedLine1 = address.addressLine1.trim().toLowerCase();
      const trimmedPin = address.pincode.trim();
      const trimmedCity = address.city.trim().toLowerCase();

      const existingIndex = currentAddresses.findIndex(
        (a) =>
          a.id === address.id ||
          (a.addressLine1.trim().toLowerCase() === trimmedLine1 &&
            a.pincode.trim() === trimmedPin &&
            a.city.trim().toLowerCase() === trimmedCity)
      );

      let updatedAddresses: Address[];
      if (existingIndex >= 0) {
        updatedAddresses = [...currentAddresses];
        updatedAddresses[existingIndex] = {
          ...currentAddresses[existingIndex],
          ...address,
          id: currentAddresses[existingIndex].id, // preserve existing id
        };
      } else {
        updatedAddresses = [
          ...currentAddresses,
          {
            ...address,
            id: address.id || `addr-${Date.now()}`,
          },
        ];
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userRef,
        {
          addresses: updatedAddresses,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (get().profile) {
        set({ profile: { ...get().profile!, addresses: updatedAddresses } });
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save address';
      return { success: false, error: msg };
    }
  },

  clearError: () => set({ error: null }),

  setPendingAction: (action) => set({ pendingAction: action }),

  clearPendingAction: () => set({ pendingAction: null }),

  executePendingAction: (router) => {
    const { pendingAction, isDealerApproved } = get();
    if (!pendingAction) return false;

    const { type, product, quantity = 1, returnUrl, bookingData } = pendingAction;
    set({ pendingAction: null });

    if (type === 'ADD_TO_CART' && product) {
      useCartStore.getState().addItem(product, quantity, isDealerApproved);
      if (returnUrl) {
        router.replace(returnUrl as any);
      } else {
        router.replace({ pathname: '/product/[id]', params: { id: product.id } } as any);
      }
      return true;
    }

    if (type === 'BUY_NOW' && product) {
      const unitPrice =
        isDealerApproved && product.dealerPrice
          ? product.dealerPrice
          : (product.customerPrice ?? product.price ?? 0);
      const initialQty = Math.max(1, quantity);
      const maxLimit = product.stockStatus === 'limited' ? 5 : 10;
      const validQty = Math.min(initialQty, maxLimit);
      const checkoutItem: CartItem = {
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        price: unitPrice,
        unitPrice,
        totalPrice: unitPrice * validQty,
        quantity: validQty,
        maxQuantity: maxLimit,
        product,
      };
      useCheckoutStore.getState().initCheckout([checkoutItem], 'buy_now');
      router.replace('/checkout' as any);
      return true;
    }

    if (type === 'PROCEED_TO_CHECKOUT' || type === 'PLACE_ORDER') {
      const cartItems = useCartStore.getState().items;
      if (cartItems.length > 0) {
        useCheckoutStore.getState().initCheckout(cartItems, 'cart');
      }
      router.replace('/checkout' as any);
      return true;
    }

    if (type === 'BOOK_SERVICE') {
      router.replace({
        pathname: '/service/book',
        params: bookingData ? (bookingData as any) : {},
      } as any);
      return true;
    }

    if (returnUrl) {
      router.replace(returnUrl as any);
      return true;
    }

    return false;
  },
}));
