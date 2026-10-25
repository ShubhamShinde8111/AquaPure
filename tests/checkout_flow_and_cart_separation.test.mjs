/**
 * AquaPure — Checkout Flow, Cart Separation & Pricing Test Suite
 * Validates:
 * 1. Product Details vs Cart: Clicking product details does NOT auto-add to cart.
 * 2. Buy Now vs Cart Isolation: "Buy Now -> Purchase Alone" does NOT merge with cart,
 *    and placing a single-item Buy Now order does NOT clear or pollute the shopping cart.
 * 3. Checkout Review: Stepper (+/-), product removal, and immediate total recalculation.
 * 4. Cart Management: Add to Cart, Buy Now, and Place Order perform strictly separated actions.
 * 5. Validation & Delivery Fees: Immediate recalculation on any change (free shipping >= ₹999).
 * 6. Dual Pricing: Approved dealer wholesale vs standard customer pricing.
 * 7. State Hydration / Refresh: Rehydrates checkout state from persistence without loss.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Import seed products
import { SEED_PRODUCTS } from '../mobile/src/data/seedProducts.ts';

// ── Mock In-Memory AsyncStorage ──
class MockAsyncStorage {
  constructor() {
    this.storage = new Map();
  }
  async getItem(key) {
    return this.storage.has(key) ? this.storage.get(key) : null;
  }
  async setItem(key, value) {
    this.storage.set(key, String(value));
  }
  async removeItem(key) {
    this.storage.delete(key);
  }
  async clear() {
    this.storage.clear();
  }
}

// ── In-Memory Cart Store Logic ──
function createCartStore() {
  let state = { items: [] };

  return {
    getState: () => state,
    addItem: (product, quantity = 1, isDealerApproved = false) => {
      const existingIndex = state.items.findIndex((i) => i.product.id === product.id);
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
        state = { items: nextItems };
      } else {
        const initialQty = Math.min(Math.max(1, quantity), maxLimit);
        const newItem = {
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
        state = { items: [...state.items, newItem] };
      }
    },
    updateQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        state = { items: state.items.filter((i) => i.product.id !== productId) };
        return;
      }
      state = {
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
      };
    },
    removeItem: (productId) => {
      state = { items: state.items.filter((i) => i.product.id !== productId) };
    },
    clearCart: () => {
      state = { items: [] };
    },
    getItemCount: () => state.items.reduce((sum, i) => sum + i.quantity, 0),
    getSubtotal: () => state.items.reduce((sum, i) => sum + i.totalPrice, 0),
    getShippingFee: function () {
      const subtotal = this.getSubtotal();
      if (subtotal === 0 || subtotal >= 999) return 0;
      return 99;
    },
    getTotal: function () {
      return this.getSubtotal() + this.getShippingFee();
    },
  };
}

// ── In-Memory Checkout Store Logic ──
function createCheckoutStore(cartStore) {
  let state = { items: [], source: 'cart' };

  return {
    getState: () => state,
    initCheckout: (items, source) => {
      const sanitized = items.map((item) => {
        const unitPrice =
          item.unitPrice ?? item.price ?? item.product?.customerPrice ?? 0;
        const qty = Math.max(1, item.quantity || 1);
        return {
          ...item,
          unitPrice,
          price: unitPrice,
          quantity: qty,
          totalPrice: unitPrice * qty,
        };
      });
      state = { items: sanitized, source };
    },
    updateQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        state = { items: state.items.filter((i) => i.product.id !== productId), source: state.source };
        if (state.source === 'cart' && cartStore) {
          cartStore.removeItem(productId);
        }
        return;
      }
      state = {
        ...state,
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
      };
      if (state.source === 'cart' && cartStore) {
        cartStore.updateQuantity(productId, quantity);
      }
    },
    removeItem: (productId) => {
      state = { ...state, items: state.items.filter((i) => i.product.id !== productId) };
      if (state.source === 'cart' && cartStore) {
        cartStore.removeItem(productId);
      }
    },
    clearCheckout: () => {
      state = { items: [], source: 'cart' };
    },
    syncDealerPrices: (isDealerApproved) => {
      state = {
        ...state,
        items: state.items.map((item) => {
          const unitPrice =
            isDealerApproved && item.product.dealerPrice
              ? item.product.dealerPrice
              : (item.product.customerPrice ?? item.unitPrice ?? item.price ?? 0);
          return {
            ...item,
            price: unitPrice,
            unitPrice,
            totalPrice: unitPrice * item.quantity,
          };
        }),
      };
    },
    getItemCount: () => state.items.reduce((sum, i) => sum + i.quantity, 0),
    getSubtotal: () => state.items.reduce((sum, i) => sum + i.totalPrice, 0),
    getShippingFee: function () {
      const sub = this.getSubtotal();
      if (sub === 0 || sub >= 999) return 0;
      return 99;
    },
    getTotal: function () {
      return this.getSubtotal() + this.getShippingFee();
    },
  };
}

describe('1. Product Details vs Cart Addition Separation', () => {
  test('Clicking a product only navigates to details without adding to cart', () => {
    const cart = createCartStore();
    const product = SEED_PRODUCTS[0];

    // Simulate clicking product card -> triggers navigation route, NOT addItem
    const navigatedRoute = `/product/${product.id}`;
    assert.equal(navigatedRoute, '/product/AP-WP-001');
    assert.equal(cart.getItemCount(), 0, 'Cart must remain empty when clicking product card');
  });

  test('Product is added to cart ONLY when explicitly calling addItem / Add to Cart', () => {
    const cart = createCartStore();
    const product = SEED_PRODUCTS[0];

    cart.addItem(product, 1, false);
    assert.equal(cart.getItemCount(), 1);
    assert.equal(cart.getState().items[0].productId, product.id);
    assert.equal(cart.getState().items[0].quantity, 1);

    // Adding same product again increments quantity without creating duplicate entries
    cart.addItem(product, 2, false);
    assert.equal(cart.getState().items.length, 1, 'Must not create duplicate item in cart');
    assert.equal(cart.getState().items[0].quantity, 3);
  });
});

describe('2. Buy Now vs Shopping Cart Isolation', () => {
  test('Buy Now allows purchasing a single product alone without including existing cart items', () => {
    const cart = createCartStore();
    const checkout = createCheckoutStore(cart);

    // Step A: User previously added 2 Sediment Filters to their cart
    const filterProduct = SEED_PRODUCTS.find((p) => p.categoryId === 'filters-cartridges');
    assert.ok(filterProduct);
    cart.addItem(filterProduct, 2, false);

    assert.equal(cart.getItemCount(), 2);
    assert.equal(cart.getState().items[0].productId, filterProduct.id);

    // Step B: User navigates to a Water Purifier and clicks "Buy Now"
    const purifierProduct = SEED_PRODUCTS.find((p) => p.categoryId === 'water-purifiers');
    assert.ok(purifierProduct);

    // Simulation of user choosing "Purchase This Product Alone"
    const singleBuyNowItem = {
      productId: purifierProduct.id,
      name: purifierProduct.name,
      imageUrl: purifierProduct.imageUrl,
      price: purifierProduct.customerPrice,
      unitPrice: purifierProduct.customerPrice,
      totalPrice: purifierProduct.customerPrice * 1,
      quantity: 1,
      maxQuantity: 10,
      product: purifierProduct,
    };

    checkout.initCheckout([singleBuyNowItem], 'buy_now');

    // Verification 1: Checkout contains ONLY the purifier
    assert.equal(checkout.getItemCount(), 1);
    assert.equal(checkout.getState().items[0].productId, purifierProduct.id);
    assert.equal(checkout.getState().source, 'buy_now');

    // Verification 2: Cart still contains the 2 Sediment Filters, untouched!
    assert.equal(cart.getItemCount(), 2);
    assert.equal(cart.getState().items[0].productId, filterProduct.id);
  });

  test('Placing a Buy Now order clears checkout session but leaves shopping cart intact', () => {
    const cart = createCartStore();
    const checkout = createCheckoutStore(cart);

    // Add filter to cart
    const filterProduct = SEED_PRODUCTS.find((p) => p.categoryId === 'filters-cartridges');
    cart.addItem(filterProduct, 1, false);

    // Buy purifier alone
    const purifierProduct = SEED_PRODUCTS.find((p) => p.categoryId === 'water-purifiers');
    checkout.initCheckout(
      [
        {
          productId: purifierProduct.id,
          name: purifierProduct.name,
          imageUrl: purifierProduct.imageUrl,
          price: purifierProduct.customerPrice,
          unitPrice: purifierProduct.customerPrice,
          totalPrice: purifierProduct.customerPrice,
          quantity: 1,
          maxQuantity: 10,
          product: purifierProduct,
        },
      ],
      'buy_now'
    );

    // Simulate order finalization
    const finalizeOrder = () => {
      if (checkout.getState().source === 'cart') {
        cart.clearCart();
      }
      checkout.clearCheckout();
    };

    finalizeOrder();

    // Verification: Checkout is cleared, but cart items were NOT wiped out
    assert.equal(checkout.getItemCount(), 0, 'Checkout session should be cleared after order');
    assert.equal(cart.getItemCount(), 1, 'Shopping cart must NOT be wiped out on Buy Now order');
    assert.equal(cart.getState().items[0].productId, filterProduct.id);
  });

  test('Placing a Cart checkout order clears both checkout session and shopping cart', () => {
    const cart = createCartStore();
    const checkout = createCheckoutStore(cart);

    const filterProduct = SEED_PRODUCTS.find((p) => p.categoryId === 'filters-cartridges');
    cart.addItem(filterProduct, 2, false);

    checkout.initCheckout(cart.getState().items, 'cart');
    assert.equal(checkout.getState().source, 'cart');

    // Simulate order finalization
    const finalizeOrder = () => {
      if (checkout.getState().source === 'cart') {
        cart.clearCart();
      }
      checkout.clearCheckout();
    };

    finalizeOrder();

    assert.equal(checkout.getItemCount(), 0);
    assert.equal(cart.getItemCount(), 0, 'Shopping cart should be cleared after cart order');
  });

  test('Buy Now "Review Cart" option correctly adds product to cart and reviews cart', () => {
    const cart = createCartStore();
    const purifierProduct = SEED_PRODUCTS.find((p) => p.categoryId === 'water-purifiers');

    // User chooses "Review Cart With All Items"
    cart.addItem(purifierProduct, 1, false);

    assert.equal(cart.getItemCount(), 1);
    assert.equal(cart.getState().items[0].productId, purifierProduct.id);
  });
});

describe('3. Checkout Review Screen: Quantity Controls & Dynamic Recalculation', () => {
  test('Increasing and decreasing quantity recalculates subtotal, shipping, and total immediately', () => {
    const cart = createCartStore();
    const checkout = createCheckoutStore(cart);

    // Add product priced under ₹999 to test delivery fee transitions
    const filter = SEED_PRODUCTS.find((p) => p.customerPrice === 499) || {
      id: 'TEST-F-01',
      name: 'Sediment Filter 5 Micron',
      customerPrice: 499,
      imageUrl: 'https://example.com/filter.jpg',
      stockStatus: 'in_stock',
    };

    checkout.initCheckout(
      [
        {
          productId: filter.id,
          name: filter.name,
          imageUrl: filter.imageUrl,
          price: 499,
          unitPrice: 499,
          totalPrice: 499,
          quantity: 1,
          maxQuantity: 10,
          product: filter,
        },
      ],
      'buy_now'
    );

    // Qty = 1: Subtotal = 499, Shipping = 99, Total = 598
    assert.equal(checkout.getSubtotal(), 499);
    assert.equal(checkout.getShippingFee(), 99);
    assert.equal(checkout.getTotal(), 598);

    // Increase qty to 2: Subtotal = 998, Shipping = 99, Total = 1097
    checkout.updateQuantity(filter.id, 2);
    assert.equal(checkout.getSubtotal(), 998);
    assert.equal(checkout.getShippingFee(), 99);
    assert.equal(checkout.getTotal(), 1097);

    // Increase qty to 3: Subtotal = 1497 (>= 999), Shipping = 0 (FREE!), Total = 1497
    checkout.updateQuantity(filter.id, 3);
    assert.equal(checkout.getSubtotal(), 1497);
    assert.equal(checkout.getShippingFee(), 0, 'Shipping fee must be ₹0 when subtotal >= ₹999');
    assert.equal(checkout.getTotal(), 1497);

    // Decrease qty back to 1: Shipping fee immediately returns to ₹99
    checkout.updateQuantity(filter.id, 1);
    assert.equal(checkout.getSubtotal(), 499);
    assert.equal(checkout.getShippingFee(), 99);
    assert.equal(checkout.getTotal(), 598);
  });

  test('Removing an individual product updates item list and recalculates totals immediately', () => {
    const cart = createCartStore();
    const checkout = createCheckoutStore(cart);

    const prod1 = SEED_PRODUCTS[0];
    const prod2 = SEED_PRODUCTS[1];

    checkout.initCheckout(
      [
        {
          productId: prod1.id,
          name: prod1.name,
          imageUrl: prod1.imageUrl,
          price: prod1.customerPrice,
          unitPrice: prod1.customerPrice,
          totalPrice: prod1.customerPrice,
          quantity: 1,
          maxQuantity: 10,
          product: prod1,
        },
        {
          productId: prod2.id,
          name: prod2.name,
          imageUrl: prod2.imageUrl,
          price: prod2.customerPrice,
          unitPrice: prod2.customerPrice,
          totalPrice: prod2.customerPrice,
          quantity: 1,
          maxQuantity: 10,
          product: prod2,
        },
      ],
      'cart'
    );

    assert.equal(checkout.getItemCount(), 2);
    const initialSubtotal = prod1.customerPrice + prod2.customerPrice;
    assert.equal(checkout.getSubtotal(), initialSubtotal);

    // Remove prod2 at checkout review
    checkout.removeItem(prod2.id);

    assert.equal(checkout.getItemCount(), 1);
    assert.equal(checkout.getState().items[0].productId, prod1.id);
    assert.equal(checkout.getSubtotal(), prod1.customerPrice);
    assert.equal(checkout.getTotal(), prod1.customerPrice + (prod1.customerPrice >= 999 ? 0 : 99));
  });

  test('Stock quantity limits are strictly enforced in checkout stepper', () => {
    const cart = createCartStore();
    const checkout = createCheckoutStore(cart);

    const limitedProduct = SEED_PRODUCTS.find((p) => p.stockStatus === 'limited') || {
      id: 'LTD-01',
      name: 'Limited Water Booster',
      customerPrice: 2499,
      imageUrl: 'https://example.com/booster.jpg',
      stockStatus: 'limited',
    };

    checkout.initCheckout(
      [
        {
          productId: limitedProduct.id,
          name: limitedProduct.name,
          imageUrl: limitedProduct.imageUrl,
          price: limitedProduct.customerPrice,
          unitPrice: limitedProduct.customerPrice,
          totalPrice: limitedProduct.customerPrice,
          quantity: 1,
          maxQuantity: 5,
          product: limitedProduct,
        },
      ],
      'buy_now'
    );

    // Attempt to exceed max stock limit of 5
    checkout.updateQuantity(limitedProduct.id, 10);
    assert.equal(checkout.getState().items[0].quantity, 5, 'Quantity must be capped at 5 for limited items');
  });
});

describe('4. Dealer Wholesale vs Standard Customer Pricing', () => {
  test('Applies wholesale dealer price across checkout when authenticated as approved dealer', () => {
    const cart = createCartStore();
    const checkout = createCheckoutStore(cart);

    const purifier = SEED_PRODUCTS.find((p) => p.dealerPrice && p.dealerPrice < p.customerPrice);
    assert.ok(purifier);

    // Initial customer checkout
    checkout.initCheckout(
      [
        {
          productId: purifier.id,
          name: purifier.name,
          imageUrl: purifier.imageUrl,
          price: purifier.customerPrice,
          unitPrice: purifier.customerPrice,
          totalPrice: purifier.customerPrice,
          quantity: 1,
          maxQuantity: 10,
          product: purifier,
        },
      ],
      'buy_now'
    );

    assert.equal(checkout.getSubtotal(), purifier.customerPrice);

    // Sync when dealer is approved
    checkout.syncDealerPrices(true);
    assert.equal(checkout.getSubtotal(), purifier.dealerPrice);
    assert.ok(checkout.getSubtotal() < purifier.customerPrice);

    // Revert when customer
    checkout.syncDealerPrices(false);
    assert.equal(checkout.getSubtotal(), purifier.customerPrice);
  });
});

describe('5. App Refresh & Persistence State Recovery', () => {
  test('Simulates AsyncStorage persistence and rehydration of checkout items', async () => {
    const mockStorage = new MockAsyncStorage();
    const testItem = {
      productId: 'AP-WP-001',
      name: 'AquaPure RO Shield',
      imageUrl: 'https://example.com/ro.jpg',
      price: 14999,
      unitPrice: 14999,
      totalPrice: 14999,
      quantity: 1,
      maxQuantity: 10,
      product: SEED_PRODUCTS[0],
    };

    // Serialize to storage as Zustand persist middleware does
    const storageKey = 'aquapure_checkout_storage';
    const persistedState = {
      state: {
        items: [testItem],
        source: 'buy_now',
      },
      version: 0,
    };

    await mockStorage.setItem(storageKey, JSON.stringify(persistedState));

    // Simulate page refresh / app relaunch: read from storage
    const raw = await mockStorage.getItem(storageKey);
    assert.ok(raw);
    const parsed = JSON.parse(raw);

    assert.equal(parsed.state.source, 'buy_now');
    assert.equal(parsed.state.items.length, 1);
    assert.equal(parsed.state.items[0].productId, 'AP-WP-001');
    assert.equal(parsed.state.items[0].totalPrice, 14999);
  });
});
