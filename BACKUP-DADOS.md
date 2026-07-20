# Backup dos DADOS de cliente — RARO Home

O código e a **estrutura** do banco já estão versionados no git (schema em
`supabase/migrations/00000000000000_base_schema.sql`, catálogo em
`supabase/seed.sql`). O que falta pra um backup "sem perder nada" são os
**dados de cliente**: `clients`, `proposals`, `projects`, `reservations`,
`stock_log`, `audit_log`.

## Por que esses ficam de fora do git

1. **Têm PII e segredos** — nomes, endereços, e senhas de câmera/Wi-Fi em
   texto puro dentro de `proposals.planta_data`. Não pode ir pra repositório
   (LGPD; e se o repo virar público, vaza).
2. **São grandes** — ~15 MB: as propostas guardam o HTML dos documentos
   gerados (~9 MB, que o app *reconstrói* do `planta_data`) e os clientes
   guardam imagens de planta em base64 (~4,6 MB, essas **não** são
   recuperáveis).

## Você já tem backup automático (Supabase)

O Supabase faz **backup diário automático** do banco. No painel:
**Database → Backups**. Dá pra restaurar dali sem fazer nada. Isso já te
protege contra "perder tudo".

## Para um backup PORTÁTIL (subir do zero em outro lugar)

Um comando, roda direto do banco pro arquivo (não passa por ninguém):

```powershell
# PowerShell, dentro do rdev. Precisa da connection string (Dashboard →
# Project Settings → Database → Connection string → URI).
$env:PATH = "C:\Users\raphael.solano\rnode\node-v20.18.1-win-x64;$env:PATH"

# SÓ os dados (a estrutura já está no git):
npx supabase db dump --data-only --db-url "SUA_CONNECTION_STRING" -f raro-dados-backup.sql
```

Isso gera **um arquivo** com todos os dados (clientes, orçamentos, projetos,
catálogo, logs — tudo). Guarde num lugar **privado** (não no git, não em nuvem
compartilhada).

### Restaurar em outro projeto

```powershell
# 1. cria a estrutura vazia:
#    roda supabase/migrations/00000000000000_base_schema.sql no projeto novo
# 2. (opcional) catálogo:  roda supabase/seed.sql
# 3. injeta os dados:
npx supabase db dump ... (ou psql) aplicando raro-dados-backup.sql
```

## Resumo do que está onde

| Parte | Onde | No git? |
|---|---|---|
| Código do app | `git bundle` + zip da versão | sim (bundle) |
| Estrutura do banco | `supabase/migrations/00000000000000_base_schema.sql` | **sim** |
| Catálogo/fornecedores/ferramentas | `supabase/seed.sql` | **sim** (dado da empresa, sem PII de cliente) |
| Clientes/orçamentos/projetos/logs | `raro-dados-backup.sql` (você gera) | **não** (PII) |
| Backup automático | Supabase → Database → Backups | — |

## ⚠ Sobre os segredos plaintext

Enquanto as senhas de câmera/Wi-Fi forem guardadas em texto puro no banco,
qualquer backup de dados carrega esses segredos. O ideal (futuro) é cifrar
esses campos antes de gravar. Por ora: trate o `raro-dados-backup.sql` como
arquivo sigiloso.
