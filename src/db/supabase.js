// ─── RARO Home — Supabase layer ───────────────────────────────────────────────
// Substitui database.js. Mesma API pública, agora async.
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!URL || !KEY) console.error('⚠️  Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não definidas')

export const supabase = createClient(URL, KEY)

// ── helpers ───────────────────────────────────────────────────────────────────
async function all(table, order = 'id') {
  const { data, error } = await supabase.from(table).select('*').order(order, { ascending: true })
  if (error) { console.error(table, error); return [] }
  return data || []
}
// ── MODO DEMO ────────────────────────────────────────────────────────────────
// Em /demo nenhuma gravação pode chegar ao Supabase real. App marca window.__RARO_DEMO__.
function _demo() {
  try {
    if (typeof window === 'undefined') return false
    if (window.__RARO_DEMO__ === true) return true
    // fallback por URL: se por qualquer razão a flag global não estiver setada,
    // ainda assim NENHUMA escrita da /demo pode chegar ao Supabase real.
    const p = window.location?.pathname || ''
    const h = window.location?.hash || ''
    return p === '/demo' || p.startsWith('/demo/') || h === '#/demo' || h.startsWith('#demo')
  } catch { return false }
}

async function upsert(table, row) {
  if (_demo()) { return row.id ? row : { ...row, id: Date.now() + Math.floor(Math.random()*1000) } }
  if (row.id) {
    // UPDATE — never send 'id' in the body, only in the filter
    const { id, created_at, ...updateRow } = row
    const { data, error } = await supabase.from(table).update(updateRow).eq('id', id).select().single()
    if (error) { console.error(`upsert UPDATE ${table}:`, error); throw error }
    return data
  } else {
    // INSERT — strip undefined id
    const { id: _id, ...insertRow } = row
    const { data, error } = await supabase.from(table).insert(insertRow).select().single()
    if (error) { console.error(`upsert INSERT ${table}:`, error); throw error }
    return data
  }
}
async function del(table, id) {
  if (_demo()) return
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// ── ADMINS ────────────────────────────────────────────────────────────────────
export async function getAdmins()      { return all('admins', 'name') }
export async function saveAdmin(a)     { return upsert('admins', a) }

// ── AUTENTICAÇÃO SEGURA (Supabase Auth) ───────────────────────────────────────
// A verificação de senha acontece NO SERVIDOR (bcrypt). Depois de autenticar,
// checamos se o e-mail está na lista de admins cadastrados; se não estiver,
// derrubamos a sessão. Ter conta Google/senha válida NÃO basta: tem que estar
// na lista que a Ful controla.

// Busca o registro de admin pelo e-mail (case-insensitive).
async function findAdminByEmail(email) {
  const e = (email || '').toLowerCase().trim()
  const { data, error } = await supabase.from('admins').select('*').ilike('gmail', e).limit(1)
  if (error) { console.error('findAdminByEmail', error); return null }
  return (data && data[0]) || null
}

// Login com e-mail + senha. Retorna o registro do admin (com role) ou lança erro.
export async function signInEmailSenha(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
  if (error) throw new Error('E-mail ou senha incorretos.')
  const admin = await findAdminByEmail(data.user.email)
  if (!admin) {
    await supabase.auth.signOut()
    throw new Error('Este e-mail não está autorizado no RARO. Fale com o administrador.')
  }
  return admin
}

// Inicia login com Google (redireciona). A checagem da lista acontece no retorno,
// dentro de resolveSessao(), chamada quando o app recarrega já autenticado.
export async function signInGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin }
  })
  if (error) throw error
}

// Ao carregar o app: se há sessão ativa (ex: voltou do Google), confere a lista.
// Retorna o admin autorizado, ou null se não há sessão / não está na lista.
export async function resolveSessao() {
  const { data } = await supabase.auth.getSession()
  const email = data?.session?.user?.email
  if (!email) return null
  const admin = await findAdminByEmail(email)
  if (!admin) { await supabase.auth.signOut(); return null }
  return admin
}

// Sair de verdade (encerra a sessão no servidor).
export async function signOutSeguro() {
  try { await supabase.auth.signOut() } catch (e) { console.error(e) }
}

// Grava a nova senha depois que a pessoa clicou no link de recuperação.
export async function definirNovaSenha(novaSenha) {
  const { error } = await supabase.auth.updateUser({ password: novaSenha })
  if (error) throw error
  return true
}

// Reset de senha: dispara o e-mail de recuperação para o usuário.
// O admin aciona; quem redefine é a própria pessoa, pelo link do e-mail.
// (Supabase não permite admin ver/definir senha alheia — bcrypt, por segurança.)
export async function dispararResetSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin
  })
  if (error) throw error
  return true
}

// Criar acesso para um admin já cadastrado (define a senha inicial dele).
// Usado pela tela de Admins quando a Ful quer dar senha a alguém.
export async function criarAcessoComSenha(email, senha) {
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password: senha })
  if (error) throw error
  return data
}

export async function deleteAdmin(id)  { return del('admins', id) }

// ── CATALOG CATEGORIES ────────────────────────────────────────────────────────
export async function getCatalogCategories() {
  const rows = await all('catalog_categories', 'name')
  return rows.map(r => r.name)
}
export async function addCatalogCategory(name) {
  const { error } = await supabase.from('catalog_categories').insert({ name })
  if (error && !error.message.includes('unique')) throw error
}
export async function deleteCatalogCategory(name) {
  const { error } = await supabase.from('catalog_categories').delete().eq('name', name)
  if (error) throw error
}
export async function getCatalogSubcategories() {
  try {
    const { data, error } = await supabase.from('catalog_subcategories').select('category,name').order('category').order('name')
    if (error) return {}
    const result = {}
    for (const row of (data||[])) {
      if (!result[row.category]) result[row.category] = []
      result[row.category].push(row.name)
    }
    return result
  } catch { return {} }
}
export async function saveCatalogSubcategory(category, name) {
  const { error } = await supabase.from('catalog_subcategories').upsert({ category, name }, { onConflict: 'category,name' })
  if (error && !error.message.includes('unique')) throw error
}
export async function deleteCatalogSubcategory(category, name) {
  const { error } = await supabase.from('catalog_subcategories').delete().eq('category', category).eq('name', name)
  if (error) throw error
}

// ── CLIENTS ───────────────────────────────────────────────────────────────────
export async function getClients()     { return all('clients', 'created_at') }
export async function saveClient(c)    { return upsert('clients', c) }
export async function deleteClient(id){ return del('clients', id) }

// ── PROPOSALS ─────────────────────────────────────────────────────────────────
export async function getProposals()   { return all('proposals', 'created_at') }
export async function saveProposal(p) {
  if (_demo()) return p.id ? { ...p, updated_at: new Date().toISOString() } : { ...p, id: Date.now(), updated_at: new Date().toISOString() }
  let saved
  try {
    saved = await upsert('proposals', { ...p, updated_at: new Date().toISOString() })
  } catch (e) {
    // Se alguma coluna nova ainda não existe no banco (PGRST204), remove as
    // colunas opcionais conhecidas e re-tenta, para nunca travar o salvamento.
    const msg = String(e?.message||'')
    if (e?.code === 'PGRST204' || /column .* does not exist/i.test(msg) || msg.includes('labor_by_cat') || msg.includes('planta_cliente') || msg.includes('approved_') || msg.includes('exec_api_cost') || msg.includes('versions') || msg.includes('exec_doc_obra') || msg.includes('exec_doc_eletrica') || msg.includes('exec_doc_conduites')) {
      const { labor_by_cat, planta_cliente, approved_type, approved_value, approved_at, exec_value, exec_api_cost, versions, exec_doc_obra, exec_doc_eletrica, exec_doc_conduites, ...rest } = p
      saved = await upsert('proposals', { ...rest, updated_at: new Date().toISOString() })
    } else throw e
  }
  const items = (p.floors||[]).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).filter(i=>i.code).map(i=>({code:i.code,qty:parseInt(i.qty)||1}))))
  // rascunho, enviado e aguardando → RESERVA o estoque
  if (['draft','sent'].includes(p.status)) await reserveStock(saved.id, items, saved.code||`#${saved.id}`, saved.client_name)
  // recusado e cancelado → LIBERA a reserva (devolve)
  if (['rejected','cancelled'].includes(p.status)) await releaseReservation(saved.id)
  // aprovado → TIRA efetivamente do estoque
  if (p.status==='approved') await _applyStockDeduction(saved)
  return saved
}
export async function deleteProposal(id) {
  if (_demo()) return
  await releaseReservation(id)
  // apaga TAMBÉM os projetos vinculados a este orçamento
  try {
    const projects = await all('projects','created_at')
    const linked = projects.filter(pr=>String(pr.proposal_id)===String(id))
    for (const pr of linked) await del('projects', pr.id)
  } catch(e){ console.warn('del projetos vinculados:', e) }
  return del('proposals', id)
}

// Mantém Projetos/Cronograma em sincronia com o status do orçamento:
// aprovado → garante projeto; qualquer outro status → remove o projeto vinculado
export async function syncProjectFromProposal(proposal) {
  const projects = await all('projects','created_at')
  const linked = projects.filter(pr=>String(pr.proposal_id)===String(proposal.id))
  if (proposal.status === 'approved') {
    if (!linked.length) {
      await upsert('projects', {
        client_id: proposal.client_id, client_name: proposal.client_name,
        description: proposal.description || `Proposta ${proposal.code}`,
        type:'residencial', phase:'visit',
        proposal_id: proposal.id, proposal_code: proposal.code,
        notes:`Projeto criado automaticamente a partir da proposta ${proposal.code}`,
      })
    }
  } else {
    // saiu de aprovado (rascunho/enviado/recusado/cancelado) → remove o projeto vinculado
    for (const pr of linked) await del('projects', pr.id)
  }
}

// Cancela o orçamento (não apaga): libera estoque, cancela projeto/cronograma vinculados,
// e retorna aviso sobre o financeiro se já houve gasto.
export async function cancelProposal(proposal) {
  const id = proposal.id
  // 1) libera reservas e devolve qualquer dedução de estoque
  await releaseReservation(id)
  try { await _returnStockDeduction(proposal) } catch(e) { console.warn('retorno estoque:', e) }
  // 2) marca o orçamento como cancelado
  await upsert('proposals', { id, status:'cancelled', updated_at:new Date().toISOString() })
  // 3) cancela projeto vinculado (não apaga — marca status)
  const projects = await all('projects','created_at')
  const linked = projects.filter(pr=>String(pr.proposal_id)===String(id) || pr.proposal_code===proposal.code)
  for (const pr of linked) {
    await upsert('projects', { id:pr.id, status:'cancelled', updated_at:new Date().toISOString() })
  }
  // 4) checa financeiro: se houve gasto, avisa (não remove silenciosamente)
  let spent = 0
  for (const pr of linked) {
    const costs = pr.costs || []
    spent += costs.reduce((s,c)=>s+(Number(c.value)||0),0)
  }
  return { cancelledProjects: linked.length, spent }
}

// Devolve ao estoque o que foi deduzido (inverso de _applyStockDeduction)
async function _returnStockDeduction(proposal) {
  if (proposal.status!=='approved') return
  const items = (proposal.floors||[]).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).filter(i=>i.code).map(i=>({code:i.code,qty:parseInt(i.qty)||1}))))
  const stock = await all('stock','name')
  for (const it of items) {
    const s = stock.find(x=>x.code===it.code)
    if (s) await upsert('stock', { id:s.id, qty:(Number(s.qty)||0)+it.qty })
  }
}
export function generateProposalCode(client) {
  const n1=(client?.name1||'X')[0].toUpperCase(), n2=(client?.name2||'X')[0].toUpperCase()
  return `${n1}${n2}-${Math.floor(1000+Math.random()*9000)}`
}

// ── PROJECTS ──────────────────────────────────────────────────────────────────
export async function getProjects()    { return all('projects', 'created_at') }
export async function saveProject(p)   { return upsert('projects', p) }
export async function deleteProject(id){ return del('projects', id) }
export async function addAnnotation(projectId, text, author) {
  const { data } = await supabase.from('projects').select('annotations').eq('id', projectId).single()
  const anns = [...(data?.annotations||[]), { id: Date.now(), text, author, date: new Date().toISOString() }]
  await supabase.from('projects').update({ annotations: anns }).eq('id', projectId)
  return anns[anns.length-1]
}

// ── STOCK ─────────────────────────────────────────────────────────────────────
export async function getStock()          { return all('stock', 'name') }
export async function saveStockItem(s)    { return upsert('stock', s) }
export async function deleteStockItem(id){ return del('stock', id) }

// ── CATALOG ───────────────────────────────────────────────────────────────────
export async function getCatalog()        { return all('catalog', 'name') }
export async function saveCatalogItem(c)  { return upsert('catalog', c) }
export async function deleteCatalogItem(id){ return del('catalog', id) }

// ── SUPPLIERS ─────────────────────────────────────────────────────────────────
export async function getSuppliers()      { return all('suppliers', 'name') }
export async function saveSupplier(s)     { return upsert('suppliers', s) }
export async function deleteSupplier(id) { return del('suppliers', id) }

// ── TOOLS ─────────────────────────────────────────────────────────────────────
export async function getTools()          { return all('tools', 'name') }
export async function saveTool(t)         { return upsert('tools', t) }
export async function deleteTool(id)     { return del('tools', id) }

// ── RESERVATIONS ──────────────────────────────────────────────────────────────
export async function reserveStock(proposalId, items, proposalCode, clientName) {
  await supabase.from('reservations').delete().eq('proposal_id', proposalId)
  if (items.length) await supabase.from('reservations').insert(items.map(i=>({ proposal_id:proposalId, proposal_code:proposalCode, client_name:clientName, code:i.code, qty:i.qty })))
}
export async function releaseReservation(proposalId) {
  await supabase.from('reservations').delete().eq('proposal_id', proposalId)
}
export async function getReservations() { return all('reservations') }
export async function getStockWithReservations() {
  const [stock, res] = await Promise.all([getStock(), getReservations()])
  return stock.map(item => {
    const reserved = res.filter(r=>r.code===item.code).reduce((s,r)=>s+r.qty,0)
    const reservedBy = res.filter(r=>r.code===item.code).map(r=>`${r.proposal_code} (${r.client_name})`).join(', ')
    return { ...item, reserved, available: Math.max(0,item.qty-reserved), reserved_by: reservedBy }
  })
}
async function _applyStockDeduction(proposal) {
  const items = (proposal.floors||[]).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).filter(i=>i.code).map(i=>({code:i.code,qty:parseInt(i.qty)||1}))))
  const stock = await getStock()
  for (const item of items) {
    const s = stock.find(x=>x.code===item.code)
    if (s) await supabase.from('stock').update({ qty: Math.max(0,s.qty-item.qty) }).eq('id',s.id)
  }
  await addStockLog({ action:'saida_aprovacao', code:'MULTI', name:`Aprovação ${proposal.code}`, qty:items.length, qty_before:0, qty_after:0, author:'Sistema', note:`Proposta ${proposal.code} — ${proposal.client_name}` })
}

// ── STOCK LOG ─────────────────────────────────────────────────────────────────
export async function addStockLog(entry) {
  const row = { ...entry, date: new Date().toISOString() }
  // Normalize: always use 'author' for stock_log, ensure snapshot is string
  if (!row.author && row.user_name) row.author = row.user_name
  if (row.snapshot && typeof row.snapshot !== 'string') row.snapshot = JSON.stringify(row.snapshot)
  // Remove undefined fields that would fail Supabase insert
  Object.keys(row).forEach(k => { if(row[k]===undefined) delete row[k] })
  const { error } = await supabase.from('stock_log').insert(row)
  if (error) console.error('addStockLog error:', error)
}
export async function getStockLog() {
  const { data } = await supabase.from('stock_log').select('*').order('date',{ascending:false}).limit(300)
  return data || []
}

// ── AUDIT LOG ─────────────────────────────────────────────────────────────────
export async function addAuditLog(entry) {
  if (_demo()) return
  await supabase.from('audit_log').insert({ ...entry, date: new Date().toISOString() })
}
export async function getAuditLog(filters={}) {
  let q = supabase.from('audit_log').select('*').order('date',{ascending:false}).limit(filters.limit||200)
  if (filters.module) q = q.eq('module', filters.module)
  const { data } = await q
  return data || []
}
export async function auditedSave(module, action, entity, user, before=null) {
  const entityName = entity?.name||entity?.client_name||entity?.code||`#${entity?.id||'?'}`
  const actionLabel = {create:'Criou',update:'Atualizou',delete:'Excluiu',status_change:'Alterou status',price_update:'Atualizou preço',reversao:'Reverteu'}[action] || action
  // Build human-readable diff
  let beforeTxt = null, afterTxt = null
  if (before && entity && action === 'update') {
    const diffs = []
    const keys = [...new Set([...Object.keys(before||{}), ...Object.keys(entity||{})])]
    for (const k of keys) {
      if (['id','created_at','updated_at'].includes(k)) continue
      const bv = before[k], av = entity[k]
      if (JSON.stringify(bv) !== JSON.stringify(av)) {
        const bStr = typeof bv === 'object' ? '[dados complexos]' : String(bv??'—')
        const aStr = typeof av === 'object' ? '[dados complexos]' : String(av??'—')
        if (bStr.length < 60 && aStr.length < 60) diffs.push(`${k}: "${bStr}" → "${aStr}"`)
      }
    }
    beforeTxt = diffs.length ? diffs.join(' | ') : JSON.stringify(before).slice(0,200)
    afterTxt = diffs.length ? `Alterado: ${diffs.join(' | ')}` : JSON.stringify(entity).slice(0,200)
  } else if (before) {
    beforeTxt = JSON.stringify(before).slice(0,200)
  }
  await addAuditLog({
    module, action,
    entity_id: entity?.id,
    entity_name: entityName,
    user_name: user || 'Sistema',
    before: beforeTxt,
    after: afterTxt || (entity ? `${actionLabel} ${entityName}` : null),
  })
}

// ── PIN SESSION ──────────────────────────────────────────────────────────────
const _PK='raro_pin_v1'
function _cp(p){ return p==='123' } // PIN configured here, never displayed in UI
export function verifyPIN(pin)    { return _cp(pin) }
export function setPINSession()   { localStorage.setItem(_PK,JSON.stringify({at:Date.now()})) }
export function checkPINSession() { try{ const s=JSON.parse(localStorage.getItem(_PK)||'null'); return s&&(Date.now()-s.at<4*60*60*1000) }catch{ return false } }
export function clearPINSession() { localStorage.removeItem(_PK) }

// ── HELPERS ───────────────────────────────────────────────────────────────────
export async function getIncompleteClients() {
  const clients = await getClients()
  return clients.filter(c=>!c.full_name1||!c.phone1||!c.neighborhood||!c.housing_type||!c.email)
}
export async function getAutoTasks() {
  const projects = await getProjects()
  const tasks = []
  const NEXT = { visit:{label:'Fazer medição',type:'Medição'}, measurement:{label:'Criar projeto e mapa de calor',type:'Projeto'}, project:{label:'Fechar orçamento com o cliente',type:'Orçamento'}, budget:{label:'Comprar material listado',type:'Compras'}, purchase:{label:'Iniciar instalação',type:'Instalação'}, installation:{label:'Configurar cômodos e testar',type:'Configuração'}, config:{label:'Entrega e treinamento ao cliente',type:'Entrega'} }
  projects.filter(p=>p.phase!=='done').forEach(p=>{
    const next=NEXT[p.phase]; if(next) tasks.push({id:`proj_${p.id}`,title:next.label,client_name:p.client_name,project_id:p.id,type:next.type,deadline:p.deadline,status:'pending',auto:true})
    ;(p.purchase_list||[]).filter(i=>!i.arrived).forEach(item=>tasks.push({id:`buy_${p.id}_${item.code}`,title:`Receber: ${item.item} (×${item.qty})`,client_name:p.client_name,project_id:p.id,type:'Compras',deadline:item.arrival_date,status:'pending',auto:true}))
    const notDone=(p.rooms_config||[]).filter(r=>!r.delivered)
    if(notDone.length&&(p.phase==='installation'||p.phase==='config')) tasks.push({id:`rooms_${p.id}`,title:`Configurar ${notDone.length} cômodo(s): ${notDone.slice(0,2).map(r=>r.name).join(', ')}${notDone.length>2?'...':''}`,client_name:p.client_name,project_id:p.id,type:'Configuração',deadline:p.deadline,status:'pending',auto:true})
  })
  return tasks
}
export async function checkProposalStock(floors) {
  const [stock, reservations, catalog] = await Promise.all([getStock(), getReservations(), getCatalog()])
  const itemMap = {}
  ;(floors||[]).forEach(fl=>(fl.rooms||[]).forEach(r=>(r.items||[]).filter(i=>i.code).forEach(i=>{ itemMap[i.code]=(itemMap[i.code]||0)+(parseInt(i.qty)||1) })))
  return Object.entries(itemMap).map(([code,needed])=>{
    const s=stock.find(x=>x.code===code)
    if(!s){ const cat=catalog.find(c=>c.code===code); return {code,name:cat?.name||code,needed,available:0,type:'not_in_stock',msg:'Não cadastrado no estoque'} }
    const reserved=reservations.filter(r=>r.code===code).reduce((s,r)=>s+r.qty,0)
    const available=Math.max(0,s.qty-reserved)
    if(available<needed) return {code,name:s.name,needed,available,shortage:needed-available,type:available===0?'zero':'insufficient',msg:available===0?`Zerado — comprar ${needed} un.`:`Disponível: ${available}, faltam: ${needed-available} un.`,buy_link:s.buy_link}
    return null
  }).filter(Boolean)
}
export async function exportBackup() {
  const [clients,proposals,projects,stock,catalog,admins,suppliers,tools] = await Promise.all([getClients(),getProposals(),getProjects(),getStock(),getCatalog(),getAdmins(),getSuppliers(),getTools()])
  const db = { clients,proposals,projects,stock,catalog,admins,suppliers,tools,exported_at:new Date().toISOString() }
  const blob = new Blob([JSON.stringify(db,null,2)],{type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`rarohome-backup-${new Date().toISOString().slice(0,10)}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(()=>URL.revokeObjectURL(url),2000)
}
// importBackup não se aplica ao Supabase — use o painel do Supabase para restaurar
export async function importBackup(jsonText) {
  try {
    const db = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText
    let count = 0
    const tables = { clients:saveClient, catalog:saveCatalogItem, suppliers:saveSupplier, tools:saveTool }
    for (const [key, saveFn] of Object.entries(tables)) {
      if (db[key]?.length) {
        for (const row of db[key]) { try { await saveFn(row); count++ } catch(e){} }
      }
    }
    if (db.proposals?.length) { for (const p of db.proposals) { try { await saveProposal(p); count++ } catch(e){} } }
    if (db.projects?.length)  { for (const p of db.projects)  { try { await saveProject(p);  count++ } catch(e){} } }
    if (db.stock?.length)     { for (const s of db.stock)     { try { await saveStockItem(s); count++ } catch(e){} } }
    alert(`Backup importado: ${count} registros restaurados.`)
  } catch(err) { alert('Erro ao importar: ' + err.message) }
}

// ─── DIÁRIO DE OBRA ───────────────────────────────────────────
// Upload de foto para o Supabase Storage (bucket 'obra'), retorna URL pública
export async function uploadObraPhoto(projectId, file) {
  const ext = (file.name?.split('.').pop() || 'jpg').toLowerCase()
  const path = `proj-${projectId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`
  const { error } = await supabase.storage.from('obra').upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg'
  })
  if (error) { console.error('upload obra:', error); throw error }
  const { data } = supabase.storage.from('obra').getPublicUrl(path)
  return { url: data.publicUrl, path }
}

// O diário fica salvo em project.diary (JSONB) — array de entradas
// entrada: { id, date, room, type, text, photos:[{url,path}], video_link, author, created_at }
export async function saveDiary(projectId, diary) {
  if (_demo()) {
    // em demo, o diário fica no localStorage demo (não toca o banco real)
    try {
      const k = 'raro_demo_state_v3'
      const st = JSON.parse(localStorage.getItem(k) || '{}')
      if (st.data && Array.isArray(st.data.projects)) {
        st.data.projects = st.data.projects.map(p => p.id === projectId ? { ...p, diary } : p)
        localStorage.setItem(k, JSON.stringify(st))
      }
    } catch {}
    return { id: projectId, diary }
  }
  const { data, error } = await supabase.from('projects')
    .update({ diary, updated_at: new Date().toISOString() })
    .eq('id', projectId).select().single()
  if (error) { console.error('saveDiary:', error); throw error }
  return data
}

// Diário guardado direto no cliente (quando ainda não há projeto formal)
export async function saveClientDiary(clientId, diary) {
  if (_demo()) {
    try {
      const k = 'raro_demo_state_v3'
      const st = JSON.parse(localStorage.getItem(k) || '{}')
      if (st.data && Array.isArray(st.data.clients)) {
        st.data.clients = st.data.clients.map(c => c.id === clientId ? { ...c, diary_obra: diary } : c)
        localStorage.setItem(k, JSON.stringify(st))
      }
    } catch {}
    return { id: clientId, diary_obra: diary }
  }
  const { data, error } = await supabase.from('clients')
    .update({ diary_obra: diary })
    .eq('id', clientId).select().single()
  if (error) { console.error('saveClientDiary:', error); throw error }
  return data
}
