import { useState, useEffect, useCallback } from 'react'
import { useProducts } from '../lib/store'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { FeedLog } from '../types/database'

export default function Feed() {
  const { isAdmin } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState<FeedLog[]>([])
  const [allMonth, setAllMonth] = useState<FeedLog[]>([])
  const [loading, setLoading] = useState(true)
  const { data: products, fetch: refetchProducts } = useProducts()
  const feedProducts = products.filter(p => p.active && p.is_feed)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fetchDay = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('feed_logs')
      .select('*, feed_item:feed_items(*), product:products(*)')
      .eq('date', selectedDate).order('created_at', { ascending: true })
    setLogs((data as FeedLog[]) ?? []); setLoading(false)
  }, [selectedDate])

  const fetchMonth = useCallback(async () => {
    const [y, m] = selectedDate.split('-').map(Number)
    const s = `${y}-${String(m).padStart(2, '0')}-01`, e = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
    const { data } = await supabase.from('feed_logs')
      .select('*, feed_item:feed_items(*), product:products(*)')
      .gte('date', s).lt('date', e)
    setAllMonth((data as FeedLog[]) ?? [])
  }, [selectedDate])

  useEffect(() => { fetchDay(); fetchMonth() }, [fetchDay, fetchMonth])

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setSubmitError('')
    const entries = Object.entries(quantities).filter(([, q]) => parseFloat(q) > 0)
    if (!entries.length) return
    setSubmitting(true)

    const ins = entries.map(([pid, q]) => ({ date: selectedDate, product_id: pid, quantity: parseFloat(q), notes }))
    const { data: insertedLogs, error: logError } = await supabase.from('feed_logs').insert(ins as any).select('id, product_id, quantity') as { data: { id: string; product_id: string; quantity: number }[] | null; error: any }

    if (logError || !insertedLogs) {
      setSubmitError('Erro ao guardar registos: ' + (logError?.message || 'erro desconhecido'))
      setSubmitting(false)
      return
    }

    const errors: string[] = []
    for (const log of insertedLogs) {
      const product = feedProducts.find(p => p.id === log.product_id)
      if (!product) continue
      const { error: rpcError } = await (supabase.rpc as any)('deduct_stock_for_feed', {
        p_product_id: product.id,
        p_quantity: log.quantity,
        p_feed_log_id: log.id,
        p_date: selectedDate,
        p_item_name: product.name,
        p_item_unit: product.unit,
      })
      if (rpcError) {
        errors.push(`${product.name}: ${rpcError.message}`)
        await supabase.from('feed_logs').delete().eq('id', log.id)
      }
    }

    if (errors.length > 0) setSubmitError(errors.join('\n'))
    setQuantities({}); setNotes('')
    setSubmitting(false)
    refetchProducts()
    fetchDay(); fetchMonth()
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) return
    if (!confirm('Eliminar este registo? O stock sera restaurado.')) return
    const { error } = await (supabase.rpc as any)('restore_stock_for_feed', { p_feed_log_id: id })
    if (error) { alert('Erro ao restaurar stock: ' + error.message); return }
    const { error: delError } = await supabase.from('feed_logs').delete().eq('id', id)
    if (delError) { alert('Erro ao eliminar registo: ' + delError.message); return }
    refetchProducts(); fetchDay(); fetchMonth()
  }

  const handleExport = () => {
    const [y, m] = selectedDate.split('-')
    exportToCSV(`alimentacao_${y}_${m}`, ['Data', 'Item', 'Qtd', 'Un', 'Notas'],
      allMonth.map(f => [formatDate(f.date), f.product?.name ?? f.feed_item?.name ?? '', String(f.quantity), f.product?.unit ?? f.feed_item?.unit ?? '', f.notes]))
  }

  const dayTotals = logs.reduce<Record<string, number>>((a, l) => {
    const key = l.product_id ?? l.feed_item_id ?? ''
    if (key) a[key] = (a[key] || 0) + l.quantity
    return a
  }, {})

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
          {feedProducts.some(p => p.current_quantity <= p.min_stock_alert && p.min_stock_alert > 0) && (
            <div className="card" style={{ padding: '1.25rem', border: '1px solid #f59e0b33', background: '#fef3c720' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f59e0b' }}>warning</span>
                <h4 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#92400e' }}>Stock Baixo</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {feedProducts.filter(p => p.current_quantity <= p.min_stock_alert && p.min_stock_alert > 0).map(p => (
                  <span key={p.id} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: 99, background: p.current_quantity === 0 ? '#fee2e2' : '#fef9c3', color: p.current_quantity === 0 ? '#991b1b' : '#92400e', fontWeight: 600 }}>
                    {p.name}: {p.current_quantity} {p.unit}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="material-symbols-outlined text-secondary">restaurant</span>
                <h3 className="font-display" style={{ fontWeight: 700, fontSize: '1.125rem' }}>Composicao da Diaria</h3>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              {loading && <p style={{ textAlign: 'center', color: '#a8a29e', padding: '1rem', fontSize: '0.875rem' }}>A carregar...</p>}
              {!loading && feedProducts.map(p => {
                const isLow = p.min_stock_alert > 0 && p.current_quantity <= p.min_stock_alert
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--surface-mid)' }}>
                    <div className="icon-circle" style={{ background: 'var(--surface-mid)', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>inventory_2</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 2 }}>
                        <p style={{ fontSize: '0.625rem', color: '#a8a29e' }}>Unidade: {p.unit}</p>
                        <span style={{
                          fontSize: '0.625rem',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontWeight: 600,
                          opacity: submitting ? 0.4 : 1,
                          transition: 'opacity 0.2s',
                          background: isLow ? (p.current_quantity === 0 ? '#fee2e2' : '#fef9c3') : '#dcfce7',
                          color: isLow ? (p.current_quantity === 0 ? '#991b1b' : '#92400e') : '#166534',
                        }}>
                          {submitting ? 'A atualizar...' : `Stock: ${p.current_quantity} ${p.unit}`}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button type="button" className="stepper-btn" onClick={() => { const c = parseFloat(quantities[p.id] || '0'); if (c > 0) setQuantities({ ...quantities, [p.id]: String(c - 1) }) }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>remove</span>
                      </button>
                      <input type="number" min="0" step="0.5" value={quantities[p.id] || ''} onChange={e => setQuantities({ ...quantities, [p.id]: e.target.value })} placeholder="0"
                        className="input-field" style={{ width: 64, textAlign: 'center', padding: '0.5rem' }} />
                      <button type="button" className="stepper-btn" onClick={() => { const c = parseFloat(quantities[p.id] || '0'); setQuantities({ ...quantities, [p.id]: String(c + 1) }) }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                      </button>
                    </div>
                    {dayTotals[p.id] ? (
                      <div style={{ textAlign: 'right', minWidth: 70 }}>
                        <p className="text-label" style={{ fontSize: '0.5625rem' }}>Total</p>
                        <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{dayTotals[p.id]} {p.unit}</p>
                      </div>
                    ) : <div style={{ minWidth: 70 }}></div>}
                  </div>
                )
              })}
              {!loading && feedProducts.length === 0 && (
                <p style={{ textAlign: 'center', color: '#a8a29e', padding: '2rem', fontSize: '0.875rem' }}>
                  Nenhum produto marcado como alimento. {isAdmin ? 'Va a Stock > Produtos e ative "Usar na Alimentacao Diaria".' : 'Contacte um administrador.'}
                </p>
              )}

              {submitError && (
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fee2e2', borderRadius: 'var(--radius-sm)', color: '#991b1b', fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'pre-line' }}>
                  {submitError}
                </div>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Notas de Observacao</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Ex: Adicionado suplemento vitaminico no lote da manha..." className="input-field" style={{ resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" onClick={() => { setQuantities({}); setNotes(''); setSubmitError('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, color: 'var(--on-surface-variant)', fontSize: '0.875rem', padding: '0.75rem 1.25rem' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', opacity: submitting ? 0.6 : 1 }} disabled={submitting}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>save</span>{submitting ? 'A guardar...' : 'Submeter Registo'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div style={{ position: 'sticky', top: '6rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h4 className="font-display" style={{ fontWeight: 700, marginBottom: '1rem' }}>
              Registos de {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            {logs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {logs.map(l => {
                  const name = l.product?.name ?? l.feed_item?.name ?? '—'
                  const unit = l.product?.unit ?? l.feed_item?.unit ?? ''
                  return (
                    <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-low)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                      <div><p style={{ fontSize: '0.75rem', fontWeight: 600 }}>{name}</p><p style={{ fontSize: '0.625rem', color: '#a8a29e' }}>{l.quantity} {unit}</p></div>
                      {isAdmin && <button onClick={() => handleDelete(l.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }}><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span></button>}
                    </div>
                  )
                })}
              </div>
            ) : <p style={{ textAlign: 'center', color: '#a8a29e', padding: '1rem', fontSize: '0.875rem' }}>Sem registos para este dia</p>}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) { .feed-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 767px) { .chart-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
