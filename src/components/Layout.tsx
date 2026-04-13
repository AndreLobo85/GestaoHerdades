import { NavLink, Outlet } from 'react-router-dom'

const sideItems = [
  { to: '/atividades', icon: 'timer', label: 'Horas/Atividades' },
  { to: '/gasoleo', icon: 'local_gas_station', label: 'Consumo Gasoleo' },
  { to: '/alimentacao', icon: 'agriculture', label: 'Alimentacao Animal' },
]

const topItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/atividades', label: 'Horas/Atividades' },
  { to: '/gasoleo', label: 'Consumo Gasoleo' },
  { to: '/alimentacao', label: 'Alimentacao Animal' },
]

const mobileItems = [
  { to: '/', icon: 'dashboard', label: 'Painel' },
  { to: '/atividades', icon: 'history', label: 'Horas' },
  { to: '/gasoleo', icon: 'ev_station', label: 'Gasoleo' },
  { to: '/alimentacao', icon: 'pets', label: 'Alimentar' },
  { to: '/definicoes', icon: 'person', label: 'Perfil' },
]

export default function Layout() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink to="/definicoes" style={{ padding: '0.5rem', color: '#78716c', borderRadius: '9999px', display: 'flex' }}>
            <span className="material-symbols-outlined">settings</span>
          </NavLink>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-highest)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>person</span>
          </div>
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
          <button className="btn-primary" onClick={() => window.location.href = '/atividades'}
            style={{ marginBottom: '5rem', width: '100%' }}>
            <span className="material-symbols-outlined">add</span>
            Novo Registo
          </button>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '5rem', background: 'var(--bg)' }}
          className="md:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav hide-desktop">
        {mobileItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex', flexDirection: 'column', alignItems: 'center', padding: isActive ? '0.75rem' : '0.5rem',
              background: isActive ? '#3f6212' : 'transparent', color: isActive ? 'white' : '#a8a29e',
              borderRadius: isActive ? '1rem' : '0', transform: isActive ? 'translateY(-0.5rem) scale(1.1)' : 'none',
              textDecoration: 'none', transition: 'all 0.3s',
            })}>
            <span className="material-symbols-outlined">{item.icon}</span>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
