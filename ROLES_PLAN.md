# Plano — Roles Dinâmicos por Herdade

**Estado:** Plano. Ainda não executado.
**Pré-requisito:** MVP multi-tenant (✅ feito).

---

## Contexto e problema

Atualmente o sistema tem **dois roles fixos**: `admin` e `utilizador`, guardados em `tenant_users.role` com CHECK constraint. A permissão é binária: admins veem tudo, utilizadores veem o que o `role_views` permite (legado) ou o que `tenant_modules` tem ativo.

Limitações:
- Não há distinção entre funções reais do negócio (encarregado, contabilista, tratorista, funcionário).
- Não há granularidade: um contabilista precisa ver despesas mas não deve mexer em atividades; um encarregado precisa de criar registos mas não aceder a definições.
- Herdades diferentes podem querer roles diferentes.

---

## Objetivo

Permitir que **cada herdade** defina roles customizados, com uma matriz de permissões `módulo × ação`. Manter os roles "Admin" e "Utilizador" como templates seed.

---

## Modelo de permissões proposto

### Ações padrão por módulo
- `view` — consultar dados
- `create` — criar registos
- `edit` — editar registos existentes
- `delete` — apagar registos
- `export` — exportar CSV/Excel
- `manage` — configurar o módulo (ex: gerir tipos de atividade, categorias de despesa)

### Módulos alvo
Os mesmos de `tenant_modules`: `activities`, `fuel`, `feed`, `stock`, `expenses`, `vehicles`, `employees`, mais dois "meta":
- `settings` — definições de herdade (gestão de utilizadores, atividades, veículos)
- `super_admin` — acesso ao painel plataforma (reservado a platform_admins, não pertence a este sistema)

### Permissões "virtuais" especiais
- `users.invite` — convidar novos utilizadores
- `users.manage_roles` — atribuir roles a outros utilizadores
- `tenant.settings` — alterar dados da herdade

---

## Estrutura de dados

### Novas tabelas

```sql
create table public.tenant_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,              -- 'admin', 'utilizador', 'encarregado'
  name text not null,             -- "Encarregado"
  description text,
  is_system boolean not null default false,  -- true para admin/utilizador (não apagáveis)
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  unique (tenant_id, key)
);

create index idx_tenant_roles_tenant on public.tenant_roles(tenant_id);

create table public.tenant_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.tenant_roles(id) on delete cascade,
  module_key text not null,        -- 'activities', 'fuel', ..., 'settings'
  action text not null,            -- 'view', 'create', 'edit', 'delete', 'export', 'manage', 'users.invite', etc.
  allowed boolean not null default false,
  unique (role_id, module_key, action)
);

create index idx_tenant_role_permissions_role on public.tenant_role_permissions(role_id);
```

### Alterações em tabelas existentes

```sql
-- Substituir role text por FK role_id
alter table public.tenant_users add column role_id uuid references public.tenant_roles(id) on delete restrict;
-- Backfill: para cada linha, encontrar tenant_role com key = role e mesmo tenant_id
update public.tenant_users tu
   set role_id = tr.id
  from public.tenant_roles tr
 where tr.tenant_id = tu.tenant_id and tr.key = tu.role;
alter table public.tenant_users alter column role_id set not null;
-- Manter a coluna `role` como legacy nullable (remover em fase posterior)
```

---

## Seed automática de roles

Sempre que um tenant é criado (`admin_create_tenant`), inserir 2 roles system:

**Role `admin` (`is_system=true`)**
Todas as ações em todos os módulos ativos + `users.invite`, `users.manage_roles`, `tenant.settings`.

**Role `utilizador` (`is_system=true`)**
`view` em todos os módulos operacionais. Nada mais.

Templates opcionais (não system, só sugestão):
- **Encarregado**: view+create+edit+export em `activities`, `fuel`, `feed`, `stock`; view em `expenses`, `vehicles`; sem acesso a `settings`.
- **Contabilista**: view+create+edit+export em `expenses`, `fuel`, `stock`; view em tudo o resto.
- **Tratorista**: view em tudo; create+edit apenas em `fuel` e `activities`.

---

## Lógica de autorização

### Backend (Postgres)

Função helper que substitui o atual `is_admin()`:

```sql
create or replace function public.has_permission(p_module text, p_action text)
returns boolean language sql stable security definer as $$
  select public.is_platform_admin() or exists (
    select 1 from public.tenant_users tu
      join public.tenant_role_permissions p on p.role_id = tu.role_id
     where tu.user_id = auth.uid()
       and tu.tenant_id = public.current_tenant_id()
       and tu.status = 'active'
       and p.module_key = p_module
       and p.action = p_action
       and p.allowed = true
  );
$$;
```

### RLS atualizada

Policies por tabela passam a chamar `has_permission('activities', 'view')` etc. em vez de confiar apenas em `tenant_id = current_tenant_id()`.

Exemplo para `activities`:
```sql
create policy p_activities_view on public.activities for select
  using (public.is_platform_admin() or (
    tenant_id = public.current_tenant_id()
    and public.has_permission('activities', 'view')
  ));

create policy p_activities_insert on public.activities for insert
  with check (tenant_id = public.current_tenant_id() and public.has_permission('activities', 'create'));

create policy p_activities_update on public.activities for update
  using (tenant_id = public.current_tenant_id() and public.has_permission('activities', 'edit'));

create policy p_activities_delete on public.activities for delete
  using (tenant_id = public.current_tenant_id() and public.has_permission('activities', 'delete'));
```

### Frontend

**Substituir `isAdmin` por `can('module', 'action')`**. Exemplo:

```tsx
const { can } = useTenant()
if (can('expenses', 'delete')) { /* show delete button */ }
```

TenantContext expõe `permissions: Record<string, Set<string>>` carregado no início.

---

## UI

### Em Definições → Roles

**Lista de roles** (tab atual):
- Mostra cada role com nome, descrição, nº utilizadores, badge "system" para admin/utilizador
- Botão "Editar" (abre matriz de permissões)
- Botão "Eliminar" (apenas para roles não-system e sem utilizadores)
- Botão "+ Novo role" (nome, descrição, matriz inicial vazia)

**Modal "Gerir permissões"**:
- Grelha: linhas = módulos (+settings, users), colunas = ações (view, create, edit, delete, export, manage)
- Checkboxes com "todos/nenhum" por linha
- Botão "Duplicar de..." para copiar de outro role
- Gravar → refresh de permissões no JWT (via refreshSession)

### Em Utilizadores

Onde hoje o dropdown role tem "admin/utilizador", passa a ter a lista de roles do tenant.

---

## Passos de execução

### Fase A — Fundações (não-destrutivo, 4-5h)
- [ ] Criar `tenant_roles` + `tenant_role_permissions`
- [ ] Seed automática (admin + utilizador) para todos os tenants existentes
- [ ] Adicionar coluna `tenant_users.role_id` nullable + backfill
- [ ] Função `has_permission()` (ainda não usada)
- [ ] RPC `admin_list_tenant_roles(p_tenant_id)` e `admin_list_role_permissions(p_role_id)`

### Fase B — Integração backend (5-6h)
- [ ] `tenant_users.role_id` passa a NOT NULL
- [ ] Substituir policies de todas as tabelas operacionais para usar `has_permission`
- [ ] Atualizar `custom_access_token_hook` para incluir `permissions` no JWT
- [ ] RPCs admin para criar/editar/apagar roles

### Fase C — UI (5-6h)
- [ ] TenantContext expõe `permissions` e `can()`
- [ ] Todos os `isAdmin` em componentes são substituídos por `can(...)`
- [ ] Nova tab "Roles" em Definições com CRUD + matriz
- [ ] Dropdown role na lista de utilizadores puxa de `tenant_roles`

### Fase D — Cleanup (2h)
- [ ] Dropar `tenant_users.role` (coluna legada)
- [ ] Dropar `role_views` (tabela legada, nunca mais usada)
- [ ] Docs / screenshots

**Total: 16–19 horas.**

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Utilizador existente fica sem permissões após migração | Fase A faz seed+backfill ANTES de qualquer policy mudar |
| Policy mal escrita bloqueia totalmente acesso | Fase B aplica-se primeiro em staging; rollback = dropar policies novas, manter antigas |
| Performance: `has_permission()` chamada N vezes por query | Inline na policy com EXISTS; cache no JWT (permissions array) |
| JWT fica grande demais | Em vez de inline, podemos não meter no JWT e ler de BD via RPC leve ao carregar |
| Frontend quebrar em N sítios por remoção de isAdmin | Varrer + substituir num PR só; testes E2E básicos antes de deploy |

---

## Decisões necessárias antes de começar

1. **Granularidade das ações:** as 6 (view/create/edit/delete/export/manage) chegam, ou queres menos (ex: só view/write/manage)?
2. **Permissões virtuais (users.invite, tenant.settings):** queremos já ou deixamos para depois?
3. **Templates extra** (Encarregado, Contabilista, Tratorista): adicionamos como sugestão no "duplicar de"?
4. **Permissão hierárquica:** "role A pode gerir utilizadores do role B e abaixo"? (Complica muito; sugiro deixar de fora.)
5. **Por tenant ou global:** confirma — assumo **por tenant** (cada herdade tem os seus roles). Alternativa: roles globais partilhados — mais simples mas menos flexível.

Responde a estas 5 quando quiseres arrancar.
