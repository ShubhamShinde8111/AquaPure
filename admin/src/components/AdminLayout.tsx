/**
 * AquaPure Admin — Sidebar Layout
 * Follows DESIGN.md §7 Admin Dashboard Guidance
 */

import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../services/authContext';
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  Wrench,
  BarChart3,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { AquaPureLogo } from './AquaPureLogo';
import { ErrorBoundary } from './ErrorBoundary';
import './AdminLayout.css';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/inventory', icon: Layers, label: 'Inventory' },
  { to: '/orders', icon: ShoppingCart, label: 'Orders & Payments' },
  { to: '/accounts', icon: Users, label: 'Customers & Dealers' },
  { to: '/service', icon: Wrench, label: 'Service Desk' },
  { to: '/reports', icon: BarChart3, label: 'Reports & Analytics' },
];

export function AdminLayout() {
  // Desktop: collapse / expand the sidebar
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Mobile: slide-in drawer (closed by default)
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signOut, user } = useAdminAuth();

  // Mobile drawer: Escape closes, page scroll locks, and it resets when the screen grows
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    const mq = window.matchMedia('(min-width: 769px)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setMobileOpen(false);
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onChange);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onChange);
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="admin-layout">
      {/* Mobile top bar */}
      <header className="mobile-topbar">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
        >
          <Menu size={22} />
        </button>
        <div className="mobile-topbar-brand">
          <AquaPureLogo height={30} variant="badge" badgeText="Admin" />
        </div>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobile} aria-hidden="true" />}

      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarOpen ? '' : 'sidebar-collapsed'} ${
          mobileOpen ? 'sidebar-mobile-open' : ''
        }`}
      >
        <div className="sidebar-header">
          <div className="sidebar-brand-wrapper">
            <div className="sidebar-logo-expanded">
              <AquaPureLogo height={34} variant="badge" badgeText="Admin" />
            </div>
            <div className="sidebar-logo-compact">
              <AquaPureLogo variant="compact" />
            </div>
          </div>

          {/* Desktop collapse toggle */}
          <button
            type="button"
            className="sidebar-toggle sidebar-toggle-desktop"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Mobile close button */}
          <button
            type="button"
            className="sidebar-toggle sidebar-toggle-mobile"
            onClick={closeMobile}
            aria-label="Close navigation menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={closeMobile}
              title={sidebarOpen ? undefined : label}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
            >
              <Icon size={20} />
              <span className="sidebar-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-user-email sidebar-label">{user.email}</div>
              <div className="sidebar-user-icon" aria-hidden="true">
                👤
              </div>
            </div>
          )}
          <button
            type="button"
            className="sidebar-link"
            aria-label="Sign out"
            title={sidebarOpen ? undefined : 'Sign Out'}
            onClick={signOut}
          >
            <LogOut size={20} />
            <span className="sidebar-label">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="admin-main">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}