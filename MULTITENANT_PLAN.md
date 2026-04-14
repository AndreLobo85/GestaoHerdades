# Plano Técnico — Transformação Multi-Tenant (SaaS)

**Projeto:** Gestão de Herdades (atualmente single-tenant, cliente seed: **Herdade do Passareiro**)
**Stack confirmada:** React 18 + TypeScript + Vite · Supabase (Postgres + Auth + Storage) · Vercel
**Objetivo:** converter a aplicação numa plataforma SaaS onde múltiplas herdades coexistem com isolamento estrito, seletor de tenant após login, e painel Super-Admin para gestão global.

> Nota: este plano assume uma evolução **incremental, sem rewrite**. A Herdade do Passareiro mantém-se funcional durante toda a migração e torna-se o primeiro tenant real (`tenant_id = '00000000-0000-0000-0000-000000000001'` por convenção).

---

## 1. Arquitetura de Multi-Tenancy recomendada

### Opção escolhida: **Shared Database + Shared Schema + `tenant_id` com RLS**

| Critério | Shared schema (RLS) | Schema per tenant | DB per tenant |
|---|---|---|---|
| Custo infra (Supabase) | **Baixo** (1 projeto) | Médio (migrações N×) | Alto (N projetos) |
| Isolamento | Forte via RLS | Muito forte | Máximo |
| Migrações | 1× para todos | N× (devops mais pesado) | N× |
| Cross-tenant queries (Super-Admin) | Trivial | Complexas | Muito complexas |
| Backup/restore por cliente | Médio (filtrar) | Fácil | Fácil |
| Onboarding de novo cliente | Instantâneo (1 insert) | Script migrations | Criar projeto Supabase |
| Compatível com Supabase Auth nativo | **Sim** | Sim | Não (multi-project auth) |

**Justificação:** para um SaaS em fase inicial (1→50 tenants), o modelo shared-schema com `tenant_id` + **Row-Level Security** do Postgres é o único que combina:
- Custo marginal zero por tenant novo.
- Zero downtime para migrações futuras.
- Compatibilidade total com Supabase (Auth, RLS, Storage policies, Realtime).
- Super-Admin com queries agregadas sem JOINs entre bases.

Se no futuro um cliente exigir isolamento físico (compliance/regulatório), pode-se **promover esse tenant** para um projeto Supabase dedicado — o código da app já receberá `tenant_id` como parâmetro, pelo que só muda a `SUPABASE_URL`.

---

## 2. Alterações na Base de Dados

### 2.1 Tabelas globais novas

```sql
-- Herdades (tenants)
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                   -- "passareiro", usado em URLs
  name text not null,                          -- "Herdade do Passareiro"
  status text not null default 'active'
    check (status in ('trial','active','suspended','inactive')),
  trial_ends_at timestamptz,
  plan text not null default 'starter',        -- starter|pro|enterprise
  quotas jsonb not null default '{}'::jsonb,   -- {max_users:10, max_storage_gb:5}
  settings jsonb not null default '{}'::jsonb, -- logo_url, timezone, currency
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

-- Ligação utilizador ↔ tenant (N:N) com role por tenant
create table public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'utilizador'
    check (role in ('admin','utilizador')),
  status text not null default 'active'
    check (status in ('active','inactive')),
  invited_by uuid references auth.users(id),
  created_at timestamptz default now(),
  unique (tenant_id, user_id)
);

create index idx_tenant_users_user on public.tenant_users(user_id);
create index idx_tenant_users_tenant on public.tenant_users(tenant_id);

-- Feature flags por tenant (substitui role_views)
create table public.tenant_modules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_key text not null,            -- 'fuel','feed','stock','expenses','activities'
  enabled boolean not null default true,
  config jsonb default '{}'::jsonb,
  unique (tenant_id, module_key)
);

-- Super-Admins da plataforma (podem gerir tudo)
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Audit log central (cross-tenant)
create table public.audit_log (
  id bigserial primary key,
  tenant_id uuid references public.tenants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,                -- INSERT|UPDATE|DELETE|LOGIN|SWITCH_TENANT
  table_name text,
  record_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  created_at timestamptz default now()
);
create index idx_audit_tenant_time on public.audit_log(tenant_id, created_at desc);
```

### 2.2 Adicionar `tenant_id` a todas as tabelas existentes

Tabelas afetadas (atuais):
`employees, activity_types, activities, vehicles, fuel_logs, products, stock_movements, feed_items, feed_logs, expense_categories, general_expenses, expenses, profiles`.

Padrão de migração por cada tabela:

```sql
-- 1. Coluna nullable (migração zero-downtime)
alter table public.employees
  add column if not exists tenant_id uuid references public.tenants(id) on delete restrict;

-- 2. Backfill para o tenant seed
update public.employees
   set tenant_id = (select id from public.tenants where slug = 'passareiro')
 where tenant_id is null;

-- 3. Tornar NOT NULL após backfill
alter table public.employees
  alter column tenant_id set not null;

-- 4. Índice composto (tenant_id primeiro — essencial para planner PG)
create index if not exists idx_employees_tenant on public.employees(tenant_id);
```

### 2.3 Helper functions

```sql
-- Retorna a lista de tenants do utilizador autenticado
create or replace function public.user_tenants()
returns setof uuid language sql stable security definer as $$
  select tenant_id from public.tenant_users
   where user_id = auth.uid() and status = 'active'
$$;

-- Retorna o tenant ativo da sessão (definido por claim JWT)
create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid
$$;

-- Verifica se utilizador é platform admin
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;
```

### 2.4 Row-Level Security por tenant

Política padrão para **todas** as tabelas com `tenant_id` (SELECT / INSERT / UPDATE / DELETE):

```sql
alter table public.employees enable row level security;

-- SELECT: só vê dados do tenant ativo (ou é platform admin)
create policy "tenant_read_employees" on public.employees
  for select using (
    public.is_platform_admin()
    or tenant_id = public.current_tenant_id()
  );

-- INSERT: só pode inserir no tenant ativo
create policy "tenant_insert_employees" on public.employees
  for insert with check (
    tenant_id = public.current_tenant_id()
    and exists (
      select 1 from public.tenant_users
       where user_id = auth.uid()
         and tenant_id = public.current_tenant_id()
         and status = 'active'
    )
  );

-- UPDATE/DELETE: idem, não pode mudar tenant_id
create policy "tenant_update_employees" on public.employees
  for update using (tenant_id = public.current_tenant_id())
              with check (tenant_id = public.current_tenant_id());

create policy "tenant_delete_employees" on public.employees
  for delete using (tenant_id = public.current_tenant_id());
```

Script de aplicação das policies em loop (gerado por template) fica em `supabase/migration_multitenant.sql`.

### 2.5 Dados globais vs dados por tenant

| Tipo | Exemplos | Onde vive |
|---|---|---|
| Global (plataforma) | `tenants`, `tenant_users`, `platform_admins`, `audit_log` | Sem `tenant_id` |
| Configuração cross-tenant | `tenant_modules`, `plans`, `billing_products` | Referenciam `tenant_id` |
| Dados operacionais | Tudo o que já existe hoje | `tenant_id NOT NULL` + RLS |

---

## 3. Autenticação & Autorização

### 3.1 Fluxo completo

```
[1] Login → Supabase Auth devolve JWT standard (sub = user_id)
[2] Frontend chama GET /rpc/list_my_tenants → [{id, name, role}, ...]
[3] UI:
    • 0 tenants → "Sem acesso. Contacte o administrador."
    • 1 tenant  → entra directamente (skip selector)
    • N tenants → ecrã "Escolha a sua herdade"
[4] Utilizador escolhe → frontend chama POST /rpc/switch_tenant(tenant_id)
[5] Edge Function valida tenant_users + devolve novo JWT
    (claim custom: tenant_id) assinado via GoTrue admin
[6] Todas as queries seguintes usam este JWT.
    RLS lê request.jwt.claims.tenant_id e filtra automaticamente.
```

### 3.2 Enriquecer JWT com `tenant_id`

Supabase Auth não adiciona claims custom nativamente pós-login. Duas opções:

**Opção A — Edge Function "exchange":** token original → token com claims custom, usando `SERVICE_ROLE_KEY` e `auth.admin.signJwt`. Armazenado no localStorage, usado no cliente Supabase.

**Opção B — Claim via Postgres hook (Supabase Auth Hooks):** `custom_access_token_hook` injeta `tenant_id` a partir da preferência guardada em `tenant_users.last_selected = true`. Disponível em Supabase cloud desde 2024.

Recomendado: **Opção B** (mais simples, sem edge function).

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb;
  v_tenant uuid;
  v_is_platform boolean;
begin
  claims := event->'claims';

  select tenant_id into v_tenant
    from public.tenant_users
   where user_id = (event->>'user_id')::uuid
     and status = 'active'
   order by last_selected desc nulls last, created_at asc
   limit 1;

  select exists (select 1 from public.platform_admins where user_id = (event->>'user_id')::uuid)
    into v_is_platform;

  claims := claims || jsonb_build_object(
    'tenant_id', v_tenant,
    'is_platform_admin', v_is_platform
  );
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;
```

### 3.3 Troca de tenant sem relogin

```sql
create or replace function public.switch_tenant(p_tenant_id uuid)
returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.tenant_users
     where user_id = auth.uid() and tenant_id = p_tenant_id and status = 'active'
  ) then
    raise exception 'Sem acesso a este tenant';
  end if;

  update public.tenant_users
     set last_selected = (tenant_id = p_tenant_id)
   where user_id = auth.uid();
end;
$$;
```

Depois o frontend chama `supabase.auth.refreshSession()` para obter novo JWT com o claim atualizado.

### 3.4 RBAC em duas camadas

- **Camada plataforma** (`platform_admins`): acesso ao Super-Admin, bypass de RLS via `is_platform_admin()`.
- **Camada tenant** (`tenant_users.role`): `admin` vs `utilizador`, valida no frontend e em RPCs sensíveis.

---

## 4. Routing & UI

### 4.1 Estrutura de rotas

```
/login                     → Auth
/select-tenant             → Seletor (se N tenants)
/app/:tenantSlug/dashboard → Contexto activo (tenantSlug no URL)
/app/:tenantSlug/feed
/app/:tenantSlug/stock
...
/admin                     → Super-Admin (só platform_admins)
/admin/tenants
/admin/tenants/:id/users
/admin/tenants/:id/modules
```

O `tenantSlug` no URL permite:
- Partilhar links entre utilizadores do mesmo tenant.
- Detectar mismatch entre URL e JWT (força switch).

### 4.2 Contexto React

```tsx
// src/contexts/TenantContext.tsx
const TenantContext = createContext<{
  tenant: Tenant | null
  availableTenants: Tenant[]
  switchTenant: (id: string) => Promise<void>
  modules: Record<string, boolean>  // {fuel:true, stock:false, ...}
}>(...)
```

Wrapper à volta das rotas `/app/:tenantSlug/*`. Ao montar, compara `tenantSlug` com JWT e chama `switchTenant` se diferir.

### 4.3 Menu lateral condicional

```tsx
const menuItems = [
  { key: 'dashboard',   label: 'Dashboard',   always: true },
  { key: 'activities',  label: 'Atividades',  module: 'activities' },
  { key: 'fuel',        label: 'Combustivel', module: 'fuel' },
  { key: 'feed',        label: 'Alimentacao', module: 'feed' },
  { key: 'stock',       label: 'Stock',       module: 'stock' },
  { key: 'expenses',    label: 'Despesas',    module: 'expenses' },
  { key: 'settings',    label: 'Definicoes',  adminOnly: true },
].filter(i => i.always || modules[i.module] || (i.adminOnly && role==='admin'))
```

Feature flags lidos de `tenant_modules` → substitui a tabela `role_views` atual.

---

## 5. Painel Super-Admin

### 5.1 Endpoints (RPCs Postgres, todas com `security definer` + `is_platform_admin()`)

| RPC | Input | Ação |
|---|---|---|
| `admin_create_tenant` | name, slug, plan, owner_email | Cria tenant + convite do dono |
| `admin_update_tenant` | tenant_id, patch | Atualiza status/plano/quotas |
| `admin_toggle_module` | tenant_id, module_key, enabled | Liga/desliga módulo |
| `admin_invite_user` | tenant_id, email, role | Envia convite (Supabase invite) |
| `admin_remove_user` | tenant_id, user_id | Desativa `tenant_users` |
| `admin_list_tenants` | filtros | Lista com métricas |
| `admin_impersonate` | tenant_id | Gera token temporário no contexto do tenant (para suporte) |

### 5.2 Isolamento do painel

- Rota `/admin` verifica `is_platform_admin` no JWT; 403 caso contrário.
- Tabelas `tenants`, `tenant_users`, `tenant_modules`, `platform_admins` têm RLS que só permite `is_platform_admin()`.
- Impersonation cria linha temporária em `audit_log` e o frontend mostra banner "A ver como X (voltar)".

### 5.3 Fluxo de criação de novo tenant

```
1. Super-admin preenche: nome, slug, plano, email do dono
2. RPC admin_create_tenant:
   a. Insert em tenants (status='trial')
   b. Insert em tenant_modules (default enabled=true para módulos do plano)
   c. auth.admin.inviteUserByEmail(owner_email)
   d. On callback do convite → insert em tenant_users (role='admin')
3. Dono recebe email, cria password, entra, vê só a sua herdade
```

### 5.4 Fluxo de criação de utilizadores — dois caminhos híbridos

**Caminho A — Convite direto (pelo Super-Admin ou Admin de tenant):**
```
1. Admin no painel → "Convidar utilizador" (email + tenant + role)
2. RPC admin_invite_user:
   a. auth.admin.inviteUserByEmail(email, {data:{invite_tenant_id, role}})
   b. Insert em tenant_users (status='pending') com tenant_id + role pré-definidos
3. Utilizador recebe email → cria password → entra → já está no tenant certo
```

**Caminho B — Self-register + aprovação (mantém fluxo atual):**
```
1. Utilizador vai a /signup → cria conta em auth.users
2. Trigger insere linha em profiles com status='pending', sem tenant
3. Utilizador entra mas vê apenas ecrã "Aguarda aprovação do administrador"
4. Super-admin vê lista de "Pending" no painel → escolhe tenant + role → aprova
5. Insert em tenant_users (active) + profiles.status='active'
6. Utilizador faz refreshSession() (ou volta a logar) → vê a herdade
```

Nos dois caminhos, o destino final é o mesmo: uma linha em `tenant_users` com (user_id, tenant_id, role, status='active').

**Regras:**
- Utilizadores self-registered **sem** tenant associado veem apenas a página "Aguarda aprovação" — qualquer query a dados operacionais devolve vazio via RLS.
- Admin de tenant pode convidar apenas para o **seu** tenant; Super-Admin pode convidar para qualquer.
- A mesma pessoa (email) pode pertencer a vários tenants — o mesmo `user_id` ligado a N linhas em `tenant_users`.

---

## 6. Plano de Migração Incremental

### Fase 0 — Preparação (1 dia)
- [ ] Criar branch `feat/multitenant`.
- [ ] Congelar migrações destrutivas em produção.
- [ ] Backup completo da BD Supabase.

### Fase 1 — Fundações BD (2 dias)
- [ ] Migração `supabase/migration_multitenant_00_tables.sql`:
  - cria `tenants`, `tenant_users`, `tenant_modules`, `platform_admins`, `audit_log`
  - cria funções helper
  - insere tenant seed `passareiro` + associa todos os utilizadores existentes
  - insere 1 `platform_admin` inicial (o teu user_id)
- [ ] Aplicar em produção (aditivo, zero impacto).

### Fase 2 — Backfill `tenant_id` (1 dia)
- [ ] Migração `_01_tenant_ids.sql`: para cada tabela, add column + backfill + NOT NULL + index.
- [ ] **Sem RLS ainda** — app continua a funcionar igual.
- [ ] Validar contagens antes/depois.

### Fase 3 — RLS ativada (2 dias)
- [ ] Ativar `custom_access_token_hook` no painel Supabase.
- [ ] Aplicar policies por tenant.
- [ ] **Canary**: testar em staging primeiro. Logout/login da equipa toda.
- [ ] Monitorizar `audit_log` + erros durante 24h.

### Fase 4 — UI multi-tenant (3 dias)
- [ ] `TenantContext` + rotas `/app/:slug/*`.
- [ ] Ecrã seletor de tenant.
- [ ] Menu lateral lê `tenant_modules`.
- [ ] Remover hard-codings de nome "Herdade do Passareiro" → `tenant.name`.

### Fase 5 — Painel Super-Admin (3 dias)
- [ ] Rotas `/admin/*` + guard `is_platform_admin`.
- [ ] CRUD de tenants + convites + toggles de módulos.
- [ ] Dashboard agregado (nº tenants, MAU, storage por tenant).

### Fase 6 — Hardening & Billing (depende do modelo comercial)
- [ ] Quotas (max users, max storage) validadas em RPCs.
- [ ] Integração Stripe Billing (se aplicável — ver §8).
- [ ] Export/import de dados por tenant (GDPR).

**Timeline total:** ~12 dias úteis de dev focado.

### Rollback strategy

Cada fase é reversível:
- F1/F2: migrações são `ADD COLUMN` / `CREATE TABLE`; rollback = `DROP`.
- F3: basta `drop policy` + desativar hook → volta ao acesso global.
- F4/F5: rota `/app/*` convive com as rotas antigas durante a transição — manter fallback `?legacy=1`.

---

## 7. Segurança & Compliance

### 7.1 Checklist obrigatório antes de GA

- [ ] **Todas** as tabelas com `tenant_id` têm RLS ativa e testada.
- [ ] Teste automatizado: user do tenant A **não** consegue ler/escrever em tenant B (via PostgREST direto).
- [ ] JWT tem TTL curto (1h) + refresh token obrigatório.
- [ ] `platform_admins` tem MFA obrigatório (Supabase Auth settings).
- [ ] Audit log imutável (revogar DELETE/UPDATE para roles não-admin).
- [ ] Storage: bucket `invoices` tem policies por tenant (path prefix `tenants/{tenant_id}/...`).
- [ ] Logs de request no Supabase retidos 90 dias.

### 7.2 Defensive programming

- **Nunca** confiar no `tenant_id` enviado pelo cliente; ler sempre de `auth.jwt()` no servidor.
- **Nunca** usar `SERVICE_ROLE_KEY` no frontend.
- RPCs com `security definer` **têm** de filtrar por `tenant_id = current_tenant_id()` explicitamente.
- Triggers de audit em todas as tabelas críticas (feed_logs, expenses, products).

### 7.3 GDPR

- Export de dados de um tenant: RPC `admin_export_tenant(tenant_id)` devolve JSON completo.
- Direito ao esquecimento: `admin_hard_delete_tenant(tenant_id)` com confirmação dupla.

---

## 8. Stack / Tooling recomendado

| Camada | Escolha | Porquê |
|---|---|---|
| Auth | Supabase Auth (nativa) | Já integrada, MFA, magic links, hooks |
| Claims custom | Supabase Auth Hooks (Postgres) | Sem edge function, mais simples |
| Feature flags | `tenant_modules` (próprio) | Evita dependência externa; suficiente |
| RBAC | `tenant_users.role` + `platform_admins` | Nativo, dentro da BD |
| Billing | **Stripe Billing** (quando monetizar) | Subscriptions + quotas + portal do cliente |
| Webhooks Stripe → Supabase | Edge Function | Atualiza `tenants.plan` e `quotas` |
| Observabilidade | Supabase Logs + Sentry (frontend) | Alertas de erros por tenant |
| Testes E2E multi-tenant | Playwright com 2 sessões paralelas | Valida isolamento |
| CI/CD | Vercel + GitHub Actions | Migrations em PRs |

### Middleware de tenant no cliente Supabase

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: true, autoRefreshToken: true },
    global: {
      // Helper para chamadas RPC com tenant forçado (debug)
      headers: {},
    },
  }
)

// Wrapper que injeta tenant check client-side (defence in depth)
export function useTenantScopedQuery() {
  const { tenant } = useTenant()
  if (!tenant) throw new Error('No tenant context')
  return supabase
}
```

---

## 9. Armadilhas comuns — e como evitá-las

| # | Armadilha | Mitigação |
|---|---|---|
| 1 | Cache partilhada entre tenants (React Query / SWR) | Chave de cache sempre inclui `tenant_id`: `['feed_logs', tenantId, month]` |
| 2 | Jobs em background sem contexto | Cron / Edge Functions recebem `tenant_id` como argumento explícito; nunca assumir "o tenant atual" |
| 3 | Relatórios cruzados acidentais | Super-Admin usa `SERVICE_ROLE_KEY` **apenas** em edge functions dedicadas; nunca no frontend |
| 4 | Storage leakage | Bucket path obrigatório: `tenants/{tenant_id}/invoices/...`; policies validam prefixo |
| 5 | Migrações que esquecem `tenant_id` | Template ENUM de migração: todas novas tabelas operacionais **têm** de ter `tenant_id` |
| 6 | JWT sem tenant_id (edge case: user sem tenants) | Hook devolve `tenant_id = null` → frontend força `/select-tenant` vazio |
| 7 | Impersonation "stuck" (admin ficou no contexto de outro tenant) | Banner permanente + botão "Sair do modo impersonation" + TTL máximo de 30 min |
| 8 | Queries SQL ad-hoc em suporte | Usar sempre `set local app.tenant_id = '...'` em transações manuais |
| 9 | Duplicação de slugs / colisões | `slug` unique + validação regex `^[a-z0-9-]{3,32}$` |
| 10 | RLS com performance pobre (sequential scan) | Índice `(tenant_id, ...)` em TODAS as tabelas; EXPLAIN antes de GA |
| 11 | Convites sem tenant | Fluxo de convite guarda `tenant_id` em `auth.users.user_metadata.invite_tenant_id` |
| 12 | Teste com um só tenant esconde bugs | Semear **sempre 2 tenants** em dev; testes E2E verificam isolamento |

---

## 10. Critérios de conclusão (Definition of Done)

- [ ] Um utilizador com 2 tenants vê seletor após login.
- [ ] Super-Admin cria tenant novo, convida dono, dono entra e vê app vazia.
- [ ] Super-Admin desliga módulo "Combustível" no tenant X → desaparece do menu **imediatamente** (próxima refresh de sessão).
- [ ] Teste de penetração básico: user do tenant A consegue chamar `supabase.from('feed_logs').select()` e só vê dados do A.
- [ ] Audit log regista criação de tenant, login, switch_tenant, delete crítico.
- [ ] Herdade do Passareiro continua 100% funcional, sem alterações percetíveis para os utilizadores existentes.
- [ ] Runbook de onboarding escrito (criar tenant → convidar dono → configurar módulos).
- [ ] Documentação de rollback testada em staging.

---

## 11. Próximos passos imediatos

1. Ler este documento e rever.
2. Decidir plano inicial de módulos por tenant (default enabled: todos).
3. Confirmar se queres **MFA obrigatório** para platform_admins desde o dia 1.
4. Confirmar se vais monetizar (Stripe) já na v1 ou mais tarde — afeta Fase 6.
5. Aprovar Fase 1 (fundações BD) — **é aditiva, baixo risco, podemos começar amanhã**.

---

## Anexo A — Tabela-resumo de impacto por tabela existente

| Tabela | Ação | Policy |
|---|---|---|
| employees | + tenant_id NOT NULL | standard 4-policy |
| activity_types | + tenant_id | standard |
| activities | + tenant_id | standard |
| vehicles | + tenant_id | standard |
| fuel_logs | + tenant_id | standard |
| products | + tenant_id | standard |
| stock_movements | + tenant_id | standard |
| feed_items | + tenant_id | standard |
| feed_logs | + tenant_id | standard |
| expense_categories | + tenant_id | standard |
| general_expenses | + tenant_id | standard |
| expenses | + tenant_id | standard |
| profiles | ∅ (é global) | substituída gradualmente por tenant_users |
| role_views | **deprecate** | substituída por tenant_modules |

---

## Anexo B — Exemplo de fluxo completo (sequência)

```
┌────────┐         ┌──────────────┐         ┌─────────────┐         ┌──────────┐
│Browser │         │ Supabase Auth │         │ Postgres    │         │ App Code │
└───┬────┘         └───────┬──────┘         └──────┬──────┘         └────┬─────┘
    │ email + password      │                       │                      │
    │──────────────────────>│                       │                      │
    │                        │ custom_token_hook    │                      │
    │                        │─────────────────────>│                      │
    │                        │ {sub, tenant_id,     │                      │
    │                        │  is_platform_admin}  │                      │
    │                        │<─────────────────────│                      │
    │<──JWT──────────────────│                       │                      │
    │                                                                       │
    │ select from feed_logs (RLS usa JWT.tenant_id)                         │
    │──────────────────────────────────────────────────────────────────────>│
    │                                      row-level filter automático      │
    │<── apenas dados do tenant ────────────────────────────────────────────│
    │                                                                       │
    │ switch_tenant(new_id) → update last_selected                          │
    │ refreshSession() → novo JWT com novo tenant_id                        │
```

---

**Fim do plano.** Aguardo aprovação ou pedidos de alteração antes de iniciar a Fase 1.
