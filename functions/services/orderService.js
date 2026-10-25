/**
 * AquaPure Firebase Functions — Idempotent Order & Transaction Service
 */

class OrderService {
  constructor() {
    this.initiatedOrders = new Map();
    this.confirmedOrders = new Map();
    this.processedPayments = new Map();
  }

  registerInitiatedOrder(razorpayOrderId, {
    customerId,
    orderType,
    items,
    pricing,
    shippingAddress,
  }) {
    const record = {
      razorpayOrderId,
      customerId,
      orderType,
      items,
      pricing,
      shippingAddress,
      paymentStatus: 'pending',
      orderStatus: 'initiated',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.initiatedOrders.set(razorpayOrderId, record);
    return record;
  }

  confirmOrder({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    clientOrderContext = {},
  }) {
    if (this.processedPayments.has(razorpayPaymentId)) {
      const existingOrderId = this.processedPayments.get(razorpayPaymentId);
      const existingOrder = this.confirmedOrders.get(existingOrderId);
      if (existingOrder) {
        return {
          order: existingOrder,
          isDuplicate: true,
        };
      }
    }

    const initiated = this.initiatedOrders.get(razorpayOrderId);
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const orderId = `aq_order_${Date.now()}`;

    const items = initiated?.items || clientOrderContext.items || [];
    const pricing = initiated?.pricing || {
      subtotal: clientOrderContext.subtotal || 0,
      total: clientOrderContext.total || 0,
    };
    const shippingAddress = initiated?.shippingAddress || clientOrderContext.shippingAddress || {};

    const customerId = initiated?.customerId || clientOrderContext.customerId;
    if (!customerId || customerId === 'guest-user') {
      throw new Error('User must be authenticated to confirm an order.');
    }

    const confirmedOrder = {
      id: orderId,
      orderNumber,
      customerId,
      dealerId: initiated?.dealerId || clientOrderContext.dealerId,
      orderType: initiated?.orderType || clientOrderContext.orderType || 'customer',
      items,
      subtotal: pricing.subtotal,
      total: pricing.total,
      shippingAddress,
      paymentProvider: 'razorpay',
      paymentStatus: 'test_success',
      paymentReference: razorpayPaymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderStatus: 'placed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.confirmedOrders.set(orderId, confirmedOrder);
    this.processedPayments.set(razorpayPaymentId, orderId);

    return {
      order: confirmedOrder,
      isDuplicate: false,
    };
  }

  markPaymentFailed(razorpayOrderId, reason = 'Payment declined by test gateway') {
    const initiated = this.initiatedOrders.get(razorpayOrderId);
    if (initiated) {
      initiated.paymentStatus = 'failed';
      initiated.failureReason = reason;
      initiated.updatedAt = new Date().toISOString();
    }
    return initiated;
  }

  markPaymentCancelled(razorpayOrderId) {
    const initiated = this.initiatedOrders.get(razorpayOrderId);
    if (initiated) {
      initiated.paymentStatus = 'cancelled';
      initiated.updatedAt = new Date().toISOString();
    }
    return initiated;
  }
}

module.exports = {
  orderService: new OrderService(),
  OrderService,
};
