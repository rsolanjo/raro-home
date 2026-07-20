# RARO Home — Ativar o login seguro (passo a passo)

O código do login novo já está pronto (Google + e-mail/senha, verificação
no servidor). Falta ligar duas coisas que ficam do seu lado, porque passam
pela sua conta Supabase e Google. Uma vez só.

---

## PARTE 1 — Trancar o banco (RLS) — 2 minutos

1. Entre no seu projeto em https://supabase.com
2. Menu lateral: **SQL Editor** > **New query**.
3. Abra **supabase/migrations/20260101000007_login_seguro_rls.sql**, copie tudo, cole.
4. Clique em **Run**.

Pronto. Agora o banco só entrega dados pra quem fez login de verdade.
(Fonte do conceito: supabase.com/docs/guides/database/postgres/row-level-security)

Se alguma tela do RARO parar de carregar depois disso, me avise: significa
que existe uma tabela fora da lista do SQL, e a gente inclui em 1 minuto.

---

## PARTE 2 — Ligar o login com e-mail/senha — 1 minuto

1. No Supabase: **Authentication** > **Sign In / Providers** (ou "Providers").
2. **Email**: deixe **habilitado**.
3. Recomendado para começar rápido: **desligue** "Confirm email"
   (assim a pessoa cria a senha e já entra, sem esperar e-mail de confirmação).
   Depois, se quiser mais rigor, religue.
(Fonte: supabase.com/docs/guides/auth/passwords)

---

## PARTE 3 — Ligar o login com Google — 10 minutos

Isso exige registrar o RARO no Google, porque é o Google que autoriza o login.
É gratuito.

### 3a. No Google Cloud (criar as credenciais)
1. Acesse https://console.cloud.google.com
2. Crie um projeto (ou use um existente). Nome sugerido: "RARO Home Login".
3. Menu: **APIs e serviços** > **Tela de permissão OAuth**.
   - Tipo de usuário: **Externo**. Preencha nome do app (RARO Home),
     e-mail de suporte e e-mail do desenvolvedor. Salve.
4. Menu: **APIs e serviços** > **Credenciais** > **Criar credenciais**
   > **ID do cliente OAuth**.
   - Tipo: **Aplicativo da Web**.
   - Em **URIs de redirecionamento autorizados**, cole a URL que o Supabase
     te dá (veja passo 3b). Guarde o **ID do cliente** e a **Chave secreta**.
(Fonte: developers.google.com/identity/protocols/oauth2)

### 3b. No Supabase (colar as credenciais)
1. **Authentication** > **Sign In / Providers** > **Google**.
2. Ative o Google. Ele mostra uma **Callback URL** (algo como
   https://SEU-PROJETO.supabase.co/auth/v1/callback).
3. Copie essa URL e cole lá no Google Cloud (passo 3a, item 4, URIs de redirecionamento).
4. Volte ao Supabase e cole o **ID do cliente** e a **Chave secreta** do Google.
5. Salve.
(Fonte: supabase.com/docs/guides/auth/social-login/auth-google)

### 3c. Autorizar o site do RARO
No Supabase: **Authentication** > **URL Configuration** >
adicione a URL do RARO no Vercel em **Redirect URLs** (ex: https://raro-home.vercel.app).

---

## PARTE 4 — Como funciona no dia a dia (pra sua equipe)

- Você cadastra a pessoa na tela **Usuários** (nome, e-mail, papel), como já fazia.
- A pessoa entra de um destes jeitos:
  - **Google**: clica em "Entrar com Google", escolhe a conta. Pronto.
  - **Senha**: na primeira vez clica em "Criar minha senha", define, e entra.
- Quem NÃO está cadastrado por você é **barrado**, mesmo com Google válido.
  (Ter conta Google não basta: o e-mail tem que estar na sua lista.)

Os três níveis continuam iguais: Admin vê tudo, Visualizador só lê,
Mestre de obra só o diário.

---

## Ordem recomendada
Faça a PARTE 1 e a PARTE 2 primeiro (login por senha já funciona).
Teste você mesma criando sua senha. Depois faça a PARTE 3 (Google) com calma.
Se travar em qualquer passo, print da tela e me chame.
