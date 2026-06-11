
// ── RARO Home — Taxonomia de Categorias e Subcategorias ──────────────────────
export const TAXONOMY = {
  'Segurança / CFTV': ['Câmera IP','Câmera Analógica','Sensor de Presença','Central de Alarme','Gravador NVR/DVR','Acessório Segurança'],
  'Redes / WiFi':     ['Access Point','Switch / Roteador','Keystone / Patch','Cabos Cat6/Cat5','Rack / Enclosure','Acessório Rede'],
  'Som Ambiente':     ['Amplificador','Caixa de Som','Subwoofer','Receiver','Cabeamento Som','Acessório Som'],
  'Gourmet / Lazer':  ['Churrasqueira Smart','Iluminação Gourmet','Cortina / Pergolado','TV / Projetor','Acessório Gourmet'],
  'Automação':        ['Keypad / Interruptor','Hub IR / Controle AV','Módulo Iluminação','Módulo Cortina','Tomada Inteligente','Sensor mmWave','Gateway Zigbee','Acessório Automação'],
}
export const ALL_CATEGORIES = Object.keys(TAXONOMY)
export const ALL_SUBCATEGORIES = Object.values(TAXONOMY).flat()

// Inferir categoria/subcategoria a partir do nome do item
export function inferCategory(name='', existingCategory=''){
  const n = name.toLowerCase()
  if(n.includes('access point')||n.includes('ap u6')||n.includes('unifi')) return {cat:'Redes / WiFi', sub:'Access Point'}
  if(n.includes('keystone')||n.includes('patch cord')||n.includes('patch panel')) return {cat:'Redes / WiFi', sub:'Keystone / Patch'}
  if(n.includes('switch')||n.includes('dream machine')||n.includes('udm')||n.includes('roteador')) return {cat:'Redes / WiFi', sub:'Switch / Roteador'}
  if(n.includes('cat6')||n.includes('cat5')||n.includes('cabo utp')||n.includes('cabo ftp')) return {cat:'Redes / WiFi', sub:'Cabos Cat6/Cat5'}
  if(n.includes('rack')||n.includes('12u')||n.includes('19pol')) return {cat:'Redes / WiFi', sub:'Rack / Enclosure'}
  if(n.includes('câmera')||n.includes('camera')||n.includes('dome')||n.includes('bullet')||n.includes('nvr')) return {cat:'Segurança / CFTV', sub: n.includes('nvr')?'Gravador NVR/DVR':'Câmera IP'}
  if(n.includes('sensor de presença')) return {cat:'Segurança / CFTV', sub:'Sensor de Presença'}
  if(n.includes('mmwave')||n.includes('mmwave')) return {cat:'Automação', sub:'Sensor mmWave'}
  if(n.includes('amplificador')||n.includes('frahm')||n.includes('multicanal')) return {cat:'Som Ambiente', sub:'Amplificador'}
  if(n.includes('receiver')||n.includes('yamaha rx')||n.includes('onkyo')) return {cat:'Som Ambiente', sub:'Receiver'}
  if((n.includes('caixa')||n.includes('speaker'))&&(n.includes('jbl')||n.includes('klipsch')||n.includes('bose')||n.includes('som')||n.includes('embutir'))) return {cat:'Som Ambiente', sub:'Caixa de Som'}
  if(n.includes('subwoofer')) return {cat:'Som Ambiente', sub:'Subwoofer'}
  if(n.includes('hub ir')||n.includes('ir zigbee')||n.includes('controle av')||n.includes('broadlink')) return {cat:'Automação', sub:'Hub IR / Controle AV'}
  if(n.includes('keypad')||n.includes('interruptor')||n.includes('dimmer')) return {cat:'Automação', sub:'Keypad / Interruptor'}
  if(n.includes('módulo cortina')||n.includes('motor cortina')||n.includes('motor persiana')) return {cat:'Automação', sub:'Módulo Cortina'}
  if(n.includes('módulo')||n.includes('controlador')) return {cat:'Automação', sub:'Módulo Iluminação'}
  if(n.includes('tomada')) return {cat:'Automação', sub:'Tomada Inteligente'}
  if(n.includes('gateway')||n.includes('zigbee')||n.includes('hub home')) return {cat:'Automação', sub:'Gateway Zigbee'}
  // Fallback: use existingCategory
  if(existingCategory) return {cat:existingCategory, sub:'Acessório '+existingCategory.split('/')[0].trim()}
  return {cat:'Automação', sub:'Acessório Automação'}
}

// Gera ID único baseado em cômodo + subcategoria + índice
export function genItemId(room='', subcategory='', existingMarkers=[]){
  const roomCode = room.replace(/[aeiouáéíóúàãõâêô\s]/gi,'').toUpperCase().slice(0,4) || 'GRL'
  const subCode = {
    'Access Point':'AP','Switch / Roteador':'SW','Keystone / Patch':'KS','Cabos Cat6/Cat5':'CAB','Rack / Enclosure':'RCK',
    'Câmera IP':'CAM','Câmera Analógica':'CAM','Sensor de Presença':'SPS','Gravador NVR/DVR':'NVR',
    'Amplificador':'AMP','Caixa de Som':'CX','Subwoofer':'SUB','Receiver':'RCV',
    'Keypad / Interruptor':'KPD','Hub IR / Controle AV':'IR','Módulo Iluminação':'MIL','Módulo Cortina':'MCT',
    'Tomada Inteligente':'TOM','Sensor mmWave':'MMW','Gateway Zigbee':'GW',
  }[subcategory] || subcategory.replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,3) || 'ITM'
  const prefix = `${roomCode}-${subCode}`
  const existing = existingMarkers.filter(m=>(m.id||'').startsWith(prefix)).length
  return `${prefix}${existing+1}`
}
