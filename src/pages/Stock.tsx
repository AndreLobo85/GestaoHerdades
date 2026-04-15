import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useProducts } from '../lib/store'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/export'
import type { Product, StockMovement, StockMovementType } from '../types/database'

type Tab = 'dashboard' | 'produtos' | 'movimentos'

export default function Stock() {
  const [tab, setTab] = useState<Tab>('dashboard')

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'produtos', label: 'Produtos', icon: 'category' },
    { key: 'movimentos', label: 'Movimentos', icon: 'swap_vert' },
  ]

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: '0.125rem' }}>Gestao de Inventario</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>Stock</h1>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'var(--surface-low)', padding: '0.25rem', borderRadius: '0.75rem', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem',
              borderRadius: '0.625rem', border: 'none', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600,
              background: tab === t.key ? 'white' : 'transparent',
              color: tab === t.key ? 'var(--on-surface)' : '#a8a29e',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s',
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <StockDashboard />}
      {tab === 'produtos' && <ProductsTab />}
      {tab === 'movimentos' && <MovementsTab />}
    </div>
  )
}

/* ── Stock Dashboard ───────────────────────────────────── */
function StockDashboard() {
  const { data: products, loading } = useProducts()
  const activeProducts = products.filter(p => p.active)
  const lowStock = activeProducts.filter(p => p.min_stock_alert > 0 && p.current_quantity <= p.min_stock_alert)

  // Aggregate quantities by unit (kg, fardos, litros...) so we don't mix unlike items
  const totalsByUnit = activeProducts.reduce<Record<string, number>>((acc, p) => {
    const u = p.unit || 'unidades'
    acc[u] = (acc[u] || 0) + p.current_quantity
    return acc
  }, {})
  const unitEntries = Object.entries(totalsByUnit).sort(([a],[b]) => a.localeCompare(b))

  if (loading) return <div className="card" style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: '#a8a29e' }}>A carregar...</p></div>

  return (
    <div className="stock-dash">
      {/* Hero panel — unified overview */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #2d4a1f 0%, #365314 55%, #3f6212 100%)',
        borderRadius: '1.25rem', padding: '1.75rem 2rem', marginBottom: '1.75rem',
        boxShadow: '0 10px 40px -10px rgba(54, 83, 20, 0.35)',
        maxWidth: 860, width: 'fit-content', minWidth: 'min(860px, 100%)',
      }}>
        {/* Decorative texture */}
        <div aria-hidden style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.08,
          backgroundImage: 'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 1px, transparent 1px)',
          backgroundSize: '32px 32px, 48px 48px',
        }} />
        <div aria-hidden style={{
          position: 'absolute', right: -40, top: -40, width: 240, height: 240, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,252,203,0.25) 0%, transparent 70%)',
        }} />

        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '2rem', alignItems: 'center' }} className="hero-grid">
          {/* Left: big KPI numbers */}
          <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(236,252,203,0.65)', marginBottom: '0.375rem' }}>Produtos</p>
              <h2 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", color: '#fff', lineHeight: 0.95, letterSpacing: '-0.04em' }}>{activeProducts.length}</h2>
              <p style={{ fontSize: '0.6875rem', color: 'rgba(236,252,203,0.55)', marginTop: '0.25rem' }}>ativos no catálogo</p>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(236,252,203,0.15)' }} />
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: lowStock.length > 0 ? '#fecaca' : 'rgba(236,252,203,0.65)', marginBottom: '0.375rem' }}>Alertas</p>
              <h2 style={{ fontSize: '3rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", color: lowStock.length > 0 ? '#fca5a5' : '#fff', lineHeight: 0.95, letterSpacing: '-0.04em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {lowStock.length}
                {lowStock.length > 0 && <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#fca5a5' }}>warning</span>}
              </h2>
              <p style={{ fontSize: '0.6875rem', color: lowStock.length > 0 ? '#fecaca' : 'rgba(236,252,203,0.55)', marginTop: '0.25rem' }}>
                {lowStock.length === 0 ? 'tudo dentro dos mínimos' : 'produtos abaixo do mínimo'}
              </p>
            </div>
          </div>

          {/* Right: per-product chips (falls back to per-unit aggregates when many products) */}
          {activeProducts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 220 }} className="hero-totals">
              <p style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(236,252,203,0.65)', marginBottom: '0.125rem' }}>
                {activeProducts.length <= 6 ? 'Stock por Produto' : 'Totais em Stock'}
              </p>
              {activeProducts.length <= 6
                ? [...activeProducts].sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.08)', borderRadius: '0.625rem', backdropFilter: 'blur(4px)' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.92)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                      <span style={{ fontSize: '1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                        {Number.isInteger(p.current_quantity) ? p.current_quantity : p.current_quantity.toFixed(1)} <span style={{ fontSize: '0.6875rem', fontWeight: 500, color: 'rgba(236,252,203,0.65)', textTransform: 'lowercase' }}>{p.unit}</span>
                      </span>
                    </div>
                  ))
                : unitEntries.map(([unit, qty]) => (
                    <div key={unit} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.08)', borderRadius: '0.625rem', backdropFilter: 'blur(4px)' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'rgba(236,252,203,0.75)', textTransform: 'lowercase' }}>{unit}</span>
                      <span style={{ fontSize: '1.125rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: '#fff', letterSpacing: '-0.02em' }}>{Number.isInteger(qty) ? qty : qty.toFixed(1)}</span>
                    </div>
                  ))
              }
            </div>
          )}
        </div>
      </div>

      {/* Low stock callout */}
      {lowStock.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '1rem', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.625rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#dc2626' }}>priority_high</span>
            <h3 style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reposição urgente</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {lowStock.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', padding: '0.375rem 0.75rem', borderRadius: 999, border: '1px solid #fecaca' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#991b1b' }}>{p.name}</span>
                <span style={{ fontSize: '0.6875rem', color: '#dc2626', fontWeight: 600 }}>{p.current_quantity}/{p.min_stock_alert} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product levels — editorial grid */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <h3 style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#78716c' }}>Níveis de Stock</h3>
        <p style={{ fontSize: '0.6875rem', color: '#a8a29e' }}>{activeProducts.length} produto{activeProducts.length !== 1 ? 's' : ''}</p>
      </div>

      {activeProducts.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>inventory_2</span>
          <p style={{ fontWeight: 600, marginTop: '1rem' }}>Sem produtos</p>
          <p style={{ fontSize: '0.875rem', color: '#a8a29e' }}>Adicione produtos no tab "Produtos".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
          {activeProducts.map(p => {
            const isLow = p.min_stock_alert > 0 && p.current_quantity <= p.min_stock_alert
            const isZero = p.current_quantity === 0
            const pct = p.min_stock_alert > 0 ? Math.min(100, (p.current_quantity / (p.min_stock_alert * 3)) * 100) : 65
            const barColor = isZero ? '#dc2626' : isLow ? '#f59e0b' : '#3a6843'
            return (
              <div key={p.id} className="card stock-level-card" style={{ padding: '1.125rem', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default' }}>
                {isLow && (
                  <span style={{ position: 'absolute', top: 12, right: 12, fontSize: '0.5625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 999, background: isZero ? '#fee2e2' : '#fef3c7', color: isZero ? '#991b1b' : '#92400e' }}>
                    {isZero ? 'Esgotado' : 'Baixo'}
                  </span>
                )}
                {p.is_feed && (
                  <span style={{ position: 'absolute', top: 12, left: 12, fontSize: '0.5625rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#ecfccb', color: '#3a6843' }}>🌾</span>
                )}
                <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface)', marginTop: p.is_feed ? '1rem' : 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '2rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", color: isZero ? '#dc2626' : 'var(--on-surface)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {Number.isInteger(p.current_quantity) ? p.current_quantity : p.current_quantity.toFixed(1)}
                  </h4>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#a8a29e', textTransform: 'lowercase' }}>{p.unit}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#f5f4f2', overflow: 'hidden', marginTop: '0.875rem' }}>
                  <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`, width: `${pct}%`, transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
                <p style={{ fontSize: '0.625rem', color: '#a8a29e', marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  {p.min_stock_alert > 0
                    ? <><span>mínimo</span><span style={{ fontWeight: 600, color: '#78716c' }}>{p.min_stock_alert} {p.unit}</span></>
                    : <span>sem alerta definido</span>}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <style>{`
        .stock-level-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -8px rgba(0,0,0,0.12); }
        @media (max-width: 899px) {
          .hero-grid { grid-template-columns: 1fr !important; }
          .hero-totals { flex-direction: row !important; flex-wrap: wrap; }
        }
      `}</style>
    </div>
  )
}

/* ── Products CRUD Tab ─────────────────────────────────── */
function ProductsTab() {
  const { data: products, loading, insert, update, remove, fetch: refresh } = useProducts()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', unit: 'unidades', min_stock_alert: '', current_quantity: '', is_feed: false })

  const resetForm = () => { setForm({ name: '', unit: 'unidades', min_stock_alert: '', current_quantity: '', is_feed: false }); setEditingId(null) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = { name: form.name.trim(), unit: form.unit.trim(), min_stock_alert: parseFloat(form.min_stock_alert) || 0, current_quantity: parseFloat(form.current_quantity) || 0, active: true, is_feed: form.is_feed }
    if (editingId) {
      await update(editingId, payload as any)
    } else {
      await insert(payload as any)
    }
    resetForm(); setModalOpen(false); refresh()
  }

  const handleEdit = (p: Product) => {
    setForm({ name: p.name, unit: p.unit, min_stock_alert: String(p.min_stock_alert), current_quantity: String(p.current_quantity), is_feed: !!p.is_feed })
    setEditingId(p.id); setModalOpen(true)
  }

  const handleToggle = async (p: Product) => {
    await update(p.id, { active: !p.active } as any)
    refresh()
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Eliminar o produto "${p.name}"?\n\nOs registos historicos de movimentos, alimentacao e despesas que referenciavam este produto serao mantidos, mas deixarao de ter ligacao.`)) return
    const err = await remove(p.id)
    if (err) { alert('Erro ao eliminar: ' + err.message); return }
    refresh()
  }

  const unitOptions = ['unidades', 'kg', 'litros', 'sacos', 'fardos', 'caixas', 'metros', 'toneladas']

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>Catalogo de Produtos</h2>
        <button className="btn-secondary" onClick={() => { resetForm(); setModalOpen(true) }} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Novo Produto
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: '#a8a29e' }}>A carregar...</p></div>
      ) : products.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>category</span>
          <p style={{ fontWeight: 600, marginTop: '1rem' }}>Sem produtos</p>
          <p style={{ fontSize: '0.875rem', color: '#a8a29e', marginBottom: '1.5rem' }}>Adicione o primeiro produto ao catalogo.</p>
          <button className="btn-primary" onClick={() => { resetForm(); setModalOpen(true) }} style={{ padding: '0.75rem 1.25rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Novo Produto
          </button>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Produto</th><th>Unidade</th><th style={{ textAlign: 'right' }}>Stock Atual</th><th style={{ textAlign: 'right' }}>Stock Min.</th><th>Estado</th><th style={{ width: 80 }}></th></tr></thead>
            <tbody>
              {products.map(p => {
                const isLow = p.active && p.min_stock_alert > 0 && p.current_quantity <= p.min_stock_alert
                return (
                  <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
                    <td style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {p.name}
                      {p.is_feed && <span style={{ marginLeft: 6, fontSize: '0.625rem', padding: '1px 6px', borderRadius: 4, background: '#ecfccb', color: '#3a6843', fontWeight: 700 }}>🌾 Alimento</span>}
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: '#78716c' }}>{p.unit}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', color: isLow ? '#dc2626' : 'var(--on-surface)' }}>{p.current_quantity} {p.unit}</td>
                    <td style={{ textAlign: 'right', fontSize: '0.8125rem', color: '#a8a29e' }}>{p.min_stock_alert > 0 ? `${p.min_stock_alert} ${p.unit}` : '—'}</td>
                    <td>
                      {!p.active ? <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, background: '#f5f5f4', color: '#a8a29e', fontWeight: 600 }}>Inativo</span>
                        : isLow ? <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, background: '#fef2f2', color: '#dc2626', fontWeight: 600 }}>Stock Baixo</span>
                        : <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, background: '#ecfccb', color: '#3a6843', fontWeight: 600 }}>OK</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => handleEdit(p)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#78716c' }}>edit</span>
                        </button>
                        <button onClick={() => handleToggle(p)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }} title={p.active ? 'Desativar' : 'Ativar'}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: p.active ? '#dc2626' : '#3a6843' }}>{p.active ? 'visibility_off' : 'visibility'}</span>
                        </button>
                        <button onClick={() => handleDelete(p)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer' }} title="Eliminar">
                          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--error)' }}>delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title={editingId ? 'Editar Produto' : 'Novo Produto'} wide>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Nome do Produto</label>
            <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Racao Vacada, Parafusos, Herbicida..." className="input-field" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Unidade</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="input-field">
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Quantidade Atual</label>
              <input type="number" min="0" step="0.1" value={form.current_quantity} onChange={e => setForm({ ...form, current_quantity: e.target.value })} placeholder="0" className="input-field" />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Stock Minimo (alerta)</label>
            <input type="number" min="0" step="0.1" value={form.min_stock_alert} onChange={e => setForm({ ...form, min_stock_alert: e.target.value })} placeholder="0 (sem alerta)" className="input-field" />
            <p style={{ fontSize: '0.625rem', color: '#a8a29e', marginTop: '0.25rem' }}>Recebera um alerta quando o stock ficar abaixo deste valor.</p>
          </div>
          <div style={{ marginBottom: '1.5rem', padding: '0.875rem 1rem', background: form.is_feed ? '#f0fdf4' : '#fafafa', borderRadius: '0.875rem', border: `1px solid ${form.is_feed ? '#bbf7d0' : '#f0eeec'}`, display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }} onClick={() => setForm({ ...form, is_feed: !form.is_feed })}>
            <input type="checkbox" checked={form.is_feed} onChange={e => setForm({ ...form, is_feed: e.target.checked })} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: form.is_feed ? '#3a6843' : '#a8a29e' }}>grass</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: form.is_feed ? '#3a6843' : 'var(--on-surface)' }}>Usar na Alimentacao Diaria</p>
              <p style={{ fontSize: '0.6875rem', color: '#78716c' }}>Aparece na pagina de Alimentacao para registo de consumos.</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => { setModalOpen(false); resetForm() }} style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.875rem', border: 'none', background: '#f2f4f3', color: '#44483c', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{ padding: '0.875rem 1.75rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px rgba(121,60,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{editingId ? 'save' : 'add'}</span>{editingId ? 'Guardar' : 'Criar Produto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ── Movements Tab ─────────────────────────────────────── */
function MovementsTab() {
  const { data: products } = useProducts()
  const activeProducts = products.filter(p => p.active)
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const nowDate = new Date()
  const [year, setYear] = useState(nowDate.getFullYear())
  const [month, setMonth] = useState(nowDate.getMonth() + 1)
  const [form, setForm] = useState({ product_id: '', type: 'entrada' as StockMovementType, quantity: '', reason: '', notes: '', date: new Date().toISOString().split('T')[0] })
  const [formError, setFormError] = useState('')

  const fetchMovements = useCallback(async () => {
    setLoading(true)
    const s = `${year}-${String(month).padStart(2, '0')}-01`
    const e = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
    const { data } = await supabase.from('stock_movements').select('*, product:products(*)').gte('date', s).lt('date', e).order('date', { ascending: false })
    setMovements((data as StockMovement[]) ?? [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchMovements() }, [fetchMovements])

  const prevMonth = () => { if (month === 1) { setYear(year - 1); setMonth(12) } else setMonth(month - 1) }
  const nextMonth = () => { if (month === 12) { setYear(year + 1); setMonth(1) } else setMonth(month + 1) }
  const monthLabel = new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  const resetForm = () => { setForm({ product_id: '', type: 'entrada', quantity: '', reason: '', notes: '', date: new Date().toISOString().split('T')[0] }); setFormError('') }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.product_id) { setFormError('Selecione um produto.'); return }
    if (!form.quantity || parseFloat(form.quantity) <= 0) { setFormError('Indique a quantidade.'); return }
    setFormError('')

    const qty = parseFloat(form.quantity)
    const product = products.find(p => p.id === form.product_id)
    if (!product) return

    // Validate stock for exits
    if (form.type === 'saida' && qty > product.current_quantity) {
      setFormError(`Stock insuficiente. Disponivel: ${product.current_quantity} ${product.unit}`)
      return
    }

    // Insert movement
    const { error } = await supabase.from('stock_movements').insert({
      product_id: form.product_id, type: form.type, quantity: qty,
      reason: form.reason || (form.type === 'entrada' ? 'Entrada manual' : 'Saida manual'),
      notes: form.notes, date: form.date,
    } as any)
    if (error) { setFormError(error.message); return }

    // Update product quantity
    const newQty = form.type === 'entrada' ? product.current_quantity + qty : product.current_quantity - qty
    await supabase.from('products').update({ current_quantity: newQty } as never).eq('id', form.product_id)

    resetForm(); setModalOpen(false); fetchMovements()
  }

  const reasonOptions = { entrada: ['Compra', 'Devolucao', 'Ajuste inventario', 'Outro'], saida: ['Consumo', 'Perda/Dano', 'Ajuste inventario', 'Outro'] }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--surface-low)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
          </button>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>{monthLabel}</h2>
          <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'var(--surface-low)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
          </button>
        </div>
        <button className="btn-secondary" onClick={() => { resetForm(); setModalOpen(true) }} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Novo Movimento
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}><p style={{ color: '#a8a29e' }}>A carregar...</p></div>
      ) : movements.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: '#d6d3d1' }}>swap_vert</span>
          <p style={{ fontWeight: 600, marginTop: '1rem' }}>Sem movimentos</p>
          <p style={{ fontSize: '0.875rem', color: '#a8a29e' }}>Nenhum movimento de stock neste mes.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead><tr><th>Data</th><th>Produto</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Quantidade</th><th>Razao</th><th>Notas</th></tr></thead>
            <tbody>
              {movements.map(m => (
                <tr key={m.id}>
                  <td style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{formatDate(m.date)}</td>
                  <td style={{ fontSize: '0.875rem', fontWeight: 600 }}>{m.product?.name ?? '—'}</td>
                  <td>
                    <span style={{
                      fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, fontWeight: 700,
                      background: m.type === 'entrada' ? '#ecfccb' : '#fef2f2',
                      color: m.type === 'entrada' ? '#3a6843' : '#dc2626',
                    }}>{m.type === 'entrada' ? '↑ Entrada' : '↓ Saida'}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.875rem' }}>{m.quantity} {m.product?.unit ?? ''}</td>
                  <td style={{ fontSize: '0.8125rem', color: '#78716c' }}>{m.reason || '—'}</td>
                  <td style={{ fontSize: '0.8125rem', color: '#a8a29e', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Novo Movimento de Stock" wide>
        <form onSubmit={handleSubmit}>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {(['entrada', 'saida'] as const).map(t => (
              <button key={t} type="button" onClick={() => setForm({ ...form, type: t, reason: '' })}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.15s',
                  background: form.type === t ? (t === 'entrada' ? '#ecfccb' : '#fef2f2') : '#f5f5f4',
                  color: form.type === t ? (t === 'entrada' ? '#3a6843' : '#dc2626') : '#a8a29e',
                }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 4 }}>{t === 'entrada' ? 'arrow_upward' : 'arrow_downward'}</span>
                {t === 'entrada' ? 'Entrada' : 'Saida'}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Produto</label>
              <select required value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} className="input-field">
                <option value="">Selecionar...</option>
                {activeProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.current_quantity} {p.unit})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Quantidade</label>
              <input type="number" required min="0.1" step="0.1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" className="input-field" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Razao</label>
              <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="input-field">
                <option value="">Selecionar...</option>
                {reasonOptions[form.type].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Data</label>
              <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', marginBottom: '0.375rem', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c' }}>Notas (opcional)</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Observacoes..." className="input-field" />
          </div>

          {formError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#991b1b', marginBottom: '1rem' }}>{formError}</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" onClick={() => { setModalOpen(false); resetForm() }} style={{ padding: '0.875rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, borderRadius: '0.875rem', border: 'none', background: '#f2f4f3', color: '#44483c', cursor: 'pointer' }}>Cancelar</button>
            <button type="submit" style={{
              padding: '0.875rem 1.75rem', fontSize: '0.875rem', fontWeight: 700, borderRadius: '0.875rem', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem',
              background: form.type === 'entrada' ? 'linear-gradient(135deg, #3a6843, #2d5233)' : 'linear-gradient(135deg, #dc2626, #b91c1c)',
              boxShadow: form.type === 'entrada' ? '0 4px 14px rgba(58,104,67,0.3)' : '0 4px 14px rgba(220,38,38,0.3)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{form.type === 'entrada' ? 'arrow_upward' : 'arrow_downward'}</span>
              Registar {form.type === 'entrada' ? 'Entrada' : 'Saida'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
