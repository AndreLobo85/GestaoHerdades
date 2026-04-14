export interface Database {
  public: {
    Tables: {
      employees: {
        Row: Employee
        Insert: Omit<Employee, 'id' | 'created_at'>
        Update: Partial<Omit<Employee, 'id' | 'created_at'>>
      }
      activity_types: {
        Row: ActivityType
        Insert: Omit<ActivityType, 'id'>
        Update: Partial<Omit<ActivityType, 'id'>>
      }
      activities: {
        Row: Activity
        Insert: Omit<Activity, 'id' | 'created_at'>
        Update: Partial<Omit<Activity, 'id' | 'created_at'>>
      }
      vehicles: {
        Row: Vehicle
        Insert: Omit<Vehicle, 'id' | 'created_at'>
        Update: Partial<Omit<Vehicle, 'id' | 'created_at'>>
      }
      fuel_logs: {
        Row: FuelLog
        Insert: Omit<FuelLog, 'id' | 'created_at'>
        Update: Partial<Omit<FuelLog, 'id' | 'created_at'>>
      }
      feed_items: {
        Row: FeedItem
        Insert: Omit<FeedItem, 'id' | 'product'>
        Update: Partial<Omit<FeedItem, 'id' | 'product'>>
      }
      feed_logs: {
        Row: FeedLog
        Insert: Omit<FeedLog, 'id' | 'created_at' | 'feed_item'>
        Update: Partial<Omit<FeedLog, 'id' | 'created_at' | 'feed_item'>>
      }
      expense_categories: {
        Row: ExpenseCategory
        Insert: Omit<ExpenseCategory, 'id' | 'created_at'>
        Update: Partial<Omit<ExpenseCategory, 'id' | 'created_at'>>
      }
      general_expenses: {
        Row: GeneralExpense
        Insert: Omit<GeneralExpense, 'id' | 'created_at' | 'category' | 'product'>
        Update: Partial<Omit<GeneralExpense, 'id' | 'created_at' | 'category' | 'product'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      stock_movements: {
        Row: StockMovement
        Insert: Omit<StockMovement, 'id' | 'created_at' | 'product'>
        Update: Partial<Omit<StockMovement, 'id' | 'created_at' | 'product'>>
      }
    }
  }
}

export interface Employee {
  id: string
  name: string
  role: string
  active: boolean
  created_at: string
}

export interface ActivityType {
  id: string
  name: string
  active: boolean
}

export interface Activity {
  id: string
  employee_id: string
  date: string
  activity_type_id: string
  hours: number
  description: string
  created_at: string
  // joined fields
  employee?: Employee
  activity_type?: ActivityType
}

export interface Vehicle {
  id: string
  brand: string
  model: string
  plate: string
  vehicle_type: 'machine' | 'vehicle'
  current_km: number
  active: boolean
  created_at: string
}

export type FuelType = 'agricola' | 'rodoviario'

export interface FuelLog {
  id: string
  vehicle_id: string
  date: string
  fuel_type: FuelType
  hours_or_km: number
  liters: number
  notes: string
  created_at: string
  // joined
  vehicle?: Vehicle
}

export interface FeedItem {
  id: string
  name: string
  unit: string
  active: boolean
  product_id: string | null
  // joined
  product?: Product
}

export type UserRole = 'admin' | 'utilizador'
export type UserStatus = 'pending' | 'active' | 'inactive'

export interface Profile {
  id: string
  full_name: string
  email: string | null
  role: UserRole
  status: UserStatus
  avatar_url: string | null
  created_at: string
}

export interface Expense {
  id: string
  vehicle_id: string
  date: string
  km: number
  description: string
  invoice_number: string
  invoice_amount: number
  invoice_file_url: string | null
  product_id: string | null
  product_quantity: number | null
  created_by: string | null
  created_at: string
  // joined
  vehicle?: Vehicle
  product?: Product
}

export interface RoleView {
  id: string
  role: string
  view_key: string
  view_label: string
  view_icon: string
  enabled: boolean
}

export interface FeedLog {
  id: string
  date: string
  feed_item_id: string | null
  product_id: string | null
  quantity: number
  notes: string
  created_at: string
  // joined
  feed_item?: FeedItem
  product?: Product
}

export interface ExpenseCategory {
  id: string
  name: string
  icon: string
  position: number
  active: boolean
  created_at: string
}

export interface GeneralExpense {
  id: string
  category_id: string
  date: string
  description: string
  invoice_number: string
  invoice_amount: number
  invoice_file_url: string | null
  product_id: string | null
  product_quantity: number | null
  created_by: string | null
  created_at: string
  // joined
  category?: ExpenseCategory
  product?: Product
}

export interface Product {
  id: string
  name: string
  unit: string
  current_quantity: number
  min_stock_alert: number
  active: boolean
  is_feed: boolean
  created_at: string
}

export type StockMovementType = 'entrada' | 'saida'

export interface StockMovement {
  id: string
  product_id: string
  type: StockMovementType
  quantity: number
  reason: string
  general_expense_id: string | null
  feed_log_id: string | null
  notes: string
  date: string
  created_by: string | null
  created_at: string
  // joined
  product?: Product
}
