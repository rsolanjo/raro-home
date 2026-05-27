# RARO Home — Sistema de Gestão

Sistema completo para gestão de orçamentos, projetos, estoque e clientes.

## Instalação local (Windows/Mac)

### Pré-requisitos
1. Instale o **Node.js LTS** em https://nodejs.org
2. Instale o **VS Code** em https://code.visualstudio.com

### Rodar o sistema

```bash
# 1. Instalar dependências (só na primeira vez)
npm install

# 2. Iniciar o sistema
npm run dev

# 3. Abrir no navegador
# Acesse: http://localhost:5173
```

### Gerar .exe instalável (Windows)

```bash
npm run build
# O instalador aparece em: dist/
```

## Deploy no Vercel (acesso pela internet, grátis)

### Passo a passo

1. Crie uma conta gratuita em https://github.com
2. Crie um repositório novo chamado `raro-home`
3. Faça upload dos arquivos ou use o GitHub Desktop
4. Crie uma conta gratuita em https://vercel.com
5. Clique "New Project" → importe o repositório do GitHub
6. Clique "Deploy" — pronto!

### Importante para Vercel
O banco de dados usa `localStorage` do navegador.
Cada dispositivo/navegador tem seus próprios dados.
Para compartilhar dados entre dispositivos, use a função **Exportar backup** e **Importar backup**.

## Backup dos dados

- **Exportar**: clique "Exportar backup" no topo do sistema → salva um arquivo `.json`
- **Importar**: clique "Importar backup" → selecione o arquivo `.json`
- **Onde ficam os dados**: no `localStorage` do navegador (automático)
- **Recomendação**: exporte backup semanalmente para um Google Drive

## Funcionalidades

- ✅ Dashboard com métricas e tarefas
- ✅ Gerador de propostas com PDF
- ✅ Geração automática de pitch por cômodo
- ✅ Controle de orçamentos (status, histórico)
- ✅ Gestão de projetos por fase
- ✅ Cronograma de instalação
- ✅ Controle de estoque com alertas
- ✅ Cadastro de clientes
- ✅ Catálogo de produtos
- ✅ Exportar/importar backup
