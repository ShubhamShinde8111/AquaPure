/**
 * AquaPure Admin — Product Catalog Management
 * 100% Live Real-Time Data from Cloud Firestore.
 * Supports Full CRUD: Add, Edit, Delete, Stock Update, Active/Inactive Toggle.
 */

import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import {
  Search,
  Database,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Edit2,
  Trash2,
  Radio,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { SEED_PRODUCTS, CATEGORY_DEFINITIONS } from '../../data/seedProducts';
import type { Product } from '../../types';
import './ProductsPage.css';

/* ---------- Helpers ---------- */

const FALLBACK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z'/%3E%3C/svg%3E";

function handleImgError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = FALLBACK_IMG;
}

type StockFilter = 'all' | 'in_stock' | 'limited' | 'out_of_stock';
type ActiveFilter = 'all' | 'active' | 'inactive';
type SortKey = 'name' | 'price_asc' | 'price_desc' | 'stock' | 'updated';

const CATEGORY_LIST = Object.entries(CATEGORY_DEFINITIONS).map(([id, info]) => ({
  id,
  name: info.name,
  icon: info.icon,
}));

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Modals & Action States
  const [seeding, setSeeding] = useState(false);
  const [seedNotice, setSeedNotice] = useState<{ message: string; success: boolean } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // Real-Time Firestore Subscription
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
        setProducts(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore products listener error:', err);
        setError(`Failed to connect to Firestore products: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Quick keyboard shortcut "/" to focus search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat =
      selectedCategory === 'all' ||
      p.categoryId === selectedCategory ||
      (p.category && p.category.toLowerCase().includes(selectedCategory.toLowerCase()));

    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === '' ||
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q));

    const matchesStock = stockFilter === 'all' || p.stockStatus === stockFilter;
    const matchesActive =
      activeFilter === 'all' ||
      (activeFilter === 'active' && p.active) ||
      (activeFilter === 'inactive' && !p.active);

    return matchesCat && matchesSearch && matchesStock && matchesActive;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortKey) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'price_asc':
        return (a.customerPrice || 0) - (b.customerPrice || 0);
      case 'price_desc':
        return (b.customerPrice || 0) - (a.customerPrice || 0);
      case 'stock':
        return (a.stock || 0) - (b.stock || 0);
      case 'updated':
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      default:
        return 0;
    }
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedProducts = sortedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Instant Stock Status Update (Persisted to Firestore)
  const handleUpdateStockStatus = async (
    id: string,
    newStatus: 'in_stock' | 'limited' | 'out_of_stock'
  ) => {
    try {
      await updateDoc(doc(db, 'products', id), {
        stockStatus: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      alert(`Could not update stock status in Firestore: ${msg}`);
    }
  };

  // Instant Toggle Active / Inactive (Persisted to Firestore)
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateDoc(doc(db, 'products', id), {
        active: !currentActive,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      alert(`Could not update active status in Firestore: ${msg}`);
    }
  };

  // Delete Product Confirmation
  const handleDeleteProduct = async (id: string) => {
    setActionInProgress(true);
    try {
      await deleteDoc(doc(db, 'products', id));
      setDeletingProductId(null);
      setSeedNotice({
        message: `Product ${id} successfully removed from Firestore.`,
        success: true,
      });
      setTimeout(() => setSeedNotice(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      alert(`Could not delete product: ${msg}`);
    } finally {
      setActionInProgress(false);
    }
  };

  // Seed / Sync official catalog to Firestore
  const handleSeedCatalog = async () => {
    setSeeding(true);
    setSeedNotice(null);
    try {
      const batch = writeBatch(db);
      for (const prod of SEED_PRODUCTS) {
        const docRef = doc(db, 'products', prod.id);
        batch.set(docRef, prod);
      }
      await batch.commit();
      setSeedNotice({
        message: `Successfully synchronized ${SEED_PRODUCTS.length} authoritative products with Firestore!`,
        success: true,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Catalog seed failed';
      setSeedNotice({
        message: `Seeding error: ${msg}. Check Firestore rules or connectivity.`,
        success: false,
      });
    } finally {
      setSeeding(false);
    }
  };

  // Counts for summary pills
  const inStockCount = products.filter((p) => p.stockStatus === 'in_stock').length;
  const limitedCount = products.filter((p) => p.stockStatus === 'limited').length;
  const outCount = products.filter((p) => p.stockStatus === 'out_of_stock').length;
  const activeCount = products.filter((p) => p.active).length;

  return (
    <div className="products-page">
      <header className="page-header">
        <div className="page-heading">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Product Catalog & Inventory</h1>
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
              <Radio size={12} className="spin" style={{ animationDuration: '3s' }} /> Live Database
            </span>
          </div>
          <p className="text-secondary">
            Manage live catalog items, dual customer/dealer pricing, active store visibility, and inventory levels
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={18} /> Add New Product
          </button>

          <button
            className="btn btn-secondary"
            onClick={handleSeedCatalog}
            disabled={seeding}
            aria-busy={seeding}
            title="Batch-sync 60 authoritative catalog items to Firestore"
          >
            {seeding ? (
              <RefreshCw size={16} className="spin" />
            ) : (
              <Database size={16} />
            )}
            {seeding ? 'Syncing...' : 'Sync Catalog (60 Items)'}
          </button>
        </div>
      </header>

      {seedNotice && (
        <div
          className={`card seed-alert ${seedNotice.success ? 'seed-success' : 'seed-error'}`}
          role="status"
        >
          {seedNotice.success ? (
            <CheckCircle size={20} className="text-success seed-alert-icon" />
          ) : (
            <AlertTriangle size={20} className="text-error seed-alert-icon" />
          )}
          <span className="seed-alert-text">{seedNotice.message}</span>
          <button
            type="button"
            className="seed-dismiss"
            onClick={() => setSeedNotice(null)}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

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

      {/* Metric Stat Cards */}
      <section className="stat-grid" aria-label="Catalog summary">
        <button
          type="button"
          className={`stat-card stat-neutral ${stockFilter === 'all' && activeFilter === 'all' ? 'is-active' : ''}`}
          onClick={() => {
            setStockFilter('all');
            setActiveFilter('all');
          }}
        >
          <span className="stat-label">Total Live Products</span>
          <span className="stat-value">{products.length}</span>
        </button>

        <button
          type="button"
          className={`stat-card stat-success ${activeFilter === 'active' ? 'is-active' : ''}`}
          onClick={() => setActiveFilter(activeFilter === 'active' ? 'all' : 'active')}
        >
          <span className="stat-label">Active in Store</span>
          <span className="stat-value">{activeCount}</span>
        </button>

        <button
          type="button"
          className={`stat-card stat-success ${stockFilter === 'in_stock' ? 'is-active' : ''}`}
          onClick={() => setStockFilter(stockFilter === 'in_stock' ? 'all' : 'in_stock')}
        >
          <span className="stat-label">In Stock</span>
          <span className="stat-value">{inStockCount}</span>
        </button>

        <button
          type="button"
          className={`stat-card stat-warning ${stockFilter === 'limited' ? 'is-active' : ''}`}
          onClick={() => setStockFilter(stockFilter === 'limited' ? 'all' : 'limited')}
        >
          <span className="stat-label">Limited Stock</span>
          <span className="stat-value">{limitedCount}</span>
        </button>

        <button
          type="button"
          className={`stat-card stat-error ${stockFilter === 'out_of_stock' ? 'is-active' : ''}`}
          onClick={() => setStockFilter(stockFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
        >
          <span className="stat-label">Out of Stock</span>
          <span className="stat-value">{outCount}</span>
        </button>
      </section>

      {/* Search & Filter Bar */}
      <div className="card controls-card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="search-wrap" style={{ flex: '1 1 260px' }}>
            <Search size={18} className="search-icon" />
            <input
              ref={searchRef}
              type="text"
              className="input search-input"
              placeholder="Search by product name, SKU, category (press /)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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

          {/* Category Dropdown */}
          <div style={{ minWidth: 200 }}>
            <select
              className="select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              style={{ width: '100%', height: 42 }}
            >
              <option value="all">All Categories ({products.length})</option>
              {CATEGORY_LIST.map((cat) => {
                const count = products.filter(
                  (p) =>
                    p.categoryId === cat.id ||
                    (p.category && p.category.toLowerCase().includes(cat.id.toLowerCase()))
                ).length;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div style={{ minWidth: 160 }}>
            <select
              className="select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              style={{ width: '100%', height: 42 }}
            >
              <option value="name">Sort by Name</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock">Stock Level</option>
              <option value="updated">Recently Updated</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(search || selectedCategory !== 'all' || stockFilter !== 'all' || activeFilter !== 'all') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
                setStockFilter('all');
                setActiveFilter('all');
                setPage(1);
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <section className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
            <div>Loading live products from Cloud Firestore...</div>
          </div>
        ) : pagedProducts.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <AlertTriangle size={36} style={{ color: 'var(--color-warning)', margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>No Products Found</h3>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 4, maxWidth: 440, marginInline: 'auto' }}>
              {products.length === 0
                ? "Your Firestore 'products' collection is currently empty. Click 'Sync Catalog' above to populate 60 authoritative products."
                : 'No products match the selected filters or search query.'}
            </p>
            {products.length === 0 && (
              <button
                className="btn btn-primary"
                onClick={handleSeedCatalog}
                style={{ marginTop: 16 }}
                disabled={seeding}
              >
                Sync 60 Products Now
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-surface-muted)', textAlign: 'left', fontSize: 12 }}>
                  <th style={{ padding: '12px 16px' }}>Product</th>
                  <th style={{ padding: '12px 16px' }}>Category</th>
                  <th style={{ padding: '12px 16px' }}>Customer Price</th>
                  <th style={{ padding: '12px 16px' }}>Dealer Price</th>
                  <th style={{ padding: '12px 16px' }}>Stock Level</th>
                  <th style={{ padding: '12px 16px' }}>Stock Status</th>
                  <th style={{ padding: '12px 16px' }}>Store Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.map((p) => {
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderTop: '1px solid var(--color-border)',
                        opacity: p.active ? 1 : 0.6,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {/* Product Name & SKU */}
                      <td style={{ padding: '12px 16px', minWidth: 240 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img
                            src={p.imageUrl || FALLBACK_IMG}
                            alt={p.name}
                            onError={handleImgError}
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 8,
                              objectFit: 'cover',
                              background: '#fff',
                              border: '1px solid var(--color-border)',
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                              SKU: {p.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        <span
                          className="badge"
                          style={{ background: 'var(--color-surface-muted)', color: 'var(--color-text)', fontSize: 11 }}
                        >
                          {p.categoryId?.replace(/-/g, ' ')}
                        </span>
                      </td>

                      {/* Customer Price */}
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
                        ₹{Number(p.customerPrice || 0).toLocaleString('en-IN')}
                      </td>

                      {/* Dealer Price */}
                      <td style={{ padding: '12px 16px', color: '#B45309', fontWeight: 600, fontSize: 14 }}>
                        {p.dealerPrice ? `₹${Number(p.dealerPrice).toLocaleString('en-IN')}` : '—'}
                      </td>

                      {/* Stock Level Count */}
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>
                        {p.stock !== undefined ? (
                          <span style={{ fontWeight: 600 }}>{p.stock} units</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)' }}>Unlimited</span>
                        )}
                      </td>

                      {/* Stock Status Selector */}
                      <td style={{ padding: '12px 16px' }}>
                        <select
                          className="select"
                          value={p.stockStatus}
                          onChange={(e) =>
                            handleUpdateStockStatus(
                              p.id,
                              e.target.value as 'in_stock' | 'limited' | 'out_of_stock'
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
                          <option value="limited">Limited</option>
                          <option value="out_of_stock">Out of Stock</option>
                        </select>
                      </td>

                      {/* Store Visibility Toggle */}
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id, p.active)}
                          className="btn btn-sm"
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            borderRadius: 6,
                            background: p.active ? 'rgba(22, 128, 61, 0.1)' : 'rgba(100, 100, 100, 0.1)',
                            color: p.active ? '#16803D' : '#646464',
                            border: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {p.active ? <Eye size={12} /> : <EyeOff size={12} />}
                          {p.active ? 'Visible' : 'Hidden'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setEditingProduct(p)}
                            title="Edit Product"
                            style={{ padding: 6 }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => setDeletingProductId(p.id)}
                            title="Delete Product"
                            style={{
                              padding: 6,
                              background: 'rgba(180, 35, 24, 0.1)',
                              color: '#B42318',
                              border: 'none',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {sortedProducts.length > pageSize && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              borderTop: '1px solid var(--color-border)',
              fontSize: 13,
            }}
          >
            <div style={{ color: 'var(--color-text-secondary)' }}>
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, sortedProducts.length)} of {sortedProducts.length} items
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span style={{ alignSelf: 'center', padding: '0 8px', fontWeight: 600 }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ADD PRODUCT MODAL */}
      {isAddModalOpen && (
        <ProductFormModal
          title="Add New Catalog Product"
          onClose={() => setIsAddModalOpen(false)}
          onSave={async (newProd) => {
            await setDoc(doc(db, 'products', newProd.id), newProd);
            setIsAddModalOpen(false);
          }}
        />
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <ProductFormModal
          title={`Edit Product: ${editingProduct.name}`}
          initialProduct={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={async (updated) => {
            await setDoc(doc(db, 'products', updated.id), updated, { merge: true });
            setEditingProduct(null);
          }}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingProductId && (
        <div
          className="op-overlay"
          onClick={() => !actionInProgress && setDeletingProductId(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(440px, 90vw)', padding: 24 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-error)' }}>
              <AlertTriangle size={24} />
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Delete Product</h3>
            </div>
            <p style={{ margin: '14px 0 20px', fontSize: 14, color: 'var(--color-text-secondary)' }}>
              Are you sure you want to permanently delete SKU{' '}
              <strong>{deletingProductId}</strong> from Firestore? This action will immediately remove it
              from both the Admin and Mobile Store catalog.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDeletingProductId(null)}
                disabled={actionInProgress}
              >
                Cancel
              </button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--color-error)', color: '#fff', border: 'none' }}
                onClick={() => handleDeleteProduct(deletingProductId)}
                disabled={actionInProgress}
              >
                {actionInProgress ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- PRODUCT FORM MODAL (Add / Edit) ---------- */

interface ProductFormModalProps {
  title: string;
  initialProduct?: Product;
  onClose: () => void;
  onSave: (product: Product) => Promise<void>;
}

function ProductFormModal({ title, initialProduct, onClose, onSave }: ProductFormModalProps) {
  const [id, setId] = useState(initialProduct?.id || `prod-${Date.now().toString().slice(-6)}`);
  const [name, setName] = useState(initialProduct?.name || '');
  const [categoryId, setCategoryId] = useState<string>(initialProduct?.categoryId || 'water-purifiers');
  const [customerPrice, setCustomerPrice] = useState(initialProduct?.customerPrice || 0);
  const [dealerPrice, setDealerPrice] = useState(initialProduct?.dealerPrice || 0);
  const [stock, setStock] = useState(initialProduct?.stock || 50);
  const [stockStatus, setStockStatus] = useState<Product['stockStatus']>(
    initialProduct?.stockStatus || 'in_stock'
  );
  const [active, setActive] = useState(initialProduct?.active ?? true);
  const [imageUrl, setImageUrl] = useState(
    initialProduct?.imageUrl ||
      'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80'
  );
  const [description, setDescription] = useState(initialProduct?.description || '');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Please enter a product name.');
      return;
    }
    if (!id.trim()) {
      setFormError('Please enter a unique product SKU/ID.');
      return;
    }
    if (customerPrice <= 0) {
      setFormError('Customer price must be greater than 0.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const now = new Date().toISOString();
      const productPayload: Product = {
        id: id.trim(),
        name: name.trim(),
        slug: initialProduct?.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        categoryId,
        category: CATEGORY_DEFINITIONS[categoryId]?.name || categoryId,
        customerPrice: Number(customerPrice),
        dealerPrice: dealerPrice ? Number(dealerPrice) : Math.round(Number(customerPrice) * 0.75),
        stock: Number(stock),
        stockStatus,
        active,
        imageUrl: imageUrl.trim() || FALLBACK_IMG,
        description: description.trim() || `${name} - Genuine AquaPure official component.`,
        specifications: initialProduct?.specifications || [
          { label: 'Brand', value: 'AquaPure' },
          { label: 'Warranty', value: '1 Year Manufacturer Warranty' },
        ],
        createdAt: initialProduct?.createdAt || now,
        updatedAt: now,
      };

      await onSave(productPayload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setFormError(msg);
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(640px, 95vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {formError && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              marginBottom: 16,
              fontSize: 13,
            }}
          >
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Product SKU / ID *
              </label>
              <input
                type="text"
                className="input"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={Boolean(initialProduct)}
                required
                style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Category *
              </label>
              <select
                className="select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: '100%', height: 40 }}
              >
                {CATEGORY_LIST.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Product Name *
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AquaPure Copper RO+UV Purifier"
              required
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Customer Price (₹) *
              </label>
              <input
                type="number"
                className="input"
                value={customerPrice}
                onChange={(e) => setCustomerPrice(Number(e.target.value))}
                min={1}
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Dealer Wholesale Price (₹)
              </label>
              <input
                type="number"
                className="input"
                value={dealerPrice}
                onChange={(e) => setDealerPrice(Number(e.target.value))}
                min={0}
                placeholder="Optional discounted rate"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Stock Units Count
              </label>
              <input
                type="number"
                className="input"
                value={stock}
                onChange={(e) => setStock(Number(e.target.value))}
                min={0}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                Stock Status
              </label>
              <select
                className="select"
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value as Product['stockStatus'])}
                style={{ width: '100%', height: 40 }}
              >
                <option value="in_stock">In Stock</option>
                <option value="limited">Limited Stock</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Image URL
            </label>
            <input
              type="url"
              className="input"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Description
            </label>
            <textarea
              className="input"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed product overview, features, filtration stages..."
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              id="activeToggle"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="activeToggle" style={{ fontSize: 14, fontWeight: 600 }}>
              Active and visible in customer mobile catalog
            </label>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              marginTop: 12,
              borderTop: '1px solid var(--color-border)',
              paddingTop: 16,
            }}
          >
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? 'Saving to Firestore...' : initialProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}