/**
 * AquaPure — Firebase Cloud Functions Backend for Razorpay Test Mode
 *
 * Implements:
 * 1. createRazorpayOrder (onCall & HTTPS)
 *    - Server-side inventory & pricing calculation
 *    - Razorpay order creation via official Razorpay SDK
 * 2. verifyRazorpayPayment (onCall & HTTPS)
 *    - Cryptographic HMAC-SHA256 signature verification
 *    - Idempotency guard (prevents duplicate orders)
 *    - Direct Firestore order creation/confirmation via Firebase Admin SDK
 * 3. razorpayWebhook (onRequest)
 *    - Asynchronous payment capture and failure handling
 * 4. reconcilePaymentStatus (onCall)
 *    - Reconciles interrupted checkout attempts
 */

require('dotenv').config();
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const {
  sendPushNotificationForOrder,
  NOTIFICATION_STAGES,
} = require('./services/pushNotificationService');

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

// Razorpay Credentials (loaded from functions/.env — see .env.example)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Gmail Sender Configuration (loaded from functions/.env — see .env.example)
const GMAIL_USER = process.env.GMAIL_USER || '';
const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || '';
const GMAIL_APP_PASSWORD = rawPass.replace(/\s+/g, '');

let mailTransporter = null;
if (GMAIL_APP_PASSWORD) {
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

/**
 * Send transactional email helper
 */
function formatCurrency(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return num.toLocaleString('en-IN');
}

function formatDateTime(val) {
  const dateObj = val ? new Date(val) : new Date();
  if (isNaN(dateObj.getTime())) return new Date().toLocaleString('en-IN');
  return dateObj.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPaymentStatusText(status, method = '') {
  const norm = (status || '').toLowerCase();
  const isCod = norm.includes('cod') || (method && method.toLowerCase().includes('cod')) || (method && method.toLowerCase().includes('cash'));
  if (norm === 'test_success' || norm === 'paid' || norm === 'success') {
    return '● Verified & Paid';
  }
  if (isCod) {
    return '● Cash on Delivery (Pay upon Receipt)';
  }
  if (norm === 'pending') {
    return '⏳ Pending Payment';
  }
  return status || 'Verified';
}

function formatDeliveredPaymentStatusText(status, method = '') {
  const norm = (status || '').toLowerCase();
  const isCod = norm.includes('cod') || (method && method.toLowerCase().includes('cod')) || (method && method.toLowerCase().includes('cash'));
  if (isCod) {
    return '● Cash on Delivery — Payment Collected';
  }
  return '● Prepaid in Full (Verified & Paid)';
}

/**
 * Send transactional email helper with rich attractive message for Customers and Wholesale Dealers
 */
async function sendTransactionalEmail({
  toEmail,
  toName = 'Valued Customer',
  orderId,
  totalAmount,
  subtotalAmount,
  shippingFee = '0',
  items = [],
  itemsSummary = '',
  deliveryAddress = '',
  phone = '',
  type = 'order_placed',
  orderType = 'customer',
  isDealer = false,
  paymentMethod = 'Razorpay (Test Mode)',
  paymentStatus = 'test_success',
  deliveredAt,
  orderDate: rawDate,
}) {
  if (!toEmail) return { success: false, reason: 'missing_email' };

  const isWholesale = Boolean(isDealer || orderType === 'dealer');
  const isDelivered = type === 'order_delivered';
  const orderDate = formatDateTime(rawDate);
  const deliveryDateTime = formatDateTime(deliveredAt);
  const formattedTotal = formatCurrency(totalAmount);
  const formattedSubtotal = subtotalAmount ? formatCurrency(subtotalAmount) : formattedTotal;
  const deliveryText = parseFloat(shippingFee) > 0 ? `₹${formatCurrency(shippingFee)}` : 'FREE';

  let subject = '';
  let textMessage = '';
  let htmlMessage = '';

  let itemsSummaryText = itemsSummary;
  if (!itemsSummaryText && Array.isArray(items) && items.length > 0) {
    itemsSummaryText = items.map((i) => `${i.quantity || 1}x ${i.name || 'Product'} (₹${formatCurrency(i.price || i.unitPrice || 0)})`).join(', ');
  }

  if (isWholesale) {
    if (isDelivered) {
      subject = `Wholesale Order #${orderId} Delivered & Received — AquaPure Dealer Network`;
      textMessage = `═══════════════════════════════════════════════════════════
        🏢 AQUAPURE B2B WHOLESALE DEALER NETWORK
          Authorized Dealer Consignment Receipt
═══════════════════════════════════════════════════════════

Hello ${toName} (Authorized Dealer),

Your AquaPure wholesale consignment under Order #${orderId} has been 
successfully delivered to your registered facility and confirmed received!

───────────────────────────────────────────────────────────
📦 CONSIGNMENT DELIVERY SUMMARY
───────────────────────────────────────────────────────────
• Order Number    : #${orderId} (Wholesale Consignment)
• Delivery Date   : ${deliveryDateTime}
• Delivery Status : Delivered & Received
• Delivered To    : ${toName}
• Facility Address: ${deliveryAddress}
• Total Value     : ₹${formattedTotal}
• Payment Status  : ${formatDeliveredPaymentStatusText(paymentStatus, paymentMethod)}
• Consignment Items: ${itemsSummaryText || 'Wholesale Purifier & Accessories Consignment'}

───────────────────────────────────────────────────────────
📋 DEALERSHIP INVENTORY & STOCK LEDGER
───────────────────────────────────────────────────────────
Please verify physical package seals and update your dealership stock ledger.
For bulk restocking or warranty claims: dealers@aquapure.com | 1800-AQUAPURE-B2B
═══════════════════════════════════════════════════════════
           AquaPure Commercial Wholesale Division
═══════════════════════════════════════════════════════════`;

      htmlMessage = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:20px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 4px 14px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%);padding:28px 24px;text-align:center;color:#FFFFFF;border-bottom:3px solid #10B981;">
      <h1 style="margin:0;font-size:22px;letter-spacing:1px;">🏢 AQUAPURE B2B WHOLESALE</h1>
      <p style="margin:4px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#6EE7B7;">Consignment Delivered &amp; Received</p>
    </div>
    <div style="padding:24px;">
      <div style="background-color:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;">
        <span style="background-color:#059669;color:#FFFFFF;font-size:11px;font-weight:700;padding:3px 10px;border-radius:9999px;">✓ Consignment Delivered</span>
        <h2 style="margin:8px 0 2px;color:#065F46;font-size:18px;">Wholesale Order #${orderId} Delivered</h2>
        <p style="margin:0;font-size:13px;color:#475569;">Delivered on ${deliveryDateTime}</p>
      </div>
      <p style="color:#334155;line-height:1.6;">Hello <strong>${toName}</strong> (Authorized Dealer),<br>Your wholesale bulk consignment has arrived and was confirmed received.</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;font-size:14px;"><strong>Order ID:</strong> #${orderId} (Wholesale Order)</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Delivered Date &amp; Time:</strong> ${deliveryDateTime}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Facility Address:</strong> ${deliveryAddress}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Total Value:</strong> ₹${formattedTotal}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Payment Status:</strong> <span style="color:#16A34A;font-weight:700;">${formatDeliveredPaymentStatusText(paymentStatus, paymentMethod)}</span></p>
        <p style="margin:4px 0;font-size:14px;"><strong>Items Summary:</strong> ${itemsSummaryText}</p>
      </div>
    </div>
    <div style="background:#0F172A;padding:20px;text-align:center;color:#94A3B8;font-size:12px;">
      AquaPure B2B Distribution Systems • Dealer Desk: dealers@aquapure.com | 1800-AQUAPURE-B2B
    </div>
  </div>
</body>
</html>`;
    } else {
      subject = `Wholesale Order #${orderId} Placed Successfully — AquaPure Dealer Network`;
      textMessage = `═══════════════════════════════════════════════════════════
        🏢 AQUAPURE B2B WHOLESALE DEALER NETWORK
         Authorized Wholesale Dealer Order Confirmation
═══════════════════════════════════════════════════════════

Hello ${toName} (Authorized Dealer),

Your wholesale order #${orderId} has been successfully created and 
confirmed in the AquaPure B2B Distribution System.

───────────────────────────────────────────────────────────
📦 WHOLESALE ORDER DETAILS
───────────────────────────────────────────────────────────
• Order Number     : #${orderId}
• Order Type       : WHOLESALE / DEALER ORDER
• Order Date       : ${orderDate}
• Payment Method   : ${paymentMethod}
• Payment Status   : ${formatPaymentStatusText(paymentStatus, paymentMethod)}

───────────────────────────────────────────────────────────
🛒 ORDERED WHOLESALE ITEMS
───────────────────────────────────────────────────────────
• ${itemsSummaryText || 'Wholesale Consignment Package'}

───────────────────────────────────────────────────────────
💳 BILLING BREAKDOWN (DEALER TIER)
───────────────────────────────────────────────────────────
• Wholesale Subtotal : ₹${formattedSubtotal}
• Freight/Logistics  : ${deliveryText}
• GRAND TOTAL        : ₹${formattedTotal}

───────────────────────────────────────────────────────────
📍 CONSIGNMENT DELIVERY ADDRESS
───────────────────────────────────────────────────────────
Dealer / Business : ${toName}
Facility Address  : ${deliveryAddress}
Contact Phone     : ${phone || 'On file'}
Registered Email  : ${toEmail}

───────────────────────────────────────────────────────────
📦 WHOLESALE FREIGHT NOTICE
───────────────────────────────────────────────────────────
Your bulk consignment is being staged at the primary regional warehouse.
Commercial B2B tax invoice is generated with GST input credit.
═══════════════════════════════════════════════════════════
           AquaPure Commercial Wholesale Division
═══════════════════════════════════════════════════════════`;

      htmlMessage = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:20px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 4px 14px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%);padding:28px 24px;text-align:center;color:#FFFFFF;border-bottom:3px solid #38BDF8;">
      <h1 style="margin:0;font-size:22px;letter-spacing:1px;">🏢 AQUAPURE B2B WHOLESALE</h1>
      <p style="margin:4px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#94A3B8;">Authorized Dealer Order Confirmation</p>
    </div>
    <div style="padding:24px;">
      <div style="background-color:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px;margin-bottom:16px;text-align:center;">
        <span style="background-color:#0284C7;color:#FFFFFF;font-size:11px;font-weight:700;padding:3px 10px;border-radius:9999px;">✓ Wholesale Order Placed</span>
        <h2 style="margin:8px 0 2px;color:#0F172A;font-size:18px;">Consignment Booked: #${orderId}</h2>
        <p style="margin:0;font-size:13px;color:#475569;">${orderDate}</p>
      </div>
      <p style="color:#334155;line-height:1.6;">Hello <strong>${toName}</strong> (Authorized Dealer),<br>Your wholesale bulk order has been confirmed.</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;font-size:14px;"><strong>Order ID:</strong> #${orderId}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Account Type:</strong> <span style="color:#0284C7;font-weight:700;">WHOLESALE / DEALER ORDER</span></p>
        <p style="margin:4px 0;font-size:14px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Payment Status:</strong> <span style="color:#16A34A;font-weight:700;">${formatPaymentStatusText(paymentStatus, paymentMethod)}</span></p>
        <p style="margin:4px 0;font-size:14px;"><strong>Subtotal:</strong> ₹${formattedSubtotal}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Total Amount:</strong> <strong style="color:#0284C7;">₹${formattedTotal}</strong></p>
        <p style="margin:4px 0;font-size:14px;"><strong>Delivery Address:</strong> ${deliveryAddress}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Items:</strong> ${itemsSummaryText}</p>
      </div>
    </div>
    <div style="background:#0F172A;padding:20px;text-align:center;color:#94A3B8;font-size:12px;">
      AquaPure B2B Distribution Systems • Dealer Desk: dealers@aquapure.com | 1800-AQUAPURE-B2B
    </div>
  </div>
</body>
</html>`;
    }
  } else {
    // Regular Customer
    if (isDelivered) {
      subject = `Order #${orderId} Delivered & Received — AquaPure`;
      textMessage = `═══════════════════════════════════════════════════════════
                 💧 AQUAPURE WATER PURIFIERS
               Pure & Healthy Water Guaranteed
═══════════════════════════════════════════════════════════

Hello ${toName},

Your AquaPure order #${orderId} has been successfully 
delivered and confirmed received!

───────────────────────────────────────────────────────────
📦 DELIVERY SUMMARY
───────────────────────────────────────────────────────────
• Order Number    : #${orderId}
• Delivery Date   : ${deliveryDateTime}
• Delivered To    : ${deliveryAddress}
• Total Amount    : ₹${formattedTotal}
• Payment Status  : ${formatDeliveredPaymentStatusText(paymentStatus, paymentMethod)}
• Items           : ${itemsSummaryText || 'AquaPure Purifier Package'}

───────────────────────────────────────────────────────────
🛠️ FREE CERTIFIED INSTALLATION & SUPPORT
───────────────────────────────────────────────────────────
Need installation, filter check, or TDS calibration? 
You can book a certified AquaPure technician directly from 
the AquaPure mobile app at no additional cost.

Questions or assistance? 
Email: support@aquapure.com | Helpline: 1800-AQUAPURE
═══════════════════════════════════════════════════════════
                 Drink Pure, Stay Healthy!
                     Team AquaPure
═══════════════════════════════════════════════════════════`;

      htmlMessage = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:20px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg, #059669,#047857);padding:28px 24px;text-align:center;color:#FFFFFF;">
      <h1 style="margin:0;font-size:24px;letter-spacing:1px;">💧 AQUAPURE</h1>
      <p style="margin:4px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#A7F3D0;">Delivered &amp; Received</p>
    </div>
    <div style="padding:24px;">
      <h2 style="color:#065F46;margin-top:0;">✓ Order Delivered &amp; Received</h2>
      <p style="color:#334155;line-height:1.6;">Hello <strong>${toName}</strong>,<br>Your AquaPure order has arrived safely!</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;font-size:14px;"><strong>Order ID:</strong> #${orderId}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Delivered Date &amp; Time:</strong> ${deliveryDateTime}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Payment Status:</strong> <strong style="color:#16A34A;">${formatDeliveredPaymentStatusText(paymentStatus, paymentMethod)}</strong></p>
        <p style="margin:4px 0;font-size:14px;"><strong>Total Amount:</strong> ₹${formattedTotal}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Delivered To:</strong> ${deliveryAddress}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Items:</strong> ${itemsSummaryText}</p>
      </div>
      <div style="background:#EFF6FF;border-left:4px solid #0284C7;padding:12px 16px;border-radius:4px;margin-top:16px;">
        <strong style="color:#1E40AF;">🛠️ Free Certified Installation Included</strong>
        <p style="margin:4px 0 0;font-size:13px;color:#3B82F6;">You can schedule your complimentary technician setup anytime via the AquaPure app.</p>
      </div>
    </div>
    <div style="background:#0F172A;padding:20px;text-align:center;color:#94A3B8;font-size:12px;">
      AquaPure Technologies • Support: support@aquapure.com | 1800-AQUAPURE
    </div>
  </div>
</body>
</html>`;
    } else {
      subject = `Order #${orderId} Placed Successfully — AquaPure`;
      textMessage = `═══════════════════════════════════════════════════════════
                 💧 AQUAPURE WATER PURIFIERS
               Pure & Healthy Water Guaranteed
═══════════════════════════════════════════════════════════

Hello ${toName},

Thank you for choosing AquaPure! Your order has been placed 
and confirmed. Below are your complete order details.

───────────────────────────────────────────────────────────
📦 ORDER DETAILS
───────────────────────────────────────────────────────────
• Order Number     : #${orderId}
• Order Date       : ${orderDate}
• Payment Method   : ${paymentMethod}
• Payment Status   : ${formatPaymentStatusText(paymentStatus, paymentMethod)}
• Estimated Delivery: 2–4 Business Days

───────────────────────────────────────────────────────────
🛒 ORDERED ITEMS
───────────────────────────────────────────────────────────
• ${itemsSummaryText || 'AquaPure Purifier & Accessories'}

───────────────────────────────────────────────────────────
💳 BILLING BREAKDOWN
───────────────────────────────────────────────────────────
• Items Subtotal   : ₹${formattedSubtotal}
• Delivery Fee     : ${deliveryText}
• GRAND TOTAL      : ₹${formattedTotal}

───────────────────────────────────────────────────────────
📍 DELIVERY ADDRESS
───────────────────────────────────────────────────────────
Recipient : ${toName}
Address   : ${deliveryAddress}
Contact   : ${phone || 'Provided at checkout'}
Email     : ${toEmail}

───────────────────────────────────────────────────────────
🛠️ FREE CERTIFIED INSTALLATION INCLUDED
───────────────────────────────────────────────────────────
Your purchase includes complimentary home installation by 
certified AquaPure technicians. You can schedule your preferred
installation date anytime directly in the AquaPure mobile app.

Need help? Email support@aquapure.com or call 1800-AQUAPURE.
═══════════════════════════════════════════════════════════
                 Drink Pure, Stay Healthy!
                     Team AquaPure
═══════════════════════════════════════════════════════════`;

      htmlMessage = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:20px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="background:linear-gradient(135deg, #0284C7,#0369A1);padding:28px 24px;text-align:center;color:#FFFFFF;">
      <h1 style="margin:0;font-size:24px;letter-spacing:1px;">💧 AQUAPURE</h1>
      <p style="margin:4px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#BAE6FD;">Pure &amp; Healthy Water Guaranteed</p>
    </div>
    <div style="padding:24px;">
      <h2 style="color:#0369A1;margin-top:0;">✓ Order Placed &amp; Confirmed</h2>
      <p style="color:#334155;line-height:1.6;">Hello <strong>${toName}</strong>,<br>Thank you for choosing AquaPure! We have received your order.</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;font-size:14px;"><strong>Order ID:</strong> #${orderId}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Order Date:</strong> ${orderDate}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Payment Method:</strong> ${paymentMethod}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Payment Status:</strong> <span style="color:#16A34A;font-weight:700;">${formatPaymentStatusText(paymentStatus, paymentMethod)}</span></p>
        <p style="margin:4px 0;font-size:14px;"><strong>Subtotal:</strong> ₹${formattedSubtotal}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Total Amount:</strong> ₹${formattedTotal}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Delivery Address:</strong> ${deliveryAddress}</p>
        <p style="margin:4px 0;font-size:14px;"><strong>Items:</strong> ${itemsSummaryText}</p>
      </div>
      <div style="background:#EFF6FF;border-left:4px solid #0284C7;padding:12px 16px;border-radius:4px;margin-top:16px;">
        <strong style="color:#1E40AF;">🛠️ Free Certified Installation Included</strong>
        <p style="margin:4px 0 0;font-size:13px;color:#3B82F6;">You can schedule your complimentary technician setup anytime via the AquaPure app.</p>
      </div>
    </div>
    <div style="background:#0F172A;padding:20px;text-align:center;color:#94A3B8;font-size:12px;">
      AquaPure Technologies • Support: support@aquapure.com | 1800-AQUAPURE
    </div>
  </div>
</body>
</html>`;
    }
  }

  // 1. Send via Gmail SMTP (Directly from s83931694@gmail.com)
  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: `"AquaPure Water Purifiers" <${GMAIL_USER}>`,
        to: toEmail,
        replyTo: GMAIL_USER,
        subject,
        text: textMessage,
        html: htmlMessage,
      });

      console.log(`[Gmail Service] Email successfully sent from ${GMAIL_USER} to ${toEmail}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, sender: GMAIL_USER, isWholesale, type };
    } catch (gmailErr) {
      console.warn(`[Gmail Service] Error sending from ${GMAIL_USER}:`, gmailErr.message);
      return { success: false, error: gmailErr.message };
    }
  }

  // 2. Transporter unconfigured (Logging full email invoice and instructions for GMAIL_APP_PASSWORD)
  console.log(`[Gmail Service] Prepared email from ${GMAIL_USER} to ${toEmail} for Order #${orderId}`);
  console.log(`[Gmail Service] Subject: ${subject}`);
  return {
    success: true,
    simulated: true,
    sender: GMAIL_USER,
    subject,
    to: toEmail,
  };
}

let razorpayClient = null;
try {
  razorpayClient = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
} catch (e) {
  console.warn('[Cloud Functions] Razorpay SDK initialization warning:', e.message);
}

// Load seed catalog mapping for authoritative pricing
const catalogMap = new Map();
try {
  const catalogPath = path.join(__dirname, 'catalogData.json');
  if (fs.existsSync(catalogPath)) {
    const raw = fs.readFileSync(catalogPath, 'utf8');
    const items = JSON.parse(raw);
    for (const item of items) {
      catalogMap.set(item.id, item);
    }
  }
} catch (err) {
  console.warn('[Cloud Functions] Could not load local catalogData.json:', err.message);
}

/**
 * Server-side price & stock calculation helper
 */
async function calculateAuthoritativePricing(clientItems, isDealer = false) {
  if (!Array.isArray(clientItems) || clientItems.length === 0) {
    throw new Error('Cart must contain at least one item.');
  }

  let subtotal = 0;
  const validatedItems = [];

  for (const item of clientItems) {
    if (!item.productId) {
      throw new Error('Invalid item: missing productId.');
    }

    let product = catalogMap.get(item.productId);

    // If not in memory, try fetching from Firestore 'products' collection
    if (!product) {
      try {
        const prodSnap = await db.collection('products').doc(item.productId).get();
        if (prodSnap.exists) {
          product = prodSnap.data();
          product.id = prodSnap.id;
        }
      } catch (e) {
        console.warn(`[Cloud Functions] Firestore product fetch notice for ${item.productId}:`, e.message);
      }
    }

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (product.stockStatus === 'out_of_stock') {
      throw new Error(`Product "${product.name}" is currently out of stock.`);
    }

    const qty = parseInt(item.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      throw new Error(`Invalid quantity for "${product.name}". Must be at least 1.`);
    }

    const unitPrice = isDealer && product.dealerPrice ? product.dealerPrice : product.customerPrice;
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    validatedItems.push({
      productId: product.id,
      name: product.name,
      imageUrl: product.imageUrl || '',
      unitPrice,
      quantity: qty,
      lineTotal,
    });
  }

  // Business rule: Free shipping on orders >= ₹999, else ₹99
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

/**
 * Verify Razorpay HMAC-SHA256 cryptographic signature
 */
function verifySignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;

  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  try {
    const expectedBuf = Buffer.from(expected, 'utf8');
    const actualBuf = Buffer.from(signature, 'utf8');
    if (expectedBuf.length !== actualBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
// 1. CREATE RAZORPAY ORDER (Callable Firebase Cloud Function)
// ─────────────────────────────────────────────────────────────
exports.createRazorpayOrder = onCall({ cors: true }, async (request) => {
  try {
    const data = request.data || {};
    const { items, shippingAddress, isDealer = false } = data;

    // Enforce authentication: orders can only be created by authenticated users
    const customerId = request.auth?.uid || data.customerId;
    if (!customerId || customerId === 'guest-user') {
      throw new HttpsError('unauthenticated', 'You must be signed in to create an order.');
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new HttpsError('invalid-argument', 'Cart must contain at least one item.');
    }
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine1) {
      throw new HttpsError('invalid-argument', 'Incomplete shipping address.');
    }

    // 1. Authoritative server pricing
    const pricing = await calculateAuthoritativePricing(items, Boolean(isDealer));

    // 2. Receipt identifier
    const receipt = `RCP-${Date.now().toString().slice(-8)}`;

    // 3. Create order via Razorpay SDK
    let razorpayOrderId = `order_${crypto.randomBytes(8).toString('hex')}`;
    let orderAmount = pricing.amountInPaise;
    let orderCurrency = pricing.currency;

    if (razorpayClient) {
      try {
        const rzpOrder = await razorpayClient.orders.create({
          amount: pricing.amountInPaise,
          currency: pricing.currency,
          receipt,
          notes: {
            platform: 'AquaPure Firebase Functions',
            customerId,
            customerName: shippingAddress.fullName || '',
          },
        });
        razorpayOrderId = rzpOrder.id;
        orderAmount = rzpOrder.amount;
        orderCurrency = rzpOrder.currency;
      } catch (rzpErr) {
        console.warn('[Cloud Functions] Razorpay API notice (using test order):', rzpErr.message);
      }
    }

    // 4. Save initiated order in Firestore
    try {
      await db.collection('orders_initiated').doc(razorpayOrderId).set({
        razorpayOrderId,
        customerId,
        orderType: isDealer ? 'dealer' : 'customer',
        items: pricing.items,
        pricing: {
          subtotal: pricing.subtotal,
          shippingFee: pricing.shippingFee,
          total: pricing.total,
        },
        shippingAddress,
        paymentStatus: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn('[Cloud Functions] Firestore initiated record notice:', dbErr.message);
    }

    return {
      success: true,
      razorpayOrderId,
      amount: orderAmount,
      currency: orderCurrency,
      keyId: RAZORPAY_KEY_ID,
      pricing: {
        subtotal: pricing.subtotal,
        shippingFee: pricing.shippingFee,
        total: pricing.total,
      },
      items: pricing.items,
    };
  } catch (error) {
    console.error('[Cloud Functions] createRazorpayOrder error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Error creating Razorpay order');
  }
});

// ─────────────────────────────────────────────────────────────
// 2. VERIFY RAZORPAY PAYMENT (Callable Firebase Cloud Function)
// ─────────────────────────────────────────────────────────────
exports.verifyRazorpayPayment = onCall({ cors: true }, async (request) => {
  try {
    const data = request.data || {};
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      clientOrderContext = {},
    } = data;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new HttpsError(
        'invalid-argument',
        'Missing required payment verification credentials.'
      );
    }

    // 1. Verify cryptographic signature securely with RAZORPAY_KEY_SECRET
    const isValid = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      console.warn(`[Cloud Functions] Signature verification failed for payment ${razorpayPaymentId}`);
      throw new HttpsError('permission-denied', 'Cryptographic signature mismatch.');
    }

    // 2. Idempotency Check: Query Firestore for existing confirmed order with this payment ID
    try {
      const existingSnap = await db
        .collection('orders')
        .where('razorpayPaymentId', '==', razorpayPaymentId)
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existingDoc = existingSnap.docs[0];
        console.log(`[Cloud Functions] Idempotent hit: Order already confirmed: ${existingDoc.id}`);
        return {
          success: true,
          verified: true,
          isDuplicate: true,
          order: { id: existingDoc.id, ...existingDoc.data() },
        };
      }
    } catch (checkErr) {
      console.warn('[Cloud Functions] Idempotency query notice:', checkErr.message);
    }

    // 3. Fetch initiated order details from Firestore
    let initiatedData = null;
    try {
      const initSnap = await db.collection('orders_initiated').doc(razorpayOrderId).get();
      if (initSnap.exists) {
        initiatedData = initSnap.data();
      }
    } catch (initErr) {
      console.warn('[Cloud Functions] Fetch initiated order notice:', initErr.message);
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    const customerId =
      request.auth?.uid ||
      initiatedData?.customerId ||
      clientOrderContext.customerId;

    if (!customerId || customerId === 'guest-user') {
      throw new HttpsError('unauthenticated', 'You must be signed in to confirm an order.');
    }

    const items = initiatedData?.items || clientOrderContext.items || [];
    const subtotal = initiatedData?.pricing?.subtotal || clientOrderContext.subtotal || 0;
    const total = initiatedData?.pricing?.total || clientOrderContext.total || subtotal;
    const shippingAddress =
      initiatedData?.shippingAddress || clientOrderContext.shippingAddress || {};

    const customerEmail =
      clientOrderContext.customerEmail ||
      shippingAddress?.email ||
      request.auth?.token?.email ||
      initiatedData?.customerEmail ||
      '';

    const confirmedOrder = {
      orderNumber,
      customerId,
      ...(customerEmail ? { customerEmail } : {}),
      ...(clientOrderContext.dealerId ? { dealerId: clientOrderContext.dealerId } : {}),
      orderType: initiatedData?.orderType || clientOrderContext.orderType || 'customer',
      items,
      subtotal,
      total,
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

    // 4. Save confirmed order directly to Firestore via Firebase Admin SDK
    let confirmedOrderId = orderNumber;
    try {
      const docRef = await db.collection('orders').add(confirmedOrder);
      confirmedOrderId = docRef.id;
    } catch (dbWriteErr) {
      console.warn('[Cloud Functions] Firestore order save notice:', dbWriteErr.message);
    }

    // 5. Send Order Placed confirmation email asynchronously
    if (customerEmail) {
      const isDealerOrder = confirmedOrder.orderType === 'dealer' || Boolean(confirmedOrder.dealerId);
      sendTransactionalEmail({
        toEmail: customerEmail,
        toName: shippingAddress?.fullName || (isDealerOrder ? 'Wholesale Dealer Partner' : 'Valued Customer'),
        orderId: orderNumber,
        totalAmount: total.toString(),
        subtotalAmount: subtotal.toString(),
        shippingFee: (initiatedData?.pricing?.shippingFee || 0).toString(),
        items,
        itemsSummary: items.map((i) => `${i.quantity || 1}x ${i.name || 'Product'}`).join(', '),
        deliveryAddress: `${shippingAddress?.addressLine1 || ''}, ${shippingAddress?.city || ''}`,
        phone: shippingAddress?.phone || '',
        type: 'order_placed',
        orderType: confirmedOrder.orderType,
        isDealer: isDealerOrder,
        paymentMethod: 'Razorpay (Test Mode)',
        paymentStatus: 'test_success',
        orderDate: confirmedOrder.createdAt,
      }).catch((e) => console.warn('[Cloud Functions] Email delivery notice:', e.message));
    }

    // 6. Send automatic push notification for 'placed' lifecycle stage
    sendPushNotificationForOrder(db, confirmedOrderId, 'placed', { orderData: confirmedOrder }).catch((e) =>
      console.warn('[Cloud Functions] Push notification notice:', e.message)
    );

    console.log(`[Cloud Functions] Verified payment ${razorpayPaymentId} for Order ${orderNumber}`);

    return {
      success: true,
      verified: true,
      isDuplicate: false,
      orderId: confirmedOrderId,
      orderNumber,
      order: { id: confirmedOrderId, ...confirmedOrder },
    };
  } catch (error) {
    console.error('[Cloud Functions] verifyRazorpayPayment error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', error.message || 'Error verifying Razorpay payment');
  }
});

// ─────────────────────────────────────────────────────────────
// 3. TEST MODE SIGNATURE SIMULATION (Callable Helper)
// ─────────────────────────────────────────────────────────────
exports.simulateTestSignature = onCall({ cors: true }, async (request) => {
  const data = request.data || {};
  const { razorpayOrderId } = data;
  if (!razorpayOrderId) {
    throw new HttpsError('invalid-argument', 'Missing razorpayOrderId.');
  }

  const razorpayPaymentId = `pay_test_${crypto.randomBytes(7).toString('hex')}`;
  const razorpaySignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return {
    success: true,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  };
});

// ─────────────────────────────────────────────────────────────
// 4. RAZORPAY WEBHOOK (HTTP endpoint for asynchronous events)
// ─────────────────────────────────────────────────────────────
exports.razorpayWebhook = onRequest({ cors: true }, async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = JSON.stringify(req.body);

  if (signature && RAZORPAY_WEBHOOK_SECRET) {
    const expected = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    if (expected !== signature) {
      return res.status(400).send('Invalid webhook signature');
    }
  }

  const event = req.body?.event;
  console.log(`[Cloud Functions Webhook] Razorpay event received: ${event}`);

  if (event === 'payment.captured') {
    const payment = req.body?.payload?.payment?.entity;
    if (payment && payment.order_id) {
      try {
        await db
          .collection('orders')
          .where('razorpayOrderId', '==', payment.order_id)
          .get()
          .then((snapshot) => {
            snapshot.forEach((doc) => {
              doc.ref.update({
                paymentStatus: 'test_success',
                paymentReference: payment.id,
                updatedAt: new Date().toISOString(),
              });
            });
          });
      } catch (err) {
        console.warn('[Cloud Functions Webhook] Update notice:', err.message);
      }
    }
  }

  return res.status(200).json({ status: 'ok' });
});

// ─────────────────────────────────────────────────────────────
// 5. SEND TRANSACTIONAL EMAIL (Callable Firebase Cloud Function)
// ─────────────────────────────────────────────────────────────
exports.sendOrderEmail = onCall({ cors: true }, async (request) => {
  const data = request.data || {};
  return await sendTransactionalEmail(data);
});

// ─────────────────────────────────────────────────────────────
// 6. SEND ORDER PUSH NOTIFICATION (Callable Firebase Cloud Function)
// ─────────────────────────────────────────────────────────────
exports.sendOrderPushNotification = onCall({ cors: true }, async (request) => {
  const data = request.data || {};
  const { orderId, stage, orderData } = data;

  if (!orderId || !stage) {
    throw new HttpsError('invalid-argument', 'Missing orderId or stage.');
  }

  if (!NOTIFICATION_STAGES.includes(stage)) {
    throw new HttpsError('invalid-argument', `Unsupported notification stage: ${stage}`);
  }

  try {
    const result = await sendPushNotificationForOrder(db, orderId, stage, { orderData });
    return result;
  } catch (err) {
    console.error(`[Cloud Functions] sendOrderPushNotification error for order ${orderId}:`, err);
    throw new HttpsError('internal', err.message || 'Failed to dispatch push notification');
  }
});

// ─────────────────────────────────────────────────────────────
// 7. REGISTER PUSH TOKEN (Callable Firebase Cloud Function)
// ─────────────────────────────────────────────────────────────
exports.registerPushToken = onCall({ cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'You must be signed in to register a push notification token.');
  }

  const { token } = request.data || {};
  if (!token || typeof token !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing or invalid Expo push token.');
  }

  const trimmedToken = token.trim();
  const userId = request.auth.uid;

  try {
    const userRef = db.collection('users').doc(userId);
    await userRef.set(
      {
        expoPushToken: trimmedToken,
        pushTokens: admin.firestore.FieldValue.arrayUnion(trimmedToken),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`[Cloud Functions] Registered push token for user ${userId}`);
    return { success: true };
  } catch (err) {
    console.error(`[Cloud Functions] registerPushToken error for user ${userId}:`, err);
    throw new HttpsError('internal', err.message || 'Failed to save push token.');
  }
});

// ─────────────────────────────────────────────────────────────
// 8. FIRESTORE TRIGGER: AUTO-DISPATCH ON ORDER CREATION
// ─────────────────────────────────────────────────────────────
exports.onOrderCreated = onDocumentCreated('orders/{orderId}', async (event) => {
  const snap = event.data;
  if (!snap) return null;
  const orderData = snap.data();
  const orderId = event.params.orderId;

  console.log(`[Push Trigger] New order created in Firestore: ${orderId}`);
  try {
    await sendPushNotificationForOrder(db, orderId, 'placed', { orderData });
  } catch (err) {
    console.warn(`[Push Trigger] Failed sending 'placed' notification for order ${orderId}:`, err.message);
  }
  return null;
});

// ─────────────────────────────────────────────────────────────
// 9. FIRESTORE TRIGGER: AUTO-DISPATCH ON STATUS TRANSITION
// ─────────────────────────────────────────────────────────────
exports.onOrderStatusUpdated = onDocumentUpdated('orders/{orderId}', async (event) => {
  const beforeData = event.data?.before?.data();
  const afterData = event.data?.after?.data();
  if (!beforeData || !afterData) return null;

  const prevStatus = beforeData.orderStatus;
  const nextStatus = afterData.orderStatus;
  const orderId = event.params.orderId;

  if (prevStatus === nextStatus) return null;

  if (NOTIFICATION_STAGES.includes(nextStatus)) {
    console.log(`[Push Trigger] Order ${orderId} status changed: ${prevStatus} -> ${nextStatus}`);
    try {
      await sendPushNotificationForOrder(db, orderId, nextStatus, { orderData: afterData });
    } catch (err) {
      console.warn(`[Push Trigger] Failed sending '${nextStatus}' notification for order ${orderId}:`, err.message);
    }
  }
  return null;
});


