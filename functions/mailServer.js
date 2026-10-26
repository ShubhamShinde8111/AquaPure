/**
 * AquaPure — Dedicated Transactional Mail Dispatch Server
 * Listens on port 5055 for transactional email requests from Mobile & Admin apps.
 * Sends emails using configured Google App Password in .env.
 * Supports both Regular Customer and Authenticated Wholesale Dealer emails.
 */

const http = require('http');
const path = require('path');
const nodemailer = require('nodemailer');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
} catch (e) {
  // dotenv optional if env vars passed in environment
}

const PORT = process.env.PORT || process.env.MAIL_SERVER_PORT || 5055;
const GMAIL_USER = process.env.GMAIL_USER || 's83931694@gmail.com';
const rawPass = process.env.GMAIL_APP_PASSWORD || process.env.GMAIL_PASSWORD || '';
const GMAIL_APP_PASSWORD = rawPass.replace(/\s+/g, '');

console.log(`[AquaPure Mail Server] Initializing with sender: ${GMAIL_USER}`);
if (!GMAIL_APP_PASSWORD) {
  console.warn('[AquaPure Mail Server] WARNING: GMAIL_APP_PASSWORD not set');
}

const mailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'AquaPure <onboarding@resend.dev>';

async function sendEmailDispatch({ toEmail, subject, text, html }) {
  // 1. Primary: Direct Nodemailer Gmail SMTP (Delivers directly to customer/dealer inbox)
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    try {
      console.log(`[AquaPure Mail Server] Dispatching via Gmail SMTP (Nodemailer) to ${toEmail}...`);
      const info = await mailTransporter.sendMail({
        from: `"AquaPure Water Purifiers" <${GMAIL_USER}>`,
        to: toEmail,
        replyTo: GMAIL_USER,
        subject,
        text,
        html,
      });
      console.log(`[AquaPure Mail Server] ✓ Nodemailer Gmail SMTP success to ${toEmail} (MessageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId, provider: 'nodemailer_smtp' };
    } catch (smtpErr) {
      console.error(`[AquaPure Mail Server] Nodemailer SMTP error: ${smtpErr.message}. Attempting fallback...`);
    }
  }

  // 2. Fallback: Resend HTTPS API (only if Gmail SMTP was not configured or failed)
  if (RESEND_API_KEY) {
    try {
      console.log(`[AquaPure Mail Server] Dispatching via Resend API to ${toEmail}...`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [toEmail],
          subject: subject,
          text: text,
          html: html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || JSON.stringify(data));
      }
      console.log(`[AquaPure Mail Server] ✓ Resend dispatch success (ID: ${data.id}) to ${toEmail}`);
      return { success: true, messageId: data.id, provider: 'resend' };
    } catch (resendErr) {
      console.error(`[AquaPure Mail Server] Resend API error: ${resendErr.message}`);
      throw resendErr;
    }
  }

  throw new Error('No mail transport configured or both Nodemailer and Resend failed');
}

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

// ─────────────────────────────────────────────────────────────
// 1. Regular Customer Templates
// ─────────────────────────────────────────────────────────────

function buildOrderPlacedHtml({
  toName = 'Valued Customer',
  orderId = '',
  totalAmount = '0',
  subtotalAmount = '',
  shippingFee = '0',
  paymentMethod = 'Razorpay (Test Mode)',
  paymentStatus = 'test_success',
  deliveryAddress = '',
  phone = '',
  toEmail = '',
  items = [],
  itemsSummary = '',
  orderDate: rawDate,
}) {
  const orderDate = formatDateTime(rawDate);
  const subtotal = subtotalAmount ? formatCurrency(subtotalAmount) : formatCurrency(totalAmount);
  const total = formatCurrency(totalAmount);
  const deliveryText = parseFloat(shippingFee) > 0 ? `₹${formatCurrency(shippingFee)}` : 'FREE';
  const paymentBadge = formatPaymentStatusText(paymentStatus, paymentMethod);

  let itemsRowsHtml = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsRowsHtml = items
      .map(
        (it) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:600;">
            ${it.name || 'AquaPure Product'}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:center;">
            ${it.quantity || 1}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:right;">
            ₹${formatCurrency(it.price || 0)}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:700;text-align:right;">
            ₹${formatCurrency((it.price || 0) * (it.quantity || 1))}
          </td>
        </tr>`
      )
      .join('');
  } else {
    itemsRowsHtml = `
      <tr>
        <td colspan="4" style="padding:10px 8px;font-size:13px;color:#0F172A;">
          ${itemsSummary || 'AquaPure Purifier & Accessories'}
        </td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AquaPure Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F1F5F9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 14px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background:linear-gradient(135deg, #0284C7 0%, #0369A1 100%);padding:28px 24px;text-align:center;color:#FFFFFF;">
              <div style="font-size:26px;font-weight:800;letter-spacing:1px;margin:0;">💧 AQUAPURE</div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#BAE6FD;margin-top:4px;">Pure &amp; Healthy Water Guaranteed</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F0FDF4;border-bottom:1px solid #BBF7D0;padding:16px 24px;text-align:center;">
              <span style="display:inline-block;background-color:#16A34A;color:#FFFFFF;font-size:11px;font-weight:700;padding:3px 12px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.5px;">✓ Order Placed &amp; Confirmed</span>
              <h2 style="margin:8px 0 2px;font-size:19px;color:#166534;font-weight:700;">Thank You for Your Order!</h2>
              <p style="margin:0;font-size:13px;color:#475569;">Order #${orderId} • ${orderDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${toName}</strong>,<br>
                Thank you for choosing AquaPure! Your order has been placed and confirmed. Below are your complete order details.
              </p>
              <table width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:20px;" cellspacing="0" cellpadding="4">
                <tr>
                  <td style="font-size:13px;color:#64748B;">Order Number:</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#0F172A;font-family:monospace;">#${orderId}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Order Date:</td>
                  <td align="right" style="font-size:13px;font-weight:600;color:#0F172A;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Payment Method:</td>
                  <td align="right" style="font-size:13px;font-weight:600;color:#0284C7;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Payment Status:</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#16A34A;">${paymentBadge}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Estimated Delivery:</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#0F172A;">2–4 Business Days</td>
                </tr>
              </table>
              <h3 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;font-weight:700;border-bottom:2px solid #0284C7;padding-bottom:6px;">Ordered Items</h3>
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:16px;">
                <thead>
                  <tr style="background-color:#F1F5F9;font-size:12px;color:#475569;text-align:left;">
                    <th style="padding:8px;border-bottom:1px solid #CBD5E1;">Item</th>
                    <th style="padding:8px;border-bottom:1px solid #CBD5E1;text-align:center;">Qty</th>
                    <th style="padding:8px;border-bottom:1px solid #CBD5E1;text-align:right;">Unit Price</th>
                    <th style="padding:8px;border-bottom:1px solid #CBD5E1;text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>${itemsRowsHtml}</tbody>
              </table>
              <table width="100%" cellspacing="0" cellpadding="6" style="border-top:1px solid #E2E8F0;margin-top:10px;">
                <tr>
                  <td style="font-size:13px;color:#64748B;">Items Subtotal:</td>
                  <td align="right" style="font-size:13px;color:#1E293B;font-weight:600;">₹${subtotal}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Express Delivery:</td>
                  <td align="right" style="font-size:13px;color:#16A34A;font-weight:600;">${deliveryText}</td>
                </tr>
                <tr style="border-top:2px solid #0284C7;">
                  <td style="font-size:16px;color:#0F172A;font-weight:800;padding-top:10px;">Grand Total:</td>
                  <td align="right" style="font-size:18px;color:#0284C7;font-weight:800;padding-top:10px;">₹${total}</td>
                </tr>
              </table>
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;margin-top:20px;">
                <div style="font-size:12px;text-transform:uppercase;color:#64748B;font-weight:700;letter-spacing:0.5px;">Delivery Address</div>
                <div style="font-size:14px;color:#0F172A;font-weight:600;margin-top:4px;">${toName}</div>
                <div style="font-size:13px;color:#475569;margin-top:2px;line-height:1.5;">${deliveryAddress}</div>
                ${phone ? `<div style="font-size:13px;color:#475569;margin-top:2px;">Phone: ${phone}</div>` : ''}
                ${toEmail ? `<div style="font-size:13px;color:#475569;margin-top:2px;">Email: ${toEmail}</div>` : ''}
              </div>
              <div style="background-color:#EFF6FF;border-left:4px solid #0284C7;border-radius:4px;padding:14px;margin-top:16px;">
                <div style="font-size:14px;font-weight:700;color:#1E40AF;">🛠️ Complimentary Certified Installation Included</div>
                <div style="font-size:13px;color:#3B82F6;margin-top:4px;line-height:1.5;">
                  Your purchase includes free professional installation by certified AquaPure engineers. Schedule your preferred installation time slot directly in the AquaPure app under <strong>Services</strong> at zero additional charge.
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0F172A;padding:24px;text-align:center;color:#94A3B8;font-size:12px;line-height:1.6;">
              <div style="font-weight:700;color:#FFFFFF;margin-bottom:4px;">AquaPure Technologies</div>
              <div>Support: support@aquapure.com • Helpline: 1800-AQUAPURE</div>
              <div style="margin-top:8px;font-size:11px;color:#64748B;">Drink Pure, Stay Healthy!</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOrderDeliveredHtml({
  toName = 'Valued Customer',
  orderId = '',
  totalAmount = '0',
  deliveryAddress = '',
  paymentMethod = '',
  paymentStatus = 'test_success',
  deliveredAt: rawDeliveredAt,
  items = [],
  itemsSummary = '',
}) {
  const deliveryDateTime = formatDateTime(rawDeliveredAt);
  const total = formatCurrency(totalAmount);
  const paymentBadge = formatDeliveredPaymentStatusText(paymentStatus, paymentMethod);

  let itemsHtml = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsHtml = items
      .map(
        (it) => `<li><strong>${it.quantity || 1}x ${it.name || 'AquaPure Product'}</strong> — ₹${formatCurrency(it.price || 0)}</li>`
      )
      .join('');
  } else {
    itemsHtml = `<li><strong>${itemsSummary || 'AquaPure Purifier & Accessories'}</strong></li>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AquaPure Order Delivered</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F1F5F9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 14px rgba(0,0,0,0.05);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background:linear-gradient(135deg, #059669 0%, #047857 100%);padding:28px 24px;text-align:center;color:#FFFFFF;">
              <div style="font-size:26px;font-weight:800;letter-spacing:1px;margin:0;">💧 AQUAPURE</div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#A7F3D0;margin-top:4px;">Delivered &amp; Received</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ECFDF5;border-bottom:1px solid #A7F3D0;padding:16px 24px;text-align:center;">
              <span style="display:inline-block;background-color:#059669;color:#FFFFFF;font-size:11px;font-weight:700;padding:3px 12px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.5px;">✓ Package Delivered</span>
              <h2 style="margin:8px 0 2px;font-size:19px;color:#065F46;font-weight:700;">Order #${orderId} Delivered!</h2>
              <p style="margin:0;font-size:13px;color:#475569;">Delivered on ${deliveryDateTime}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${toName}</strong>,<br>
                Your AquaPure order #${orderId} has been successfully delivered and confirmed received. Welcome to fresh, crystal-clear, mineral-rich drinking water!
              </p>
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:20px;">
                <div style="font-size:13px;color:#64748B;">Delivered To:</div>
                <div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:2px;">${toName}</div>
                <div style="font-size:13px;color:#475569;margin-top:2px;">${deliveryAddress}</div>
                <div style="font-size:13px;color:#64748B;margin-top:8px;">Delivered Date &amp; Time: <strong style="color:#0F172A;">${deliveryDateTime}</strong></div>
                <div style="font-size:13px;color:#64748B;margin-top:4px;">Payment Status: <strong style="color:#16A34A;">${paymentBadge}</strong></div>
                <div style="font-size:13px;color:#64748B;margin-top:4px;">Total Order Value: <strong style="color:#0284C7;">₹${total}</strong></div>
              </div>
              <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;font-weight:700;">Delivered Items:</h3>
              <ul style="margin:0 0 20px;padding-left:20px;color:#334155;font-size:14px;line-height:1.6;">${itemsHtml}</ul>
              <div style="background-color:#EFF6FF;border-left:4px solid #0284C7;border-radius:4px;padding:16px;margin-bottom:20px;">
                <div style="font-size:14px;font-weight:700;color:#1E40AF;margin-bottom:4px;">🛠️ Schedule Your Free Installation</div>
                <div style="font-size:13px;color:#3B82F6;line-height:1.5;">
                  Need technician setup, TDS calibration, or wall mounting? You can book a certified AquaPure technician directly from the AquaPure mobile app under <strong>Services &gt; Book Technician</strong> at zero extra charge!
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0F172A;padding:24px;text-align:center;color:#94A3B8;font-size:12px;line-height:1.6;">
              <div style="font-weight:700;color:#FFFFFF;margin-bottom:4px;">AquaPure Technologies</div>
              <div>Support: support@aquapure.com • Toll-free: 1800-AQUAPURE</div>
              <div style="margin-top:8px;font-size:11px;color:#64748B;">Drink Pure, Stay Healthy!</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// 2. Wholesale Dealer Templates (Dedicated B2B)
// ─────────────────────────────────────────────────────────────

function buildWholesaleOrderPlacedHtml({
  toName = 'Wholesale Dealer Partner',
  orderId = '',
  totalAmount = '0',
  subtotalAmount = '',
  shippingFee = '0',
  paymentMethod = 'Razorpay (Test Mode)',
  paymentStatus = 'test_success',
  deliveryAddress = '',
  phone = '',
  toEmail = '',
  items = [],
  itemsSummary = '',
  orderDate: rawDate,
}) {
  const orderDate = formatDateTime(rawDate);
  const subtotal = subtotalAmount ? formatCurrency(subtotalAmount) : formatCurrency(totalAmount);
  const total = formatCurrency(totalAmount);
  const deliveryText = parseFloat(shippingFee) > 0 ? `₹${formatCurrency(shippingFee)}` : 'FREE (B2B Priority)';
  const paymentBadge = formatPaymentStatusText(paymentStatus, paymentMethod);

  let itemsRowsHtml = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsRowsHtml = items
      .map(
        (it) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:600;">
            ${it.name || 'AquaPure Wholesale Item'}
            <div style="font-size:11px;color:#0284C7;font-weight:600;">Wholesale Tier Pricing</div>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:center;font-weight:700;">
            ${it.quantity || 1}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:right;">
            ₹${formatCurrency(it.price || 0)}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:700;text-align:right;">
            ₹${formatCurrency((it.price || 0) * (it.quantity || 1))}
          </td>
        </tr>`
      )
      .join('');
  } else {
    itemsRowsHtml = `
      <tr>
        <td colspan="4" style="padding:10px 8px;font-size:13px;color:#0F172A;">
          ${itemsSummary || 'AquaPure Wholesale Consignment'}
        </td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AquaPure Wholesale Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F1F5F9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 4px 14px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%);padding:28px 24px;text-align:center;color:#FFFFFF;border-bottom:3px solid #38BDF8;">
              <div style="font-size:24px;font-weight:800;letter-spacing:1px;margin:0;">🏢 AQUAPURE B2B WHOLESALE</div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#94A3B8;margin-top:4px;">Authorized Dealer Partner Network</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#F0FDF4;border-bottom:1px solid #BBF7D0;padding:16px 24px;text-align:center;">
              <span style="display:inline-block;background-color:#0284C7;color:#FFFFFF;font-size:11px;font-weight:700;padding:3px 12px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.5px;">✓ Wholesale Order Confirmed</span>
              <h2 style="margin:8px 0 2px;font-size:20px;color:#0F172A;font-weight:800;">Wholesale Consignment Booked</h2>
              <p style="margin:0;font-size:13px;color:#475569;">Order #${orderId} • ${orderDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${toName}</strong> (Authorized Dealer),<br>
                Your wholesale dealer bulk order has been successfully created and registered with AquaPure Distribution. Below is your official wholesale purchase breakdown.
              </p>
              <table width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:20px;" cellspacing="0" cellpadding="4">
                <tr>
                  <td style="font-size:13px;color:#64748B;">Order Number:</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#0F172A;font-family:monospace;">#${orderId}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Order Type:</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#0284C7;">WHOLESALE / DEALER ORDER</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Order Date &amp; Time:</td>
                  <td align="right" style="font-size:13px;font-weight:600;color:#0F172A;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Payment Method:</td>
                  <td align="right" style="font-size:13px;font-weight:600;color:#0F172A;">${paymentMethod}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Payment Status:</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#16A34A;">${paymentBadge}</td>
                </tr>
              </table>

              <h3 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#475569;font-weight:700;border-bottom:2px solid #0284C7;padding-bottom:6px;">
                Wholesale Product Consignment
              </h3>
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:16px;">
                <thead>
                  <tr style="background-color:#F1F5F9;font-size:12px;color:#475569;text-align:left;">
                    <th style="padding:8px;border-bottom:1px solid #CBD5E1;">Item Description</th>
                    <th style="padding:8px;border-bottom:1px solid #CBD5E1;text-align:center;">Qty</th>
                    <th style="padding:8px;border-bottom:1px solid #CBD5E1;text-align:right;">Dealer Price</th>
                    <th style="padding:8px;border-bottom:1px solid #CBD5E1;text-align:right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>${itemsRowsHtml}</tbody>
              </table>

              <table width="100%" cellspacing="0" cellpadding="6" style="border-top:1px solid #E2E8F0;margin-top:10px;">
                <tr>
                  <td style="font-size:13px;color:#64748B;">Wholesale Subtotal:</td>
                  <td align="right" style="font-size:13px;color:#1E293B;font-weight:600;">₹${subtotal}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748B;">Freight &amp; Handling:</td>
                  <td align="right" style="font-size:13px;color:#16A34A;font-weight:600;">${deliveryText}</td>
                </tr>
                <tr style="border-top:2px solid #0F172A;">
                  <td style="font-size:16px;color:#0F172A;font-weight:800;padding-top:10px;">Total Invoice Amount:</td>
                  <td align="right" style="font-size:18px;color:#0284C7;font-weight:800;padding-top:10px;">₹${total}</td>
                </tr>
              </table>

              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px;margin-top:20px;">
                <div style="font-size:12px;text-transform:uppercase;color:#64748B;font-weight:700;letter-spacing:0.5px;">Consignment Delivery Address</div>
                <div style="font-size:14px;color:#0F172A;font-weight:700;margin-top:4px;">${toName}</div>
                <div style="font-size:13px;color:#475569;margin-top:2px;line-height:1.5;">${deliveryAddress}</div>
                ${phone ? `<div style="font-size:13px;color:#475569;margin-top:2px;">Contact: ${phone}</div>` : ''}
                ${toEmail ? `<div style="font-size:13px;color:#475569;margin-top:2px;">Dealer Account Email: ${toEmail}</div>` : ''}
              </div>

              <div style="background-color:#F1F5F9;border-left:4px solid #0F172A;border-radius:4px;padding:14px;margin-top:16px;">
                <div style="font-size:14px;font-weight:700;color:#0F172A;">📦 Priority Wholesale Logistics Dispatch</div>
                <div style="font-size:13px;color:#475569;margin-top:4px;line-height:1.5;">
                  Your bulk consignment is being staged at the primary regional warehouse. A verified B2B GST tax invoice and commercial packing slip will accompany the shipment.
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0F172A;padding:24px;text-align:center;color:#94A3B8;font-size:12px;line-height:1.6;">
              <div style="font-weight:700;color:#FFFFFF;margin-bottom:4px;">AquaPure B2B Distribution Systems</div>
              <div>Dealer Desk: dealers@aquapure.com • B2B Helpline: 1800-AQUAPURE-B2B</div>
              <div style="margin-top:8px;font-size:11px;color:#64748B;">AquaPure Commercial Wholesale Division</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWholesaleOrderDeliveredHtml({
  toName = 'Wholesale Dealer Partner',
  orderId = '',
  totalAmount = '0',
  deliveryAddress = '',
  paymentMethod = '',
  paymentStatus = 'test_success',
  deliveredAt: rawDeliveredAt,
  items = [],
  itemsSummary = '',
}) {
  const deliveryDateTime = formatDateTime(rawDeliveredAt);
  const total = formatCurrency(totalAmount);
  const paymentBadge = formatDeliveredPaymentStatusText(paymentStatus, paymentMethod);

  let itemsHtml = '';
  if (Array.isArray(items) && items.length > 0) {
    itemsHtml = items
      .map(
        (it) => `<li><strong>${it.quantity || 1} units — ${it.name || 'AquaPure Product'}</strong> (Dealer Unit Price: ₹${formatCurrency(it.price || 0)})</li>`
      )
      .join('');
  } else {
    itemsHtml = `<li><strong>${itemsSummary || 'AquaPure Wholesale Consignment'}</strong></li>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AquaPure Wholesale Order Delivered</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F1F5F9;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #CBD5E1;box-shadow:0 4px 14px rgba(0,0,0,0.06);" cellspacing="0" cellpadding="0">
          <tr>
            <td style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%);padding:28px 24px;text-align:center;color:#FFFFFF;border-bottom:3px solid #10B981;">
              <div style="font-size:24px;font-weight:800;letter-spacing:1px;margin:0;">🏢 AQUAPURE B2B WHOLESALE</div>
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#6EE7B7;margin-top:4px;">Consignment Delivered &amp; Received</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ECFDF5;border-bottom:1px solid #A7F3D0;padding:16px 24px;text-align:center;">
              <span style="display:inline-block;background-color:#059669;color:#FFFFFF;font-size:11px;font-weight:700;padding:3px 12px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.5px;">✓ Consignment Delivered</span>
              <h2 style="margin:8px 0 2px;font-size:20px;color:#065F46;font-weight:800;">Wholesale Order #${orderId} Delivered!</h2>
              <p style="margin:0;font-size:13px;color:#475569;">Delivered on ${deliveryDateTime}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${toName}</strong> (Authorized Dealer),<br>
                This confirms that your AquaPure wholesale consignment under Order #${orderId} has been successfully delivered to your registered facility and confirmed received.
              </p>
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:20px;">
                <div style="font-size:13px;color:#64748B;">Order Identifier:</div>
                <div style="font-size:15px;font-weight:700;color:#0F172A;margin-top:2px;">#${orderId} (Wholesale Consignment)</div>
                <div style="font-size:13px;color:#64748B;margin-top:8px;">Delivered To Facility:</div>
                <div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:2px;">${toName}</div>
                <div style="font-size:13px;color:#475569;margin-top:2px;">${deliveryAddress}</div>
                <div style="font-size:13px;color:#64748B;margin-top:8px;">Delivered Date &amp; Time: <strong style="color:#0F172A;">${deliveryDateTime}</strong></div>
                <div style="font-size:13px;color:#64748B;margin-top:4px;">Delivery Status: <strong style="color:#059669;">Delivered &amp; Received</strong></div>
                <div style="font-size:13px;color:#64748B;margin-top:4px;">Payment Status: <strong style="color:#16A34A;">${paymentBadge}</strong></div>
                <div style="font-size:13px;color:#64748B;margin-top:4px;">Total Consignment Value: <strong style="color:#0284C7;">₹${total}</strong></div>
              </div>
              <h3 style="margin:0 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#475569;font-weight:700;">Delivered Consignment Items:</h3>
              <ul style="margin:0 0 20px;padding-left:20px;color:#334155;font-size:14px;line-height:1.6;">${itemsHtml}</ul>
              <div style="background-color:#EFF6FF;border-left:4px solid #0284C7;border-radius:4px;padding:16px;margin-bottom:20px;">
                <div style="font-size:14px;font-weight:700;color:#1E40AF;margin-bottom:4px;">📋 Inventory &amp; Stock Ledger Notice</div>
                <div style="font-size:13px;color:#3B82F6;line-height:1.5;">
                  Please verify physical package integrity and update your dealership inventory. For warranty claims or wholesale restocking, contact your dedicated B2B account desk.
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0F172A;padding:24px;text-align:center;color:#94A3B8;font-size:12px;line-height:1.6;">
              <div style="font-weight:700;color:#FFFFFF;margin-bottom:4px;">AquaPure B2B Distribution Systems</div>
              <div>Dealer Desk: dealers@aquapure.com • B2B Helpline: 1800-AQUAPURE-B2B</div>
              <div style="margin-top:8px;font-size:11px;color:#64748B;">AquaPure Commercial Wholesale Division</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── HTTP Request Handler ──
const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health Check
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'AquaPure Transactional Mail Server',
        sender: GMAIL_USER,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  // Send Email Endpoint
  if (req.method === 'POST' && (url.pathname === '/api/send-email' || url.pathname === '/sendOrderEmail')) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const data = payload.data || payload; // Supports Firebase onCall format & direct JSON

        const {
          toEmail,
          toName,
          orderId = 'ORD',
          totalAmount = '0',
          subtotalAmount = '',
          shippingFee = '0',
          paymentMethod = 'Razorpay (Test Mode)',
          paymentStatus = 'test_success',
          deliveryAddress = '',
          phone = '',
          items = [],
          itemsSummary = '',
          type = 'order_placed',
          orderType = 'customer',
          isDealer = false,
          deliveredAt,
          orderDate,
        } = data;

        if (!toEmail) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Recipient email is required.' }));
          return;
        }

        const isWholesale = Boolean(isDealer || orderType === 'dealer');
        const isDelivered = type === 'order_delivered';

        let subject = '';
        let html = '';
        let plainText = '';

        if (isWholesale) {
          if (isDelivered) {
            subject = `Wholesale Order #${orderId} Delivered & Received — AquaPure Dealer Network`;
            html = buildWholesaleOrderDeliveredHtml({
              toName: toName || 'Wholesale Dealer Partner',
              orderId,
              totalAmount,
              deliveryAddress,
              paymentMethod,
              paymentStatus,
              deliveredAt,
              items,
              itemsSummary,
            });
            plainText = `AquaPure Wholesale Consignment #${orderId} Delivered & Received.
Delivered on ${formatDateTime(deliveredAt)}
Delivered To: ${toName || 'Wholesale Dealer Partner'}
Location: ${deliveryAddress}
Total Value: ₹${formatCurrency(totalAmount)}
Payment Status: ${formatDeliveredPaymentStatusText(paymentStatus, paymentMethod)}`;
          } else {
            subject = `Wholesale Order #${orderId} Placed Successfully — AquaPure Dealer Network`;
            html = buildWholesaleOrderPlacedHtml({
              toName: toName || 'Wholesale Dealer Partner',
              orderId,
              totalAmount,
              subtotalAmount,
              shippingFee,
              paymentMethod,
              paymentStatus,
              deliveryAddress,
              phone,
              toEmail,
              items,
              itemsSummary,
              orderDate,
            });
            plainText = `[WHOLESALE DEALER ORDER CONFIRMATION]
AquaPure Wholesale Consignment #${orderId} Placed Successfully.
Order Date: ${formatDateTime(orderDate)}
Total Value: ₹${formatCurrency(totalAmount)}
Payment Status: ${formatPaymentStatusText(paymentStatus, paymentMethod)}
Delivery Address: ${deliveryAddress}`;
          }
        } else {
          // Regular Customer
          if (isDelivered) {
            subject = `Order #${orderId} Delivered & Received — AquaPure`;
            html = buildOrderDeliveredHtml({
              toName: toName || 'Valued Customer',
              orderId,
              totalAmount,
              deliveryAddress,
              paymentMethod,
              paymentStatus,
              deliveredAt,
              items,
              itemsSummary,
            });
            plainText = `AquaPure Order #${orderId} Delivered and Confirmed Received.
Delivered on ${formatDateTime(deliveredAt)}
Total: ₹${formatCurrency(totalAmount)}
Payment Status: ${formatDeliveredPaymentStatusText(paymentStatus, paymentMethod)}
Delivery Address: ${deliveryAddress}
Free technician installation included!`;
          } else {
            subject = `Order #${orderId} Placed Successfully — AquaPure`;
            html = buildOrderPlacedHtml({
              toName: toName || 'Valued Customer',
              orderId,
              totalAmount,
              subtotalAmount,
              shippingFee,
              paymentMethod,
              paymentStatus,
              deliveryAddress,
              phone,
              toEmail,
              items,
              itemsSummary,
              orderDate,
            });
            plainText = `AquaPure Order #${orderId} Placed Successfully.
Hello ${toName || 'Valued Customer'},
Your order details:
Order #${orderId}
Total: ₹${formatCurrency(totalAmount)}
Payment Status: ${formatPaymentStatusText(paymentStatus, paymentMethod)}
Delivery Address: ${deliveryAddress}`;
          }
        }

        console.log(`[AquaPure Mail Server] Dispatching ${isWholesale ? 'wholesale' : 'customer'} ${type} email from ${GMAIL_USER} to ${toEmail}...`);

        const info = await sendEmailDispatch({
          toEmail,
          subject,
          text: plainText,
          html,
        });

        console.log(`[AquaPure Mail Server] SUCCESS: Sent email to ${toEmail} via ${info.provider} (MessageId: ${info.messageId})`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: true,
            messageId: info.messageId,
            sender: GMAIL_USER,
            recipient: toEmail,
            orderId,
            isWholesale,
            type,
          })
        );
      } catch (err) {
        console.error('[AquaPure Mail Server] Failed to send email:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

// ─────────────────────────────────────────────────────────────
// 3. Automated Cloud Firestore Order Email Watcher
// ─────────────────────────────────────────────────────────────

const emailProcessingQueue = [];
let isProcessingQueue = false;
const processedSet = new Set();

async function enqueueEmailJob(job) {
  const jobKey = `${job.type}_${job.docId}`;
  if (processedSet.has(jobKey)) return;
  processedSet.add(jobKey);
  emailProcessingQueue.push(job);
  processNextEmailJob();
}

async function processNextEmailJob() {
  if (isProcessingQueue || emailProcessingQueue.length === 0) return;
  isProcessingQueue = true;

  const job = emailProcessingQueue.shift();
  try {
    if (job.type === 'order_placed') {
      await executeOrderPlacedEmail(job.db, job.docId, job.order);
    } else if (job.type === 'order_delivered') {
      await executeOrderDeliveredEmail(job.db, job.docId, job.order);
    }
  } catch (err) {
    console.error(`[AquaPure Mail Server] Error processing job ${job.type} for ${job.docId}:`, err);
  } finally {
    // 1-second pacing to guarantee respectful SMTP rate compliance with Gmail
    setTimeout(() => {
      isProcessingQueue = false;
      processNextEmailJob();
    }, 1000);
  }
}

async function resolveOrderRecipient(db, order) {
  let toEmail = (order.customerEmail || order.shippingAddress?.email || order.dealerEmail || '').trim();
  let toName = order.shippingAddress?.fullName || '';

  if ((!toEmail || !toName) && (order.customerId || order.dealerId)) {
    try {
      const uId = order.dealerId || order.customerId;
      const { doc, getDoc } = require('firebase/firestore');
      const uSnap = await getDoc(doc(db, 'users', uId));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        if (!toEmail && uData.email) toEmail = uData.email.trim();
        if (!toName && (uData.displayName || uData.businessName)) {
          toName = uData.displayName || uData.businessName;
        }
      }
    } catch (e) {
      console.warn('[AquaPure Mail Server] User profile lookup notice:', e.message);
    }
  }

  const isWholesale = Boolean(order.isDealer || order.orderType === 'dealer' || order.dealerId);
  if (!toName) toName = isWholesale ? 'Wholesale Dealer Partner' : 'Valued Customer';

  return { toEmail, toName, isWholesale };
}

async function executeOrderPlacedEmail(db, docId, order) {
  const { toEmail, toName, isWholesale } = await resolveOrderRecipient(db, order);
  const orderId = order.orderNumber || docId.slice(0, 10);
  const totalAmount = (order.total || 0).toString();
  const subtotalAmount = (order.subtotal || order.total || 0).toString();
  const shippingFee = (order.shippingFee || 0).toString();
  const paymentMethod = order.paymentProvider === 'razorpay' ? 'Razorpay (Test Mode)' : (order.paymentProvider === 'cash_on_delivery' ? 'Cash on Delivery' : 'Prepaid');
  const paymentStatus = order.paymentStatus || (paymentMethod === 'Cash on Delivery' ? 'pending' : 'test_success');
  const addr = order.shippingAddress;
  const deliveryAddress = addr ? `${addr.addressLine1 || ''}, ${addr.city || ''}${addr.pincode ? ` - ${addr.pincode}` : ''}` : 'Address on file';
  const phone = addr?.phone || '';
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSummary = items.map((i) => `${i.quantity || 1}x ${i.name || 'AquaPure Purifier'}`).join(', ');
  const orderDate = order.createdAt || new Date().toISOString();

  if (!toEmail) {
    console.warn(`[AquaPure Mail Server] Skipping Order Placed email for ${orderId}: No email found.`);
    return;
  }

  let subject = '';
  let html = '';
  let plainText = '';

  if (isWholesale) {
    subject = `Wholesale Order #${orderId} Placed Successfully — AquaPure Dealer Network`;
    html = buildWholesaleOrderPlacedHtml({
      toName,
      orderId,
      totalAmount,
      subtotalAmount,
      shippingFee,
      paymentMethod,
      paymentStatus,
      deliveryAddress,
      phone,
      toEmail,
      items,
      itemsSummary,
      orderDate,
    });
    plainText = `AquaPure Wholesale Consignment #${orderId} Placed Successfully.\nOrder Date: ${formatDateTime(orderDate)}\nTotal: ₹${formatCurrency(totalAmount)}\nDelivery: ${deliveryAddress}`;
  } else {
    subject = `Order #${orderId} Placed Successfully — AquaPure`;
    html = buildOrderPlacedHtml({
      toName,
      orderId,
      totalAmount,
      subtotalAmount,
      shippingFee,
      paymentMethod,
      paymentStatus,
      deliveryAddress,
      phone,
      toEmail,
      items,
      itemsSummary,
      orderDate,
    });
    plainText = `AquaPure Order #${orderId} Placed Successfully.\nHello ${toName},\nTotal: ₹${formatCurrency(totalAmount)}\nPayment: ${formatPaymentStatusText(paymentStatus, paymentMethod)}\nDelivery Address: ${deliveryAddress}`;
  }

  console.log(`[AquaPure Mail Server] Dispatching Order Placed confirmation to ${toEmail} for Order #${orderId}...`);

  const info = await sendEmailDispatch({
    toEmail,
    subject,
    text: plainText,
    html,
  });

  console.log(`[AquaPure Mail Server] ✓ SUCCESS: Order Placed email sent to ${toEmail} (MessageId: ${info.messageId})`);

  try {
    const { doc, updateDoc } = require('firebase/firestore');
    await updateDoc(doc(db, 'orders', docId), {
      customerEmail: toEmail,
      orderPlacedEmailSent: true,
      orderPlacedEmailSentAt: new Date().toISOString(),
      orderPlacedMessageId: info.messageId,
    });
  } catch (updateErr) {
    console.warn(`[AquaPure Mail Server] Order status flag update note:`, updateErr.message);
  }
}

async function executeOrderDeliveredEmail(db, docId, order) {
  const { toEmail, toName, isWholesale } = await resolveOrderRecipient(db, order);
  const orderId = order.orderNumber || docId.slice(0, 10);
  const totalAmount = (order.total || 0).toString();
  const paymentMethod = order.paymentProvider === 'cash_on_delivery' ? 'Cash on Delivery' : 'Prepaid';
  const paymentStatus = order.paymentStatus || (paymentMethod === 'Cash on Delivery' ? 'cod' : 'paid');
  const addr = order.shippingAddress;
  const deliveryAddress = addr ? `${addr.addressLine1 || ''}, ${addr.city || ''}${addr.pincode ? ` - ${addr.pincode}` : ''}` : 'Address on file';
  const deliveredAt = order.deliveredAt || order.updatedAt || new Date().toISOString();
  const items = Array.isArray(order.items) ? order.items : [];
  const itemsSummary = items.map((i) => `${i.quantity || 1}x ${i.name || 'AquaPure Purifier'}`).join(', ');

  if (!toEmail) {
    console.warn(`[AquaPure Mail Server] Skipping Order Delivered email for ${orderId}: No email found.`);
    return;
  }

  let subject = '';
  let html = '';
  let plainText = '';

  if (isWholesale) {
    subject = `Wholesale Order #${orderId} Delivered & Received — AquaPure Dealer Network`;
    html = buildWholesaleOrderDeliveredHtml({
      toName,
      orderId,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      deliveredAt,
      items,
      itemsSummary,
    });
    plainText = `AquaPure Wholesale Consignment #${orderId} Delivered & Received.\nDelivered on: ${formatDateTime(deliveredAt)}\nTotal: ₹${formatCurrency(totalAmount)}\nDelivery: ${deliveryAddress}`;
  } else {
    subject = `Order #${orderId} Delivered & Received — AquaPure`;
    html = buildOrderDeliveredHtml({
      toName,
      orderId,
      totalAmount,
      deliveryAddress,
      paymentMethod,
      paymentStatus,
      deliveredAt,
      items,
      itemsSummary,
    });
    plainText = `AquaPure Order #${orderId} Delivered and Confirmed Received.\nDelivered on: ${formatDateTime(deliveredAt)}\nTotal: ₹${formatCurrency(totalAmount)}\nPayment: ${formatDeliveredPaymentStatusText(paymentStatus, paymentMethod)}\nDelivery Address: ${deliveryAddress}\nFree certified installation included!`;
  }

  console.log(`[AquaPure Mail Server] Dispatching Order Delivered confirmation to ${toEmail} for Order #${orderId}...`);

  const info = await sendEmailDispatch({
    toEmail,
    subject,
    text: plainText,
    html,
  });

  console.log(`[AquaPure Mail Server] ✓ SUCCESS: Order Delivered email sent to ${toEmail} (MessageId: ${info.messageId})`);

  try {
    const { doc, updateDoc } = require('firebase/firestore');
    await updateDoc(doc(db, 'orders', docId), {
      customerEmail: toEmail,
      orderDeliveredEmailSent: true,
      orderDeliveredEmailSentAt: new Date().toISOString(),
      orderDeliveredMessageId: info.messageId,
    });
  } catch (updateErr) {
    console.warn(`[AquaPure Mail Server] Order status flag update note:`, updateErr.message);
  }
}

async function startFirestoreOrderEmailWatcher() {
  try {
    const { initializeApp, getApps } = require('firebase/app');
    const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
    const { getFirestore, collection, onSnapshot } = require('firebase/firestore');

    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'waterpurifiercommerce.firebaseapp.com',
      projectId: process.env.FIREBASE_PROJECT_ID || 'waterpurifiercommerce',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'waterpurifiercommerce.firebasestorage.app',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '933338326697',
      appId: process.env.FIREBASE_APP_ID,
    };

    if (!firebaseConfig.apiKey) {
      console.log('[AquaPure Mail Server] Notice: FIREBASE_API_KEY not configured. Running in HTTP dispatch mode.');
      return;
    }

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const auth = getAuth(app);
    const db = getFirestore(app);

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@aquapure.com';
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword) {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      console.log('[AquaPure Mail Server] Authenticated with Cloud Firestore. Attaching live Order Email Watcher...');
    }

    onSnapshot(collection(db, 'orders'), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const orderDoc = change.doc;
        const order = orderDoc.data();

        // 1. Check for Placed orders that need confirmation email
        if (!order.orderPlacedEmailSent) {
          enqueueEmailJob({
            type: 'order_placed',
            docId: orderDoc.id,
            order,
            db,
          });
        }

        // 2. Check for Delivered orders that need delivered receipt confirmation
        if (order.orderStatus === 'delivered' && !order.orderDeliveredEmailSent) {
          enqueueEmailJob({
            type: 'order_delivered',
            docId: orderDoc.id,
            order,
            db,
          });
        }
      });
    }, (err) => {
      console.error('[AquaPure Mail Server] Firestore orders listener notice:', err.message);
    });
  } catch (err) {
    console.error('[AquaPure Mail Server] Failed to initialize Firestore Order Email Watcher:', err.message);
  }
}

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`💧 AquaPure Mail Server running on http://0.0.0.0:${PORT}`);
    console.log(`• Sender Email : ${GMAIL_USER}`);
    console.log(`• Health Check : http://localhost:${PORT}/health`);
    console.log(`• Email API    : http://localhost:${PORT}/api/send-email`);
    console.log(`• Live Watcher : Active Cloud Firestore synchronization`);
    console.log(`=======================================================`);

    // Start background watcher on Firestore
    startFirestoreOrderEmailWatcher();
  });
}

module.exports = {
  server,
  PORT,
  GMAIL_USER,
  startFirestoreOrderEmailWatcher,
  buildOrderPlacedHtml,
  buildOrderDeliveredHtml,
  buildWholesaleOrderPlacedHtml,
  buildWholesaleOrderDeliveredHtml,
  formatPaymentStatusText,
  formatDeliveredPaymentStatusText,
};

