# Assinatura Digital (Assinafy) — Passo a passo

Confirmado pela CLI oficial da Assinafy (github.com/assinafy/assinafy-cli).

## 1. Pegar a API Key e o Account ID
1. Entre em https://app.assinafy.com.br (ou www.assinafy.com.br/entrar)
2. Configurações / Desenvolvedor / API Keys -> "Gerar API Key" -> COPIE (começa com k_...)
3. Copie também o ID da conta/workspace (account id, começa com acc_...)

## 2. Configurar no Vercel
vercel.com -> projeto raro-home -> Settings -> Environment Variables
(marque Production, Preview e Development):

   Nome                  | Valor
   ----------------------|----------------------------------
   ASSINAFY_API_KEY      | sua API Key (k_...)
   ASSINAFY_ACCOUNT_ID   | id da conta (acc_...)

(opcional, só p/ testes no sandbox)
   ASSINAFY_BASE_URL     | https://sandbox.assinafy.com.br/v1

## 3. Redeploy
Deployments -> último deploy -> "..." -> Redeploy -> aguarde ~1 min

## 4. Enviar
1. Proposta -> Gerar contrato
2. Confirme o E-MAIL do cliente (campo editável no contrato)
3. Botão "Enviar p/ assinatura"
4. Cliente + Rogério recebem e-mail da Assinafy

## Fluxo técnico (api/sign.js)
- Header de auth: X-Api-Key (com Bearer como fallback)
- 1) POST /v1/accounts/{accountId}/documents        (upload do PDF, campo "file")
- 2) POST /v1/accounts/{accountId}/signers          (cria signatários)
- 3) POST /v1/documents/{documentId}/assignments    (envia p/ assinar, signer_ids)
- Base: https://api.assinafy.com.br/v1

## Se der erro
O alerta agora mostra HTTP + resposta da Assinafy + etapas, e loga tudo no Console (F12).
Me mande esse detalhe que eu ajusto o caminho exato.
