import { useState, useEffect, useCallback } from 'react'
import Modal from './ui/Modal'
import { supabase } from '../lib/supabase'

interface Role {
  id: string
  key: string
  name: string
  description: string | null
  is_system: boolean
  users_count: number
  created_at: string
}

interface Permission {
  module_key: string
  action: string
  allowed: boolean
}

const MODULES = [
  { key: 'activities', label: 'Atividades' },
  { key: 'fuel', label: 'Combustível' },
  { key: 'feed', label: 'Alimentação' },
  { key: 'stock', label: 'Stock' },
  { key: 'expenses', label: 'Despesas' },
  { key: 'vehicles', label: 'Veículos' },
  { key: 'employees', label: 'Funcionários' },
]
const ACTIONS = [
  { key: 'view', label: 'Ver' },
  { key: 'create', label: 'Criar' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Apagar' },
  { key: 'export', label: 'Exportar' },
  { key: 'manage', label: 'Gerir' },
]
const VIRTUAL = [
  { module: 'users', action: 'invite', label: 'Convidar utilizadores' },
  { module: 'users', action: 'manage_roles', label: 'Atribuir roles a outros' },
  { module: 'tenant', action: 'settings', label: 'Editar definições da herdade' },
]

export default function RolesManager({ tenantId }: { tenantId: string }) {
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Role | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    const { data } = await (supabase.rpc as any)('admin_list_tenant_roles', { p_tenant_id: tenantId })
    setRoles((data as Role[] | null) ?? [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { fetchRoles() }, [fetchRoles])

  const handleDelete = async (role: Role) => {
    if (role.is_system) { alert('Roles do sistema não podem ser eliminados.'); return }
    if (role.users_count > 0) { alert('Este role tem utilizadores atribuídos. Mova-os primeiro.'); return }
    if (!confirm(`Eliminar role "${role.name}"?`)) return
    const { error } = await (supabase.rpc as any)('admin_delete_role', { p_role_id: role.id })
    if (error) { alert(error.message); return }
    fetchRoles()
  }

  if (loading) return <p style={{ color: '#a8a29e', padding: '1rem' }}>A carregar...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button className="btn-secondary" onClick={() => setCreateOpen(true)} style={{ padding: '0.5rem 0.875rem', fontSize: '0.8125rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>Novo Role
        </button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>Nome</th><th>Descrição</th><th style={{ textAlign: 'right' }}>Utilizadores</th><th></th><th></th></tr></thead>
          <tbody>
            {roles.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>
                  {r.name}
                  {r.is_system && <span style={{ marginLeft: 6, fontSize: '0.625rem', padding: '1px 6px', borderRadius: 4, background: '#fff7ed', color: '#793c00', fontWeight: 700 }}>SYSTEM</span>}
                </td>
                <td style={{ fontSize: '0.8125rem', color: '#78716c' }}>{r.description || '—'}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{r.users_count}</td>
                <td><button onClick={() => setEditing(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 600, fontSize: '0.8125rem' }}>Permissões</button></td>
                <td>{!r.is_system && <button onClick={() => handleDelete(r)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} title="Eliminar"><span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: 18 }}>delete</span></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <PermissionsModal role={editing} onClose={() => setEditing(null)} />}
      {createOpen && <CreateRoleModal tenantId={tenantId} existingRoles={roles} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); fetchRoles() }} />}
    </div>
  )
}

function PermissionsModal({ role, onClose }: { role: Role; onClose: () => void }) {
  const [perms, setPerms] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const isAdminRole = role.is_system && role.key === 'admin'

  const key = (m: string, a: string) => `${m}.${a}`

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await (supabase.rpc as any)('admin_list_role_permissions', { p_role_id: role.id })
      const map = new Map<string, boolean>()
      for (const p of (data ?? []) as Permission[]) map.set(key(p.module_key, p.action), p.allowed)
      setPerms(map)
      setLoading(false)
    })()
  }, [role.id])

  const toggle = (m: string, a: string) => {
    if (isAdminRole) return
    setPerms(p => { const n = new Map(p); n.set(key(m, a), !n.get(key(m, a))); return n })
  }

  const toggleRow = (m: string, value: boolean) => {
    if (isAdminRole) return
    setPerms(p => { const n = new Map(p); for (const a of ACTIONS) n.set(key(m, a.key), value); return n })
  }

  const save = async () => {
    if (isAdminRole) { onClose(); return }
    setSaving(true)
    const ops: Promise<any>[] = []
    for (const m of MODULES) {
      for (const a of ACTIONS) {
        ops.push((supabase.rpc as any)('admin_set_role_permission', { p_role_id: role.id, p_module_key: m.key, p_action: a.key, p_allowed: !!perms.get(key(m.key, a.key)) }))
      }
    }
    for (const v of VIRTUAL) {
      ops.push((supabase.rpc as any)('admin_set_role_permission', { p_role_id: role.id, p_module_key: v.module, p_action: v.action, p_allowed: !!perms.get(key(v.module, v.action)) }))
    }
    const results = await Promise.all(ops)
    setSaving(false)
    const errs = results.filter(r => r.error).map(r => r.error.message)
    if (errs.length > 0) { alert('Erros:\n' + errs.join('\n')); return }
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`Permissões — ${role.name}`} wide>
      {loading ? <p>A carregar...</p> : (
        <div>
          {isAdminRole && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '0.625rem 0.875rem', marginBottom: '1rem', fontSize: '0.8125rem', color: '#92400e' }}>
              O role <strong>Admin</strong> tem sempre acesso total. Não é editável.
            </div>
          )}

          <div style={{ overflow: 'auto', marginBottom: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ background: '#fafaf9' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 700, fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#78716c' }}>Módulo</th>
                  {ACTIONS.map(a => <th key={a.key} style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 700, fontSize: '0.625rem', textTransform: 'uppercase', color: '#78716c' }}>{a.label}</th>)}
                  <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.625rem', color: '#78716c' }}>Tudo</th>
                </tr>
              </thead>
              <tbody>
                {MODULES.map(m => {
                  const allOn = ACTIONS.every(a => perms.get(key(m.key, a.key)))
                  return (
                    <tr key={m.key} style={{ borderTop: '1px solid #f0eeec' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600 }}>{m.label}</td>
                      {ACTIONS.map(a => (
                        <td key={a.key} style={{ textAlign: 'center', padding: '0.375rem' }}>
                          <input type="checkbox" disabled={isAdminRole} checked={!!perms.get(key(m.key, a.key))} onChange={() => toggle(m.key, a.key)} />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', padding: '0.375rem' }}>
                        <input type="checkbox" disabled={isAdminRole} checked={allOn} onChange={() => toggleRow(m.key, !allOn)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#78716c', marginBottom: '0.5rem' }}>Permissões especiais</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1.25rem' }}>
            {VIRTUAL.map(v => (
              <label key={`${v.module}.${v.action}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 8, background: perms.get(key(v.module, v.action)) ? '#ecfccb' : '#fafaf9', cursor: isAdminRole ? 'default' : 'pointer' }}>
                <input type="checkbox" disabled={isAdminRole} checked={!!perms.get(key(v.module, v.action))} onChange={() => toggle(v.module, v.action)} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{v.label}</span>
              </label>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button onClick={onClose} className="btn-ghost">Cancelar</button>
            <button onClick={save} disabled={saving || isAdminRole} className="btn-primary">{saving ? 'A guardar...' : 'Guardar'}</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function CreateRoleModal({ tenantId, existingRoles, onClose, onSaved }: { tenantId: string; existingRoles: Role[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [keyVal, setKeyVal] = useState('')
  const [description, setDescription] = useState('')
  const [duplicateFrom, setDuplicateFrom] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSaving(true)
    const { data: newId, error: err } = await (supabase.rpc as any)('admin_upsert_role', {
      p_tenant_id: tenantId, p_role_id: null, p_key: keyVal.trim(), p_name: name.trim(), p_description: description.trim() || null
    })
    if (err) { setError(err.message); setSaving(false); return }

    if (duplicateFrom) {
      const { data: srcPerms } = await (supabase.rpc as any)('admin_list_role_permissions', { p_role_id: duplicateFrom })
      for (const p of (srcPerms ?? []) as Permission[]) {
        await (supabase.rpc as any)('admin_set_role_permission', { p_role_id: newId, p_module_key: p.module_key, p_action: p.action, p_allowed: p.allowed })
      }
    }

    setSaving(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title="Novo Role">
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <label className="text-label">Nome</label>
          <input required value={name} onChange={e => { setName(e.target.value); if (!keyVal) setKeyVal(e.target.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/(^_|_$)/g,'')) }} placeholder="Encarregado" className="input-field" />
        </div>
        <div>
          <label className="text-label">Chave técnica (a-z, 0-9, _)</label>
          <input required value={keyVal} onChange={e => setKeyVal(e.target.value)} placeholder="encarregado" className="input-field" pattern="^[a-z0-9_]{2,32}$" />
        </div>
        <div>
          <label className="text-label">Descrição (opcional)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Responsável de campo" className="input-field" />
        </div>
        <div>
          <label className="text-label">Duplicar permissões de (opcional)</label>
          <select value={duplicateFrom} onChange={e => setDuplicateFrom(e.target.value)} className="input-field">
            <option value="">— Vazio —</option>
            {existingRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {error && <p style={{ color: 'var(--error)', fontSize: '0.8125rem' }}>{error}</p>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'A criar...' : 'Criar'}</button>
        </div>
      </form>
    </Modal>
  )
}
