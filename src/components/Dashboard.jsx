import { useState, useEffect } from 'react'
import { getAutoTasks, getIncompleteClients } from '../db/supabase.js'

const STATUS_CLS = { pending:'b-amber', progress:'b-blue', done:'b-green', urgent:'b-red' }
const PHASE_LABEL = { visit:'Visita', measurement:'Medição', project:'Projeto', budget:'Orçamento', purchase:'Compras', installation:'Instalação', config:'Configuração', done:'Concluído' }

export default function Dashboard({ proposals, projects, stock, clients, onNav }) {
  const [tasks, setTasks] = useState([])
  const [incomplete, setIncomplete] = useState([])
  useEffect(() => {
    getAutoTasks().then(setTasks)
    getIncompleteClients().then(setIncomplete)
  }, [projects, clients])

  const sentProposals     = proposals.filter(p => p.status === 'sent').length
  const draftProposals    = proposals.filter(p => p.status === 'draft').length
  const approvedProposals = proposals.filter(p => p.status === 'approved').length
  const activeProjects   = projects.filter(p => p.phase !== 'done').length
  const revenue = proposals.filter(p => p.status === 'approved')
    .reduce((s, p) => {
      const eq = (p.floors||[]).flatMap(f=>f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),0)
      return s + eq + (p.labor||0)
    }, 0)
  const criticalStock = stock.filter(s => s.qty <= s.min_qty).length

  // FALTA DE ESTOQUE real: o que está comprometido (orçamentos enviados/aprovados) vs o que há em estoque
  const shortages = (()=>{
    const need = {}  // key -> {qty, name, code}
    proposals.filter(p=>p.status==='sent'||p.status==='approved').forEach(p=>{
      const floors = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?(()=>{try{return JSON.parse(p.floors)}catch{return[]}})():[])
      floors.forEach(f=>(f.rooms||[]).forEach(r=>(r.items||[]).forEach(it=>{
        const key = it.code || (it.name||'').trim().toLowerCase()
        if(!key) return
        const q=parseInt(it.qty)||1
        if(!need[key]) need[key]={qty:0,name:it.name||it.code,code:it.code||''}
        need[key].qty+=q
      })))
    })
    const out=[]
    Object.entries(need).forEach(([key,info])=>{
      // procura no estoque por código OU por nome
      const s=stock.find(x=>(info.code&&x.code===info.code) || (x.name||'').trim().toLowerCase()===(info.name||'').trim().toLowerCase())
      const have=s?(Number(s.qty)||0):0
      if(have < info.qty) out.push({ code:info.code||info.name, name:info.name, need:info.qty, have, missing:info.qty-have, inStock: !!s })
    })
    return out.sort((a,b)=>b.missing-a.missing)
  })()

  // Diários: obra ativa (projeto criado) sem registro hoje = pendente; com registro hoje = efetuado
  const today = new Date().toISOString().slice(0,10)
  const diaryStats = (()=>{
    let pend=0, done=0
    const pendList=[]
    projects.filter(p=>p.phase!=='done').forEach(p=>{
      const diary = Array.isArray(p.diary)?p.diary:(typeof p.diary==='string'?(()=>{try{return JSON.parse(p.diary)}catch{return[]}})():[])
      const hasToday = diary.some(d=>d.date===today)
      if(hasToday) done++; else { pend++; pendList.push(p.client_name||p.name||`#${p.id}`) }
    })
    return { pend, done, pendList }
  })()

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
  }

  const MISSING_LABELS = { full_name1:'Nome completo', phone1:'Telefone', neighborhood:'Bairro', housing_type:'Tipo moradia', email:'E-mail' }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-layout-dashboard" aria-hidden />Dashboard</div>
        <span style={{fontSize:11,color:'var(--text3)'}}>
          {new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}
        </span>
      </div>
      <div className="content">

        {/* ── INCOMPLETE CLIENT ALERT ── */}
        {incomplete.length > 0 && (
          <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:8,padding:'10px 16px',marginBottom:14,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <i className="ti ti-alert-circle" style={{fontSize:20,color:'var(--amber)',flexShrink:0}} aria-hidden />
              <div>
                <div style={{fontWeight:600,fontSize:13,color:'var(--amber)'}}>
                  {incomplete.length} cliente{incomplete.length>1?'s':''} com cadastro incompleto
                </div>
                <div style={{fontSize:11,color:'var(--amber)',marginTop:2}}>
                  {incomplete.slice(0,3).map(c=>`${c.name1} & ${c.name2}`).join(' · ')}
                  {incomplete.length>3&&` +${incomplete.length-3} mais`}
                </div>
              </div>
            </div>
            <button className="btn" style={{borderColor:'var(--amber)',color:'var(--amber)',fontSize:11,flexShrink:0}} onClick={()=>onNav('clients')}>
              <i className="ti ti-users" aria-hidden />Completar cadastros
            </button>
          </div>
        )}

        {/* ── METRICS ── */}
        <div className="metrics">
          <div className="met">
            <div className="met-label">Orçamentos enviados</div>
            <div className="met-val blue">{sentProposals}</div>
            <div className="met-sub"><span className="dot" style={{background:'var(--amber)'}}/>aguardando resposta</div>
          </div>
          <div className="met">
            <div className="met-label">Rascunhos</div>
            <div className="met-val" style={{color:'var(--text2)'}}>{draftProposals}</div>
            <div className="met-sub"><span className="dot" style={{background:'var(--text3)'}}/>em preparação</div>
          </div>
          <div className="met">
            <div className="met-label">Aprovados</div>
            <div className="met-val" style={{color:'var(--green)'}}>{approvedProposals}</div>
            <div className="met-sub"><span className="dot" style={{background:'var(--green)'}}/>fechados</div>
          </div>
          <div className="met">
            <div className="met-label">Projetos ativos</div>
            <div className="met-val">{activeProjects}</div>
            <div className="met-sub"><span className="dot" style={{background:'var(--green)'}}/>{projects.filter(p=>p.in_obra).length} em obra agora</div>
          </div>
          <div className="met">
            <div className="met-label">Em instalação</div>
            <div className="met-val" style={{color:'var(--accent)'}}>{projects.filter(p=>p.phase==='installation'||p.phase==='config').length}</div>
            <div className="met-sub"><span className="dot" style={{background:'var(--accent)'}}/>instalação/config ativa</div>
          </div>
          <div className="met">
            <div className="met-label">Falta comprar</div>
            <div className="met-val" style={{color:shortages.length>0?'var(--red)':'var(--green)'}}>{shortages.length}</div>
            <div className="met-sub"><span className="dot" style={{background:shortages.length>0?'var(--red)':'var(--green)'}}/>{shortages.length>0?'item(ns) faltando p/ orçamentos':'estoque cobre tudo'}</div>
          </div>
          <div className="met" style={{cursor:'pointer'}} onClick={()=>onNav('diarios')}>
            <div className="met-label">Diários pendentes hoje</div>
            <div className="met-val" style={{color: diaryStats.pend>0?'var(--amber)':'var(--green)'}}>{diaryStats.pend}</div>
            <div className="met-sub"><span className="dot" style={{background:diaryStats.pend>0?'var(--amber)':'var(--green)'}}/>{diaryStats.pend>0?'obra(s) ativa(s) sem registro hoje':'tudo em dia'}</div>
          </div>
          <div className="met" style={{cursor:'pointer'}} onClick={()=>onNav('diarios')}>
            <div className="met-label">Diários efetuados hoje</div>
            <div className="met-val" style={{color:'var(--green)'}}>{diaryStats.done}</div>
            <div className="met-sub"><span className="dot" style={{background:'var(--green)'}}/>obra(s) com registro hoje</div>
          </div>
          {incomplete.length > 0 && (
            <div className="met" style={{cursor:'pointer',borderColor:'var(--amber)'}} onClick={()=>onNav('clients')}>
              <div className="met-label">Cadastros incompletos</div>
              <div className="met-val amber">{incomplete.length}</div>
              <div className="met-sub" style={{color:'var(--amber)'}}>
                <i className="ti ti-alert-triangle" style={{fontSize:10,marginRight:4}} aria-hidden />clique para completar
              </div>
            </div>
          )}
        </div>

        {/* ── TASKS ── */}
        <div className="section">
          <div className="sec-hdr">
            <div className="sec-title"><i className="ti ti-check" aria-hidden />Próximas ações</div>
            <span style={{fontSize:10,color:'var(--text3)',fontStyle:'italic'}}>Geradas automaticamente dos projetos</span>
          </div>
          <table className="tbl">
            <thead><tr><th>Ação necessária</th><th>Cliente</th><th>Tipo</th><th>Prazo</th><th>Status</th></tr></thead>
            <tbody>
              {tasks.length===0 && (
                <tr><td colSpan={5} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>
                  Nenhuma tarefa pendente — todos os projetos em dia 🎉
                </td></tr>
              )}
              {tasks.slice(0,12).map(t => {
                const overdue = t.deadline && new Date(t.deadline) < new Date()
                return <tr key={t.id} style={{background:overdue?'rgba(220,38,38,0.03)':'transparent'}}>
                  <td style={{fontWeight:500}}>{t.title}</td>
                  <td style={{color:'var(--text2)'}}>{t.client_name}</td>
                  <td><span className="badge b-gray" style={{fontSize:10}}>{t.type}</span></td>
                  <td style={{color:overdue?'var(--red)':'var(--text2)',fontWeight:overdue?500:400}}>
                    {fmtDate(t.deadline)}
                    {overdue && <span style={{fontSize:10,marginLeft:4}}>⚠</span>}
                  </td>
                  <td><span className={`badge ${overdue?'b-red':'b-amber'}`}>{overdue?'Atrasado':'Pendente'}</span></td>
                </tr>
              })}
            </tbody>
          </table>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          {/* Projects */}
          <div className="section">
            <div className="sec-hdr">
              <div className="sec-title"><i className="ti ti-layout-kanban" aria-hidden />Projetos ativos</div>
              <button className="btn" style={{fontSize:11,padding:'4px 9px'}} onClick={()=>onNav('projects')}>Ver todos</button>
            </div>
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>Fase</th><th>Em obra</th></tr></thead>
              <tbody>
                {projects.filter(p=>p.phase!=='done').slice(0,6).map(p=>(
                  <tr key={p.id}>
                    <td><div style={{fontWeight:500}}>{p.client_name}</div><div className="sub">{p.description}</div></td>
                    <td><span className="badge b-blue" style={{fontSize:10}}>{PHASE_LABEL[p.phase]||p.phase}</span></td>
                    <td><span className={`badge ${p.in_obra?'b-green':'b-gray'}`} style={{fontSize:10}}>{p.in_obra?'Sim':'Não'}</span></td>
                  </tr>
                ))}
                {projects.filter(p=>p.phase!=='done').length===0&&<tr><td colSpan={3} style={{textAlign:'center',padding:16,color:'var(--text3)'}}>Nenhum projeto ativo</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Stock critical */}
          <div className="section">
            <div className="sec-hdr">
              <div className="sec-title"><i className="ti ti-box" aria-hidden />Estoque crítico</div>
              <button className="btn" style={{fontSize:11,padding:'4px 9px'}} onClick={()=>onNav('stock')}>Ver estoque</button>
            </div>
            <table className="tbl">
              <thead><tr><th>Item</th><th>Qtd</th><th>Nível</th></tr></thead>
              <tbody>
                {stock.filter(s=>s.qty<=s.min_qty).slice(0,6).map(s=>{
                  const pct=Math.min(100,Math.round(s.qty/Math.max(s.min_qty,1)*100))
                  const clr=s.qty===0?'var(--red)':'var(--amber)'
                  return <tr key={s.id}>
                    <td style={{color:clr,fontSize:12}}>{s.name}</td>
                    <td style={{color:clr,fontWeight:600}}>{s.qty}</td>
                    <td><div className="stk-bar"><div className="stk-fill" style={{width:`${pct}%`,background:clr}}/></div></td>
                  </tr>
                })}
                {stock.filter(s=>s.qty<=s.min_qty).length===0&&<tr><td colSpan={3} style={{textAlign:'center',padding:16,color:'var(--text3)'}}>Estoque OK ✓</td></tr>}
              </tbody>
            </table>
          </div>

          {/* ── FALTA DE ESTOQUE (itens comprometidos em orçamentos) ── */}
          <div className="section">
            <div className="sec-hdr">
              <div className="sec-title"><i className="ti ti-shopping-cart" aria-hidden />Falta comprar (orçamentos enviados/aprovados)</div>
              <span style={{fontSize:10,color:'var(--text3)',marginRight:'auto',marginLeft:10}}>
                {proposals.filter(p=>p.status==='sent'||p.status==='approved').length} orç. analisados
              </span>
              <button className="btn" style={{fontSize:11,padding:'4px 9px'}} onClick={()=>onNav('stock')}>Ver estoque</button>
            </div>
            <table className="tbl">
              <thead><tr><th>Item</th><th>Precisa</th><th>Em estoque</th><th>Falta</th></tr></thead>
              <tbody>
                {shortages.slice(0,12).map(s=>(
                  <tr key={s.code}>
                    <td style={{fontSize:12}}>{s.name}{!s.inStock&&<span style={{fontSize:9,color:'var(--red)',marginLeft:6}}>(não cadastrado)</span>}</td>
                    <td style={{fontWeight:600}}>{s.need}</td>
                    <td style={{color:s.have===0?'var(--red)':'var(--text2)'}}>{s.have}</td>
                    <td style={{color:'var(--red)',fontWeight:700}}>{s.missing}</td>
                  </tr>
                ))}
                {shortages.length===0&&<tr><td colSpan={4} style={{textAlign:'center',padding:16,color:'var(--text3)'}}>Estoque cobre todos os orçamentos ✓</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PROJECT PHASES ── */}
        {projects.filter(p=>p.phase!=='done').length>0&&(
          <div className="section" style={{marginBottom:16}}>
            <div className="sec-hdr">
              <div className="sec-title"><i className="ti ti-layout-kanban" aria-hidden/>Projetos em andamento</div>
              <button className="btn" style={{fontSize:11}} onClick={()=>onNav('projects')}><i className="ti ti-arrow-right" aria-hidden/>Ver todos</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:8,padding:'8px 0'}}>
              {projects.filter(p=>p.phase!=='done').slice(0,6).map((p,i)=>{
                const PHASE_COLOR={visit:'var(--text3)',measurement:'var(--accent)',project:'var(--accent)',budget:'var(--amber)',purchase:'var(--amber)',installation:'var(--green)',config:'var(--green)'}
                const color=PHASE_COLOR[p.phase]||'var(--text3)'
                return <div key={i} style={{background:'var(--surf)',borderRadius:6,padding:'10px 12px',border:'1px solid var(--border)',borderLeft:`3px solid ${color}`}}>
                  <div style={{fontWeight:500,fontSize:12,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.client_name}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span className="badge b-blue" style={{fontSize:9}}>{PHASE_LABEL[p.phase]||p.phase}</span>
                    {p.deadline&&<span style={{fontSize:10,color:new Date(p.deadline+'T00:00:00')<new Date()?'var(--red)':'var(--text3)'}}>{new Date(p.deadline+'T00:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</span>}
                  </div>
                </div>
              })}
            </div>
          </div>
        )}

        {/* Incomplete clients detail */}
        {incomplete.length > 0 && (
          <div className="section">
            <div className="sec-hdr" style={{background:'rgba(245,158,11,0.05)'}}>
              <div className="sec-title" style={{color:'var(--amber)'}}><i className="ti ti-alert-circle" aria-hidden />Clientes com cadastro incompleto</div>
              <button className="btn" style={{borderColor:'var(--amber)',color:'var(--amber)',fontSize:11}} onClick={()=>onNav('clients')}>Ir para Clientes</button>
            </div>
            <table className="tbl">
              <thead><tr><th>Cliente</th><th>Bairro</th><th>Campos faltando</th></tr></thead>
              <tbody>
                {incomplete.map(c => {
                  const missing = Object.entries(MISSING_LABELS).filter(([k])=>!c[k]).map(([,v])=>v)
                  return <tr key={c.id}>
                    <td style={{fontWeight:500}}>{c.name1} & {c.name2}</td>
                    <td style={{color:'var(--text2)'}}>{c.neighborhood||'—'}</td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        {missing.map(m=><span key={m} className="badge b-amber" style={{fontSize:10}}>{m}</span>)}
                      </div>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
