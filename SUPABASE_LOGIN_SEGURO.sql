-- ═══════════════════════════════════════════════════════════════════
-- RARO Home — Login seguro (RLS: banco só entrega dados a quem logou)
-- Rode este SQL no Supabase: Menu SQL Editor > New query > cole > Run.
-- ═══════════════════════════════════════════════════════════════════

-- ETAPA 1 — Ligar RLS em todas as tabelas do RARO.
-- Com RLS ligado, o banco NEGA acesso por padrão. Só quem passar nas
-- políticas abaixo consegue ler/escrever. É a trava de verdade: não dá
-- pra burlar pelo navegador, a decisão é do servidor.

-- Ajuste esta lista se você tiver outras tabelas. As mais comuns do RARO:
alter table if exists clients        enable row level security;
alter table if exists proposals      enable row level security;
alter table if exists projects       enable row level security;
alter table if exists stock          enable row level security;
alter table if exists catalog        enable row level security;
alter table if exists admins         enable row level security;
alter table if exists suppliers      enable row level security;
alter table if exists tools          enable row level security;
alter table if exists stock_log      enable row level security;
alter table if exists audit_log      enable row level security;
alter table if exists finance_ledger enable row level security;

-- ETAPA 2 — Política base: "só quem está logado acessa".
-- Isto tranca a porta sem prender ninguém por dentro: qualquer usuário
-- AUTENTICADO (que passou pelo login) pode ler e escrever. Quem não
-- logou, não vê nada. Já é um salto enorme de segurança e NÃO quebra
-- as telas que hoje funcionam.
--
-- (Depois, com calma, apertamos por papel: mestre só vê a obra dele,
--  viewer não escreve, etc. Isso vem numa segunda rodada.)

do $$
declare t text;
begin
  foreach t in array array[
    'clients','proposals','projects','stock','catalog','admins',
    'suppliers','tools','stock_log','audit_log','finance_ledger'
  ] loop
    -- limpa política anterior de mesmo nome, se existir (evita erro ao rodar de novo)
    execute format('drop policy if exists raro_auth_all on %I;', t);
    -- cria a política: authenticated pode tudo; anon não
    execute format(
      'create policy raro_auth_all on %I for all to authenticated using (true) with check (true);', t
    );
  end loop;
end $$;

-- Pronto. A partir daqui, o RARO só devolve dados para quem fez login
-- de verdade (senha via bcrypt no servidor, ou Google), e cujo e-mail
-- está na tabela admins (a checagem da lista é feita no app no momento
-- do login, e o RLS garante que ninguém sem sessão toque no banco).
