/**
 * AquaPure Admin — Dashboard Page
 * 100% Live Real-Time Data from Cloud Firestore.
 * No dummy, mock or hardcoded business metrics.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  Wrench,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import type { Order, ServiceBooking, UserProfile, Product } from '../../types';
import './Dashboard.css';

/* ---------- Helpers ---------- */

function useCountUp(target: number, active: boolean, duration = 800) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || target === 0) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);

  return n;
}

type Tone = 'violet' | 'amber' | 'sky' | 'green' | 'rose';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  countTo?: number;
  format?: (n: number) => string;
  hint?: string;
  badge?: string;
  tone?: Tone;
  accent?: boolean;
  loading?: boolean;
  linkTo?: string;
}

function KpiCard({
  icon,
  label,
  value,
  countTo,
  format = String,
  hint,
  badge,
  tone = 'violet',
  accent,
  loading,
  linkTo,
}: KpiCardProps) {
  const animated = useCountUp(countTo ?? 0, !loading && countTo !== undefined);
  const shown = countTo !== undefined ? format(animated) : value;

  const content = (
    <div
      className={`kpi-card kpi-tone-${tone} ${accent ? 'kpi-accent' : ''}`}
      aria-busy={loading || undefined}
    >
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        <div className="kpi-icon">{icon}</div>
      </div>

      <div className="kpi-value-row">
        <div className="kpi-value">
          {loading ? (
            <>
              <span className="kpi-skeleton" aria-hidden="true" />
              <span className="sr-only">Loading</span>
            </>
          ) : (
            shown
          )}
        </div>
        {badge && !loading && <span className="kpi-badge">{badge}</span>}
      </div>

      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} style={{ textDecoration: 'none', color: 'inherit' }}>
        {content}
      </Link>
    );
  }

  return content;
}

export function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<ServiceBooking[]>([]);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);

  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [syncError, setSyncError] = useState<string | null>(null);

  // Real-Time listener for Orders
  useEffect(() => {
    let q;
    try {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
    } catch {
      q = collection(db, 'orders');
    }

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            orderNumber: data?.orderNumber || d.id.slice(0, 8),
            orderType: data?.orderType === 'dealer' ? 'dealer' : 'customer',
            orderStatus: data?.orderStatus || 'placed',
            paymentStatus: data?.paymentStatus || 'pending',
            paymentProvider: data?.paymentProvider || 'prepaid',
            total: Number(data?.total || 0),
            items: Array.isArray(data?.items) ? data.items : [],
            shippingAddress: data?.shippingAddress || {
              fullName: data?.customerEmail || 'Customer',
            },
            createdAt: data?.createdAt || new Date().toISOString(),
          } as Order;
        });
        // Client-side sort by createdAt descending if no composite index
        list.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        setOrders(list);
        setLoadingOrders(false);
        setLastSyncTime(new Date());
      },
      (err) => {
        console.error('Firestore orders sync error:', err);
        setSyncError(`Orders: ${err.message}`);
        setLoadingOrders(false);
      }
    );
    return () => unsub();
  }, []);

  // Real-Time listener for Users (Customers & Dealers)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        setUsers(list);
        setLoadingUsers(false);
        setLastSyncTime(new Date());
      },
      (err) => {
        console.error('Firestore users sync error:', err);
        setSyncError(`Users: ${err.message}`);
        setLoadingUsers(false);
      }
    );
    return () => unsub();
  }, []);

  // Real-Time listener for Products
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        setProducts(list);
        setLoadingProducts(false);
        setLastSyncTime(new Date());
      },
      (err) => {
        console.error('Firestore products sync error:', err);
        setSyncError(`Products: ${err.message}`);
        setLoadingProducts(false);
      }
    );
    return () => unsub();
  }, []);

  // Real-Time listener for Service Bookings
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'service_bookings'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceBooking));
        setServices(list);
        setLoadingServices(false);
        setLastSyncTime(new Date());
      },
      (err) => {
        console.error('Firestore service bookings sync error:', err);
        setSyncError(`Services: ${err.message}`);
        setLoadingServices(false);
      }
    );
    return () => unsub();
  }, []);

  // Compute live business metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const pendingDealers = users.filter((u) => u.role === 'dealer' && u.dealerStatus === 'pending');
  const approvedDealers = users.filter((u) => u.role === 'dealer' && u.dealerStatus === 'approved');
  const registeredCustomers = users.filter((u) => u.role === 'customer' || !u.role);
  const openServices = services.filter((s) => ['requested', 'confirmed', 'in_progress'].includes(s.status));
  const lowOrOutStock = products.filter((p) => p.stockStatus === 'out_of_stock' || p.stockStatus === 'limited');

  const formatRevenue = (amount: number) => `₹${amount.toLocaleString('en-IN')}`;

  const updatedLabel = lastSyncTime.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  // Recent 5 live orders
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Live Operations Dashboard</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
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
          <p className="text-secondary dashboard-subtitle">
            Real-time synchronization with cloud database across customers, dealers & products
          </p>
        </div>
        <div className="dashboard-actions">
          <span className="dashboard-updated">Live Sync: {updatedLabel}</span>
        </div>
      </header>

      {syncError && (
        <div
          className="card"
          style={{
            background: 'var(--color-error-bg)',
            borderColor: 'var(--color-error)',
            color: 'var(--color-error)',
            marginBottom: 20,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <AlertTriangle size={20} />
          <div>
            <strong>Firestore Synchronization Notice:</strong> {syncError}
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className="kpi-grid" aria-label="Key operational metrics">
        <KpiCard
          icon={<TrendingUp size={20} />}
          label="Total Live Revenue"
          hint={`${orders.length} orders recorded`}
          tone="green"
          value={formatRevenue(totalRevenue)}
          countTo={totalRevenue}
          format={formatRevenue}
          loading={loadingOrders}
          linkTo="/reports"
        />
        <KpiCard
          icon={<ShoppingCart size={20} />}
          label="Total Orders"
          hint={`${orders.filter((o) => o.orderStatus === 'placed').length} pending fulfillment`}
          tone="violet"
          value={orders.length}
          countTo={orders.length}
          loading={loadingOrders}
          linkTo="/orders"
        />
        <KpiCard
          icon={<Users size={20} />}
          label="Dealer Applications"
          hint={`${approvedDealers.length} approved active dealers`}
          badge={pendingDealers.length > 0 ? `${pendingDealers.length} Need Review` : undefined}
          tone="amber"
          value={pendingDealers.length}
          countTo={pendingDealers.length}
          accent={pendingDealers.length > 0}
          loading={loadingUsers}
          linkTo="/accounts"
        />
        <KpiCard
          icon={<Wrench size={20} />}
          label="Open Service Requests"
          hint="Requested, confirmed, in-progress"
          tone="sky"
          value={openServices.length}
          countTo={openServices.length}
          loading={loadingServices}
          linkTo="/service"
        />
      </section>

      {/* Secondary KPI Bar */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div
          className="card"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Catalog Products
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {loadingProducts ? '...' : products.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {products.filter((p) => p.active).length} active in store
            </div>
          </div>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: 'rgba(79, 70, 165, 0.1)',
              color: 'var(--color-info)',
            }}
          >
            <Package size={22} />
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Inventory Alert
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                marginTop: 4,
                color: lowOrOutStock.length > 0 ? 'var(--color-warning)' : 'var(--color-success)',
              }}
            >
              {loadingProducts ? '...' : lowOrOutStock.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {products.filter((p) => p.stockStatus === 'out_of_stock').length} out of stock
            </div>
          </div>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background:
                lowOrOutStock.length > 0 ? 'rgba(180, 83, 9, 0.1)' : 'rgba(22, 128, 61, 0.1)',
              color:
                lowOrOutStock.length > 0 ? 'var(--color-warning)' : 'var(--color-success)',
            }}
          >
            <AlertTriangle size={22} />
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Registered Customers
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              {loadingUsers ? '...' : registeredCustomers.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              Live customer accounts
            </div>
          </div>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: 'rgba(33, 4, 64, 0.08)',
              color: 'var(--color-primary)',
            }}
          >
            <Users size={22} />
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Fulfillment Rate
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, color: '#16803D' }}>
              {orders.length > 0
                ? `${Math.round(
                    (orders.filter((o) => o.orderStatus === 'delivered').length / orders.length) * 100
                  )}%`
                : '100%'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {orders.filter((o) => o.orderStatus === 'delivered').length} delivered
            </div>
          </div>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: 'rgba(22, 128, 61, 0.1)',
              color: 'var(--color-success)',
            }}
          >
            <CheckCircle2 size={22} />
          </div>
        </div>
      </section>

      {/* Main Grid: Recent Orders & Action Items */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)',
          gap: 24,
        }}
      >
        {/* Recent Live Orders Section */}
        <section className="card" style={{ padding: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Recent Live Orders</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Real-time stream of incoming customer & dealer orders
              </p>
            </div>
            <Link
              to="/orders"
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              View All Orders <ArrowRight size={14} />
            </Link>
          </div>

          {loadingOrders ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading real-time orders...
            </div>
          ) : recentOrders.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              No orders placed in Firestore yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Order Ref</th>
                    <th>Customer / Dealer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => {
                    const recipient =
                      order.shippingAddress?.fullName ||
                      order.customerEmail ||
                      order.dealerEmail ||
                      'Customer';
                    const itemsSummary =
                      order.items && order.items.length > 0
                        ? order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')
                        : '1 item';

                    return (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.orderNumber || order.id.slice(0, 8)}</strong>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Recent'}
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{recipient}</div>
                          <span
                            className="badge"
                            style={{
                              fontSize: 10,
                              padding: '1px 6px',
                              background:
                                order.orderType === 'dealer'
                                  ? 'rgba(255, 186, 0, 0.15)'
                                  : 'rgba(79, 70, 165, 0.1)',
                              color:
                                order.orderType === 'dealer'
                                  ? 'var(--color-warning)'
                                  : 'var(--color-info)',
                            }}
                          >
                            {order.orderType === 'dealer' ? 'Wholesale Dealer' : 'Retail Customer'}
                          </span>
                        </td>
                        <td
                          style={{
                            maxWidth: 160,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={itemsSummary}
                        >
                          {itemsSummary}
                        </td>
                        <td style={{ fontWeight: 700 }}>₹{Number(order.total || 0).toLocaleString('en-IN')}</td>
                        <td>
                          <span
                            className={`badge ${
                              order.paymentStatus === 'test_success'
                                ? 'badge-success'
                                : order.paymentStatus === 'pending'
                                ? 'badge-warning'
                                : 'badge-error'
                            }`}
                            style={{ fontSize: 11 }}
                          >
                            {order.paymentStatus === 'test_success' ? 'Paid' : order.paymentStatus}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              order.orderStatus === 'delivered'
                                ? 'badge-success'
                                : order.orderStatus === 'placed'
                                ? 'badge-warning'
                                : 'badge-info'
                            }`}
                            style={{ fontSize: 11 }}
                          >
                            {order.orderStatus}
                          </span>
                        </td>
                        <td>
                          <Link
                            to="/orders"
                            style={{
                              color: 'var(--color-primary)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 2,
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: 'none',
                            }}
                          >
                            Manage <ExternalLink size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Action Center Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Dealer Approvals Card */}
          <section className="card" style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={18} style={{ color: 'var(--color-warning)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Dealer Verification</h3>
              </div>
              <span
                className={`badge ${pendingDealers.length > 0 ? 'badge-warning' : 'badge-success'}`}
              >
                {pendingDealers.length > 0 ? `${pendingDealers.length} Pending` : 'All Verified'}
              </span>
            </div>

            {pendingDealers.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                No pending wholesale dealer applications. All existing accounts have been reviewed.
              </p>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  {pendingDealers.length} business applicants are waiting for trade discount authorization.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pendingDealers.slice(0, 3).map((d) => (
                    <div
                      key={d.uid}
                      style={{
                        padding: '8px 12px',
                        background: 'var(--color-surface-muted)',
                        borderRadius: 8,
                        fontSize: 12,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{d.businessName || d.displayName}</strong>
                        <div style={{ color: 'var(--color-text-secondary)' }}>{d.email}</div>
                      </div>
                      <Link
                        to="/accounts"
                        className="btn btn-primary btn-sm"
                        style={{ padding: '3px 8px', fontSize: 11 }}
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Service Desk Overview */}
          <section className="card" style={{ padding: 20 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wrench size={18} style={{ color: 'var(--color-info)' }} />
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Service Dispatch</h3>
              </div>
              <span
                className={`badge ${openServices.length > 0 ? 'badge-info' : 'badge-success'}`}
              >
                {openServices.length} Active
              </span>
            </div>

            {openServices.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                All customer maintenance and installation tickets have been completed!
              </p>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  {openServices.length} booking request(s) require technician assignment or completion.
                </p>
                <Link
                  to="/service"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Open Service Desk <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </section>

          {/* Quick Shortcuts */}
          <section className="card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Quick Management Shortcuts
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Link
                to="/products"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: 12 }}
              >
                <Package size={14} /> Add Product
              </Link>
              <Link
                to="/inventory"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: 12 }}
              >
                <AlertTriangle size={14} /> Stock Audit
              </Link>
              <Link
                to="/orders"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: 12 }}
              >
                <ShoppingCart size={14} /> Orders Pipeline
              </Link>
              <Link
                to="/reports"
                className="btn btn-secondary btn-sm"
                style={{ justifyContent: 'center', fontSize: 12 }}
              >
                <TrendingUp size={14} /> Sales Report
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}