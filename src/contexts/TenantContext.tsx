import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export interface TenantSummary {
  id: string
  slug: string
  name: string
  role: 'admin' | 'utilizador'
  status: string
  is_current: boolean
}

interface TenantContextType {
  loading: boolean
  currentTenant: TenantSummary | null
  availableTenants: TenantSummary[]
  modules: Record<string, boolean>
  isPlatformAdmin: boolean
  permissions: Set<string>            // entries like "activities.view"
  can: (module: string, action: string) => boolean
  switchTenant: (tenantId: string) => Promise<void>
  refresh: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | null>(null)

export function TenantProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [availableTenants, setAvailableTenants] = useState<TenantSummary[]>([])
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const [permissions, setPermissions] = useState<Set<string>>(new Set())
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)

  const parseClaims = useCallback((): { tenant_id: string | null; is_platform_admin: boolean } => {
    const token = session?.access_token
    if (!token) return { tenant_id: null, is_platform_admin: false }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return {
        tenant_id: payload.tenant_id ?? null,
        is_platform_admin: payload.is_platform_admin === true,
      }
    } catch {
      return { tenant_id: null, is_platform_admin: false }
    }
  }, [session?.access_token])

  const fetchAll = useCallback(async () => {
    if (!session?.user) { setLoading(false); return }
    setLoading(true)

    const claims = parseClaims()
    setIsPlatformAdmin(claims.is_platform_admin)

    const { data: tenants } = await (supabase.rpc as any)('list_my_tenants')
    setAvailableTenants((tenants as TenantSummary[] | null) ?? [])

    if (claims.tenant_id) {
      const [{ data: mods }, { data: perms }] = await Promise.all([
        supabase.from('tenant_modules').select('module_key, enabled').eq('tenant_id', claims.tenant_id),
        (supabase.rpc as any)('get_my_permissions'),
      ])
      const map: Record<string, boolean> = {}
      for (const m of (mods ?? []) as { module_key: string; enabled: boolean }[]) {
        map[m.module_key] = m.enabled
      }
      setModules(map)
      const set = new Set<string>()
      for (const p of (perms ?? []) as { module_key: string; action: string; allowed: boolean }[]) {
        if (p.allowed) set.add(`${p.module_key}.${p.action}`)
      }
      setPermissions(set)
    } else {
      setModules({})
      setPermissions(new Set())
    }
    setLoading(false)
  }, [session?.user, parseClaims])

  useEffect(() => { fetchAll() }, [fetchAll])

  const switchTenant = async (tenantId: string) => {
    setLoading(true)
    const { error } = await (supabase.rpc as any)('switch_tenant', { p_tenant_id: tenantId })
    if (error) { alert('Erro ao trocar de herdade: ' + error.message); setLoading(false); return }
    await supabase.auth.refreshSession()
    window.location.replace('/')
  }

  const claims = parseClaims()
  const currentTenant = availableTenants.find(t => t.id === claims.tenant_id) ?? null

  const can = (module: string, action: string) =>
    isPlatformAdmin || permissions.has(`${module}.${action}`)

  return (
    <TenantContext.Provider value={{
      loading,
      currentTenant,
      availableTenants,
      modules,
      isPlatformAdmin,
      permissions,
      can,
      switchTenant,
      refresh: fetchAll,
    }}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
