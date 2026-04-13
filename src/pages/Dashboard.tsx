import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/export'
import type { Activity } from '../types/database'

interface Stats { employees: number; hoursThisMonth: number; fuelThisMonth: number; feedCount: number }

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ employees: 0, hoursThisMonth: 0, fuelThisMonth: 0, feedCount: 0 })
  const [recent, setRecent] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const som = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const [emp, act, fuel, feed, rec] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('activities').select('hours').gte('date', som),
        supabase.from('fuel_logs').select('liters').gte('date', som),
        supabase.from('feed_logs').select('id', { count: 'exact', head: true }).gte('date', som),
        supabase.from('activities').select('*, employee:employees(*), activity_type:activity_types(*)').order('date', { ascending: false }).limit(3),
      ])
      setStats({
        employees: emp.count ?? 0,
        hoursThisMonth: (act.data as any[] ?? []).reduce((s: number, a: any) => s + (a.hours || 0), 0),
        fuelThisMonth: (fuel.data as any[] ?? []).reduce((s: number, f: any) => s + (f.liters || 0), 0),
        feedCount: feed.count ?? 0,
      })
      setRecent((rec.data as Activity[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const monthName = new Date().toLocaleDateString('pt-PT', { month: 'long' })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 className="text-headline" style={{ color: 'var(--on-surface)' }}>Painel de Operacoes</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Aqui esta o resumo da sua exploracao este mes.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-white"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>download</span>Excel</button>
          <button className="btn-white"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>picture_as_pdf</span>PDF</button>
        </div>
      </div>

      {/* Bento Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }} className="bento-grid">
        {/* Large card */}
        <div className="card" style={{ gridColumn: 'span 2', padding: '2rem', minHeight: 280, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span className="badge-green">Eficiencia Mensal</span>
            <h3 className="font-display text-primary" style={{ fontSize: '3.75rem', fontWeight: 900, marginTop: '1.5rem' }}>
              {loading ? '...' : `${stats.hoursThisMonth}h`}
            </h3>
            <p className="text-muted" style={{ fontWeight: 500, marginTop: '0.5rem' }}>Total de horas maquinas/atividades em {monthName}</p>
          </div>
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <span className="text-secondary" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="material-symbols-outlined">trending_up</span>+12% vs mes anterior
            </span>
          </div>
          <div style={{ position: 'absolute', right: -48, bottom: -48, width: 192, height: 192, background: 'rgba(121,60,0,0.05)', borderRadius: '50%', filter: 'blur(48px)' }}></div>
        </div>

        {/* Fuel */}
        <Link to="/gasoleo" className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit', transition: 'box-shadow 0.2s' }}>
          <div>
            <div className="icon-box" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined text-primary">local_gas_station</span>
            </div>
            <h3 className="font-display" style={{ fontSize: '1.875rem', fontWeight: 700 }}>{loading ? '...' : `${stats.fuelThisMonth.toFixed(0)}L`}</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Consumo de Gasoleo</p>
          </div>
          <div style={{ marginTop: '1rem', height: 8, background: '#d6d3d1', borderRadius: 9999, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '65%', background: 'var(--primary)', borderRadius: 9999 }}></div>
          </div>
        </Link>

        {/* Feed */}
        <Link to="/alimentacao" className="card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit', background: 'var(--surface-mid)' }}>
          <div>
            <div className="icon-box" style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined text-secondary">pets</span>
            </div>
            <h3 className="font-display" style={{ fontSize: '1.875rem', fontWeight: 700 }}>{loading ? '...' : `${Math.min(100, stats.feedCount * 3)}%`}</h3>
            <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Inventario Silagem</p>
          </div>
        </Link>
      </div>

      {/* Bottom: Table + CTA */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2.5rem' }} className="bottom-grid">
        {/* Recent table */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 className="text-title-lg font-display">Registos Recentes</h2>
            <Link to="/atividades" className="text-primary" style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none' }}>
              Ver tudo <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </Link>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="data-table">
              <thead><tr>
                <th>Atividade</th><th>Data</th><th style={{ textAlign: 'right' }}>Valor</th><th>Estado</th>
              </tr></thead>
              <tbody>
                {recent.length > 0 ? recent.map(a => (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 32, height: 32, background: '#ecfccb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#3f6212' }}>agriculture</span>
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.activity_type?.name} - {a.employee?.name}</span>
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.875rem' }}>{formatDate(a.date)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.875rem' }}>{a.hours}h</td>
                    <td><span className="badge-green">Concluido</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#a8a29e' }}>Sem registos recentes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA + exports */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="cta-gradient" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
            <div>
              <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 28 }}>auto_mode</span>
              </div>
              <h3 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1.2 }}>Configurar Automacao de Exportacao</h3>
              <p style={{ color: '#ffdbc4', marginTop: '1rem', fontSize: '0.875rem', fontWeight: 500, lineHeight: 1.6 }}>
                Receba relatorios semanais automaticos no seu e-mail. Sem complicacoes, apenas os dados que interessam.
              </p>
            </div>
            <Link to="/atividades" style={{ marginTop: '2rem', background: 'white', color: 'var(--primary)', fontWeight: 700, padding: '1rem', borderRadius: '1rem', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'background 0.2s' }}>
              Ativar Automacao <span className="material-symbols-outlined">bolt</span>
            </Link>
          </div>
          <div style={{ background: 'var(--surface-highest)', borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
            <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Exportacoes Recentes</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {['Relatorio_Mensal.xlsx', 'Consumo_Diesel.pdf'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '0.75rem', borderRadius: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined" style={{ color: '#a8a29e' }}>description</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{f}</span>
                  </div>
                  <span className="material-symbols-outlined" style={{ color: '#d6d3d1', fontSize: 16 }}>download</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .bento-grid { grid-template-columns: 1fr 1fr !important; }
          .bento-grid > *:first-child { grid-column: span 2; }
          .bottom-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 639px) {
          .bento-grid { grid-template-columns: 1fr !important; }
          .bento-grid > *:first-child { grid-column: span 1; }
        }
      `}</style>
    </div>
  )
}
