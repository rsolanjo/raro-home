// ═══════════════════════════════════════════════════════════════════════════
// MARCA — fonte única. No modo demo (/demo) o app fica white label: mostra
// "Sua Empresa" e um logo neutro, para o parceiro imaginar a marca dele.
// Fora do demo, é a marca real RARO Home. Não afeta o sistema real.
// ═══════════════════════════════════════════════════════════════════════════
import { LOGO_MONO, LOGO_COVER, LOGO_EXEC } from './logos.js'

function _demo() {
  try {
    if (typeof window === 'undefined') return false
    if (window.__RARO_DEMO__ === true) return true
    // fallback: detecta pela URL (a flag global pode não estar setada em alguns fluxos)
    const p = window.location?.pathname || ''
    const h = window.location?.hash || ''
    return p === '/demo' || p.startsWith('/demo/') || h === '#/demo' || h.startsWith('#demo')
  } catch { return false }
}

// Logo neutro (placeholder) para o white label do demo: quadrado com "SL" (Seu Logo).
const NEUTRO = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" rx="18" fill="#334155"/><rect x="10" y="10" width="100" height="100" rx="12" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="6 5"/><text x="60" y="56" text-anchor="middle" font-family="DM Sans,Arial,sans-serif" font-size="30" font-weight="800" fill="#E2E8F0">SL</text><text x="60" y="82" text-anchor="middle" font-family="DM Sans,Arial,sans-serif" font-size="12" fill="#94A3B8">Seu Logo</text></svg>`)

export function brandName()  { return _demo() ? 'Sua Empresa' : 'RARO Home' }
export function brandSub()   { return _demo() ? 'Automação Residencial' : 'Automação Residencial' }
export function brandLogoMono()  { return _demo() ? NEUTRO : LOGO_MONO }
export function brandLogoCover() { return _demo() ? NEUTRO : LOGO_COVER }
export function brandLogoExec()  { return _demo() ? NEUTRO : LOGO_EXEC }
export function isDemo() { return _demo() }

// Marca d'água gigante "DEMONSTRAÇÃO" para os relatórios/PDFs gerados no modo demo.
// Retorna '' fora do demo. Injetar dentro do <body> do documento.
export function demoWatermark() {
  if (!_demo()) return ''
  return `<div aria-hidden="true" style="position:fixed;inset:0;z-index:2147483000;pointer-events:none;overflow:hidden;display:flex;align-items:center;justify-content:center">
    <div style="transform:rotate(-32deg);font-family:'DM Sans',Arial,sans-serif;font-weight:800;font-size:11vw;letter-spacing:0.1em;color:rgba(180,83,9,0.13);white-space:nowrap;text-transform:uppercase;line-height:1.8;text-align:center">
      DEMONSTRAÇÃO<br>DEMONSTRAÇÃO<br>DEMONSTRAÇÃO<br>DEMONSTRAÇÃO<br>DEMONSTRAÇÃO
    </div>
  </div>
  <style>@media print{ .demo-wm-print{ position:fixed;inset:0 } }</style>`
}
