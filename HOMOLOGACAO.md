# Homologação × Produção — RARO Home

Como ter uma versão de teste no ar **sem tocar na produção**.

## A regra que não pode ser quebrada

Homologação precisa de **banco próprio**. Se o ambiente de teste apontar para o
Supabase de produção, testar lá **cria e altera orçamentos e projetos reais de
cliente** — aí não é homologação, é produção com outra URL.

## Opção A — deploy avulso pela CLI (mais rápido, sem git)

```bash
npm i -g vercel     # só na primeira vez
cd rdev
vercel              # PREVIEW: gera uma URL própria. NÃO mexe na produção.
vercel --prod       # só isto publica em produção
```

## Opção B — preview por branch (o jeito organizado)

1. Crie um repositório no GitHub e conecte na Vercel.
2. `master` = produção. A branch **`homolog`** (já criada) = homologação.
3. Todo push em `homolog` gera uma URL de preview automática. A produção só
   muda quando o código entra em `master`.

```bash
git checkout homolog
git push -u origin homolog
```

## Variáveis de ambiente na Vercel

Em **Settings → Environment Variables**, cadastre cada variável escolhendo o
ambiente. É isso que separa os dois mundos:

| Variável | Production | Preview (homologação) |
|---|---|---|
| `VITE_SUPABASE_URL` | projeto de produção | **projeto de staging** |
| `VITE_SUPABASE_ANON_KEY` | anon de produção | anon de staging |
| `VITE_APP_ENV` | *(vazio)* | `homologacao` |
| `ANTHROPIC_API_KEY` | chave de produção | chave/cota separada |
| `RESEND_API_KEY` | produção | staging (ou vazio, p/ não enviar e-mail de teste) |
| `ASSINAFY_*` | produção | sandbox |

Os nomes de todas elas estão em `.env.example`.

> A `anon key` do Supabase é pública por design (já vai no bundle). A que
> **nunca** pode ser versionada nem exposta é a `service_role`.

## Como saber em qual ambiente você está

O rodapé da barra lateral mostra a versão e um selo:

- **produção** → sem selo (rodapé limpo)
- **homologação** → selo laranja `homologação`
- **local** → selo azul `local`

A detecção usa `VITE_APP_ENV`; se não estiver setada, cai no hostname
(`localhost` = local, `*.vercel.app` de preview = homologação, domínio próprio
= produção). Ver `appEnv()` em `src/brand.js` — se o domínio de produção mudar,
atualize `PROD_HOSTS` lá.

## Cache do PWA

O app é um PWA com service worker. URLs separadas evitam que o cache de
homologação atrapalhe a produção. Se depois de publicar a tela continuar
mostrando a versão antiga: **Ctrl+Shift+R**, ou F12 → Application → Service
Workers → Unregister.
