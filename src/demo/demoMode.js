// ═══════════════════════════════════════════════════════════════════════════
// MODO DEMO — visão de parceiros isolada (/demo).
// Detecta a rota /demo. Em modo demo, TODA leitura e escrita vai para
// localStorage isolada (chaves raro_demo_*), nunca para o Supabase real.
// O parceiro pode alterar tudo; some quando ele reseta. Nada vaza do real.
// ═══════════════════════════════════════════════════════════════════════════
import { buildDemoData, DEMO_LEDGER, DEMO_EMPRESA, DEMO_USER } from './demoData.js'

const KEY = 'raro_demo_state_v3'
const KEY_LEGADO = 'raro_demo_state_v2'

export function isDemoMode() {
  try {
    const p = window.location.pathname || ''
    const h = window.location.hash || ''
    return p === '/demo' || p.startsWith('/demo/') || h === '#/demo' || h.startsWith('#demo')
  } catch { return false }
}

// Carrega o estado demo (do localStorage se já houver edições, senão o seed fake)
export function loadDemoState() {
  // limpa qualquer estado de chaves antigas (podiam ter dados reais vazados de versões passadas)
  try { localStorage.removeItem(KEY_LEGADO) } catch {}
  try { localStorage.removeItem('raro_demo_state_v1') } catch {}
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const st = JSON.parse(raw)
      // guarda de sanidade: em demo SÓ pode existir o cliente fake.
      // se aparecer qualquer nome que não seja o do seed, o estado está contaminado: descarta e resemeia.
      if (_ehDemoLimpo(st)) return st
    }
  } catch {}
  const seed = { data: buildDemoData(), ledger: DEMO_LEDGER, empresa: DEMO_EMPRESA }
  try {
    localStorage.setItem(KEY, JSON.stringify(seed))
    // chaves específicas que o CaixaRaro lê em modo demo (força reset também, por segurança)
    localStorage.setItem('raro_demo_ledger', JSON.stringify(DEMO_LEDGER))
    localStorage.setItem('raro_demo_empresa', JSON.stringify(DEMO_EMPRESA))
  } catch {}
  return seed
}

// true só se todos os clientes do estado forem o cliente fake do seed.
function _ehDemoLimpo(st) {
  try {
    const clientes = (st && st.data && (st.data.clients || st.data.clientes)) || []
    if (!Array.isArray(clientes)) return false
    const nomesOk = new Set(['Thiago Andrade'])
    return clientes.every(c => nomesOk.has((c && (c.name || c.nome)) || ''))
  } catch { return false }
}

export function saveDemoState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

// Reseta o demo ao estado fake original (botão "reiniciar demonstração")
export function resetDemo() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem('raro_demo_ledger')
    localStorage.removeItem('raro_demo_empresa')
    localStorage.removeItem('raro_ledger')
    localStorage.removeItem('raro_empresa')
  } catch {}
}

export const DEMO_USER_OBJ = DEMO_USER
