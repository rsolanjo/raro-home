import { useState, useEffect } from 'react'
import { getProjects, getClients } from '../db/supabase.js'
import DiarioObra from './DiarioObra.jsx'
import { LOGO_DARK } from '../logos.js'

export default function MestreView({ user, onLogout }) {
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [selClientId, setSelClientId] = useState(null)
  const [loading, setLoading] = useState(true)

  // ids de obra que o mestre pode ver
  function allowedIds(allClients){
    const scope = user.obra_scope || (user.client_id?'selected':'all')
    if(scope==='all') return allClients.map(c=>String(c.id))
    const ids = Array.isArray(user.client_ids)&&user.client_ids.length ? user.client_ids : (user.client_id?[user.client_id]:[])
    return ids.map(String)
  }

  async function load(){
    setLoading(true)
    try{
      const [pr, cl] = await Promise.all([getProjects(), getClients()])
      const allowed = allowedIds(cl)
      const myClients = cl.filter(c=>allowed.includes(String(c.id)))
      setClients(myClients); setProjects(pr)
      if(!selClientId && myClients.length) setSelClientId(String(myClients[0].id))
    }catch(e){ console.error(e) }
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const client = clients.find(c=>String(c.id)===String(selClientId)) || null
  const proj = client ? (
    projects.find(p=>String(p.client_id)===String(client.id))
    || projects.find(p=>{
        const cn=(p.client_name||'').toLowerCase().trim()
        const n1=(client.name1||'').toLowerCase().trim()
        const full=`${client.name1||''} & ${client.name2||''}`.toLowerCase().trim()
        return cn && (cn===full || cn===n1 || (n1 && cn.includes(n1)))
      })
  ) : null

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:50}}>
        <img src={LOGO_DARK} alt="RARO" style={{height:28,borderRadius:4}}/>
        <div style={{color:'#fff',flex:1}}>
          <div style={{fontSize:13,fontWeight:600}}>Diário de Obra</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{user.name}</div>
        </div>
        <button onClick={onLogout} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',padding:'7px 12px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
          <i className="ti ti-logout" aria-hidden/> Sair
        </button>
      </div>

      {/* Seletor de obra quando o mestre tem mais de uma */}
      {clients.length>1 && (
        <div style={{background:'var(--surf)',borderBottom:'1px solid var(--border)',padding:'10px 14px',display:'flex',gap:8,alignItems:'center',overflowX:'auto'}}>
          <span style={{fontSize:11,color:'var(--text3)',flexShrink:0}}>Obra:</span>
          {clients.map(c=>(
            <button key={c.id} onClick={()=>setSelClientId(String(c.id))}
              style={{flexShrink:0,padding:'7px 13px',borderRadius:16,border:'1px solid',borderColor:String(c.id)===String(selClientId)?'var(--accent)':'var(--border)',background:String(c.id)===String(selClientId)?'var(--accent)':'transparent',color:String(c.id)===String(selClientId)?'#fff':'var(--text2)',fontSize:12,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {c.name1}{c.name2?' & '+c.name2:''}
            </button>
          ))}
        </div>
      )}

      <div style={{flex:1,padding:14,maxWidth:720,margin:'0 auto',width:'100%'}}>
        {loading && <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}><i className="ti ti-loader" style={{fontSize:22,animation:'spin 1s linear infinite'}} aria-hidden/><p>Carregando...</p></div>}
        {!loading && !clients.length && <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>
          <i className="ti ti-alert-circle" style={{fontSize:30,display:'block',marginBottom:10}} aria-hidden/>
          Nenhuma obra atribuída a você. Peça ao administrador para vincular sua conta a uma ou mais obras.
        </div>}
        {!loading && client && !proj && (
          <DiarioObra key={'cli-'+client.id} proj={{id:'client-'+client.id, client_name:`${client.name1}${client.name2?' & '+client.name2:''}`, rooms_config:[], diary:client.diary_obra||[], _clientDiary:true, _clientId:client.id}} onRefresh={load} currentUser={user} mestreMode={true} />
        )}
        {!loading && proj && <DiarioObra key={proj.id} proj={proj} onRefresh={load} currentUser={user} mestreMode={true} />}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
