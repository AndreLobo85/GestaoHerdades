import type { ReactNode } from 'react'

interface Props {
  icon: string
  title: string
  description: string
  action?: ReactNode
}

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 bg-surface-container rounded-3xl flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">{icon}</span>
      </div>
      <h3 className="text-xl font-headline font-bold mb-2">{title}</h3>
      <p className="text-on-surface-variant text-sm mb-6 max-w-sm">{description}</p>
      {action}
    </div>
  )
}
