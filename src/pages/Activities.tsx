import { useState, useEffect, useCallback } from 'react'
import { getDaysInMonth, startOfMonth, getDay, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useEmployees, useActivityTypes } from '../lib/store'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { Activity, Profile } from '../types/database'

const TYPE_COLORS: Record<string, string> = {
  Vinha: '#7c3aed', Montado: '#3a6843', Animais: '#b45309', Olival: '#65a30d',
  Reparacoes: '#6366f1', Outros: '#78716c',
}
function getTypeColor(name?: string) { return TYPE_COLORS[name ?? ''] ?? '#78716c' }

function ActivityCard({ activity: a, onDelete }: { activity: Activity; onDelete?: () => void }) {
  const [open, setOpen] = useState(false)
  const initials = (a.employee?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = getTypeColor(a.activity_type?.name)

  return (
    <div
      style={{ background: open ? 'white' : 'var(--surface-low)', borderRadius: '0.75rem', overflow: 'hidden', transition: 'all 0.15s', border: open ? '1px solid #e5e5e5' : '1px solid transparent', cursor: 'pointer' }}
      onClick={() => setOpen(!open)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem' }}>
        {/* Avatar */}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 800, flexShrink: 0, letterSpacing: '0.02em' }}>
          {initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.employee?.name}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: 1 }}>
            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'white', background: color, padding: '1px 6px', borderRadius: 4, lineHeight: 1.4 }}>{a.activity_type?.name}</span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#3a6843' }}>{a.hours}h</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
          {a.description && (
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#a8a29e', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}>expand_more</span>
          )}
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete() }} style={{ padding: 4, borderRadius: '50%', border: 'none', background: 'none', cursor: 'pointer' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span>
            </button>
          )}
        </div>
      </div>
      {/* Expanded description */}
      {open && a.description && (
        <div style={{ padding: '0 0.75rem 0.75rem 3.375rem', animation: 'fadeIn 0.15s ease-out' }}>
          <div style={{ background: 'var(--surface-low)', borderRadius: '0.5rem', padding: '0.5rem 0.625rem' }}>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#78716c', marginBottom: '0.125rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descricao</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--on-surface)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{a.description}</p>
          </div>
        </div>
      )}
      {open && !a.description && (
        <div style={{ padding: '0 0.75rem 0.625rem 3.375rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#a8a29e', fontStyle: 'italic' }}>Sem descricao.</p>
        </div>
      )}
    </div>
  )
}

export default function Activities() {
  const { isAdmin } = useAuth()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate())
  const { data: employees, fetch: refreshEmployees } = useEmployees()
  const { data: activityTypes } = useActivityTypes()
  const activeEmployees = employees.filter(e => e.active)
  const activeTypes = activityTypes.filter(t => t.active)
  const [profiles, setProfiles] = useState<Profile[]>([])

  useEffect(() => {
    supabase.from('profiles').select('*').eq('status', 'active').order('full_name', { ascending: true })
      .then(({ data }) => { if (data) setProfiles(data as Profile[]) })
  }, [])

  // Merge employees + profiles (deduplicate by id)
  const employeeIds = new Set(activeEmployees.map(e => e.id))
  const allWorkers = [
    ...activeEmployees.map(e => ({ id: e.id, name: e.name })),
    ...profiles.filter(p => !employeeIds.has(p.id)).map(p => ({ id: p.id, name: p.full_name || p.email || 'Sem nome' })),
  ]
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

  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!selectedDay) return
    if (!form.employee_id) { setFormError('Selecione um funcionario.'); return }
    if (!form.activity_type_id) { setFormError('Selecione uma atividade.'); return }
    if (!form.hours || parseFloat(form.hours) <= 0) { setFormError('Indique as horas.'); return }
    setFormError('')
    setSubmitting(true)
    try {
      const d = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
      // If selected worker is a profile (not in employees table), auto-create employee
      let employeeId = form.employee_id
      if (!employeeIds.has(employeeId)) {
        const worker = allWorkers.find(w => w.id === employeeId)
        if (worker) {
          const { error: empErr } = await supabase.from('employees').upsert(
            { id: employeeId, name: worker.name, role: 'geral', active: true } as any,
            { onConflict: 'id' }
          )
          if (empErr) { setFormError(`Erro ao criar funcionario: ${empErr.message}`); return }
          refreshEmployees()
        }
      }
      const { error } = await supabase.from('activities').insert({
        employee_id: employeeId,
        date: d,
        activity_type_id: form.activity_type_id,
        hours: parseFloat(form.hours),
        description: form.description,
      } as any)
      if (error) { setFormError(error.message); return }
      setForm({ employee_id: '', activity_type_id: '', hours: '', description: '' })
      fetchActivities()
    } finally {
      setSubmitting(false)
    }
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
              { value: String(allWorkers.length), label: 'Func.', color: 'var(--primary)' },
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
        {/* Left: Calendar — compact, max height limited */}
        <div className="card" style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 'calc(100vh - 10rem)' }}>
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
              // Group hours by activity type
              const typeHours: Record<string, number> = {}
              da.forEach(a => { const n = a.activity_type?.name ?? 'Outros'; typeHours[n] = (typeHours[n] || 0) + a.hours })
              const typeEntries = Object.entries(typeHours)
              const hasActs = typeEntries.length > 0

              return (
                <button key={day} onClick={() => setSelectedDay(day)}
                  style={{
                    padding: 0, border: 'none', cursor: 'pointer',
                    outline: sel ? '2.5px solid #ffb783' : 'none', outlineOffset: -2,
                    transition: 'all 0.15s', minHeight: 0,
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden', background: 'white',
                    textAlign: 'left',
                  }}>
                  {hasActs ? (
                    /* Filled cell: day number on top, then each type gets its own color band */
                    <>
                      {/* Day number bar — same color as first activity type */}
                      <div style={{ padding: '2px 6px', background: getTypeColor(typeEntries[0][0]) + '28', width: '100%', flexShrink: 0 }}>
                        {today ? (
                          <span style={{ background: 'var(--primary)', color: 'white', width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.625rem', fontWeight: 700 }}>{day}</span>
                        ) : (
                          <span style={{ fontWeight: 800, color: sel ? 'var(--primary)' : '#1a1a1a', fontSize: '0.75rem' }}>{day}</span>
                        )}
                      </div>
                      {/* Color bands — each fills equal portion of remaining space */}
                      {typeEntries.slice(0, 4).map(([typeName, hours]) => {
                        const c = getTypeColor(typeName)
                        return (
                          <div key={typeName} style={{
                            flex: 1, background: c + '28', width: '100%',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '0 6px', minHeight: 0,
                          }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{typeName}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: c, flexShrink: 0, lineHeight: 1.2 }}>{hours}h</span>
                          </div>
                        )
                      })}
                      {typeEntries.length > 4 && (
                        <div style={{ padding: '1px 6px', background: 'rgba(0,0,0,0.04)', width: '100%', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.5rem', color: '#555', fontWeight: 700 }}>+{typeEntries.length - 4}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    /* Empty cell */
                    <div style={{ padding: '0.25rem 0.375rem' }}>
                      {today ? (
                        <span style={{ background: 'var(--primary)', color: 'white', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700 }}>{day}</span>
                      ) : (
                        <span style={{ fontWeight: 400, color: sel ? 'var(--primary)' : '#78716c', fontSize: '0.8125rem' }}>{day}</span>
                      )}
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
                  {allWorkers.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
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
              {formError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '0.625rem 0.75rem', fontSize: '0.75rem', color: '#991b1b' }}>
                  {formError}
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={!selectedDay || submitting} style={{ width: '100%', padding: '0.75rem', fontSize: '0.875rem', opacity: selectedDay && !submitting ? 1 : 0.5 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{submitting ? 'hourglass_empty' : 'save'}</span>
                {submitting ? 'A registar...' : selectedDay ? `Registar (dia ${selectedDay})` : 'Selecione um dia'}
              </button>
            </form>
          </div>

          {/* Day records — expandable */}
          {dayActs.length > 0 && (
            <div className="card" style={{ padding: '1rem', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '0.8125rem' }}>Dia {selectedDay} — {dayActs.length} registo{dayActs.length > 1 ? 's' : ''}</h4>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#3a6843' }}>{dayActs.reduce((s, a) => s + a.hours, 0)}h total</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {dayActs.map(a => (
                  <ActivityCard key={a.id} activity={a} onDelete={isAdmin ? () => handleDelete(a.id) : undefined} />
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
