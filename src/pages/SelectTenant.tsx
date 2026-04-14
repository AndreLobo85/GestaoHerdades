import { useTenant } from '../contexts/TenantContext'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function SelectTenant() {
  const { availableTenants, switchTenant, currentTenant, loading, isPlatformAdmin } = useTenant()
  const { signOut, profile } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#78716c' }}>A carregar...</div>
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '2rem' }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#365314', fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>AgroPro</h1>
          <p style={{ color: '#78716c', fontSize: '0.9375rem' }}>
            Olá {profile?.full_name?.split(' ')[0] || ''} — escolha a herdade para continuar
          </p>
        </div>

        {(availableTenants.length === 0 && !isPlatformAdmin) ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>hourglass_empty</span>
            <p style={{ fontWeight: 600, marginTop: '1rem', fontSize: '1rem' }}>Aguarda aprovação</p>
            <p style={{ color: '#78716c', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              A sua conta ainda não está associada a nenhuma herdade. Um administrador tem de a aprovar.
            </p>
            <button onClick={signOut} className="btn-ghost" style={{ marginTop: '1.5rem' }}>Terminar sessão</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isPlatformAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  background: '#1c1917',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'white' }}>shield_person</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '1rem', color: 'white' }}>Painel Super-Admin</p>
                  <p style={{ fontSize: '0.75rem', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Gerir herdades da plataforma</p>
                </div>
                <span className="material-symbols-outlined" style={{ color: '#a8a29e' }}>arrow_forward</span>
              </button>
            )}
            {availableTenants.map(t => (
              <button
                key={t.id}
                onClick={() => switchTenant(t.id)}
                className="card"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  border: t.id === currentTenant?.id ? '2px solid #365314' : '1px solid #e7e5e4',
                  background: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ecfccb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: '#365314' }}>agriculture</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--on-surface)' }}>{t.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                    {t.role === 'admin' ? 'Administrador' : 'Utilizador'}
                    {t.id === currentTenant?.id && ' · Ativa'}
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ color: '#a8a29e' }}>arrow_forward</span>
              </button>
            ))}
            <button onClick={signOut} className="btn-ghost" style={{ marginTop: '1rem', alignSelf: 'center' }}>Terminar sessão</button>
          </div>
        )}
      </div>
    </div>
  )
}
