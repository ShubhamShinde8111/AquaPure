/**
 * AquaPure Admin — Order Fulfillment & Tracking Management
 * 100% Live Real-Time Data from Cloud Firestore.
 * Real-time synchronization, payment tracking, live status pipelines, zero mock data.
 */

import { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  CheckCircle,
  Truck,
  PackageCheck,
  ChevronRight,
  X,
  MapPin,
  CreditCard,
  Inbox,
  Radio,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { EmailService } from '../../services/emailService';
import { NotificationService } from '../../services/notificationService';
import type { Order, OrderStatus } from '../../types';
import './OrdersPage.css';

const ORDER_FLOW: OrderStatus[] = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
];

function normalizeOrder(id: string, data: any): Order {
  const status = (data?.orderStatus || 'placed') as OrderStatus;
  const type = (data?.orderType === 'dealer' ? 'dealer' : 'customer') as Order['orderType'];

  return {
    id,
    orderNumber: data?.orderNumber || id.slice(0, 8),
    orderType: type,
    orderStatus: status,
    paymentStatus: data?.paymentStatus || 'pending',
    paymentProvider: data?.paymentProvider || 'prepaid',
    paymentReference: data?.paymentReference || '',
    customerId: data?.customerId || '',
    customerEmail: data?.customerEmail || data?.shippingAddress?.email || '',
    dealerId: data?.dealerId || '',
    dealerEmail: data?.dealerEmail || '',
    deliveredAt: data?.deliveredAt || '',
    subtotal: Number(data?.subtotal || data?.total || 0),
    total: Number(data?.total || 0),
    items: Array.isArray(data?.items) ? data.items : [],
    shippingAddress: {
      id: data?.shippingAddress?.id || 'addr-default',
      label: data?.shippingAddress?.label || 'Delivery Address',
      fullName:
        data?.shippingAddress?.fullName ||
        data?.customerEmail ||
        data?.dealerEmail ||
        'Valued Customer',
      phone: data?.shippingAddress?.phone || 'N/A',
      email: data?.shippingAddress?.email || data?.customerEmail || '',
      addressLine1: data?.shippingAddress?.addressLine1 || 'Address on file',
      addressLine2: data?.shippingAddress?.addressLine2 || '',
      city: data?.shippingAddress?.city || 'India',
      state: data?.shippingAddress?.state || '',
      pincode: data?.shippingAddress?.pincode || '',
      landmark: data?.shippingAddress?.landmark || '',
    },
    createdAt: data?.createdAt || new Date().toISOString(),
    updatedAt: data?.updatedAt || new Date().toISOString(),
  };
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'customer' | 'dealer'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Real-Time Subscription to Firestore orders
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => normalizeOrder(d.id, d.data()));
        // Client-side sort by createdAt descending
        list.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        setOrders(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore orders sync error:', err);
        setError(`Failed to connect to Firestore orders: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Sync selectedOrder with real-time updates
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    }
  }, [orders]);

  // Drawer keyboard / scroll management
  useEffect(() => {
    if (!selectedOrder) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedOrder(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedOrder]);

  // Status Progression Handler
  const handleAdvanceStatus = async (orderId: string, currentStatus: OrderStatus) => {
    const currentIndex = ORDER_FLOW.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= ORDER_FLOW.length - 1) return;
    const nextStatus = ORDER_FLOW[currentIndex + 1];
    await handleSetOrderStatus(orderId, nextStatus);
  };

  // Direct Status Update Handler
  const handleSetOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const isTransitionToDelivered = nextStatus === 'delivered';
    const now = new Date().toISOString();

    try {
      const updatePayload: Record<string, any> = {
        orderStatus: nextStatus,
        updatedAt: now,
      };
      if (isTransitionToDelivered) {
        updatePayload.deliveredAt = now;
      }

      await updateDoc(doc(db, 'orders', orderId), updatePayload);

      setActionNotice(`Order ${orderId.slice(0, 8)} status updated to ${nextStatus.toUpperCase()}`);
      setTimeout(() => setActionNotice(null), 3000);

      const targetOrder = orders.find((o) => o.id === orderId);

      // Automatic push notification for lifecycle transition (confirmed, shipped, delivered)
      NotificationService.sendOrderStatusPushNotification(orderId, nextStatus, targetOrder).catch((pushErr) =>
        console.warn('[Admin] Push notification error:', pushErr)
      );

      // Email notification on delivery
      if (isTransitionToDelivered) {
        if (targetOrder) {
          sendDeliveryEmailNotification(targetOrder, now).catch((err) =>
            console.warn('[Admin] Email send error:', err)
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database update failed';
      alert(`Could not update order status in Firestore: ${msg}`);
    }
  };

  const sendDeliveryEmailNotification = async (targetOrder: Order, deliveredAt: string) => {
    const isDealer = targetOrder.orderType === 'dealer' || !!targetOrder.dealerId;
    let registeredEmail =
      targetOrder.customerEmail ||
      targetOrder.dealerEmail ||
      targetOrder.shippingAddress?.email ||
      '';

    if (!registeredEmail) {
      const uid = targetOrder.dealerId || targetOrder.customerId;
      if (uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', uid));
          if (userDoc.exists()) registeredEmail = userDoc.data().email || '';
        } catch {
          // ignore
        }
      }
    }

    const toEmail = registeredEmail || 'customer@example.com';
    const toName =
      targetOrder.shippingAddress?.fullName ||
      (isDealer ? 'Wholesale Partner' : 'Valued Customer');
    const deliveryAddress = `${targetOrder.shippingAddress?.addressLine1 || ''}, ${targetOrder.shippingAddress?.city || ''}${
      targetOrder.shippingAddress?.pincode ? ` - ${targetOrder.shippingAddress.pincode}` : ''
    }`;

    EmailService.sendOrderDeliveredConfirmation({
      toEmail,
      toName,
      orderId: targetOrder.orderNumber || targetOrder.id,
      totalAmount: targetOrder.total.toString(),
      deliveryAddress,
      phone: targetOrder.shippingAddress?.phone,
      orderType: isDealer ? 'dealer' : 'customer',
      isDealer,
      paymentMethod:
        targetOrder.paymentProvider === 'cash_on_delivery' ? 'Cash on Delivery' : 'Prepaid',
      paymentStatus: targetOrder.paymentStatus || 'paid',
      deliveredAt,
      items: targetOrder.items?.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        price: i.price,
      })),
      itemsSummary: targetOrder.items?.map((i) => `${i.quantity}x ${i.name}`).join(', '),
    }).catch((e) => console.warn('Email delivery notice error:', e));
  };

  // Filter Orders
  const filteredOrders = orders.filter((o) => {
    // Status filter
    if (statusFilter !== 'all' && o.orderStatus !== statusFilter) return false;

    // Type filter
    if (typeFilter !== 'all' && o.orderType !== typeFilter) return false;

    // Payment filter
    if (paymentFilter !== 'all') {
      const p = (o.paymentStatus || '').toLowerCase();
      if (paymentFilter === 'paid' && p !== 'test_success' && p !== 'paid') return false;
      if (paymentFilter === 'pending' && p !== 'pending') return false;
      if (paymentFilter === 'failed' && !p.includes('fail')) return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const idMatch = o.id.toLowerCase().includes(q) || (o.orderNumber && o.orderNumber.toLowerCase().includes(q));
      const nameMatch = (o.shippingAddress?.fullName || '').toLowerCase().includes(q);
      const emailMatch = (o.customerEmail || o.dealerEmail || o.shippingAddress?.email || '').toLowerCase().includes(q);
      const phoneMatch = (o.shippingAddress?.phone || '').includes(q);
      const cityMatch = (o.shippingAddress?.city || '').toLowerCase().includes(q);
      return idMatch || nameMatch || emailMatch || phoneMatch || cityMatch;
    }

    return true;
  });

  const formatPrice = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
        return 'badge-success';
      case 'shipped':
        return 'badge-info';
      case 'processing':
      case 'confirmed':
        return 'badge-warning';
      case 'cancelled':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const getPaymentBadgeClass = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('success') || s === 'paid') return 'badge-success';
    if (s.includes('fail') || s.includes('refund')) return 'badge-error';
    return 'badge-warning';
  };

  const getNextStatus = (status: OrderStatus): OrderStatus | null => {
    const idx = ORDER_FLOW.indexOf(status);
    return idx >= 0 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : null;
  };

  // KPIs
  const placedCount = orders.filter((o) => o.orderStatus === 'placed').length;
  const transitCount = orders.filter((o) => ['confirmed', 'processing', 'shipped'].includes(o.orderStatus)).length;
  const deliveredCount = orders.filter((o) => o.orderStatus === 'delivered').length;

  return (
    <div className="orders-page">
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Order Fulfillment & Payments</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 9px',
                borderRadius: '999px',
                fontSize: 12,
                fontWeight: 600,
                background: 'rgba(22, 128, 61, 0.12)',
                color: '#16803D',
              }}
            >
              <Radio size={12} className="spin" style={{ animationDuration: '3s' }} /> Live Firestore
            </span>
          </div>
          <p className="text-secondary" style={{ marginTop: 4 }}>
            Process customer and dealer wholesale orders, verify payments, and advance delivery stages
          </p>
        </div>

        {actionNotice && (
          <div
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'var(--color-success-bg)',
              color: 'var(--color-success)',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            ✓ {actionNotice}
          </div>
        )}
      </header>

      {error && (
        <div
          className="card"
          style={{
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            padding: 16,
            marginBottom: 20,
          }}
        >
          <strong>Database Notice:</strong> {error}
        </div>
      )}

      {/* KPI Counters */}
      <div className="orders-kpis">
        <div className="card order-kpi-card">
          <div className="kpi-icon kpi-icon-warning">
            <ShoppingCart size={22} />
          </div>
          <div className="kpi-text">
            <div className="kpi-value">{placedCount}</div>
            <div className="kpi-label">New Placed Orders</div>
          </div>
        </div>

        <div className="card order-kpi-card">
          <div className="kpi-icon kpi-icon-info">
            <Truck size={22} />
          </div>
          <div className="kpi-text">
            <div className="kpi-value">{transitCount}</div>
            <div className="kpi-label">In-Flight / In-Transit</div>
          </div>
        </div>

        <div className="card order-kpi-card">
          <div className="kpi-icon kpi-icon-success">
            <PackageCheck size={22} />
          </div>
          <div className="kpi-text">
            <div className="kpi-value">{deliveredCount}</div>
            <div className="kpi-label">Delivered Orders</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card controls-card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="search-wrap" style={{ flex: '1 1 240px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="input search-input"
              placeholder="Search by Order ID, recipient, email, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Channel Dropdown */}
          <div style={{ minWidth: 150 }}>
            <select
              className="select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              style={{ width: '100%', height: 42 }}
            >
              <option value="all">All Channels</option>
              <option value="customer">Customer Retail</option>
              <option value="dealer">Dealer Wholesale</option>
            </select>
          </div>

          {/* Payment Status Dropdown */}
          <div style={{ minWidth: 150 }}>
            <select
              className="select"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{ width: '100%', height: 42 }}
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid / Success</option>
              <option value="pending">Pending Payment</option>
              <option value="failed">Failed / Cancelled</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(search || statusFilter !== 'all' || typeFilter !== 'all' || paymentFilter !== 'all') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
                setPaymentFilter('all');
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Status Tab Bar */}
        <div className="status-tabs" style={{ marginTop: 14 }}>
          <button
            type="button"
            className={`status-tab ${statusFilter === 'all' ? 'status-tab-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Statuses ({orders.length})
          </button>
          {ORDER_FLOW.map((s) => (
            <button
              key={s}
              type="button"
              className={`status-tab ${statusFilter === s ? 'status-tab-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s.toUpperCase()} ({orders.filter((o) => o.orderStatus === s).length})
            </button>
          ))}
          <button
            type="button"
            className={`status-tab ${statusFilter === 'cancelled' ? 'status-tab-active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            CANCELLED ({orders.filter((o) => o.orderStatus === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading real-time orders from Cloud Firestore...</div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="card op-empty">
          <Inbox size={36} />
          <p className="op-empty-title">No orders found</p>
          <p className="text-secondary">
            {orders.length === 0
              ? 'No live orders currently exist in the Cloud Firestore database.'
              : 'No orders match the selected filters or search query.'}
          </p>
        </div>
      ) : (
        <div className="card table-card op-table-view">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Channel</th>
                  <th>Recipient / Delivery</th>
                  <th>Items Summary</th>
                  <th>Total Amount</th>
                  <th>Payment</th>
                  <th>Fulfillment Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => {
                  const nextStatus = getNextStatus(o.orderStatus);
                  const recipient = o.shippingAddress?.fullName || o.customerEmail || o.dealerEmail || 'Customer';
                  const city = o.shippingAddress?.city || 'India';
                  const pincode = o.shippingAddress?.pincode ? ` - ${o.shippingAddress.pincode}` : '';
                  const itemsSummary =
                    o.items && o.items.length > 0
                      ? o.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
                      : '1 Item';

                  return (
                    <tr
                      key={o.id}
                      tabIndex={0}
                      onClick={() => setSelectedOrder(o)}
                      className={`op-row ${selectedOrder?.id === o.id ? 'row-selected' : ''}`}
                    >
                      <td>
                        <span className="order-id-badge">{o.orderNumber || o.id.slice(0, 10)}</span>
                        <div className="order-time">
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Live'}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${o.orderType === 'dealer' ? 'badge-info' : 'badge-neutral'}`}
                        >
                          {o.orderType === 'dealer' ? 'DEALER' : 'CUSTOMER'}
                        </span>
                      </td>

                      <td>
                        <div className="recipient-name">{recipient}</div>
                        <div className="recipient-city">
                          {city}
                          {pincode}
                        </div>
                      </td>

                      <td>
                        <div className="items-summary" title={itemsSummary}>
                          {itemsSummary}
                        </div>
                      </td>

                      <td className="price-cell">{formatPrice(o.total)}</td>

                      <td>
                        <span
                          className={`badge ${getPaymentBadgeClass(o.paymentStatus)}`}
                          style={{ fontSize: 11 }}
                        >
                          {o.paymentStatus === 'test_success' ? 'PAID' : o.paymentStatus || 'PENDING'}
                        </span>
                        <div style={{ fontSize: 10, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {o.paymentProvider?.replace(/_/g, ' ') || 'Prepaid'}
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${getStatusBadgeClass(o.orderStatus)}`}>
                          {(o.orderStatus || 'placed').toUpperCase()}
                        </span>
                      </td>

                      <td>
                        {nextStatus ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm op-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStatus(o.id, o.orderStatus);
                            }}
                          >
                            Mark {(nextStatus || '').toUpperCase()}
                            <ChevronRight size={14} />
                          </button>
                        ) : o.orderStatus === 'delivered' ? (
                          <span className="op-completed">
                            <CheckCircle size={14} />
                            Delivered
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            {(o.orderStatus || 'closed').toUpperCase()}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER */}
      {selectedOrder && (
        <div className="op-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="op-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <span className="order-id-badge" style={{ fontSize: 14 }}>
                  {selectedOrder.orderNumber || selectedOrder.id}
                </span>
                <h3 style={{ marginTop: 6 }}>
                  Order Details — {selectedOrder.orderType === 'dealer' ? 'Wholesale Dealer' : 'Customer'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {/* Status Stepper */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  ORDER FULFILLMENT STATUS
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ORDER_FLOW.map((s, idx) => {
                    const currentIdx = ORDER_FLOW.indexOf(selectedOrder.orderStatus);
                    const isDone = currentIdx >= idx && selectedOrder.orderStatus !== 'cancelled';
                    const isCurrent = selectedOrder.orderStatus === s;

                    return (
                      <span
                        key={s}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          background: isCurrent
                            ? 'var(--color-primary)'
                            : isDone
                            ? 'rgba(22, 128, 61, 0.12)'
                            : 'var(--color-surface-muted)',
                          color: isCurrent
                            ? '#fff'
                            : isDone
                            ? '#16803D'
                            : 'var(--color-text-secondary)',
                        }}
                      >
                        {idx + 1}. {s.toUpperCase()}
                      </span>
                    );
                  })}
                  {selectedOrder.orderStatus === 'cancelled' && (
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        background: 'rgba(180, 35, 24, 0.12)',
                        color: 'var(--color-error)',
                      }}
                    >
                      CANCELLED
                    </span>
                  )}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {getNextStatus(selectedOrder.orderStatus) && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAdvanceStatus(selectedOrder.id, selectedOrder.orderStatus)}
                  >
                    Advance to {getNextStatus(selectedOrder.orderStatus)?.toUpperCase()}
                  </button>
                )}

                {selectedOrder.orderStatus !== 'delivered' && selectedOrder.orderStatus !== 'cancelled' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSetOrderStatus(selectedOrder.id, 'delivered')}
                  >
                    <CheckCircle size={14} /> Quick Mark Delivered
                  </button>
                )}

                {selectedOrder.orderStatus !== 'cancelled' && selectedOrder.orderStatus !== 'delivered' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'rgba(180, 35, 24, 0.1)', color: '#B42318', border: 'none' }}
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel this order?')) {
                        handleSetOrderStatus(selectedOrder.id, 'cancelled');
                      }
                    }}
                  >
                    <Ban size={14} /> Cancel Order
                  </button>
                )}
              </div>

              {/* Recipient & Shipping Details */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: 'var(--color-surface-muted)',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  <MapPin size={16} style={{ color: 'var(--color-primary)' }} />
                  DELIVERY DESTINATION
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {selectedOrder.shippingAddress?.fullName || 'Recipient'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {selectedOrder.shippingAddress?.addressLine1}
                  {selectedOrder.shippingAddress?.addressLine2 ? `, ${selectedOrder.shippingAddress.addressLine2}` : ''}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  <strong>Phone:</strong> {selectedOrder.shippingAddress?.phone || 'N/A'}
                </div>
                {selectedOrder.shippingAddress?.email && (
                  <div style={{ fontSize: 13 }}>
                    <strong>Email:</strong> {selectedOrder.shippingAddress.email}
                  </div>
                )}
              </div>

              {/* Payment Details */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: 'var(--color-surface-muted)',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  <CreditCard size={16} style={{ color: 'var(--color-primary)' }} />
                  PAYMENT INFORMATION
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>Provider:</span>
                  <strong>{selectedOrder.paymentProvider || 'Standard Checkout'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>Status:</span>
                  <span className={`badge ${getPaymentBadgeClass(selectedOrder.paymentStatus)}`}>
                    {selectedOrder.paymentStatus === 'test_success' ? 'PAID' : selectedOrder.paymentStatus}
                  </span>
                </div>
                {selectedOrder.paymentReference && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>Transaction Ref:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      {selectedOrder.paymentReference}
                    </strong>
                  </div>
                )}
              </div>

              {/* Ordered Items Table */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
                  ORDER ITEMS ({selectedOrder.items?.length || 0})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {selectedOrder.items?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 10,
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
                          />
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            Qty: {item.quantity} × {formatPrice(item.price)}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Totals */}
              <div
                style={{
                  borderTop: '1px solid var(--color-border)',
                  paddingTop: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: 14,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>{formatPrice(selectedOrder.subtotal || selectedOrder.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Delivery Charges:</span>
                  <span style={{ color: '#16803D' }}>FREE</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 16,
                    fontWeight: 700,
                    marginTop: 6,
                    borderTop: '1px solid var(--color-border)',
                    paddingTop: 8,
                  }}
                >
                  <span>Grand Total:</span>
                  <span style={{ color: 'var(--color-primary)' }}>{formatPrice(selectedOrder.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}