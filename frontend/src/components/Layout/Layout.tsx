import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppStore } from '../../stores/appStore';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-layout">
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.5rem' }}>⚡</span>
          <span style={{ fontWeight: 600, fontSize: '1.2rem', color: 'var(--text-primary)' }}>QueryForge</span>
        </div>
        <button 
          className="btn btn-ghost" 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ fontSize: '1.5rem', padding: '4px 8px' }}
        >
          ☰
        </button>
      </div>
{/* @ts-ignore */}
      <Sidebar mobileOpen={mobileMenuOpen} closeMobile={() => setMobileMenuOpen(false)} />
      
      <main className={`app-main${!sidebarOpen ? ' sidebar-collapsed' : ''}`}>
        <Header />
        <div className="app-content">
          {children}
        </div>
      </main>
    </div>
  );
}
