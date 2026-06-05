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
async function upsert(table, row) {
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
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

// ── ADMINS ────────────────────────────────────────────────────────────────────
export async function getAdmins()      { return all('admins', 'name') }
export async function saveAdmin(a)     { return upsert('admins', a) }
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

// ── CLIENTS ───────────────────────────────────────────────────────────────────
export async function getClients()     { return all('clients', 'created_at') }
export async function saveClient(c)    { return upsert('clients', c) }
export async function deleteClient(id){ return del('clients', id) }

// ── PROPOSALS ─────────────────────────────────────────────────────────────────
export async function getProposals()   { return all('proposals', 'created_at') }
export async function saveProposal(p) {
  const saved = await upsert('proposals', { ...p, updated_at: new Date().toISOString() })
  const items = (p.floors||[]).flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).filter(i=>i.code).map(i=>({code:i.code,qty:parseInt(i.qty)||1}))))
  if (p.status==='sent'||p.status==='approved') await reserveStock(saved.id, items, saved.code||`#${saved.id}`, saved.client_name)
  if (p.status==='rejected'||p.status==='draft') await releaseReservation(saved.id)
  if (p.status==='approved') await _applyStockDeduction(saved)
  return saved
}
export async function deleteProposal(id) { await releaseReservation(id); return del('proposals', id) }
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
  const { data, error } = await supabase.from('projects')
    .update({ diary, updated_at: new Date().toISOString() })
    .eq('id', projectId).select().single()
  if (error) { console.error('saveDiary:', error); throw error }
  return data
}
