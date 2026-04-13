import { useState, useEffect, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useVehicles } from '../lib/store'
import { supabase } from '../lib/supabase'
import { exportToCSV, formatDate } from '../lib/export'
import type { FuelLog, FuelType } from '../types/database'

export default function Fuel() {
  const [logs, setLogs] = useState<FuelLog[]>([])
  const [_loading, setLoading] = useState(true)
  const [vehicleModal, setVehicleModal] = useState(false)
  const { data: vehicles, insert: insertVehicle } = useVehicles()
  const activeVehicles = vehicles.filter(v => v.active)
  const [form, setForm] = useState({ vehicle_id: '', date: new Date().toISOString().split('T')[0], fuel_type: 'agricola' as FuelType, hours_or_km: '', liters: '' })
  const [vf, setVf] = useState({ brand: '', model: '', plate: '', vehicle_type: 'vehicle' as 'machine' | 'vehicle', current_km: '' })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const n = new Date(), s = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`
    const e2 = n.getMonth() === 11 ? `${n.getFullYear() + 1}-01-01` : `${n.getFullYear()}-${String(n.getMonth() + 2).padStart(2, '0')}-01`
    const { data } = await supabase.from('fuel_logs').select('*, vehicle:vehicles(*)').gte('date', s).lt('date', e2).order('date', { ascending: false })
    setLogs((data as FuelLog[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await supabase.from('fuel_logs').insert({ vehicle_id: form.vehicle_id, date: form.date, fuel_type: form.fuel_type, hours_or_km: parseFloat(form.hours_or_km), liters: parseFloat(form.liters), notes: '' } as any)
    setForm({ vehicle_id: '', date: new Date().toISOString().split('T')[0], fuel_type: 'agricola', hours_or_km: '', liters: '' })
    fetchLogs()
  }
  const handleDelete = async (id: string) => { if (!confirm('Eliminar?')) return; await supabase.from('fuel_logs').delete().eq('id', id); fetchLogs() }
  const handleAddV = async (e: React.FormEvent) => { e.preventDefault(); await insertVehicle({ ...vf, current_km: parseFloat(vf.current_km) || 0, active: true }); setVf({ brand: '', model: '', plate: '', vehicle_type: 'vehicle', current_km: '' }); setVehicleModal(false) }
  const handleExport = () => {
    exportToCSV('gasoleo_mensal', ['Data', 'Veiculo', 'Matricula', 'Tipo', 'H/Km', 'Litros'],
      logs.map(f => [formatDate(f.date), f.vehicle ? `${f.vehicle.brand} ${f.vehicle.model}` : '', f.vehicle?.plate ?? '', f.fuel_type === 'agricola' ? 'Agricola' : 'Rodoviario', String(f.hours_or_km), String(f.liters)]))
  }
  const totalLiters = logs.reduce((s, f) => s + f.liters, 0)
  const totalKm = logs.reduce((s, f) => s + f.hours_or_km, 0)
  const avgConsumption = totalKm > 0 ? (totalLiters / totalKm) * 100 : 0

  // Per-vehicle stats
  const vehicleStats: Record<string, { liters: number; km: number; count: number }> = {}
  logs.forEach(f => {
    if (!vehicleStats[f.vehicle_id]) vehicleStats[f.vehicle_id] = { liters: 0, km: 0, count: 0 }
    vehicleStats[f.vehicle_id].liters += f.liters
    vehicleStats[f.vehicle_id].km += f.hours_or_km
    vehicleStats[f.vehicle_id].count++
  })

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="text-headline" style={{ color: 'var(--on-surface)' }}>Consumo de Combustivel</h1>
        <p className="text-muted" style={{ marginTop: '0.5rem', fontWeight: 500 }}>Monitorizacao e registo preciso da frota agricola.</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '2rem', alignItems: 'start' }} className="fuel-grid">
        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span className="material-symbols-outlined text-primary">local_gas_station</span>
              <h3 className="text-title font-display">Novo Registo</h3>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Data do Registo</label>
                  <input type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" /></div>
                <div><label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Veiculo</label>
                  <div style={{ position: 'relative' }}>
                    <select required value={form.vehicle_id} onChange={e => setForm({ ...form, vehicle_id: e.target.value })} className="input-field">
                      <option value="">Selecionar...</option>
                      {activeVehicles.map(v => <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</option>)}
                    </select>
                    <span className="material-symbols-outlined" style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#a8a29e' }}>expand_more</span>
                  </div></div>
              </div>
              <div><label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Tipo de Gasoleo</label>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {(['agricola', 'rodoviario'] as FuelType[]).map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, fuel_type: t })}
                      className={`toggle-btn ${form.fuel_type === t ? 'active' : 'inactive'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{t === 'agricola' ? 'agriculture' : 'directions_car'}</span>
                      {t === 'agricola' ? 'Agricola' : 'Rodoviario'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Horas / KM Atuais</label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" required min="0" step="0.1" value={form.hours_or_km} onChange={e => setForm({ ...form, hours_or_km: e.target.value })} placeholder="0.0" className="input-field" />
                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e', fontSize: '0.75rem', fontWeight: 700 }}>H/KM</span>
                  </div></div>
                <div><label className="text-label" style={{ display: 'block', marginBottom: '0.5rem', marginLeft: 4 }}>Litros Abastecidos</label>
                  <div style={{ position: 'relative' }}>
                    <input type="number" required min="0.1" step="0.1" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} placeholder="0.00" className="input-field" />
                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#a8a29e', fontSize: '0.75rem', fontWeight: 700 }}>L</span>
                  </div></div>
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: '1rem' }}>Submeter Registo</button>
            </form>
          </div>

          {logs.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem' }}>
                <h3 className="font-display" style={{ fontWeight: 700 }}>Registos Recentes</h3>
                <button onClick={handleExport} className="text-primary" style={{ fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer' }}>
                  Exportar <span className="material-symbols-outlined" style={{ fontSize: 14 }}>download</span>
                </button>
              </div>
              <table className="data-table"><thead><tr>
                <th>Data</th><th>Veiculo</th><th>Tipo</th><th style={{ textAlign: 'right' }}>Litros</th><th style={{ width: 40 }}></th>
              </tr></thead><tbody>
                {logs.slice(0, 5).map(f => (
                  <tr key={f.id}>
                    <td style={{ fontSize: '0.875rem' }}>{formatDate(f.date)}</td>
                    <td><span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{f.vehicle ? `${f.vehicle.brand} ${f.vehicle.model}` : '—'}</span><br/><span style={{ fontSize: '0.625rem', color: '#a8a29e' }}>{f.vehicle?.plate}</span></td>
                    <td><span className={f.fuel_type === 'agricola' ? 'badge-brown' : 'badge-blue'}>{f.fuel_type === 'agricola' ? 'Agricola' : 'Rodoviario'}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.875rem' }}>{f.liters}L</td>
                    <td><button onClick={() => handleDelete(f.id)} style={{ padding: 4, border: 'none', background: 'none', cursor: 'pointer', borderRadius: '50%' }}><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 16 }}>delete</span></button></td>
                  </tr>
                ))}
              </tbody></table>
            </div>
          )}
        </div>

        {/* Fleet sidebar */}
        <div style={{ position: 'sticky', top: '6rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 className="font-display" style={{ fontWeight: 700 }}>Frota Ativa</h3>
              <button className="btn-secondary" onClick={() => setVehicleModal(true)} style={{ fontSize: '0.75rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>Adicionar Veiculo
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeVehicles.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-low)', padding: '1rem', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: v.vehicle_type === 'machine' ? 'var(--primary)' : 'var(--secondary)', color: 'white' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{v.vehicle_type === 'machine' ? 'agriculture' : 'directions_car'}</span>
                    </div>
                    <div><p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{v.brand} {v.model}</p><p style={{ fontSize: '0.625rem', color: '#a8a29e' }}>{v.plate}</p></div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {vehicleStats[v.id] ? (
                      <>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 700 }}>{vehicleStats[v.id].km > 0 ? ((vehicleStats[v.id].liters / vehicleStats[v.id].km) * 100).toFixed(1) : '—'} <span style={{ fontSize: '0.625rem', color: '#a8a29e', fontWeight: 600 }}>L/100km</span></p>
                        <p style={{ fontSize: '0.5625rem', color: '#a8a29e' }}>{vehicleStats[v.id].liters.toFixed(0)}L em {vehicleStats[v.id].count} abast.</p>
                      </>
                    ) : (
                      <span className="badge-green" style={{ fontSize: '0.5625rem' }}>Sem registos</span>
                    )}
                  </div>
                </div>
              ))}
              {activeVehicles.length === 0 && <p style={{ textAlign: 'center', fontSize: '0.875rem', color: '#a8a29e', padding: '1rem' }}>Nenhum veiculo registado</p>}
            </div>
          </div>

          {/* Summary card */}
          <div style={{ background: '#2e3131', borderRadius: 'var(--radius-lg)', padding: '1.5rem', color: 'white', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c', marginBottom: '0.25rem' }}>Total Abastecido</p>
                <h3 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 900 }}>{totalLiters.toFixed(1)}<span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#78716c' }}> L</span></h3>
              </div>
              <div>
                <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#78716c', marginBottom: '0.25rem' }}>Media Consumo</p>
                <h3 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 900 }}>
                  {avgConsumption > 0 ? avgConsumption.toFixed(1) : '—'}
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#78716c' }}> L/100km</span>
                </h3>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8125rem', color: '#a8a29e' }}>
              <span>{logs.length} abastecimento{logs.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{totalKm.toFixed(0)} km registados</span>
            </div>
            <div style={{ position: 'absolute', right: -16, bottom: -16, opacity: 0.08 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 80, fontVariationSettings: "'FILL' 1" }}>local_gas_station</span>
            </div>
          </div>
        </div>
      </div>

      <Modal open={vehicleModal} onClose={() => setVehicleModal(false)} title="Novo Veiculo / Maquina">
        <form onSubmit={handleAddV} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Marca</label><input required value={vf.brand} onChange={e => setVf({ ...vf, brand: e.target.value })} placeholder="Ex: John Deere" className="input-field" /></div>
            <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Modelo</label><input value={vf.model} onChange={e => setVf({ ...vf, model: e.target.value })} placeholder="Ex: 6120M" className="input-field" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Matricula</label><input required value={vf.plate} onChange={e => setVf({ ...vf, plate: e.target.value })} placeholder="XX-XX-XX" className="input-field" /></div>
            <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Tipo</label><select value={vf.vehicle_type} onChange={e => setVf({ ...vf, vehicle_type: e.target.value as 'machine' | 'vehicle' })} className="input-field"><option value="vehicle">Veiculo</option><option value="machine">Maquina</option></select></div>
          </div>
          <div><label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Km Atuais</label><input type="number" min="0" value={vf.current_km} onChange={e => setVf({ ...vf, current_km: e.target.value })} placeholder="0" className="input-field" /></div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button type="button" onClick={() => setVehicleModal(false)} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.25rem' }}>Guardar</button>
          </div>
        </form>
      </Modal>

      <style>{`@media (max-width: 1023px) { .fuel-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  )
}
