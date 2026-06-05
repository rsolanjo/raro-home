import { useState, useRef } from 'react'
import { uploadObraPhoto, saveDiary } from '../db/supabase.js'

const DEFAULT_TYPES = [
  {key:'problema', label:'Problema', color:'#DC2626', icon:'ti-alert-triangle'},
  {key:'positivo', label:'Ponto positivo', color:'#16A34A', icon:'ti-thumb-up'},
  {key:'falta_material', label:'Falta de material', color:'#D97706', icon:'ti-package-off'},
  {key:'falta_profissional', label:'Falta de profissional', color:'#7C3AED', icon:'ti-user-off'},
  {key:'andamento', label:'Andamento', color:'#0EA5E9', icon:'ti-progress'},
]

async function compress(file, maxDim=1280, q=0.72){
  return new Promise((resolve)=>{
    const reader=new FileReader()
    reader.onload=e=>{
      const img=new Image()
      img.onload=()=>{
        const sc=Math.min(1,maxDim/Math.max(img.width,img.height))
        const cv=document.createElement('canvas')
        cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc)
        cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height)
        cv.toBlob(b=>{ const f=new File([b],file.name.replace(/\.\w+$/,'.jpg'),{type:'image/jpeg'}); resolve(f) },'image/jpeg',q)
      }
      img.onerror=()=>resolve(file); img.src=e.target.result
    }
    reader.onerror=()=>resolve(file); reader.readAsDataURL(file)
  })
}

function todayISO(){ return new Date().toISOString().slice(0,10) }
function fmtDate(iso){ try{ return new Date(iso+'T12:00').toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'}) }catch{ return iso } }

export default function DiarioObra({ proj, onRefresh, currentUser }) {
  const diary = Array.isArray(proj.diary) ? proj.diary : (typeof proj.diary==='string' ? JSON.parse(proj.diary||'[]') : [])
  const rooms = (proj.rooms_config||[]).map(r=>r.name||r).filter(Boolean)
  const customTypes = Array.isArray(proj.diary_types) ? proj.diary_types : []
  const TYPES = [...DEFAULT_TYPES, ...customTypes]

  const [selDate, setSelDate] = useState(todayISO())
  const [room, setRoom] = useState(rooms[0]||'Geral')
  const [type, setType] = useState('andamento')
  const [text, setText] = useState('')
  const [videoLink, setVideoLink] = useState('')
  const [photos, setPhotos] = useState([])  // {url,path} já enviados
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAddType, setShowAddType] = useState(false)
  const [newType, setNewType] = useState('')
  const [lightbox, setLightbox] = useState(null)
  const fileRef = useRef()

  // Datas que têm registros (para navegação)
  const dates = [...new Set(diary.map(d=>d.date))].sort().reverse()
  const dayEntries = diary.filter(d=>d.date===selDate)
  const dayByRoom = {}
  dayEntries.forEach(e=>{ const r=e.room||'Geral'; (dayByRoom[r]=dayByRoom[r]||[]).push(e) })

  async function handlePhotos(e){
    const files=[...e.target.files]; if(!files.length) return
    setUploading(true)
    try{
      const up=[]
      for(const f of files){ const c=await compress(f); const r=await uploadObraPhoto(proj.id,c); up.push(r) }
      setPhotos(p=>[...p,...up])
    }catch(err){ alert('Erro ao enviar foto: '+err.message+'\n\nVerifique se o bucket "obra" existe no Supabase Storage (público).') }
    setUploading(false)
  }

  async function addEntry(){
    if(!text.trim() && !photos.length && !videoLink.trim()){ alert('Adicione uma nota, foto ou vídeo.'); return }
    setSaving(true)
    const entry={ id:Date.now(), date:selDate, room, type, text:text.trim(),
      photos, video_link:videoLink.trim(), author:currentUser?.name||'', created_at:new Date().toISOString() }
    try{
      await saveDiary(proj.id,[...diary,entry])
      setText(''); setPhotos([]); setVideoLink('')
      onRefresh && await onRefresh()
    }catch(err){ alert('Erro ao salvar: '+err.message) }
    setSaving(false)
  }

  async function delEntry(id){
    if(!confirm('Remover este registro?')) return
    try{ await saveDiary(proj.id, diary.filter(d=>d.id!==id)); onRefresh && await onRefresh() }
    catch(err){ alert('Erro: '+err.message) }
  }

  async function addCustomType(){
    const label=newType.trim(); if(!label) return
    const key='custom_'+Date.now()
    const nt=[...customTypes,{key,label,color:'#475569',icon:'ti-tag'}]
    try{
      const { saveProject }=await import('../db/supabase.js')
      await saveProject({...proj, diary_types:nt})
      setNewType(''); setShowAddType(false); onRefresh && await onRefresh()
    }catch(err){ alert('Erro: '+err.message) }
  }

  const typeInfo=k=>TYPES.find(t=>t.key===k)||{label:k,color:'#475569',icon:'ti-tag'}

  return (
    <div className="diario-obra">
      {/* NOVO REGISTRO */}
      <div className="diario-form">
        <div className="diario-form-title"><i className="ti ti-camera" aria-hidden/> Novo registro de obra</div>

        <div className="diario-row">
          <div className="diario-fg">
            <label>Data</label>
            <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} />
          </div>
          <div className="diario-fg">
            <label>Cômodo</label>
            <select value={room} onChange={e=>setRoom(e.target.value)}>
              {(rooms.length?rooms:['Geral']).map(r=><option key={r} value={r}>{r}</option>)}
              <option value="Geral">Geral / Obra toda</option>
            </select>
          </div>
        </div>

        <label className="diario-lbl">Tipo de marcação</label>
        <div className="diario-types">
          {TYPES.map(t=>(
            <button key={t.key} onClick={()=>setType(t.key)}
              className={`diario-type-btn${type===t.key?' active':''}`}
              style={type===t.key?{background:t.color,borderColor:t.color,color:'#fff'}:{borderColor:t.color,color:t.color}}>
              <i className={`ti ${t.icon}`} aria-hidden/> {t.label}
            </button>
          ))}
          <button className="diario-type-btn" style={{borderStyle:'dashed',color:'var(--text3)'}} onClick={()=>setShowAddType(s=>!s)}>
            <i className="ti ti-plus" aria-hidden/> Tipo
          </button>
        </div>
        {showAddType && (
          <div className="diario-row" style={{marginBottom:10}}>
            <input value={newType} onChange={e=>setNewType(e.target.value)} placeholder="Nome do novo tipo..." style={{flex:1}} onKeyDown={e=>e.key==='Enter'&&addCustomType()}/>
            <button className="btn primary" onClick={addCustomType}>Adicionar</button>
          </div>
        )}

        <label className="diario-lbl">Descrição</label>
        <textarea value={text} onChange={e=>setText(e.target.value)} rows={3} placeholder="O que aconteceu hoje neste cômodo..." className="diario-textarea"/>

        {/* Fotos */}
        <div className="diario-photos-row">
          {photos.map((p,i)=>(
            <div key={i} className="diario-thumb" onClick={()=>setLightbox(p.url)}>
              <img src={p.url} alt=""/>
              <button onClick={e=>{e.stopPropagation();setPhotos(ps=>ps.filter((_,j)=>j!==i))}} className="diario-thumb-x">✕</button>
            </div>
          ))}
          <button className="diario-add-photo" onClick={()=>fileRef.current?.click()} disabled={uploading}>
            <i className={`ti ${uploading?'ti-loader':'ti-camera-plus'}`} aria-hidden/>
            <span>{uploading?'Enviando...':'Foto'}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple style={{display:'none'}} onChange={handlePhotos}/>
        </div>

        {/* Vídeo link */}
        <label className="diario-lbl">Link de vídeo (Drive/YouTube) — opcional</label>
        <input value={videoLink} onChange={e=>setVideoLink(e.target.value)} placeholder="Cole o link do vídeo aqui..." className="diario-video-input"/>

        <button className="btn primary diario-save" onClick={addEntry} disabled={saving||uploading}>
          <i className="ti ti-check" aria-hidden/> {saving?'Salvando...':'Salvar registro'}
        </button>
      </div>

      {/* NAVEGAÇÃO POR DIA */}
      {dates.length>0 && (
        <div className="diario-dates">
          {dates.map(d=>(
            <button key={d} className={`diario-date-chip${selDate===d?' active':''}`} onClick={()=>setSelDate(d)}>
              {fmtDate(d)} <span className="diario-date-count">{diary.filter(x=>x.date===d).length}</span>
            </button>
          ))}
        </div>
      )}

      {/* REGISTROS DO DIA SELECIONADO, agrupados por cômodo */}
      <div className="diario-entries">
        <div className="diario-day-header">{fmtDate(selDate)} — {dayEntries.length} registro(s)</div>
        {dayEntries.length===0 && <div className="diario-empty"><i className="ti ti-clipboard" aria-hidden/><p>Nenhum registro neste dia ainda.</p></div>}
        {Object.entries(dayByRoom).map(([r,entries])=>(
          <div key={r} className="diario-room-group">
            <div className="diario-room-title"><i className="ti ti-door" aria-hidden/> {r}</div>
            {entries.map(e=>{ const ti=typeInfo(e.type)
              return <div key={e.id} className="diario-entry">
                <div className="diario-entry-head">
                  <span className="diario-entry-type" style={{background:ti.color}}><i className={`ti ${ti.icon}`} aria-hidden/> {ti.label}</span>
                  {e.author && <span className="diario-entry-author">{e.author}</span>}
                  <button className="diario-entry-del" onClick={()=>delEntry(e.id)}><i className="ti ti-trash" aria-hidden/></button>
                </div>
                {e.text && <div className="diario-entry-text">{e.text}</div>}
                {e.photos?.length>0 && <div className="diario-entry-photos">
                  {e.photos.map((p,i)=><img key={i} src={p.url} alt="" onClick={()=>setLightbox(p.url)}/>)}
                </div>}
                {e.video_link && <a href={e.video_link} target="_blank" rel="noreferrer" className="diario-entry-video"><i className="ti ti-video" aria-hidden/> Ver vídeo</a>}
              </div>
            })}
          </div>
        ))}
      </div>

      {lightbox && <div className="diario-lightbox" onClick={()=>setLightbox(null)}><img src={lightbox} alt=""/><button className="diario-lightbox-x">✕</button></div>}
    </div>
  )
}
