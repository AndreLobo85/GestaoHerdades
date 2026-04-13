import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import UserProfileModal from './UserProfileModal'

const allSideItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard', key: 'dashboard' },
  { to: '/atividades', icon: 'timer', label: 'Horas/Atividades', key: 'atividades' },
  { to: '/gasoleo', icon: 'local_gas_station', label: 'Consumo Gasoleo', key: 'gasoleo' },
  { to: '/alimentacao', icon: 'agriculture', label: 'Alimentacao Animal', key: 'alimentacao' },
  { to: '/stock', icon: 'inventory_2', label: 'Stock', key: 'stock' },
  { to: '/despesas', icon: 'receipt_long', label: 'Despesas', key: 'despesas' },
  { to: '/definicoes', icon: 'settings', label: 'Definicoes', key: 'definicoes' },
]

const allMobileItems = [
  { to: '/', icon: 'dashboard', label: 'Painel', key: 'dashboard' },
  { to: '/atividades', icon: 'history', label: 'Horas', key: 'atividades' },
  { to: '/gasoleo', icon: 'ev_station', label: 'Gasoleo', key: 'gasoleo' },
  { to: '/alimentacao', icon: 'pets', label: 'Alimentar', key: 'alimentacao' },
  { to: '/stock', icon: 'inventory_2', label: 'Stock', key: 'stock' },
  { to: '/despesas', icon: 'receipt_long', label: 'Despesas', key: 'despesas' },
  { to: '/definicoes', icon: 'settings', label: 'Config', key: 'definicoes' },
]

export default function Layout() {
  const { isAdmin, profile, allowedViews, signOut } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  // Filter by allowed views from DB; if no views loaded yet, admins see all, users see basics
  const canSee = (key: string) => {
    if (allowedViews.length > 0) return allowedViews.includes(key)
    return isAdmin || !['despesas', 'definicoes'].includes(key)
  }
  const sideItems = allSideItems.filter(i => canSee(i.key))
  const mobileItems = allMobileItems.filter(i => canSee(i.key))

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const avatarUrl = profile?.avatar_url

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      {/* Top Nav */}
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <NavLink to="/" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#365314', letterSpacing: '-0.03em', textDecoration: 'none', fontFamily: "'Manrope', sans-serif" }}>
            AgroPrecision
          </NavLink>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={() => setProfileOpen(true)} title="O meu perfil"
            style={{ width: 32, height: 32, borderRadius: '50%', background: avatarUrl ? 'transparent' : 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6875rem', fontWeight: 700, border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            ) : initials}
          </button>
          <button onClick={signOut} title="Terminar sessao"
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fecaca')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-low)')}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#78716c' }}>logout</span>
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', paddingTop: '4rem', minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside className="sidebar hide-mobile">
          <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 900, color: '#365314' }}>Gestao Agricola</h2>
            <p style={{ fontSize: '0.75rem', color: '#78716c', fontFamily: "'Manrope', sans-serif" }}>The Digital Agronomist</p>
          </div>
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {sideItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User info + logout */}
          <div style={{ borderTop: '1px solid #e7e5e4', paddingTop: '1rem', marginBottom: '5rem' }}>
            <button onClick={() => setProfileOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', marginBottom: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', borderRadius: 'var(--radius-sm)', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f4')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarUrl ? 'transparent' : 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden' }}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} /> : initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--on-surface)' }}>{profile?.full_name || 'Utilizador'}</p>
                <p style={{ fontSize: '0.625rem', color: '#a8a29e', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>{profile?.role || 'utilizador'}</p>
              </div>
            </button>
            <button className="btn-primary" onClick={() => window.location.href = '/atividades'}
              style={{ width: '100%' }}>
              <span className="material-symbols-outlined">add</span>
              Novo Registo
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '5rem', background: 'var(--bg)' }}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav hide-desktop">
        {mobileItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: isActive ? '0.75rem' : '0.5rem',
              background: isActive ? '#3f6212' : 'transparent', color: isActive ? 'white' : '#a8a29e',
              borderRadius: isActive ? '1rem' : '0', transform: isActive ? 'translateY(-0.5rem) scale(1.1)' : 'none',
              textDecoration: 'none', transition: 'all 0.3s',
            })}>
            <span className="material-symbols-outlined">{item.icon}</span>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginTop: '0.25rem' }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
