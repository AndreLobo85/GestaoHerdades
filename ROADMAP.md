# Roadmap — Gestão de Herdades

**Última atualização:** 2026-04-14
**Versão atual:** produção em Vercel (HEAD `84510d9`)
**Stack:** React + TypeScript + Vite + Supabase (Postgres / Auth / Storage) + Vercel

---

## 1. Estado atual

### Módulos implementados

| Módulo | Funcionalidade | Tabelas principais |
|---|---|---|
| Autenticação & Roles | admin / utilizador, role_views para esconder/mostrar UI | `profiles`, `role_views` |
| Funcionários | CRUD | `employees` |
| Atividades | Tipos + logs diários (data, funcionário, horas) | `activity_types`, `activities` |
| Veículos / Máquinas | Frota, KM, tipo (máquina vs veículo) | `vehicles` |
| Combustível | Litros, H/Km, tipo (agrícola/rodoviário), stats L/100km por veículo, export mensal/YTD | `fuel_logs` |
| Alimentação Diária | Produtos com flag `is_feed`; registo diário com dedução automática de stock | `feed_logs`, `products` |
| Stock | Catálogo, movimentos entrada/saída, alertas de mínimos, ligação a despesas | `products`, `stock_movements` |
| Despesas de Veículos | Com produto opcional, upload de fatura | `expenses` |
| Despesas Gerais (categorias) | Categorias configuráveis, produto opcional, upload de fatura | `expense_categories`, `general_expenses` |
| Dashboard | KPIs mensais (horas, gasóleo L, alimentação, despesas €), navegação mês, export Excel multi-tab estilizado | — |

### Capacidades transversais
- **RLS** ativa em todas as tabelas (policies `auth.role() = 'authenticated'`).
- **RPCs atómicas** para operações de stock: `deduct_stock_for_feed`, `restore_stock_for_feed`, `restore_stock_for_feed_item`.
- **Supabase Storage** bucket `invoices/` com subpastas `invoices/` (veículos) e `general/`.
- **Exports** CSV por módulo + Excel multi-sheet temático no Dashboard.

### Observações críticas (dívida técnica suspeita)
1. **Unidades/arredondamentos:** vários campos `numeric(10,2)` — deviam ser `numeric(14,3)` para unidades físicas (litros, kg, horas).
2. **Dashboard sem comparativos MoM/YoY** — KPIs absolutos não acionam decisão.
3. **RLS vs role_views:** role_views só esconde UI. Falta auditar policies para garantir isolamento real por role.
4. **Audit log central inexistente** — crítico para app financeira; quem editou o quê e quando.

---

## 2. Benchmarking — lacunas vs. mercado

Scan de Agrivi, FarmOS, Tania, Climate FieldView, Granular, Farmbrite, SourceTrace, iLivestock, Aglive, Trimble Ag.

Features comuns no mercado que não temos:
1. Parcelário / GIS (parcelas com área, cultura, geometria opcional)
2. Caderno de campo fitossanitário (legal obrigatório UE)
3. Gestão pecuária individual (brinco, pesagens, sanidade, partos, SNIRA)
4. Ordens de trabalho atribuídas com estado
5. Mobile-first / PWA offline
6. Planeamento de safras e rotações
7. Meteorologia + alertas por parcela
8. Manutenção preventiva de máquinas
9. Custo por parcela / cultura / centro de custo
10. Rastreabilidade de lotes (campo → armazém → venda)
11. NDVI via satélite (Sentinel Hub)
12. Integração PAC / iDigital

---

## 3. Priorização

### MUST-HAVE — Fase 1 (impacto alto, esforço médio)
Total estimado: **72–100h** (~2 semanas focadas).

| # | Feature | Estimativa | Desbloqueia |
|---|---|---|---|
| 1.1 | Parcelário básico | 14–20h | Custo por parcela, Fito, Tarefas |
| 1.2 | Ordens de Trabalho | 20–28h | Engagement funcionários |
| 1.3 | Manutenção Preventiva Veículos | 12–16h | Independente |
| 1.4 | Custo por Parcela/Cultura | 10–14h | Depende de 1.1 |
| 1.5 | Caderno de Campo Fitossanitário | 16–22h | Depende de 1.1 |

### SHOULD-HAVE — Fase 2 (diferenciador)
6. Gestão Pecuária individual — **30–50h**
7. PWA offline — **20–30h**
8. Planeamento de Safras / Rotações — **18–26h**
9. Rastreabilidade de Lotes — **20–30h**

### NICE-TO-HAVE — Fase 3 (futuro)
10. Integração meteorológica (Open-Meteo) — 8–12h
11. NDVI via Sentinel Hub — 30–40h
12. Integração PAC / iDigital — dependente de APIs públicas disponíveis

### DÍVIDA TÉCNICA — transversal
- DT1. Normalizar `numeric(14,3)` nas colunas físicas — 3–5h + migração de dados
- DT2. Comparativos MoM/YoY no Dashboard — 6–8h
- DT3. Auditoria e fortalecimento de RLS policies por role — 8–12h
- DT4. Tabela `audit_log` + triggers INSERT/UPDATE/DELETE nas tabelas-chave — 10–14h

---

## 4. Mini-planos detalhados (Fase 1)

### 1.1 Parcelário básico
**Tabelas novas:**
```
parcelas (
  id uuid pk,
  nome text,
  area_ha numeric(10,3),
  cultura_atual text,
  tipo_solo text,
  notas text,
  geom jsonb,       -- opcional (GeoJSON simples)
  active boolean default true,
  created_at timestamptz
)
```
**Alterações:**
- `activities.parcela_id` (FK nullable)
- `general_expenses.parcela_id` (FK nullable)
- `expenses.parcela_id` (FK nullable)
- `feed_logs.parcela_id` (opcional, para pastagem)

**UI:**
- Nova página **Parcelas** (listar, criar, editar, desativar).
- Modal com mapa opcional (Leaflet) — numa fase seguinte.
- Seletor de parcela nos forms de Atividades, Despesas e Alimentação (opcional).

**Riscos:** baixo. Integração progressiva via colunas nullable.

---

### 1.2 Ordens de Trabalho
**Tabelas novas:**
```
tarefas (
  id uuid pk,
  titulo text,
  descricao text,
  parcela_id uuid fk,
  activity_type_id uuid fk,
  funcionario_id uuid fk employees,
  data_prevista date,
  data_conclusao date,
  estado text check (estado in ('pendente','em_curso','concluida','cancelada')),
  prioridade text check (prioridade in ('baixa','normal','alta','urgente')),
  created_by uuid,
  created_at timestamptz
)

tarefa_checklist (
  id uuid pk,
  tarefa_id uuid fk,
  texto text,
  concluido boolean default false,
  ordem int
)
```

**UI:**
- Nova página **Tarefas** (Kanban ou tabela por estado).
- Ao concluir tarefa, botão "Registar atividade" pré-preenche form em `activities`.
- Widget no dashboard: "Tarefas pendentes hoje".

**Valor:** substitui grupos de WhatsApp; mede produtividade real.

---

### 1.3 Manutenção Preventiva de Veículos
**Tabelas novas:**
```
manutencao_planos (
  id uuid pk,
  vehicle_id uuid fk,
  tipo text,                  -- "Mudanca de oleo", "Revisao", "Pneus"
  intervalo_km numeric,
  intervalo_horas numeric,
  intervalo_dias int,
  ultimo_km numeric,
  ultimo_horas numeric,
  ultima_data date,
  active boolean
)

manutencao_eventos (
  id uuid pk,
  plano_id uuid fk,
  data date,
  km numeric,
  horas numeric,
  custo numeric,
  fornecedor text,
  notas text,
  expense_id uuid fk nullable  -- link p/ despesa criada
)
```

**UI:**
- Tab **Manutenção** na página Veículos.
- Alertas no Dashboard: "5 manutenções devidas este mês".
- Ao marcar evento, opção "Criar despesa" que abre modal de despesa de veículo pré-preenchido.

**Integração:** lê KM atuais dos últimos `fuel_logs` por veículo.

---

### 1.4 Custo por Parcela / Cultura
**Sem tabelas novas.** Vista SQL:
```sql
create view v_custo_parcela as
  select
    p.id, p.nome, p.cultura_atual, p.area_ha,
    coalesce(sum_desp, 0) as despesas,
    coalesce(sum_horas, 0) as horas,
    coalesce(sum_horas * 10, 0) as custo_mo,  -- custo/hora configurável
    coalesce(sum_stock, 0) as consumo_stock
  from parcelas p
  left join lateral (
    select sum(invoice_amount) as sum_desp from general_expenses where parcela_id = p.id
  ) d on true
  ...
```

**UI:**
- Nova aba no Dashboard: **Parcelas** com tabela custo total, custo/ha, top-3 despesas.
- Export Excel adicionado ao multi-sheet.

**Depende de:** 1.1.

---

### 1.5 Caderno de Campo Fitossanitário
**Tabelas novas:**
```
aplicacoes_fito (
  id uuid pk,
  data date,
  parcela_id uuid fk,
  product_id uuid fk products,
  dose_por_ha numeric(10,3),
  area_tratada_ha numeric(10,3),
  quantidade_total numeric(10,3),  -- computed
  funcionario_id uuid fk,
  intervalo_seguranca_dias int,
  motivo text,                     -- "Praga X", "Doença Y"
  condicoes_meteo text,
  created_at timestamptz
)
```
**Alterações:**
- `products.is_fito boolean` (novo flag, paralelo a `is_feed`).
- RPC atómica `deduct_stock_for_fito` (cópia do `deduct_stock_for_feed`).

**UI:**
- Nova página **Fitossanitários** (listar por parcela, exportar caderno oficial PDF).
- Ao submeter, deduz stock automaticamente.
- Export PDF formatado (legalmente exigido na UE).

**Depende de:** 1.1.

---

## 5. Ordem de execução recomendada

```
Semana 1:
  DT1 (numeric) + DT2 (MoM/YoY)     -- 9-13h, base para tudo
  1.1 Parcelário                      -- 14-20h
  1.3 Manutenção Preventiva           -- 12-16h, paralelo

Semana 2:
  1.4 Custo por Parcela               -- 10-14h
  1.2 Ordens de Trabalho              -- 20-28h

Semana 3:
  1.5 Caderno Fitossanitário          -- 16-22h
  DT3 (RLS hardening) + DT4 (audit)   -- 18-26h

---- Fase 1 entregue ----

Semana 4+:
  Decidir Fase 2 consoante feedback:
    Herdade com gado → 6 Pecuária
    Equipa grande no campo → 7 PWA
    Planeamento anual → 8 Safras
```

---

## 6. Critérios de sucesso por fase

**Fase 1 entregue quando:**
- [ ] Utilizador cria parcela, atribui a uma atividade/despesa
- [ ] Dashboard mostra custo por parcela com export
- [ ] Tarefas atribuídas aparecem na vista do funcionário
- [ ] Alerta de manutenção dispara a 100 KM antes do limite
- [ ] Aplicação fitossanitária gera entrada no caderno e deduz stock
- [ ] Todas as colunas numéricas sensíveis em `numeric(14,3)`
- [ ] Dashboard mostra variação % vs mês anterior
- [ ] Pelo menos 3 policies RLS críticas auditadas e documentadas

---

## 7. Fontes do benchmark

- Agrivi: https://www.getapp.com/operations-management-software/a/agrivi/
- Agrivi G2: https://www.g2.com/products/agrivi/reviews
- farmOS: https://farmos.org/guide/ · https://github.com/farmOS/farmOS
- Tania Core: https://github.com/usetania/tania-core
- Top 10 Farm Management Software 2026 — Gitnux: https://gitnux.org/best/farm-management-software/
- Farmbrite: https://www.farmbrite.com
- SourceTrace: https://sourcetrace.com/
- iLivestock: https://www.ilivestock.com/
- Aglive: https://aglive.com/
- Trace Agtech: https://traceagtech.com/

---

## 8. Próximos passos

1. Ler este documento + dar feedback / reordenar prioridades.
2. Confirmar se a herdade tem **gado** (afeta prioridade de Pecuária).
3. Confirmar custo/hora médio de mão-de-obra (usado em 1.4).
4. Abrir primeiro ticket: **DT1 + 1.1 Parcelário** (base técnica para o resto).
