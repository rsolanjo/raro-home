// ═══════════════════════════════════════════════════════════════════════════
// MODO DEMO — visão de parceiros isolada (/demo).
// Detecta a rota /demo. Em modo demo, TODA leitura e escrita vai para
// localStorage isolada (chaves raro_demo_*), nunca para o Supabase real.
// O parceiro pode alterar tudo; some quando ele reseta. Nada vaza do real.
// ═══════════════════════════════════════════════════════════════════════════
import { buildDemoData, DEMO_LEDGER, DEMO_EMPRESA, DEMO_USER } from './demoData.js'

const KEY = 'raro_demo_state_v5'
const KEY_LEGADO = 'raro_demo_state_v4'

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
  try { localStorage.removeItem('raro_demo_state_v3') } catch {}
  try { localStorage.removeItem('raro_demo_state_v2') } catch {}
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

// true só se TODOS os registros (clientes, propostas, projetos) forem do seed fake (Thiago).
// Antes só olhava clientes: propostas/projetos fantasma no localStorage passavam batido e
// apareciam em "Próximas ações", "Projetos ativos" e "Status por cliente".
function _ehDemoLimpo(st) {
  try {
    const d = st && st.data
    if (!d) return false
    const nomesOk = new Set(['Thiago Andrade'])
    const nomeDe = (r) => (r && (r.name || r.nome || r.client_name || r.client || r.cliente)) || ''
    const listas = [d.clients, d.clientes, d.proposals, d.propostas, d.projects, d.projetos]
    for (const lista of listas) {
      if (!lista) continue
      if (!Array.isArray(lista)) return false
      for (const r of lista) {
        const nome = nomeDe(r)
        // registro sem nome nenhum é ok (ex: catálogo); só barra nome que existe e não é o do seed
        if (nome && !nomesOk.has(nome)) return false
      }
    }
    return true
  } catch { return false }
}

export function saveDemoState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
}

// Reseta o demo ao estado fake original (botão "reiniciar demonstração")
export function resetDemo() {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(KEY_LEGADO)
    localStorage.removeItem('raro_demo_state_v2')
    localStorage.removeItem('raro_demo_state_v1')
    localStorage.removeItem('raro_demo_ledger')
    localStorage.removeItem('raro_demo_empresa')
    localStorage.removeItem('raro_ledger')
    localStorage.removeItem('raro_empresa')
  } catch {}
}

export const DEMO_USER_OBJ = DEMO_USER
