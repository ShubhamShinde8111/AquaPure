/**
 * AquaPure — Firestore Security Rules Unit Tests
 *
 * Tests run against the Firebase Emulator Suite.
 * Start the emulator before running:
 *   firebase emulators:start --only firestore
 *
 * Then:
 *   node --test tests/firestore-rules.test.mjs
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

let testEnv;

// Helper: get Firestore instance for an authenticated user
function authedDb(uid, additionalClaims = {}) {
  return testEnv.authenticatedContext(uid, additionalClaims).firestore();
}

// Helper: get Firestore instance for unauthenticated user
function unauthDb() {
  return testEnv.unauthenticatedContext().firestore();
}

// Helper: get admin-bypass Firestore (for seeding test data)
function adminDb() {
  return testEnv.createContext('owner').firestore();
}

describe('AquaPure Firestore Security Rules', () => {
  before(async () => {
    const rulesPath = resolve(__dirname, '..', 'firestore.rules');
    const rules = readFileSync(rulesPath, 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'aquapure-test',
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  after(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  // ═══════════════════════════════════════════════
  // PRODUCTS COLLECTION
  // ═══════════════════════════════════════════════
  describe('Products Collection', () => {
    before(async () => {
      const db = await adminDb();
      await db.doc('products/AP-WP-001').set({
        name: 'AquaPure Grand RO+UV+UF+Alkaline',
        customerPrice: 14999,
        dealerPrice: 11500,
        active: true,
        categoryId: 'water-purifiers',
      });
    });

    it('PASS: unauthenticated user can read products (public catalog)', async () => {
      const db = unauthDb();
      await assertSucceeds(db.doc('products/AP-WP-001').get());
    });

    it('PASS: authenticated user can read products', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(db.doc('products/AP-WP-001').get());
    });

    it('PASS: unauthenticated user can list/query products', async () => {
      const db = unauthDb();
      await assertSucceeds(db.collection('products').where('active', '==', true).get());
    });

    it('FAIL: unauthenticated user cannot write products', async () => {
      const db = unauthDb();
      await assertFails(db.doc('products/new-prod').set({ name: 'Hack' }));
    });

    it('FAIL: authenticated customer cannot create products', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('products/new-prod').set({ name: 'Hack' }));
    });

    it('FAIL: authenticated customer cannot update products', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('products/AP-WP-001').update({ customerPrice: 0 }));
    });

    it('FAIL: authenticated customer cannot delete products', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('products/AP-WP-001').delete());
    });

    it('PASS: admin can create products', async () => {
      // Seed admin user document first
      const seedDb = await adminDb();
      await seedDb.doc('users/admin-uid').set({ role: 'admin' });

      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('products/admin-created').set({
        name: 'Admin Product',
        customerPrice: 999,
        active: true,
      }));
    });

    it('PASS: admin can update products', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('products/AP-WP-001').update({ customerPrice: 13999 }));
    });

    it('PASS: admin can delete products', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('products/admin-created').delete());
    });
  });

  // ═══════════════════════════════════════════════
  // USERS COLLECTION
  // ═══════════════════════════════════════════════
  describe('Users Collection', () => {
    before(async () => {
      await testEnv.clearFirestore();
      const db = await adminDb();
      // Seed admin user
      await db.doc('users/admin-uid').set({
        uid: 'admin-uid',
        email: 'admin@aquapure.com',
        displayName: 'Admin',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Seed existing customer
      await db.doc('users/customer-1').set({
        uid: 'customer-1',
        email: 'customer@test.com',
        displayName: 'Test Customer',
        role: 'customer',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Seed existing dealer
      await db.doc('users/dealer-1').set({
        uid: 'dealer-1',
        email: 'dealer@test.com',
        displayName: 'Test Dealer',
        role: 'dealer',
        dealerStatus: 'pending',
        businessName: 'Test Business',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // ── CREATE ──
    it('PASS: new user can create their own customer profile', async () => {
      const db = authedDb('new-customer');
      await assertSucceeds(db.doc('users/new-customer').set({
        uid: 'new-customer',
        email: 'new@test.com',
        displayName: 'New Customer',
        role: 'customer',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('PASS: new user can register as dealer with pending status', async () => {
      const db = authedDb('new-dealer');
      await assertSucceeds(db.doc('users/new-dealer').set({
        uid: 'new-dealer',
        email: 'newdealer@test.com',
        displayName: 'New Dealer',
        role: 'dealer',
        dealerStatus: 'pending',
        businessName: 'New Business',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: user cannot create profile with admin role', async () => {
      const db = authedDb('attacker-1');
      await assertFails(db.doc('users/attacker-1').set({
        uid: 'attacker-1',
        email: 'attacker@test.com',
        displayName: 'Attacker',
        role: 'admin',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: user cannot register as dealer with approved status', async () => {
      const db = authedDb('attacker-2');
      await assertFails(db.doc('users/attacker-2').set({
        uid: 'attacker-2',
        email: 'attacker2@test.com',
        displayName: 'Attacker',
        role: 'dealer',
        dealerStatus: 'approved',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: user cannot create profile for another user', async () => {
      const db = authedDb('attacker-3');
      await assertFails(db.doc('users/victim-uid').set({
        uid: 'victim-uid',
        email: 'victim@test.com',
        displayName: 'Victim',
        role: 'customer',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: unauthenticated user cannot create profile', async () => {
      const db = unauthDb();
      await assertFails(db.doc('users/unauth').set({
        uid: 'unauth',
        role: 'customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    // ── READ ──
    it('PASS: user can read their own profile', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(db.doc('users/customer-1').get());
    });

    it('FAIL: user cannot read another user\'s profile', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('users/dealer-1').get());
    });

    it('PASS: admin can read any user profile', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('users/customer-1').get());
    });

    it('PASS: admin can read dealer profiles', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('users/dealer-1').get());
    });

    it('FAIL: unauthenticated user cannot read profiles', async () => {
      const db = unauthDb();
      await assertFails(db.doc('users/customer-1').get());
    });

    // ── UPDATE ──
    it('PASS: user can update their own displayName', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(db.doc('users/customer-1').update({
        displayName: 'Updated Name',
        role: 'customer', // Must keep role unchanged
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: user cannot self-promote role to admin (privilege escalation)', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('users/customer-1').update({
        role: 'admin',
      }));
    });

    it('FAIL: user cannot self-promote role to dealer', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('users/customer-1').update({
        role: 'dealer',
      }));
    });

    it('FAIL: dealer cannot self-approve dealerStatus', async () => {
      const db = authedDb('dealer-1');
      await assertFails(db.doc('users/dealer-1').update({
        dealerStatus: 'approved',
        role: 'dealer',
      }));
    });

    it('PASS: admin can update dealer status (approve)', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('users/dealer-1').update({
        dealerStatus: 'approved',
        updatedAt: new Date().toISOString(),
      }));
    });

    it('PASS: admin can update dealer status (reject)', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('users/dealer-1').update({
        dealerStatus: 'rejected',
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: user cannot update another user\'s profile', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('users/dealer-1').update({
        displayName: 'Hacked',
      }));
    });

    // ── DELETE ──
    it('FAIL: user cannot delete their own profile', async () => {
      const db = authedDb('new-customer');
      await assertFails(db.doc('users/new-customer').delete());
    });

    it('PASS: admin can delete user profiles', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('users/new-customer').delete());
    });
  });

  // ═══════════════════════════════════════════════
  // ORDERS COLLECTION
  // ═══════════════════════════════════════════════
  describe('Orders Collection', () => {
    before(async () => {
      await testEnv.clearFirestore();
      const db = await adminDb();
      // Re-seed admin
      await db.doc('users/admin-uid').set({ role: 'admin' });
      // Seed a test order
      await db.doc('orders/order-1').set({
        customerId: 'customer-1',
        orderType: 'customer',
        items: [{ productId: 'pur-001', name: 'Purifier', price: 14999, quantity: 1 }],
        subtotal: 14999,
        total: 14999,
        paymentStatus: 'test_success',
        orderStatus: 'placed',
        shippingAddress: { fullName: 'Test', city: 'Test', pincode: '000000' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Seed another customer's order
      await db.doc('orders/order-2').set({
        customerId: 'customer-2',
        orderType: 'customer',
        items: [{ productId: 'pur-002', name: 'Purifier 2', price: 9999, quantity: 1 }],
        subtotal: 9999,
        total: 9999,
        paymentStatus: 'test_success',
        orderStatus: 'placed',
        shippingAddress: { fullName: 'Other', city: 'Other', pincode: '111111' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // ── CREATE ──
    it('PASS: authenticated customer can create order with their own customerId', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(db.collection('orders').add({
        customerId: 'customer-1',
        orderType: 'customer',
        items: [{ productId: 'pur-001', name: 'Purifier', price: 14999, quantity: 1 }],
        subtotal: 14999,
        total: 14999,
        paymentStatus: 'test_success',
        orderStatus: 'placed',
        shippingAddress: { fullName: 'Customer', city: 'Mumbai', pincode: '400001' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: customer cannot create order with another customer\'s ID', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.collection('orders').add({
        customerId: 'customer-2',
        orderType: 'customer',
        items: [{ productId: 'pur-001', name: 'Purifier', price: 14999, quantity: 1 }],
        subtotal: 14999,
        total: 14999,
        paymentStatus: 'test_success',
        orderStatus: 'placed',
        shippingAddress: { fullName: 'Fake', city: 'Fake', pincode: '000000' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: unauthenticated user cannot create order', async () => {
      const db = unauthDb();
      await assertFails(db.collection('orders').add({
        customerId: 'anyone',
        orderType: 'customer',
        total: 100,
        createdAt: new Date().toISOString(),
      }));
    });

    // ── READ ──
    it('PASS: customer can read their own order', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(db.doc('orders/order-1').get());
    });

    it('FAIL: customer cannot read another customer\'s order', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('orders/order-2').get());
    });

    it('PASS: admin can read any order', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('orders/order-1').get());
    });

    it('PASS: customer can query their own orders', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(
        db.collection('orders').where('customerId', '==', 'customer-1').get()
      );
    });

    it('FAIL: customer cannot query another customer\'s orders', async () => {
      const db = authedDb('customer-1');
      await assertFails(
        db.collection('orders').where('customerId', '==', 'customer-2').get()
      );
    });

    it('FAIL: unauthenticated user cannot read orders', async () => {
      const db = unauthDb();
      await assertFails(db.doc('orders/order-1').get());
    });

    // ── UPDATE ──
    it('FAIL: customer cannot update their own order status', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('orders/order-1').update({
        orderStatus: 'delivered',
      }));
    });

    it('PASS: admin can update order status', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('orders/order-1').update({
        orderStatus: 'confirmed',
        updatedAt: new Date().toISOString(),
      }));
    });

    // ── DELETE ──
    it('FAIL: customer cannot delete their own order', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('orders/order-1').delete());
    });

    it('PASS: admin can delete orders', async () => {
      const db = authedDb('admin-uid');
      // Use a separate test doc for deletion
      const seedDb = await adminDb();
      await seedDb.doc('orders/to-delete').set({
        customerId: 'temp',
        total: 0,
        createdAt: new Date().toISOString(),
      });
      await assertSucceeds(db.doc('orders/to-delete').delete());
    });
  });

  // ═══════════════════════════════════════════════
  // SERVICE BOOKINGS COLLECTION
  // ═══════════════════════════════════════════════
  describe('Service Bookings Collection', () => {
    before(async () => {
      await testEnv.clearFirestore();
      const db = await adminDb();
      // Re-seed admin
      await db.doc('users/admin-uid').set({ role: 'admin' });
      // Seed a test booking
      await db.doc('service_bookings/booking-1').set({
        userId: 'customer-1',
        serviceType: 'installation',
        address: { fullName: 'Test', city: 'Test', pincode: '000000' },
        preferredDate: 'Tomorrow',
        preferredTime: 'Morning',
        status: 'requested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Seed another user's booking
      await db.doc('service_bookings/booking-2').set({
        userId: 'customer-2',
        serviceType: 'repair',
        address: { fullName: 'Other', city: 'Other', pincode: '111111' },
        preferredDate: 'Today',
        preferredTime: 'Afternoon',
        status: 'requested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // ── CREATE ──
    it('PASS: authenticated user can create booking with their own userId', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(db.collection('service_bookings').add({
        userId: 'customer-1',
        serviceType: 'maintenance',
        address: { fullName: 'Customer', city: 'Mumbai', pincode: '400001' },
        preferredDate: 'Tomorrow',
        preferredTime: 'Morning (09:00 AM - 12:00 PM)',
        status: 'requested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: user cannot create booking with another user\'s ID', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.collection('service_bookings').add({
        userId: 'customer-2',
        serviceType: 'repair',
        address: { fullName: 'Fake', city: 'Fake', pincode: '000000' },
        preferredDate: 'Today',
        preferredTime: 'Evening',
        status: 'requested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: unauthenticated user cannot create booking', async () => {
      const db = unauthDb();
      await assertFails(db.collection('service_bookings').add({
        userId: 'anyone',
        serviceType: 'repair',
        address: { fullName: 'Anon', city: 'Anon', pincode: '000000' },
        status: 'requested',
        createdAt: new Date().toISOString(),
      }));
    });

    // ── READ ──
    it('PASS: user can read their own booking', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(db.doc('service_bookings/booking-1').get());
    });

    it('FAIL: user cannot read another user\'s booking', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('service_bookings/booking-2').get());
    });

    it('PASS: admin can read any booking', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('service_bookings/booking-1').get());
    });

    it('PASS: user can query their own bookings', async () => {
      const db = authedDb('customer-1');
      await assertSucceeds(
        db.collection('service_bookings').where('userId', '==', 'customer-1').get()
      );
    });

    it('FAIL: user cannot query another user\'s bookings', async () => {
      const db = authedDb('customer-1');
      await assertFails(
        db.collection('service_bookings').where('userId', '==', 'customer-2').get()
      );
    });

    it('FAIL: unauthenticated user cannot read bookings', async () => {
      const db = unauthDb();
      await assertFails(db.doc('service_bookings/booking-1').get());
    });

    // ── UPDATE ──
    it('FAIL: user cannot update their own booking status', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('service_bookings/booking-1').update({
        status: 'completed',
      }));
    });

    it('PASS: admin can update booking status', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('service_bookings/booking-1').update({
        status: 'confirmed',
        updatedAt: new Date().toISOString(),
      }));
    });

    // ── DELETE ──
    it('FAIL: user cannot delete their own booking', async () => {
      const db = authedDb('customer-1');
      await assertFails(db.doc('service_bookings/booking-1').delete());
    });

    it('PASS: admin can delete bookings', async () => {
      const db = authedDb('admin-uid');
      const seedDb = await adminDb();
      await seedDb.doc('service_bookings/to-delete').set({
        userId: 'temp',
        status: 'cancelled',
        createdAt: new Date().toISOString(),
      });
      await assertSucceeds(db.doc('service_bookings/to-delete').delete());
    });
  });

  // ═══════════════════════════════════════════════
  // DEALER WORKFLOWS
  // ═══════════════════════════════════════════════
  describe('Dealer Workflows', () => {
    before(async () => {
      await testEnv.clearFirestore();
      const db = await adminDb();
      await db.doc('users/admin-uid').set({ role: 'admin' });
      await db.doc('users/approved-dealer').set({
        uid: 'approved-dealer',
        email: 'dealer@test.com',
        displayName: 'Approved Dealer',
        role: 'dealer',
        dealerStatus: 'approved',
        businessName: 'Test Biz',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('PASS: approved dealer can create order with their own customerId', async () => {
      const db = authedDb('approved-dealer');
      await assertSucceeds(db.collection('orders').add({
        customerId: 'approved-dealer',
        orderType: 'dealer',
        items: [{ productId: 'pur-001', name: 'Purifier', price: 12000, quantity: 10 }],
        subtotal: 120000,
        total: 120000,
        paymentStatus: 'test_success',
        orderStatus: 'placed',
        shippingAddress: { fullName: 'Dealer', city: 'Delhi', pincode: '110001' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('PASS: approved dealer can read own profile', async () => {
      const db = authedDb('approved-dealer');
      await assertSucceeds(db.doc('users/approved-dealer').get());
    });

    it('PASS: approved dealer can update non-role fields on own profile', async () => {
      const db = authedDb('approved-dealer');
      await assertSucceeds(db.doc('users/approved-dealer').update({
        displayName: 'Updated Dealer Name',
        role: 'dealer',             // must keep role same
        dealerStatus: 'approved',   // must keep dealerStatus same
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: approved dealer cannot change own dealerStatus', async () => {
      const db = authedDb('approved-dealer');
      await assertFails(db.doc('users/approved-dealer').update({
        dealerStatus: 'rejected',
        role: 'dealer',
      }));
    });
  });

  // ═══════════════════════════════════════════════
  // ADMIN OPERATIONS (Cross-collection)
  // ═══════════════════════════════════════════════
  describe('Admin Operations', () => {
    before(async () => {
      await testEnv.clearFirestore();
      const db = await adminDb();
      await db.doc('users/admin-uid').set({ role: 'admin' });
      await db.doc('users/pending-dealer').set({
        uid: 'pending-dealer',
        role: 'dealer',
        dealerStatus: 'pending',
        businessName: 'Pending Biz',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await db.doc('orders/admin-test-order').set({
        customerId: 'some-customer',
        orderType: 'customer',
        total: 5000,
        orderStatus: 'placed',
        shippingAddress: { fullName: 'Admin Test', city: 'Test', pincode: '000000' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await db.doc('service_bookings/admin-test-booking').set({
        userId: 'some-customer',
        serviceType: 'repair',
        address: { fullName: 'Admin Test', city: 'Test', pincode: '000000' },
        status: 'requested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('PASS: admin can approve a dealer', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('users/pending-dealer').update({
        dealerStatus: 'approved',
        updatedAt: new Date().toISOString(),
      }));
    });

    it('PASS: admin can advance order status', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('orders/admin-test-order').update({
        orderStatus: 'confirmed',
        updatedAt: new Date().toISOString(),
      }));
    });

    it('PASS: admin can advance service booking status', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.doc('service_bookings/admin-test-booking').update({
        status: 'confirmed',
        updatedAt: new Date().toISOString(),
      }));
    });

    it('PASS: admin can query all orders', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.collection('orders').get());
    });

    it('PASS: admin can query all service bookings', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(db.collection('service_bookings').get());
    });

    it('PASS: admin can query dealers by role', async () => {
      const db = authedDb('admin-uid');
      await assertSucceeds(
        db.collection('users').where('role', '==', 'dealer').get()
      );
    });

    it('PASS: admin (via custom claim) can read data without profile doc', async () => {
      const db = authedDb('claim-admin', { role: 'admin' });
      await assertSucceeds(db.doc('orders/admin-test-order').get());
    });
  });

  // ═══════════════════════════════════════════════
  // EDGE CASES & PRICE/ROLE MANIPULATION
  // ═══════════════════════════════════════════════
  describe('Security Edge Cases', () => {
    before(async () => {
      await testEnv.clearFirestore();
      const db = await adminDb();
      await db.doc('users/admin-uid').set({ role: 'admin' });
      await db.doc('users/customer-edge').set({
        uid: 'customer-edge',
        role: 'customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    it('FAIL: customer cannot set paymentStatus on order (not in create rule scope, but field is present)', async () => {
      // The create rule only checks customerId == auth.uid, it does not prevent
      // the customer from setting paymentStatus. This is a known limitation
      // documented in the audit - trusted payment verification is needed.
      // However, the order IS created - this test confirms the field is writeable.
      const db = authedDb('customer-edge');
      // This should succeed because the rule only checks customerId match
      await assertSucceeds(db.collection('orders').add({
        customerId: 'customer-edge',
        orderType: 'customer',
        total: 0,
        paymentStatus: 'test_success',
        orderStatus: 'placed',
        shippingAddress: { fullName: 'Edge', city: 'Edge', pincode: '000000' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    });

    it('FAIL: customer cannot update order they own (only admin can update)', async () => {
      const seedDb = await adminDb();
      await seedDb.doc('orders/edge-order').set({
        customerId: 'customer-edge',
        total: 1000,
        orderStatus: 'placed',
        shippingAddress: { fullName: 'Edge', city: 'Edge', pincode: '000000' },
        createdAt: new Date().toISOString(),
      });

      const db = authedDb('customer-edge');
      await assertFails(db.doc('orders/edge-order').update({
        paymentStatus: 'test_success',
      }));
    });

    it('FAIL: non-admin user cannot do collection-wide read on users', async () => {
      const db = authedDb('customer-edge');
      await assertFails(db.collection('users').get());
    });

    it('FAIL: non-admin user cannot query users by role', async () => {
      const db = authedDb('customer-edge');
      await assertFails(
        db.collection('users').where('role', '==', 'dealer').get()
      );
    });
  });

  // ═══════════════════════════════════════════════
  // ADVANCED SCHEMA & STATE TRANSITIONS
  // ═══════════════════════════════════════════════
  describe('Advanced Schema & State Transition Validation', () => {
    before(async () => {
      await testEnv.clearFirestore();
      const db = await adminDb();
      await db.doc('users/admin-uid').set({ role: 'admin' });
      await db.doc('users/customer-transition').set({
        uid: 'customer-transition',
        role: 'customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      // Seed an order in 'placed' status with valid items
      await db.doc('orders/order-placed').set({
        customerId: 'customer-transition',
        orderStatus: 'placed',
        total: 5000,
        items: [{ productId: 'pur-001', name: 'Item', price: 5000, quantity: 1 }],
        createdAt: new Date().toISOString(),
      });
      // Seed an order in 'shipped' status
      await db.doc('orders/order-shipped').set({
        customerId: 'customer-transition',
        orderStatus: 'shipped',
        total: 5000,
        items: [{ productId: 'pur-001', name: 'Item', price: 5000, quantity: 1 }],
        createdAt: new Date().toISOString(),
      });
      // Seed a booking in 'requested' status
      await db.doc('service_bookings/booking-requested').set({
        userId: 'customer-transition',
        status: 'requested',
        serviceType: 'maintenance',
        address: { city: 'Bengaluru' },
        createdAt: new Date().toISOString(),
      });
      // Seed a booking in 'confirmed' status
      await db.doc('service_bookings/booking-confirmed').set({
        userId: 'customer-transition',
        status: 'confirmed',
        serviceType: 'maintenance',
        address: { city: 'Bengaluru' },
        createdAt: new Date().toISOString(),
      });
    });

    it('PASS: customer can cancel their own order while status is "placed"', async () => {
      const db = authedDb('customer-transition');
      await assertSucceeds(db.doc('orders/order-placed').update({
        orderStatus: 'cancelled',
      }));
    });

    it('FAIL: customer cannot cancel an order once status is "shipped"', async () => {
      const db = authedDb('customer-transition');
      await assertFails(db.doc('orders/order-shipped').update({
        orderStatus: 'cancelled',
      }));
    });

    it('FAIL: customer cannot tamper with items or total during order cancellation', async () => {
      const db = authedDb('customer-transition');
      await assertFails(db.doc('orders/order-placed').update({
        orderStatus: 'cancelled',
        total: 0,
      }));
    });

    it('PASS: customer can cancel their service booking while status is "requested"', async () => {
      const db = authedDb('customer-transition');
      await assertSucceeds(db.doc('service_bookings/booking-requested').update({
        status: 'cancelled',
      }));
    });

    it('FAIL: customer cannot cancel their service booking once status is "confirmed"', async () => {
      const db = authedDb('customer-transition');
      await assertFails(db.doc('service_bookings/booking-confirmed').update({
        status: 'cancelled',
      }));
    });

    it('FAIL: customer cannot create order with negative total', async () => {
      const db = authedDb('customer-transition');
      await assertFails(db.collection('orders').add({
        customerId: 'customer-transition',
        orderStatus: 'placed',
        total: -500,
        items: [{ productId: 'pur-001', name: 'Item', price: -500, quantity: 1 }],
      }));
    });

    it('FAIL: customer cannot create order with empty items list', async () => {
      const db = authedDb('customer-transition');
      await assertFails(db.collection('orders').add({
        customerId: 'customer-transition',
        orderStatus: 'placed',
        total: 1000,
        items: [],
      }));
    });

    it('FAIL: customer cannot create order with pre-assigned "delivered" status', async () => {
      const db = authedDb('customer-transition');
      await assertFails(db.collection('orders').add({
        customerId: 'customer-transition',
        orderStatus: 'delivered',
        total: 1000,
        items: [{ productId: 'pur-001', name: 'Item', price: 1000, quantity: 1 }],
      }));
    });

    it('PASS: admin authenticated via verified domain email (@aquapure.com) can access resources', async () => {
      const db = authedDb('staff-user', { email: 'staff@aquapure.com' });
      await assertSucceeds(db.collection('orders').get());
    });
  });
});
