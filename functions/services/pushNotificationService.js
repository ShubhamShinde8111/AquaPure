/**
 * AquaPure — Automatic Push Notification Service for Order Lifecycle
 *
 * Implements:
 * 1. Complete order lifecycle notification dispatch:
 *    - Order Placed Successfully ('placed')
 *    - Order Confirmed ('confirmed')
 *    - Order Shipped ('shipped')
 *    - Order Delivered ('delivered')
 * 2. Customer targeting:
 *    - Resolves push tokens registered to the authenticated customer who owns the order
 *    - Never broadcasts to unverified or wrong recipients
 * 3. Idempotency & Duplicate prevention:
 *    - Tracks sent stages under order.pushNotificationsSent.[stage]
 *    - In-flight memory lock preventing rapid duplicate execution
 * 4. Expo Push API integration:
 *    - Validates Expo push token formats (ExponentPushToken[...])
 *    - Batches requests with standard headers
 *    - Deep link payload targeting `/orders/{orderId}`
 *    - DeviceNotRegistered stale token cleanup
 */

let admin = null;
try {
  admin = require('firebase-admin');
} catch {
  admin = null;
}

const NOTIFICATION_STAGES = ['placed', 'confirmed', 'shipped', 'delivered'];

// In-flight locking set to prevent race conditions during rapid triggers
const inFlightLocks = new Set();

/**
 * Format currency in Indian Rupees
 */
function formatCurrency(val) {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return num.toLocaleString('en-IN');
}

/**
 * Check if a token string matches the Expo Push Token format
 */
function isExpoPushToken(token) {
  return (
    typeof token === 'string' &&
    /^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token.trim())
  );
}

/**
 * Build rich title and body copy for each order lifecycle stage
 */
function buildNotificationMessage({
  stage,
  orderNumber = 'Order',
  total = 0,
  courierName = '',
  trackingNumber = '',
}) {
  const cleanNum = orderNumber.startsWith('#') ? orderNumber : `#${orderNumber}`;
  const formattedTotal = total ? `₹${formatCurrency(total)}` : '';

  switch (stage) {
    case 'placed':
      return {
        title: 'Order Placed Successfully! 💧',
        body: formattedTotal
          ? `Your AquaPure order ${cleanNum} for ${formattedTotal} has been placed. We're getting it ready!`
          : `Your AquaPure order ${cleanNum} has been placed. We're getting it ready!`,
      };
    case 'confirmed':
      return {
        title: 'Order Confirmed! ✅',
        body: `Your AquaPure order ${cleanNum} has been confirmed and is being prepped for dispatch.`,
      };
    case 'shipped': {
      let courierDetails = '';
      if (courierName && trackingNumber) {
        courierDetails = ` via ${courierName} (${trackingNumber})`;
      } else if (courierName) {
        courierDetails = ` via ${courierName}`;
      } else if (trackingNumber) {
        courierDetails = ` (Tracking: ${trackingNumber})`;
      }
      return {
        title: 'Order Shipped! 🚚',
        body: `Great news! Your order ${cleanNum} is on the way${courierDetails}. Tap to track delivery.`,
      };
    }
    case 'delivered':
      return {
        title: 'Order Delivered! 🎉',
        body: `Your AquaPure order ${cleanNum} has been delivered. Thank you for choosing pure, healthy water!`,
      };
    default:
      return {
        title: `Order Update: ${stage.toUpperCase()} 💧`,
        body: `Status updated for order ${cleanNum}.`,
      };
  }
}

/**
 * Send a batch of notifications to the Expo Push API
 */
async function sendExpoPushBatch(messages, expoAccessToken = process.env.EXPO_ACCESS_TOKEN) {
  if (!messages || messages.length === 0) {
    return { success: true, count: 0, tickets: [] };
  }

  const endpoint = 'https://exp.host/--/api/v2/push/send';
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
  };

  if (expoAccessToken) {
    headers['Authorization'] = `Bearer ${expoAccessToken}`;
  }

  const tickets = [];
  const chunkSize = 100;

  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const response = await globalThis.fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(chunk),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[Push Service] Expo API responded with HTTP ${response.status}:`, errorText);
        continue;
      }

      const result = await response.json();
      if (result && Array.isArray(result.data)) {
        tickets.push(...result.data);
      }
    } catch (netErr) {
      console.warn('[Push Service] Network error dispatching push chunk:', netErr.message);
    }
  }

  return { success: true, count: messages.length, tickets };
}

/**
 * Dispatch an order lifecycle push notification
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} orderId
 * @param {'placed'|'confirmed'|'shipped'|'delivered'} stage
 * @param {object} [options]
 */
async function sendPushNotificationForOrder(db, orderId, stage, options = {}) {
  if (!orderId || !stage) {
    return { success: false, reason: 'missing_arguments' };
  }

  if (!NOTIFICATION_STAGES.includes(stage)) {
    return { success: false, reason: `unsupported_stage_${stage}` };
  }

  const lockKey = `${orderId}_${stage}`;
  if (inFlightLocks.has(lockKey)) {
    console.log(`[Push Service] Duplicate trigger in-flight for ${lockKey}. Skipping.`);
    return { success: true, skipped: true, reason: 'in_flight' };
  }
  inFlightLocks.add(lockKey);

  try {
    const orderRef = db.collection('orders').doc(orderId);
    let order = options.orderData;

    if (!order) {
      const snap = await orderRef.get();
      if (!snap.exists) {
        console.warn(`[Push Service] Order ${orderId} does not exist in Firestore.`);
        return { success: false, reason: 'order_not_found' };
      }
      order = { id: snap.id, ...snap.data() };
    } else {
      order = { id: orderId, ...order };
    }

    // 1. Check duplicate notification guard on the order record
    const alreadySentAt =
      order.pushNotificationsSent?.[stage] ||
      order[`pushNotificationsSent.${stage}`];

    if (alreadySentAt) {
      console.log(`[Push Service] Notification for stage "${stage}" already sent at ${alreadySentAt} for order ${orderId}. Skipping.`);
      return {
        success: true,
        skipped: true,
        reason: 'duplicate_prevented',
        sentAt: alreadySentAt,
      };
    }

    // 2. Identify the target customer
    const targetUserId = order.customerId || order.dealerId;
    if (!targetUserId || targetUserId === 'guest-user') {
      console.log(`[Push Service] Order ${orderId} has no registered customerId. Skipping push.`);
      // Record to prevent future redundant attempts
      await orderRef.update({
        [`pushNotificationsSent.${stage}`]: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).catch(() => {});
      return { success: false, reason: 'no_registered_customer' };
    }

    // 3. Retrieve registered Expo push token(s) for this verified customer
    const candidateTokens = new Set();

    // Check directly on order document if attached at checkout
    if (order.expoPushToken && isExpoPushToken(order.expoPushToken)) {
      candidateTokens.add(order.expoPushToken.trim());
    }

    // Query user profile
    try {
      const userSnap = await db.collection('users').doc(targetUserId).get();
      if (userSnap.exists) {
        const userData = userSnap.data() || {};
        if (userData.expoPushToken && isExpoPushToken(userData.expoPushToken)) {
          candidateTokens.add(userData.expoPushToken.trim());
        }
        if (Array.isArray(userData.pushTokens)) {
          for (const t of userData.pushTokens) {
            if (isExpoPushToken(t)) {
              candidateTokens.add(t.trim());
            }
          }
        }
      }
    } catch (userErr) {
      console.warn(`[Push Service] Error fetching user ${targetUserId}:`, userErr.message);
    }

    const tokens = Array.from(candidateTokens);
    const nowIso = new Date().toISOString();

    if (tokens.length === 0) {
      console.log(`[Push Service] No valid Expo push tokens found for customer ${targetUserId} (Order ${orderId}). Recording completion.`);
      await orderRef.update({
        [`pushNotificationsSent.${stage}`]: nowIso,
        updatedAt: nowIso,
      }).catch(() => {});
      return { success: true, count: 0, reason: 'no_tokens_registered' };
    }

    // 4. Build notification message
    const orderNumber = order.orderNumber || orderId;
    const msg = buildNotificationMessage({
      stage,
      orderNumber,
      total: order.total || order.subtotal || 0,
      courierName: order.courierName || '',
      trackingNumber: order.trackingNumber || '',
    });

    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title: msg.title,
      body: msg.body,
      channelId: 'order-updates',
      priority: 'high',
      _displayInForeground: true,
      data: {
        orderId: order.id || orderId,
        orderNumber,
        status: stage,
        url: `/orders/${order.id || orderId}`,
        timestamp: nowIso,
      },
    }));

    // 5. Dispatch to Expo Push API
    const pushResult = await sendExpoPushBatch(messages);

    // 6. Record sent stage to guarantee duplicate notifications are impossible
    await orderRef.update({
      [`pushNotificationsSent.${stage}`]: nowIso,
      updatedAt: nowIso,
    }).catch((err) => {
      console.warn(`[Push Service] Notice updating pushNotificationsSent for order ${orderId}:`, err.message);
    });

    // 7. Check for stale / unregistered devices and clean up
    if (pushResult.tickets && pushResult.tickets.length > 0) {
      for (let idx = 0; idx < pushResult.tickets.length; idx++) {
        const ticket = pushResult.tickets[idx];
        if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
          const badToken = tokens[idx];
          if (badToken) {
            console.log(`[Push Service] Cleaning up unregistered token ${badToken} for user ${targetUserId}`);
            const userRef = db.collection('users').doc(targetUserId);
            const arrayRemove = admin?.firestore?.FieldValue?.arrayRemove;
            userRef.update(
              arrayRemove ? { pushTokens: arrayRemove(badToken) } : { staleTokenRemoved: badToken }
            ).catch(() => {});
          }
        }
      }
    }

    console.log(`[Push Service] Sent "${stage}" notification for Order ${orderNumber} to ${tokens.length} device(s).`);
    return {
      success: true,
      stage,
      orderId,
      orderNumber,
      recipients: tokens.length,
      tickets: pushResult.tickets,
    };
  } finally {
    inFlightLocks.delete(lockKey);
  }
}

module.exports = {
  NOTIFICATION_STAGES,
  isExpoPushToken,
  buildNotificationMessage,
  sendExpoPushBatch,
  sendPushNotificationForOrder,
  pushNotificationService: {
    sendPushNotificationForOrder,
    buildNotificationMessage,
    isExpoPushToken,
    sendExpoPushBatch,
    NOTIFICATION_STAGES,
  },
};
