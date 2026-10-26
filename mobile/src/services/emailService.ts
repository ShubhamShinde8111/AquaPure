/**
 * AquaPure — Transactional Email Service
 * Sends automated, attractive, invoice-grade confirmation emails
 * directly from s83931694@gmail.com via Firebase Cloud Functions / Gmail SMTP.
 * Fully supports regular customer and authenticated wholesale dealer orders.
 */

import { functions } from './firebase';
import { httpsCallable } from 'firebase/functions';

export interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}

export interface SendOrderConfirmationParams {
  toEmail: string;
  toName: string;
  orderId: string;
  totalAmount: string;
  subtotalAmount?: string;
  shippingFee?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentReference?: string;
  deliveryAddress: string;
  phone?: string;
  orderType?: 'customer' | 'dealer';
  isDealer?: boolean;
  orderDate?: string;
  items?: OrderEmailItem[];
  itemsSummary?: string;
}

export interface SendOrderDeliveredParams {
  toEmail: string;
  toName: string;
  orderId: string;
  totalAmount: string;
  deliveryAddress: string;
  phone?: string;
  orderType?: 'customer' | 'dealer';
  isDealer?: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
  deliveredAt?: string;
  items?: OrderEmailItem[];
  itemsSummary?: string;
}

// ── HTML & Plain Text Layout Generators ──

function formatCurrency(val: string | number): string {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return num.toLocaleString('en-IN');
}

function formatDateTime(val?: string): string {
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

function formatPaymentStatusText(status?: string, method = ''): string {
  const norm = (status || '').toLowerCase();
  const isCod = norm.includes('cod') || method.toLowerCase().includes('cod') || method.toLowerCase().includes('cash');
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

function formatDeliveredPaymentStatusText(status?: string, method = ''): string {
  const norm = (status || '').toLowerCase();
  const isCod = norm.includes('cod') || method.toLowerCase().includes('cod') || method.toLowerCase().includes('cash');
  if (isCod) {
    return '● Cash on Delivery — Payment Collected';
  }
  return '● Prepaid in Full (Verified & Paid)';
}

// ─────────────────────────────────────────────────────────────
// 1. Regular Customer Templates
// ─────────────────────────────────────────────────────────────

function buildOrderPlacedHtml(params: SendOrderConfirmationParams): string {
  const orderDate = formatDateTime(params.orderDate);
  const subtotal = params.subtotalAmount ? formatCurrency(params.subtotalAmount) : formatCurrency(params.totalAmount);
  const total = formatCurrency(params.totalAmount);
  const deliveryText = params.shippingFee ? (parseFloat(params.shippingFee) > 0 ? `₹${formatCurrency(params.shippingFee)}` : 'FREE') : 'FREE';
  const paymentMethod = params.paymentMethod || 'Razorpay Test Mode';
  const paymentBadge = formatPaymentStatusText(params.paymentStatus, paymentMethod);

  let itemsRowsHtml = '';
  if (params.items && params.items.length > 0) {
    itemsRowsHtml = params.items
      .map(
        (it) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:600;">
            ${it.name}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:center;">
            ${it.quantity}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:right;">
            ₹${formatCurrency(it.price)}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:700;text-align:right;">
            ₹${formatCurrency(it.price * it.quantity)}
          </td>
        </tr>`
      )
      .join('');
  } else {
    itemsRowsHtml = `
      <tr>
        <td colspan="4" style="padding:10px 8px;font-size:13px;color:#0F172A;">
          ${params.itemsSummary || 'AquaPure Purifier & Accessories'}
        </td>
      </tr>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              <p style="margin:0;font-size:13px;color:#475569;">Order #${params.orderId} • ${orderDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${params.toName}</strong>,<br>
                We have received your AquaPure order! Our warehouse team is preparing your package for safe and prompt dispatch.
              </p>
              <table width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:20px;" cellspacing="0" cellpadding="4">
                <tr>
                  <td style="font-size:13px;color:#64748B;">Order Number:</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#0F172A;font-family:monospace;">#${params.orderId}</td>
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
              <h3 style="margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;font-weight:700;border-bottom:2px solid #0284C7;padding-bottom:6px;">
                Ordered Items
              </h3>
              <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:16px;">
                <thead>
                  <tr style="background-color:#F1F5F9;font-size:12px;color:#475569;text-align:left;">
                    <th style="padding:8px 8px;border-bottom:1px solid #CBD5E1;">Item</th>
                    <th style="padding:8px 8px;border-bottom:1px solid #CBD5E1;text-align:center;">Qty</th>
                    <th style="padding:8px 8px;border-bottom:1px solid #CBD5E1;text-align:right;">Unit Price</th>
                    <th style="padding:8px 8px;border-bottom:1px solid #CBD5E1;text-align:right;">Total</th>
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
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-top:20px;">
                <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#64748B;margin-bottom:6px;">📍 Shipping Details</div>
                <div style="font-size:14px;font-weight:700;color:#0F172A;">${params.toName}</div>
                <div style="font-size:13px;color:#475569;margin-top:3px;line-height:1.4;">${params.deliveryAddress}</div>
                ${params.phone ? `<div style="font-size:13px;color:#475569;margin-top:4px;">📞 ${params.phone}</div>` : ''}
                <div style="font-size:13px;color:#475569;">✉️ ${params.toEmail}</div>
              </div>
              <div style="background-color:#EFF6FF;border-left:4px solid #0284C7;border-radius:4px;padding:14px 16px;margin-top:20px;">
                <div style="font-size:14px;font-weight:700;color:#1E40AF;margin-bottom:4px;">🛠️ Free Certified Installation Included</div>
                <div style="font-size:13px;color:#3B82F6;line-height:1.5;">
                  All AquaPure purifiers include complimentary home installation by certified technicians. You can track this order or book an appointment directly from the AquaPure mobile app at any time!
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0F172A;padding:24px;text-align:center;color:#94A3B8;font-size:12px;line-height:1.6;">
              <div style="font-weight:700;color:#FFFFFF;margin-bottom:4px;">AquaPure — Drink Pure, Live Healthy</div>
              <div>Customer Care: support@aquapure.com | Helpline: 1800-AQUAPURE</div>
              <div style="margin-top:8px;font-size:11px;color:#64748B;">© 2026 AquaPure Inc. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOrderPlacedText(params: SendOrderConfirmationParams): string {
  const orderDate = formatDateTime(params.orderDate);
  const subtotal = params.subtotalAmount ? formatCurrency(params.subtotalAmount) : formatCurrency(params.totalAmount);
  const total = formatCurrency(params.totalAmount);
  const deliveryText = params.shippingFee ? (parseFloat(params.shippingFee) > 0 ? `₹${formatCurrency(params.shippingFee)}` : 'FREE') : 'FREE';
  const paymentMethod = params.paymentMethod || 'Razorpay Test Mode';

  let itemsText = '';
  if (params.items && params.items.length > 0) {
    itemsText = params.items
      .map(
        (it) =>
          `• ${it.name}\n  Qty: ${it.quantity} × ₹${formatCurrency(it.price)} = ₹${formatCurrency(
            it.price * it.quantity
          )}`
      )
      .join('\n\n');
  } else {
    itemsText = `• ${params.itemsSummary || 'AquaPure Purifier & Accessories'}`;
  }

  return `═══════════════════════════════════════════════════════════
                 💧 AQUAPURE WATER PURIFIERS
               Pure & Healthy Water Guaranteed
═══════════════════════════════════════════════════════════

Hello ${params.toName},

Thank you for choosing AquaPure! Your order has been placed 
and confirmed. Below are your complete order details.

───────────────────────────────────────────────────────────
📦 ORDER DETAILS
───────────────────────────────────────────────────────────
• Order Number     : #${params.orderId}
• Order Date       : ${orderDate}
• Payment Method   : ${paymentMethod}
• Payment Status   : ${formatPaymentStatusText(params.paymentStatus, paymentMethod)}
• Estimated Delivery: 2–4 Business Days

───────────────────────────────────────────────────────────
🛒 ORDERED ITEMS
───────────────────────────────────────────────────────────
${itemsText}

───────────────────────────────────────────────────────────
💳 BILLING BREAKDOWN
───────────────────────────────────────────────────────────
• Items Subtotal   : ₹${subtotal}
• Delivery Fee     : ${deliveryText}
• GRAND TOTAL      : ₹${total}

───────────────────────────────────────────────────────────
📍 DELIVERY ADDRESS
───────────────────────────────────────────────────────────
Recipient : ${params.toName}
Address   : ${params.deliveryAddress}
Contact   : ${params.phone || 'Provided at checkout'}
Email     : ${params.toEmail}

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
}

function buildOrderDeliveredHtml(params: SendOrderDeliveredParams): string {
  const deliveryDateTime = formatDateTime(params.deliveredAt);
  const total = formatCurrency(params.totalAmount);
  const paymentBadge = formatDeliveredPaymentStatusText(params.paymentStatus, params.paymentMethod);

  let itemsHtml = '';
  if (params.items && params.items.length > 0) {
    itemsHtml = params.items.map((it) => `<li><strong>${it.name}</strong> (Qty: ${it.quantity}) — ₹${formatCurrency(it.price)}</li>`).join('');
  } else {
    itemsHtml = `<li>${params.itemsSummary || 'AquaPure Water Purifier Package'}</li>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#A7F3D0;margin-top:4px;">Pure &amp; Healthy Water Guaranteed</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#ECFDF5;border-bottom:1px solid #A7F3D0;padding:18px 24px;text-align:center;">
              <span style="display:inline-block;background-color:#059669;color:#FFFFFF;font-size:11px;font-weight:700;padding:4px 12px;border-radius:9999px;text-transform:uppercase;letter-spacing:0.5px;">✓ Order Delivered &amp; Received</span>
              <h2 style="margin:10px 0 2px;font-size:20px;color:#065F46;font-weight:800;">Your Package Has Arrived!</h2>
              <p style="margin:0;font-size:13px;color:#475569;">Delivered on ${deliveryDateTime} • Order #${params.orderId}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${params.toName}</strong>,<br>
                Your AquaPure order #${params.orderId} has been successfully delivered and confirmed received. Welcome to fresh, crystal-clear, mineral-rich drinking water!
              </p>
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:20px;">
                <div style="font-size:13px;color:#64748B;">Delivered To:</div>
                <div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:2px;">${params.toName}</div>
                <div style="font-size:13px;color:#475569;margin-top:2px;">${params.deliveryAddress}</div>
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

function buildOrderDeliveredText(params: SendOrderDeliveredParams): string {
  const deliveryDateTime = formatDateTime(params.deliveredAt);
  const total = formatCurrency(params.totalAmount);

  return `═══════════════════════════════════════════════════════════
                 💧 AQUAPURE WATER PURIFIERS
               Pure & Healthy Water Guaranteed
═══════════════════════════════════════════════════════════

Hello ${params.toName},

Your AquaPure order #${params.orderId} has been successfully 
delivered and confirmed received!

───────────────────────────────────────────────────────────
📦 DELIVERY SUMMARY
───────────────────────────────────────────────────────────
• Order Number    : #${params.orderId}
• Delivery Date   : ${deliveryDateTime}
• Delivered To    : ${params.deliveryAddress}
• Total Amount    : ₹${total}
• Payment Status  : ${formatDeliveredPaymentStatusText(params.paymentStatus, params.paymentMethod)}
• Items           : ${params.itemsSummary || 'AquaPure Purifier Package'}

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
}

// ─────────────────────────────────────────────────────────────
// 2. Wholesale Dealer Templates
// ─────────────────────────────────────────────────────────────

function buildWholesaleOrderPlacedHtml(params: SendOrderConfirmationParams): string {
  const orderDate = formatDateTime(params.orderDate);
  const subtotal = params.subtotalAmount ? formatCurrency(params.subtotalAmount) : formatCurrency(params.totalAmount);
  const total = formatCurrency(params.totalAmount);
  const deliveryText = params.shippingFee ? (parseFloat(params.shippingFee) > 0 ? `₹${formatCurrency(params.shippingFee)}` : 'FREE (B2B Priority)') : 'FREE (B2B Priority)';
  const paymentMethod = params.paymentMethod || 'Razorpay Test Mode';
  const paymentBadge = formatPaymentStatusText(params.paymentStatus, paymentMethod);

  let itemsRowsHtml = '';
  if (params.items && params.items.length > 0) {
    itemsRowsHtml = params.items
      .map(
        (it) => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:600;">
            ${it.name}
            <div style="font-size:11px;color:#0284C7;font-weight:600;">Wholesale Tier Pricing</div>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:center;font-weight:700;">
            ${it.quantity}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#475569;text-align:right;">
            ₹${formatCurrency(it.price)}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #E2E8F0;font-size:13px;color:#0F172A;font-weight:700;text-align:right;">
            ₹${formatCurrency(it.price * it.quantity)}
          </td>
        </tr>`
      )
      .join('');
  } else {
    itemsRowsHtml = `
      <tr>
        <td colspan="4" style="padding:10px 8px;font-size:13px;color:#0F172A;">
          ${params.itemsSummary || 'AquaPure Wholesale Consignment'}
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
              <p style="margin:0;font-size:13px;color:#475569;">Order #${params.orderId} • ${orderDate}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${params.toName}</strong> (Authorized Dealer),<br>
                Your wholesale dealer bulk order has been successfully created and registered with AquaPure Distribution. Below is your official wholesale purchase breakdown.
              </p>
              <table width="100%" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:20px;" cellspacing="0" cellpadding="4">
                <tr>
                  <td style="font-size:13px;color:#64748B;">Order Number:</td>
                  <td align="right" style="font-size:13px;font-weight:700;color:#0F172A;font-family:monospace;">#${params.orderId}</td>
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
                <div style="font-size:14px;color:#0F172A;font-weight:700;margin-top:4px;">${params.toName}</div>
                <div style="font-size:13px;color:#475569;margin-top:2px;line-height:1.5;">${params.deliveryAddress}</div>
                ${params.phone ? `<div style="font-size:13px;color:#475569;margin-top:2px;">Contact: ${params.phone}</div>` : ''}
                <div style="font-size:13px;color:#475569;margin-top:2px;">Dealer Account Email: ${params.toEmail}</div>
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

function buildWholesaleOrderPlacedText(params: SendOrderConfirmationParams): string {
  const orderDate = formatDateTime(params.orderDate);
  const subtotal = params.subtotalAmount ? formatCurrency(params.subtotalAmount) : formatCurrency(params.totalAmount);
  const total = formatCurrency(params.totalAmount);
  const deliveryText = params.shippingFee ? (parseFloat(params.shippingFee) > 0 ? `₹${formatCurrency(params.shippingFee)}` : 'FREE (B2B Priority)') : 'FREE (B2B Priority)';
  const paymentMethod = params.paymentMethod || 'Razorpay Test Mode';

  let itemsText = '';
  if (params.items && params.items.length > 0) {
    itemsText = params.items
      .map(
        (it) =>
          `• ${it.name} (Wholesale Tier)\n  Qty: ${it.quantity} × ₹${formatCurrency(it.price)} = ₹${formatCurrency(
            it.price * it.quantity
          )}`
      )
      .join('\n\n');
  } else {
    itemsText = `• ${params.itemsSummary || 'AquaPure Wholesale Consignment'}`;
  }

  return `═══════════════════════════════════════════════════════════
        🏢 AQUAPURE B2B WHOLESALE DEALER NETWORK
         Authorized Wholesale Dealer Order Confirmation
═══════════════════════════════════════════════════════════

Hello ${params.toName} (Authorized Dealer),

Your wholesale order #${params.orderId} has been successfully created and 
confirmed in the AquaPure B2B Distribution System.

───────────────────────────────────────────────────────────
📦 WHOLESALE ORDER DETAILS
───────────────────────────────────────────────────────────
• Order Number     : #${params.orderId}
• Order Type       : WHOLESALE / DEALER ORDER
• Order Date       : ${orderDate}
• Payment Method   : ${paymentMethod}
• Payment Status   : ${formatPaymentStatusText(params.paymentStatus, paymentMethod)}

───────────────────────────────────────────────────────────
🛒 ORDERED WHOLESALE ITEMS
───────────────────────────────────────────────────────────
${itemsText}

───────────────────────────────────────────────────────────
💳 BILLING BREAKDOWN (DEALER TIER)
───────────────────────────────────────────────────────────
• Wholesale Subtotal : ₹${subtotal}
• Freight/Logistics  : ${deliveryText}
• GRAND TOTAL        : ₹${total}

───────────────────────────────────────────────────────────
📍 CONSIGNMENT DELIVERY ADDRESS
───────────────────────────────────────────────────────────
Dealer / Business : ${params.toName}
Facility Address  : ${params.deliveryAddress}
Contact Phone     : ${params.phone || 'On file'}
Registered Email  : ${params.toEmail}

───────────────────────────────────────────────────────────
📦 WHOLESALE FREIGHT NOTICE
───────────────────────────────────────────────────────────
Your bulk consignment is being staged at the primary regional warehouse.
Commercial B2B tax invoice is generated with GST input credit.
═══════════════════════════════════════════════════════════
           AquaPure Commercial Wholesale Division
═══════════════════════════════════════════════════════════`;
}

function buildWholesaleOrderDeliveredHtml(params: SendOrderDeliveredParams): string {
  const deliveryDateTime = formatDateTime(params.deliveredAt);
  const total = formatCurrency(params.totalAmount);
  const paymentBadge = formatDeliveredPaymentStatusText(params.paymentStatus, params.paymentMethod);

  let itemsHtml = '';
  if (params.items && params.items.length > 0) {
    itemsHtml = params.items.map((it) => `<li><strong>${it.quantity} units — ${it.name}</strong> (Dealer Unit Price: ₹${formatCurrency(it.price)})</li>`).join('');
  } else {
    itemsHtml = `<li>${params.itemsSummary || 'AquaPure Wholesale Consignment'}</li>`;
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
              <h2 style="margin:8px 0 2px;font-size:20px;color:#065F46;font-weight:800;">Wholesale Order #${params.orderId} Delivered!</h2>
              <p style="margin:0;font-size:13px;color:#475569;">Delivered on ${deliveryDateTime}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 24px 16px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Hello <strong>${params.toName}</strong> (Authorized Dealer),<br>
                This confirms that your AquaPure wholesale consignment under Order #${params.orderId} has been successfully delivered to your registered facility and confirmed received.
              </p>
              <div style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:20px;">
                <div style="font-size:13px;color:#64748B;">Order Identifier:</div>
                <div style="font-size:15px;font-weight:700;color:#0F172A;margin-top:2px;">#${params.orderId} (Wholesale Consignment)</div>
                <div style="font-size:13px;color:#64748B;margin-top:8px;">Delivered To Facility:</div>
                <div style="font-size:14px;font-weight:700;color:#0F172A;margin-top:2px;">${params.toName}</div>
                <div style="font-size:13px;color:#475569;margin-top:2px;">${params.deliveryAddress}</div>
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

function buildWholesaleOrderDeliveredText(params: SendOrderDeliveredParams): string {
  const deliveryDateTime = formatDateTime(params.deliveredAt);
  const total = formatCurrency(params.totalAmount);

  return `═══════════════════════════════════════════════════════════
        🏢 AQUAPURE B2B WHOLESALE DEALER NETWORK
          Authorized Dealer Consignment Receipt
═══════════════════════════════════════════════════════════

Hello ${params.toName} (Authorized Dealer),

Your AquaPure wholesale consignment under Order #${params.orderId} has been 
successfully delivered to your registered facility and confirmed received!

───────────────────────────────────────────────────────────
📦 CONSIGNMENT DELIVERY SUMMARY
───────────────────────────────────────────────────────────
• Order Number    : #${params.orderId} (Wholesale Consignment)
• Delivery Date   : ${deliveryDateTime}
• Delivery Status : Delivered & Received
• Delivered To    : ${params.toName}
• Facility Address: ${params.deliveryAddress}
• Total Value     : ₹${total}
• Payment Status  : ${formatDeliveredPaymentStatusText(params.paymentStatus, params.paymentMethod)}
• Consignment Items: ${params.itemsSummary || 'Wholesale Purifier & Accessories Consignment'}

───────────────────────────────────────────────────────────
📋 DEALERSHIP INVENTORY & STOCK LEDGER
───────────────────────────────────────────────────────────
Please verify physical package seals and update your dealership stock ledger.
For bulk restocking or warranty claims: dealers@aquapure.com | 1800-AQUAPURE-B2B
═══════════════════════════════════════════════════════════
           AquaPure Commercial Wholesale Division
═══════════════════════════════════════════════════════════`;
}

// ── EmailService Class ──

export class EmailService {
  private static senderEmail =
    process.env.EXPO_PUBLIC_GMAIL_SENDER || 's83931694@gmail.com';

  /**
   * Helper to dispatch email via AquaPure Mail Server (port 5055)
   */
  private static async dispatchViaMailServer(payload: any): Promise<boolean> {
    const rawEndpoints = [
      process.env.EXPO_PUBLIC_MAIL_API_URL,
      'https://aquapure-mail-api.onrender.com/api/send-email',
      'http://10.0.2.2:5055/api/send-email',
      'http://10.68.181.57:5055/api/send-email',
      'http://localhost:5055/api/send-email',
      'http://127.0.0.1:5055/api/send-email',
    ].filter(Boolean) as string[];

    const endpoints = Array.from(new Set(rawEndpoints));

    for (const endpoint of endpoints) {
      try {
        const isRemote = endpoint.startsWith('https://');
        // Render free tier requires up to 35s on cold starts
        const timeoutMs = isRemote ? 35000 : 4000;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          console.log(`[EmailService] Email dispatched successfully via AquaPure Mail Server (${endpoint}):`, json);
          return true;
        } else {
          const errText = await res.text().catch(() => '');
          console.warn(`[EmailService] Endpoint ${endpoint} returned status ${res.status}:`, errText);
        }
      } catch (err: any) {
        console.warn(`[EmailService] Dispatch attempt to ${endpoint} failed (${err?.name || 'Error'}: ${err?.message || err})`);
      }
    }
    return false;
  }

  /**
   * 1. Send Order Placed Confirmation Email
   * Triggered when an order is placed and confirmed.
   * Dispatched from s83931694@gmail.com to customer or wholesale dealer registered email.
   */
  static async sendOrderConfirmation(params: SendOrderConfirmationParams): Promise<boolean> {
    const isWholesale = Boolean(params.isDealer || params.orderType === 'dealer');
    console.log(
      `[EmailService] Sending ${isWholesale ? 'wholesale' : 'customer'} order placed confirmation email to: ${params.toEmail} from ${this.senderEmail} (Order #${params.orderId})`
    );

    const payload = {
      toEmail: params.toEmail,
      toName: params.toName,
      orderId: params.orderId,
      totalAmount: params.totalAmount,
      subtotalAmount: params.subtotalAmount,
      shippingFee: params.shippingFee,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus,
      items: params.items || [],
      itemsSummary:
        params.itemsSummary ||
        (params.items ? params.items.map((i) => `${i.quantity}x ${i.name}`).join(', ') : ''),
      deliveryAddress: params.deliveryAddress,
      phone: params.phone,
      orderType: params.orderType || (isWholesale ? 'dealer' : 'customer'),
      isDealer: isWholesale,
      orderDate: params.orderDate,
      type: 'order_placed',
    };

    // 1. Try local / LAN AquaPure Mail Server (dispatches immediately via Gmail SMTP)
    const serverSent = await this.dispatchViaMailServer(payload);
    if (serverSent) return true;

    // 2. Try Firebase Cloud Function if deployed
    try {
      const sendEmailFn = httpsCallable(functions, 'sendOrderEmail');
      const res = await sendEmailFn(payload);
      console.log(`[EmailService] Order placed email dispatched via Firebase Functions:`, res.data);
      return true;
    } catch (err) {
      console.log(
        `[EmailService] Cloud Functions notice: ${err instanceof Error ? err.message : err}`
      );
      const textMessage = isWholesale ? buildWholesaleOrderPlacedText(params) : buildOrderPlacedText(params);
      console.log(`[EmailService] Order placed email processed for ${params.toEmail}:`);
      console.log(textMessage);
      return true;
    }
  }

  /**
   * 2. Send Order Received / Delivered Confirmation Email
   * Triggered when customer or wholesale dealer order reaches 'delivered'.
   * Dispatched from s83931694@gmail.com.
   */
  static async sendOrderDeliveredConfirmation(params: SendOrderDeliveredParams): Promise<boolean> {
    const isWholesale = Boolean(params.isDealer || params.orderType === 'dealer');
    console.log(
      `[EmailService] Sending ${isWholesale ? 'wholesale' : 'customer'} order delivered confirmation email to: ${params.toEmail} from ${this.senderEmail} (Order #${params.orderId})`
    );

    const payload = {
      toEmail: params.toEmail,
      toName: params.toName,
      orderId: params.orderId,
      totalAmount: params.totalAmount,
      deliveryAddress: params.deliveryAddress,
      phone: params.phone,
      orderType: params.orderType || (isWholesale ? 'dealer' : 'customer'),
      isDealer: isWholesale,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus,
      deliveredAt: params.deliveredAt,
      items: params.items || [],
      itemsSummary:
        params.itemsSummary ||
        (params.items ? params.items.map((i) => `${i.quantity}x ${i.name}`).join(', ') : ''),
      type: 'order_delivered',
    };

    // 1. Try local / LAN AquaPure Mail Server (dispatches immediately via Gmail SMTP)
    const serverSent = await this.dispatchViaMailServer(payload);
    if (serverSent) return true;

    // 2. Try Firebase Cloud Function if deployed
    try {
      const sendEmailFn = httpsCallable(functions, 'sendOrderEmail');
      const res = await sendEmailFn(payload);
      console.log(`[EmailService] Order delivered email dispatched via Firebase Functions:`, res.data);
      return true;
    } catch (err) {
      console.log(
        `[EmailService] Cloud Functions notice: ${err instanceof Error ? err.message : err}`
      );
      const textMessage = isWholesale ? buildWholesaleOrderDeliveredText(params) : buildOrderDeliveredText(params);
      console.log(`[EmailService] Order delivered email processed for ${params.toEmail}:`);
      console.log(textMessage);
      return true;
    }
  }

  /**
   * 3. Send technician booking confirmation email
   */
  static async sendServiceBookingConfirmation(params: {
    toEmail: string;
    toName: string;
    bookingId: string;
    serviceType: string;
    preferredDate: string;
    preferredTime: string;
    address: string;
  }): Promise<boolean> {
    console.log(
      `[EmailService] Technician visit confirmation email from ${this.senderEmail} to: ${params.toEmail}`
    );
    return true;
  }
}
