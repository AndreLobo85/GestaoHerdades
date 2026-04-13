import { useState, useRef } from 'react'
import Modal from './ui/Modal'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Props {
  open: boolean
  onClose: () => void
}

export default function UserProfileModal({ open, onClose }: Props) {
  const { user, profile, updateProfile, updatePassword, signOut } = useAuth()
  const [tab, setTab] = useState<'profile' | 'password'>('profile')
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const avatarUrl = profile?.avatar_url
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    setMsg(null)

    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      // Bucket might not exist, try creating it
      if (uploadError.message.includes('not found') || uploadError.message.includes('Bucket')) {
        setMsg({ type: 'err', text: 'Bucket "avatars" nao existe. Crie-o no Supabase Dashboard > Storage.' })
      } else {
        setMsg({ type: 'err', text: uploadError.message })
      }
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const { error } = await updateProfile({ avatar_url: urlData.publicUrl })

    if (error) {
      setMsg({ type: 'err', text: error })
    } else {
      setMsg({ type: 'ok', text: 'Foto atualizada com sucesso!' })
    }
    setUploading(false)
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setMsg(null)
    const { error } = await updateProfile({ full_name: fullName })
    if (error) {
      setMsg({ type: 'err', text: error })
    } else {
      setMsg({ type: 'ok', text: 'Perfil atualizado com sucesso!' })
    }
    setSaving(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (newPass.length < 6) {
      setMsg({ type: 'err', text: 'A password deve ter pelo menos 6 caracteres.' })
      return
    }
    if (newPass !== confirmPass) {
      setMsg({ type: 'err', text: 'As passwords nao coincidem.' })
      return
    }
    setSaving(true)
    const { error } = await updatePassword(newPass)
    if (error) {
      setMsg({ type: 'err', text: error })
    } else {
      setMsg({ type: 'ok', text: 'Password alterada com sucesso!' })
      setNewPass('')
      setConfirmPass('')
    }
    setSaving(false)
  }

  const handleRemoveAvatar = async () => {
    setMsg(null)
    const { error } = await updateProfile({ avatar_url: null })
    if (error) setMsg({ type: 'err', text: error })
    else setMsg({ type: 'ok', text: 'Foto removida.' })
  }

  return (
    <Modal open={open} onClose={onClose} title="O Meu Perfil">
      {/* Avatar + name header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.5rem', fontWeight: 700, fontFamily: "'Manrope', sans-serif" }}>
              {initials}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ position: 'absolute', bottom: -4, right: -4, width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{uploading ? 'hourglass_top' : 'photo_camera'}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1.125rem', fontFamily: "'Manrope', sans-serif" }}>{profile?.full_name || 'Utilizador'}</p>
          <p style={{ fontSize: '0.75rem', color: '#78716c' }}>{user?.email}</p>
          <span className={profile?.role === 'admin' ? 'badge-brown' : 'badge-green'} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
            {profile?.role || 'utilizador'}
          </span>
        </div>
      </div>

      {avatarUrl && (
        <button onClick={handleRemoveAvatar} style={{ fontSize: '0.75rem', color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
          Remover foto
        </button>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button onClick={() => { setTab('profile'); setMsg(null) }}
          className={tab === 'profile' ? 'btn-primary' : 'btn-ghost'}
          style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
          Dados Pessoais
        </button>
        <button onClick={() => { setTab('password'); setMsg(null) }}
          className={tab === 'password' ? 'btn-primary' : 'btn-ghost'}
          style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem 1rem', fontSize: '0.8125rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span>
          Password
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: 500,
          background: msg.type === 'ok' ? 'var(--secondary-container)' : '#ffdad6',
          color: msg.type === 'ok' ? 'var(--secondary-on)' : '#93000a',
          display: 'flex', alignItems: 'center', gap: '0.5rem'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{msg.type === 'ok' ? 'check_circle' : 'error'}</span>
          {msg.text}
        </div>
      )}

      {/* Profile tab */}
      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Nome Completo</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="O seu nome" className="input-field" />
          </div>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Email</label>
            <input value={user?.email ?? ''} disabled className="input-field" style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Role</label>
            <input value={profile?.role ?? 'utilizador'} disabled className="input-field" style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button onClick={onClose} className="btn-ghost">Cancelar</button>
            <button onClick={handleSaveProfile} className="btn-primary" disabled={saving}
              style={{ padding: '0.75rem 1.25rem', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'A guardar...' : 'Guardar Alteracoes'}
            </button>
          </div>
        </div>
      )}

      {/* Password tab */}
      {tab === 'password' && (
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Nova Password</label>
            <input type="password" required minLength={6} value={newPass} onChange={e => setNewPass(e.target.value)}
              placeholder="Minimo 6 caracteres" className="input-field" autoComplete="new-password" />
          </div>
          <div>
            <label className="text-label" style={{ display: 'block', marginBottom: 4, marginLeft: 4 }}>Confirmar Password</label>
            <input type="password" required value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              placeholder="Repita a password" className="input-field" autoComplete="new-password" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}
              style={{ padding: '0.75rem 1.25rem', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'A alterar...' : 'Alterar Password'}
            </button>
          </div>
        </form>
      )}

      {/* Logout */}
      <div style={{ borderTop: '1px solid var(--surface-mid)', marginTop: '1.5rem', paddingTop: '1rem' }}>
        <button onClick={() => { signOut(); onClose() }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          Terminar Sessao
        </button>
      </div>
    </Modal>
  )
}
