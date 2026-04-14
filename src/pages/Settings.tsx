import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useActivityTypes, useVehicles, useProducts } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { Vehicle, Profile, UserRole, RoleView } from '../types/database'

type Tab = 'users' | 'roles' | 'activities' | 'vehicles' | 'products'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [modalOpen, setModalOpen] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [_usersLoading, setUsersLoading] = useState(true)
  const activityTypes = useActivityTypes()
  const vehicles = useVehicles()
  const productsStore = useProducts()

  const [roleViews, setRoleViews] = useState<RoleView[]>([])

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers((data as Profile[]) ?? [])
    setUsersLoading(false)
  }, [])

  const fetchRoleViews = useCallback(async () => {
    const { data } = await supabase.from('role_views').select('*').order('view_key', { ascending: true })
    setRoleViews((data as RoleView[]) ?? [])
  }, [])

  useEffect(() => { fetchUsers(); fetchRoleViews() }, [fetchUsers, fetchRoleViews])

  const pendingCount = users.filter(u => u.status === 'pending').length

  const handleToggleView = async (id: string, enabled: boolean) => {
    await supabase.from('role_views').update({ enabled } as never).eq('id', id)
    fetchRoleViews()
  }

  const tabs = [
    { id: 'users' as Tab, label: 'Utilizadores', icon: 'group', count: users.length, badge: pendingCount },
    { id: 'roles' as Tab, label: 'Roles', icon: 'admin_panel_settings', count: 2, badge: 0 },
    { id: 'activities' as Tab, label: 'Atividades', icon: 'label', count: activityTypes.data.length, badge: 0 },
    { id: 'vehicles' as Tab, label: 'Veiculos', icon: 'agriculture', count: vehicles.data.length, badge: 0 },
    { id: 'products' as Tab, label: 'Produtos', icon: 'inventory_2', count: productsStore.data.length, badge: 0 },
  ]

  const handleApproveUser = async (userId: string, role: UserRole) => {
    await supabase.from('profiles').update({ status: 'active', role } as never).eq('id', userId)
    fetchUsers()
  }

  const handleRejectUser = async (userId: string) => {
    await supabase.from('profiles').update({ status: 'inactive' } as never).eq('id', userId)
    fetchUsers()
  }

  const handleChangeRole = async (userId: string, role: UserRole) => {
    await supabase.from('profiles').update({ role } as never).eq('id', userId)
    fetchUsers()
  }

  const handleDeactivateUser = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await supabase.from('profiles').update({ status: newStatus } as never).eq('id', userId)
    fetchUsers()
  }

  const _currentData = tab === 'users' ? users : tab === 'activities' ? activityTypes.data : tab === 'vehicles' ? vehicles.data : productsStore.data
  void _currentData

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <p className="text-primary" style={{ fontWeight: 600, letterSpacing: '0.1em', fontSize: '0.6875rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Administracao</p>
        <h1 className="text-headline" style={{ color: 'var(--on-surface)' }}>Definicoes</h1>
        <p className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Gerir utilizadores, atividades, veiculos e itens de alimentacao.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto' }} className="no-scrollbar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? 'btn-primary' : 'btn-white'}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.75rem 1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
            <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: 9999, background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'var(--surface-high)' }}>{t.count}</span>
            {t.badge > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: '50%', background: 'var(--error)', color: 'white', fontSize: '0.625rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Add button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" onClick={() => setModalOpen(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Adicionar
        </button>
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div>
          {/* Pending users */}
          {users.filter(u => u.status === 'pending').length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>pending</span>
                Pendentes de Aprovacao
              </h3>
              <div className="card" style={{ overflow: 'hidden' }}>
                {users.filter(u => u.status === 'pending').map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', background: '#ffdcc5/10' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="icon-circle" style={{ background: 'var(--primary-light)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>person_add</span>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600 }}>{u.full_name || 'Sem nome'}</p>
                        <p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{u.email || 'Sem email'}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button onClick={() => handleApproveUser(u.id, 'utilizador')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check_circle</span>Aprovar como Utilizador
                      </button>
                      <button onClick={() => handleApproveUser(u.id, 'admin')}
                        style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, border: 'none', borderRadius: 9999, padding: '0.375rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>shield_person</span>Aprovar como Admin
                      </button>
                      <button onClick={() => handleRejectUser(u.id)}
                        style={{ background: '#ffdad6', color: 'var(--error)', fontWeight: 700, border: 'none', borderRadius: 9999, padding: '0.375rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>Rejeitar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active users */}
          <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary)' }}>group</span>
            Utilizadores Ativos
          </h3>
          <div className="card" style={{ overflow: 'hidden' }}>
            {users.filter(u => u.status === 'active').map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="icon-circle" style={{ background: u.role === 'admin' ? 'var(--primary)' : 'var(--secondary-container)', color: u.role === 'admin' ? 'white' : 'var(--secondary-on)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{u.role === 'admin' ? 'shield_person' : 'person'}</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600 }}>{u.full_name || 'Sem nome'}</p>
                    <p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{u.email || 'Sem email'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select value={u.role} onChange={e => handleChangeRole(u.id, e.target.value as UserRole)}
                    style={{ background: u.role === 'admin' ? 'var(--primary-light)' : 'var(--secondary-container)', color: u.role === 'admin' ? 'var(--primary)' : 'var(--secondary-on)', fontWeight: 700, border: 'none', borderRadius: 9999, padding: '0.375rem 0.75rem', fontSize: '0.6875rem', cursor: 'pointer', textTransform: 'uppercase', appearance: 'auto' }}>
                    <option value="admin">Admin</option>
                    <option value="utilizador">Utilizador</option>
                  </select>
                  <button onClick={() => handleDeactivateUser(u.id, u.status)} className="badge-muted" style={{ cursor: 'pointer', border: 'none', fontSize: '0.625rem' }}>
                    Desativar
                  </button>
                </div>
              </div>
            ))}
            {users.filter(u => u.status === 'active').length === 0 && (
              <p style={{ padding: '2rem', textAlign: 'center', color: '#a8a29e', fontSize: '0.875rem' }}>Nenhum utilizador ativo</p>
            )}
          </div>

          {/* Inactive users */}
          {users.filter(u => u.status === 'inactive').length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.75rem', color: '#a8a29e' }}>Inativos</h3>
              <div className="card" style={{ overflow: 'hidden', opacity: 0.6 }}>
                {users.filter(u => u.status === 'inactive').map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className="icon-circle" style={{ background: 'var(--surface-high)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#a8a29e' }}>person_off</span>
                      </div>
                      <div>
                        <p style={{ fontWeight: 600 }}>{u.full_name}</p>
                        <p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{u.email}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeactivateUser(u.id, u.status)} className="btn-ghost" style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
                      Reativar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Roles tab */}
      {tab === 'roles' && (
        <div>
          {(['admin', 'utilizador'] as const).map(role => {
            const views = roleViews.filter(v => v.role === role)
            return (
              <div key={role} style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: role === 'admin' ? 'var(--primary)' : 'var(--secondary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{role === 'admin' ? 'shield_person' : 'person'}</span>
                  </div>
                  <div>
                    <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1rem', textTransform: 'capitalize' }}>{role}</h3>
                    <p style={{ fontSize: '0.6875rem', color: '#a8a29e' }}>{views.filter(v => v.enabled).length} de {views.length} views ativas</p>
                  </div>
                </div>
                <div className="card" style={{ overflow: 'hidden' }}>
                  {views.length > 0 ? views.map(v => (
                    <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="icon-circle" style={{ background: v.enabled ? 'var(--secondary-container)' : 'var(--surface-high)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: v.enabled ? 'var(--secondary-on)' : '#a8a29e' }}>{v.view_icon}</span>
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{v.view_label}</p>
                          <p style={{ fontSize: '0.6875rem', color: '#a8a29e' }}>/{v.view_key}</p>
                        </div>
                      </div>
                      <button onClick={() => handleToggleView(v.id, !v.enabled)}
                        style={{
                          width: 48, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                          background: v.enabled ? 'var(--secondary)' : '#d6d3d1',
                          position: 'relative', transition: 'background 0.2s',
                        }}>
                        <div style={{
                          width: 22, height: 22, borderRadius: '50%', background: 'white',
                          position: 'absolute', top: 3,
                          left: v.enabled ? 23 : 3,
                          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        }} />
                      </button>
                    </div>
                  )) : (
                    <p style={{ padding: '2rem', textAlign: 'center', color: '#a8a29e', fontSize: '0.875rem' }}>
                      Sem permissoes configuradas. Corra a migration SQL.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Activities tab */}
      {tab === 'activities' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {activityTypes.data.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="icon-circle" style={{ background: 'var(--primary-light)' }}><span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>label</span></div>
                <p style={{ fontWeight: 600 }}>{item.name}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={() => activityTypes.update(item.id, { active: !item.active })} className={item.active ? 'badge-green' : 'badge-muted'} style={{ cursor: 'pointer', border: 'none' }}>{item.active ? 'Ativo' : 'Inativo'}</button>
                <button onClick={() => activityTypes.remove(item.id)} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span></button>
              </div>
            </div>
          ))}
          {activityTypes.data.length === 0 && <EmptyMsg icon="label" />}
        </div>
      )}

      {/* Vehicles tab */}
      {tab === 'vehicles' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {vehicles.data.map(v => (
            <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="icon-circle" style={{ background: v.vehicle_type === 'machine' ? 'var(--primary)' : 'var(--secondary)', color: 'white' }}><span className="material-symbols-outlined" style={{ fontSize: 18 }}>{v.vehicle_type === 'machine' ? 'agriculture' : 'directions_car'}</span></div>
                <div><p style={{ fontWeight: 600 }}>{v.brand} {v.model}</p><p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{v.plate} | {v.current_km} km</p></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className={v.vehicle_type === 'machine' ? 'badge-brown' : 'badge-blue'}>{v.vehicle_type === 'machine' ? 'Maquina' : 'Veiculo'}</span>
                <button onClick={() => vehicles.update(v.id, { active: !v.active })} className={v.active ? 'badge-green' : 'badge-muted'} style={{ cursor: 'pointer', border: 'none' }}>{v.active ? 'Ativo' : 'Inativo'}</button>
                <button onClick={() => vehicles.remove(v.id)} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span></button>
              </div>
            </div>
          ))}
          {vehicles.data.length === 0 && <EmptyMsg icon="agriculture" />}
        </div>
      )}

      {/* Products tab */}
      {tab === 'products' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {productsStore.data.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="icon-circle" style={{ background: '#ecfccb' }}><span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3a6843' }}>inventory_2</span></div>
                <div>
                  <p style={{ fontWeight: 600 }}>{item.name}</p>
                  <p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>Unidade: {item.unit} · Stock min: {item.min_stock_alert > 0 ? `${item.min_stock_alert} ${item.unit}` : 'Sem alerta'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: item.active && item.min_stock_alert > 0 && item.current_quantity <= item.min_stock_alert ? '#dc2626' : 'var(--on-surface)' }}>{item.current_quantity} {item.unit}</span>
                <button onClick={() => productsStore.update(item.id, { active: !item.active } as any)} className={item.active ? 'badge-green' : 'badge-muted'} style={{ cursor: 'pointer', border: 'none' }}>{item.active ? 'Ativo' : 'Inativo'}</button>
                <button onClick={() => productsStore.remove(item.id)} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span></button>
              </div>
            </div>
          ))}
          {productsStore.data.length === 0 && <EmptyMsg icon="inventory_2" />}
        </div>
      )}

      {/* Modals */}
      {tab === 'users' && <AddUserModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); fetchUsers() }} />}
      {tab === 'activities' && <AddSimpleModal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Atividade" label="Nome" placeholder="Ex: Poda, Rega..." onSave={async n => { await activityTypes.insert({ name: n, active: true }); setModalOpen(false) }} />}
      {tab === 'vehicles' && <AddVehicleModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={async v => { await vehicles.insert(v); setModalOpen(false) }} />}
      {tab === 'products' && <AddProductModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={async (name, unit, minAlert) => { await productsStore.insert({ name, unit, min_stock_alert: minAlert, current_quantity: 0, active: true, is_feed: false } as any); setModalOpen(false) }} />}
    </div>
  )
}

function EmptyMsg({ icon }: { icon: string }) {
  return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, background: 'var(--surface-mid)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--on-surface-variant)' }}>{icon}</span>
      </div>
      <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Nenhum item registado</p>
      <p className="text-muted" style={{ fontSize: '0.875rem' }}>Clique em "Adicionar" para comecar.</p>
    </div>
  )
}

// --- Add User Modal (admin creates user — auto-active) ---
function AddUserModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('utilizador')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)

    // Use REST API directly to avoid logging out the admin
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, data: { full_name: fullName } })
      })
      const result = await res.json()

      if (!res.ok || result.error) {
        setError(result.error?.message || result.msg || 'Erro ao criar utilizador')
        setSaving(false); return
      }

      const userId = result.id
      if (userId) {
        // Wait for the DB trigger to create the profile
        await new Promise(r => setTimeout(r, 1500))
        // Update profile to active with correct role (admin-created = no approval needed)
        await supabase.from('profiles').update({ status: 'active', role, full_name: fullName, email } as never).eq('id', userId)
      }
    } catch (err) {
      setError('Erro de rede ao criar utilizador')
      setSaving(false); return
    }

    setFullName(''); setEmail(''); setPassword(''); setRole('utilizador')
    setSaving(false); onSaved()
  }

  const initials = fullName ? fullName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) : ''

  return (
    <Modal open={open} onClose={onClose} title="Novo Utilizador" wide>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: '#ffdad6', color: '#93000a', padding: '0.875rem 1.25rem', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>{error}
          </div>
        )}

        {/* Live preview card */}
        <div style={{
          background: 'linear-gradient(135deg, #f2f4f3 0%, #e6e9e8 100%)',
          borderRadius: '1.25rem', padding: '1.5rem', marginBottom: '1.75rem',
          display: 'flex', alignItems: 'center', gap: '1.25rem',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: fullName ? (role === 'admin' ? 'var(--primary)' : 'var(--secondary)') : '#a8a29e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: initials ? '1.125rem' : '1.5rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif",
            transition: 'background 0.3s',
          }}>
            {initials || <span className="material-symbols-outlined" style={{ fontSize: 28 }}>person_add</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: '1.0625rem', fontFamily: "'Manrope', sans-serif", color: '#191c1c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {fullName || 'Novo Utilizador'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: '#78716c', marginTop: '0.125rem' }}>
              {email || 'email@exemplo.com'}
            </p>
            <span style={{
              display: 'inline-block', marginTop: '0.5rem', fontSize: '0.625rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.25rem 0.625rem',
              borderRadius: '9999px',
              background: role === 'admin' ? '#ffdcc5' : '#b9ecbd',
              color: role === 'admin' ? '#793c00' : '#3e6d47',
            }}>
              {role}
            </span>
          </div>
        </div>

        {/* Form fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Nome Completo</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Primeiro e ultimo nome" className="input-field" style={{ fontSize: '0.9375rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="email@exemplo.com" className="input-field" style={{ fontSize: '0.9375rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Password</label>
            <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 caracteres" className="input-field" style={{ fontSize: '0.9375rem' }} />
          </div>
        </div>

        {/* Role selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Tipo de Acesso</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {([
              { value: 'utilizador' as UserRole, icon: 'person', label: 'Utilizador', desc: 'Registo de dados', color: 'var(--secondary)', shadow: 'rgba(58,104,67,0.15)' },
              { value: 'admin' as UserRole, icon: 'shield_person', label: 'Administrador', desc: 'Acesso total', color: 'var(--primary)', shadow: 'rgba(121,60,0,0.15)' },
            ]).map(opt => {
              const active = role === opt.value
              return (
                <button key={opt.value} type="button" onClick={() => setRole(opt.value)}
                  style={{
                    padding: '1.25rem 1rem', borderRadius: '1rem', cursor: 'pointer', transition: 'all 0.2s ease',
                    background: active ? opt.color : '#f2f4f3',
                    color: active ? 'white' : '#44483c',
                    border: active ? 'none' : '2px solid transparent',
                    boxShadow: active ? `0 6px 20px ${opt.shadow}` : 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
                    transform: active ? 'scale(1.02)' : 'scale(1)',
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 32, opacity: active ? 1 : 0.6 }}>{opt.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: '0.875rem', fontFamily: "'Manrope', sans-serif" }}>{opt.label}</span>
                  <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>{opt.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Info note */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.875rem 1rem', background: '#f2f4f3', borderRadius: '0.875rem', marginBottom: '1.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary)', flexShrink: 0 }}>verified</span>
          <p style={{ fontSize: '0.8125rem', color: '#78716c', lineHeight: 1.5 }}>
            Conta ativada automaticamente, sem aprovacao.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button type="button" onClick={onClose}
            style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.875rem', border: 'none', background: '#f2f4f3', color: '#44483c', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e6e9e8')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f2f4f3')}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            style={{
              padding: '0.875rem 1.75rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-container))',
              color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(121,60,0,0.2)',
              opacity: saving ? 0.7 : 1, transition: 'all 0.2s',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{saving ? 'hourglass_top' : 'person_add'}</span>
            {saving ? 'A criar...' : 'Criar Utilizador'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// --- Other modals (same as before) ---
function AddSimpleModal({ open, onClose, title, label, placeholder, onSave }: { open: boolean; onClose: () => void; title: string; label: string; placeholder: string; onSave: (n: string) => void }) {
  const [n, setN] = useState('')
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <form onSubmit={e => { e.preventDefault(); onSave(n); setN('') }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>{label}</label>
          <input required value={n} onChange={e => setN(e.target.value)} placeholder={placeholder} className="input-field" /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

function AddVehicleModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (v: Omit<Vehicle, 'id' | 'created_at'>) => void }) {
  const [f, setF] = useState({ brand: '', model: '', plate: '', vehicle_type: 'vehicle' as 'machine' | 'vehicle', current_km: '' })
  return (
    <Modal open={open} onClose={onClose} title="Novo Veiculo / Maquina">
      <form onSubmit={e => { e.preventDefault(); onSave({ brand: f.brand, model: f.model, plate: f.plate, vehicle_type: f.vehicle_type, current_km: parseFloat(f.current_km) || 0, active: true }); setF({ brand: '', model: '', plate: '', vehicle_type: 'vehicle', current_km: '' }) }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Marca</label>
            <input required value={f.brand} onChange={e => setF({ ...f, brand: e.target.value })} placeholder="Ex: John Deere" className="input-field" /></div>
          <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Modelo</label>
            <input value={f.model} onChange={e => setF({ ...f, model: e.target.value })} placeholder="Ex: 6120M" className="input-field" /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Matricula</label>
            <input required value={f.plate} onChange={e => setF({ ...f, plate: e.target.value })} placeholder="XX-XX-XX" className="input-field" /></div>
          <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Tipo</label>
            <select value={f.vehicle_type} onChange={e => setF({ ...f, vehicle_type: e.target.value as 'machine' | 'vehicle' })} className="input-field">
              <option value="vehicle">Veiculo</option><option value="machine">Maquina</option>
            </select></div>
        </div>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Km Atuais</label>
          <input type="number" min="0" value={f.current_km} onChange={e => setF({ ...f, current_km: e.target.value })} placeholder="0" className="input-field" /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

function AddProductModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (name: string, unit: string, minAlert: number) => void }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('unidades')
  const [minAlert, setMinAlert] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Novo Produto">
      <form onSubmit={e => { e.preventDefault(); onSave(name, unit, parseFloat(minAlert) || 0); setName(''); setUnit('unidades'); setMinAlert('') }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Nome</label>
          <input required value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Racao Vacada, Herbicida..." className="input-field" /></div>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Unidade</label>
          <select value={unit} onChange={e => setUnit(e.target.value)} className="input-field">
            <option value="unidades">Unidades</option><option value="kg">Kg</option><option value="litros">Litros</option>
            <option value="sacos">Sacos</option><option value="fardos">Fardos</option><option value="caixas">Caixas</option>
            <option value="metros">Metros</option><option value="toneladas">Toneladas</option>
          </select></div>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Stock Minimo (alerta)</label>
          <input type="number" min="0" step="0.1" value={minAlert} onChange={e => setMinAlert(e.target.value)} placeholder="0 (sem alerta)" className="input-field" />
          <p style={{ fontSize: '0.625rem', color: '#a8a29e', marginTop: 4, marginLeft: 4 }}>Alerta quando stock ficar abaixo deste valor.</p></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
