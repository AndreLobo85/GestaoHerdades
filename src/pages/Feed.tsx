import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useFeedItems, useProducts } from '../lib/store'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { FeedLog, Product } from '../types/database'

export default function Feed() {
  const { isAdmin } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState<FeedLog[]>([])
  const [allMonth, setAllMonth] = useState<FeedLog[]>([])
  const [loading, setLoading] = useState(true)
  const [itemModal, setItemModal] = useState(false)
  const { data: feedItems, insert: insertItem, update: updateItem, remove: removeItem } = useFeedItems()
  const { data: products, fetch: refetchProducts } = useProducts()
  const activeItems = feedItems.filter(i => i.active)
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

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

  // Get products already linked to feed items
  const linkedProductIds = feedItems.map(fi => fi.product_id).filter(Boolean)
  const availableProducts = products.filter(p => p.active && !linkedProductIds.includes(p.id))

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setSubmitError('')
    const entries = Object.entries(quantities).filter(([, q]) => parseFloat(q) > 0)
    if (!entries.length) return
    setSubmitting(true)

    // Build feed log inserts
    const ins = entries.map(([fid, q]) => ({ date: selectedDate, feed_item_id: fid, quantity: parseFloat(q), notes }))
    const { data: insertedLogs, error: logError } = await supabase.from('feed_logs').insert(ins as any).select('id, feed_item_id, quantity') as { data: { id: string; feed_item_id: string; quantity: number }[] | null; error: any }

    if (logError || !insertedLogs) {
      setSubmitError('Erro ao guardar registos: ' + (logError?.message || 'erro desconhecido'))
      setSubmitting(false)
      return
    }

    // For each entry with a linked product, deduct stock atomically via RPC
    const errors: string[] = []
    for (const log of insertedLogs) {
      const feedItem = feedItems.find(fi => fi.id === log.feed_item_id)
      if (!feedItem?.product_id) continue

      const { error: rpcError } = await (supabase.rpc as any)('deduct_stock_for_feed', {
        p_product_id: feedItem.product_id,
        p_quantity: log.quantity,
        p_feed_log_id: log.id,
        p_date: selectedDate,
        p_item_name: feedItem.name,
        p_item_unit: feedItem.unit,
      })

      if (rpcError) {
        errors.push(`${feedItem.name}: ${rpcError.message}`)
        // Rollback: delete the feed log that couldn't be deducted
        await supabase.from('feed_logs').delete().eq('id', log.id)
      }
    }

    if (errors.length > 0) {
      setSubmitError(errors.join('\n'))
    }

    setQuantities({}); setNotes('')
    setSubmitting(false)
    refetchProducts()
    fetchDay(); fetchMonth()
  }

  const handleDelete = async (id: string) => {
    if (!isAdmin) return
    if (!confirm('Eliminar este registo? O stock sera restaurado.')) return

    // Restore stock atomically via RPC
    const { error } = await (supabase.rpc as any)('restore_stock_for_feed', { p_feed_log_id: id })
    if (error) {
      alert('Erro ao restaurar stock: ' + error.message)
      return
    }

    // Delete the feed log
    const { error: delError } = await supabase.from('feed_logs').delete().eq('id', id)
    if (delError) {
      alert('Erro ao eliminar registo: ' + delError.message)
      return
    }

    refetchProducts()
    fetchDay(); fetchMonth()
  }

  const handleRemoveFeedItem = async (item: typeof feedItems[0]) => {
    if (!isAdmin) return
    if (!confirm('Remover "' + item.name + '" da lista de alimentacao?\nOs registos historicos deste item tambem serao eliminados.')) return

    // Bulk restore stock and delete logs atomically via RPC
    const { error: restoreError } = await (supabase.rpc as any)('restore_stock_for_feed_item', { p_feed_item_id: item.id })
    if (restoreError) {
      alert('Erro ao restaurar stock: ' + restoreError.message)
      return
    }

    // Now delete the feed item itself
    const err = await removeItem(item.id)
    if (err) {
      alert('Erro ao remover item: ' + err.message)
      return
    }

    refetchProducts(); fetchDay(); fetchMonth()
  }

  const handleAddItem = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!isAdmin || !selectedProductId) return
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return
    const err = await insertItem({ name: product.name, unit: product.unit, active: true, product_id: product.id })
    if (err) { alert('Erro ao adicionar item: ' + err.message); return }
    setSelectedProductId('')
    setItemModal(false)
  }

  const handleExport = () => {
    const [y, m] = selectedDate.split('-')
    exportToCSV(`alimentacao_${y}_${m}`, ['Data', 'Item', 'Qtd', 'Un', 'Notas'], allMonth.map(f => [formatDate(f.date), f.feed_item?.name ?? '', String(f.quantity), f.feed_item?.unit ?? '', f.notes]))
  }

  const dayTotals = logs.reduce<Record<string, number>>((a, l) => { a[l.feed_item_id] = (a[l.feed_item_id] || 0) + l.quantity; return a }, {})

  // Helper to get stock info for a feed item
  const getStockInfo = (feedItem: { product_id: string | null }): Product | undefined => {
    if (!feedItem.product_id) return undefined
    return products.find(p => p.id === feedItem.product_id)
  }

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
          {/* Stock alerts for feed items */}
          {activeItems.some(item => {
            const stock = getStockInfo(item)
            return stock && stock.current_quantity <= stock.min_stock_alert
          }) && (
            <div className="card" style={{ padding: '1.25rem', border: '1px solid #f59e0b33', background: '#fef3c720' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#f59e0b' }}>warning</span>
                <h4 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#92400e' }}>Stock Baixo</h4>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {activeItems.filter(item => {
                  const stock = getStockInfo(item)
                  return stock && stock.current_quantity <= stock.min_stock_alert
                }).map(item => {
                  const stock = getStockInfo(item)!
                  return (
                    <span key={item.id} style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: 99, background: stock.current_quantity === 0 ? '#fee2e2' : '#fef9c3', color: stock.current_quantity === 0 ? '#991b1b' : '#92400e', fontWeight: 600 }}>
                      {item.name}: {stock.current_quantity} {stock.unit}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

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
              {loading && <p style={{ textAlign: 'center', color: '#a8a29e', padding: '1rem', fontSize: '0.875rem' }}>A carregar...</p>}
              {!loading && activeItems.map(item => {
                const stock = getStockInfo(item)
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 0', borderBottom: '1px solid var(--surface-mid)' }}>
                    <div className="icon-circle" style={{ background: 'var(--surface-mid)', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--on-surface-variant)' }}>inventory_2</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 2 }}>
                        <p style={{ fontSize: '0.625rem', color: '#a8a29e' }}>Unidade: {item.unit}</p>
                        {stock && (
                          <span style={{
                            fontSize: '0.625rem',
                            padding: '1px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                            opacity: submitting ? 0.4 : 1,
                            transition: 'opacity 0.2s',
                            background: stock.current_quantity <= stock.min_stock_alert ? (stock.current_quantity === 0 ? '#fee2e2' : '#fef9c3') : '#dcfce7',
                            color: stock.current_quantity <= stock.min_stock_alert ? (stock.current_quantity === 0 ? '#991b1b' : '#92400e') : '#166534',
                          }}>
                            {submitting ? 'A atualizar...' : `Stock: ${stock.current_quantity} ${stock.unit}`}
                          </span>
                        )}
                      </div>
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
                )
              })}
              {!loading && activeItems.length === 0 && (
                <p style={{ textAlign: 'center', color: '#a8a29e', padding: '2rem', fontSize: '0.875rem' }}>
                  Nenhum item configurado. {isAdmin ? 'Clique em "Gerir Itens" para adicionar produtos do stock.' : 'Contacte um administrador.'}
                </p>
              )}

              {/* Error banner */}
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

      {/* Modal: Manage feed items */}
      <Modal open={itemModal} onClose={() => setItemModal(false)} title="Gerir Itens de Alimentacao">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Current items list */}
          {feedItems.length > 0 && (
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: 8, marginLeft: 4 }}>Itens Atuais</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {feedItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', background: item.active ? 'var(--surface-low)' : '#f5f5f4', borderRadius: 'var(--radius-sm)', opacity: item.active ? 1 : 0.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--on-surface-variant)' }}>inventory_2</span>
                      <div>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{item.name}</p>
                        <p style={{ fontSize: '0.625rem', color: '#a8a29e' }}>{item.unit}{item.product_id ? ' · Ligado ao stock' : ''}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <button type="button" onClick={async () => {
                        const err = await updateItem(item.id, { active: !item.active })
                        if (err) alert('Erro: ' + err.message)
                      }} title={item.active ? 'Desativar' : 'Ativar'} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: item.active ? 'var(--primary)' : '#a8a29e' }}>{item.active ? 'visibility' : 'visibility_off'}</span>
                      </button>
                      <button type="button" onClick={() => handleRemoveFeedItem(item)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--error)' }}>delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          {feedItems.length > 0 && availableProducts.length > 0 && (
            <div style={{ borderTop: '1px solid var(--surface-mid)', paddingTop: '0.25rem' }} />
          )}

          {/* Add new item from stock */}
          {availableProducts.length > 0 ? (
            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="text-label" style={{ display: 'block', marginLeft: 4 }}>Adicionar Produto do Stock</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="input-field" required style={{ flex: 1 }}>
                  <option value="">-- Escolha um produto --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.unit}) — Stock: {p.current_quantity}</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem', whiteSpace: 'nowrap' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Adicionar
                </button>
              </div>
              <p style={{ fontSize: '0.6875rem', color: '#a8a29e', marginLeft: 4 }}>
                Ao submeter um registo de alimentacao, o stock e automaticamente deduzido.
              </p>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ fontSize: '0.8125rem', color: '#a8a29e' }}>
                {products.filter(p => p.active).length === 0
                  ? 'Nenhum produto registado no Stock.'
                  : 'Todos os produtos do stock ja estao adicionados.'}
              </p>
              <p style={{ fontSize: '0.6875rem', color: '#a8a29e', marginTop: 4 }}>
                Adicione novos produtos na pagina de Stock ou nas Definicoes.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <style>{`
        @media (max-width: 1023px) { .feed-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 767px) { .chart-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
