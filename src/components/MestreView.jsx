import { useState, useEffect } from 'react'
import { getProjects, getClients } from '../db/supabase.js'
import DiarioGuiado from './DiarioGuiado.jsx'
import { LOGO_DARK } from '../logos.js'

export default function MestreView({ user, onLogout }) {
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [selClientId, setSelClientId] = useState(null)
  const [loading, setLoading] = useState(true)

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
      setClients(cl.filter(c=>allowed.includes(String(c.id))))
      setProjects(pr)
    }catch(e){ console.error(e) }
    setLoading(false)
  }
  useEffect(()=>{ load() },[])

  const myClients = clients
  const client = myClients.find(c=>String(c.id)===String(selClientId)) || null

  // acha projeto da obra
  const proj = client ? (
    projects.find(p=>String(p.client_id)===String(client.id))
    || projects.find(p=>{ const cn=(p.client_name||'').toLowerCase().trim(); const n1=(client.name1||'').toLowerCase().trim()
        const full=`${client.name1||''} & ${client.name2||''}`.toLowerCase().trim()
        return cn && (cn===full||cn===n1||(n1&&cn.includes(n1))) })
  ) : null

  // monta rooms + equipamentos por cômodo a partir do projeto/proposta
  function buildRooms(){
    if(!client) return {rooms:[],equip:{}}
    // tenta planta_data dos markers, senão floors
    let markers=[], floors=[]
    const src = proj || {}
    const pd = src.planta_data ? (typeof src.planta_data==='string'?JSON.parse(src.planta_data):src.planta_data) : null
    if(pd?.markers?.length) markers=pd.markers
    let fl = src.floors ? (typeof src.floors==='string'?JSON.parse(src.floors):src.floors) : []
    floors = Array.isArray(fl)?fl:[]
    const equip={}; const roomSet=[]
    if(markers.length){
      markers.forEach(m=>{ const r=m.room||'Geral'; if(!equip[r]){equip[r]=[];roomSet.push(r)} equip[r].push({n:m.n,name:m.name}) })
    } else {
      floors.forEach(f=>(f.rooms||[]).forEach(r=>{ const nm=r.name||'Cômodo'; if(!equip[nm]){equip[nm]=[];roomSet.push(nm)}
        ;(r.items||[]).forEach(it=>{ if(it.name) equip[nm].push({name:it.name}) }) }))
    }
    if(!roomSet.length){ ['Sala','Cozinha','Quartos','Banheiros','Área externa'].forEach(r=>{equip[r]=[];roomSet.push(r)}) }
    return {rooms:roomSet, equip}
  }
  const {rooms, equip} = buildRooms()

  // objeto proj para o diário (usa projeto real OU cliente como fallback)
  const diaryProj = proj || (client ? {id:'client-'+client.id, _clientDiary:true, _clientId:client.id,
    client_name:`${client.name1}${client.name2?' & '+client.name2:''}`, diary:client.diary_obra||[]} : null)

  return (
    <div style={{minHeight:'100vh',height:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <img src={LOGO_DARK} alt="RARO" style={{height:26,borderRadius:4}}/>
        <div style={{color:'#fff',flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:600}}>Diário de Obra</div>
          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.name}</div>
        </div>
        {selClientId && <button onClick={()=>setSelClientId(null)} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',padding:'7px 12px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'inherit',marginRight:6}}><i className="ti ti-arrow-left" aria-hidden/> Obras</button>}
        <button onClick={onLogout} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',padding:'7px 12px',borderRadius:6,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>
          <i className="ti ti-logout" aria-hidden/>
        </button>
      </div>

      {/* AREA ROLÁVEL */}
      <div style={{flex:1,overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
        <div style={{maxWidth:640,margin:'0 auto',padding:16,paddingBottom:60}}>
          {loading && <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}><i className="ti ti-loader" style={{fontSize:22,animation:'spin 1s linear infinite'}} aria-hidden/><p>Carregando...</p></div>}

          {/* LISTA DE OBRAS */}
          {!loading && !selClientId && (
            <>
              <h2 style={{fontSize:17,marginBottom:4}}>Suas obras</h2>
              <p style={{fontSize:13,color:'var(--text3)',marginBottom:16}}>Selecione a obra para registrar o diário de hoje.</p>
              {!myClients.length && <div style={{textAlign:'center',padding:30,color:'var(--text3)'}}>Nenhuma obra atribuída. Fale com o administrador.</div>}
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {myClients.map(c=>(
                  <button key={c.id} onClick={()=>setSelClientId(String(c.id))}
                    style={{textAlign:'left',background:'var(--surf)',border:'1px solid var(--border)',borderRadius:12,padding:'16px',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:44,height:44,borderRadius:10,background:'var(--accent-lt)',color:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><i className="ti ti-building-community" style={{fontSize:22}} aria-hidden/></div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:15,fontWeight:600}}>{c.name1}{c.name2?' & '+c.name2:''}</div>
                      <div style={{fontSize:12,color:'var(--text3)'}}>{c.neighborhood||''}{c.street?` · ${c.street}`:''}</div>
                    </div>
                    <i className="ti ti-chevron-right" style={{color:'var(--text3)',fontSize:18}} aria-hidden/>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* DIÁRIO GUIADO */}
          {!loading && selClientId && client && diaryProj && (
            <DiarioGuiado proj={diaryProj} rooms={rooms} equipmentByRoom={equip}
              currentUser={user} clientName={`${client.name1}${client.name2?' & '+client.name2:''}`}
              onDone={load}/>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
