import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { Activity } from '../types/database'

interface Stats {
  employees: number
  hoursThisMonth: number
  fuelThisMonth: number
  feedLogsThisMonth: number
  activitiesThisMonth: number
  expensesThisMonth: number
}

interface QuickAction {
  label: string
  icon: string
  to: string
  color: string
  bg: string
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ employees: 0, hoursThisMonth: 0, fuelThisMonth: 0, feedLogsThisMonth: 0, activitiesThisMonth: 0, expensesThisMonth: 0 })
  const [recent, setRecent] = useState<Activity[]>([])
  const [allActivities, setAllActivities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const som = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const [emp, act, fuel, feed, rec, expenses] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('activities').select('hours').gte('date', som),
        supabase.from('fuel_logs').select('liters').gte('date', som),
        supabase.from('feed_logs').select('id', { count: 'exact', head: true }).gte('date', som),
        supabase.from('activities').select('*, employee:employees(*), activity_type:activity_types(*)').order('date', { ascending: false }).limit(5),
        supabase.from('expenses').select('invoice_amount').gte('date', som),
      ])
      const actData = (act.data as any[] ?? [])
      const fuelData = (fuel.data as any[] ?? [])
      const expData = (expenses.data as any[] ?? [])
      setStats({
        employees: emp.count ?? 0,
        hoursThisMonth: actData.reduce((s: number, a: any) => s + (a.hours || 0), 0),
        fuelThisMonth: fuelData.reduce((s: number, f: any) => s + (f.liters || 0), 0),
        feedLogsThisMonth: feed.count ?? 0,
        activitiesThisMonth: actData.length,
        expensesThisMonth: expData.reduce((s: number, e: any) => s + (e.invoice_amount || 0), 0),
      })
      setRecent((rec.data as Activity[]) ?? [])
      // Fetch all activities for export
      const { data: allAct } = await supabase.from('activities').select('*, employee:employees(*), activity_type:activity_types(*)').gte('date', som).order('date', { ascending: false })
      setAllActivities(allAct ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const handleExportActivities = async () => {
    setExporting('activities')
    const headers = ['Data', 'Funcionario', 'Atividade', 'Horas', 'Descricao']
    const rows = allActivities.map((a: any) => [
      formatDate(a.date), a.employee?.name ?? '', a.activity_type?.name ?? '', String(a.hours), a.description ?? '',
    ])
    exportToCSV(`atividades_${new Date().toISOString().slice(0, 7)}`, headers, rows)
    setTimeout(() => setExporting(null), 1000)
  }

  const handleExportFuel = async () => {
    setExporting('fuel')
    const som = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`
    const { data } = await supabase.from('fuel_logs').select('*, vehicle:vehicles(*)').gte('date', som).order('date', { ascending: false })
    const rows = (data ?? []).map((f: any) => [
      formatDate(f.date), f.vehicle ? `${f.vehicle.brand} ${f.vehicle.model}` : '', f.fuel_type, String(f.hours_or_km), String(f.liters), f.notes ?? '',
    ])
    exportToCSV(`gasoleo_${new Date().toISOString().slice(0, 7)}`, ['Data', 'Veiculo', 'Tipo', 'KM/Horas', 'Litros', 'Notas'], rows)
    setTimeout(() => setExporting(null), 1000)
  }

  const now = new Date()
  const monthName = now.toLocaleDateString('pt-PT', { month: 'long' })
  const yearStr = now.getFullYear()

  const quickActions: QuickAction[] = [
    { label: 'Registar Atividade', icon: 'add_task', to: '/atividades', color: '#3a6843', bg: '#ecfccb' },
    { label: 'Registar Gasoleo', icon: 'local_gas_station', to: '/gasoleo', color: '#793c00', bg: '#fff7ed' },
    { label: 'Alimentacao', icon: 'pets', to: '/alimentacao', color: '#365314', bg: '#f0fdf4' },
    { label: 'Despesas', icon: 'receipt_long', to: '/despesas', color: '#78350f', bg: '#fef3c7' },
  ]

  const typeColors: Record<string, string> = {
    Vinha: '#7c3aed', Montado: '#3a6843', Animais: '#b45309', Olival: '#65a30d',
    Reparacoes: '#6366f1', Outros: '#78716c',
  }

  return (
    <div>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: '0.25rem' }}>Painel de Operacoes</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {yearStr}
          </h1>
        </div>
      </header>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }} className="stats-grid">
        {[
          { label: 'Horas Registadas', value: loading ? '...' : `${stats.hoursThisMonth}h`, icon: 'schedule', color: '#3a6843', bg: '#ecfccb', sub: `${stats.activitiesThisMonth} atividades` },
          { label: 'Gasoleo Consumido', value: loading ? '...' : `${stats.fuelThisMonth.toFixed(0)}L`, icon: 'local_gas_station', color: '#793c00', bg: '#fff7ed', sub: 'este mes' },
          { label: 'Alimentacao', value: loading ? '...' : `${stats.feedLogsThisMonth}`, icon: 'pets', color: '#365314', bg: '#f0fdf4', sub: 'registos este mes' },
          { label: 'Despesas', value: loading ? '...' : `${stats.expensesThisMonth.toFixed(0)}€`, icon: 'receipt_long', color: '#78350f', bg: '#fef3c7', sub: 'este mes' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '0.625rem', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a8a29e', marginBottom: '0.25rem' }}>{s.label}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)', lineHeight: 1.1 }}>{s.value}</h3>
              <p style={{ fontSize: '0.6875rem', color: '#a8a29e', marginTop: '0.125rem' }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid: Recent + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem' }} className="bottom-grid">
        {/* Recent activities */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>Registos Recentes</h2>
            <Link to="/atividades" style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Ver tudo <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </Link>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {recent.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recent.map((a, idx) => {
                  const tc = typeColors[a.activity_type?.name ?? ''] ?? '#78716c'
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: idx < recent.length - 1 ? '1px solid #f5f5f4' : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.activity_type?.name} <span style={{ color: '#a8a29e', fontWeight: 400 }}>—</span> <span style={{ fontWeight: 400, color: '#78716c' }}>{a.employee?.name}</span>
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#a8a29e', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatDate(a.date)}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface)', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>{a.hours}h</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#d6d3d1' }}>history</span>
                <p style={{ fontSize: '0.8125rem', color: '#a8a29e', marginTop: '0.5rem' }}>Sem registos recentes</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Quick actions + Export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick actions */}
          <div>
            <h3 style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8a29e', marginBottom: '0.625rem' }}>Acoes Rapidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {quickActions.map(qa => (
                <Link key={qa.label} to={qa.to} style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem',
                  borderRadius: '0.75rem', textDecoration: 'none', color: 'var(--on-surface)',
                  background: 'white', border: '1px solid #f0eeec', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = qa.bg; e.currentTarget.style.borderColor = qa.bg }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#f0eeec' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: qa.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: qa.color }}>{qa.icon}</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{qa.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Export */}
          <div>
            <h3 style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8a29e', marginBottom: '0.625rem' }}>Exportar Dados</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <button onClick={handleExportActivities} disabled={loading || exporting === 'activities'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem',
                  borderRadius: '0.75rem', border: '1px solid #f0eeec', background: 'white', cursor: 'pointer',
                  textAlign: 'left', width: '100%', transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: exporting === 'activities' ? '#ecfccb' : '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: exporting === 'activities' ? '#3a6843' : '#78716c' }}>{exporting === 'activities' ? 'check' : 'download'}</span>
                </div>
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>Atividades</p>
                  <p style={{ fontSize: '0.5625rem', color: '#a8a29e' }}>CSV · {monthName}</p>
                </div>
              </button>
              <button onClick={handleExportFuel} disabled={loading || exporting === 'fuel'}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem',
                  borderRadius: '0.75rem', border: '1px solid #f0eeec', background: 'white', cursor: 'pointer',
                  textAlign: 'left', width: '100%', transition: 'all 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: exporting === 'fuel' ? '#fff7ed' : '#f5f5f4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: exporting === 'fuel' ? '#793c00' : '#78716c' }}>{exporting === 'fuel' ? 'check' : 'download'}</span>
                </div>
                <div>
                  <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>Gasoleo</p>
                  <p style={{ fontSize: '0.5625rem', color: '#a8a29e' }}>CSV · {monthName}</p>
                </div>
              </button>
            </div>
          </div>

          {/* Team count */}
          <div style={{ background: 'var(--primary)', borderRadius: '1rem', padding: '1.25rem', color: 'white' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Equipa Ativa</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif" }}>{loading ? '...' : stats.employees}</h3>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.125rem' }}>funcionarios</p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .bottom-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 639px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
