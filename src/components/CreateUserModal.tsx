import { useState, useEffect } from 'react'
import Modal from './ui/Modal'
import { supabase } from '../lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  tenantId: string
  tenantName: string
}

interface RoleOpt { id: string; key: string; name: string; is_system: boolean }

export default function CreateUserModal({ open, onClose, onSaved, tenantId, tenantName }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roles, setRoles] = useState<RoleOpt[]>([])
  const [roleId, setRoleId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    ;(async () => {
      const { data } = await (supabase.rpc as any)('admin_list_tenant_roles', { p_tenant_id: tenantId })
      const opts = (data as RoleOpt[] | null) ?? []
      setRoles(opts)
      // Default to utilizador if exists
      const def = opts.find(r => r.key === 'utilizador') ?? opts[0]
      if (def) setRoleId(def.id)
    })()
  }, [open, tenantId])

  const selectedRole = roles.find(r => r.id === roleId)
  const isAdminRole = selectedRole?.key === 'admin'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSaving(true)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, data: { full_name: fullName } })
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setError(result.error?.message || result.msg || 'Erro ao criar utilizador')
        setSaving(false); return
      }
      const userId = result.id ?? result.user?.id
      if (!userId) {
        setError('Nao foi possivel obter ID do utilizador criado')
        setSaving(false); return
      }
      // Wait for profile trigger
      await new Promise(r => setTimeout(r, 1500))
      await supabase.from('profiles').update({ full_name: fullName, email, status: 'active' } as never).eq('id', userId)

      // Associate to tenant via RPC (works for tenant admin + platform admin)
      const { error: rpcErr } = await (supabase.rpc as any)('tenant_add_user', { p_tenant_id: tenantId, p_email: email, p_role: selectedRole?.key ?? 'utilizador', p_role_id: roleId || null })
      if (rpcErr) {
        setError('Utilizador criado, mas falhou associação à herdade: ' + rpcErr.message)
        setSaving(false); return
      }
    } catch {
      setError('Erro de rede ao criar utilizador')
      setSaving(false); return
    }

    setFullName(''); setEmail(''); setPassword('')
    setSaving(false); onSaved()
  }

  const initials = fullName ? fullName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) : ''

  return (
    <Modal open={open} onClose={onClose} title={`Novo Utilizador — ${tenantName}`} wide>
      <form onSubmit={handleSubmit}>
        {error && (
          <div style={{ background: '#ffdad6', color: '#93000a', padding: '0.875rem 1.25rem', borderRadius: '0.875rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>error</span>{error}
          </div>
        )}

        <div style={{ background: 'linear-gradient(135deg, #f2f4f3 0%, #e6e9e8 100%)', borderRadius: '1.25rem', padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: fullName ? (isAdminRole ? '#793c00' : '#365314') : '#a8a29e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1rem' }}>
            {initials || <span className="material-symbols-outlined">person_add</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 800, fontSize: '0.9375rem' }}>{fullName || 'Novo Utilizador'}</p>
            <p style={{ fontSize: '0.75rem', color: '#78716c' }}>{email || 'email@exemplo.com'}</p>
            <span style={{ display: 'inline-block', marginTop: '0.25rem', fontSize: '0.625rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: isAdminRole ? '#fff7ed' : '#ecfccb', color: isAdminRole ? '#793c00' : '#365314' }}>
              {(selectedRole?.name ?? '—').toUpperCase()}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div>
            <label className="text-label">Nome Completo</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ana Silva" className="input-field" />
          </div>
          <div>
            <label className="text-label">Role</label>
            <select required value={roleId} onChange={e => setRoleId(e.target.value)} className="input-field">
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}{r.is_system ? '' : ' (custom)'}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label className="text-label">Email</label>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" className="input-field" />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="text-label">Password (mínimo 6 caracteres)</label>
          <input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className="input-field" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'A criar...' : 'Criar Utilizador'}</button>
        </div>
      </form>
    </Modal>
  )
}
