import { useState, useEffect, useCallback } from 'react'
import { NavLink, useParams, Routes, Route, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useTenant } from '../contexts/TenantContext'
import Modal from '../components/ui/Modal'
import CreateUserModal from '../components/CreateUserModal'

interface TenantRow {
  id: string
  slug: string
  name: string
  status: string
  plan: string
  trial_ends_at: string | null
  users_count: number
  modules_enabled: number
  created_at: string
}

interface PendingUser {
  user_id: string
  email: string
  full_name: string | null
  profile_status: string
  created_at: string
}

const MODULE_KEYS = ['activities','fuel','feed','stock','expenses','vehicles','employees']
const MODULE_LABELS: Record<string, string> = {
  activities: 'Atividades',
  fuel: 'Combustível',
  feed: 'Alimentação',
  stock: 'Stock',
  expenses: 'Despesas',
  vehicles: 'Veículos',
  employees: 'Funcionários',
}

export default function SuperAdmin() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ padding: '1.25rem 2rem', background: '#1c1917', color: 'white', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/admin" style={{ fontSize: '1.125rem', fontWeight: 800, color: 'white', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          AgroPro · Super-Admin
        </Link>
        <nav style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
          <NavLink to="/admin" end style={({ isActive }) => ({ padding: '0.375rem 0.75rem', borderRadius: 8, fontSize: '0.8125rem', textDecoration: 'none', color: isActive ? 'white' : '#a8a29e', fontWeight: 600, background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent' })}>Herdades</NavLink>
          <NavLink to="/admin/pendentes" style={({ isActive }) => ({ padding: '0.375rem 0.75rem', borderRadius: 8, fontSize: '0.8125rem', textDecoration: 'none', color: isActive ? 'white' : '#a8a29e', fontWeight: 600, background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent' })}>Pendentes</NavLink>
        </nav>
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/select-tenant" style={{ color: '#a8a29e', fontSize: '0.8125rem', textDecoration: 'none' }}>← Voltar</Link>
        </div>
      </header>
      <main style={{ padding: '2rem' }}>
        <Routes>
          <Route index element={<TenantsList />} />
          <Route path="herdades/:id" element={<TenantDetail />} />
          <Route path="pendentes" element={<PendingUsers />} />
        </Routes>
      </main>
    </div>
  )
}

/* ── Tenants List ────────────────────────────────── */
function TenantsList() {
  const { switchTenant } = useTenant()
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase.rpc as any)('admin_list_tenants')
    setTenants((data as TenantRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleEnter = async (tenantId: string) => {
    await switchTenant(tenantId)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>Herdades ({tenants.length})</h1>
        <button className="btn-primary" onClick={() => setModalOpen(true)} style={{ padding: '0.625rem 1rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Nova Herdade
        </button>
      </div>

      {loading ? <p>A carregar...</p> : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Nome</th><th>Slug</th><th>Estado</th><th>Plano</th><th style={{ textAlign: 'right' }}>Users</th><th style={{ textAlign: 'right' }}>Módulos</th><th></th></tr></thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td style={{ fontSize: '0.8125rem', color: '#78716c' }}>{t.slug}</td>
                  <td><span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, background: t.status === 'active' ? '#ecfccb' : t.status === 'trial' ? '#fef3c7' : '#fee2e2', color: t.status === 'active' ? '#3a6843' : t.status === 'trial' ? '#92400e' : '#991b1b', fontWeight: 700 }}>{t.status}</span></td>
                  <td style={{ fontSize: '0.8125rem' }}>{t.plan}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{t.users_count}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>{t.modules_enabled}/{MODULE_KEYS.length}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                      <Link to={`/admin/herdades/${t.id}`} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.8125rem', textDecoration: 'none' }}>Gerir →</Link>
                      <button onClick={() => handleEnter(t.id)} style={{ background: '#365314', color: 'white', border: 'none', cursor: 'pointer', padding: '0.25rem 0.75rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 700 }}>Entrar →</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateTenantModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); fetch() }} />
    </div>
  )
}

function CreateTenantModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [plan, setPlan] = useState('starter')
  const [status, setStatus] = useState('trial')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setSaving(true)
    const { error } = await (supabase.rpc as any)('admin_create_tenant', { p_name: name.trim(), p_slug: slug.trim(), p_plan: plan, p_status: status })
    setSaving(false)
    if (error) { setErr(error.message); return }
    setName(''); setSlug(''); setPlan('starter'); setStatus('trial')
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Herdade">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div><label className="text-label">Nome</label><input required value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,32)) }} placeholder="Herdade da Serra" className="input-field" /></div>
        <div><label className="text-label">Slug (a-z, 0-9, hífens)</label><input required value={slug} onChange={e => setSlug(e.target.value)} placeholder="herdade-serra" className="input-field" pattern="^[a-z0-9-]{3,32}$" /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div><label className="text-label">Plano</label><select value={plan} onChange={e => setPlan(e.target.value)} className="input-field"><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></div>
          <div><label className="text-label">Estado</label><select value={status} onChange={e => setStatus(e.target.value)} className="input-field"><option value="trial">Trial</option><option value="active">Ativa</option><option value="suspended">Suspensa</option></select></div>
        </div>
        {err && <p style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'A criar...' : 'Criar'}</button>
        </div>
      </form>
    </Modal>
  )
}

/* ── Tenant Detail ───────────────────────────────── */
interface TenantUser { user_id: string; email: string; full_name: string | null; role: string; status: string; created_at: string }

function TenantDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { switchTenant } = useTenant()
  const [tenant, setTenant] = useState<TenantRow | null>(null)
  const [users, setUsers] = useState<TenantUser[]>([])
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: tenants } = await (supabase.rpc as any)('admin_list_tenants')
    setTenant(((tenants as TenantRow[]) ?? []).find(t => t.id === id) ?? null)
    const { data: us } = await (supabase.rpc as any)('admin_list_tenant_users', { p_tenant_id: id })
    setUsers((us as TenantUser[]) ?? [])
    const { data: mods } = await (supabase.rpc as any)('admin_list_tenant_modules', { p_tenant_id: id })
    const map: Record<string, boolean> = {}
    for (const k of MODULE_KEYS) map[k] = true
    for (const m of (mods ?? []) as { module_key: string; enabled: boolean }[]) map[m.module_key] = m.enabled
    setModules(map)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  const toggleModule = async (key: string, enabled: boolean) => {
    setModules(m => ({ ...m, [key]: enabled }))
    const { error } = await (supabase.rpc as any)('admin_toggle_module', { p_tenant_id: id, p_module_key: key, p_enabled: enabled })
    if (error) { alert('Erro: ' + error.message); fetch() }
  }

  const updateStatus = async (status: string) => {
    const { error } = await (supabase.rpc as any)('admin_update_tenant', { p_tenant_id: id, p_status: status })
    if (error) alert(error.message); else fetch()
  }

  const handleRemove = async (userId: string) => {
    if (!confirm('Remover este utilizador da herdade?')) return
    await (supabase.rpc as any)('admin_remove_user_from_tenant', { p_tenant_id: id, p_user_id: userId })
    fetch()
  }

  if (loading) return <p>A carregar...</p>
  if (!tenant) return <p>Herdade não encontrada. <Link to="/admin">Voltar</Link></p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <button onClick={() => navigate('/admin')} className="btn-ghost">← Voltar</button>
        <button onClick={() => switchTenant(id)} style={{ background: '#365314', color: 'white', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 700 }}>
          Entrar na herdade →
        </button>
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>{tenant.name}</h1>
      <p style={{ color: '#78716c', marginBottom: '1.5rem', fontSize: '0.875rem' }}>{tenant.slug} · {tenant.plan} · Estado: <strong>{tenant.status}</strong></p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Status */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Estado</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['active','trial','suspended','inactive'].map(s => (
              <button key={s} onClick={() => updateStatus(s)} style={{ padding: '0.5rem 0.875rem', borderRadius: 8, border: '1px solid #e7e5e4', background: tenant.status === s ? '#365314' : 'white', color: tenant.status === s ? 'white' : 'var(--on-surface)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Modules */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Módulos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {MODULE_KEYS.map(k => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: 8, cursor: 'pointer', background: modules[k] ? '#ecfccb' : '#fafaf9' }}>
                <input type="checkbox" checked={modules[k] ?? false} onChange={e => toggleModule(k, e.target.checked)} />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{MODULE_LABELS[k]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Users */}
      <div className="card" style={{ padding: '1.25rem', marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontWeight: 700 }}>Utilizadores ({users.length})</h3>
          <button onClick={() => setCreateOpen(true)} className="btn-primary" style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>person_add</span>Novo Utilizador
          </button>
        </div>

        <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); fetch() }} tenantId={id} tenantName={tenant.name} />

        <table className="data-table">
          <thead><tr><th>Nome</th><th>Email</th><th>Role</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.user_id}>
                <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                <td style={{ fontSize: '0.8125rem', color: '#78716c' }}>{u.email}</td>
                <td><span style={{ fontSize: '0.6875rem', padding: '2px 6px', borderRadius: 4, background: u.role === 'admin' ? '#fff7ed' : '#f5f5f4', color: u.role === 'admin' ? '#793c00' : '#78716c', fontWeight: 700 }}>{u.role}</span></td>
                <td><span style={{ fontSize: '0.6875rem', padding: '2px 6px', borderRadius: 4, background: u.status === 'active' ? '#ecfccb' : '#fee2e2', color: u.status === 'active' ? '#3a6843' : '#991b1b', fontWeight: 700 }}>{u.status}</span></td>
                <td><button onClick={() => handleRemove(u.user_id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Remover"><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 18 }}>delete</span></button></td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#a8a29e' }}>Sem utilizadores.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Pending Users ───────────────────────────────── */
function PendingUsers() {
  const [pending, setPending] = useState<PendingUser[]>([])
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const [picks, setPicks] = useState<Record<string, { tenant: string; role: string }>>({})

  const fetch = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: t }] = await Promise.all([
      (supabase.rpc as any)('admin_list_pending_users'),
      (supabase.rpc as any)('admin_list_tenants'),
    ])
    setPending((p as PendingUser[] | null) ?? [])
    setTenants((t as TenantRow[] | null) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const approve = async (userId: string, email: string) => {
    const pick = picks[userId]
    if (!pick?.tenant) { alert('Escolha uma herdade.'); return }
    const { error } = await (supabase.rpc as any)('admin_assign_user', { p_tenant_id: pick.tenant, p_email: email, p_role: pick.role || 'utilizador' })
    if (error) { alert(error.message); return }
    fetch()
  }

  if (loading) return <p>A carregar...</p>

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", marginBottom: '1rem' }}>Utilizadores pendentes ({pending.length})</h1>
      {pending.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#78716c' }}>Sem utilizadores pendentes.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Nome</th><th>Email</th><th>Registado</th><th>Atribuir a</th><th>Role</th><th></th></tr></thead>
            <tbody>
              {pending.map(u => (
                <tr key={u.user_id}>
                  <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: '#78716c' }}>{u.email}</td>
                  <td style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{new Date(u.created_at).toLocaleDateString('pt-PT')}</td>
                  <td>
                    <select value={picks[u.user_id]?.tenant ?? ''} onChange={e => setPicks(p => ({ ...p, [u.user_id]: { ...p[u.user_id], tenant: e.target.value, role: p[u.user_id]?.role ?? 'utilizador' } }))} className="input-field" style={{ fontSize: '0.8125rem' }}>
                      <option value="">-- Escolha --</option>
                      {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={picks[u.user_id]?.role ?? 'utilizador'} onChange={e => setPicks(p => ({ ...p, [u.user_id]: { ...p[u.user_id], tenant: p[u.user_id]?.tenant ?? '', role: e.target.value } }))} className="input-field" style={{ fontSize: '0.8125rem', width: 120 }}>
                      <option value="utilizador">Utilizador</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td><button onClick={() => approve(u.user_id, u.email)} className="btn-primary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}>Aprovar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Guard component ─────────────────────────────── */
export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin, loading } = useTenant()
  if (loading) return <p style={{ padding: 40, textAlign: 'center' }}>A carregar...</p>
  if (!isPlatformAdmin) return <p style={{ padding: 40, textAlign: 'center', color: '#991b1b' }}>Acesso negado.</p>
  return <>{children}</>
}
