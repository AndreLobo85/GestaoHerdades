import { useState, useEffect, useCallback } from 'react'
import { getDaysInMonth, startOfMonth, getDay, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useEmployees, useActivityTypes } from '../lib/store'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { Activity } from '../types/database'

export default function Activities() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())
  const { data: employees } = useEmployees()
  const { data: activityTypes } = useActivityTypes()
  const activeEmployees = employees.filter(e => e.active)
  const activeTypes = activityTypes.filter(t => t.active)
  const [form, setForm] = useState({ employee_id: '', activity_type_id: '', hours: '', description: '' })

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    const s = `${year}-${String(month).padStart(2, '0')}-01`
    const e = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`
    const { data } = await supabase.from('activities').select('*, employee:employees(*), activity_type:activity_types(*)').gte('date', s).lt('date', e).order('date', { ascending: false })
    setActivities((data as Activity[]) ?? [])
    setLoading(false)
  }, [year, month])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!selectedDay) return
    const d = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    await supabase.from('activities').insert({ employee_id: form.employee_id, date: d, activity_type_id: form.activity_type_id, hours: parseFloat(form.hours), description: form.description })
    setForm({ employee_id: '', activity_type_id: '', hours: '', description: '' })
    fetchActivities()
  }

  const handleDelete = async (id: string) => { if (!confirm('Eliminar?')) return; await supabase.from('activities').delete().eq('id', id); fetchActivities() }

  const handleExport = () => {
    exportToCSV(`atividades_${year}_${String(month).padStart(2, '0')}`,
      ['Data', 'Funcionario', 'Atividade', 'Horas', 'Descricao'],
      activities.map(a => [formatDate(a.date), a.employee?.name ?? '', a.activity_type?.name ?? '', String(a.hours), a.description]))
  }

  const prev = () => { if (month === 1) { setYear(year - 1); setMonth(12) } else setMonth(month - 1); setSelectedDay(null) }
  const next = () => { if (month === 12) { setYear(year + 1); setMonth(1) } else setMonth(month + 1); setSelectedDay(null) }
  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const firstDow = getDay(startOfMonth(new Date(year, month - 1)))
  const totalHours = activities.reduce((s, a) => s + a.hours, 0)
  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: pt })

  const actByDay: Record<number, Activity[]> = {}
  activities.forEach(a => { const d = parseInt(a.date.split('-')[2]); if (!actByDay[d]) actByDay[d] = []; actByDay[d].push(a) })
  const dayActs = selectedDay ? (actByDay[selectedDay] ?? []) : []

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="text-primary" style={{ fontWeight: 600, letterSpacing: '0.1em', fontSize: '0.6875rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Operacoes Diarias</p>
          <h1 className="text-headline" style={{ color: 'var(--on-surface)' }}>Horas & Atividades</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={handleExport}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>Exportar</button>
          <button className="btn-ghost"><span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit_note</span>Atividades</button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }} className="act-grid">
        {/* Calendar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 className="text-title font-display" style={{ textTransform: 'capitalize' }}>{monthLabel}</h3>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button onClick={prev} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }} className="hover-bg">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button onClick={next} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%' }} className="hover-bg">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
            <div className="calendar-grid" style={{ textAlign: 'center', fontSize: '0.6875rem', fontWeight: 700, color: '#a8a29e', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              <div>Dom</div><div>Seg</div><div>Ter</div><div>Qua</div><div>Qui</div><div>Sex</div><div>Sab</div>
            </div>
            <div className="calendar-grid" style={{ gap: 1, background: '#e7e5e4', borderRadius: '1rem', overflow: 'hidden' }}>
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`e${i}`} style={{ aspectRatio: '1', background: 'white', padding: 8, color: '#d6d3d1', fontSize: '0.875rem' }}></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const sel = selectedDay === day
                const today = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()
                const da = actByDay[day] ?? []
                return (
                  <button key={day} onClick={() => setSelectedDay(day)}
                    style={{ aspectRatio: '1', background: sel ? 'rgba(255,183,131,0.1)' : 'white', padding: 8, fontSize: '0.875rem', textAlign: 'left', border: 'none', cursor: 'pointer', outline: sel ? '2px solid #ffb783' : 'none', outlineOffset: -2, transition: 'background 0.15s' }}>
                    {today ? (
                      <span style={{ background: 'var(--primary)', color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{day}</span>
                    ) : (
                      <span style={{ fontWeight: sel ? 700 : 400, color: sel ? 'var(--primary)' : 'inherit' }}>{day}</span>
                    )}
                    {da.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {da.slice(0, 2).map((a, idx) => (
                          <div key={idx} style={{ height: 6, borderRadius: 9999, width: `${Math.min(100, (a.hours / 8) * 100)}%`, background: idx === 0 ? '#3a6843' : '#793c00' }} />
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Total Horas Mes', value: loading ? '...' : `${totalHours}h`, color: 'var(--secondary)' },
              { label: 'Atividade Predom.', value: 'Vinha', color: 'var(--on-surface)' },
              { label: 'Funcionarios Ativos', value: String(activeEmployees.length), color: 'var(--primary)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-low)', padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
                <p className="text-label" style={{ marginBottom: '0.5rem' }}>{s.label}</p>
                <h4 className="font-display" style={{ fontSize: '1.875rem', fontWeight: 900, color: s.color }}>{s.value}</h4>
              </div>
            ))}
          </div>
        </div>

        {/* Right form */}
        <div style={{ position: 'sticky', top: '6rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <h3 className="text-title-lg font-display" style={{ marginBottom: '1.5rem' }}>Registar Atividade</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Funcionario</label>
                <div style={{ position: 'relative' }}>
                  <select required value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="input-field">
                    <option value="">Selecionar Funcionario...</option>
                    {activeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                  </select>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#a8a29e' }}>expand_more</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Atividade</label>
                  <div style={{ position: 'relative' }}>
                    <select required value={form.activity_type_id} onChange={e => setForm({ ...form, activity_type_id: e.target.value })} className="input-field">
                      <option value="">Tipo...</option>
                      {activeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#a8a29e', fontSize: 18 }}>expand_more</span>
                  </div>
                </div>
                <div>
                  <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Horas</label>
                  <input type="number" required min="0.5" max="24" step="0.5" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="0.0" className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Descricao Livre</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Detalhes da tarefa realizada..." className="input-field" style={{ resize: 'none' }} />
              </div>
              <button type="submit" className="btn-primary" disabled={!selectedDay} style={{ width: '100%', fontSize: '1rem', opacity: selectedDay ? 1 : 0.5 }}>
                <span className="material-symbols-outlined">save</span>
                Confirmar Registo {selectedDay ? `(dia ${selectedDay})` : ''}
              </button>
            </form>
          </div>

          {/* Day details or info card */}
          {selectedDay && dayActs.length > 0 ? (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: '1rem' }}>Registos do dia {selectedDay}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {dayActs.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-low)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>{a.employee?.name}</p>
                      <p style={{ fontSize: '0.625rem', color: 'var(--on-surface-variant)' }}>{a.activity_type?.name} - {a.hours}h</p>
                    </div>
                    <button onClick={() => handleDelete(a.id)} style={{ padding: 4, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: 'var(--tertiary)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: 'white', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: '0.5rem' }}>Relatorio Semanal</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--tertiary-light)', opacity: 0.8, marginBottom: '1rem' }}>O resumo da semana anterior ja esta disponivel para validacao.</p>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Ver Detalhes <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
                </span>
              </div>
              <div style={{ position: 'absolute', right: -16, bottom: -16, opacity: 0.1, transform: 'scale(1.5) rotate(12deg)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 120, fontVariationSettings: "'FILL' 1" }}>analytics</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .hover-bg:hover { background: var(--surface-mid); }
        @media (max-width: 1023px) { .act-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  )
}
