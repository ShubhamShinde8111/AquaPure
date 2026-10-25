/**
 * AquaPure Admin — Customers & Dealers Account Management
 * 100% Live Real-Time Data from Cloud Firestore.
 * Supports dealer approval/rejection workflows, customer management, role controls, zero mock data.
 */

import { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  Search,
  Clock,
  ShieldCheck,
  Mail,
  Phone,
  Inbox,
  Radio,
  Building,
  X,
  RefreshCw,
} from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import type { UserProfile, DealerStatus, Order } from '../../types';
import './DealersPage.css';

type AccountTab = 'all' | 'dealers_pending' | 'dealers_approved' | 'dealers_rejected' | 'customers' | 'admins';

export function DealersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<AccountTab>('all');
  const [search, setSearch] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Real-Time subscription to users collection
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
        // Sort by createdAt descending
        list.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.error('Firestore users sync error:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Real-Time subscription to orders for user spend calculation
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            orderNumber: data?.orderNumber || d.id.slice(0, 8),
            orderType: data?.orderType === 'dealer' ? 'dealer' : 'customer',
            orderStatus: data?.orderStatus || 'placed',
            total: Number(data?.total || 0),
            customerId: data?.customerId || '',
            dealerId: data?.dealerId || '',
            items: Array.isArray(data?.items) ? data.items : [],
            createdAt: data?.createdAt || new Date().toISOString(),
          } as Order;
        });
        setOrders(list);
      },
      (err) => console.warn('Orders sync in accounts warning:', err)
    );
    return () => unsub();
  }, []);

  // Keep selected user in sync with real-time updates
  useEffect(() => {
    if (selectedUser) {
      const updated = users.find((u) => u.uid === selectedUser.uid);
      if (updated) setSelectedUser(updated);
    }
  }, [users]);

  // Approve / Reject Dealer Status
  const handleUpdateDealerStatus = async (uid: string, newStatus: DealerStatus) => {
    setActionInProgress(true);
    try {
      await updateDoc(doc(db, 'users', uid), {
        dealerStatus: newStatus,
        updatedAt: new Date().toISOString(),
      });
      const target = users.find((u) => u.uid === uid);
      setActionNotice(
        `Dealer ${target?.businessName || target?.displayName || uid} set to ${newStatus.toUpperCase()}`
      );
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database update failed';
      alert(`Could not update dealer status in Firestore: ${msg}`);
    } finally {
      setActionInProgress(false);
    }
  };

  // Change User Role
  const handleChangeRole = async (uid: string, newRole: 'customer' | 'dealer' | 'admin') => {
    setActionInProgress(true);
    try {
      const updateData: Record<string, any> = {
        role: newRole,
        updatedAt: new Date().toISOString(),
      };
      if (newRole === 'dealer') {
        updateData.dealerStatus = 'approved';
      }
      await updateDoc(doc(db, 'users', uid), updateData);
      setActionNotice(`User role updated to ${newRole.toUpperCase()}`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Role change failed';
      alert(`Could not update user role: ${msg}`);
    } finally {
      setActionInProgress(false);
    }
  };

  // Filter accounts
  const filteredUsers = users.filter((u) => {
    // Tab filter
    if (tab === 'dealers_pending') {
      if (u.role !== 'dealer' || u.dealerStatus !== 'pending') return false;
    } else if (tab === 'dealers_approved') {
      if (u.role !== 'dealer' || u.dealerStatus !== 'approved') return false;
    } else if (tab === 'dealers_rejected') {
      if (u.role !== 'dealer' || u.dealerStatus !== 'rejected') return false;
    } else if (tab === 'customers') {
      if (u.role !== 'customer' && u.role !== undefined) return false;
    } else if (tab === 'admins') {
      if (u.role !== 'admin') return false;
    }

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const nameMatch = (u.displayName || '').toLowerCase().includes(q);
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const businessMatch = (u.businessName || '').toLowerCase().includes(q);
      const phoneMatch = (u.phone || '').includes(q);
      const gstMatch = (u.gstNumber || '').toLowerCase().includes(q);
      const uidMatch = u.uid.toLowerCase().includes(q);
      return nameMatch || emailMatch || businessMatch || phoneMatch || gstMatch || uidMatch;
    }

    return true;
  });

  // Calculate user's order history
  const getUserOrders = (uid: string) => {
    return orders.filter((o) => o.customerId === uid || o.dealerId === uid);
  };

  const getUserTotalSpend = (uid: string) => {
    return getUserOrders(uid).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  };

  const pendingCount = users.filter((u) => u.role === 'dealer' && u.dealerStatus === 'pending').length;
  const approvedCount = users.filter((u) => u.role === 'dealer' && u.dealerStatus === 'approved').length;
  const customersCount = users.filter((u) => u.role === 'customer' || !u.role).length;

  return (
    <div className="dealers-page">
      <header className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Customer & Dealer Accounts</h1>
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
            Verify wholesale trade dealer applications, review customer profiles, and monitor lifetime purchase activity
          </p>
        </div>
      </header>

      {actionNotice && (
        <div className="card notice-banner">
          <CheckCircle size={20} className="text-success" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="dealer-kpis">
        <div className="card dealer-kpi-card">
          <div className="dp-kpi-icon dp-kpi-icon-warning">
            <Clock size={24} />
          </div>
          <div className="dp-kpi-text">
            <div className="dp-kpi-value">{pendingCount}</div>
            <div className="dp-kpi-label">Pending Dealer Review</div>
          </div>
        </div>

        <div className="card dealer-kpi-card">
          <div className="dp-kpi-icon dp-kpi-icon-success">
            <ShieldCheck size={24} />
          </div>
          <div className="dp-kpi-text">
            <div className="dp-kpi-value">{approvedCount}</div>
            <div className="dp-kpi-label">Approved Trade Dealers</div>
          </div>
        </div>

        <div className="card dealer-kpi-card">
          <div className="dp-kpi-icon dp-kpi-icon-info">
            <Users size={24} />
          </div>
          <div className="dp-kpi-text">
            <div className="dp-kpi-value">{customersCount}</div>
            <div className="dp-kpi-label">Registered Customers</div>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="card controls-card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: '1 1 260px' }}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="input search-input"
              placeholder="Search by name, email, company, phone, GST, UID..."
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

          <div className="status-tabs" style={{ margin: 0 }}>
            <button
              type="button"
              className={`status-tab ${tab === 'all' ? 'status-tab-active' : ''}`}
              onClick={() => setTab('all')}
            >
              All ({users.length})
            </button>
            <button
              type="button"
              className={`status-tab ${tab === 'dealers_pending' ? 'status-tab-active' : ''}`}
              onClick={() => setTab('dealers_pending')}
            >
              Pending Dealers ({pendingCount})
            </button>
            <button
              type="button"
              className={`status-tab ${tab === 'dealers_approved' ? 'status-tab-active' : ''}`}
              onClick={() => setTab('dealers_approved')}
            >
              Approved Dealers ({approvedCount})
            </button>
            <button
              type="button"
              className={`status-tab ${tab === 'customers' ? 'status-tab-active' : ''}`}
              onClick={() => setTab('customers')}
            >
              Customers ({customersCount})
            </button>
            <button
              type="button"
              className={`status-tab ${tab === 'admins' ? 'status-tab-active' : ''}`}
              onClick={() => setTab('admins')}
            >
              Admins ({users.filter((u) => u.role === 'admin').length})
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading user accounts from Cloud Firestore...</div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card op-empty">
          <Inbox size={36} />
          <p className="op-empty-title">No accounts found</p>
          <p className="text-secondary">
            {users.length === 0
              ? 'No user documents currently exist in Firestore.'
              : 'No users match the selected tab filter or search query.'}
          </p>
        </div>
      ) : (
        <div className="card table-card op-table-view">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User / Business</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Dealer Status</th>
                  <th>Orders / Spend</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const userOrders = getUserOrders(u.uid);
                  const totalSpend = getUserTotalSpend(u.uid);

                  return (
                    <tr
                      key={u.uid}
                      tabIndex={0}
                      onClick={() => setSelectedUser(u)}
                      className={`op-row ${selectedUser?.uid === u.uid ? 'row-selected' : ''}`}
                    >
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {u.displayName || (u.role === 'dealer' && u.businessName) || 'User'}
                        </div>
                        {u.businessName && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Building size={12} /> {u.businessName}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          UID: {u.uid.slice(0, 10)}...
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            u.role === 'admin'
                              ? 'badge-error'
                              : u.role === 'dealer'
                              ? 'badge-info'
                              : 'badge-neutral'
                          }`}
                        >
                          {(u.role || 'CUSTOMER').toUpperCase()}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Mail size={12} style={{ color: 'var(--color-text-secondary)' }} />
                          {u.email || 'No email registered'}
                        </div>
                        {u.phone && (
                          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                            <Phone size={12} /> {u.phone}
                          </div>
                        )}
                      </td>

                      <td>
                        {u.role === 'dealer' ? (
                          <span
                            className={`badge ${
                              u.dealerStatus === 'approved'
                                ? 'badge-success'
                                : u.dealerStatus === 'pending'
                                ? 'badge-warning'
                                : 'badge-error'
                            }`}
                          >
                            {(u.dealerStatus || 'PENDING').toUpperCase()}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>—</span>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {userOrders.length} order(s)
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                          ₹{totalSpend.toLocaleString('en-IN')} total
                        </div>
                      </td>

                      <td style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                        {u.createdAt
                          ? new Date(u.createdAt).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{ display: 'inline-flex', gap: 6 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {u.role === 'dealer' && u.dealerStatus !== 'approved' && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateDealerStatus(u.uid, 'approved')}
                              disabled={actionInProgress}
                              style={{ padding: '4px 10px', fontSize: 12 }}
                            >
                              Approve
                            </button>
                          )}

                          {u.role === 'dealer' && u.dealerStatus !== 'rejected' && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{ background: 'rgba(180, 35, 24, 0.1)', color: '#B42318', border: 'none', padding: '4px 8px', fontSize: 12 }}
                              onClick={() => handleUpdateDealerStatus(u.uid, 'rejected')}
                              disabled={actionInProgress}
                            >
                              Reject
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedUser(u)}
                            style={{ padding: '4px 8px', fontSize: 12 }}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USER DETAILS DRAWER */}
      {selectedUser && (
        <div className="op-overlay" onClick={() => setSelectedUser(null)}>
          <div className="op-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <span className="order-id-badge" style={{ fontSize: 13 }}>
                  {(selectedUser.role || 'CUSTOMER').toUpperCase()}
                </span>
                <h3 style={{ marginTop: 6 }}>
                  {selectedUser.displayName || selectedUser.businessName || 'Account Profile'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  UID: {selectedUser.uid}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedUser(null)}
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {/* Dealer Approval Action Bar */}
              {selectedUser.role === 'dealer' && (
                <div
                  style={{
                    padding: 16,
                    borderRadius: 10,
                    background:
                      selectedUser.dealerStatus === 'approved'
                        ? 'rgba(22, 128, 61, 0.08)'
                        : selectedUser.dealerStatus === 'pending'
                        ? 'rgba(245, 158, 11, 0.08)'
                        : 'rgba(180, 35, 24, 0.08)',
                    marginBottom: 20,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    TRADE DEALER STATUS
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span
                      className={`badge ${
                        selectedUser.dealerStatus === 'approved'
                          ? 'badge-success'
                          : selectedUser.dealerStatus === 'pending'
                          ? 'badge-warning'
                          : 'badge-error'
                      }`}
                      style={{ fontSize: 13, padding: '4px 10px' }}
                    >
                      {(selectedUser.dealerStatus || 'PENDING').toUpperCase()}
                    </span>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {selectedUser.dealerStatus !== 'approved' && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateDealerStatus(selectedUser.uid, 'approved')}
                          disabled={actionInProgress}
                        >
                          Approve Dealer
                        </button>
                      )}
                      {selectedUser.dealerStatus !== 'rejected' && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ background: 'rgba(180, 35, 24, 0.1)', color: '#B42318', border: 'none' }}
                          onClick={() => handleUpdateDealerStatus(selectedUser.uid, 'rejected')}
                          disabled={actionInProgress}
                        >
                          Reject Application
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Contact Information */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: 'var(--color-surface-muted)',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
                  CONTACT INFORMATION
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Full Name: </span>
                    <strong>{selectedUser.displayName || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Email: </span>
                    <strong>{selectedUser.email || '—'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Phone: </span>
                    <strong>{selectedUser.phone || '—'}</strong>
                  </div>
                  {selectedUser.businessName && (
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>Business Name: </span>
                      <strong>{selectedUser.businessName}</strong>
                    </div>
                  )}
                  {selectedUser.gstNumber && (
                    <div>
                      <span style={{ color: 'var(--color-text-secondary)' }}>GST Number: </span>
                      <strong style={{ fontFamily: 'var(--font-mono)' }}>{selectedUser.gstNumber}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Role Management */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: 'var(--color-surface-muted)',
                  marginBottom: 20,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  ASSIGN SYSTEM ROLE
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedUser.role === 'customer' || !selectedUser.role ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleChangeRole(selectedUser.uid, 'customer')}
                    disabled={actionInProgress}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedUser.role === 'dealer' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleChangeRole(selectedUser.uid, 'dealer')}
                    disabled={actionInProgress}
                  >
                    Dealer
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${selectedUser.role === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleChangeRole(selectedUser.uid, 'admin')}
                    disabled={actionInProgress}
                  >
                    Admin
                  </button>
                </div>
              </div>

              {/* Saved Delivery Addresses */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
                  SAVED ADDRESSES ({selectedUser.addresses?.length || 0})
                </div>
                {selectedUser.addresses && selectedUser.addresses.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedUser.addresses.map((addr, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 12,
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          fontSize: 13,
                        }}
                      >
                        <strong>{addr.label || 'Address'}</strong> — {addr.fullName}
                        <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>
                          {addr.addressLine1}
                          {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>
                          {addr.city}, {addr.state} - {addr.pincode}
                        </div>
                        <div style={{ fontSize: 12, marginTop: 4 }}>
                          Phone: {addr.phone}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    No delivery addresses stored in user profile.
                  </div>
                )}
              </div>

              {/* Recent Orders placed by this user */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
                  PURCHASE HISTORY ({getUserOrders(selectedUser.uid).length})
                </div>
                {getUserOrders(selectedUser.uid).length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {getUserOrders(selectedUser.uid).map((order) => (
                      <div
                        key={order.id}
                        style={{
                          padding: 10,
                          border: '1px solid var(--color-border)',
                          borderRadius: 8,
                          fontSize: 13,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <strong>{order.orderNumber || order.id.slice(0, 10)}</strong>
                          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>
                            {new Date(order.createdAt).toLocaleDateString('en-IN')} • {order.items?.length || 0} items
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <strong>₹{Number(order.total || 0).toLocaleString('en-IN')}</strong>
                          <div>
                            <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                              {(order.orderStatus || 'placed').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    No orders linked to this UID yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const AccountsPage = DealersPage;