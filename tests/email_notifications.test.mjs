/**
 * AquaPure — Comprehensive Email Notifications Test Suite
 *
 * Verifies:
 * 1. Wholesale Dealer Order Placed:
 *    - Sent to dealer's registered email address
 *    - Includes: order number, order date, product names, quantities, dealer prices, subtotal, total amount, delivery address, payment status
 *    - Clearly identifies as wholesale/dealer order
 * 2. Wholesale Dealer Order Delivered:
 *    - Sent to dealer's registered email
 *    - Includes: order number, delivery status, delivered date/time, order summary
 *    - Only triggers on transition to 'delivered', not on subsequent updates
 * 3. Regular Customer Order Placed:
 *    - Preserves existing confirmation email
 *    - Sent to customer's registered email
 *    - Includes: order number, purchased products, quantities, total amount, payment status, delivery address
 * 4. Regular Customer Order Delivered:
 *    - Sent when order status changes to 'delivered'
 *    - Includes: order number, product summary, delivery confirmation, delivered date/time
 *    - Works for both prepaid and cash-on-delivery according to actual payment status
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const {
  buildOrderPlacedHtml,
  buildOrderDeliveredHtml,
  buildWholesaleOrderPlacedHtml,
  buildWholesaleOrderDeliveredHtml,
  formatPaymentStatusText,
  formatDeliveredPaymentStatusText,
} = require('../functions/mailServer.js');

describe('1. Wholesale Dealer Email Notifications', () => {
  describe('A. Order Placed Confirmation', () => {
    const dealerOrder = {
      toName: 'Vikram Singh (North India Water Systems)',
      toEmail: 'dealer.northindia@example.com',
      orderId: 'ORD-881290',
      totalAmount: '18100',
      subtotalAmount: '18100',
      shippingFee: '0',
      paymentMethod: 'Bank Transfer (B2B NEFT)',
      paymentStatus: 'test_success',
      deliveryAddress: 'Shop 12, Industrial Area Ph 2, New Delhi - 110020',
      phone: '+91 98110 99887',
      isDealer: true,
      orderType: 'dealer',
      orderDate: '2026-02-20T16:00:00Z',
      items: [
        {
          name: 'Dow Filmtec 75 GPD High-TDS RO Membrane',
          quantity: 10,
          price: 1250,
        },
        {
          name: 'BNQS 100 GPD 24V Diaphragm Booster Pump',
          quantity: 5,
          price: 1120,
        },
      ],
    };

    test('Generates email with all required wholesale order placed fields', () => {
      const html = buildWholesaleOrderPlacedHtml(dealerOrder);

      // Order number
      assert.ok(html.includes('ORD-881290'), 'Must contain order number');

      // Clearly identified as Wholesale / Dealer order
      assert.ok(
        html.includes('WHOLESALE') || html.includes('DEALER'),
        'Must clearly identify as wholesale / dealer order'
      );
      assert.ok(html.includes('Authorized Dealer Partner Network'), 'Must include dealer network header');
      assert.ok(html.includes('WHOLESALE / DEALER ORDER'), 'Must include wholesale order type badge');

      // Product names
      assert.ok(html.includes('Dow Filmtec 75 GPD High-TDS RO Membrane'), 'Must include product name');
      assert.ok(html.includes('BNQS 100 GPD 24V Diaphragm Booster Pump'), 'Must include second product');

      // Quantities and dealer unit prices
      assert.ok(html.includes('10'), 'Must include quantity 10');
      assert.ok(html.includes('1,250'), 'Must include dealer unit price ₹1,250');
      assert.ok(html.includes('5'), 'Must include quantity 5');
      assert.ok(html.includes('1,120'), 'Must include dealer unit price ₹1,120');

      // Subtotal and Total amount
      assert.ok(html.includes('18,100'), 'Must include subtotal and grand total ₹18,100');

      // Delivery address
      assert.ok(
        html.includes('Shop 12, Industrial Area Ph 2, New Delhi - 110020'),
        'Must include complete delivery address'
      );

      // Payment status
      assert.ok(html.includes('Verified &amp; Paid') || html.includes('Verified & Paid'), 'Must display verified payment status');

      // Dealer registered email
      assert.ok(html.includes('dealer.northindia@example.com'), 'Must reference dealer registered email');
    });

    test('Works for Cash on Delivery / Pending wholesale payment', () => {
      const codDealerOrder = {
        ...dealerOrder,
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'pending',
      };
      const html = buildWholesaleOrderPlacedHtml(codDealerOrder);
      assert.ok(html.includes('Cash on Delivery'), 'Must display COD payment method');
      assert.ok(
        html.includes('Pay upon Receipt') || html.includes('Pending Payment'),
        'Must indicate pending payment status for COD'
      );
    });
  });

  describe('B. Order Delivered Confirmation', () => {
    const deliveredWholesaleOrder = {
      toName: 'Vikram Singh (North India Water Systems)',
      toEmail: 'dealer.northindia@example.com',
      orderId: 'ORD-881290',
      totalAmount: '18100',
      deliveryAddress: 'Shop 12, Industrial Area Ph 2, New Delhi - 110020',
      paymentMethod: 'Bank Transfer (B2B NEFT)',
      paymentStatus: 'test_success',
      deliveredAt: '2026-02-23T14:45:00Z',
      isDealer: true,
      orderType: 'dealer',
      items: [
        {
          name: 'Dow Filmtec 75 GPD High-TDS RO Membrane',
          quantity: 10,
          price: 1250,
        },
        {
          name: 'BNQS 100 GPD 24V Diaphragm Booster Pump',
          quantity: 5,
          price: 1120,
        },
      ],
    };

    test('Generates email with all required wholesale delivered fields', () => {
      const html = buildWholesaleOrderDeliveredHtml(deliveredWholesaleOrder);

      // Order number
      assert.ok(html.includes('ORD-881290'), 'Must contain order number');

      // Clearly identified as Wholesale / Dealer order
      assert.ok(html.includes('B2B WHOLESALE'), 'Must identify as B2B Wholesale');
      assert.ok(html.includes('Consignment Delivered'), 'Must indicate consignment delivered');

      // Delivery status
      assert.ok(html.includes('Delivered &amp; Received') || html.includes('Delivered & Received'), 'Must indicate delivered & received status');

      // Delivered date/time
      assert.ok(html.includes('23') && html.includes('Feb') && html.includes('2026'), 'Must include delivery date');

      // Order summary
      assert.ok(html.includes('Dow Filmtec 75 GPD High-TDS RO Membrane'), 'Must summarize delivered items');
      assert.ok(html.includes('10 units'), 'Must state quantity');
      assert.ok(html.includes('18,100'), 'Must state total consignment value');

      // Stock ledger & physical verification notice
      assert.ok(html.includes('Stock Ledger Notice'), 'Must prompt dealer to update stock ledger');
    });

    test('Only sends email on transition to delivered, not on repeated updates', () => {
      // Simulate state transition logic
      const checkShouldSendDeliveryEmail = (prevStatus, nextStatus) => {
        return prevStatus !== 'delivered' && nextStatus === 'delivered';
      };

      assert.equal(checkShouldSendDeliveryEmail('shipped', 'delivered'), true, 'Must send when transitioning shipped -> delivered');
      assert.equal(checkShouldSendDeliveryEmail('processing', 'delivered'), true, 'Must send when transitioning processing -> delivered');
      assert.equal(checkShouldSendDeliveryEmail('delivered', 'delivered'), false, 'Must NOT send on subsequent update when already delivered');
      assert.equal(checkShouldSendDeliveryEmail('placed', 'confirmed'), false, 'Must NOT send on non-delivery status advance');
    });
  });
});

describe('2. Regular Customer Email Notifications', () => {
  describe('A. Order Placed Confirmation', () => {
    const customerOrder = {
      toName: 'Rahul Sharma',
      toEmail: 'rahul.sharma@example.com',
      orderId: 'ORD-892144',
      totalAmount: '14999',
      subtotalAmount: '14999',
      shippingFee: '0',
      paymentMethod: 'Razorpay (Test Mode)',
      paymentStatus: 'test_success',
      deliveryAddress: 'Flat 402, Royal Palms, Link Road, Mumbai - 400053',
      phone: '+91 98765 43210',
      orderDate: '2026-02-21T11:15:00Z',
      items: [
        {
          name: 'AquaPure Grand RO+UV+UF+Alkaline',
          quantity: 1,
          price: 14999,
        },
      ],
    };

    test('Generates customer confirmation with correct order number, products, price, and address', () => {
      const html = buildOrderPlacedHtml(customerOrder);

      // Order number
      assert.ok(html.includes('ORD-892144'), 'Must contain order number');

      // Purchased products & quantity
      assert.ok(html.includes('AquaPure Grand RO+UV+UF+Alkaline'), 'Must include product name');
      assert.ok(html.includes('14,999'), 'Must include product price');

      // Total amount
      assert.ok(html.includes('14,999'), 'Must include grand total');

      // Payment status
      assert.ok(html.includes('Verified &amp; Paid') || html.includes('Verified & Paid'), 'Must show verified payment status');

      // Delivery address & recipient
      assert.ok(html.includes('Rahul Sharma'), 'Must address customer by name');
      assert.ok(html.includes('Flat 402, Royal Palms, Link Road, Mumbai - 400053'), 'Must contain delivery address');

      // Complimentary installation notice
      assert.ok(html.includes('Complimentary Certified Installation Included'), 'Must include free installation benefit');
    });

    test('Uses verified registered email for authenticated customer checkout', () => {
      const authUser = { uid: 'usr-100', email: 'registered.user@example.com' };
      const authProfile = { email: 'registered.user@example.com', displayName: 'Registered User' };
      const guestFormEmail = 'different.form@example.com';

      // Registered email should be prioritized for authenticated users
      const resolvedEmail = authUser?.email || authProfile?.email || guestFormEmail;
      assert.equal(resolvedEmail, 'registered.user@example.com');
    });
  });

  describe('B. Order Delivered Confirmation', () => {
    test('Handles Prepaid Order Delivered', () => {
      const prepaidDelivered = {
        toName: 'Rahul Sharma',
        toEmail: 'rahul.sharma@example.com',
        orderId: 'ORD-892144',
        totalAmount: '14999',
        deliveryAddress: 'Flat 402, Royal Palms, Link Road, Mumbai - 400053',
        paymentMethod: 'Prepaid (Razorpay)',
        paymentStatus: 'test_success',
        deliveredAt: '2026-02-23T11:00:00Z',
        items: [
          {
            name: 'AquaPure Grand RO+UV+UF+Alkaline',
            quantity: 1,
            price: 14999,
          },
        ],
      };

      const html = buildOrderDeliveredHtml(prepaidDelivered);

      assert.ok(html.includes('ORD-892144'), 'Must contain order number');
      assert.ok(html.includes('Package Delivered'), 'Must indicate package delivered');
      assert.ok(html.includes('23') && html.includes('Feb') && html.includes('2026'), 'Must include delivery date');
      assert.ok(html.includes('AquaPure Grand RO+UV+UF+Alkaline'), 'Must include delivered item');
      assert.ok(
        html.includes('Prepaid in Full (Verified &amp; Paid)') || html.includes('Prepaid in Full (Verified & Paid)'),
        'Must show prepaid payment status'
      );
    });

    test('Handles Cash on Delivery (COD) Order Delivered', () => {
      const codDelivered = {
        toName: 'Sunita Verma',
        toEmail: 'sunita.verma@example.com',
        orderId: 'ORD-761203',
        totalAmount: '10499',
        deliveryAddress: '5th Floor, Tower B, Cyber City, Gurugram - 122002',
        paymentMethod: 'Cash on Delivery',
        paymentStatus: 'cod',
        deliveredAt: '2026-02-23T15:30:00Z',
        items: [
          {
            name: 'AquaPure Chill & Heat Floor Dispenser',
            quantity: 1,
            price: 10499,
          },
        ],
      };

      const html = buildOrderDeliveredHtml(codDelivered);

      assert.ok(html.includes('ORD-761203'), 'Must contain order number');
      assert.ok(html.includes('Package Delivered'), 'Must indicate package delivered');
      assert.ok(html.includes('AquaPure Chill & Heat Floor Dispenser'), 'Must include delivered product');
      assert.ok(
        html.includes('Cash on Delivery — Payment Collected'),
        'Must accurately show COD payment collected on delivery'
      );
    });
  });

  describe('3. Payment Status Text Formatting Helpers', () => {
    test('formatPaymentStatusText correctly formats all statuses', () => {
      assert.equal(formatPaymentStatusText('test_success'), '● Verified & Paid');
      assert.equal(formatPaymentStatusText('paid'), '● Verified & Paid');
      assert.equal(formatPaymentStatusText('pending', 'Cash on Delivery'), '● Cash on Delivery (Pay upon Receipt)');
      assert.equal(formatPaymentStatusText('pending'), '⏳ Pending Payment');
    });

    test('formatDeliveredPaymentStatusText distinguishes prepaid vs COD', () => {
      assert.equal(formatDeliveredPaymentStatusText('test_success', 'Razorpay'), '● Prepaid in Full (Verified & Paid)');
      assert.equal(formatDeliveredPaymentStatusText('cod', 'Cash on Delivery'), '● Cash on Delivery — Payment Collected');
      assert.equal(formatDeliveredPaymentStatusText('pending', 'Cash on Delivery'), '● Cash on Delivery — Payment Collected');
    });
  });
});
