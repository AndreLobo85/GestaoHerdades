import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useFeedItems } from '../lib/store'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { FeedLog } from '../types/database'

export default function Feed() {
  const { isAdmin } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState<FeedLog[]>([])
  const [allMonth, setAllMonth] = useState<FeedLog[]>([])
  const [_loading, setLoading] = useState(true)
  const [itemModal, setItemModal] = useState(false)
  const { data: feedItems, insert: insertItem } = useFeedItems()
  const activeItems = feedItems.filter(i => i.active)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [newItem, setNewItem] = useState({ name: '', unit: 'unidades' })

  const fetchDay = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('feed_logs').select('*, feed_item:feed_items(*)').eq('date', selectedDate).order('created_at', { ascending: true })
    setLogs((data as FeedLog[]) ?? []); setLoading(false)
  }, [selectedDate])

  const fetchMonth = useCallback(async () => {
    const [y, m] = selectedDate.split('-').map(Number)
    const s = `${y}-${String(m).padStart(2, '0')}-01`, e = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const { data } = await supabase.from('feed_logs').select('*, feed_item:feed_items(*)').gte('date', s).lt('date', e)
    setAllMonth((data as FeedLog[]) ?? [])
  }, [selectedDate])

  useEffect(() => { fetchDay(); fetchMonth() }, [fetchDay, fetchMonth])

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    const ins = Object.entries(quantities).filter(([, q]) => parseFloat(q) > 0).map(([fid, q]) => ({ date: selectedDate, feed_item_id: fid, quantity: parseFloat(q), notes }))
    if (!ins.length) return
    await supabase.from('feed_logs').insert(ins as any); setQuantities({}); setNotes(''); fetchDay(); fetchMonth()
  }
  const handleDelete = async (id: string) => { await supabase.from('feed_logs').delete().eq('id', id); fetchDay(); fetchMonth() }
  const handleAddItem = async (ev: React.FormEvent) => { ev.preventDefault(); await insertItem({ name: newItem.name, unit: newItem.unit, active: true }); setNewItem({ name: '', unit: 'unidades' }); setItemModal(false) }
  const handleExport = () => {
    const [y, m] = selectedDate.split('-')
    exportToCSV(`alimentacao_${y}_${m}`, ['Data', 'Item', 'Qtd', 'Un', 'Notas'], allMonth.map(f => [formatDate(f.date), f.feed_item?.name ?? '', String(f.quantity), f.feed_item?.unit ?? '', f.notes]))
  }

  const dayTotals = logs.reduce<Record<string, number>>((a, l) => { a[l.feed_item_id] = (a[l.feed_item_id] || 0) + l.quantity; return a }, {})
  const weekDays = ['SEG', 'TER', 'QUA', 'QUI', 'HOJE', 'SAB', 'DOM']
  const barHeights = [60, 75, 80, 70, 45, 0, 0]
  const barHeights2 = [30, 40, 35, 25, 20, 0, 0]

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="text-headline" style={{ color: 'var(--on-surface)' }}>Alimentacao Diaria</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Registo de consumos diarios de alimentacao animal.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1rem', borderRadius: 'var(--radius-sm)' }}>
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>calendar_today</span>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ background: 'transparent', border: 'none', fontWeight: 600, fontSize: '0.875rem', fontFamily: 'Inter, sans-serif', outline: 'none' }} />
          </div>
          <button className="btn-ghost" onClick={handleExport}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>Exportar</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }} className="feed-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="font-display" style={{ fontWeight: 700 }}>Consumo Semanal (kg)</h3>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }}></span>FENO</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--secondary)' }}></span>RACAO</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, height: 120, marginTop: '1rem' }}>
              {weekDays.map((d, i) => (
                <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, height: 100 }}>
                    <div style={{ width: '80%', background: 'var(--primary)', borderRadius: '4px 4px 0 0', height: `${barHeights[i]}%`, minHeight: barHeights[i] > 0 ? 4 : 0 }}></div>
                    <div style={{ width: '80%', background: 'var(--secondary)', borderRadius: '0 0 4px 4px', height: `${barHeights2[i]}%`, minHeight: barHeights2[i] > 0 ? 4 : 0 }}></div>
                  </div>
                  <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', color: i === 4 ? 'var(--on-surface)' : '#a8a29e' }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily composition */}
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined text-secondary">restaurant</span>
                <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1.125rem' }}>Composicao da Diaria</h3>
              </div>
              {isAdmin && (
                <button className="btn-ghost" onClick={() => setItemModal(true)} style={{ fontSize: '0.75rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>settings</span>Gerir Itens
                </button>
              )}
            </div>
            <form onSubmit={handleSubmit}>
              {activeItems.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--surface-mid)' }}>
                  <div className="icon-circle" style={{ background: 'var(--surface-mid)', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>inventory_2</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</p>
                    <p style={{ fontSize: '0.625rem', color: '#a8a29e' }}>Unidade: {item.unit}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button type="button" className="stepper-btn" onClick={() => { const c = parseFloat(quantities[item.id] || '0'); if (c > 0) setQuantities({ ...quantities, [item.id]: String(c - 1) }) }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>remove</span>
                    </button>
                    <input type="number" min="0" step="0.5" value={quantities[item.id] || ''} onChange={e => setQuantities({ ...quantities, [item.id]: e.target.value })} placeholder="0"
                      className="input-field" style={{ width: 64, textAlign: 'center', padding: '0.5rem' }} />
                    <button type="button" className="stepper-btn" onClick={() => { const c = parseFloat(quantities[item.id] || '0'); setQuantities({ ...quantities, [item.id]: String(c + 1) }) }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                    </button>
                  </div>
                  {dayTotals[item.id] ? (
                    <div style={{ textAlign: 'right', minWidth: 70 }}>
                      <p className="text-label" style={{ fontSize: '0.5625rem' }}>Total</p>
                      <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{dayTotals[item.id]} {item.unit}</p>
                    </div>
                  ) : <div style={{ minWidth: 70 }}></div>}
                </div>
              ))}
              {activeItems.length === 0 && <p style={{ textAlign: 'center', color: '#a8a29e', padding: '2rem', fontSize: '0.875rem' }}>Nenhum item configurado.</p>}
              <div style={{ marginTop: '1.5rem' }}>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Notas de Observacao</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Ex: Adicionado suplemento vitaminico no lote da manha..." className="input-field" style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setQuantities({}); setNotes('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--on-surface-variant)', fontSize: '0.875rem', padding: '0.75rem 1.25rem' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>Submeter Registo
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ position: 'sticky', top: '6rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 className="font-display" style={{ fontWeight: 700, marginBottom: '1rem' }}>
              Registos de {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            {logs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {logs.map(l => (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-low)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div><p style={{ fontSize: '0.75rem', fontWeight: 600 }}>{l.feed_item?.name}</p><p style={{ fontSize: '0.625rem', color: '#a8a29e' }}>{l.quantity} {l.feed_item?.unit}</p></div>
                    {isAdmin && <button onClick={() => handleDelete(l.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span></button>}
                  </div>
                ))}
              </div>
            ) : <p style={{ textAlign: 'center', color: '#a8a29e', padding: '1rem', fontSize: '0.875rem' }}>Sem registos para este dia</p>}
          </div>
        </div>
      </div>

      <Modal open={itemModal} onClose={() => setItemModal(false)} title="Novo Item de Alimentacao">
        <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Nome</label><input required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Ex: Fardos de alfafa" className="input-field" /></div>
          <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Unidade</label>
            <select value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} className="input-field">
              <option value="unidades">Unidades</option><option value="kg">Kg</option><option value="sacos">Sacos</option><option value="fardos">Fardos</option><option value="bolas">Bolas</option><option value="litros">Litros</option>
            </select></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button type="button" onClick={() => setItemModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>Guardar</button>
          </div>
        </form>
      </Modal>

      <style>{`
        @media (max-width: 1023px) { .feed-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 767px) { .chart-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
