import { useState, useEffect } from 'react'
import { getProjects, getClients } from '../db/supabase.js'
import DiarioObra from './DiarioObra.jsx'
import { LOGO_DARK } from '../logos.js'

export default function MestreView({ user, onLogout }) {
  const [proj, setProj] = useState(null)
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  async function load(){
    setLoading(true)
    try{
      const [projects, clients] = await Promise.all([getProjects(), getClients()])
      const cl = clients.find(c=>String(c.id)===String(user.client_id))
      setClient(cl||null)
      // acha o projeto desse cliente
      const p = projects.find(pr=>String(pr.client_id)===String(user.client_id))
        || projects.find(pr=>cl && (pr.client_name===`${cl.name1} & ${cl.name2}` || pr.client_name===cl.name1))
      setProj(p||null)
    }catch(e){ console.error(e) }
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column'}}>
      <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,position:'sticky',top:0,zIndex:50}}>
        <img src={LOGO_DARK} alt="RARO" style={{height:28,borderRadius:4}}/>
        <div style={{color:'#fff',flex:1}}>
          <div style={{fontSize:13,fontWeight:600}}>Diário de Obra</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{client?`${client.name1}${client.name2?' & '+client.name2:''}`:'—'} · {user.name}</div>
        </div>
        <button onClick={onLogout} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',padding:'7px 12px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
          <i className="ti ti-logout" aria-hidden/> Sair
        </button>
      </div>

      <div style={{flex:1,padding:14,maxWidth:720,margin:'0 auto',width:'100%'}}>
        {loading && <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}><i className="ti ti-loader" style={{fontSize:22,animation:'spin 1s linear infinite'}} aria-hidden/><p>Carregando obra...</p></div>}
        {!loading && !client && <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>
          <i className="ti ti-alert-circle" style={{fontSize:30,display:'block',marginBottom:10}} aria-hidden/>
          Nenhuma obra atribuída a você. Peça ao administrador para vincular sua conta a um cliente.
        </div>}
        {!loading && client && !proj && <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>
          <i className="ti ti-clipboard-off" style={{fontSize:30,display:'block',marginBottom:10}} aria-hidden/>
          A obra de {client.name1} ainda não tem projeto criado. O diário será liberado quando o orçamento for aprovado e virar projeto.
        </div>}
        {!loading && proj && <DiarioObra proj={proj} onRefresh={load} currentUser={user} mestreMode={true} />}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
