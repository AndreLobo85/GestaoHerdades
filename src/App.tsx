import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Activities from './pages/Activities'
import Fuel from './pages/Fuel'
import Feed from './pages/Feed'
import SettingsPage from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="atividades" element={<Activities />} />
        <Route path="gasoleo" element={<Fuel />} />
        <Route path="alimentacao" element={<Feed />} />
        <Route path="definicoes" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
