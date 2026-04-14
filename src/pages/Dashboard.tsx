import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import XLSX from 'xlsx-js-style'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/export'
import type { Activity } from '../types/database'

interface Stats {
  employees: number
  hoursThisMonth: number
  fuelThisMonth: number
  feedLogsThisMonth: number
  activitiesThisMonth: number
  expensesThisMonth: number
}

interface QuickAction {
  label: string
  icon: string
  to: string
  color: string
  bg: string
}

export default function Dashboard() {
  const nowDate = new Date()
  const [year, setYear] = useState(nowDate.getFullYear())
  const [month, setMonth] = useState(nowDate.getMonth() + 1)
  const [stats, setStats] = useState<Stats>({ employees: 0, hoursThisMonth: 0, fuelThisMonth: 0, feedLogsThisMonth: 0, activitiesThisMonth: 0, expensesThisMonth: 0 })
  const [recent, setRecent] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState<string | null>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)

  const som = `${year}-${String(month).padStart(2, '0')}-01`
  const eom = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const prevMonth = () => { if (month === 1) { setYear(year - 1); setMonth(12) } else setMonth(month - 1) }
  const nextMonth = () => {
    const isCurrentMonth = month === nowDate.getMonth() + 1 && year === nowDate.getFullYear()
    if (isCurrentMonth) return
    if (month === 12) { setYear(year + 1); setMonth(1) } else setMonth(month + 1)
  }
  const isCurrentMonth = month === nowDate.getMonth() + 1 && year === nowDate.getFullYear()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [emp, act, fuel, feed, rec, expenses, genExpenses] = await Promise.all([
        supabase.from('employees').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('activities').select('hours').gte('date', som).lt('date', eom),
        supabase.from('fuel_logs').select('liters').gte('date', som).lt('date', eom),
        supabase.from('feed_logs').select('id', { count: 'exact', head: true }).gte('date', som).lt('date', eom),
        supabase.from('activities').select('*, employee:employees(*), activity_type:activity_types(*)').gte('date', som).lt('date', eom).order('date', { ascending: false }).limit(5),
        supabase.from('expenses').select('invoice_amount').gte('date', som).lt('date', eom),
        supabase.from('general_expenses').select('invoice_amount').gte('date', som).lt('date', eom),
      ])
      const actData = (act.data as any[] ?? [])
      const fuelData = (fuel.data as any[] ?? [])
      const expData = (expenses.data as any[] ?? [])
      const genExpData = (genExpenses.data as any[] ?? [])
      const totalExpenses =
        expData.reduce((s: number, e: any) => s + (e.invoice_amount || 0), 0) +
        genExpData.reduce((s: number, e: any) => s + (e.invoice_amount || 0), 0)
      setStats({
        employees: emp.count ?? 0,
        hoursThisMonth: actData.reduce((s: number, a: any) => s + (a.hours || 0), 0),
        fuelThisMonth: fuelData.reduce((s: number, f: any) => s + (f.liters || 0), 0),
        feedLogsThisMonth: feed.count ?? 0,
        activitiesThisMonth: actData.length,
        expensesThisMonth: totalExpenses,
      })
      setRecent((rec.data as Activity[]) ?? [])
      setLoading(false)
    }
    load()
  }, [year, month, som, eom])

  // ── Excel Export Engine ──────────────────────────────
  const thin = { style: 'thin', color: { rgb: 'D9D9D9' } }
  const borders = { top: thin, bottom: thin, left: thin, right: thin }

  interface TabTheme { primary: string; light: string; accent: string; icon: string }
  const themes: Record<string, TabTheme> = {
    resumo:   { primary: '1D6F42', light: 'E8F5E9', accent: '155C35', icon: '📊' },
    atividades: { primary: '3A6843', light: 'ECFCCB', accent: '2D5233', icon: '⏱️' },
    gasoleo:  { primary: '793C00', light: 'FFF7ED', accent: '5C2D00', icon: '⛽' },
    alimentacao: { primary: '365314', light: 'F0FDF4', accent: '2A4010', icon: '🐄' },
    despVeic: { primary: '6366F1', light: 'EEF2FF', accent: '4F46E5', icon: '🚗' },
    despGeral: { primary: '78350F', light: 'FEF3C7', accent: '5C2808', icon: '💰' },
  }

  function buildSheet(title: string, period: string, headers: string[], rows: any[][], colWidths: number[], totalCol: number | undefined, theme: TabTheme) {
    const numCols = headers.length
    // Row layout: 0=banner, 1=title, 2=subtitle, 3=blank, 4=headers, 5..N=data, N+1=total
    const aoa: any[][] = [
      [theme.icon + '  ' + title.toUpperCase()],
      ['Relatorio Mensal — ' + title],
      ['Periodo: ' + period + '  |  Registos: ' + rows.length + (totalCol !== undefined ? '  |  Total: ' + rows.reduce((s, r) => s + (Number(r[totalCol]) || 0), 0).toFixed(1) : '')],
      [],
      headers,
      ...rows,
    ]
    if (totalCol !== undefined && rows.length > 0) {
      const totalRow: any[] = headers.map(() => '')
      totalRow[0] = 'TOTAL'
      totalRow[totalCol] = rows.reduce((s, r) => s + (Number(r[totalCol]) || 0), 0)
      aoa.push(totalRow)
    }

    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = colWidths.map(w => ({ wch: w }))
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } },
    ]

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[addr]) ws[addr] = { v: '', t: 's' }
        const cell = ws[addr]

        if (R === 0) {
          // Banner row — dark colored background
          cell.s = { font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: theme.primary } }, alignment: { horizontal: 'left', vertical: 'center' }, border: {} }
        } else if (R === 1) {
          // Title row
          cell.s = { font: { bold: true, sz: 11, color: { rgb: theme.primary } }, fill: { fgColor: { rgb: theme.light } }, alignment: { horizontal: 'left', vertical: 'center' } }
        } else if (R === 2) {
          // Subtitle/stats row
          cell.s = { font: { sz: 9, color: { rgb: '888888' } }, fill: { fgColor: { rgb: theme.light } }, alignment: { horizontal: 'left', vertical: 'center' } }
        } else if (R === 3) {
          // Blank separator
          cell.s = { fill: { fgColor: { rgb: 'FFFFFF' } } }
        } else if (R === 4) {
          // Header row
          cell.s = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: theme.primary } }, alignment: { horizontal: 'center', vertical: 'center' }, border: borders }
        } else if (totalCol !== undefined && R === range.e.r && rows.length > 0) {
          // Total row
          const isValueCol = C === totalCol
          cell.s = {
            font: { bold: true, sz: isValueCol ? 12 : 10, color: { rgb: theme.primary } },
            fill: { fgColor: { rgb: theme.light } },
            border: { top: { style: 'medium', color: { rgb: theme.primary } }, bottom: { style: 'double', color: { rgb: theme.primary } }, left: thin, right: thin },
            alignment: { horizontal: isValueCol || C === 0 ? 'right' : 'center', vertical: 'center' },
          }
        } else if (R > 4) {
          // Data rows — alternating colors
          const dataIdx = R - 5
          const isAlt = dataIdx % 2 === 1
          const isNum = typeof rows[dataIdx]?.[C] === 'number'
          cell.s = {
            font: { sz: 10, bold: isNum, color: { rgb: isNum ? '333333' : '555555' } },
            fill: { fgColor: { rgb: isAlt ? 'F7F7F7' : 'FFFFFF' } },
            border: borders,
            alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
          }
        }
      }
    }

    // Row heights
    ws['!rows'] = [{ hpt: 32 }, { hpt: 22 }, { hpt: 18 }, { hpt: 6 }, { hpt: 26 }]
    return ws
  }

  function buildResumoSheet(period: string, kpis: { label: string; value: string; theme: TabTheme }[]) {
    const ws = XLSX.utils.aoa_to_sheet([
      ['📊  GESTAO AGRICOLA — RESUMO MENSAL'],
      ['AgroPrecision — Relatorio Automatico'],
      ['Periodo: ' + period],
      [],
      ['INDICADOR', 'VALOR'],
      ...kpis.map(k => [k.label, k.value]),
      [],
      ['Gerado automaticamente em ' + new Date().toLocaleString('pt-PT')],
    ])

    ws['!cols'] = [{ wch: 32 }, { wch: 20 }]
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
      { s: { r: kpis.length + 6, c: 0 }, e: { r: kpis.length + 6, c: 1 } },
    ]

    const t = themes.resumo
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[addr]) ws[addr] = { v: '', t: 's' }
        if (R === 0) ws[addr].s = { font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: t.primary } }, alignment: { horizontal: 'left', vertical: 'center' } }
        else if (R === 1) ws[addr].s = { font: { bold: true, sz: 11, color: { rgb: t.primary } }, fill: { fgColor: { rgb: t.light } }, alignment: { horizontal: 'left' } }
        else if (R === 2) ws[addr].s = { font: { sz: 9, color: { rgb: '888888' } }, fill: { fgColor: { rgb: t.light } } }
        else if (R === 4) ws[addr].s = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: t.primary } }, alignment: { horizontal: 'center', vertical: 'center' }, border: borders }
        else if (R > 4 && R <= 4 + kpis.length) {
          const kpi = kpis[R - 5]
          if (C === 0) ws[addr].s = { font: { sz: 11, bold: true, color: { rgb: '333333' } }, fill: { fgColor: { rgb: kpi.theme.light } }, border: borders, alignment: { vertical: 'center' } }
          else ws[addr].s = { font: { sz: 13, bold: true, color: { rgb: kpi.theme.primary } }, fill: { fgColor: { rgb: kpi.theme.light } }, border: borders, alignment: { horizontal: 'right', vertical: 'center' } }
        } else if (R === kpis.length + 6) {
          ws[addr].s = { font: { sz: 8, italic: true, color: { rgb: 'AAAAAA' } }, alignment: { horizontal: 'center' } }
        }
      }
    }

    ws['!rows'] = [{ hpt: 36 }, { hpt: 22 }, { hpt: 18 }, { hpt: 10 }, { hpt: 26 }]
    for (let i = 0; i < kpis.length; i++) (ws['!rows'] as any[]).push({ hpt: 28 })
    return ws
  }

  const handleExport = async (mode: 'month' | 'year' | 'all') => {
    setExporting(mode)
    let dateFrom: string
    let dateTo: string
    let period: string
    const capMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
    if (mode === 'month') {
      dateFrom = som
      dateTo = eom
      period = `${capMonth} ${year}`
    } else if (mode === 'year') {
      dateFrom = `${year}-01-01`
      dateTo = `${year + 1}-01-01`
      period = `Ano ${year} (Jan–Dez)`
    } else {
      dateFrom = '2000-01-01'
      dateTo = '2099-01-01'
      period = 'Todos os dados'
    }

    // Fetch all data for the selected range + activities
    const [actRes, fuelRes, feedRes, expensesRes, genExpRes] = await Promise.all([
      supabase.from('activities').select('*, employee:employees(*), activity_type:activity_types(*)').gte('date', dateFrom).lt('date', dateTo).order('date', { ascending: false }),
      supabase.from('fuel_logs').select('*, vehicle:vehicles(*)').gte('date', dateFrom).lt('date', dateTo).order('date', { ascending: false }),
      supabase.from('feed_logs').select('*, feed_item:feed_items(*)').gte('date', dateFrom).lt('date', dateTo).order('date', { ascending: false }),
      supabase.from('expenses').select('*, vehicle:vehicles(*)').gte('date', dateFrom).lt('date', dateTo).order('date', { ascending: false }),
      supabase.from('general_expenses').select('*, category:expense_categories(*)').gte('date', dateFrom).lt('date', dateTo).order('date', { ascending: false }),
    ])
    const exportActivities = actRes.data ?? []

    const fuelData = fuelRes.data ?? []
    const feedData = feedRes.data ?? []
    const expData = expensesRes.data ?? []
    const genData = genExpRes.data ?? []

    const totalHours = exportActivities.reduce((s: number, a: any) => s + (a.hours || 0), 0)
    const totalFuel = fuelData.reduce((s: number, f: any) => s + (f.liters || 0), 0)
    const totalExpV = expData.reduce((s: number, e: any) => s + (e.invoice_amount || 0), 0)
    const totalExpG = genData.reduce((s: number, e: any) => s + (e.invoice_amount || 0), 0)

    const wb = XLSX.utils.book_new()

    // Tab 0: Resumo
    XLSX.utils.book_append_sheet(wb, buildResumoSheet(period, [
      { label: 'Horas de Trabalho', value: totalHours.toFixed(1) + 'h', theme: themes.atividades },
      { label: 'Atividades Registadas', value: String(exportActivities.length), theme: themes.atividades },
      { label: 'Gasoleo Consumido', value: totalFuel.toFixed(0) + ' L', theme: themes.gasoleo },
      { label: 'Registos Alimentacao', value: String(feedData.length), theme: themes.alimentacao },
      { label: 'Despesas Veiculos', value: totalExpV.toFixed(2) + ' €', theme: themes.despVeic },
      { label: 'Despesas Gerais', value: totalExpG.toFixed(2) + ' €', theme: themes.despGeral },
      { label: 'Total Despesas', value: (totalExpV + totalExpG).toFixed(2) + ' €', theme: themes.resumo },
    ]), 'Resumo')

    // Tab 1: Atividades
    XLSX.utils.book_append_sheet(wb, buildSheet('Atividades', period,
      ['Data', 'Funcionario', 'Atividade', 'Horas', 'Descricao'],
      exportActivities.map((a: any) => [formatDate(a.date), a.employee?.name ?? '', a.activity_type?.name ?? '', a.hours, a.description ?? '']),
      [14, 24, 18, 10, 38], 3, themes.atividades
    ), 'Atividades')

    // Tab 2: Gasoleo
    XLSX.utils.book_append_sheet(wb, buildSheet('Consumo de Gasoleo', period,
      ['Data', 'Veiculo', 'Tipo', 'KM/Horas', 'Litros', 'Notas'],
      fuelData.map((f: any) => [formatDate(f.date), f.vehicle ? `${f.vehicle.brand} ${f.vehicle.model}` : '', f.fuel_type, f.hours_or_km, f.liters, f.notes ?? '']),
      [14, 24, 14, 12, 10, 32], 4, themes.gasoleo
    ), 'Gasoleo')

    // Tab 3: Alimentacao
    XLSX.utils.book_append_sheet(wb, buildSheet('Alimentacao Animal', period,
      ['Data', 'Item', 'Quantidade', 'Unidade', 'Notas'],
      feedData.map((f: any) => [formatDate(f.date), f.feed_item?.name ?? '', f.quantity, f.feed_item?.unit ?? '', f.notes ?? '']),
      [14, 26, 14, 12, 32], 2, themes.alimentacao
    ), 'Alimentacao')

    // Tab 4: Despesas Veiculos
    XLSX.utils.book_append_sheet(wb, buildSheet('Despesas de Veiculos', period,
      ['Data', 'Veiculo', 'KM', 'Descricao', 'N Fatura', 'Valor (EUR)'],
      expData.map((e: any) => [formatDate(e.date), e.vehicle ? `${e.vehicle.brand} ${e.vehicle.model}` : '', e.km, e.description, e.invoice_number, e.invoice_amount]),
      [14, 24, 10, 30, 16, 14], 5, themes.despVeic
    ), 'Despesas Veiculos')

    // Tab 5: Despesas Gerais
    XLSX.utils.book_append_sheet(wb, buildSheet('Despesas Gerais', period,
      ['Data', 'Categoria', 'Descricao', 'N Fatura', 'Valor (EUR)'],
      genData.map((e: any) => [formatDate(e.date), e.category?.name ?? '', e.description, e.invoice_number, e.invoice_amount]),
      [14, 20, 30, 16, 14], 4, themes.despGeral
    ), 'Despesas Gerais')

    const fileSuffix = mode === 'month' ? `${year}-${String(month).padStart(2, '0')}` : mode === 'year' ? `${year}` : 'completo'
    XLSX.writeFile(wb, `gestao_herdades_${fileSuffix}.xlsx`)
    setTimeout(() => setExporting(null), 1500)
  }

  const monthName = new Date(year, month - 1).toLocaleDateString('pt-PT', { month: 'long' })
  const yearStr = year

  const quickActions: QuickAction[] = [
    { label: 'Registar Atividade', icon: 'add_task', to: '/atividades', color: '#3a6843', bg: '#ecfccb' },
    { label: 'Registar Gasoleo', icon: 'local_gas_station', to: '/gasoleo', color: '#793c00', bg: '#fff7ed' },
    { label: 'Alimentacao', icon: 'pets', to: '/alimentacao', color: '#365314', bg: '#f0fdf4' },
    { label: 'Despesas', icon: 'receipt_long', to: '/despesas', color: '#78350f', bg: '#fef3c7' },
  ]

  const typeColors: Record<string, string> = {
    Vinha: '#7c3aed', Montado: '#3a6843', Animais: '#b45309', Olival: '#65a30d',
    Reparacoes: '#6366f1', Outros: '#78716c',
  }

  return (
    <div>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: '0.25rem' }}>Painel de Operacoes</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: 'var(--surface-low)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e5e5e5')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-low)')}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_left</span>
            </button>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)', letterSpacing: '-0.02em', minWidth: 200, textAlign: 'center' }}>
              {monthName.charAt(0).toUpperCase() + monthName.slice(1)} {yearStr}
            </h1>
            <button onClick={nextMonth} disabled={isCurrentMonth}
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: isCurrentMonth ? 'transparent' : 'var(--surface-low)', cursor: isCurrentMonth ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', opacity: isCurrentMonth ? 0.25 : 1 }}
              onMouseEnter={e => { if (!isCurrentMonth) e.currentTarget.style.background = '#e5e5e5' }} onMouseLeave={e => { if (!isCurrentMonth) e.currentTarget.style.background = 'var(--surface-low)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>chevron_right</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }} className="stats-grid">
        {[
          { label: 'Horas Registadas', value: loading ? '...' : `${stats.hoursThisMonth}h`, icon: 'schedule', color: '#3a6843', bg: '#ecfccb', sub: `${stats.activitiesThisMonth} atividades` },
          { label: 'Gasoleo Consumido', value: loading ? '...' : `${stats.fuelThisMonth.toFixed(0)}L`, icon: 'local_gas_station', color: '#793c00', bg: '#fff7ed', sub: 'este mes' },
          { label: 'Alimentacao', value: loading ? '...' : `${stats.feedLogsThisMonth}`, icon: 'pets', color: '#365314', bg: '#f0fdf4', sub: 'registos este mes' },
          { label: 'Despesas', value: loading ? '...' : `${stats.expensesThisMonth.toFixed(0)}€`, icon: 'receipt_long', color: '#78350f', bg: '#fef3c7', sub: 'este mes' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '1.25rem', display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
            <div style={{ width: 36, height: 36, borderRadius: '0.625rem', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#a8a29e', marginBottom: '0.25rem' }}>{s.label}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", color: 'var(--on-surface)', lineHeight: 1.1 }}>{s.value}</h3>
              <p style={{ fontSize: '0.6875rem', color: '#a8a29e', marginTop: '0.125rem' }}>{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid: Recent + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.25rem' }} className="bottom-grid">
        {/* Recent activities */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>Registos Recentes</h2>
            <Link to="/atividades" style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Ver tudo <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </Link>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            {recent.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {recent.map((a, idx) => {
                  const tc = typeColors[a.activity_type?.name ?? ''] ?? '#78716c'
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', borderBottom: idx < recent.length - 1 ? '1px solid #f5f5f4' : 'none' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: tc, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '0.8125rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.activity_type?.name} <span style={{ color: '#a8a29e', fontWeight: 400 }}>—</span> <span style={{ fontWeight: 400, color: '#78716c' }}>{a.employee?.name}</span>
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#a8a29e', flexShrink: 0, whiteSpace: 'nowrap' }}>{formatDate(a.date)}</span>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--on-surface)', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>{a.hours}h</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '2.5rem', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#d6d3d1' }}>history</span>
                <p style={{ fontSize: '0.8125rem', color: '#a8a29e', marginTop: '0.5rem' }}>Sem registos recentes</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar: Quick actions + Export */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Quick actions */}
          <div>
            <h3 style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8a29e', marginBottom: '0.625rem' }}>Acoes Rapidas</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {quickActions.map(qa => (
                <Link key={qa.label} to={qa.to} style={{
                  display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.625rem 0.75rem',
                  borderRadius: '0.75rem', textDecoration: 'none', color: 'var(--on-surface)',
                  background: 'white', border: '1px solid #f0eeec', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = qa.bg; e.currentTarget.style.borderColor = qa.bg }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#f0eeec' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '0.5rem', background: qa.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16, color: qa.color }}>{qa.icon}</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{qa.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Export */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setExportMenuOpen(!exportMenuOpen)} disabled={loading || !!exporting}
              style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
                padding: '1.25rem', borderRadius: '1rem', border: 'none', cursor: loading ? 'wait' : 'pointer',
                width: '100%', transition: 'all 0.2s',
                background: exporting ? '#d4edda' : '#1d6f42',
                color: 'white',
              }}
              onMouseEnter={e => { if (!exporting) e.currentTarget.style.background = '#175c37' }}
              onMouseLeave={e => { if (!exporting) e.currentTarget.style.background = '#1d6f42' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Exportar Dados</p>
              <h3 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif", color: exporting ? '#1d6f42' : 'white' }}>
                {exporting ? 'Exportado!' : 'Export'}
              </h3>
              <p style={{ fontSize: '0.6875rem', color: exporting ? '#1d6f42' : 'rgba(255,255,255,0.5)', marginTop: '0.125rem' }}>
                {exporting ? 'Ficheiro transferido' : 'Excel · Clique para opcoes'}
              </p>
            </button>
            {/* Dropdown menu */}
            {exportMenuOpen && (
              <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '0.5rem', background: 'white', borderRadius: '0.875rem', boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)', border: '1px solid #f0eeec', overflow: 'hidden', zIndex: 10 }}>
                <div style={{ padding: '0.625rem 0.875rem', borderBottom: '1px solid #f5f5f4' }}>
                  <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a8a29e' }}>Exportar como Excel</p>
                </div>
                {[
                  { label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${yearStr}`, sub: 'Mes selecionado', icon: 'calendar_month', mode: 'month' as const },
                  { label: `Ano ${yearStr}`, sub: 'Janeiro a Dezembro', icon: 'date_range', mode: 'year' as const },
                  { label: 'Todos os dados', sub: 'Desde o inicio', icon: 'database', mode: 'all' as const },
                ].map(opt => (
                  <button key={opt.mode} onClick={() => { setExportMenuOpen(false); handleExport(opt.mode) }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.75rem 0.875rem', width: '100%', border: 'none', background: 'white', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                    <div style={{ width: 30, height: 30, borderRadius: '0.5rem', background: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#1d6f42' }}>{opt.icon}</span>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-surface)' }}>{opt.label}</p>
                      <p style={{ fontSize: '0.5625rem', color: '#a8a29e' }}>{opt.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Team count */}
          <div style={{ background: 'var(--primary)', borderRadius: '1rem', padding: '1.25rem', color: 'white' }}>
            <p style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', marginBottom: '0.25rem' }}>Equipa Ativa</p>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, fontFamily: "'Manrope', sans-serif" }}>{loading ? '...' : stats.employees}</h3>
            <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.125rem' }}>funcionarios</p>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .bottom-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 639px) {
          .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
