/**
 * AquaPure Admin — Service & Maintenance Help Desk
 * 100% Live Real-Time Data from Cloud Firestore.
 * Dispatches technicians, updates service states, records resolution notes, zero mock data.
 */

import { useState, useEffect } from 'react';
import {
  Search,
  CheckCircle,
  Clock,
  UserCheck,
  AlertCircle,
  ChevronRight,
  X,
  MapPin,
  CalendarClock,
  Inbox,
  Radio,
  RefreshCw,
  Ban,
  Phone,
  Save,
} from 'lucide-react';
import { db } from '../../services/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import type { ServiceBooking, ServiceStatus } from '../../types';
import './ServicePage.css';

const SERVICE_FLOW: ServiceStatus[] = [
  'requested',
  'confirmed',
  'in_progress',
  'completed',
];

export function ServicePage() {
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<ServiceBooking | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Technician notes state inside drawer
  const [notesInput, setNotesInput] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Real-Time subscription to Firestore service_bookings
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      collection(db, 'service_bookings'),
      (snapshot) => {
        const list = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() } as ServiceBooking)
        );
        // Client-side sort by createdAt descending
        list.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        setBookings(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore service bookings sync error:', err);
        setError(`Failed to connect to Firestore service bookings: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Keep selectedBooking in sync with real-time updates
  useEffect(() => {
    if (selectedBooking) {
      const updated = bookings.find((b) => b.id === selectedBooking.id);
      if (updated) {
        setSelectedBooking(updated);
        setNotesInput(updated.notes || '');
      }
    }
  }, [bookings]);

  // Drawer keyboard / scroll management
  useEffect(() => {
    if (!selectedBooking) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedBooking(null);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selectedBooking]);

  // Status Progression Handler
  const handleAdvanceStatus = async (
    bookingId: string,
    currentStatus: ServiceStatus
  ) => {
    const currentIndex = SERVICE_FLOW.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= SERVICE_FLOW.length - 1) return;
    const nextStatus = SERVICE_FLOW[currentIndex + 1];
    await handleSetStatus(bookingId, nextStatus);
  };

  // Direct Status Update Handler
  const handleSetStatus = async (bookingId: string, nextStatus: ServiceStatus) => {
    try {
      await updateDoc(doc(db, 'service_bookings', bookingId), {
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      });
      setActionNotice(`Service ticket ${bookingId.slice(0, 8)} status set to ${nextStatus.toUpperCase()}`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Database update failed';
      alert(`Could not update service status in Firestore: ${msg}`);
    }
  };

  // Save technician resolution notes
  const handleSaveNotes = async () => {
    if (!selectedBooking) return;
    setSavingNotes(true);
    try {
      await updateDoc(doc(db, 'service_bookings', selectedBooking.id), {
        notes: notesInput.trim(),
        updatedAt: new Date().toISOString(),
      });
      setActionNotice('Technician dispatch notes updated in Firestore');
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Notes save failed';
      alert(`Could not save notes: ${msg}`);
    } finally {
      setSavingNotes(false);
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter((b) => {
    // Status filter
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;

    // Type filter
    if (typeFilter !== 'all' && b.serviceType !== typeFilter) return false;

    // Search query
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const idMatch = b.id.toLowerCase().includes(q);
      const nameMatch = (b.address?.fullName || '').toLowerCase().includes(q);
      const phoneMatch = (b.address?.phone || '').includes(q);
      const typeMatch = (b.serviceType || '').toLowerCase().includes(q);
      const notesMatch = (b.notes || '').toLowerCase().includes(q);
      const cityMatch = (b.address?.city || '').toLowerCase().includes(q);
      return idMatch || nameMatch || phoneMatch || typeMatch || notesMatch || cityMatch;
    }

    return true;
  });

  const getStatusBadgeClass = (status: ServiceStatus) => {
    switch (status) {
      case 'completed':
        return 'badge-success';
      case 'in_progress':
        return 'badge-info';
      case 'confirmed':
        return 'badge-warning';
      case 'cancelled':
        return 'badge-error';
      default:
        return 'badge-neutral';
    }
  };

  const getNextStatus = (status: ServiceStatus): ServiceStatus | null => {
    const idx = SERVICE_FLOW.indexOf(status);
    return idx >= 0 && idx < SERVICE_FLOW.length - 1 ? SERVICE_FLOW[idx + 1] : null;
  };

  const typeLabel = (t: string) => (t || 'service').replace(/_/g, ' ').toUpperCase();
  const statusLabel = (s: string) => (s || 'requested').replace(/_/g, ' ').toUpperCase();

  // KPIs
  const requestedCount = bookings.filter((b) => b.status === 'requested').length;
  const inProgressCount = bookings.filter((b) => b.status === 'confirmed' || b.status === 'in_progress').length;
  const completedCount = bookings.filter((b) => b.status === 'completed').length;

  return (
    <div className="service-page">
      <header className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1>Service Desk & Field Dispatches</h1>
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
            Coordinate technician appointments, filter maintenance, system repair, and installation requests
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
      <div className="service-kpis">
        <div className="card service-kpi-card">
          <div className="sp-kpi-icon sp-kpi-icon-warning">
            <AlertCircle size={22} />
          </div>
          <div className="sp-kpi-text">
            <div className="sp-kpi-value">{requestedCount}</div>
            <div className="sp-kpi-label">Pending Requests</div>
          </div>
        </div>

        <div className="card service-kpi-card">
          <div className="sp-kpi-icon sp-kpi-icon-info">
            <Clock size={22} />
          </div>
          <div className="sp-kpi-text">
            <div className="sp-kpi-value">{inProgressCount}</div>
            <div className="sp-kpi-label">Active Dispatches</div>
          </div>
        </div>

        <div className="card service-kpi-card">
          <div className="sp-kpi-icon sp-kpi-icon-success">
            <UserCheck size={22} />
          </div>
          <div className="sp-kpi-text">
            <div className="sp-kpi-value">{completedCount}</div>
            <div className="sp-kpi-label">Completed Services</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="card sp-controls" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search Box */}
          <div className="sp-search" style={{ flex: '1 1 240px' }}>
            <Search size={18} className="sp-search-icon" />
            <input
              type="text"
              className="input sp-search-input"
              placeholder="Search by Ticket ID, customer name, phone, notes, city..."
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

          {/* Service Type Dropdown */}
          <div style={{ minWidth: 180 }}>
            <select
              className="select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: '100%', height: 42 }}
            >
              <option value="all">All Service Types</option>
              <option value="installation">Installation</option>
              <option value="maintenance">Maintenance</option>
              <option value="repair">Repair</option>
              <option value="filter_replacement">Filter Replacement</option>
              <option value="general_inquiry">General Inquiry</option>
            </select>
          </div>

          {(search || statusFilter !== 'all' || typeFilter !== 'all') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setTypeFilter('all');
              }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="service-tabs" style={{ marginTop: 14 }}>
          <button
            type="button"
            className={`service-tab ${statusFilter === 'all' ? 'service-tab-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All Bookings ({bookings.length})
          </button>
          {SERVICE_FLOW.map((s) => (
            <button
              key={s}
              type="button"
              className={`service-tab ${statusFilter === s ? 'service-tab-active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {statusLabel(s)} ({bookings.filter((b) => b.status === s).length})
            </button>
          ))}
          <button
            type="button"
            className={`service-tab ${statusFilter === 'cancelled' ? 'service-tab-active' : ''}`}
            onClick={() => setStatusFilter('cancelled')}
          >
            CANCELLED ({bookings.filter((b) => b.status === 'cancelled').length})
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      {loading ? (
        <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 12px' }} />
          <div>Loading service tickets from Cloud Firestore...</div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card sp-empty">
          <Inbox size={36} />
          <p className="sp-empty-title">No service bookings found</p>
          <p className="text-secondary">
            {bookings.length === 0
              ? 'No service bookings currently recorded in Firestore.'
              : 'No bookings match the selected filters or search query.'}
          </p>
        </div>
      ) : (
        <div className="card table-card sp-table-view">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Service Type</th>
                  <th>Customer / Location</th>
                  <th>Scheduled Slot</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((b) => {
                  const nextStatus = getNextStatus(b.status);
                  const name = b.address?.fullName || 'Customer';
                  const city = b.address?.city || 'India';
                  const phone = b.address?.phone || '';

                  return (
                    <tr
                      key={b.id}
                      tabIndex={0}
                      onClick={() => {
                        setSelectedBooking(b);
                        setNotesInput(b.notes || '');
                      }}
                      className={`sp-row ${selectedBooking?.id === b.id ? 'row-selected' : ''}`}
                    >
                      <td>
                        <span className="booking-id-badge">{b.id.slice(0, 10)}</span>
                        <div className="booking-time">
                          {b.createdAt
                            ? new Date(b.createdAt).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'Live'}
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-info">{typeLabel(b.serviceType)}</span>
                      </td>

                      <td>
                        <div className="customer-name">{name}</div>
                        <div className="customer-city">
                          {city} {phone ? `• ${phone}` : ''}
                        </div>
                      </td>

                      <td>
                        <div className="slot-date">{b.preferredDate || 'Flexible'}</div>
                        <div className="slot-time">{b.preferredTime || 'Anytime'}</div>
                      </td>

                      <td>
                        <span className={`badge ${getStatusBadgeClass(b.status)}`}>
                          {statusLabel(b.status)}
                        </span>
                      </td>

                      <td>
                        {nextStatus ? (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm sp-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStatus(b.id, b.status);
                            }}
                          >
                            Mark {statusLabel(nextStatus)}
                            <ChevronRight size={14} />
                          </button>
                        ) : b.status === 'completed' ? (
                          <span className="sp-closed">
                            <CheckCircle size={14} />
                            Completed
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                            Closed
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
      {selectedBooking && (
        <div className="op-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="op-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <span className="booking-id-badge" style={{ fontSize: 13 }}>
                  {selectedBooking.id}
                </span>
                <h3 style={{ marginTop: 6 }}>
                  {typeLabel(selectedBooking.serviceType)} Dispatch
                </h3>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                  Submitted on {new Date(selectedBooking.createdAt).toLocaleString('en-IN')}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedBooking(null)}
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>
              {/* Status Stepper */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                  DISPATCH PIPELINE
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SERVICE_FLOW.map((s, idx) => {
                    const currentIdx = SERVICE_FLOW.indexOf(selectedBooking.status);
                    const isDone = currentIdx >= idx && selectedBooking.status !== 'cancelled';
                    const isCurrent = selectedBooking.status === s;

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
                        {idx + 1}. {statusLabel(s)}
                      </span>
                    );
                  })}
                  {selectedBooking.status === 'cancelled' && (
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
                {getNextStatus(selectedBooking.status) && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAdvanceStatus(selectedBooking.id, selectedBooking.status)}
                  >
                    Advance to {statusLabel(getNextStatus(selectedBooking.status)!)}
                  </button>
                )}

                {selectedBooking.status !== 'completed' && selectedBooking.status !== 'cancelled' && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleSetStatus(selectedBooking.id, 'completed')}
                  >
                    <CheckCircle size={14} /> Quick Mark Completed
                  </button>
                )}

                {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'completed' && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    style={{ background: 'rgba(180, 35, 24, 0.1)', color: '#B42318', border: 'none' }}
                    onClick={() => {
                      if (confirm('Cancel this service request?')) {
                        handleSetStatus(selectedBooking.id, 'cancelled');
                      }
                    }}
                  >
                    <Ban size={14} /> Cancel Ticket
                  </button>
                )}
              </div>

              {/* Scheduled Appointment */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: 'var(--color-surface-muted)',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                  <CalendarClock size={16} style={{ color: 'var(--color-primary)' }} />
                  SCHEDULED SLOT
                </div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {selectedBooking.preferredDate || 'Flexible Schedule'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {selectedBooking.preferredTime || 'Customer will confirm time slot'}
                </div>
              </div>

              {/* Customer Service Location */}
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
                  CUSTOMER & ON-SITE ADDRESS
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {selectedBooking.address?.fullName || 'Customer'}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  {selectedBooking.address?.addressLine1}
                  {selectedBooking.address?.addressLine2 ? `, ${selectedBooking.address.addressLine2}` : ''}
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                  {selectedBooking.address?.city}, {selectedBooking.address?.state} - {selectedBooking.address?.pincode}
                </div>
                {selectedBooking.address?.phone && (
                  <div style={{ fontSize: 13, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={13} /> <strong>Phone:</strong> {selectedBooking.address.phone}
                  </div>
                )}
              </div>

              {/* Customer Request Notes */}
              {selectedBooking.notes && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                    CUSTOMER SYMPTOMS / NOTES
                  </div>
                  <div
                    style={{
                      padding: 12,
                      background: 'rgba(255, 186, 0, 0.08)',
                      border: '1px solid rgba(255, 186, 0, 0.3)',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    {selectedBooking.notes}
                  </div>
                </div>
              )}

              {/* Technician Notes & Resolution Record */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
                  FIELD TECHNICIAN RESOLUTION LOG
                </div>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Record assigned technician, filter replacement batch, TDS measurements, or completion notes..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', fontSize: 13, marginBottom: 8 }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Save size={14} />
                  {savingNotes ? 'Saving to Firestore...' : 'Save Resolution Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}