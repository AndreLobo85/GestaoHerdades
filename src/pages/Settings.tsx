import { useState } from 'react'
import Modal from '../components/ui/Modal'
import { useEmployees, useActivityTypes, useVehicles, useFeedItems } from '../lib/store'
import type { Vehicle } from '../types/database'

type Tab = 'employees' | 'activities' | 'vehicles' | 'feed'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('employees')
  const [modalOpen, setModalOpen] = useState(false)
  const employees = useEmployees()
  const activityTypes = useActivityTypes()
  const vehicles = useVehicles()
  const feedItems = useFeedItems()

  const tabs = [
    { id: 'employees' as Tab, label: 'Funcionarios', icon: 'group', count: employees.data.length },
    { id: 'activities' as Tab, label: 'Atividades', icon: 'label', count: activityTypes.data.length },
    { id: 'vehicles' as Tab, label: 'Veiculos', icon: 'agriculture', count: vehicles.data.length },
    { id: 'feed' as Tab, label: 'Alimentacao', icon: 'grass', count: feedItems.data.length },
  ]

  const currentData = tab === 'employees' ? employees.data : tab === 'activities' ? activityTypes.data : tab === 'vehicles' ? vehicles.data : feedItems.data

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <p className="text-primary" style={{ fontWeight: 600, letterSpacing: '0.1em', fontSize: '0.6875rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Configuracao</p>
        <h1 className="text-headline" style={{ color: 'var(--on-surface)' }}>Definicoes</h1>
        <p className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Gerir funcionarios, atividades, veiculos e itens de alimentacao.</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', overflowX: 'auto' }} className="no-scrollbar">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? 'btn-primary' : 'btn-white'}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.75rem 1.25rem', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
            <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: 9999, background: tab === t.id ? 'rgba(255,255,255,0.2)' : 'var(--surface-high)' }}>{t.count}</span>
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

      {/* Content list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {tab === 'employees' && employees.data.map(emp => (
          <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s', cursor: 'default' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="icon-circle" style={{ background: 'var(--secondary-container)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary-on)' }}>person</span>
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{emp.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{emp.role}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => employees.update(emp.id, { active: !emp.active })}
                className={emp.active ? 'badge-green' : 'badge-muted'} style={{ cursor: 'pointer', border: 'none' }}>
                {emp.active ? 'Ativo' : 'Inativo'}
              </button>
              <button onClick={() => employees.remove(emp.id)} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span>
              </button>
            </div>
          </div>
        ))}

        {tab === 'activities' && activityTypes.data.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="icon-circle" style={{ background: 'var(--primary-light)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--primary)' }}>label</span>
              </div>
              <p style={{ fontWeight: 600 }}>{item.name}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => activityTypes.update(item.id, { active: !item.active })}
                className={item.active ? 'badge-green' : 'badge-muted'} style={{ cursor: 'pointer', border: 'none' }}>
                {item.active ? 'Ativo' : 'Inativo'}
              </button>
              <button onClick={() => activityTypes.remove(item.id)} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span>
              </button>
            </div>
          </div>
        ))}

        {tab === 'vehicles' && vehicles.data.map(v => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="icon-circle" style={{ background: v.vehicle_type === 'machine' ? 'var(--primary)' : 'var(--secondary)', color: 'white' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{v.vehicle_type === 'machine' ? 'agriculture' : 'directions_car'}</span>
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{v.brand} {v.model}</p>
                <p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{v.plate} | {v.current_km} km</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={v.vehicle_type === 'machine' ? 'badge-brown' : 'badge-blue'}>
                {v.vehicle_type === 'machine' ? 'Maquina' : 'Veiculo'}
              </span>
              <button onClick={() => vehicles.update(v.id, { active: !v.active })}
                className={v.active ? 'badge-green' : 'badge-muted'} style={{ cursor: 'pointer', border: 'none' }}>
                {v.active ? 'Ativo' : 'Inativo'}
              </button>
              <button onClick={() => vehicles.remove(v.id)} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span>
              </button>
            </div>
          </div>
        ))}

        {tab === 'feed' && feedItems.data.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fafaf9')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="icon-circle" style={{ background: 'var(--secondary-container)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--secondary-on)' }}>grass</span>
              </div>
              <div>
                <p style={{ fontWeight: 600 }}>{item.name}</p>
                <p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>Unidade: {item.unit}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button onClick={() => feedItems.update(item.id, { active: !item.active })}
                className={item.active ? 'badge-green' : 'badge-muted'} style={{ cursor: 'pointer', border: 'none' }}>
                {item.active ? 'Ativo' : 'Inativo'}
              </button>
              <button onClick={() => feedItems.remove(item.id)} style={{ padding: 6, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span>
              </button>
            </div>
          </div>
        ))}

        {currentData.length === 0 && (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, background: 'var(--surface-mid)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 28, color: 'var(--on-surface-variant)' }}>
                {tab === 'employees' ? 'group' : tab === 'activities' ? 'label' : tab === 'vehicles' ? 'agriculture' : 'grass'}
              </span>
            </div>
            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Nenhum item registado</p>
            <p className="text-muted" style={{ fontSize: '0.875rem' }}>Clique em "Adicionar" para comecar.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {tab === 'employees' && (
        <AddEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={async (n, r) => { await employees.insert({ name: n, role: r, active: true }); setModalOpen(false) }} />
      )}
      {tab === 'activities' && (
        <AddSimpleModal open={modalOpen} onClose={() => setModalOpen(false)} title="Nova Atividade" label="Nome" placeholder="Ex: Poda, Rega..." onSave={async n => { await activityTypes.insert({ name: n, active: true }); setModalOpen(false) }} />
      )}
      {tab === 'vehicles' && (
        <AddVehicleModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={async v => { await vehicles.insert(v); setModalOpen(false) }} />
      )}
      {tab === 'feed' && (
        <AddFeedItemModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={async (n, u) => { await feedItems.insert({ name: n, unit: u, active: true }); setModalOpen(false) }} />
      )}
    </div>
  )
}

// --- Modals ---

function AddEmployeeModal({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (n: string, r: string) => void }) {
  const [n, setN] = useState(''); const [r, setR] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="Novo Funcionario">
      <form onSubmit={e => { e.preventDefault(); onSave(n, r); setN(''); setR('') }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Nome Completo</label>
          <input required value={n} onChange={e => setN(e.target.value)} placeholder="Nome do funcionario" className="input-field" /></div>
        <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Funcao</label>
          <input required value={r} onChange={e => setR(e.target.value)} placeholder="Ex: Trabalhador agricola" className="input-field" /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>Guardar</button>
        </div>
      </form>
    </Modal>
  )
}

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
