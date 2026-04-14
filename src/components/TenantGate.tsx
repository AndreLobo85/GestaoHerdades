import { Navigate, Outlet } from 'react-router-dom'
import { useTenant } from '../contexts/TenantContext'

export default function TenantGate() {
  const { loading, currentTenant } = useTenant()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8faf9' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '3px solid #e1e3e2', borderTopColor: '#365314', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: '#44483c', fontWeight: 500 }}>A carregar herdade...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!currentTenant) {
    return <Navigate to="/select-tenant" replace />
  }

  return <Outlet />
}
