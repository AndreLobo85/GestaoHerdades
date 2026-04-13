import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Activities from './pages/Activities'
import Fuel from './pages/Fuel'
import Feed from './pages/Feed'
import SettingsPage from './pages/Settings'
import Expenses from './pages/Expenses'
import Stock from './pages/Stock'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
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
      </Routes>
    </AuthProvider>
  )
}
