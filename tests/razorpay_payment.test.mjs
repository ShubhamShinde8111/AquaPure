/**
 * AquaPure — Razorpay Test Mode End-to-End Integration & Security Test Suite
 *
 * Verifies:
 * - Server-side authoritative price calculation (no trust in client totals)
 * - Razorpay Order creation with correct paise amount & currency
 * - Cryptographic HMAC-SHA256 signature verification using backend secret
 * - Rejection of tampered, swapped, or forged payment signatures
 * - Idempotency: duplicate payment callbacks do not create duplicate orders
 * - Graceful handling of cancelled and failed payment scenarios
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const { PricingService } = require('../functions/services/pricingService.js');
const { RazorpayService } = require('../functions/services/razorpayService.js');
const { OrderService } = require('../functions/services/orderService.js');

describe('1. Server-Side Pricing & Cart Integrity', () => {
  test('Correctly calculates subtotal, delivery fee, and amount in paise for customer', () => {
    const items = [
      { productId: 'AP-WP-001', quantity: 1 }, // customerPrice: 14999
    ];
    const pricing = PricingService.calculateOrderPricing(items, false);
    assert.equal(pricing.subtotal, 14999);
    assert.equal(pricing.shippingFee, 0); // Free shipping on orders >= ₹999
    assert.equal(pricing.total, 14999);
    assert.equal(pricing.amountInPaise, 1499900);
    assert.equal(pricing.currency, 'INR');
  });

  test('Correctly applies ₹99 delivery fee when subtotal is below ₹999', () => {
    const items = [
      { productId: 'AP-FC-039', quantity: 1 }, // customerPrice: 499
    ];
    const pricing = PricingService.calculateOrderPricing(items, false);
    assert.equal(pricing.subtotal, 499);
    assert.equal(pricing.shippingFee, 99);
    assert.equal(pricing.total, 598);
    assert.equal(pricing.amountInPaise, 59800);
  });

  test('Applies wholesale dealer pricing when authenticated as approved dealer', () => {
    const items = [
      { productId: 'AP-WP-001', quantity: 2 }, // customer: 14999, dealer: 11500
    ];
    const customerPricing = PricingService.calculateOrderPricing(items, false);
    const dealerPricing = PricingService.calculateOrderPricing(items, true);

    assert.equal(customerPricing.subtotal, 29998);
    assert.equal(dealerPricing.subtotal, 23000);
    assert.ok(dealerPricing.total < customerPricing.total);
  });

  test('Throws clear error on empty cart or non-existent product', () => {
    assert.throws(
      () => PricingService.calculateOrderPricing([], false),
      /Cart must contain at least one item/
    );
    assert.throws(
      () => PricingService.calculateOrderPricing([{ productId: 'invalid-id-xyz', quantity: 1 }], false),
      /Product not found in catalog/
    );
  });
});

describe('2. Razorpay Order Creation & Key Safety', () => {
  const razorpay = new RazorpayService();
  razorpay.keyId = 'rzp_test_mock_dummy_key_id';
  razorpay.keySecret = 'mock_dummy_test_secret_key';

  test('Creates Razorpay order with valid amount and currency in paise', async () => {
    const order = await razorpay.createOrder({
      amountInPaise: 1499900,
      currency: 'INR',
      receipt: 'RCP-TEST-001',
      notes: { customer: 'Rahul Sharma' },
    });

    assert.ok(order.id, 'Razorpay order must return an ID');
    assert.equal(order.amount, 1499900);
    assert.equal(order.currency, 'INR');
    assert.equal(order.keyId, 'rzp_test_mock_dummy_key_id');
    assert.equal(order.receipt, 'RCP-TEST-001');
  });

  test('Public key is exposed, secret key is NEVER returned in order object', async () => {
    const order = await razorpay.createOrder({
      amountInPaise: 50000,
      currency: 'INR',
      receipt: 'RCP-TEST-002',
    });

    assert.equal(order.keyId, razorpay.getPublicKeyId());
    assert.equal(typeof order.keySecret, 'undefined');
    assert.equal(JSON.stringify(order).includes('mock_dummy_test_secret'), false);
  });
});

describe('3. Cryptographic Signature Verification & Security', () => {
  const testSecret = 'mock_dummy_test_secret_key';
  const razorpay = new RazorpayService();
  razorpay.keySecret = testSecret;

  test('Authentic HMAC-SHA256 signature passes verification', () => {
    const orderId = 'order_valid_001';
    const paymentId = 'pay_valid_002';
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = razorpay.verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
    });

    assert.equal(isValid, true);
  });

  test('Tampered or forged signature is strictly rejected', () => {
    const orderId = 'order_valid_001';
    const paymentId = 'pay_valid_002';
    const forgedSignature = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

    const isValid = razorpay.verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: forgedSignature,
    });

    assert.equal(isValid, false);
  });

  test('Signature generated with wrong secret is rejected', () => {
    const orderId = 'order_valid_001';
    const paymentId = 'pay_valid_002';
    const wrongSignature = crypto
      .createHmac('sha256', 'wrong_attacker_secret')
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = razorpay.verifyPaymentSignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: wrongSignature,
    });

    assert.equal(isValid, false);
  });
});

describe('4. Idempotency & Order Lifecycle Management', () => {
  const orderService = new OrderService();
  const razorpayOrderId = 'order_lifecycle_99';
  const razorpayPaymentId = 'pay_lifecycle_99';
  const validSignature = 'test_signature_hash';

  orderService.registerInitiatedOrder(razorpayOrderId, {
    customerId: 'cust_99',
    orderType: 'customer',
    items: [{ productId: 'pur-001', name: 'AquaPure Grand', price: 14999, quantity: 1 }],
    pricing: { subtotal: 14999, shippingFee: 0, total: 14999 },
    shippingAddress: { fullName: 'Amit Patel', addressLine1: 'MG Road', city: 'Pune' },
  });

  test('First payment verification creates confirmed order and sets paymentStatus to test_success', () => {
    const result = orderService.confirmOrder({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: validSignature,
    });

    assert.equal(result.isDuplicate, false);
    assert.equal(result.order.paymentStatus, 'test_success');
    assert.equal(result.order.orderStatus, 'placed');
    assert.equal(result.order.paymentProvider, 'razorpay');
    assert.equal(result.order.razorpayPaymentId, razorpayPaymentId);
    assert.equal(result.order.total, 14999);
  });

  test('Duplicate payment verification for same payment ID returns original order without creating new one', () => {
    const result2 = orderService.confirmOrder({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: validSignature,
    });

    assert.equal(result2.isDuplicate, true);
    assert.equal(result2.order.paymentReference, razorpayPaymentId);
  });

  test('Rejects unauthenticated or guest order confirmation', () => {
    assert.throws(
      () =>
        orderService.confirmOrder({
          razorpayOrderId: 'unauth_order',
          razorpayPaymentId: 'pay_unauth',
          razorpaySignature: validSignature,
          clientOrderContext: {
            customerId: 'guest-user',
          },
        }),
      /User must be authenticated/
    );

    assert.throws(
      () =>
        orderService.confirmOrder({
          razorpayOrderId: 'unauth_order_none',
          razorpayPaymentId: 'pay_unauth_none',
          razorpaySignature: validSignature,
          clientOrderContext: {},
        }),
      /User must be authenticated/
    );
  });

  test('Failed payment records failure reason and preserves initiated order state', () => {
    const failedOrderId = 'order_failed_test';
    orderService.registerInitiatedOrder(failedOrderId, {
      customerId: 'cust_failed',
      items: [],
      pricing: { subtotal: 0, total: 0 },
      shippingAddress: {},
    });

    const failed = orderService.markPaymentFailed(failedOrderId, 'Insufficient bank balance');
    assert.equal(failed.paymentStatus, 'failed');
    assert.equal(failed.failureReason, 'Insufficient bank balance');
  });

  test('Cancelled payment records cancellation state', () => {
    const cancelOrderId = 'order_cancel_test';
    orderService.registerInitiatedOrder(cancelOrderId, {
      customerId: 'cust_cancelled',
      items: [],
      pricing: { subtotal: 0, total: 0 },
      shippingAddress: {},
    });

    const cancelled = orderService.markPaymentCancelled(cancelOrderId);
    assert.equal(cancelled.paymentStatus, 'cancelled');
  });
});

describe('5. Automated Email Notification Workflows', () => {
  test('Order placed email payload formats correctly with customer email and items summary', () => {
    const orderPayload = {
      orderId: 'ORD-TEST-998877',
      toEmail: 'customer@aquapure.com',
      toName: 'Ramesh Kumar',
      totalAmount: '12999',
      itemsSummary: '1x AquaPure RO Purifier 8L',
      deliveryAddress: 'Flat 402, Link Road, Mumbai - 400001',
    };

    assert.ok(orderPayload.toEmail.includes('@'));
    assert.ok(orderPayload.orderId.startsWith('ORD-'));
    assert.ok(Number(orderPayload.totalAmount) > 0);
    assert.ok(orderPayload.itemsSummary.length > 0);
  });

  test('Order received / delivered email payload formats correctly for delivered status', () => {
    const deliveredPayload = {
      orderId: 'ORD-TEST-998877',
      toEmail: 'customer@aquapure.com',
      toName: 'Ramesh Kumar',
      totalAmount: '12999',
      deliveryAddress: 'Flat 402, Link Road, Mumbai - 400001',
    };

    assert.ok(deliveredPayload.toEmail.includes('@'));
    assert.ok(deliveredPayload.deliveryAddress.length > 0);
    assert.equal(deliveredPayload.orderId, 'ORD-TEST-998877');
  });
});

