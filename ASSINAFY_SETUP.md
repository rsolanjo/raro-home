# Assinatura Digital (Assinafy) — Passo a passo

O contrato tem o botão "Enviar p/ assinatura" que manda o PDF para assinatura digital
via Assinafy (ICP-Brasil/ITI) — grátis até 100 documentos/mês.

## 1. Pegar a API Key
1. Entre em https://app.assinafy.com.br (ou https://www.assinafy.com.br/entrar)
2. Vá em Configurações / Desenvolvedor / API
3. Clique em "Gerar API Key" e COPIE o token
4. Anote também o ID da sua conta/workspace (account id) — aparece no mesmo painel/URL

## 2. Configurar no Vercel
1. vercel.com -> projeto raro-home -> Settings -> Environment Variables
2. Adicione duas variáveis (marque Production, Preview e Development):
   - ASSINAFY_API_KEY     = (sua API Key)
   - ASSINAFY_ACCOUNT_ID  = (o id da conta)
3. Salve

## 3. Redeploy
- Deployments -> no último deploy, menu "..." -> Redeploy
- Aguarde ~1 minuto

## 4. Enviar um contrato
1. Abra uma proposta -> Gerar contrato
2. Confirme que o cliente tem E-MAIL preenchido (campo editável no contrato)
3. Clique em "Enviar p/ assinatura"
4. Cliente e Rogério recebem e-mail da Assinafy para assinar

## Como funciona por dentro
- O botão gera o PDF no navegador (html2pdf) e envia para /api/sign (serverless).
- /api/sign faz: upload do PDF -> cria signatários -> cria o envio de assinatura.
- Sem as variáveis configuradas, o botão apenas avisa — nada quebra. Use "Salvar PDF" e envie manual.

## Se der erro
A resposta de erro mostra o "detail" da Assinafy. Os caminhos usados são:
- POST /v1/accounts/{accountId}/documents      (upload)
- POST /v1/accounts/{accountId}/signers        (signatários)
- POST /v1/documents/{documentId}/assignments  (envio)
Header de auth: X-Api-Key. Documentação: https://api.assinafy.com.br/v1/docs
Se algum caminho/limite mudar, ajuste em api/sign.js (está comentado).
