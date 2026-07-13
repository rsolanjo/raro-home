// Abre/imprime/baixa documentos HTML de forma robusta.
// Estratégia: abre uma aba com o HTML + dispara window.print() automaticamente.
// O browser mostra "Salvar como PDF" — forma mais universal de gerar PDF.
// Fallback: se popup bloqueado, baixa o .html para abrir localmente.
import { demoWatermark } from '../brand.js'

export function openHtmlDoc(html, filename = 'documento.html') {
  // Injeta auto-print no HTML para ele abrir o diálogo de PDF sozinho
  const withPrint = injectAutoPrint(html, filename)

  let win = null
  try { win = window.open('', '_blank') } catch (e) { win = null }

  if (win) {
    try {
      const blob = new Blob([withPrint], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      win.location.href = url
      setTimeout(() => { try { URL.revokeObjectURL(url) } catch (_) {} }, 90000)
      return 'opened'
    } catch (e) {
      try { win.document.open(); win.document.write(withPrint); win.document.close(); return 'opened' } catch (_) {}
    }
  }

  // Popup bloqueado → baixa o arquivo .html (o usuário abre e imprime)
  return downloadHtmlDoc(withPrint, filename.replace('.html','') + '-abra-para-PDF.html')
}

// Baixa diretamente como arquivo .html (abre e Ctrl+P → Salvar como PDF)
export function downloadHtmlDoc(html, filename = 'documento.html') {
  const withPrint = injectAutoPrint(html, filename)
  try {
    const blob = new Blob([withPrint], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename.endsWith('.html') ? filename : filename + '.html'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    setTimeout(() => { try { URL.revokeObjectURL(url) } catch (_) {} }, 60000)
    return true
  } catch (e) {
    alert('Erro ao baixar: ' + e.message)
    return false
  }
}

// Injeta um script que dispara window.print() assim que a página carrega
function injectAutoPrint(html, filename) {
  const printBtn = `<button class="no-print" onclick="window.print()" style="position:fixed;top:12px;right:12px;background:#0EA5E9;color:#fff;border:none;padding:9px 18px;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px;z-index:9999;font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.18)">⬇ Salvar PDF</button>`
  const autoScript = `<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},800)});<\/script>`
  const printStyle = `<style>@media print{.no-print{display:none!important}@page{margin:10mm 12mm}}</style>`

  // Se já tem </body>, injeta antes dele; senão, adiciona no fim
  const tag = '</body>'
  const insert = `${printBtn}${autoScript}${printStyle}`
  if (html.includes(tag)) {
    return html.replace(tag, insert + tag)
  }
  return html + insert
}

// Embrulha exec_doc em documento completo para impressão/PDF
export function wrapExecDoc(execDoc, clientName, code) {
  const title = `Projeto Executivo RARO Home — ${clientName || 'Cliente'}${code ? ' — ' + code : ''}`
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>` +
    `<link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">` +
    `</head><body style="margin:0">${demoWatermark()}${execDoc}</body></html>`
}

export const safeFileName = s =>
  (s || '').toString().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '-')
