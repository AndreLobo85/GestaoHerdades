import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useActivityTypes, useVehicles, useFeedItems } from '../lib/store'
import { supabase } from '../lib/supabase'
import type { Vehicle, Profile, UserRole } from '../types/database'

type Tab = 'users' | 'activities' | 'vehicles' | 'feed'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('users')
  const [modalOpen, setModalOpen] = useState(false)
  const [users, setUsers] = useState<Profile[]>([])
  const [_usersLoading, setUsersLoading] = useState(true)
  const activityTypes = useActivityTypes()
  const vehicles = useVehicles()
  const feedItems = useFeedItems()

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers((data as Profile[]) ?? [])
    setUsersLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const pendingCount = users.filter(u => u.status === 'pending').length

  const tabs = [
    { id: 'users' as Tab, label: 'Utilizadores', icon: 'group', count: users.length, badge: pendingCount },
    { id: 'activities' as Tab, label: 'Atividades', icon: 'label', count: activityTypes.data.length, badge: 0 },
    { id: 'vehicles' as Tab, label: 'Veiculos', icon: 'agriculture', count: vehicles.data.length, badge: 0 },
    { id: 'feed' as Tab, label: 'Alimentacao', icon: 'grass', count: feedItems.data.length, badge: 0 },
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

  const _currentData = tab === 'users' ? users : tab === 'activities' ? activityTypes.data : tab === 'vehicles' ? vehicles.data : feedItems.data
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
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>Utilizador
                      </button>
                      <button onClick={() => handleApproveUser(u.id, 'admin')}
                        style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700, border: 'none', borderRadius: 9999, padding: '0.375rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>shield_person</span>Admin
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

      {/* Feed tab */}
      {tab === 'feed' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {feedItems.data.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="icon-circle" style={{ background: 'var(--secondary-container)' }}><span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary-on)' }}>grass</span></div>
                <div><p style={{ fontWeight: 600 }}>{item.name}</p><p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>Unidade: {item.unit}</p></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button onClick={() => feedItems.update(item.id, { active: !item.active })} className={item.active ? 'badge-green' : 'badge-muted'} style={{ cursor: 'pointer', border: 'none' }}>{item.active ? 'Ativo' : 'Inativo'}</button>
                <button onClick={() => feedItems.remove(item.id)} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span></button>
              </div>
            </div>
          ))}
          {feedItems.data.length === 0 && <EmptyMsg icon="grass" />}
        </div>
      )}

      {/* Modals */}
      {tab === 'users' && <AddUserModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); fetchUsers() }} />}
      {tab === 'activities' && <AddSimpleModal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Atividade" label="Nome" placeholder="Ex: Poda, Rega..." onSave={async n => { await activityTypes.insert({ name: n, active: true }); setModalOpen(false) }} />}
      {tab === 'vehicles' && <AddVehicleModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={async v => { await vehicles.insert(v); setModalOpen(false) }} />}
      {tab === 'feed' && <AddFeedItemModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={async (n, u) => { await feedItems.insert({ name: n, unit: u, active: true }); setModalOpen(false) }} />}
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

    // Create auth user via signup
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })

    if (signUpErr) {
      setError(signUpErr.message); setSaving(false); return
    }

    // Update profile to active + chosen role (trigger creates it as pending by default)
    if (data.user) {
      // Wait for trigger
      await new Promise(r => setTimeout(r, 1000))
      await supabase.from('profiles').update({ status: 'active', role, full_name: fullName, email } as never).eq('id', data.user.id)
    }

    setFullName(''); setEmail(''); setPassword(''); setRole('utilizador')
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title="Novo Utilizador">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {error && (
          <div style={{ background: '#ffdad6', color: '#93000a', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>{error}
          </div>
        )}
        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Nome Completo</label>
          <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Primeiro e ultimo nome" className="input-field" />
        </div>
        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Email</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="input-field" />
        </div>
        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Password</label>
          <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimo 6 caracteres" className="input-field" />
        </div>
        <div>
          <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Role</label>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={() => setRole('utilizador')}
              className={`toggle-btn ${role === 'utilizador' ? 'active' : 'inactive'}`} style={{ flex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>Utilizador
            </button>
            <button type="button" onClick={() => setRole('admin')}
              className={`toggle-btn ${role === 'admin' ? 'active' : 'inactive'}`} style={{ flex: 1 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>shield_person</span>Admin
            </button>
          </div>
        </div>
        <p style={{ fontSize: '0.75rem', color: '#78716c', background: 'var(--surface-low)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>info</span>
          Utilizadores criados pelo admin ficam automaticamente ativos, sem necessidade de aprovacao.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving} style={{ padding: '0.75rem 1.25rem', opacity: saving ? 0.7 : 1 }}>
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

function AddFeedItemModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (n: string, u: string) => void }) {
  const [n, setN] = useState(''); const [u, setU] = useState('unidades')
  return (
    <Modal open={open} onClose={onClose} title="Novo Item Alimentacao">
      <form onSubmit={e => { e.preventDefault(); onSave(n, u); setN(''); setU('unidades') }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Nome</label>
          <input required value={n} onChange={e => setN(e.target.value)} placeholder="Ex: Fardos de alfafa" className="input-field" /></div>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Unidade</label>
          <select value={u} onChange={e => setU(e.target.value)} className="input-field">
            <option value="unidades">Unidades</option><option value="kg">Kg</option><option value="sacos">Sacos</option>
            <option value="fardos">Fardos</option><option value="bolas">Bolas</option><option value="litros">Litros</option>
          </select></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>Guardar</button>
        </div>
      </form>
    </Modal>
  )
}
