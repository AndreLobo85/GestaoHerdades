import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

interface Props {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}

export default function MonthSelector({ year, month, onChange }: Props) {
  const prev = () => {
    if (month === 1) onChange(year - 1, 12)
    else onChange(year, month - 1)
  }
  const next = () => {
    if (month === 12) onChange(year + 1, 1)
    else onChange(year, month + 1)
  }

  const label = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: pt })

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prev}
        className="p-2 hover:bg-surface-container rounded-full transition-colors"
      >
        <span className="material-symbols-outlined">chevron_left</span>
      </button>
      <span className="text-xl font-headline font-bold capitalize min-w-[180px] text-center">
        {label}
      </span>
      <button
        onClick={next}
        className="p-2 hover:bg-surface-container rounded-full transition-colors"
      >
        <span className="material-symbols-outlined">chevron_right</span>
      </button>
    </div>
  )
}
