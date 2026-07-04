// ── RARO Home — Visita à Obra (store isolado) ────────────────────
// Guarda um RASCUNHO paralelo da proposta (sem tocar no oficial).
// Tenta a coluna proposals.visita (jsonb). Se não existir, cai pra
// localStorage. Não passa pelo saveProposal (não mexe em estoque/reserva).
import { supabase } from '../db/supabase.js'

const LS = id => `raro_visita_${id}`

// Persiste o blob da visita para uma proposta salva (id numérico).
// blob = { started_at, oficial:[...floors], draft:[...floors] }
export async function saveVisita(id, blob){
  if(!id) return { where:'none' }
  try {
    const { error } = await supabase.from('proposals').update({ visita: blob }).eq('id', id)
    if(!error){ // grava também local como cópia de segurança
      try{ localStorage.setItem(LS(id), JSON.stringify(blob)) }catch{}
      return { where:'supabase' }
    }
  } catch {}
  // coluna não existe ou sem rede → localStorage
  try { localStorage.setItem(LS(id), JSON.stringify(blob)); return { where:'local' } }
  catch { return { where:'fail' } }
}

// Carrega a visita pendente (ou null). Prioriza Supabase, cai pra local.
export async function loadVisita(id){
  if(!id) return null
  try {
    const { data, error } = await supabase.from('proposals').select('visita').eq('id', id).single()
    if(!error && data && data.visita) return data.visita
  } catch {}
  try { const raw = localStorage.getItem(LS(id)); return raw ? JSON.parse(raw) : null }
  catch { return null }
}

// Limpa a visita (após aplicar ou descartar).
export async function clearVisita(id){
  if(!id) return
  try { await supabase.from('proposals').update({ visita: null }).eq('id', id) } catch {}
  try { localStorage.removeItem(LS(id)) } catch {}
}
