import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import UserProfileModal from './UserProfileModal'

const allSideItems = [
  { to: '/atividades', icon: 'timer', label: 'Horas/Atividades', adminOnly: false },
  { to: '/gasoleo', icon: 'local_gas_station', label: 'Consumo Gasoleo', adminOnly: false },
  { to: '/alimentacao', icon: 'agriculture', label: 'Alimentacao Animal', adminOnly: false },
  { to: '/despesas', icon: 'receipt_long', label: 'Despesas', adminOnly: true },
  { to: '/definicoes', icon: 'settings', label: 'Definicoes', adminOnly: true },
]

const allTopItems = [
  { to: '/', label: 'Dashboard', adminOnly: false },
  { to: '/atividades', label: 'Horas/Atividades', adminOnly: false },
  { to: '/gasoleo', label: 'Consumo Gasoleo', adminOnly: false },
  { to: '/alimentacao', label: 'Alimentacao Animal', adminOnly: false },
]

const allMobileItems = [
  { to: '/', icon: 'dashboard', label: 'Painel', adminOnly: false },
  { to: '/atividades', icon: 'history', label: 'Horas', adminOnly: false },
  { to: '/gasoleo', icon: 'ev_station', label: 'Gasoleo', adminOnly: false },
  { to: '/alimentacao', icon: 'pets', label: 'Alimentar', adminOnly: false },
  { to: '/despesas', icon: 'receipt_long', label: 'Despesas', adminOnly: true },
  { to: '/definicoes', icon: 'settings', label: 'Config', adminOnly: true },
]

export default function Layout() {
  const { isAdmin, profile } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)

  const sideItems = allSideItems.filter(i => !i.adminOnly || isAdmin)
  const topItems = allTopItems.filter(i => !i.adminOnly || isAdmin)
  const mobileItems = allMobileItems.filter(i => !i.adminOnly || isAdmin)

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const avatarUrl = profile?.avatar_url

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      {/* Top Nav */}
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <NavLink to="/" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#365314', letterSpacing: '-0.03em', textDecoration: 'none', fontFamily: "'Manrope', sans-serif" }}>
            AgroPrecision
          </NavLink>
          <nav className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {topItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}
                style={({ isActive }) => ({
                  fontFamily: "'Manrope', sans-serif", fontSize: '0.875rem', fontWeight: isActive ? 700 : 600,
                  letterSpacing: '-0.01em', color: isActive ? '#4d7c0f' : '#78716c',
                  borderBottom: isActive ? '2px solid #4d7c0f' : '2px solid transparent',
                  paddingBottom: '0.25rem', textDecoration: 'none', transition: 'all 0.2s',
                })}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isAdmin && (
            <NavLink to="/definicoes" style={{ padding: '0.5rem', color: '#78716c', borderRadius: '9999px', display: 'flex' }}>
              <span className="material-symbols-outlined">settings</span>
            </NavLink>
          )}
          <button onClick={() => setProfileOpen(true)} title="O meu perfil"
            style={{ width: 32, height: 32, borderRadius: '50%', background: avatarUrl ? 'transparent' : 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6875rem', fontWeight: 700, border: 'none', cursor: 'pointer', padding: 0, overflow: 'hidden' }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            ) : initials}
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
              <NavLink key={item.to} to={item.to}
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
