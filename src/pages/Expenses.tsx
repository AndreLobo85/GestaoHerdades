import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useVehicles, useExpenseCategories } from '../lib/store'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { Expense, ExpenseCategory, GeneralExpense } from '../types/database'

/* ── Vehicle Expenses Sub-view ─────────────────────────── */
function VehicleExpenses() {
  const { data: vehicles } = useVehicles()
  const activeVehicles = vehicles.filter(v => v.active)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], km: '', description: '', invoice_number: '', invoice_amount: '', invoice_file_url: null as string | null })

  const fetchExpenses = useCallback(async () => {
    if (!selectedVehicle) return
    setLoading(true)
    const { data } = await supabase.from('expenses').select('*, vehicle:vehicles(*)')
      .eq('vehicle_id', selectedVehicle).order('date', { ascending: false })
    setExpenses((data as Expense[]) ?? [])
    setLoading(false)
  }, [selectedVehicle])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  useEffect(() => {
    if (!selectedVehicle && activeVehicles.length > 0) setSelectedVehicle(activeVehicles[0].id)
  }, [activeVehicles, selectedVehicle])

  const resetForm = () => {
    setForm({ date: new Date().toISOString().split('T')[0], km: '', description: '', invoice_number: '', invoice_amount: '', invoice_file_url: null })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVehicle) return
    const payload = {
      vehicle_id: selectedVehicle, date: form.date, km: parseFloat(form.km) || 0,
      description: form.description, invoice_number: form.invoice_number, invoice_amount: parseFloat(form.invoice_amount) || 0,
    }
    if (editingId) {
      await supabase.from('expenses').update(payload as never).eq('id', editingId)
    } else {
      await supabase.from('expenses').insert(payload as any)
    }
    resetForm(); setModalOpen(false); fetchExpenses()
  }

  const handleDelete = async (id: string) => { if (!confirm('Eliminar esta despesa?')) return; await supabase.from('expenses').delete().eq('id', id); fetchExpenses() }

  const handleEdit = (exp: Expense) => {
    setForm({ date: exp.date, km: String(exp.km), description: exp.description, invoice_number: exp.invoice_number, invoice_amount: String(exp.invoice_amount), invoice_file_url: exp.invoice_file_url })
    setEditingId(exp.id); setModalOpen(true)
  }

  const handleFileUpload = async (expenseId: string, file: File) => {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `invoices/${expenseId}.${ext}`
    const { error } = await supabase.storage.from('invoices').upload(path, file, { upsert: true })
    if (error) { alert('Erro ao carregar ficheiro.'); setUploading(false); return }
    const { data: urlData } = supabase.storage.from('invoices').getPublicUrl(path)
    await supabase.from('expenses').update({ invoice_file_url: urlData.publicUrl } as never).eq('id', expenseId)
    setUploading(false); fetchExpenses()
  }

  const handleExport = () => {
    exportToCSV('despesas_veiculos', ['Data', 'Veiculo', 'KM', 'Descricao', 'N Fatura', 'Valor'],
      expenses.map(exp => [formatDate(exp.date), exp.vehicle ? `${exp.vehicle.brand} ${exp.vehicle.model}` : '', String(exp.km), exp.description, exp.invoice_number, exp.invoice_amount.toFixed(2)]))
  }

  const selectedVehicleData = activeVehicles.find(v => v.id === selectedVehicle)
  const totalExpenses = expenses.reduce((s, e) => s + e.invoice_amount, 0)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className="btn-ghost" onClick={handleExport} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>Exportar
        </button>
        <button className="btn-secondary" onClick={() => { resetForm(); setModalOpen(true) }} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Nova Despesa
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.25rem', alignItems: 'start' }} className="veh-grid">
        {/* Vehicle sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <h3 className="font-display" style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.25rem', color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Frota</h3>
          {activeVehicles.map(v => {
            const isActive = selectedVehicle === v.id
            return (
              <button key={v.id} onClick={() => setSelectedVehicle(v.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem', borderRadius: '0.875rem', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', background: isActive ? 'white' : 'transparent', boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)' : 'none', transition: 'all 0.2s' }}>
                <div style={{ width: 36, height: 36, borderRadius: '0.625rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'var(--primary)' : 'var(--surface-high)', color: isActive ? 'white' : 'var(--on-surface-variant)', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{v.vehicle_type === 'machine' ? 'agriculture' : 'directions_car'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.brand} {v.model}</p>
                  <p style={{ fontSize: '0.625rem', color: '#a8a29e' }}>{v.plate}</p>
                </div>
              </button>
            )
          })}
          {activeVehicles.length === 0 && <p style={{ fontSize: '0.8125rem', color: '#a8a29e', padding: '0.75rem' }}>Nenhum veiculo registado.</p>}
          {selectedVehicle && (
            <div style={{ background: 'var(--primary)', borderRadius: '0.875rem', padding: '1rem', color: 'white', marginTop: '0.25rem' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.125rem' }}>Total</p>
              <h3 className="font-display" style={{ fontSize: '1.25rem', fontWeight: 900 }}>{totalExpenses.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.7 }}>EUR</span></h3>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.125rem' }}>{expenses.length} registo{expenses.length !== 1 ? 's' : ''}</p>
            </div>
          )}
        </div>

        {/* Expenses table */}
        <div>
          {selectedVehicleData && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <h2 className="font-display" style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedVehicleData.brand} {selectedVehicleData.model}</h2>
              <span className="badge-muted">{selectedVehicleData.plate}</span>
            </div>
          )}
          {!selectedVehicle ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>directions_car</span>
              <p style={{ fontWeight: 600, marginTop: '1rem' }}>Selecione um veiculo</p>
            </div>
          ) : loading ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: '#a8a29e' }}>A carregar...</p></div>
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
                <thead><tr><th>Data</th><th>KM</th><th>Descricao</th><th>N Fatura</th><th style={{ textAlign: 'right' }}>Valor</th><th>Fatura</th><th style={{ width: 60 }}></th></tr></thead>
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
                          <a href={exp.invoice_file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>description</span>Ver
                          </a>
                        ) : (
                          <button onClick={() => { const input = document.createElement('input'); input.type = 'file'; input.accept = '.pdf,.jpg,.jpeg,.png'; input.onchange = (ev) => { const file = (ev.target as HTMLInputElement).files?.[0]; if (file) handleFileUpload(exp.id, file) }; input.click() }} disabled={uploading} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', color: '#a8a29e' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>upload_file</span>{uploading ? '...' : 'Anexar'}
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

      {/* Vehicle expense modal */}
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
            <button type="button" onClick={() => { setModalOpen(false); resetForm() }} style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.875rem', border: 'none', background: '#f2f4f3', color: '#44483c', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '0.875rem 1.75rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(121,60,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{editingId ? 'save' : 'add'}</span>{editingId ? 'Guardar' : 'Registar'}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`@media (max-width: 767px) { .veh-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  )
}

/* ── General Category Expenses Sub-view ────────────────── */
function CategoryExpenses({ category }: { category: ExpenseCategory }) {
  const [expenses, setExpenses] = useState<GeneralExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], description: '', invoice_number: '', invoice_amount: '' })

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('general_expenses').select('*, category:expense_categories(*)')
      .eq('category_id', category.id).order('date', { ascending: false })
    setExpenses((data as GeneralExpense[]) ?? [])
    setLoading(false)
  }, [category.id])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const resetForm = () => { setForm({ date: new Date().toISOString().split('T')[0], description: '', invoice_number: '', invoice_amount: '' }); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { category_id: category.id, date: form.date, description: form.description, invoice_number: form.invoice_number, invoice_amount: parseFloat(form.invoice_amount) || 0 }
    if (editingId) {
      await supabase.from('general_expenses').update(payload as never).eq('id', editingId)
    } else {
      await supabase.from('general_expenses').insert(payload as any)
    }
    resetForm(); setModalOpen(false); fetchExpenses()
  }

  const handleDelete = async (id: string) => { if (!confirm('Eliminar esta despesa?')) return; await supabase.from('general_expenses').delete().eq('id', id); fetchExpenses() }
  const handleEdit = (exp: GeneralExpense) => { setForm({ date: exp.date, description: exp.description, invoice_number: exp.invoice_number, invoice_amount: String(exp.invoice_amount) }); setEditingId(exp.id); setModalOpen(true) }

  const handleExport = () => {
    exportToCSV(`despesas_${category.name.toLowerCase().replace(/\s+/g, '_')}`, ['Data', 'Descricao', 'N Fatura', 'Valor'],
      expenses.map(exp => [formatDate(exp.date), exp.description, exp.invoice_number, exp.invoice_amount.toFixed(2)]))
  }

  const total = expenses.reduce((s, e) => s + e.invoice_amount, 0)

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="font-display" style={{ fontWeight: 700, fontSize: '1.125rem' }}>{category.name}</h2>
          <p style={{ fontSize: '0.75rem', color: '#a8a29e' }}>{expenses.length} registo{expenses.length !== 1 ? 's' : ''} — Total: <strong style={{ color: 'var(--on-surface)' }}>{total.toFixed(2)} €</strong></p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" onClick={handleExport} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>Exportar
          </button>
          <button className="btn-secondary" onClick={() => { resetForm(); setModalOpen(true) }} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Nova Despesa
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: '#a8a29e' }}>A carregar...</p></div>
      ) : expenses.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>receipt_long</span>
          <p style={{ fontWeight: 600, marginTop: '1rem' }}>Sem despesas em {category.name}</p>
          <p style={{ fontSize: '0.875rem', color: '#a8a29e', marginBottom: '1.5rem' }}>Adicione a primeira despesa nesta categoria.</p>
          <button className="btn-primary" onClick={() => { resetForm(); setModalOpen(true) }} style={{ padding: '0.75rem 1.25rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Nova Despesa
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Data</th><th>Descricao</th><th>N Fatura</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {expenses.map(exp => (
                <tr key={exp.id}>
                  <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatDate(exp.date)}</td>
                  <td style={{ fontSize: '0.875rem', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.description || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: '#78716c' }}>{exp.invoice_number || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.875rem' }}>{exp.invoice_amount.toFixed(2)} €</td>
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

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title={editingId ? 'Editar Despesa' : `Nova Despesa — ${category.name}`} wide>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Data</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Valor (EUR)</label>
              <div style={{ position: 'relative' }}>
                <input type="number" required min="0" step="0.01" value={form.invoice_amount} onChange={e => setForm({ ...form, invoice_amount: e.target.value })} placeholder="0.00" className="input-field" />
                <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e', fontSize: '0.75rem', fontWeight: 700 }}>€</span>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Descricao</label>
            <input required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Ex: Compra de racao, ferramentas..." className="input-field" />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>N Fatura</label>
            <input value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} placeholder="FT 2026/001" className="input-field" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => { setModalOpen(false); resetForm() }} style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.875rem', border: 'none', background: '#f2f4f3', color: '#44483c', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '0.875rem 1.75rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(121,60,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{editingId ? 'save' : 'add'}</span>{editingId ? 'Guardar' : 'Registar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

/* ── Expenses Dashboard ────────────────────────────────── */
function ExpensesDashboard({ categories }: { categories: ExpenseCategory[] }) {
  const [vehicleTotal, setVehicleTotal] = useState<{ count: number; total: number }>({ count: 0, total: 0 })
  const [catTotals, setCatTotals] = useState<Record<string, { count: number; total: number }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Vehicle expenses total
      const { data: vData } = await supabase.from('expenses').select('invoice_amount')
      const vRows = (vData ?? []) as { invoice_amount: number }[]
      setVehicleTotal({ count: vRows.length, total: vRows.reduce((s, r) => s + r.invoice_amount, 0) })

      // General expenses per category
      const { data: gData } = await supabase.from('general_expenses').select('category_id, invoice_amount')
      const gRows = (gData ?? []) as { category_id: string; invoice_amount: number }[]
      const totals: Record<string, { count: number; total: number }> = {}
      gRows.forEach(r => {
        if (!totals[r.category_id]) totals[r.category_id] = { count: 0, total: 0 }
        totals[r.category_id].count++
        totals[r.category_id].total += r.invoice_amount
      })
      setCatTotals(totals)
      setLoading(false)
    }
    load()
  }, [])

  const veiculosCat = categories.find(c => c.name.toLowerCase() === 'veiculos')
  const otherCats = categories.filter(c => c.name.toLowerCase() !== 'veiculos')
  const grandTotal = vehicleTotal.total + Object.values(catTotals).reduce((s, t) => s + t.total, 0)
  const grandCount = vehicleTotal.count + Object.values(catTotals).reduce((s, t) => s + t.count, 0)

  if (loading) return <div className="card" style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: '#a8a29e' }}>A carregar...</p></div>

  const allItems = [
    ...(veiculosCat ? [{ name: veiculosCat.name, icon: veiculosCat.icon, count: vehicleTotal.count, total: vehicleTotal.total }] : []),
    ...otherCats.map(c => ({ name: c.name, icon: c.icon, count: catTotals[c.id]?.count ?? 0, total: catTotals[c.id]?.total ?? 0 })),
  ]

  return (
    <div>
      {/* Grand total card */}
      <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', borderRadius: '1.25rem', padding: '2rem', color: 'white', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.08 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 120, fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
        </div>
        <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.6)', marginBottom: '0.375rem' }}>Total Geral de Despesas</p>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", lineHeight: 1.1 }}>
          {grandTotal.toFixed(2)} <span style={{ fontSize: '1.25rem', fontWeight: 600, opacity: 0.7 }}>EUR</span>
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>{grandCount} registo{grandCount !== 1 ? 's' : ''} em {allItems.length} categoria{allItems.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Category breakdown cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {allItems.map(item => {
          const pct = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0
          return (
            <div key={item.name} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '0.75rem', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9375rem', fontFamily: "'Manrope', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                  <p style={{ fontSize: '0.6875rem', color: '#a8a29e' }}>{item.count} registo{item.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.375rem' }}>
                  <h3 style={{ fontSize: '1.375rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif" }}>{item.total.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a8a29e' }}>EUR</span></h3>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--primary)' }}>{pct.toFixed(1)}%</span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface-low)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: 'var(--primary)', width: `${pct}%`, transition: 'width 0.3s ease' }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Main Expenses Page ────────────────────────────────── */
const VEHICLES_KEY = '__vehicles__'
const DASHBOARD_KEY = '__dashboard__'

export default function Expenses() {
  const { data: categories, loading: catLoading, insert: insertCat, remove: removeCat, update: updateCat, fetch: refreshCats } = useExpenseCategories()
  const activeCategories = categories.filter(c => c.active)
  const [selectedCat, setSelectedCat] = useState<string>(DASHBOARD_KEY)
  const [newCatModal, setNewCatModal] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('restaurant')
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null)

  // Auto-select Veiculos on first load
  useEffect(() => {
    if (selectedCat === VEHICLES_KEY) {
      const veiculos = activeCategories.find(c => c.name.toLowerCase() === 'veiculos')
      if (veiculos) setSelectedCat(VEHICLES_KEY)
    }
  }, [activeCategories, selectedCat])

  const isDashboard = selectedCat === DASHBOARD_KEY
  const isVehicles = selectedCat === VEHICLES_KEY
  const selectedCategory = activeCategories.find(c => c.id === selectedCat)

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    await insertCat({ name: newCatName.trim(), icon: newCatIcon, position: activeCategories.length, active: true } as any)
    setNewCatName(''); setNewCatIcon('restaurant'); setNewCatModal(false)
    await refreshCats()
  }

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCat || !newCatName.trim()) return
    await updateCat(editingCat.id, { name: newCatName.trim(), icon: newCatIcon } as any)
    setEditingCat(null); setNewCatName(''); setNewCatIcon('restaurant'); setNewCatModal(false)
    await refreshCats()
  }

  const handleDeleteCategory = async (cat: ExpenseCategory) => {
    if (!confirm(`Eliminar categoria "${cat.name}" e todas as despesas associadas?`)) return
    await removeCat(cat.id)
    if (selectedCat === cat.id) setSelectedCat(VEHICLES_KEY)
    await refreshCats()
  }

  const [editMode, setEditMode] = useState(false)
  const iconOptions = ['restaurant', 'build', 'local_shipping', 'water_drop', 'electrical_services', 'vaccines', 'agriculture', 'storefront', 'handyman', 'inventory_2', 'cleaning_services', 'local_gas_station', 'payments', 'description', 'directions_car']

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p className="text-primary" style={{ fontWeight: 600, letterSpacing: '0.1em', fontSize: '0.6875rem', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Gestao Financeira</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>Despesas</h1>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '1.5rem', alignItems: 'start' }} className="exp-main-grid">
        {/* Category sidebar */}
        <div className="card" style={{ padding: '1rem', position: 'sticky', top: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Categorias</h3>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => setEditMode(!editMode)}
                style={{ width: 28, height: 28, borderRadius: '0.5rem', border: 'none', background: editMode ? 'var(--primary)' : 'var(--surface-low)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                title="Editar categorias">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: editMode ? 'white' : '#78716c' }}>edit</span>
              </button>
              <button onClick={() => { setEditingCat(null); setNewCatName(''); setNewCatIcon('restaurant'); setNewCatModal(true) }}
                style={{ width: 28, height: 28, borderRadius: '0.5rem', border: 'none', background: 'var(--surface-low)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Nova categoria">
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--primary)' }}>add</span>
              </button>
            </div>
          </div>

          {catLoading ? (
            <p style={{ fontSize: '0.8125rem', color: '#a8a29e', padding: '0.5rem' }}>A carregar...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {/* Dashboard */}
              <button onClick={() => setSelectedCat(DASHBOARD_KEY)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem',
                  borderRadius: '0.75rem', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  background: isDashboard ? 'var(--primary)' : 'transparent',
                  color: isDashboard ? 'white' : 'var(--on-surface)',
                  transition: 'all 0.15s',
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, opacity: isDashboard ? 1 : 0.6 }}>dashboard</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: isDashboard ? 700 : 500 }}>Dashboard</span>
              </button>
              <div style={{ height: 1, background: '#e5e5e5', margin: '0.25rem 0' }} />
              {/* All categories — Veiculos uses VEHICLES_KEY, others use cat.id */}
              {activeCategories.map(cat => {
                const isVeiculosCat = cat.name.toLowerCase() === 'veiculos'
                const catKey = isVeiculosCat ? VEHICLES_KEY : cat.id
                const isActive = selectedCat === catKey
                return (
                  <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <button onClick={() => setSelectedCat(catKey)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem',
                        borderRadius: '0.75rem', border: 'none', cursor: 'pointer', textAlign: 'left', flex: 1,
                        background: isActive ? 'var(--primary)' : 'transparent',
                        color: isActive ? 'white' : 'var(--on-surface)',
                        transition: 'all 0.15s',
                      }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, opacity: isActive ? 1 : 0.6 }}>{cat.icon}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: isActive ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.name}</span>
                    </button>
                    {editMode && (
                      <div style={{ display: 'flex', flexShrink: 0 }}>
                        <button onClick={() => { setEditingCat(cat); setNewCatName(cat.name); setNewCatIcon(cat.icon); setNewCatModal(true); setEditMode(false) }}
                          style={{ padding: 3, border: 'none', background: 'none', cursor: 'pointer' }} title="Editar">
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#78716c' }}>edit</span>
                        </button>
                        <button onClick={() => handleDeleteCategory(cat)}
                          style={{ padding: 3, border: 'none', background: 'none', cursor: 'pointer' }} title="Eliminar">
                          <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--error)' }}>delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Content area */}
        <div>
          {isDashboard ? <ExpensesDashboard categories={activeCategories} />
            : isVehicles ? <VehicleExpenses />
            : selectedCategory ? <CategoryExpenses key={selectedCategory.id} category={selectedCategory} />
            : (
              <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>folder_open</span>
                <p style={{ fontWeight: 600, marginTop: '1rem' }}>Selecione uma categoria</p>
              </div>
            )}
        </div>
      </div>

      {/* New/Edit category modal */}
      <Modal open={newCatModal} onClose={() => { setNewCatModal(false); setEditingCat(null) }} title={editingCat ? 'Editar Categoria' : 'Nova Categoria'}>
        <form onSubmit={editingCat ? handleUpdateCategory : handleCreateCategory}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Nome</label>
            <input required value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="Ex: Alimentacao, Ferramentas..." className="input-field" autoFocus />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Icone</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {iconOptions.map(ic => (
                <button key={ic} type="button" onClick={() => setNewCatIcon(ic)}
                  style={{
                    width: 40, height: 40, borderRadius: '0.625rem', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: newCatIcon === ic ? 'var(--primary)' : 'var(--surface-low)',
                    color: newCatIcon === ic ? 'white' : '#78716c',
                    transition: 'all 0.15s',
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{ic}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => { setNewCatModal(false); setEditingCat(null) }} style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.875rem', border: 'none', background: '#f2f4f3', color: '#44483c', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '0.875rem 1.75rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(121,60,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{editingCat ? 'save' : 'add'}</span>{editingCat ? 'Guardar' : 'Criar Categoria'}
            </button>
          </div>
        </form>
      </Modal>

      <style>{`@media (max-width: 767px) { .exp-main-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
