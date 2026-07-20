# Migrations — RARO Home

Estrutura do banco versionada aqui. Ordem = ordem do nome do arquivo.

## ✅ Schema base versionado (2026-07-18)

`00000000000000_base_schema.sql` recria o banco **do zero**: as 13 tabelas
(`proposals`, `clients`, `projects`, `catalog`, `stock`, `suppliers`, `admins`,
`audit_log`, `reservations`, `stock_log`, `tools`, `catalog_categories`,
`catalog_subcategories`), com chaves, FKs, RLS e políticas — **idêntico à
produção**, e **sem nenhum dado** (pode ser versionado com segurança).

Foi extraído da produção (`vefbhuspedzcusorgbdh`, sa-east-1) lendo o
`pg_catalog`. O banco não tem funções, triggers, enums nem índices extras —
só tabelas + RLS permissiva (anon/authenticated/public com acesso total, que
é o padrão atual do app).

### Como criar um ambiente novo (ex.: homologação)

1. Crie um projeto Supabase novo (grátis).
2. No **SQL Editor**, rode na ordem: `00000000000000_base_schema.sql` e depois
   as demais migrations abaixo (todas são idempotentes — o base já traz as
   colunas das v114/v117/v134/v237, então elas não fazem nada; ficam só como
   histórico). O `…0006_catalog_taxonomia` e o `…0007_login_seguro_rls` valem
   revisar caso queira a taxonomia/políticas específicas.
3. (Opcional) rode `../seed.sql` para popular o catálogo/fornecedores.

Com Supabase CLI vira um comando: `supabase db push`.

## ⚠ Aviso de segurança (herdado da produção)

- `catalog_subcategories` está **sem RLS** — com a `anon key` qualquer um lê e
  escreve nessa tabela. É assim na produção; o base_schema mantém igual. Se
  quiser fechar: `ALTER TABLE public.catalog_subcategories ENABLE ROW LEVEL
  SECURITY;` + uma policy de leitura. (Não apliquei sozinho pra não mudar o
  comportamento atual.)
- As políticas das outras tabelas são **permissivas** (`using(true)`): a
  segurança real hoje vem da `anon key` não ser pública e do login. Isso é
  cópia fiel da produção, não uma escolha nova.

## Migrations (patches históricos)

| Arquivo | O que faz |
|---|---|
| `…0001_v114_proposals_exec_doc_obra` | coluna `exec_doc_obra` |
| `…0002_v117_proposals_exec_doc_eletrica` | coluna `exec_doc_eletrica` |
| `…0003_v134_proposals_exec_doc_conduites` | coluna `exec_doc_conduites` |
| `…0004_v237_proposals_visita` | coluna `visita` (jsonb) |
| `…0005_stock_log_audit_log_colunas` | colunas em `stock_log` e `audit_log` |
| `…0006_catalog_taxonomia` | tabela `catalog_subcategories` + taxonomia |
| `…0007_login_seguro_rls` | RLS / login seguro |

Todas idempotentes (`IF NOT EXISTS`).

## Backup dos DADOS

O schema (aqui) é a estrutura. Os **dados** (clientes, orçamentos, projetos)
são backup à parte, **fora do git** (têm PII e senhas). Ver
`../../BACKUP-DADOS.md`.
