/**
 * AquaPure Admin — Inventory & Stock Management
 * 100% Live Real-Time Data from Cloud Firestore.
 * Allows quick stock quantity adjustments, restock alerts, and status synchronization.
 */

import { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Plus,
  Minus,
  Save,
  Radio,
} from 'lucide-react';
import { db } from '../../services/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import type { Product } from '../../types';
import { CATEGORY_DEFINITIONS } from '../../data/seedProducts';

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'limited' | 'out_of_stock'>('all');
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Live Firestore subscription
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        setProducts(list);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore inventory sync error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleStockChange = (id: string, value: number) => {
    setStockEdits((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  };

  const handleSaveStock = async (id: string) => {
    const newStock = stockEdits[id];
    if (newStock === undefined) return;

    setSavingId(id);
    try {
      // Determine stock status based on count
      let newStatus: Product['stockStatus'] = 'in_stock';
      if (newStock === 0) newStatus = 'out_of_stock';
      else if (newStock <= 15) newStatus = 'limited';

      await updateDoc(doc(db, 'products', id), {
        stock: newStock,
        stockStatus: newStatus,
        updatedAt: new Date().toISOString(),
      });

      setSaveNotice(`Updated stock for ${id} to ${newStock} units`);
      setTimeout(() => setSaveNotice(null), 3000);
      setStockEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      alert(`Could not save stock in Firestore: ${msg}`);
    } finally {
      setSavingId(null);
    }
  };

  const handleQuickStatusChange = async (id: string, status: Product['stockStatus']) => {
    try {
      await updateDoc(doc(db, 'products', id), {
        stockStatus: status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      alert(`Could not update status: ${msg}`);
    }
  };

  // Filtered list
  const filtered = products.filter((p) => {
    const matchesCat =
      categoryFilter === 'all' ||
      p.categoryId === categoryFilter ||
      (p.category && p.category.toLowerCase().includes(categoryFilter.toLowerCase()));

    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q);

    const matchesStock = stockStatusFilter === 'all' || p.stockStatus === stockStatusFilter;
    return matchesCat && matchesSearch && matchesStock;
  });

  const inStockCount = products.filter((p) => p.stockStatus === 'in_stock').length;
  const limitedCount = products.filter((p) => p.stockStatus === 'limited').length;
  const outCount = products.filter((p) => p.stockStatus === 'out_of_stock').length;

  return (
    <div style={{ width: '100%', maxWidth: 1600 }}>
      <header style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Inventory & Stock Control</h1>
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
            Monitor real-time warehouse inventory, manage unit counts, and set low-stock replenishment alerts
          </p>
        </div>

        {saveNotice && (
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
            ✓ {saveNotice}
          </div>
        )}
      </header>

      {/* KPI Cards */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          className="card"
          style={{ padding: 18, borderLeft: '4px solid var(--color-primary)' }}
        >
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Total Catalog SKUs
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4 }}>{products.length}</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Tracked in Firestore
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 18, borderLeft: '4px solid var(--color-success)' }}
        >
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Adequate Stock
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: 'var(--color-success)' }}>
            {inStockCount}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Readily shippable items
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 18, borderLeft: '4px solid var(--color-warning)' }}
        >
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Limited / Low Stock
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: 'var(--color-warning)' }}>
            {limitedCount}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Re-order threshold reached
          </div>
        </div>

        <div
          className="card"
          style={{ padding: 18, borderLeft: '4px solid var(--color-error)' }}
        >
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Out of Stock
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, color: 'var(--color-error)' }}>
            {outCount}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>
            Blocked from immediate fulfillment
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)',
              }}
            />
            <input
              type="text"
              className="input"
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 38, width: '100%', height: 42 }}
            />
          </div>

          <div style={{ minWidth: 200 }}>
            <select
              className="select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ width: '100%', height: 42 }}
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_DEFINITIONS).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.icon} {info.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 160 }}>
            <select
              className="select"
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              style={{ width: '100%', height: 42 }}
            >
              <option value="all">All Stock Statuses</option>
              <option value="in_stock">In Stock</option>
              <option value="limited">Limited Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>

          {(search || categoryFilter !== 'all' || stockStatusFilter !== 'all') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setStockStatusFilter('all');
              }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Inventory Table */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading live inventory from Cloud Firestore...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No products match the selected inventory filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-muted)', textAlign: 'left', fontSize: 12 }}>
                  <th style={{ padding: '12px 16px' }}>SKU & Name</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Current Units</th>
                  <th style={{ padding: '12px 16px' }}>Stock Adjustment</th>
                  <th style={{ padding: '12px 16px' }}>Stock Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Save Update</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const currentUnits = p.stock ?? 50;
                  const editedUnits = stockEdits[p.id] !== undefined ? stockEdits[p.id] : currentUnits;
                  const hasPendingEdit = stockEdits[p.id] !== undefined && stockEdits[p.id] !== currentUnits;

                  return (
                    <tr key={p.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          SKU: {p.id}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span className="badge" style={{ fontSize: 11, background: 'var(--color-surface-muted)' }}>
                          {p.categoryId?.replace(/-/g, ' ')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: 15,
                            color:
                              currentUnits === 0
                                ? 'var(--color-error)'
                                : currentUnits <= 15
                                ? 'var(--color-warning)'
                                : 'var(--color-success)',
                          }}
                        >
                          {currentUnits} units
                        </span>
                      </td>

                      {/* Stepper / Input */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => handleStockChange(p.id, editedUnits - 1)}
                            disabled={editedUnits <= 0}
                          >
                            <Minus size={12} />
                          </button>

                          <input
                            type="number"
                            className="input"
                            style={{
                              width: 70,
                              height: 32,
                              textAlign: 'center',
                              padding: '2px 4px',
                              fontWeight: 600,
                            }}
                            value={editedUnits}
                            onChange={(e) => handleStockChange(p.id, Number(e.target.value))}
                            min={0}
                          />

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px' }}
                            onClick={() => handleStockChange(p.id, editedUnits + 1)}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </td>

                      {/* Stock Status Selector */}
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          className="select"
                          value={p.stockStatus}
                          onChange={(e) =>
                            handleQuickStatusChange(
                              p.id,
                              e.target.value as Product['stockStatus']
                            )
                          }
                          style={{
                            fontSize: 12,
                            padding: '4px 8px',
                            height: 32,
                            borderRadius: 6,
                            fontWeight: 600,
                            background:
                              p.stockStatus === 'in_stock'
                                ? 'rgba(22, 128, 61, 0.12)'
                                : p.stockStatus === 'limited'
                                ? 'rgba(180, 83, 9, 0.12)'
                                : 'rgba(180, 35, 24, 0.12)',
                            color:
                              p.stockStatus === 'in_stock'
                                ? '#16803D'
                                : p.stockStatus === 'limited'
                                ? '#B45309'
                                : '#B42318',
                            border: 'none',
                          }}
                        >
                          <option value="in_stock">In Stock</option>
                          <option value="limited">Limited Stock</option>
                          <option value="out_of_stock">Out of Stock</option>
                        </select>
                      </td>

                      {/* Save Button */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{
                            background: hasPendingEdit ? 'var(--color-primary)' : 'var(--color-surface-muted)',
                            color: hasPendingEdit ? '#fff' : 'var(--color-text-secondary)',
                            border: 'none',
                            padding: '6px 12px',
                            fontSize: 12,
                          }}
                          disabled={!hasPendingEdit || savingId === p.id}
                          onClick={() => handleSaveStock(p.id)}
                        >
                          <Save size={13} style={{ marginRight: 4 }} />
                          {savingId === p.id ? 'Saving...' : 'Save'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
