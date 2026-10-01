import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import { AlertTriangle, X } from 'lucide-react';
import { inventoryApi, InventoryPreferenceSettings } from '../services/inventoryService';

const defaultInventoryTheme: Pick<InventoryPreferenceSettings, 'primary_color' | 'accent_color' | 'page_color' | 'surface_color'> = {
  primary_color: '#0B2447',
  accent_color: '#0D9488',
  page_color: '#F4F6FA',
  surface_color: '#FFFFFF',
};

export default function MainLayout() {
  const { user, activeRole } = useAuth();
  const { globalDays } = useData();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventoryTheme, setInventoryTheme] = useState(defaultInventoryTheme);
  const location = useLocation();
  const isInventoryWorkspace = location.pathname === '/inventory-dashboard' || location.pathname.startsWith('/inventory');

  // workflow banner removed per UI preference

  useEffect(() => {
    if (sessionStorage.getItem('ems_banner_dismissed') === 'true') setBannerDismissed(true);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isInventoryWorkspace) return;

    const loadTheme = () => {
      inventoryApi.getMasterSettings()
        .then((settings) => setInventoryTheme({ ...defaultInventoryTheme, ...settings.inventory }))
        .catch(() => setInventoryTheme(defaultInventoryTheme));
    };

    loadTheme();
    window.addEventListener('track360:inventory-theme-updated', loadTheme);
    return () => window.removeEventListener('track360:inventory-theme-updated', loadTheme);
  }, [isInventoryWorkspace]);

  if (!user) return <Navigate to="/login" />;
  if (activeRole === 'employee') return <Navigate to="/my-dashboard" />;

  const today = new Date().toISOString().split('T')[0];
  const activeBanner = !bannerDismissed ? globalDays.find(g => g.date === today && g.show_banner && g.is_active) : null;

  const handleDismiss = () => {
    setBannerDismissed(true);
    sessionStorage.setItem('ems_banner_dismissed', 'true');
  };

  const workspaceStyle = isInventoryWorkspace
    ? ({
        '--inventory-primary': inventoryTheme.primary_color,
        '--inventory-accent': inventoryTheme.accent_color,
        '--inventory-page': inventoryTheme.page_color,
        '--inventory-surface': inventoryTheme.surface_color,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className={`app-layout${isInventoryWorkspace ? ' workspace-inventory' : ''}`} style={workspaceStyle}>
      <button
        className={`sidebar-backdrop ${sidebarOpen ? 'is-visible' : ''}`}
        type="button"
        aria-label="Close navigation"
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar open={sidebarOpen} />
      <div className="main-area">
        <Topbar onMenuClick={() => setSidebarOpen((open) => !open)} />
        {activeBanner && (
          <div style={{ background: 'var(--amberl)', border: '1px solid var(--amber)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--amber)' }}>
            <AlertTriangle size={14} />
            <span style={{ flex: 1, fontWeight: 600 }}>{activeBanner.banner_message || activeBanner.title}</span>
            <button onClick={handleDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', padding: 4 }}><X size={14} /></button>
          </div>
        )}
        {/* Workflow banner intentionally removed */}
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}











