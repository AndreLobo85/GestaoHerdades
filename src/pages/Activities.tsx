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
    await supabase.from('activities').insert({ employee_id: form.employee_id, date: d, activity_type_id: form.activity_type_id, hours: parseFloat(form.hours), description: form.description } as any)
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
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 7rem)', overflow: 'hidden' }}>
      {/* Header — compact */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', flexShrink: 0 }}>
        <div>
          <p className="text-primary" style={{ fontWeight: 600, letterSpacing: '0.1em', fontSize: '0.625rem', textTransform: 'uppercase', marginBottom: '0.125rem' }}>Operacoes Diarias</p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>Horas & Atividades</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Inline stats */}
          <div style={{ display: 'flex', gap: '0.375rem', marginRight: '0.5rem' }}>
            {[
              { value: loading ? '...' : `${totalHours}h`, label: 'Horas', color: 'var(--secondary)' },
              { value: String(activities.length), label: 'Registos', color: 'var(--on-surface)' },
              { value: String(activeEmployees.length), label: 'Func.', color: 'var(--primary)' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface-low)', padding: '0.375rem 0.75rem', borderRadius: '0.75rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1rem', fontWeight: 800, color: s.color, fontFamily: "'Manrope', sans-serif", lineHeight: 1.2 }}>{s.value}</p>
                <p style={{ fontSize: '0.5625rem', fontWeight: 600, color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
              </div>
            ))}
          </div>
          <button className="btn-secondary" onClick={handleExport} style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>Exportar
          </button>
        </div>
      </header>

      {/* Main grid — fills remaining height */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1rem', flex: 1, minHeight: 0, overflow: 'hidden' }} className="act-grid">
        {/* Left: Calendar — compact */}
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif", textTransform: 'capitalize' }}>{monthLabel}</h3>
            <div style={{ display: 'flex', gap: '0.125rem' }}>
              <button onClick={prev} style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%', display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
              </button>
              <button onClick={next} style={{ padding: '0.375rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '50%', display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="calendar-grid" style={{ textAlign: 'center', fontSize: '0.625rem', fontWeight: 700, color: '#a8a29e', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
            <div>D</div><div>S</div><div>T</div><div>Q</div><div>Q</div><div>S</div><div>S</div>
          </div>

          {/* Calendar grid — flex to fill */}
          <div className="calendar-grid" style={{ gap: 1, background: '#eeeceb', borderRadius: '0.75rem', overflow: 'hidden', flex: 1 }}>
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`e${i}`} style={{ background: 'white', padding: '0.25rem 0.375rem', color: '#d6d3d1', fontSize: '0.8125rem', minHeight: 0 }}></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const sel = selectedDay === day
              const today = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear()
              const da = actByDay[day] ?? []
              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  style={{
                    background: sel ? 'rgba(255,183,131,0.12)' : 'white', padding: '0.25rem 0.375rem',
                    fontSize: '0.8125rem', textAlign: 'left', border: 'none', cursor: 'pointer',
                    outline: sel ? '2px solid #ffb783' : 'none', outlineOffset: -2,
                    transition: 'background 0.1s', minHeight: 0, display: 'flex', flexDirection: 'column',
                  }}>
                  {today ? (
                    <span style={{ background: 'var(--primary)', color: 'white', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700 }}>{day}</span>
                  ) : (
                    <span style={{ fontWeight: sel ? 700 : 400, color: sel ? 'var(--primary)' : 'inherit', fontSize: '0.8125rem' }}>{day}</span>
                  )}
                  {da.length > 0 && (
                    <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {da.slice(0, 2).map((a, idx) => (
                        <div key={idx} style={{ height: 3, borderRadius: 9999, width: `${Math.min(100, (a.hours / 8) * 100)}%`, background: idx === 0 ? '#3a6843' : '#793c00' }} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: Form + day records — scrollable */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflow: 'auto', minHeight: 0 }} className="no-scrollbar">
          {/* Form */}
          <div className="card" style={{ padding: '1.25rem', flexShrink: 0 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif", marginBottom: '1rem' }}>Registar Atividade</h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <select required value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="input-field" style={{ padding: '0.75rem' }}>
                  <option value="">Funcionario...</option>
                  {activeEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                </select>
                <span className="material-symbols-outlined" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#a8a29e', fontSize: 18 }}>expand_more</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <select required value={form.activity_type_id} onChange={e => setForm({ ...form, activity_type_id: e.target.value })} className="input-field" style={{ padding: '0.75rem' }}>
                    <option value="">Atividade...</option>
                    {activeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <span className="material-symbols-outlined" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#a8a29e', fontSize: 16 }}>expand_more</span>
                </div>
                <input type="number" required min="0.5" max="24" step="0.5" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} placeholder="Horas" className="input-field" style={{ padding: '0.75rem', textAlign: 'center' }} />
              </div>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Descricao (opcional)..." className="input-field" style={{ resize: 'none', padding: '0.75rem', fontSize: '0.8125rem' }} />
              <button type="submit" className="btn-primary" disabled={!selectedDay} style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', opacity: selectedDay ? 1 : 0.5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>
                {selectedDay ? `Registar (dia ${selectedDay})` : 'Selecione um dia'}
              </button>
            </form>
          </div>

          {/* Day records */}
          {dayActs.length > 0 && (
            <div className="card" style={{ padding: '1rem', flexShrink: 0 }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.8125rem', marginBottom: '0.625rem' }}>Dia {selectedDay} — {dayActs.length} registo{dayActs.length > 1 ? 's' : ''}</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dayActs.map(a => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-low)', padding: '0.625rem 0.75rem', borderRadius: '0.625rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.employee?.name}</p>
                      <p style={{ fontSize: '0.6875rem', color: '#78716c' }}>{a.activity_type?.name} — {a.hours}h</p>
                    </div>
                    <button onClick={() => handleDelete(a.id)} style={{ padding: 4, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info card if no records */}
          {selectedDay && dayActs.length === 0 && !loading && (
            <div style={{ background: 'var(--tertiary)', borderRadius: '1rem', padding: '1.25rem', color: 'white', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: '0.375rem' }}>Dia {selectedDay} — Sem registos</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--tertiary-light)', opacity: 0.8 }}>Use o formulario acima para adicionar.</p>
              <div style={{ position: 'absolute', right: -12, bottom: -12, opacity: 0.08 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 80, fontVariationSettings: "'FILL' 1" }}>edit_calendar</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .act-grid { grid-template-columns: 1fr !important; overflow: auto !important; }
        }
      `}</style>
    </div>
  )
}
