import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import type { UserRole } from '../types/database'

interface Props {
  requiredRole?: UserRole
}

export default function ProtectedRoute({ requiredRole }: Props) {
  const { session, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #e1e3e2', borderTopColor: '#793c00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#44483c', fontWeight: 500 }}>A carregar...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole === 'admin' && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
