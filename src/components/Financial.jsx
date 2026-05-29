import { useState, useEffect } from 'react'
import { getProposals, getProjects } from '../db/supabase.js'

const fmt = v => 'R$\u202f' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})
const fmtK = v => v >= 1000 ? `R$ ${(v/1000).toFixed(1)}k` : fmt(v)

function calcProposalTotal(p) {
  const floors = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):p.floors||[])
  const equip = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)
  return equip + (Number(p.labor)||0)
}

function calcCost(p) {
  const floors = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):p.floors||[])
  return floors.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]))).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0)
}

export default function Financial({ proposals: propsProp, projects: projProp }) {
  const [proposals, setProposals] = useState(propsProp||[])
  const [projects, setProjects] = useState(projProp||[])
  const [tab, setTab] = useState('overview')
  const [period, setPeriod] = useState('all')

  useEffect(()=>{ setProposals(propsProp||[]) },[propsProp])
  useEffect(()=>{ setProjects(projProp||[]) },[projProp])

  // Filter by period
  const now = new Date()
  const filterDate = p => {
    const d = new Date(p.created_at||p.updated_at||0)
    if(period==='month') return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear()
    if(period==='quarter') return d >= new Date(now.getFullYear(), Math.floor(now.getMonth()/3)*3, 1)
    if(period==='year') return d.getFullYear()===now.getFullYear()
    return true
  }

  const filtered = proposals.filter(filterDate)
  const approved  = filtered.filter(p=>p.status==='approved')
  const sent      = filtered.filter(p=>p.status==='sent')
  const drafts    = filtered.filter(p=>p.status==='draft')

  const revenueApproved = approved.reduce((s,p)=>s+calcProposalTotal(p),0)
  const revenueSent     = sent.reduce((s,p)=>s+calcProposalTotal(p),0)
  const costApproved    = approved.reduce((s,p)=>s+calcCost(p),0)
  const profitApproved  = revenueApproved - costApproved
  const marginPct       = revenueApproved>0 ? Math.round(profitApproved/revenueApproved*100) : 0
  const pipeline        = sent.reduce((s,p)=>s+calcProposalTotal(p),0)
  const convRate        = filtered.length>0 ? Math.round(approved.length/filtered.length*100) : 0

  const PERIOD_OPTS = [{v:'month',l:'Este mês'},{v:'quarter',l:'Trimestre'},{v:'year',l:'Este ano'},{v:'all',l:'Todos'}]

  const TABS = [
    {k:'overview',l:'Visão Geral',i:'ti-chart-pie'},
    {k:'proposals',l:'Propostas',i:'ti-file-text'},
    {k:'cashflow',l:'Fluxo de Caixa',i:'ti-arrows-right-left'},
    {k:'margin',l:'Margens',i:'ti-percentage'},
  ]

  return (
    <div className="page-content">
      <div className="page-hdr">
        <div>
          <div className="page-title"><i className="ti ti-coin" style={{marginRight:8}} aria-hidden/>Controle Financeiro</div>
          <div className="page-sub">Receitas, margens e pipeline de negócios</div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {PERIOD_OPTS.map(o=>(
            <button key={o.v} className={`btn${period===o.v?' primary':''}`} style={{fontSize:11,padding:'4px 10px'}}
              onClick={()=>setPeriod(o.v)}>{o.l}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:20}}>
        {[
          {label:'Receita Aprovada',value:fmt(revenueApproved),sub:`${approved.length} projetos aprovados`,color:'var(--green)',icon:'ti-trending-up'},
          {label:'Lucro Bruto',value:fmt(profitApproved),sub:`Margem de ${marginPct}%`,color:marginPct>=40?'var(--green)':marginPct>=20?'var(--amber)':'var(--red)',icon:'ti-pig'},
          {label:'Pipeline (Enviados)',value:fmt(pipeline),sub:`${sent.length} propostas aguardando`,color:'var(--accent)',icon:'ti-clock'},
          {label:'Taxa de Conversão',value:`${convRate}%`,sub:`${approved.length}/${filtered.length} propostas`,color:convRate>=40?'var(--green)':convRate>=20?'var(--amber)':'var(--red)',icon:'ti-target'},
        ].map((k,i)=>(
          <div key={i} className="met" style={{borderTop:`3px solid ${k.color}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
              <div className="met-label">{k.label}</div>
              <i className={`ti ${k.icon}`} style={{fontSize:16,color:k.color,opacity:0.6}} aria-hidden/>
            </div>
            <div className="met-val" style={{color:k.color,fontSize:22,marginTop:4}}>{k.value}</div>
            <div className="met-sub" style={{marginTop:4}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:16,borderBottom:'1px solid var(--border)',paddingBottom:0}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)}
            style={{padding:'8px 14px',fontSize:12,border:'none',borderBottom:tab===t.k?'2px solid var(--accent)':'2px solid transparent',
              background:'none',cursor:'pointer',color:tab===t.k?'var(--accent)':'var(--text2)',fontWeight:tab===t.k?600:400,
              display:'flex',alignItems:'center',gap:6}}>
            <i className={`ti ${t.i}`} style={{fontSize:13}} aria-hidden/>{t.l}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab==='overview' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          {/* Status funnel */}
          <div className="section">
            <div className="sec-hdr"><div className="sec-title">Funil de Propostas</div></div>
            <div style={{padding:'12px 16px'}}>
              {[
                {label:'Rascunhos',count:drafts.length,val:drafts.reduce((s,p)=>s+calcProposalTotal(p),0),color:'var(--text3)'},
                {label:'Enviados',count:sent.length,val:revenueSent,color:'var(--accent)'},
                {label:'Aprovados',count:approved.length,val:revenueApproved,color:'var(--green)'},
                {label:'Recusados',count:filtered.filter(p=>p.status==='rejected').length,val:filtered.filter(p=>p.status==='rejected').reduce((s,p)=>s+calcProposalTotal(p),0),color:'var(--red)'},
              ].map((row,i)=>{
                const maxVal = Math.max(revenueApproved,revenueSent,1)
                const pct = Math.round((row.val/maxVal)*100)
                return <div key={i} style={{marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:12}}>
                    <span style={{fontWeight:500,color:'var(--text1)'}}>{row.label} <span style={{color:'var(--text3)',fontWeight:400}}>({row.count})</span></span>
                    <span style={{fontWeight:600,color:row.color}}>{fmt(row.val)}</span>
                  </div>
                  <div style={{background:'var(--border)',borderRadius:4,height:8}}>
                    <div style={{background:row.color,borderRadius:4,height:8,width:`${pct}%`,transition:'width 0.4s ease'}}/>
                  </div>
                </div>
              })}
            </div>
          </div>

          {/* Revenue vs Cost */}
          <div className="section">
            <div className="sec-hdr"><div className="sec-title">Receita vs Custo (Aprovados)</div></div>
            <div style={{padding:'12px 16px'}}>
              {revenueApproved===0 ? <div style={{textAlign:'center',padding:'24px 0',color:'var(--text3)',fontSize:12}}>Nenhum projeto aprovado neste período</div> : <>
                {[
                  {label:'Receita total',val:revenueApproved,color:'var(--green)'},
                  {label:'Custo total',val:costApproved,color:'var(--amber)'},
                  {label:'Lucro bruto',val:profitApproved,color:profitApproved>=0?'var(--green)':'var(--red)'},
                ].map((row,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                    <span style={{fontSize:12,color:'var(--text2)'}}>{row.label}</span>
                    <span style={{fontSize:14,fontWeight:600,color:row.color}}>{fmt(row.val)}</span>
                  </div>
                ))}
                <div style={{display:'flex',justifyContent:'space-between',padding:'12px 0',fontSize:13}}>
                  <span style={{fontWeight:600}}>Margem de lucro</span>
                  <span style={{fontWeight:700,fontSize:18,color:marginPct>=40?'var(--green)':marginPct>=20?'var(--amber)':'var(--red)'}}>{marginPct}%</span>
                </div>
              </>}
            </div>
          </div>
        </div>
      )}

      {/* Proposals list */}
      {tab==='proposals' && (
        <div className="section">
          <table className="tbl">
            <thead><tr><th>Código</th><th>Cliente</th><th>Data</th><th>Status</th><th style={{textAlign:'right'}}>Receita</th><th style={{textAlign:'right'}}>Custo</th><th style={{textAlign:'right'}}>Lucro</th><th style={{textAlign:'right'}}>Margem</th></tr></thead>
            <tbody>
              {filtered.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map((p,i)=>{
                const rev=calcProposalTotal(p), cost=calcCost(p), profit=rev-cost
                const mg=rev>0?Math.round(profit/rev*100):0
                const STATUS_CLS={draft:'b-gray',sent:'b-blue',approved:'b-green',rejected:'b-red',waiting:'b-amber'}
                const STATUS_LBL={draft:'Rascunho',sent:'Enviado',approved:'Aprovado',rejected:'Recusado',waiting:'Aguardando'}
                return <tr key={i}>
                  <td className="mono" style={{fontWeight:600}}>{p.code||`#${p.id}`}</td>
                  <td>{p.client_name}</td>
                  <td style={{fontSize:11,color:'var(--text3)'}}>{p.created_at ? new Date(p.created_at).toLocaleDateString('pt-BR') : '—'}</td>
                  <td><span className={`badge ${STATUS_CLS[p.status]||'b-gray'}`} style={{fontSize:10}}>{STATUS_LBL[p.status]||p.status}</span></td>
                  <td style={{textAlign:'right',fontWeight:500,color:'var(--accent)'}}>{fmt(rev)}</td>
                  <td style={{textAlign:'right',color:'var(--text2)'}}>{cost>0?fmt(cost):'—'}</td>
                  <td style={{textAlign:'right',fontWeight:500,color:profit>=0?'var(--green)':'var(--red)'}}>{cost>0?fmt(profit):'—'}</td>
                  <td style={{textAlign:'right',fontWeight:700,color:mg>=40?'var(--green)':mg>=20?'var(--amber)':'var(--red)'}}>{cost>0?`${mg}%`:'—'}</td>
                </tr>
              })}
              <tr style={{background:'var(--surf)'}}>
                <td colSpan={4} style={{fontWeight:600,fontSize:12}}>Total do período</td>
                <td style={{textAlign:'right',fontWeight:700,color:'var(--green)'}}>{fmt(filtered.reduce((s,p)=>s+calcProposalTotal(p),0))}</td>
                <td style={{textAlign:'right',fontWeight:700,color:'var(--amber)'}}>{fmt(filtered.reduce((s,p)=>s+calcCost(p),0))}</td>
                <td style={{textAlign:'right',fontWeight:700}}>{fmt(filtered.reduce((s,p)=>s+calcProposalTotal(p)-calcCost(p),0))}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Margin analysis */}
      {tab==='margin' && (
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">Análise de Margens por Proposta Aprovada</div></div>
          {approved.length===0 ? <div style={{textAlign:'center',padding:'32px',color:'var(--text3)'}}>Nenhum projeto aprovado no período selecionado</div> : (
            <table className="tbl">
              <thead><tr><th>Proposta</th><th>Cliente</th><th style={{textAlign:'right'}}>Equipamentos</th><th style={{textAlign:'right'}}>M.Obra</th><th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'right'}}>Custo</th><th style={{textAlign:'right'}}>Lucro</th><th style={{textAlign:'right'}}>Margem %</th></tr></thead>
              <tbody>
                {approved.map((p,i)=>{
                  const floors=Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):[])
                  const equip=floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)
                  const labor=Number(p.labor)||0
                  const total=equip+labor
                  const cost=calcCost(p), profit=total-cost
                  const mg=total>0?Math.round(profit/total*100):0
                  return <tr key={i}>
                    <td className="mono" style={{fontWeight:600}}>{p.code}</td>
                    <td>{p.client_name}</td>
                    <td style={{textAlign:'right'}}>{fmt(equip)}</td>
                    <td style={{textAlign:'right'}}>{fmt(labor)}</td>
                    <td style={{textAlign:'right',fontWeight:600,color:'var(--accent)'}}>{fmt(total)}</td>
                    <td style={{textAlign:'right',color:'var(--amber)'}}>{cost>0?fmt(cost):'—'}</td>
                    <td style={{textAlign:'right',fontWeight:600,color:profit>=0?'var(--green)':'var(--red)'}}>{cost>0?fmt(profit):'—'}</td>
                    <td style={{textAlign:'right',fontWeight:700,fontSize:14,color:mg>=40?'var(--green)':mg>=20?'var(--amber)':'var(--red)'}}>{cost>0?`${mg}%`:'—'}</td>
                  </tr>
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Cash flow - simple projection */}
      {tab==='cashflow' && (
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">Projeção de Recebimentos</div></div>
          <div style={{padding:'16px'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
              {[
                {label:'Aprovados (recebidos/a receber)',val:revenueApproved,color:'var(--green)',desc:'Projetos fechados'},
                {label:'Em negociação (enviados)',val:pipeline,color:'var(--accent)',desc:'Potencial se todos aprovados'},
                {label:'Custo estimado pendente',val:costApproved,color:'var(--amber)',desc:'Custo de equipamentos aprovados'},
              ].map((k,i)=>(
                <div key={i} style={{background:'var(--surf)',borderRadius:6,padding:'14px 16px',borderLeft:`3px solid ${k.color}`}}>
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:4}}>{k.label}</div>
                  <div style={{fontSize:22,fontWeight:700,color:k.color,fontFamily:'DM Serif Display,serif'}}>{fmt(k.val)}</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>{k.desc}</div>
                </div>
              ))}
            </div>
            <div style={{background:'var(--surf)',borderRadius:6,padding:'14px 16px',border:'1px solid var(--border)'}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:12}}>Projetos em andamento ({projects.filter(p=>p.phase!=='done').length})</div>
              <table className="tbl">
                <thead><tr><th>Cliente</th><th>Fase atual</th><th>Prazo</th></tr></thead>
                <tbody>
                  {projects.filter(p=>p.phase!=='done').slice(0,8).map((p,i)=>{
                    const PHASE={visit:'Visita',measurement:'Medição',project:'Projeto',budget:'Orçamento',purchase:'Compras',installation:'Instalação',config:'Configuração'}
                    return <tr key={i}>
                      <td style={{fontWeight:500}}>{p.client_name}</td>
                      <td><span className="badge b-blue" style={{fontSize:10}}>{PHASE[p.phase]||p.phase}</span></td>
                      <td style={{fontSize:11,color:p.deadline&&new Date(p.deadline)<new Date()?'var(--red)':'var(--text3)'}}>{p.deadline||'—'}</td>
                    </tr>
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
