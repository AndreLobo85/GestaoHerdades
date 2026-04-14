import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import type {
  Employee, ActivityType, Activity, Vehicle, FuelLog, FeedItem, FeedLog, ExpenseCategory, GeneralExpense, Product, StockMovement
} from '../types/database'

// I = Insert type (defaults to row without id/created_at for backwards compat)
function useSupabaseTable<T extends { id: string }, I = Omit<T, 'id' | 'created_at'>>(
  table: string,
  orderBy: string = 'created_at',
  ascending: boolean = false
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy, { ascending })
    if (!error && rows) setData(rows as T[])
    setLoading(false)
  }, [table, orderBy, ascending])

  useEffect(() => { fetch() }, [fetch])

  const insert = async (row: I) => {
    const { error } = await supabase.from(table).insert(row as never)
    if (!error) await fetch()
    return error
  }

  const update = async (id: string, updates: Partial<I>) => {
    const { error } = await supabase.from(table).update(updates as never).eq('id', id)
    if (!error) await fetch()
    return error
  }

  const remove = async (id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) await fetch()
    return error
  }

  return { data, loading, fetch, insert, update, remove }
}

export function useEmployees() {
  return useSupabaseTable<Employee>('employees', 'name', true)
}

export function useActivityTypes() {
  return useSupabaseTable<ActivityType>('activity_types', 'name', true)
}

export function useActivities() {
  const base = useSupabaseTable<Activity>('activities', 'date', false)

  const fetchByMonth = useCallback(async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('activities')
      .select('*, employee:employees(*), activity_type:activity_types(*)')
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })

    if (!error && data) return data as Activity[]
    return []
  }, [])

  return { ...base, fetchByMonth }
}

export function useVehicles() {
  return useSupabaseTable<Vehicle>('vehicles', 'brand', true)
}

export function useFuelLogs() {
  const base = useSupabaseTable<FuelLog>('fuel_logs', 'date', false)

  const fetchByMonth = useCallback(async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('fuel_logs')
      .select('*, vehicle:vehicles(*)')
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })

    if (!error && data) return data as FuelLog[]
    return []
  }, [])

  return { ...base, fetchByMonth }
}

type FeedItemInsert = Omit<FeedItem, 'id' | 'product'>

export function useFeedItems() {
  return useSupabaseTable<FeedItem, FeedItemInsert>('feed_items', 'name', true)
}

export function useFeedLogs() {
  const base = useSupabaseTable<FeedLog>('feed_logs', 'date', false)

  const fetchByMonth = useCallback(async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('feed_logs')
      .select('*, feed_item:feed_items(*), product:products(*)')
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })

    if (!error && data) return data as FeedLog[]
    return []
  }, [])

  return { ...base, fetchByMonth }
}

export function useExpenseCategories() {
  return useSupabaseTable<ExpenseCategory>('expense_categories', 'position', true)
}

export function useGeneralExpenses() {
  return useSupabaseTable<GeneralExpense>('general_expenses', 'date', false)
}

export function useProducts() {
  return useSupabaseTable<Product>('products', 'name', true)
}

export function useStockMovements() {
  const base = useSupabaseTable<StockMovement>('stock_movements', 'date', false)

  const fetchByMonth = useCallback(async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, product:products(*)')
      .gte('date', startDate)
      .lt('date', endDate)
      .order('date', { ascending: false })

    if (!error && data) return data as StockMovement[]
    return []
  }, [])

  return { ...base, fetchByMonth }
}
