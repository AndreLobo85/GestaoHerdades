import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, session, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf9' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #e1e3e2', borderTopColor: '#793c00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error: authError } = await signIn(email, password)
    if (authError) {
      setError('Credenciais invalidas. Verifique o email e a password.')
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#365314', letterSpacing: '-0.03em', fontFamily: "'Manrope', sans-serif" }}>
            AgroPrecision
          </h1>
          <p style={{ color: '#78716c', fontSize: '0.875rem', marginTop: '0.25rem', fontFamily: "'Manrope', sans-serif" }}>
            The Digital Agronomist
          </p>
        </div>

        {/* Login card */}
        <div className="card" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: "'Manrope', sans-serif" }}>
            Iniciar Sessao
          </h2>
          <p style={{ color: '#78716c', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Introduza as suas credenciais para aceder ao sistema.
          </p>

          {error && (
            <div style={{ background: '#ffdad6', color: '#93000a', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="input-field"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="A sua password"
                className="input-field"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ width: '100%', fontSize: '1rem', marginTop: '0.5rem', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? (
                <>
                  <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  A entrar...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: '#a8a29e' }}>
          Gestao Herdades v1.0 — AgroPrecision
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
