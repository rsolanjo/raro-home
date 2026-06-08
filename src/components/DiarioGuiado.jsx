import { useState, useRef } from 'react'
import { uploadObraPhoto, saveDiary, saveClientDiary } from '../db/supabase.js'

const TYPES = [
  {key:'andamento', label:'Andamento', color:'#0EA5E9', icon:'ti-progress'},
  {key:'problema', label:'Problema', color:'#DC2626', icon:'ti-alert-triangle'},
  {key:'positivo', label:'Ponto positivo', color:'#16A34A', icon:'ti-thumb-up'},
  {key:'falta_material', label:'Falta material', color:'#D97706', icon:'ti-package-off'},
  {key:'falta_profissional', label:'Falta profissional', color:'#7C3AED', icon:'ti-user-off'},
]

async function compress(file, maxDim=1280, q=0.72){
  return new Promise((resolve)=>{
    const reader=new FileReader()
    reader.onload=e=>{ const img=new Image()
      img.onload=()=>{ const sc=Math.min(1,maxDim/Math.max(img.width,img.height))
        const cv=document.createElement('canvas'); cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc)
        cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height)
        cv.toBlob(b=>resolve(new File([b],file.name.replace(/\.\w+$/,'.jpg'),{type:'image/jpeg'})),'image/jpeg',q) }
      img.onerror=()=>resolve(file); img.src=e.target.result }
    reader.onerror=()=>resolve(file); reader.readAsDataURL(file)
  })
}
function todayISO(){ return new Date().toISOString().slice(0,10) }

export default function DiarioGuiado({ proj, rooms, equipmentByRoom={}, currentUser, clientName, onDone }) {
  const [idx, setIdx] = useState(0)
  const [type, setType] = useState('andamento')
  const [text, setText] = useState('')
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef()

  const today = todayISO()
  const room = rooms[idx]
  const equipos = equipmentByRoom[room] || []
  const isLast = idx >= rooms.length-1

  const existing = Array.isArray(proj.diary) ? proj.diary : (typeof proj.diary==='string'?JSON.parse(proj.diary||'[]'):[])

  async function handlePhotos(e){
    const files=[...e.target.files]; if(!files.length) return
    setUploading(true)
    try{
      const up=[]
      for(const fl of files){ const c=await compress(fl); const r=await uploadObraPhoto(proj._clientDiary?('cli-'+proj._clientId):proj.id,c); up.push(r) }
      setPhotos(p=>[...p,...up])
    }catch(err){ alert('Erro na foto: '+err.message) }
    setUploading(false)
  }

  async function persist(newDiary){
    if(proj._clientDiary) return saveClientDiary(proj._clientId, newDiary)
    return saveDiary(proj.id, newDiary)
  }

  async function saveAndNext(){
    // 4 obrigatórios: cômodo (implícito), foto, tipo, descrição
    if(!photos.length){ alert('Tire ao menos 1 foto deste cômodo.'); return }
    if(!type){ alert('Selecione o tipo de marcação.'); return }
    if(!text.trim()){ alert('Escreva uma descrição.'); return }
    setSaving(true)
    const entry={ id:Date.now(), date:today, room, type, text:text.trim(), photos,
      video_link:'', author:currentUser?.name||'', created_at:new Date().toISOString() }
    try{
      await persist([...existing, entry])
      // limpa e avança
      setPhotos([]); setText(''); setType('andamento')
      if(isLast){ await finish() }
      else { setIdx(i=>i+1) }
    }catch(err){ alert('Erro ao salvar: '+err.message) }
    setSaving(false)
  }

  async function finish(){
    setDone(true)
    // dispara e-mail de conclusão (função serverless)
    try{
      await fetch('/api/notify',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ to:'rss.solano@gmail.com',
          subject:`Diário de obra submetido — ${clientName||'Obra'}`,
          text:`O diário da obra "${clientName||'—'}" foi submetido pelo mestre ${currentUser?.name||'—'} em ${new Date().toLocaleString('pt-BR')}. Total de cômodos registrados hoje: ${rooms.length}.` })
      })
    }catch(e){ console.warn('notify falhou (não crítico):',e) }
    onDone && onDone()
  }

  function skipRoom(){
    if(isLast) finish(); else setIdx(i=>i+1)
  }

  if(done){
    return (
      <div style={{textAlign:'center',padding:'50px 20px'}}>
        <div style={{width:72,height:72,borderRadius:'50%',background:'#16A34A',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px'}}>
          <i className="ti ti-check" style={{fontSize:38,color:'#fff'}} aria-hidden/>
        </div>
        <h2 style={{fontSize:20,marginBottom:8}}>Diário executado!</h2>
        <p style={{color:'var(--text2)',fontSize:14,lineHeight:1.6}}>Todos os cômodos foram registrados.<br/>Um e-mail de confirmação foi enviado à RARO Home.</p>
        <button onClick={()=>{setDone(false);setIdx(0)}} style={{marginTop:24,background:'var(--accent)',color:'#fff',border:'none',padding:'12px 24px',borderRadius:10,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'inherit'}}>
          Revisar / adicionar mais
        </button>
      </div>
    )
  }

  return (
    <div className="dg-wrap">
      {/* Progresso */}
      <div className="dg-progress">
        <div className="dg-progress-bar" style={{width:`${(idx/rooms.length)*100}%`}}/>
      </div>
      <div className="dg-step">Cômodo {idx+1} de {rooms.length} · {new Date(today+'T12:00').toLocaleDateString('pt-BR')}</div>

      {/* Cômodo atual */}
      <div className="dg-room">
        <i className="ti ti-door" aria-hidden/> {room}
      </div>

      {/* Equipamentos do cômodo (referência) */}
      {equipos.length>0 && (
        <div className="dg-equip">
          <div className="dg-equip-title">Equipamentos previstos aqui:</div>
          <div className="dg-equip-list">
            {equipos.map((e,i)=><span key={i} className="dg-equip-chip">{e.n?`#${e.n} `:''}{e.name}</span>)}
          </div>
        </div>
      )}

      {/* Foto */}
      <div className="dg-label">1. Foto do cômodo <span className="dg-req">obrigatório</span></div>
      <div className="dg-photos">
        {photos.map((p,i)=>(
          <div key={i} className="dg-thumb"><img src={p.url} alt=""/><button onClick={()=>setPhotos(ps=>ps.filter((_,j)=>j!==i))} className="dg-thumb-x">✕</button></div>
        ))}
        <button className="dg-add-photo" onClick={()=>fileRef.current?.click()} disabled={uploading}>
          <i className={`ti ${uploading?'ti-loader':'ti-camera-plus'}`} aria-hidden/>
          <span>{uploading?'Enviando...':'Foto'}</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{display:'none'}} onChange={handlePhotos}/>
      </div>

      {/* Tipo */}
      <div className="dg-label">2. Tipo de marcação <span className="dg-req">obrigatório</span></div>
      <div className="dg-types">
        {TYPES.map(t=>(
          <button key={t.key} onClick={()=>setType(t.key)} className={`dg-type${type===t.key?' active':''}`}
            style={type===t.key?{background:t.color,borderColor:t.color,color:'#fff'}:{borderColor:t.color,color:t.color}}>
            <i className={`ti ${t.icon}`} aria-hidden/> {t.label}
          </button>
        ))}
      </div>

      {/* Descrição */}
      <div className="dg-label">3. Descrição <span className="dg-req">obrigatório</span></div>
      <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} className="dg-textarea" placeholder="O que foi feito / observado neste cômodo..."/>

      {/* Ações */}
      <button className="dg-save" onClick={saveAndNext} disabled={saving||uploading}>
        {saving?'Salvando...':isLast?'Salvar e finalizar diário':'Salvar e ir para o próximo cômodo'}
        {!saving && <i className={`ti ${isLast?'ti-flag-check':'ti-arrow-right'}`} aria-hidden style={{marginLeft:6}}/>}
      </button>
      <button className="dg-skip" onClick={skipRoom} disabled={saving}>Pular este cômodo</button>
    </div>
  )
}
