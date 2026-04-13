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
        Insert: Omit<FeedItem, 'id'>
        Update: Partial<Omit<FeedItem, 'id'>>
      }
      feed_logs: {
        Row: FeedLog
        Insert: Omit<FeedLog, 'id' | 'created_at'>
        Update: Partial<Omit<FeedLog, 'id' | 'created_at'>>
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

export interface FeedLog {
  id: string
  date: string
  feed_item_id: string
  quantity: number
  notes: string
  created_at: string
  // joined
  feed_item?: FeedItem
}
