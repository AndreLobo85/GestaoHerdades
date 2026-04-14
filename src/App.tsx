import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { TenantProvider } from './contexts/TenantContext'
import ProtectedRoute from './components/ProtectedRoute'
import TenantGate from './components/TenantGate'
import Layout from './components/Layout'
import Login from './pages/Login'
import SelectTenant from './pages/SelectTenant'
import Dashboard from './pages/Dashboard'
import Activities from './pages/Activities'
import Fuel from './pages/Fuel'
import Feed from './pages/Feed'
import SettingsPage from './pages/Settings'
import Expenses from './pages/Expenses'
import Stock from './pages/Stock'
import SuperAdmin, { SuperAdminGuard } from './pages/SuperAdmin'

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/select-tenant" element={<SelectTenant />} />
            <Route path="/admin/*" element={<SuperAdminGuard><SuperAdmin /></SuperAdminGuard>} />
            <Route element={<TenantGate />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="atividades" element={<Activities />} />
                <Route path="gasoleo" element={<Fuel />} />
                <Route path="alimentacao" element={<Feed />} />
                <Route element={<ProtectedRoute requiredRole="admin" />}>
                  <Route path="stock" element={<Stock />} />
                  <Route path="despesas" element={<Expenses />} />
                  <Route path="definicoes" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>
        </Routes>
      </TenantProvider>
    </AuthProvider>
  )
}
