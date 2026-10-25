/**
 * AquaPure Admin — Reports & Analytics Desk
 * 100% Live Real-Time Data from Cloud Firestore.
 * Financial summaries, top-selling products, category sales breakdown, and CSV export.
 */

import { useState, useEffect } from 'react';
import {
  Download,
  Radio,
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Order, Product } from '../../types';
import { CATEGORY_DEFINITIONS } from '../../data/seedProducts';

export function ReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-Time subscriptions
  useEffect(() => {
    setLoading(true);
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      setOrders(
        snap.docs.map((d) => {
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
            shippingAddress: data?.shippingAddress || {},
            createdAt: data?.createdAt || new Date().toISOString(),
          } as Order;
        })
      );
      setLoading(false);
    });

    const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    });

    return () => {
      unsubOrders();
      unsubProducts();
    };
  }, []);

  // Compute Financial Metrics from live data
  const totalGrossRevenue = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const paidOrders = orders.filter((o) => (o.paymentStatus as string) === 'test_success' || (o.paymentStatus as string) === 'paid');
  const paidRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const deliveredOrders = orders.filter((o) => o.orderStatus === 'delivered');
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const avgOrderValue = orders.length > 0 ? Math.round(totalGrossRevenue / orders.length) : 0;

  // Customer vs Dealer revenue split
  const customerRevenue = orders
    .filter((o) => o.orderType === 'customer' || !o.orderType)
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const dealerRevenue = orders
    .filter((o) => o.orderType === 'dealer')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  // Units sold & product sales tally
  const productSales: Record<
    string,
    { name: string; quantity: number; revenue: number; category: string }
  > = {};

  orders.forEach((o) => {
    if (o.items && Array.isArray(o.items)) {
      o.items.forEach((item) => {
        const key = item.productId || item.name;
        if (!productSales[key]) {
          // Find matching product in catalog
          const cat = products.find((p) => p.id === item.productId)?.categoryId || 'water-purifiers';
          productSales[key] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            category: cat,
          };
        }
        productSales[key].quantity += item.quantity || 1;
        productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
      });
    }
  });

  const sortedTopProducts = Object.entries(productSales)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => b.revenue - a.revenue);

  // Category sales tally
  const categorySales: Record<string, { name: string; revenue: number; units: number }> = {};
  Object.entries(CATEGORY_DEFINITIONS).forEach(([catId, info]) => {
    categorySales[catId] = { name: info.name, revenue: 0, units: 0 };
  });

  Object.values(productSales).forEach((p) => {
    const cat = categorySales[p.category] || categorySales['water-purifiers'];
    if (cat) {
      cat.revenue += p.revenue;
      cat.units += p.quantity;
    }
  });

  // Payment method breakdown
  const paymentMethods: Record<string, number> = {};
  orders.forEach((o) => {
    const provider = o.paymentProvider || 'other';
    paymentMethods[provider] = (paymentMethods[provider] || 0) + 1;
  });

  // Export Orders to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert('No orders available to export.');
      return;
    }

    const headers = [
      'Order ID',
      'Order Number',
      'Created At',
      'Channel',
      'Recipient Name',
      'Phone',
      'City',
      'State',
      'Pincode',
      'Payment Provider',
      'Payment Status',
      'Payment Ref',
      'Fulfillment Status',
      'Items Summary',
      'Total Amount (INR)',
    ];

    const rows = orders.map((o) => [
      `"${o.id}"`,
      `"${o.orderNumber || ''}"`,
      `"${o.createdAt || ''}"`,
      `"${o.orderType || 'customer'}"`,
      `"${(o.shippingAddress?.fullName || '').replace(/"/g, '""')}"`,
      `"${o.shippingAddress?.phone || ''}"`,
      `"${(o.shippingAddress?.city || '').replace(/"/g, '""')}"`,
      `"${(o.shippingAddress?.state || '').replace(/"/g, '""')}"`,
      `"${o.shippingAddress?.pincode || ''}"`,
      `"${o.paymentProvider || ''}"`,
      `"${o.paymentStatus || ''}"`,
      `"${o.paymentReference || ''}"`,
      `"${o.orderStatus || ''}"`,
      `"${(o.items?.map((i) => `${i.quantity}x ${i.name}`).join('; ') || '').replace(/"/g, '""')}"`,
      o.total || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AquaPure_Orders_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatPrice = (amount: number) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

  return (
    <div style={{ width: '100%', maxWidth: 1600 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Financial & Sales Reports</h1>
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
            Aggregated gross sales, product velocity, category revenue breakdown, and exportable financial data
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleExportCSV}
          disabled={orders.length === 0}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Download size={16} /> Export Orders to CSV
        </button>
      </header>

      {/* Top Financial KPI Row */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 16,
          marginBottom: 28,
        }}
      >
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #16803D' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Gross Booked Sales
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: '#16803D' }}>
            {loading ? '...' : formatPrice(totalGrossRevenue)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Across {orders.length} total orders
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #6a24b3' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Verified Paid Revenue
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: '#6a24b3' }}>
            {loading ? '...' : formatPrice(paidRevenue)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {paidOrders.length} transactions settled
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Average Order Value (AOV)
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: '#0284c7' }}>
            {loading ? '...' : formatPrice(avgOrderValue)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Per completed checkout
          </div>
        </div>

        <div className="card" style={{ padding: 20, borderLeft: '4px solid #B45309' }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Delivered Volume
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4, color: '#B45309' }}>
            {loading ? '...' : formatPrice(deliveredRevenue)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            {deliveredOrders.length} orders delivered
          </div>
        </div>
      </section>

      {/* Channel Split (Retail vs Wholesale) */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Channel Revenue Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Retail Customers</span>
                <strong>{formatPrice(customerRevenue)}</strong>
              </div>
              <div style={{ height: 8, background: 'var(--color-surface-muted)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${totalGrossRevenue ? (customerRevenue / totalGrossRevenue) * 100 : 0}%`,
                    background: 'var(--color-primary)',
                  }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Wholesale Trade Dealers</span>
                <strong>{formatPrice(dealerRevenue)}</strong>
              </div>
              <div style={{ height: 8, background: 'var(--color-surface-muted)', borderRadius: 4, overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${totalGrossRevenue ? (dealerRevenue / totalGrossRevenue) * 100 : 0}%`,
                    background: '#FFBA00',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            Payment Gateway & Provider Split
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.entries(paymentMethods).map(([provider, count]) => (
              <div
                key={provider}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13,
                  padding: '6px 0',
                  borderBottom: '1px solid var(--color-border)',
                }}
              >
                <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                  {provider.replace(/_/g, ' ')}
                </span>
                <span className="badge badge-neutral">
                  {count} order(s) ({Math.round((count / (orders.length || 1)) * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Performance Breakdown */}
      <section className="card" style={{ padding: 20, marginBottom: 28 }}>
        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>
          Revenue by Product Category
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          {Object.entries(categorySales).map(([id, info]) => {
            const pct = totalGrossRevenue ? Math.round((info.revenue / totalGrossRevenue) * 100) : 0;
            return (
              <div
                key={id}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface-muted)',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600 }}>{info.name}</div>
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color: 'var(--color-primary)' }}>
                  {formatPrice(info.revenue)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {info.units} units sold ({pct}% of sales)
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Velocity Products Table */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
            Top Performing Products by Gross Volume
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '2px 0 0' }}>
            Calculated in real-time from active checkout line items
          </p>
        </div>

        {sortedTopProducts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No product sales recorded in current orders yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-muted)', textAlign: 'left', fontSize: 12 }}>
                  <th style={{ padding: '12px 16px' }}>Rank & Product</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Units Sold</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Total Gross Revenue</th>
                </tr>
              </thead>
              <tbody>
                {sortedTopProducts.map((p, idx) => (
                  <tr key={p.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: '50%',
                            background: idx === 0 ? '#FFBA00' : 'var(--color-surface-muted)',
                            color: idx === 0 ? '#210440' : 'var(--color-text)',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            fontSize: 12,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                            ID: {p.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                        {p.category.replace(/-/g, ' ')}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                      {p.quantity} units
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, fontSize: 15 }}>
                      {formatPrice(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
