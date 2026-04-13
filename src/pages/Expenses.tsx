import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useVehicles } from '../lib/store'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { Expense } from '../types/database'

export default function Expenses() {
  const { data: vehicles } = useVehicles()
  const activeVehicles = vehicles.filter(v => v.active)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], km: '', description: '', invoice_number: '', invoice_amount: '' })

  const fetchExpenses = useCallback(async () => {
    if (!selectedVehicle) return
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*, vehicle:vehicles(*)')
      .eq('vehicle_id', selectedVehicle).order('date', { ascending: false })
    setExpenses((data as Expense[]) ?? [])
    setLoading(false)
  }, [selectedVehicle])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  // Auto-select first vehicle
  useEffect(() => {
    if (!selectedVehicle && activeVehicles.length > 0) setSelectedVehicle(activeVehicles[0].id)
  }, [activeVehicles, selectedVehicle])

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], km: '', description: '', invoice_number: '', invoice_amount: '' })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle) return

    const payload = {
      vehicle_id: selectedVehicle,
      date: form.date,
      km: parseFloat(form.km) || 0,
      description: form.description,
      invoice_number: form.invoice_number,
      invoice_amount: parseFloat(form.invoice_amount) || 0,
    }

    if (editingId) {
      await supabase.from('expenses').update(payload as never).eq('id', editingId)
    } else {
      await supabase.from('expenses').insert(payload as any)
    }

    resetForm()
    setModalOpen(false)
    fetchExpenses()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta despesa?')) return
    await supabase.from('expenses').delete().eq('id', id)
    fetchExpenses()
  }

  const handleEdit = (exp: Expense) => {
    setForm({
      date: exp.date, km: String(exp.km), description: exp.description,
      invoice_number: exp.invoice_number, invoice_amount: String(exp.invoice_amount),
    })
    setEditingId(exp.id)
    setModalOpen(true)
  }

  const handleFileUpload = async (expenseId: string, file: File) => {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `invoices/${expenseId}.${ext}`

    const { error } = await supabase.storage.from('invoices').upload(path, file, { upsert: true })
    if (error) {
      alert('Erro ao carregar ficheiro. Verifique se o bucket "invoices" existe no Supabase Storage.')
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path)
    await supabase.from('expenses').update({ invoice_file_url: urlData.publicUrl } as never).eq('id', expenseId)
    setUploading(false)
    fetchExpenses()
  }

  const handleExport = () => {
    const headers = ['Data', 'Veiculo', 'KM', 'Descricao', 'N Fatura', 'Valor']
    const rows = expenses.map(exp => [
      formatDate(exp.date), exp.vehicle ? `${exp.vehicle.brand} ${exp.vehicle.model}` : '',
      String(exp.km), exp.description, exp.invoice_number, exp.invoice_amount.toFixed(2),
    ])
    exportToCSV('despesas', headers, rows)
  }

  const selectedVehicleData = activeVehicles.find(v => v.id === selectedVehicle)
  const totalExpenses = expenses.reduce((s, e) => s + e.invoice_amount, 0)

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="text-primary" style={{ fontWeight: 600, letterSpacing: '0.1em', fontSize: '0.6875rem', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Gestao Financeira</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>Despesas por Veiculo</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" onClick={handleExport} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>Exportar
          </button>
          <button className="btn-secondary" onClick={() => { resetForm(); setModalOpen(true) }} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Nova Despesa
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }} className="exp-grid">
        {/* Vehicle list sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h3 className="font-display" style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.25rem' }}>Frota</h3>
          {activeVehicles.map(v => {
            const isActive = selectedVehicle === v.id
            return (
              <button key={v.id} onClick={() => setSelectedVehicle(v.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem',
                  borderRadius: '1rem', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: isActive ? 'white' : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)' : 'none',
                  transition: 'all 0.2s',
                }}>
                <div style={{ width: 40, height: 40, borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'var(--primary)' : 'var(--surface-high)', color: isActive ? 'white' : 'var(--on-surface-variant)', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{v.vehicle_type === 'machine' ? 'agriculture' : 'directions_car'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.brand} {v.model}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#a8a29e' }}>{v.plate}</p>
                </div>
              </button>
            )
          })}
          {activeVehicles.length === 0 && (
            <p style={{ fontSize: '0.875rem', color: '#a8a29e', padding: '1rem' }}>Nenhum veiculo registado. Adicione em Consumo Gasoleo.</p>
          )}

          {/* Total card */}
          {selectedVehicle && (
            <div style={{ background: 'var(--primary)', borderRadius: '1rem', padding: '1.25rem', color: 'white', marginTop: '0.5rem' }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Total Despesas</p>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 900 }}>{totalExpenses.toFixed(2)} <span style={{ fontSize: '0.875rem', fontWeight: 600, opacity: 0.7 }}>EUR</span></h3>
              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>{expenses.length} registo{expenses.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* Expenses list */}
        <div>
          {selectedVehicleData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <h2 className="font-display" style={{ fontWeight: 700, fontSize: '1.125rem' }}>{selectedVehicleData.brand} {selectedVehicleData.model}</h2>
              <span className="badge-muted">{selectedVehicleData.plate}</span>
            </div>
          )}

          {!selectedVehicle ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>directions_car</span>
              <p style={{ fontWeight: 600, marginTop: '1rem' }}>Selecione um veiculo</p>
              <p style={{ fontSize: '0.875rem', color: '#a8a29e' }}>Escolha um veiculo na lista para ver as despesas.</p>
            </div>
          ) : loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <p style={{ color: '#a8a29e' }}>A carregar...</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>receipt_long</span>
              <p style={{ fontWeight: 600, marginTop: '1rem' }}>Sem despesas registadas</p>
              <p style={{ fontSize: '0.875rem', color: '#a8a29e', marginBottom: '1.5rem' }}>Adicione a primeira despesa para este veiculo.</p>
              <button className="btn-primary" onClick={() => { resetForm(); setModalOpen(true) }} style={{ padding: '0.75rem 1.25rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Nova Despesa
              </button>
            </div>
          ) : (
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead><tr>
                  <th>Data</th><th>KM</th><th>Descricao</th><th>N Fatura</th><th style={{ textAlign: 'right' }}>Valor</th><th>Fatura</th><th style={{ width: 60 }}></th>
                </tr></thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id}>
                      <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatDate(exp.date)}</td>
                      <td style={{ fontSize: '0.875rem', color: '#78716c' }}>{exp.km > 0 ? `${exp.km} km` : '—'}</td>
                      <td style={{ fontSize: '0.875rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description || '—'}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#78716c' }}>{exp.invoice_number || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.875rem' }}>{exp.invoice_amount.toFixed(2)} €</td>
                      <td>
                        {exp.invoice_file_url ? (
                          <a href={exp.invoice_file_url} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>description</span>Ver
                          </a>
                        ) : (
                          <button onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = '.pdf,.jpg,.jpeg,.png'
                            input.onchange = (ev) => {
                              const file = (ev.target as HTMLInputElement).files?.[0]
                              if (file) handleFileUpload(exp.id, file)
                            }
                            input.click()
                          }}
                            disabled={uploading}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#a8a29e' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload_file</span>
                            {uploading ? '...' : 'Anexar'}
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button onClick={() => handleEdit(exp)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#78716c' }}>edit</span>
                          </button>
                          <button onClick={() => handleDelete(exp.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--error)' }}>delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title={editingId ? 'Editar Despesa' : 'Nova Despesa'} wide>
        <form onSubmit={handleSubmit}>
          {selectedVehicleData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--surface-low)', borderRadius: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{selectedVehicleData.vehicle_type === 'machine' ? 'agriculture' : 'directions_car'}</span>
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: "'Manrope', sans-serif" }}>{selectedVehicleData.brand} {selectedVehicleData.model}</p>
                <p style={{ fontSize: '0.75rem', color: '#78716c' }}>{selectedVehicleData.plate}</p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Data</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>KM do Veiculo</label>
              <input type="number" min="0" step="1" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} placeholder="0" className="input-field" />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Descricao</label>
            <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Mudanca de oleo, revisao, pneus..." className="input-field" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>N Fatura</label>
              <input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} placeholder="FT 2026/001" className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Valor (EUR)</label>
              <div style={{ position: 'relative' }}>
                <input type="number" required min="0" step="0.01" value={form.invoice_amount} onChange={e => setForm({ ...form, invoice_amount: e.target.value })} placeholder="0.00" className="input-field" />
                <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e', fontSize: '0.75rem', fontWeight: 700 }}>€</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => { setModalOpen(false); resetForm() }}
              style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.875rem', border: 'none', background: '#f2f4f3', color: '#44483c', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit"
              style={{ padding: '0.875rem 1.75rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(121,60,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{editingId ? 'save' : 'add'}</span>
              {editingId ? 'Guardar' : 'Registar Despesa'}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`
        @media (max-width: 767px) { .exp-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
