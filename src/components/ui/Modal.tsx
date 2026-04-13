import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  wide?: boolean
}

export default function Modal({ open, onClose, title, children, wide }: Props) {
  useEffect(() => {
    if (open) { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = '' } }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{
        position: 'relative', background: 'white', borderRadius: '1.5rem',
        boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.06)',
        width: '100%', maxWidth: wide ? 560 : 460, maxHeight: '90vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        animation: 'modalIn 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.5rem 2rem', borderBottom: '1px solid #f2f4f3',
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif", color: '#191c1c' }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#f2f4f3',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e1e3e2')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f2f4f3')}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#78716c' }}>close</span>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem 2rem 2rem', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
