import { NavLink, Outlet } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTenant } from '../contexts/TenantContext'
import UserProfileModal from './UserProfileModal'

// key: internal menu id · module: key in tenant_modules (if applicable)
const allSideItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard', key: 'dashboard' },
  { to: '/atividades', icon: 'timer', label: 'Horas/Atividades', key: 'atividades', module: 'activities' },
  { to: '/gasoleo', icon: 'local_gas_station', label: 'Consumo Gasoleo', key: 'gasoleo', module: 'fuel' },
  { to: '/alimentacao', icon: 'agriculture', label: 'Alimentacao Animal', key: 'alimentacao', module: 'feed' },
  { to: '/stock', icon: 'inventory_2', label: 'Stock', key: 'stock', module: 'stock' },
  { to: '/despesas', icon: 'receipt_long', label: 'Despesas', key: 'despesas', module: 'expenses' },
  { to: '/definicoes', icon: 'settings', label: 'Definicoes', key: 'definicoes' },
]

const allMobileItems = [
  { to: '/', icon: 'dashboard', label: 'Painel', key: 'dashboard' },
  { to: '/atividades', icon: 'history', label: 'Horas', key: 'atividades', module: 'activities' },
  { to: '/gasoleo', icon: 'ev_station', label: 'Gasoleo', key: 'gasoleo', module: 'fuel' },
  { to: '/alimentacao', icon: 'pets', label: 'Alimentar', key: 'alimentacao', module: 'feed' },
  { to: '/stock', icon: 'inventory_2', label: 'Stock', key: 'stock', module: 'stock' },
  { to: '/despesas', icon: 'receipt_long', label: 'Despesas', key: 'despesas', module: 'expenses' },
  { to: '/definicoes', icon: 'settings', label: 'Config', key: 'definicoes' },
]

export default function Layout() {
  const { isAdmin, profile, signOut } = useAuth()
  const { currentTenant, availableTenants, modules, isPlatformAdmin, can, permissions } = useTenant()
  const [profileOpen, setProfileOpen] = useState(false)
  const [tenantMenuOpen, setTenantMenuOpen] = useState(false)

  const canSee = (item: { key: string; module?: string }) => {
    // Tenant settings page: needs explicit permission
    if (item.key === 'definicoes') return can('tenant', 'settings') || isAdmin
    // Module disabled at tenant level → hide
    if (item.module && Object.keys(modules).length > 0 && modules[item.module] === false) return false
    // Use permissions when loaded; fall back to legacy admin check otherwise
    if (item.module && permissions.size > 0) return can(item.module, 'view')
    return isAdmin || !['despesas', 'definicoes'].includes(item.key)
  }
  const sideItems = allSideItems.filter(canSee)
  const mobileItems = allMobileItems.filter(canSee)

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const avatarUrl = profile?.avatar_url

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <UserProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      {/* Top Nav */}
      <header className="top-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <NavLink to="/" style={{ fontSize: '1.25rem', fontWeight: 800, color: '#365314', letterSpacing: '-0.03em', textDecoration: 'none', fontFamily: "'Manrope', sans-serif" }}>
            AgroPro
          </NavLink>
          {currentTenant && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => availableTenants.length > 1 && setTenantMenuOpen(o => !o)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', borderRadius: 8, background: '#ecfccb', border: 'none', cursor: availableTenants.length > 1 ? 'pointer' : 'default', fontSize: '0.8125rem', fontWeight: 700, color: '#365314' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>agriculture</span>
                {currentTenant.name}
                {availableTenants.length > 1 && <span className="material-symbols-outlined" style={{ fontSize: 14 }}>expand_more</span>}
              </button>
              {tenantMenuOpen && (
                <>
                  <div onClick={() => setTenantMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 10 }} />
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 11, background: 'white', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,0.12)', border: '1px solid #f0eeec', padding: '0.5rem', minWidth: 240 }}>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8a29e', padding: '0.5rem 0.75rem' }}>Trocar de herdade</p>
                    {availableTenants.map(t => (
                      <NavLink key={t.id} to="/select-tenant" onClick={() => setTenantMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.75rem', borderRadius: 8, textDecoration: 'none', color: 'var(--on-surface)', background: t.id === currentTenant.id ? '#ecfccb' : 'transparent', fontWeight: 600, fontSize: '0.8125rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#365314' }}>agriculture</span>
                        {t.name}
                      </NavLink>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isPlatformAdmin && (
            <NavLink to="/admin" title="Voltar ao Super-Admin" style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', borderRadius: 8, background: '#1c1917', color: 'white', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>shield_person</span>Super-Admin
            </NavLink>
          )}
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
            <h2 style={{ fontSize: '1.125rem', fontWeight: 900, color: '#365314' }}>{currentTenant?.name || 'AgroPro'}</h2>
            <p style={{ fontSize: '0.75rem', color: '#78716c', fontFamily: "'Manrope', sans-serif" }}>Powered by AgroPro</p>
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
