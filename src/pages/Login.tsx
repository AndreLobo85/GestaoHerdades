import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, signUp, session, loading, isPending } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf9' }}>
        <div style={{ width: 48, height: 48, border: '3px solid #e1e3e2', borderTopColor: '#793c00', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (session && !isPending) {
    return <Navigate to="/" replace />
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setSubmitting(true)
    const { error: authError } = await signIn(email, password)
    if (authError) {
      setError('Credenciais invalidas. Verifique o email e a password.')
    }
    setSubmitting(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setSubmitting(true)

    if (password.length < 6) {
      setError('A password deve ter pelo menos 6 caracteres.')
      setSubmitting(false); return
    }
    if (password !== confirmPassword) {
      setError('As passwords nao coincidem.')
      setSubmitting(false); return
    }
    if (!fullName.trim()) {
      setError('Introduza o seu nome completo.')
      setSubmitting(false); return
    }

    const { error: signUpError } = await signUp(email, password, fullName.trim())
    if (signUpError) {
      setError(signUpError)
    } else {
      setSuccess('Registo efetuado com sucesso! Aguarde a aprovacao do administrador para aceder ao sistema.')
      setMode('login')
      setEmail(''); setPassword(''); setConfirmPassword(''); setFullName('')
    }
    setSubmitting(false)
  }

  // Show pending message if logged in but not approved
  if (session && isPending) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--primary)' }}>hourglass_top</span>
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", marginBottom: '0.75rem' }}>Registo Pendente</h2>
          <p style={{ color: '#78716c', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            O seu registo foi recebido e esta a aguardar aprovacao pelo administrador. Sera notificado quando a sua conta for ativada.
          </p>
          <button className="btn-ghost" onClick={async () => {
            await (await import('../lib/supabase')).supabase.auth.signOut()
            window.location.href = '/login'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>logout</span>
            Voltar ao Login
          </button>
          <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#a8a29e' }}>Gestao Herdades v1.0 — AgroPrecision</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8faf9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#365314', letterSpacing: '-0.03em', fontFamily: "'Manrope', sans-serif" }}>
            AgroPrecision
          </h1>
          <p style={{ color: '#78716c', fontSize: '0.875rem', marginTop: '0.25rem', fontFamily: "'Manrope', sans-serif" }}>
            The Digital Agronomist
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: "'Manrope', sans-serif" }}>
            {mode === 'login' ? 'Iniciar Sessao' : 'Criar Conta'}
          </h2>
          <p style={{ color: '#78716c', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {mode === 'login'
              ? 'Introduza as suas credenciais para aceder.'
              : 'Preencha os dados para solicitar acesso ao sistema.'}
          </p>

          {/* Messages */}
          {error && (
            <div style={{ background: '#ffdad6', color: '#93000a', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>{error}
            </div>
          )}
          {success && (
            <div style={{ background: 'var(--secondary-container)', color: 'var(--secondary-on)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>{success}
            </div>
          )}

          {/* Login form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com" className="input-field" autoComplete="email" />
              </div>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="A sua password" className="input-field" autoComplete="current-password" />
              </div>
              <button type="submit" className="btn-primary" disabled={submitting}
                style={{ width: '100%', fontSize: '1rem', marginTop: '0.25rem', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'A entrar...' : (<><span className="material-symbols-outlined" style={{ fontSize: 20 }}>login</span>Entrar</>)}
              </button>
            </form>
          )}

          {/* Register form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Nome Completo</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Primeiro e ultimo nome" className="input-field" autoComplete="name" />
              </div>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@exemplo.com" className="input-field" autoComplete="email" />
              </div>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Password</label>
                <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Minimo 6 caracteres" className="input-field" autoComplete="new-password" />
              </div>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Confirmar Password</label>
                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a password" className="input-field" autoComplete="new-password" />
              </div>
              <button type="submit" className="btn-primary" disabled={submitting}
                style={{ width: '100%', fontSize: '1rem', marginTop: '0.25rem', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'A registar...' : (<><span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>Solicitar Acesso</>)}
              </button>
            </form>
          )}

          {/* Toggle mode */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--surface-mid)' }}>
            {mode === 'login' ? (
              <p style={{ fontSize: '0.875rem', color: '#78716c' }}>
                Nao tem conta?{' '}
                <button onClick={() => { setMode('register'); setError(''); setSuccess('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                  Registar-se
                </button>
              </p>
            ) : (
              <p style={{ fontSize: '0.875rem', color: '#78716c' }}>
                Ja tem conta?{' '}
                <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}>
                  Iniciar Sessao
                </button>
              </p>
            )}
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: '#a8a29e' }}>
          Gestao Herdades v1.0 — AgroPrecision
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
