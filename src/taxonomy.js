// ── RARO Home — Taxonomia oficial de Categorias e Subcategorias ──────────────

export const TAXONOMY = {
  'Segurança':    ['Câmera IP', 'Central de Alarme', 'Gravador NVR'],
  'Redes':        ['Access Point', 'Switch', 'Keystone', 'Patch Panel', 'Cabos Cat6', 'Patch Cord', 'Rack'],
  'Sonorização':  ['Amplificador', 'Caixa de Som', 'Subwoofer', 'Receiver', 'Cabeamento Som'],
  'Gourmet':      ['Churrasqueira', 'Coifa', 'Móveis', 'Painel de Led'],
  'Automação':    ['Interruptor', 'Hub IR', 'Módulo Iluminação', 'Módulo Cortina', 'Tomada', 'Sensor mmWave', 'Gateway Zigbee', 'Rack'],
}

export const ALL_CATEGORIES = Object.keys(TAXONOMY)
export const ALL_SUBCATEGORIES = [...new Set(Object.values(TAXONOMY).flat())]

// ── Inferir categoria + subcategoria a partir do nome do item ─────────────────
export function inferCategory(name = '', existingCategory = '') {
  const n = name.toLowerCase()

  // ── Redes ──
  if (n.includes('access point') || n.includes('ap u6') || n.includes('unifi ap')) return { cat: 'Redes', sub: 'Access Point' }
  if (n.includes('patch panel'))                                                     return { cat: 'Redes', sub: 'Patch Panel' }
  if (n.includes('patch cord') || n.includes('patch cord'))                         return { cat: 'Redes', sub: 'Patch Cord' }
  if (n.includes('keystone'))                                                        return { cat: 'Redes', sub: 'Keystone' }
  if (n.includes('switch') || n.includes('dream machine') || n.includes('udm') || n.includes('roteador')) return { cat: 'Redes', sub: 'Switch' }
  if (n.includes('cabo utp') || n.includes('cabo ftp') || n.includes('cat6') || n.includes('cat5') || n.includes('cabo de rede')) return { cat: 'Redes', sub: 'Cabos Cat6' }
  if (n.includes('rack') && !n.includes('keypad') && !n.includes('hub'))            return { cat: 'Redes', sub: 'Rack' }

  // ── Segurança ──
  if (n.includes('câmera') || n.includes('camera') || n.includes('dome') || n.includes('bullet') || n.includes('cftv')) return { cat: 'Segurança', sub: 'Câmera IP' }
  if (n.includes('nvr') || n.includes('dvr') || n.includes('gravador'))             return { cat: 'Segurança', sub: 'Gravador NVR' }
  if (n.includes('alarme') || n.includes('central de alarme'))                      return { cat: 'Segurança', sub: 'Central de Alarme' }

  // ── Sonorização ──
  if (n.includes('amplificador') || n.includes('frahm') || n.includes('multicanal')) return { cat: 'Sonorização', sub: 'Amplificador' }
  if (n.includes('receiver') || n.includes('yamaha rx') || n.includes('onkyo'))     return { cat: 'Sonorização', sub: 'Receiver' }
  if (n.includes('subwoofer'))                                                       return { cat: 'Sonorização', sub: 'Subwoofer' }
  if ((n.includes('caixa') || n.includes('speaker') || n.includes('alto-falante')) &&
      (n.includes('jbl') || n.includes('bose') || n.includes('klipsch') || n.includes('som') || n.includes('embutir') || n.includes('260') || n.includes('280'))) return { cat: 'Sonorização', sub: 'Caixa de Som' }
  if (n.includes('cabo') && (n.includes('som') || n.includes('1,5mm') || n.includes('1.5mm') || n.includes('áudio'))) return { cat: 'Sonorização', sub: 'Cabeamento Som' }

  // ── Gourmet ──
  if (n.includes('churrasqueira'))                                                   return { cat: 'Gourmet', sub: 'Churrasqueira' }
  if (n.includes('coifa'))                                                           return { cat: 'Gourmet', sub: 'Coifa' }
  if (n.includes('painel de led') || n.includes('painel led'))                      return { cat: 'Gourmet', sub: 'Painel de Led' }
  if (n.includes('móvel') || n.includes('movel') || n.includes('marcenaria'))       return { cat: 'Gourmet', sub: 'Móveis' }

  // ── Automação ──
  if (n.includes('hub ir') || n.includes('ir zigbee') || n.includes('controle av') || n.includes('broadlink')) return { cat: 'Automação', sub: 'Hub IR' }
  if (n.includes('keypad') || n.includes('interruptor') || n.includes('dimmer'))    return { cat: 'Automação', sub: 'Interruptor' }
  if (n.includes('módulo cortina') || n.includes('motor cortina') || n.includes('motor persiana') || n.includes('cortina zigbee')) return { cat: 'Automação', sub: 'Módulo Cortina' }
  if (n.includes('módulo') || n.includes('controlador') || n.includes('dimmer'))    return { cat: 'Automação', sub: 'Módulo Iluminação' }
  if (n.includes('tomada'))                                                          return { cat: 'Automação', sub: 'Tomada' }
  if (n.includes('mmwave') || n.includes('sensor de presença') || n.includes('sensor zigbee') || n.includes('sensor mmwave')) return { cat: 'Automação', sub: 'Sensor mmWave' }
  if (n.includes('gateway') || n.includes('gateway zigbee') || n.includes('hub home') || (n.includes('zigbee') && !n.includes('hub ir') && !n.includes('keypad'))) return { cat: 'Automação', sub: 'Gateway Zigbee' }

  // Fallback
  if (existingCategory && ALL_CATEGORIES.includes(existingCategory)) {
    const subs = TAXONOMY[existingCategory] || []
    return { cat: existingCategory, sub: subs[0] || '' }
  }
  return { cat: 'Automação', sub: 'Interruptor' }
}

// ── Gera ID único baseado em cômodo + subcategoria + índice ──────────────────
const SUB_CODE = {
  // Redes
  'Access Point':   'AP',
  'Switch':         'SW',
  'Keystone':       'KS',
  'Patch Panel':    'PP',
  'Cabos Cat6':     'CAB',
  'Patch Cord':     'PC',
  'Rack':           'RCK',
  // Segurança
  'Câmera IP':      'CAM',
  'Gravador NVR':   'NVR',
  'Central de Alarme': 'ALM',
  // Sonorização
  'Amplificador':   'AMP',
  'Caixa de Som':   'CX',
  'Subwoofer':      'SUB',
  'Receiver':       'RCV',
  'Cabeamento Som': 'CSOM',
  // Gourmet
  'Churrasqueira':  'CHR',
  'Coifa':          'COI',
  'Móveis':         'MOV',
  'Painel de Led':  'PNL',
  // Automação
  'Interruptor':    'KPD',
  'Hub IR':         'IR',
  'Módulo Iluminação': 'MIL',
  'Módulo Cortina': 'MCT',
  'Tomada':         'TOM',
  'Sensor mmWave':  'MMW',
  'Gateway Zigbee': 'GW',
}

export function genItemId(room = '', subcategory = '', existingMarkers = []) {
  // Código do cômodo: remove vogais e espaços, pega até 4 consoantes em maiúsculo
  const roomCode = (room || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[aeiou\s]/gi, '')                           // remove vogais e espaços
    .toUpperCase()
    .slice(0, 4) || 'GRL'

  const subCode = SUB_CODE[subcategory]
    || (subcategory || '').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 3)
    || 'ITM'

  const prefix = `${roomCode}-${subCode}`
  const count = existingMarkers.filter(m => (m.id || '').startsWith(prefix)).length
  return `${prefix}${count + 1}`
}

// ── Cor e símbolo por categoria para uso na planta ───────────────────────────
export const CATEGORY_STYLE = {
  'Segurança':    { c: '#DC2626', s: 'S' },
  'Redes':        { c: '#0EA5E9', s: 'R' },
  'Sonorização':  { c: '#BE185D', s: '♪' },
  'Gourmet':      { c: '#D97706', s: 'G' },
  'Automação':    { c: '#059669', s: 'A' },
}

export function categoryStyle(cat) {
  return CATEGORY_STYLE[cat] || { c: '#6B7280', s: '?' }
}
