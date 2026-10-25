/**
 * AquaPure Firebase Functions — Server-Side Pricing & Inventory Validation
 */

const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'catalogData.json');
let CATALOG_MAP = new Map();

function loadCatalog() {
  try {
    if (fs.existsSync(catalogPath)) {
      const raw = fs.readFileSync(catalogPath, 'utf8');
      const products = JSON.parse(raw);
      CATALOG_MAP.clear();
      for (const p of products) {
        CATALOG_MAP.set(p.id, p);
      }
    }
  } catch (err) {
    console.error('Failed to load catalogData.json in functions:', err);
  }
}

loadCatalog();

class PricingService {
  static reloadCatalog() {
    loadCatalog();
  }

  static getProduct(productId) {
    return CATALOG_MAP.get(productId) || null;
  }

  static calculateOrderPricing(clientItems, isDealer = false) {
    if (!Array.isArray(clientItems) || clientItems.length === 0) {
      throw new Error('Cart must contain at least one item.');
    }

    let subtotal = 0;
    const validatedItems = [];

    for (const item of clientItems) {
      if (!item.productId) {
        throw new Error('Invalid item: missing productId.');
      }

      const product = CATALOG_MAP.get(item.productId);
      if (!product) {
        throw new Error(`Product not found in catalog: ${item.productId}`);
      }

      if (product.active === false) {
        throw new Error(`Product "${product.name}" is no longer available.`);
      }

      if (product.stockStatus === 'out_of_stock') {
        throw new Error(`Product "${product.name}" is out of stock.`);
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        throw new Error(`Invalid quantity for product "${product.name}". Must be at least 1.`);
      }
      if (qty > 100) {
        throw new Error(`Maximum allowable single-order quantity exceeded for "${product.name}".`);
      }

      const unitPrice = isDealer && product.dealerPrice
        ? product.dealerPrice
        : product.customerPrice;

      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;

      validatedItems.push({
        productId: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        unitPrice,
        quantity: qty,
        lineTotal,
      });
    }

    const shippingFee = subtotal >= 999 ? 0 : 99;
    const total = subtotal + shippingFee;
    const amountInPaise = Math.round(total * 100);

    return {
      items: validatedItems,
      subtotal,
      shippingFee,
      total,
      amountInPaise,
      currency: 'INR',
    };
  }
}

module.exports = { PricingService };
