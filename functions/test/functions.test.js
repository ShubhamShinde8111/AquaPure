/**
 * AquaPure — Firebase Cloud Functions Unit & Security Tests
 * Native Node.js Test Runner
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'catalogData.json');
const catalogItems = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const catalogMap = new Map(catalogItems.map((i) => [i.id, i]));

const RAZORPAY_KEY_SECRET = 'mock_dummy_test_secret_key';

function calculatePricing(clientItems, isDealer = false) {
  if (!Array.isArray(clientItems) || clientItems.length === 0) {
    throw new Error('Cart must contain at least one item.');
  }

  let subtotal = 0;
  for (const item of clientItems) {
    const product = catalogMap.get(item.productId);
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (product.stockStatus === 'out_of_stock') {
      throw new Error(`Product "${product.name}" is out of stock.`);
    }
    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) throw new Error('Invalid quantity');
    const unitPrice = isDealer && product.dealerPrice ? product.dealerPrice : product.customerPrice;
    subtotal += unitPrice * qty;
  }
  const shippingFee = subtotal >= 999 ? 0 : 99;
  const total = subtotal + shippingFee;
  return { subtotal, shippingFee, total, amountInPaise: Math.round(total * 100) };
}

function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

describe('Firebase Cloud Functions: Pricing & Inventory Logic', () => {
  test('Correctly calculates subtotal and free shipping on orders >= ₹999', () => {
    const pricing = calculatePricing([{ productId: 'AP-WP-001', quantity: 1 }], false);
    assert.equal(pricing.subtotal, 14999);
    assert.equal(pricing.shippingFee, 0);
    assert.equal(pricing.total, 14999);
    assert.equal(pricing.amountInPaise, 1499900);
  });

  test('Applies ₹99 shipping fee when subtotal is below ₹999', () => {
    const pricing = calculatePricing([{ productId: 'AP-FC-039', quantity: 1 }], false);
    assert.equal(pricing.subtotal, 499);
    assert.equal(pricing.shippingFee, 99);
    assert.equal(pricing.total, 598);
    assert.equal(pricing.amountInPaise, 59800);
  });

  test('Applies dealer wholesale pricing when isDealer is true', () => {
    const customer = calculatePricing([{ productId: 'AP-WP-001', quantity: 1 }], false);
    const dealer = calculatePricing([{ productId: 'AP-WP-001', quantity: 1 }], true);
    assert.equal(customer.subtotal, 14999);
    assert.equal(dealer.subtotal, 11500);
    assert.ok(dealer.total < customer.total);
  });
});

describe('Firebase Cloud Functions: Cryptographic Signature Verification', () => {
  test('Valid HMAC-SHA256 signature passes verification', () => {
    const orderId = 'order_test_functions_001';
    const paymentId = 'pay_test_functions_002';
    const validSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.equal(verifySignature(orderId, paymentId, validSignature), true);
  });

  test('Tampered or forged signature fails verification', () => {
    const orderId = 'order_test_functions_001';
    const paymentId = 'pay_test_functions_002';
    const fakeSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    assert.equal(verifySignature(orderId, paymentId, fakeSignature), false);
  });
});
