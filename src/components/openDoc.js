// Abre um documento HTML de forma robusta, contornando bloqueadores de popup.
// Estratégia:
//  1) Abre uma aba em branco IMEDIATAMENTE (precisa estar no gesto do clique).
//  2) Se conseguiu, injeta o HTML via blob URL (mais confiável que document.write para conteúdo grande).
//  3) Se o popup foi bloqueado, baixa o arquivo .html automaticamente.
// Retorna 'opened' | 'downloaded'.

export function openHtmlDoc(html, filename='documento.html') {
  let win = null
  try { win = window.open('', '_blank') } catch (e) { win = null }

  let blobUrl = null
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    blobUrl = URL.createObjectURL(blob)
  } catch (e) { blobUrl = null }

  if (win && blobUrl) {
    // Redireciona a aba já aberta para o blob — renderiza o HTML completo
    try {
      win.location.href = blobUrl
      setTimeout(() => { try { URL.revokeObjectURL(blobUrl) } catch (e) {} }, 60000)
      return 'opened'
    } catch (e) { /* cai pro fallback */ }
  }

  if (win && !blobUrl) {
    // Sem blob: escreve direto
    try { win.document.open(); win.document.write(html); win.document.close(); return 'opened' } catch (e) {}
  }

  // Popup bloqueado → baixa o arquivo
  try {
    if (!blobUrl) {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      blobUrl = URL.createObjectURL(blob)
    }
    const a = document.createElement('a')
    a.href = blobUrl; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => { try { URL.revokeObjectURL(blobUrl) } catch (e) {} }, 60000)
    return 'downloaded'
  } catch (e) {
    alert('Não foi possível abrir nem baixar o documento: ' + e.message)
    return 'failed'
  }
}

// Baixa direto como arquivo (sem tentar abrir aba)
export function downloadHtmlDoc(html, filename='documento.html') {
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => { try { URL.revokeObjectURL(url) } catch (e) {} }, 60000)
    return true
  } catch (e) {
    alert('Erro ao baixar: ' + e.message)
    return false
  }
}

const safe = s => (s || '').toString().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-')

// Embrulha o exec_doc (HTML interno) num documento completo com fontes + botão imprimir
export function wrapExecDoc(execDoc, clientName, code) {
  const title = `Projeto Executivo RARO Home — ${clientName || 'Cliente'}${code ? ' — ' + code : ''}`
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>` +
    `<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"></head>` +
    `<body style="margin:0">${execDoc}` +
    `<button class="no-print" onclick="window.print()" style="position:fixed;top:10px;right:10px;background:#0EA5E9;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;z-index:9999;font-family:sans-serif">⬇ Salvar PDF</button>` +
    `<style>@media print{.no-print{display:none}}</style></body></html>`
}

export { safe as safeFileName }
