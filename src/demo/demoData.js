// ═══════════════════════════════════════════════════════════════════════════
// DADOS DEMO — 100% fictícios, para o modo /demo (visão de parceiros).
// Nenhum dado real de cliente, valor, catálogo ou financeiro da RARO aparece aqui.
// Cliente, endereço, contato e números são inventados. Estrutura fiel a um
// projeto RARO típico para que TODAS as funcionalidades tenham o que exibir.
// ═══════════════════════════════════════════════════════════════════════════

const I = (name, category, icon, qty, sale, cost) => ({
  name, category, icon, qty,
  sale_price: sale, cost_price: cost, price: sale * qty,
})

// ── Cliente demo ────────────────────────────────────────────────────────────
export const DEMO_CLIENT = {
  id: 90001,
  name: 'Marina e Thiago Andrade',
  full_name: 'Marina Andrade',
  full_name2: 'Thiago Andrade',
  email: 'contato.demo@exemplo.com',
  phone: '(21) 90000-0000',
  phone1: '(21) 90000-0000',
  housing_type: 'residencial',
  street: 'Rua das Palmeiras Douradas',
  number: '128',
  complement: 'Casa',
  neighborhood: 'Jardim Aurora',
  city: 'Rio de Janeiro',
  state: 'RJ',
  cep: '20000-000',
  area_m: 320,
  total_rooms: 9,
  created_at: '2026-05-02T10:00:00.000Z',
}

// ── Estrutura de ambientes/itens (proposta) ─────────────────────────────────
const FLOORS = [
  { name: 'Térreo', icon: '◈', rooms: [
    { name: 'Sala de Estar', icon: '◉', price: 8400, items: [
      I('Keypad 4 teclas', 'Automação', '⬡', 2, 890, 520),
      I('Módulo de iluminação 4 canais', 'Automação', '▣', 1, 1650, 980),
      I('Caixa de som embutida', 'Som', '◍', 4, 620, 360),
    ]},
    { name: 'Cozinha / Gourmet', icon: '◉', price: 6200, items: [
      I('Keypad 2 teclas', 'Automação', '⬡', 1, 690, 400),
      I('Caixa de som embutida', 'Som', '◍', 2, 620, 360),
      I('Sensor de presença mmW', 'Sensor', '◈', 1, 540, 310),
    ]},
    { name: 'Varanda', icon: '◉', price: 4100, items: [
      I('Câmera externa 4MP', 'Câmera', '◆', 2, 780, 460),
      I('Módulo de cortina', 'Automação', '▣', 1, 1200, 720),
    ]},
    { name: 'Área Externa', icon: '◉', price: 5300, items: [
      I('Câmera externa 4MP', 'Câmera', '◆', 3, 780, 460),
      I('Access Point Wi-Fi 6', 'Rede', '◈', 1, 1100, 650),
    ]},
  ]},
  { name: 'Superior', icon: '◈', rooms: [
    { name: 'Suíte Master', icon: '◉', price: 5600, items: [
      I('Keypad 4 teclas', 'Automação', '⬡', 1, 890, 520),
      I('Módulo de cortina', 'Automação', '▣', 2, 1200, 720),
      I('Caixa de som embutida', 'Som', '◍', 2, 620, 360),
    ]},
    { name: 'Suíte 2', icon: '◉', price: 3200, items: [
      I('Keypad 2 teclas', 'Automação', '⬡', 1, 690, 400),
      I('Módulo de cortina', 'Automação', '▣', 1, 1200, 720),
    ]},
    { name: 'Home Office', icon: '◉', price: 2800, items: [
      I('Access Point Wi-Fi 6', 'Rede', '◈', 1, 1100, 650),
      I('Keypad 2 teclas', 'Automação', '⬡', 1, 690, 400),
    ]},
    { name: 'Circulação', icon: '◉', price: 1400, items: [
      I('Sensor de presença mmW', 'Sensor', '◈', 2, 540, 310),
    ]},
  ]},
]

// ── Proposta demo ───────────────────────────────────────────────────────────
export const DEMO_PROPOSAL = {
  id: 90101,
  code: 'DEMO-0001',
  client_id: 90001,
  client_name: 'Marina e Thiago Andrade',
  client: 'Marina e Thiago Andrade',
  description: 'Automação residencial completa — casa Jardim Aurora (projeto de demonstração).',
  status: 'approved',
  floors: FLOORS,
  labor: 9800,
  sale: 46200,
  cost: 27100,
  exec_value: 46200,
  pct: 40,
  created_at: '2026-05-06T14:00:00.000Z',
}

// ── Catálogo demo (pequeno, fictício) ───────────────────────────────────────
export const DEMO_CATALOG = [
  { id: 1, name: 'Keypad 4 teclas', category: 'Automação', sale_price: 890, cost_price: 520, unit: 'un' },
  { id: 2, name: 'Keypad 2 teclas', category: 'Automação', sale_price: 690, cost_price: 400, unit: 'un' },
  { id: 3, name: 'Módulo de iluminação 4 canais', category: 'Automação', sale_price: 1650, cost_price: 980, unit: 'un' },
  { id: 4, name: 'Módulo de cortina', category: 'Automação', sale_price: 1200, cost_price: 720, unit: 'un' },
  { id: 5, name: 'Câmera externa 4MP', category: 'Câmera', sale_price: 780, cost_price: 460, unit: 'un' },
  { id: 6, name: 'Caixa de som embutida', category: 'Som', sale_price: 620, cost_price: 360, unit: 'un' },
  { id: 7, name: 'Access Point Wi-Fi 6', category: 'Rede', sale_price: 1100, cost_price: 650, unit: 'un' },
  { id: 8, name: 'Sensor de presença mmW', category: 'Sensor', sale_price: 540, cost_price: 310, unit: 'un' },
  { id: 9, name: 'Central de automação', category: 'Automação', sale_price: 3200, cost_price: 1900, unit: 'un' },
  { id: 10, name: 'Switch gerenciável 8 portas', category: 'Rede', sale_price: 1400, cost_price: 820, unit: 'un' },
]

// ── Projeto (fase de obra) demo ─────────────────────────────────────────────
export const DEMO_PROJECT = {
  id: 90201,
  proposal_id: 90101,
  client_name: 'Marina e Thiago Andrade',
  code: 'DEMO-0001',
  phase: 'obra',
  progress: 45,
  created_at: '2026-05-10T09:00:00.000Z',
}

// ── Financeiro demo (ledger da aba Caixa) ───────────────────────────────────
// Estrutura compatível com CaixaRaro: parcelas com pix/venc/pago, custos marcados.
export const DEMO_LEDGER = {
  '90101': {
    valor_total: '46200,00',
    forma: 'Entrada 40% + 3x no PIX',
    parcelas: [
      { id: 'd1', valor: '18480,00', venc: '2026-05-15', pago: true,  data_pago: '2026-05-15', pix: 'RARO' },
      { id: 'd2', valor: '9240,00',  venc: '2026-06-15', pago: true,  data_pago: '2026-06-16', pix: 'Rogério' },
      { id: 'd3', valor: '9240,00',  venc: '2026-07-15', pago: false, pix: 'RARO' },
      { id: 'd4', valor: '9240,00',  venc: '2026-08-15', pago: false, pix: 'Raphael' },
    ],
    custos: [
      { id: 'c1', desc: 'Cabos e eletrodutos (lote inicial)', valor: '3200,00', tipo: 'adiantamento', pix: 'Raphael', cobrado: false },
      { id: 'c2', desc: 'Keypads e módulos (fornecedor)',     valor: '6800,00', tipo: 'cobrar',       pix: 'RARO',    cobrado: true  },
    ],
  },
}
export const DEMO_EMPRESA = {
  despesas: [
    { id: 'e1', data: '2026-05-20', desc: 'Uber visita técnica (demo)', cat: 'Transporte', valor: '68,00' },
    { id: 'e2', data: '2026-06-02', desc: 'Assinatura software (demo)', cat: 'TI / Software', valor: '149,00' },
  ],
}

export const DEMO_USER = { id: 0, name: 'Parceiro (demonstração)', role: 'demo' }

export function buildDemoData() {
  return {
    clients:   [DEMO_CLIENT],
    proposals: [DEMO_PROPOSAL],
    projects:  [DEMO_PROJECT],
    stock:     [],
    catalog:   DEMO_CATALOG,
    admins:    [DEMO_USER],
    suppliers: [],
    tools:     [],
  }
}
