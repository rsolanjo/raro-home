import { useState, useMemo } from 'react'

const TYPE_LABEL = { andamento:'Andamento', problema:'Problema', concluido:'Concluído', material:'Material', outro:'Outro' }
const TYPE_COLOR = { andamento:'#0EA5E9', problema:'#DC2626', concluido:'#16A34A', material:'#D97706', outro:'#6B7280' }

export default function DiariosConsulta({ projects=[], clients=[] }) {
  const [fCliente, setFCliente] = useState('all')
  const [fMestre, setFMestre]   = useState('all')
  const [fDia, setFDia]         = useState('')

  // junta todas as entradas de diário de todos os projetos
  const allEntries = useMemo(()=>{
    const out=[]
    projects.forEach(p=>{
      const diary = Array.isArray(p.diary)?p.diary:(typeof p.diary==='string'?(()=>{try{return JSON.parse(p.diary)}catch{return[]}})():[])
      diary.forEach(d=>out.push({ ...d, projId:p.id, projName:p.client_name||p.name||`#${p.id}` }))
    })
    return out.sort((a,b)=>(b.date||'').localeCompare(a.date||'') || (b.created_at||'').localeCompare(a.created_at||''))
  },[projects])

  const mestres = useMemo(()=>[...new Set(allEntries.map(e=>e.author).filter(Boolean))],[allEntries])
  const obras   = useMemo(()=>[...new Set(allEntries.map(e=>e.projName).filter(Boolean))],[allEntries])

  const filtered = allEntries.filter(e=>{
    if(fCliente!=='all' && e.projName!==fCliente) return false
    if(fMestre!=='all' && e.author!==fMestre) return false
    if(fDia && e.date!==fDia) return false
    return true
  })

  // agrupa por dia
  const byDay = {}
  filtered.forEach(e=>{ (byDay[e.date]=byDay[e.date]||[]).push(e) })

  const fmtDate = d => { if(!d) return '—'; const [y,m,dd]=d.split('-'); return `${dd}/${m}/${y}` }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-notebook" aria-hidden/>Diários de Obra</div>
      </div>
      <div className="content">
        {/* Filtros */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16,alignItems:'flex-end'}}>
          <div>
            <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>Obra / Cliente</div>
            <select value={fCliente} onChange={e=>setFCliente(e.target.value)} style={{padding:'8px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',minWidth:160}}>
              <option value="all">Todas as obras</option>
              {obras.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>Mestre</div>
            <select value={fMestre} onChange={e=>setFMestre(e.target.value)} style={{padding:'8px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit',minWidth:140}}>
              <option value="all">Todos os mestres</option>
              {mestres.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>Dia</div>
            <input type="date" value={fDia} onChange={e=>setFDia(e.target.value)} style={{padding:'8px 10px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text1)',fontFamily:'inherit'}}/>
          </div>
          {(fCliente!=='all'||fMestre!=='all'||fDia) && (
            <button className="btn" style={{fontSize:12}} onClick={()=>{setFCliente('all');setFMestre('all');setFDia('')}}>
              <i className="ti ti-x" aria-hidden/>Limpar filtros
            </button>
          )}
          <div style={{marginLeft:'auto',fontSize:12,color:'var(--text3)'}}>{filtered.length} registro(s)</div>
        </div>

        {!filtered.length && (
          <div style={{textAlign:'center',padding:50,color:'var(--text3)'}}>
            <i className="ti ti-notebook-off" style={{fontSize:34,display:'block',marginBottom:10}} aria-hidden/>
            Nenhum registro de diário encontrado com esses filtros.
          </div>
        )}

        {Object.entries(byDay).map(([day,entries])=>(
          <div key={day} style={{marginBottom:22}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--accent)',marginBottom:10,paddingBottom:6,borderBottom:'1px solid var(--border)'}}>
              <i className="ti ti-calendar" style={{marginRight:6}} aria-hidden/>{fmtDate(day)} · {entries.length} registro(s)
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:12}}>
              {entries.map((e,i)=>(
                <div key={i} style={{background:'var(--surf)',border:'1px solid var(--border)',borderRadius:12,overflow:'hidden'}}>
                  {e.photos?.[0] && <img src={e.photos[0]} alt="" style={{width:'100%',height:150,objectFit:'cover',display:'block'}}/>}
                  <div style={{padding:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#fff',background:TYPE_COLOR[e.type]||'#6B7280',padding:'2px 8px',borderRadius:10}}>{TYPE_LABEL[e.type]||e.type}</span>
                      <span style={{fontSize:12,fontWeight:600}}>{e.room}</span>
                    </div>
                    <div style={{fontSize:12,color:'var(--text2)',marginBottom:8,lineHeight:1.5}}>{e.text}</div>
                    {e.photos?.length>1 && <div style={{fontSize:10,color:'var(--text3)',marginBottom:6}}><i className="ti ti-photo" aria-hidden/> +{e.photos.length-1} foto(s)</div>}
                    <div style={{fontSize:10,color:'var(--text3)',display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:6}}>
                      <span><i className="ti ti-building" aria-hidden/> {e.projName}</span>
                      <span><i className="ti ti-user" aria-hidden/> {e.author||'—'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
