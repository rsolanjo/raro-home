# Assinatura Digital (Assinafy) — Configuração

O contrato tem um botão "Enviar p/ assinatura" que envia o PDF para assinatura digital
via Assinafy (https://www.assinafy.com.br) — grátis até 100 documentos/mês, ICP-Brasil/ITI.

## Passos (uma vez)
1. Crie conta em https://www.assinafy.com.br
2. No Vercel → Settings → Environment Variables, adicione:
   - `ASSINAFY_EMAIL`    = seu e-mail de login da Assinafy
   - `ASSINAFY_PASSWORD` = sua senha
   (ou, se a Assinafy te der uma API Key direta: `ASSINAFY_API_KEY` = a chave)
3. Redeploy. Pronto.

## Como funciona
- Botão "Enviar p/ assinatura" no contrato gera o PDF (html2pdf no navegador),
  envia para /api/sign (função serverless), que:
  1. autentica na Assinafy
  2. cria o documento (upload do PDF)
  3. cria a solicitação de assinatura para cliente + Rogério
- Os signatários recebem e-mail da Assinafy para assinar.

## Sem credenciais
Se as variáveis não estiverem no Vercel, o botão avisa e não quebra nada —
basta usar "Salvar contrato (PDF)" e enviar manualmente.

> Observação: o endpoint usa os caminhos REST padrão da Assinafy (/login, /v1/documents,
> /v1/documents/:id/signatures). Se a documentação atual deles usar outros caminhos,
> ajuste em `api/sign.js` (está todo comentado).
