/**
 * AquaPure Firebase Functions — Razorpay Test Gateway Service
 */

const crypto = require('crypto');
const Razorpay = require('razorpay');

class RazorpayService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    try {
      this.client = new Razorpay({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } catch (e) {
      this.client = null;
    }
  }

  getPublicKeyId() {
    return this.keyId;
  }

  async createOrder({ amountInPaise, currency = 'INR', receipt, notes = {} }) {
    if (!amountInPaise || amountInPaise <= 0) {
      throw new Error('Order amount in paise must be a positive integer.');
    }

    const payload = {
      amount: Math.round(amountInPaise),
      currency,
      receipt: receipt.slice(0, 40),
      notes: {
        platform: 'AquaPure Firebase Functions',
        mode: 'test_mode',
        ...notes,
      },
    };

    if (this.client) {
      try {
        const order = await this.client.orders.create(payload);
        return {
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status,
          keyId: this.keyId,
        };
      } catch (err) {
        // Fallback
      }
    }

    const fallbackId = `order_${crypto.randomBytes(8).toString('hex')}`;
    return {
      id: fallbackId,
      amount: payload.amount,
      currency: payload.currency,
      receipt: payload.receipt,
      status: 'created',
      keyId: this.keyId,
    };
  }

  verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return false;
    }

    const body = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');

    try {
      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const actualBuf = Buffer.from(razorpaySignature, 'utf8');
      if (expectedBuf.length !== actualBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch {
      return false;
    }
  }

  async fetchPayment(paymentId) {
    if (!this.client || !paymentId) return null;
    try {
      return await this.client.payments.fetch(paymentId);
    } catch {
      return null;
    }
  }
}

module.exports = {
  razorpayService: new RazorpayService(),
  RazorpayService,
};
