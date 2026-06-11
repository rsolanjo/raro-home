import React, { useState, useRef, useEffect, useCallback } from 'react'
import { TAXONOMY, inferCategory, genItemId } from '../taxonomy.js'
import { LOGO_EXEC } from '../logos.js'

const EQUIP_STYLE = {
  'Gateway':{c:'#0EA5E9',s:'G'},'NVR':{c:'#7C3AED',s:'N'},'Câmera':{c:'#DC2626',s:'C'},
  'Keypad':{c:'#059669',s:'K'},'Hub IR':{c:'#D97706',s:'I'},'Módulo':{c:'#6366F1',s:'M'},
  'Som':{c:'#BE185D',s:'S'},'Wi-Fi':{c:'#0E7490',s:'W'},'Sensor':{c:'#16A34A',s:'P'},
  'Tomada':{c:'#475569',s:'T'},'Outro':{c:'#374151',s:'?'},
}

function isRackItem(name='', code='') {
  const n=(name+' '+code).toLowerCase()
  return /\b(hd|nvr|dvr|switch|patch|nobreak|no-break|path ?cord|dream machine|udm|controladora|servidor|fonte|r[aá]ck rack|mini rack|rack)\b/.test(n)
    && !/gateway/.test(n)
}

function equipType(name='') {
  const n=name.toLowerCase()
  if(n.includes('gateway')) return 'Gateway'
  if(n.includes('nvr')||n.includes('gravador')) return 'NVR'
  if(n.includes('câmera')||n.includes('camera')||n.includes('dome')) return 'Câmera'
  if(n.includes('hub ir')||n.includes('qair')) return 'Hub IR'
  if(n.includes('keypad')||n.includes('botão')) return 'Keypad'
  if(n.includes('módulo')||n.includes('qarz')) return 'Módulo'
  if(n.includes('som')||n.includes('caixa')||n.includes('amplificador')) return 'Som'
  if(n.includes('wi-fi')||n.includes('wifi')||n.includes('access point')||n.includes('ap ')) return 'Wi-Fi'
  if(n.includes('sensor')||n.includes('presença')) return 'Sensor'
  if(n.includes('tomada')) return 'Tomada'
  return 'Outro'
}

async function downscale(dataUrl, maxDim=1568, q=0.85) {
  return new Promise(res=>{
    const img=new Image()
    img.onload=()=>{
      const sc=Math.min(1,maxDim/Math.max(img.width,img.height))
      const cv=document.createElement('canvas')
      cv.width=Math.round(img.width*sc); cv.height=Math.round(img.height*sc)
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height)
      res(cv.toDataURL('image/jpeg',q))
    }
    img.onerror=()=>res(dataUrl); img.src=dataUrl
  })
}
async function pdfToImg(b64){
  return new Promise((resolve,reject)=>{
    function go(){
      const lib=window.pdfjsLib
      lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0))
      lib.getDocument({data:bytes}).promise.then(p=>p.getPage(1)).then(pg=>{
        const vp=pg.getViewport({scale:2}); const cv=document.createElement('canvas')
        cv.width=vp.width; cv.height=vp.height
        pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise.then(()=>resolve(cv.toDataURL('image/jpeg',0.85))).catch(reject)
      }).catch(reject)
    }
    if(window.pdfjsLib) go()
    else{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=go;s.onerror=()=>reject(new Error('pdf.js'));document.head.appendChild(s)}
  })
}

async function askClaude(messages, imageB64=null, mime='image/jpeg', maxTokens=1500) {
  const content = []
  if(imageB64) content.push({type:'image',source:{type:'base64',media_type:mime,data:imageB64}})
  const apiMessages = messages.map(m=>({role:m.role, content: m.role==='user' && m===messages[messages.length-1] && imageB64
    ? [...content, {type:'text',text:m.text}]
    : m.text }))
  const payload = JSON.stringify({model:'claude-sonnet-4-5-20250929',max_tokens:maxTokens,clientStream:true,messages:apiMessages})

  const res = await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:payload})
  if(!res.ok){
    const t = await res.text()
    throw new Error('API '+res.status+': '+t.slice(0,150))
  }
  const ct = res.headers.get('content-type')||''
  if(ct.includes('application/json')){
    const data = await res.json()
    return data.content?.[0]?.text || ''
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let full='', buffer=''
  while(true){
    const {done,value} = await reader.read()
    if(done) break
    buffer += decoder.decode(value,{stream:true})
    const lines = buffer.split('\n')
    buffer = lines.pop()||''
    for(const line of lines){
      if(!line.startsWith('data:')) continue
      const d=line.slice(5).trim()
      if(!d||d==='[DONE]') continue
      try{
        const evt=JSON.parse(d)
        if(evt.type==='content_block_delta' && evt.delta?.text) full+=evt.delta.text
        if(evt.type==='error') throw new Error(evt.error?.message||'erro no stream')
      }catch(e){ if(e.message&&e.message!=='Unexpected end of JSON input') {/*parcial*/} }
    }
  }
  return full
}

// ── Rack Modal: seleciona equipamentos dentro do rack ─────────────────────────
function RackModal({ catalog, rackEquip, onChange, markers, onClose, onApply }){
  const [equip, setEquip] = React.useState(rackEquip.length ? rackEquip : [
    {code:'UDM-SE',name:'Dream Machine SE',qty:1,u:'U1-U2',funcao:'Roteador/Gateway'},
    {code:'PP-24',name:'Patch Panel 24 portas CAT6',qty:1,u:'U3-U4',funcao:'Organização cabos'},
    {code:'ORG-1U',name:'Organizador horizontal 1U',qty:2,u:'U5,U6',funcao:'Gestão de cabos'},
    {code:'PDU-8',name:'Régua 8 tomadas filtrada',qty:1,u:'U7',funcao:'Alimentação'},
  ])
  const [catFilter, setCatFilter] = React.useState('Todos')
  function isRackCandidate(c){
    const n=(c.name||'').toLowerCase(), sub=(c.subcategory||'').toLowerCase(), cat=(c.category||'').toLowerCase()
    return n.includes('rack')||n.includes('patch panel')||n.includes('patch cord')||n.includes('organizador')||n.includes('régua')||
      n.includes('switch')||n.includes('dream machine')||n.includes('amplificador')||n.includes('receiver')||n.includes('udm')||
      sub==='rack'||sub==='switch'||sub==='patch panel'||sub==='patch cord'||sub==='amplificador'||sub==='receiver'||
      cat==='redes'||cat==='sonorização'
  }
  const allCats = ['Todos', ...new Set((catalog||[]).filter(isRackCandidate).map(c=>c.category||'Outros'))]
  const rackItems = (catalog||[]).filter(c=>isRackCandidate(c) && (catFilter==='Todos'||c.category===catFilter))
  return (
    <div className="modal-overlay">
      <div className="modal" style={{width:580,maxHeight:'85vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><i className="ti ti-server" style={{marginRight:6,color:'#7C3AED'}} aria-hidden/>Rack / CPD — Equipamentos</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:16}}>
          <div style={{fontSize:11,color:'var(--text2)',marginBottom:12}}>Configure os equipamentos dentro do rack. O rack aparece como um único pin na planta.</div>
          {/* Equipment list */}
          {equip.map((it,i)=>(
            <div key={i} style={{display:'flex',gap:6,alignItems:'center',padding:'5px 0',borderBottom:'1px solid var(--border)'}}>
              <input value={it.u} onChange={e=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,u:e.target.value}:x))}
                style={{width:54,fontSize:11}} placeholder="U1-U2" title="Posição U"/>
              <input value={it.name} onChange={e=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,name:e.target.value}:x))}
                style={{flex:1,fontSize:11}} placeholder="Equipamento"/>
              <input value={it.funcao||''} onChange={e=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,funcao:e.target.value}:x))}
                style={{flex:1,fontSize:11}} placeholder="Função"/>
              <input value={it.qty} type="number" min="1" onChange={e=>setEquip(eq=>eq.map((x,j)=>j===i?{...x,qty:parseInt(e.target.value)||1}:x))}
                style={{width:38,fontSize:11}} title="Qtd"/>
              <button onClick={()=>setEquip(eq=>eq.filter((_,j)=>j!==i))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:14,flexShrink:0}}>✕</button>
            </div>
          ))}
          {/* Add from catalog — filtrado por categoria */}
          <div style={{marginTop:12,background:'var(--surf)',borderRadius:6,padding:10,border:'1px solid var(--border)'}}>
            <div style={{fontSize:10,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',marginBottom:8}}>Adicionar do catálogo</div>
            <div style={{display:'flex',gap:6,marginBottom:6,flexWrap:'wrap'}}>
              {allCats.map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)}
                  style={{fontSize:9,padding:'2px 8px',borderRadius:8,border:'1px solid',cursor:'pointer',fontFamily:'inherit',
                    borderColor:catFilter===c?'var(--accent)':'var(--border)',
                    background:catFilter===c?'var(--accent-lt)':'transparent',
                    color:catFilter===c?'var(--accent)':'var(--text3)'}}>
                  {c}
                </button>
              ))}
            </div>
            <div style={{maxHeight:180,overflowY:'auto',display:'flex',flexDirection:'column',gap:3}}>
              {rackItems.length===0
                ? <div style={{fontSize:11,color:'var(--text3)',padding:'8px 0'}}>Nenhum item no catálogo para esta categoria.</div>
                : rackItems.map(c=>(
                  <button key={c.code} onClick={()=>setEquip(eq=>[...eq,{code:c.code,name:c.name,qty:1,u:`U${eq.length+1}`,funcao:c.subcategory||''}])}
                    style={{background:'none',border:'1px solid var(--border)',borderRadius:4,padding:'5px 10px',cursor:'pointer',fontSize:11,textAlign:'left',fontFamily:'inherit',display:'flex',alignItems:'center',gap:8}}
                    onMouseEnter={e=>e.currentTarget.style.background='var(--surf2)'}
                    onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <span style={{fontWeight:600,fontFamily:'monospace',fontSize:10,color:'var(--accent)',minWidth:60}}>{c.code}</span>
                    <span style={{flex:1}}>{c.name}</span>
                    <span style={{fontSize:9,color:'var(--text3)'}}>{c.subcategory||c.category}</span>
                    <span style={{fontSize:10,color:'var(--accent)',fontWeight:700}}>+</span>
                  </button>
                ))}
            </div>
          </div>
          <button onClick={()=>setEquip(eq=>[...eq,{code:'',name:'',qty:1,u:`U${eq.length+1}`,funcao:''}])}
            style={{marginTop:8,background:'none',border:'1px dashed var(--border)',borderRadius:4,padding:'5px 12px',cursor:'pointer',fontSize:11,color:'var(--text3)',width:'100%'}}>
            + Adicionar equipamento manual
          </button>
        </div>
        <div style={{padding:'10px 16px',borderTop:'1px solid var(--border)',display:'flex',gap:8,justifyContent:'flex-end',alignItems:'center'}}>
          <span style={{fontSize:10,color:'var(--text3)',flex:1}}>{equip.length} equipamento{equip.length!==1?'s':''} no rack</span>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={()=>onApply(equip)}>Salvar e colocar na planta</button>
        </div>
      </div>
    </div>
  )
}

// Error boundary to show errors instead of blank page
class ExecErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={err:null} }
  static getDerivedStateFromError(err){ return {err} }
  componentDidCatch(err,info){ console.error('ProjetoExecutivo crash:', err, info) }
  render(){
    if(this.state.err) return (
      <div style={{position:'fixed',inset:0,background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16,padding:32}}>
        <div style={{color:'#F87171',fontSize:16,fontWeight:700}}>❌ Erro no Projeto Executivo</div>
        <div style={{color:'rgba(255,255,255,0.6)',fontSize:13,fontFamily:'monospace',background:'rgba(255,255,255,0.05)',padding:12,borderRadius:6,maxWidth:600,wordBreak:'break-all'}}>
          {this.state.err.message}
        </div>
        <button onClick={()=>{this.setState({err:null}); this.props.onReset?.()}}
          style={{background:'#0EA5E9',color:'#fff',border:'none',borderRadius:6,padding:'8px 20px',cursor:'pointer',fontSize:13}}>
          Tentar novamente
        </button>
      </div>
    )
    return this.props.children
  }
}

// Componente inline para adicionar cômodo sem prompt()
function AddRoomInline({ onAdd }){
  const [name, setName] = React.useState('')
  const [floor, setFloor] = React.useState('Pavimento 1')
  const [open, setOpen] = React.useState(false)
  if(!open) return (
    <button onClick={()=>setOpen(true)} style={{width:'100%',background:'rgba(56,189,248,0.1)',border:'1px dashed rgba(56,189,248,0.3)',borderRadius:5,color:'#38BDF8',cursor:'pointer',padding:'5px 0',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',gap:4,fontFamily:'inherit'}}
      onMouseEnter={e=>e.currentTarget.style.background='rgba(56,189,248,0.2)'} onMouseLeave={e=>e.currentTarget.style.background='rgba(56,189,248,0.1)'}>
      <i className="ti ti-plus" style={{fontSize:12}} aria-hidden/> Adicionar cômodo
    </button>
  )
  return (
    <div style={{display:'flex',flexDirection:'column',gap:4}}>
      <input autoFocus placeholder="Nome do cômodo" value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>e.key==='Escape'&&setOpen(false)}
        style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(56,189,248,0.4)',borderRadius:4,color:'#fff',fontSize:11,padding:'4px 7px',outline:'none'}}/>
      <input placeholder="Pavimento (ex: Pavimento 1)" value={floor} onChange={e=>setFloor(e.target.value)}
        style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:4,color:'#fff',fontSize:11,padding:'4px 7px',outline:'none'}}/>
      <div style={{display:'flex',gap:4}}>
        <button onClick={()=>{ if(name.trim()){ onAdd({name:name.trim(),floor:floor.trim()}); setName(''); setOpen(false) } }}
          style={{flex:1,background:'#0EA5E9',border:'none',borderRadius:4,color:'#fff',cursor:'pointer',padding:'4px 0',fontSize:11,fontFamily:'inherit'}}>Confirmar</button>
        <button onClick={()=>setOpen(false)} style={{flex:1,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:4,color:'rgba(255,255,255,0.5)',cursor:'pointer',padding:'4px 0',fontSize:11,fontFamily:'inherit'}}>Cancelar</button>
      </div>
    </div>
  )
}

function ProjetoExecutivoInner({ catalog=[], clients=[], preClient, fromProposal, onSaveToProposal, onClose, currentUser }) {
  const [step, setStep] = useState(()=> fromProposal?.planta_data?.markers?.length ? 'editor' : 'upload')
  const [bgImage, setBgImage] = useState(()=> fromProposal?.planta_data?.image || null)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [markers, setMarkers] = useState(()=> fromProposal?.planta_data?.markers || [])
  const [projectInfo, setProjectInfo] = useState({
    client: preClient?`${preClient.name1||''}${preClient.name2?' & '+preClient.name2:''}`
          : fromProposal?.client_name || '',
    notes:''
  })
  const [selClient, setSelClient] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [catSearch, setCatSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [editorSearch, setEditorSearch] = useState('')         // busca nos markers na planta
  const [filterRooms, setFilterRooms] = useState(new Set())   // cômodos selecionados (vazio = todos)
  const [filterCateg, setFilterCateg] = useState(new Set())   // categorias selecionadas (vazio = todas)
  const [showRackModal, setShowRackModal] = useState(false)
  const [rackEquip, setRackEquip] = useState([])   // [{code,name,qty,u}]
  const [execDoc, setExecDoc] = useState(null)
  const [execProgress, setExecProgress] = useState('')
  const [zoom, setZoom] = useState(1)
  const [selected, setSelected] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [addItem, setAddItem] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const [rooms, setRooms] = useState([])          // [{id,name,floor,x,y}] — cômodos identificados pela IA
  const [editingRoom, setEditingRoom] = useState(null)  // id sendo editado na lista
  const [imgZoom, setImgZoom]   = useState(1)
  const [imgPan,  setImgPan]    = useState({x:0, y:0})
  const [panning, setPanning]   = useState(null)   // {startX, startY, panX, panY}
  const imgContainerRef = useRef()

  // Reset zoom/pan quando trocar de imagem
  useEffect(()=>{ setImgZoom(1); setImgPan({x:0,y:0}) },[bgImage])

  function onImgWheel(e){
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.15 : -0.15
    setImgZoom(z => Math.min(8, Math.max(0.3, z + delta * z)))
  }
  function onImgMouseDown(e){
    if(e.button !== 0) return
    e.preventDefault()
    setPanning({startX: e.clientX, startY: e.clientY, panX: imgPan.x, panY: imgPan.y})
  }
  function onImgMouseMove(e){
    if(!panning) return
    setImgPan({x: panning.panX + (e.clientX - panning.startX), y: panning.panY + (e.clientY - panning.startY)})
  }
  function onImgMouseUp(){ setPanning(null) }
  function onImgDblClick(){ setImgZoom(1); setImgPan({x:0,y:0}) }

  const chatEndRef = useRef()
  const fileRef = useRef()
  const bgOnlyRef = useRef()
  const containerRef = useRef()

  // Attach wheel with passive:false so preventDefault() works
  useEffect(()=>{
    const el = imgContainerRef.current
    if(!el) return
    el.addEventListener('wheel', onImgWheel, {passive:false})
    return ()=> el.removeEventListener('wheel', onImgWheel)
  }) // re-runs each render to always get latest handler; cheap since no real side-effect

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}) },[chat])

  useEffect(()=>{
    if(fromProposal && !fromProposal?.planta_data?.markers?.length && !markers.length){
      const floors = typeof fromProposal.floors==='string' ? (()=>{try{return JSON.parse(fromProposal.floors)}catch{return[]}})() : (fromProposal.floors||[])
      // 1) agrupa os itens por cômodo (ignora itens de rack)
      const rooms=[]; let n=1
      floors.forEach(fl=>(fl.rooms||[]).forEach(r=>{
        const items=[]
        ;(r.items||[]).forEach(it=>{
          if(!it.name && !it.code) return
          const cat=catalog.find(c=>c.code===it.code)
          const qty=parseInt(it.qty)||1
          for(let i=0;i<qty;i++){
            if(isRackItem(it.name||cat?.name||'', it.code||'')) continue
            items.push({code:it.code||cat?.code||'', name:it.name||cat?.name||'Item', room:r.name||'',
              cost:it.cost_price||cat?.cost_price||0, sale:it.sale_price||cat?.sale_price||0, category:it.category||cat?.category||''})
          }
        })
        if(items.length) rooms.push({name:r.name||'', items})
      }))
      // 2) distribui os cômodos numa grade e, dentro de cada cômodo, espalha os pontos
      const mk=[]
      const cols=Math.ceil(Math.sqrt(rooms.length))||1
      const rows=Math.ceil(rooms.length/cols)||1
      rooms.forEach((room,ri)=>{
        const cx=ri%cols, cy=Math.floor(ri/cols)
        const cellW=92/cols, cellH=88/rows
        const baseX=4+cellW*cx, baseY=6+cellH*cy
        const per=room.items.length
        const icols=Math.ceil(Math.sqrt(per))||1
        room.items.forEach((it,ii)=>{
          const ix=ii%icols, iy=Math.floor(ii/icols)
          const stepX=(cellW-6)/Math.max(1,icols-0), stepY=(cellH-10)/Math.max(1,Math.ceil(per/icols))
          mk.push({uid:Date.now()+Math.random(), n:n++, id:'', code:it.code, name:it.name, room:it.room, note:'',
            x:Math.min(96,Math.max(3, baseX+3+ix*stepX)),
            y:Math.min(94,Math.max(5, baseY+6+iy*stepY)),
            cost:it.cost, sale:it.sale, category:it.category})
        })
      })
      if(mk.length){ setMarkers(mk); if(!fromProposal?.planta_data?.image) setStep('editor') }
    }
  },[])  // eslint-disable-line

  // Se há planta cadastrada no cliente, guarda para mostrar na tela de upload
  const [clientePlanta, setClientePlanta] = useState(null) // {url, label}

  useEffect(()=>{
    if(bgImage || fromProposal?.planta_data?.image) return
    const cli = clients.find(c=> c.id===Number(fromProposal?.client_id))
      || (preClient && clients.find(c=>c.id===Number(preClient.id)))
      || preClient || null
    const planta = cli?.planta_medidas || cli?.planta_eletrica
    if(!planta?.data) return
    let cancelled=false
    ;(async()=>{
      try{
        let url = planta.data
        if((planta.type||'').includes('pdf') || /^data:application\/pdf/.test(url)){
          url = await pdfToImg(url.split(',')[1])
        }
        url = await downscale(url)
        const label = cli?.planta_medidas ? 'Planta de Medidas' : 'Planta Elétrica'
        if(!cancelled) setClientePlanta({url, label})
      }catch(e){ console.warn('planta cliente:', e?.message) }
    })()
    return ()=>{ cancelled=true }
  },[])  // eslint-disable-line

  function usarPlantaCliente(){
    if(!clientePlanta) return
    setBgImage(clientePlanta.url)
    setStep('rooms')
    startRooms(clientePlanta.url)
  }

  async function handleFile(e){
    const f=e.target.files[0]; if(!f) return
    const reader=new FileReader()
    reader.onload=async ev=>{
      let url=ev.target.result
      if(f.type==='application/pdf'){ try{ url=await pdfToImg(url.split(',')[1]) }catch(err){ alert('Erro PDF: '+err.message); return } }
      url=await downscale(url)
      setBgImage(url)
      setStep('rooms')
      startRooms(url)
    }
    reader.readAsDataURL(f)
  }

  // Troca só o fundo da planta sem reiniciar a análise (usado no editor)
  async function handleBgOnly(e){
    const f=e.target.files[0]; if(!f) return
    const reader=new FileReader()
    reader.onload=async ev=>{
      let url=ev.target.result
      if(f.type==='application/pdf'){ try{ url=await pdfToImg(url.split(',')[1]) }catch(err){ alert('Erro PDF: '+err.message); return } }
      url=await downscale(url)
      setBgImage(url)
      // mantém o step atual (editor) e os markers — não reinicia
    }
    reader.readAsDataURL(f)
  }

  // ETAPA 1: IA identifica cômodos com posições (x,y %) na imagem
  async function startRooms(imgUrl){
    setLoading(true)
    const prompt = `Você é um projetista da RARO Home. Analise esta planta baixa e identifique TODOS os ambientes/cômodos visíveis.

Retorne SOMENTE um JSON válido, sem nenhum texto antes ou depois:
{"rooms":[{"id":1,"name":"Sala de Estar","floor":"Pavimento 1","x":25,"y":35},{"id":2,"name":"Cozinha","floor":"Pavimento 1","x":60,"y":40}]}

Campos:
- id: número sequencial (1, 2, 3...)
- name: nome do cômodo em português
- floor: "Pavimento 1", "Pavimento 2" etc. Se for apenas um pavimento use "Único"
- x: posição horizontal do CENTRO do cômodo na imagem (0=esquerda, 100=direita)
- y: posição vertical do CENTRO do cômodo na imagem (0=topo, 100=fundo)

Identifique TODOS os cômodos: salas, quartos, banheiros, cozinha, área de serviço, garagem, varanda, etc.`
    try{
      const reply = await askClaude([{role:'user',text:prompt}], imgUrl.split(',')[1], 'image/jpeg', 2000)
      let clean = reply.trim().replace(/\`\`\`json?\n?/g,'').replace(/\`\`\`/g,'').trim()
      const s=clean.indexOf('{'); if(s>0) clean=clean.slice(s)
      const e=clean.lastIndexOf('}'); if(e>=0) clean=clean.slice(0,e+1)
      const parsed = JSON.parse(clean)
      if(Array.isArray(parsed.rooms)){
        setRooms(parsed.rooms.map((r,i)=>({...r, id:r.id||i+1, x:Math.max(3,Math.min(97,Number(r.x)||50)), y:Math.max(3,Math.min(97,Number(r.y)||50)) })))
      }
    }catch(err){ console.warn('startRooms parse error:', err); setRooms([]) }
    setLoading(false)
  }

  // ETAPA 2: IA faz perguntas sobre o projeto (após cômodos confirmados)
  async function startChat(imgUrl, confirmedRooms){
    setLoading(true)
    const catList = (catalog||[]).slice(0,100).map(c=>`- ${c.name} (${c.category||'geral'})`).join('\n')
    const roomsList = confirmedRooms.map(r=>`${r.id}. ${r.name}${r.floor?' ('+r.floor+')':''}`).join('\n')
    const sys = `Você é um projetista especialista da RARO Home (automação residencial Zigbee/Matter).

CÔMODOS CONFIRMADOS pelo cliente:
${roomsList}

CATÁLOGO RARO Home:
${catList}

REGRAS DO PROJETO:
1. CABECEIRA DE CAMA: combo por lado — keypad 1 botão (H=0,70m) + tomada USB (H=0,90m) + tomada comum (H=0,30m).
2. Banheiros/entrada: sensor mmWave no teto.
3. Ambientes com AC e/ou TV: Hub IR.
4. Wi-Fi: 1 AP por 50m², teto centro.
5. Rack: Dream Machine SE + switch PoE+ se >6 dispositivos PoE.

Com base nos cômodos listados, faça APENAS 4 ou 5 perguntas objetivas essenciais. Inclua OBRIGATORIAMENTE:
- Pergunta sobre KEYPADS por cômodo (quantas teclas em cada ambiente — 1, 2, 3, 4 ou 6 botões)
- Pergunta sobre TOMADAS por cômodo (quantidade e posições desejadas além das cabeceiras)
- Pergunta sobre ar-condicionado e TV (ambientes com Hub IR)
- Pergunta sobre câmeras e som ambiente
Cada pergunta em parágrafo separado. Seja direto e objetivo.`
    try{
      const reply = await askClaude([{role:'user',text:sys+'\n\nFaça as perguntas sobre este projeto.'}], null, 'image/jpeg', 800)
      setChat([{role:'assistant',text:reply}])
    }catch(err){ setChat([{role:'assistant',text:'❌ Erro: '+err.message}]) }
    setLoading(false)
  }

  async function sendChat(directText){
    const text = directText || chatInput
    if(!text?.trim()||loading) return
    const userMsg={role:'user',text:text.trim()}
    const newChat=[...chat,userMsg]
    setChat(newChat); setChatInput(''); setLoading(true)
    try{
      const reply=await askClaude(newChat.map(m=>({role:m.role,text:m.text})), null, 'image/jpeg', 1200)
      setChat([...newChat,{role:'assistant',text:reply}])
    }catch(err){ setChat([...newChat,{role:'assistant',text:'❌ Erro: '+err.message}]) }
    setLoading(false)
  }

  async function generatePositions(){
    setLoading(true); setExecProgress('Analisando a planta e posicionando os equipamentos...')
    const catSummary = catalog.slice(0,80).map(c=>`${c.code}: ${c.name} (${c.category})`).join('\n')
    const conversation = chat.map(m=>`${m.role==='user'?'Cliente':'Projetista'}: ${m.text}`).join('\n')
    const roomsConfirmed = rooms.length
      ? `\nCÔMODOS CONFIRMADOS com posições na planta (use x,y como REFERÊNCIA CENTRAL de cada cômodo):\n${rooms.map(r=>`${r.id}. ${r.name}${r.floor?' ('+r.floor+')':''} — centro aproximado: x=${Math.round(r.x||50)}, y=${Math.round(r.y||50)}`).join('\n')}\n\nPOSICIONAMENTO: distribua os equipamentos DENTRO do cômodo correspondente, próximo ao x,y indicado (variação ±10% para não sobrepor). NUNCA empilhe itens.\n`
      : ''
    const prompt = `Você é um projetista de automação RARO Home. Posicione os equipamentos na planta.
${roomsConfirmed}
CONVERSA (premissas):
${conversation}

CATÁLOGO (use só estes códigos):
${catSummary}

REGRAS DE POSICIONAMENTO:
- Identifique visualmente cada AMBIENTE na planta.
- Keypad entrada: ao lado da porta, lado maçaneta, H=1,10m. Quantidade de botões conforme premissas da conversa (1, 2, 3, 4 ou 6 botões).
- CABECEIRA DE CAMA (OBRIGATÓRIO em todo quarto/suíte): combo em CADA lado: 1x keypad 1 botão (H=0,70m) + 1x tomada USB (H=0,90m) + 1x tomada comum (H=0,30m).
- TOMADAS POR CÔMODO: adicione tomadas conforme premissas da conversa — H=0,30m padrão, H=0,90m altura de mesa/bancada.
- SALA DE ESTAR (sempre que houver TV): posicione 5 caixas de som embutidas no teto (5.1) — frontal L/R, central, surround L/R — + subwoofer no chão próximo ao rack.
- Câmera: canto alto do ambiente, H=2,50m.
- Hub IR: só em ambientes com AR-CONDICIONADO E/OU TV, visão do aparelho.
- Sensor mmWave: entrada principal + todos os banheiros, no teto H=2,70m.
- Access Point: 1 por área de 50m², teto centro.
- Som: distribuído no teto do ambiente.
- NÃO empilhe itens. Items do rack (switch, patch panel) NÃO vão na planta.

Responda APENAS JSON válido:
{"itens":[{"id":"K1","code":"QAT42Z2B","room":"Sala","x":20,"y":40,"nota":"ao lado da porta, H=110cm"}]}`
    try{
      const reply=await askClaude(
        [{role:'user',text:prompt}],
        bgImage.split(',')[1],'image/jpeg',6000
      )
      let j=reply.trim()
      if(j.includes('```')) j=j.replace(/```json?\n?/g,'').replace(/```/g,'')
      const s=j.indexOf('{')
      if(s>=0) j=j.slice(s)
      let parsed
      try{ parsed=JSON.parse(j) }
      catch(pe){
        const objs=[...j.matchAll(/\{[^{}]*\}/g)].map(m=>m[0])
        if(objs.length){
          try{ parsed={itens: objs.map(o=>JSON.parse(o))} }
          catch(e2){ throw new Error('A IA cortou a resposta. Clique em "Gerar sugestão" de novo.') }
        } else {
          throw new Error('A IA não retornou JSON. Tente novamente.')
        }
      }
      let cid=Date.now()
      const mk=(parsed.itens||[])
        .filter(it=>{ const cat=catalog.find(c=>c.code===it.code); return !isRackItem(cat?.name||it.name||'', it.code||'') })
        .map(it=>{
        const cat=catalog.find(c=>c.code===it.code) || catalog.find(c=>(c.name||'').toLowerCase()===(it.name||'').toLowerCase())
        return {uid:cid++, id:it.id||('?'+(cid%1000)), code:it.code||cat?.code||'', name:cat?.name||it.name||it.code||'Item',
          room:it.room||'', x:Math.max(2,Math.min(98,Number(it.x)||50)), y:Math.max(2,Math.min(96,Number(it.y)||50)),
          note:it.nota||it.note||'', cost:cat?.cost_price||0, sale:cat?.sale_price||0, category:cat?.category||''}
      })
      if(!mk.length) throw new Error('A IA não sugeriu itens. Verifique se há equipamentos no catálogo e tente novamente.')
      mk.forEach((m,i)=>{ m.n = i+1 })
      setMarkers(mk)
      setStep('editor')
    }catch(err){ alert('Erro ao posicionar: '+err.message) }
    setLoading(false)
  }

  function onDown(e,uid){ e.preventDefault(); e.stopPropagation(); setSelected(uid)
    const r=containerRef.current.getBoundingClientRect(); setDragging({uid,ox:e.clientX,oy:e.clientY,r}) }
  const onMove=useCallback(e=>{ if(!dragging)return; const{uid,ox,oy,r}=dragging
    const dx=((e.clientX-ox)/r.width)*100, dy=((e.clientY-oy)/r.height)*100
    setMarkers(ms=>ms.map(m=>m.uid!==uid?m:{...m,x:Math.max(0,Math.min(98,m.x+dx)),y:Math.max(0,Math.min(96,m.y+dy))}))
    setDragging(d=>({...d,ox:e.clientX,oy:e.clientY})) },[dragging])
  const onUp=useCallback(()=>setDragging(null),[])
  useEffect(()=>{window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp)
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}},[onMove,onUp])

  function onCanvasClick(e){
    if(!addMode||!addItem)return
    const r=containerRef.current.getBoundingClientRect()
    const x=((e.clientX-r.left)/r.width)*100, y=((e.clientY-r.top)/r.height)*100
    const {cat, sub} = inferCategory(addItem.name, addItem.category||'')
    setMarkers(ms=>{
      const newId = genItemId('', sub, ms)
      return [...ms,{uid:Date.now(),n:ms.length+1,id:newId,code:addItem.code,name:addItem.name,
        room:'',x,y,note:'',cost:addItem.cost_price||0,sale:addItem.sale_price||0,category:cat,subcategory:sub||''}]
    })
    setAddMode(false); setAddItem(null)
  }

  async function askJSON(prompt, maxTokens){
    for(let attempt=0; attempt<2; attempt++){
      const reply=await askClaude([{role:'user',text:prompt}],null,'image/jpeg',maxTokens)
      let j=reply.trim()
      if(j.includes('```')) j=j.replace(/```json?\n?/g,'').replace(/```/g,'')
      const s=j.indexOf('{'); if(s>0) j=j.slice(s)
      try{ const e=j.lastIndexOf('}'); return JSON.parse(e>0?j.slice(0,e+1):j) }
      catch(_){
        try{
          let t=j.replace(/,\s*$/,'')
          const lastObj=t.lastIndexOf('}'); if(lastObj>0) t=t.slice(0,lastObj+1)
          const oA=(t.match(/\[/g)||[]).length, cA=(t.match(/\]/g)||[]).length
          const oB=(t.match(/\{/g)||[]).length, cB=(t.match(/\}/g)||[]).length
          t+=']'.repeat(Math.max(0,oA-cA))+'}'. repeat(Math.max(0,oB-cB))
          return JSON.parse(t)
        }catch(e2){ if(attempt===0) continue; throw new Error('A IA cortou a resposta. Tente novamente.') }
      }
    }
  }

  async function generateExec(){
    setLoading(true)
    setExecProgress('Coletando dados...')
    const itemsList=markers.map(m=>`#${m.n} ${m.name} (${m.code}) — ${m.room} — ${m.note}`).join('\n')
    const conversation=chat.map(m=>`${m.role==='user'?'Cliente':'Projetista'}: ${m.text}`).join('\n')
    const ctx=`Premissas da conversa:\n${conversation}\n\nPontos posicionados:\n${itemsList}`
    const conv=`Convenções RARO Home: CPD/Rack centraliza tudo. Keypads SEMPRE fase+neutro 2,5mm² do quadro. Keypads entrada: 1,10m; cabeceira: 0,70m. Câmeras/APs CAT6 PoE. Som 2×1,5mm² do amplificador. Hub IR só com AC/TV. Alturas: tomada 0,30m, USB 0,90m, som teto, módulo forro, cortina 2,55m. Rack: sempre Dream Machine SE (8 portas). Se APs+Câmeras > 6, adicionar Switch PoE+. NÃO usar NVR separado. NÃO usar DIO.`

    // Conta APs e câmeras para decidir se precisa de switch
    const aps = markers.filter(m=>m.name.toLowerCase().includes('access point')||m.name.toLowerCase().includes('ap ')||m.name.toLowerCase().includes('wi-fi')||m.name.toLowerCase().includes('wifi')).length
    const cams = markers.filter(m=>m.name.toLowerCase().includes('câmera')||m.name.toLowerCase().includes('camera')||m.name.toLowerCase().includes('dome')).length
    const precisaSwitch = (aps+cams) > 6
    const rackNote = `APs: ${aps}, Câmeras: ${cams}. Dream Machine SE tem 8 portas. ${precisaSwitch?'PRECISA de Switch PoE+ adicional ('+((aps+cams)-6)+' portas a mais que o DM).':'Dream Machine SE comporta tudo ('+( aps+cams)+' dispositivos PoE).'}`

    try{
      // BLOCO 1 — premissas, rack (com visual), pontos por ambiente, módulos
      setExecProgress('Rack, premissas e pontos... (1/2)')
      const d1=await askJSON(
`Projetista RARO Home. Responda APENAS JSON válido (sem markdown). ${conv}\n\n${ctx}\n\nINFO RACK: ${rackNote}\n\n{
 "premissas":["..."],
 "rack_config":{"dream_machine_portas":8,"aps":${aps},"cameras":${cams},"precisa_switch":${precisaSwitch},"switch_portas":${precisaSwitch?16:0},"observacao":"..."},
 "rack_items":[
  {"u":"U1","equip":"Dream Machine SE","funcao":"Roteador principal, controller UniFi, gateway Zigbee integrado, 8 portas PoE","watts":"25W"},
  {"u":"U2","equip":"Switch PoE+ 16p","funcao":"Alimentação adicional APs/câmeras PoE (somente se precisa_switch=true)","watts":"120W"},
  {"u":"U3","equip":"Amplificador multicanal 8 zonas","funcao":"Som ambiente — conecta caixas por zona","watts":"200W"},
  {"u":"U4-U5","equip":"Patch Panel 24 portas CAT6","funcao":"Organização de todos os cabos estruturados","watts":"—"},
  {"u":"U6","equip":"Organizador horizontal 1U","funcao":"Gestão de cabos patch cord — 1 por Patch Panel","watts":"—"},
  {"u":"U7","equip":"Régua 8 tomadas filtrada","funcao":"Alimentação filtrada dos equipamentos","watts":"—"}
],
 "rack_detalhe":["Rack embutido no armário...","Tomada 110V dedicada 20A...","Ventilação forçada...","..."],
 "pontos":[{"ambiente":"Estar (8,00×6,20m)","linhas":[{"ponto":"K1","equip":"Keypad 6 botões","parede":"entrada","dist":"0,15m","alt":"1,10m","caixa":"4×4 + NEUTRO","cabo":"2,5mm² ~8m"}]}],
 "modulos_teto":[{"ambiente":"Estar","itens":["5x spot LED M1","Módulo cortina M2 (forro, 2,55m)","Caixa som S1-S5 (teto, 2,70m)","Sensor mmWave P1 (teto centro)"]}],
 "modulos":[{"id":"M1","funcao":"Iluminação","ambiente":"Sala","carga":"5 spots LED","posicao":"forro gesso"}],
 "banheiros_sensores":[{"ambiente":"Banheiro Master","ponto":"Sensor mmWave teto","obs":"luz automática, umidade"}]
}`, 6000)

      // BLOCO 2 — cabos detalhados (por cômodo), alimentação, resumo, peças, checklists, riscos
      setExecProgress('Cabos detalhados e checklists... (2/2)')
      const d2=await askJSON(
`Projetista RARO Home. Responda APENAS JSON válido (sem markdown). ${conv}\n\n${ctx}\n\n{
 "rack_cable_table":[{"porta_patch":"P01","device_origem":"Dream Machine SE","porta_origem":"LAN 1","destino":"AP Sala de Estar","device_nome":"ap-sala","tipo":"CAT6 PoE","metros":"12","etiqueta":"AP-SALA","cor":"Azul"},{"porta_patch":"P02","device_origem":"Dream Machine SE","porta_origem":"UPLINK","destino":"Switch PoE+ porta 1 (uplink)","device_nome":"switch-poe","tipo":"CAT6","metros":"0.5","etiqueta":"UPLINK","cor":"Cinza"}],
 ""cabos_rede":[{"id":"CAT-01","origem":"DM SE porta 1","destino":"AP #1 Sala","tipo":"CAT6 U/UTP","bitola":"24AWG","metros":"12","cor_etiqueta":"Azul","porta_patch":"P01","etiqueta":"AP-SALA"}],
 "cabos_som":[{"id":"SOM-01","origem":"Amplificador rack saída 1","destino":"Caixa S1 Sala","tipo":"2×1,5mm²","metros":"5","etiqueta":"SOM-S1"}],
 "cabos_eletricos_por_comodo":[{"comodo":"Sala","itens":[{"id":"ELT-01","equip":"Keypad K1 entrada","tipo":"fase+neutro+terra","fios":"3x2,5mm²","origem":"Quadro QDL disj.C1","destino":"caixa 4x4 parede, H=1,10m","metros":"8","obs":"NEUTRO obrigatório"},{"id":"ELT-02","equip":"Módulo Cortina M2","tipo":"fase+neutro","fios":"2x2,5mm²","origem":"Quadro QDL disj.C2","destino":"forro 2,55m","metros":"10","obs":""}]}],
 "alim_keypads":[{"id":"KEY-01","origem":"Quadro luz disj.K1","destino":"Keypad K1 entrada Sala","cota":"1,10m","comodo":"Sala","metros":"8","fios":"2x2,5mm² F+N"}],
 "resumo_cabos":[{"tipo":"CAT6 U/UTP interno","metros_total":"275"},{"tipo":"Cabo 2×1,5mm² som","metros_total":"62"},{"tipo":"Cabo elétrico 2,5mm² keypads","metros_total":"420"},{"tipo":"Cabo elétrico 2,5mm² módulos","metros_total":"80"}],
 "pecas":[{"item":"Keypad Zigbee 1 botão","qtd":"6"}],
 "checklist_obra":["1. Passar eletroduto 3/4\" em todas as paredes antes do revestimento","2. Deixar caixa 4×4 em CADA keypad com NEUTRO chegando (obrigatório)","3. Eletroduto seco 3/4\" do rack até forro para câmeras","4. Passe de cabo CAT6 do rack até cada AP no teto antes de fechar forro","5. Tomada 110V 20A dedicada + aterramento no nicho do rack","6. Prever vão adequado no móvel/armário para o rack (largura 19pol + ventilação)","7. Deixar fio-guia em todos os eletrodutos","8. Sangria no teto para cada caixa de som embutida","9. Ponto de força para cada módulo de cortina no forro","10. Identificar todos os circuitos no quadro","11. Caixa de passagem no teto para CAT6 (se necessário)","12. Marcar com fita todos os pontos antes de rebocar"],
 "checklist_raro":["1. Conferir neutro chegando em 100% das caixas de keypad","2. Testar continuidade de cada cabo CAT6 antes de terminar","3. Crimpar patch panel com etiquetas conforme tabela","4. Energizar Dream Machine SE e configurar Wi-Fi","5. Parear todos os keypads e módulos Zigbee","6. Configurar cenas e automações por ambiente","7. Testar cobertura Wi-Fi em todos os cômodos","8. Testar som por zona e ajustar volume","9. Configurar monitoramento de câmeras","10. Treinar cliente no app"],
 "riscos":["Neutro ausente nas caixas pode danificar keypads — conferir antes de instalar","Interferência Wi-Fi em 2.4GHz com vizinhos — configurar canais manualmente","Forro de gesso pode dificultar passagem de cabo após obra — confirmar antes do fechamento"]
}`, 5500)

      setExecProgress('Montando documento...')
      const data={...d1,...d2}
      const full=buildExecHtml(data)
      setExecDoc(full)
      setStep('exec')
      setExecProgress('')

      // AUTO-SAVE se veio de proposta
      if(fromProposal?.id){
        try{
          const { saveProposal } = await import('../db/supabase.js')
          const updated = { ...fromProposal, exec_doc:full, planta_data:{image:bgImage,markers} }
          await saveProposal(updated)
        }catch(e){ console.warn('Auto-save falhou:', e.message) }
      }
    }catch(err){ alert('Erro ao gerar projeto: '+err.message); setExecProgress('') }
    setLoading(false)
  }

  function buildExecHtml(d){
    const cliente=projectInfo.client||'Cliente'
    const hoje=new Date().toLocaleDateString('pt-BR')
    const T=(rows,cols)=>`<table class="ex-tbl"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`
    const esc=s=>(s==null?'':String(s))

    // Planta com marcadores
    let planta=''
    if(bgImage){
      const dots=markers.map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
        return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);width:20px;height:20px;border-radius:50%;background:${st.c};color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff">${m.n}</div>`}).join('')
      planta=`<div class="ex-sec"><h2>Planta de Pontos</h2><div style="position:relative;display:inline-block;max-width:100%"><img src="${bgImage}" style="max-width:100%;display:block;border:1px solid #ddd;border-radius:6px"/>${dots}</div></div>`
    }

    const sec=(title,inner)=>inner?`<div class="ex-sec"><h2>${title}</h2>${inner}</div>`:''
    const list=arr=>arr&&arr.length?`<ul class="ex-ul">${arr.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''

    // Tópico 3 — Rack com visual REALISTA (equipamentos vistos de frente)
    const rackCfg = d.rack_config || {}
    const rackItems = d.rack_items || d.rack || []
    const aps = rackCfg.aps||0, cams = rackCfg.cameras||0
    const totalPoe = aps+cams
    const precisaSwitch = rackCfg.precisa_switch || totalPoe > 6

    // Desenha a "face" de cada tipo de equipamento de forma realista
    const faceFor = (equip)=>{
      const e=(equip||'').toLowerCase()
      // helper: linha de portas RJ45/PoE
      const ports=(n,col='#1f2937')=>`<div style="display:flex;gap:2px;align-items:center">${Array.from({length:n}).map(()=>`<div style="width:7px;height:9px;background:${col};border:1px solid #475569;border-radius:1px"></div>`).join('')}</div>`
      const led=(c)=>`<div style="width:5px;height:5px;border-radius:50%;background:${c};box-shadow:0 0 3px ${c}"></div>`
      if(e.includes('dream machine')||e.includes('dm se')||e.includes('udm')||e.includes('gateway')||e.includes('roteador'))
        return `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 12px">
          <div style="display:flex;align-items:center;gap:8px"><div style="width:34px;height:18px;background:#0b1220;border:1px solid #2dd4bf;border-radius:3px;display:flex;align-items:center;justify-content:center;color:#2dd4bf;font-size:7px;font-family:monospace">LCD</div><span style="color:#94a3b8;font-size:8px;font-family:monospace">UniFi</span></div>
          <div style="display:flex;gap:8px;align-items:center">${ports(8,'#0f766e')}<div style="display:flex;gap:3px">${led('#22c55e')}${led('#22c55e')}${led('#3b82f6')}</div></div></div>`
      if(e.includes('switch'))
        return `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 12px">
          <span style="color:#94a3b8;font-size:8px;font-family:monospace">PoE+ 16</span>
          <div style="display:flex;gap:6px">${ports(8)}${ports(8)}</div><div style="display:flex;gap:3px">${led('#22c55e')}${led('#f59e0b')}</div></div>`
      if(e.includes('patch'))
        return `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 12px">
          <span style="color:#64748b;font-size:8px;font-family:monospace">PATCH 24</span>
          <div style="display:flex;gap:5px">${ports(12,'#334155')}${ports(12,'#334155')}</div></div>`
      if(e.includes('amplificad')||e.includes('receiver')||e.includes('áudio')||e.includes('audio')||e.includes('som'))
        return `<div style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 12px">
          <div style="display:flex;align-items:center;gap:8px"><div style="width:14px;height:14px;border-radius:50%;border:2px solid #64748b"></div><div style="width:14px;height:14px;border-radius:50%;border:2px solid #64748b"></div></div>
          <span style="color:#94a3b8;font-size:8px;font-family:monospace">AMP 8 ZONAS</span>
          <div style="display:flex;gap:3px">${led('#22c55e')}${led('#ef4444')}</div></div>`
      if(e.includes('régua')||e.includes('regua')||e.includes('energia')||e.includes('tomada')||e.includes('pdu'))
        return `<div style="flex:1;display:flex;align-items:center;gap:6px;padding:0 12px;justify-content:center">${Array.from({length:8}).map(()=>`<div style="width:11px;height:11px;background:#1f2937;border:1px solid #475569;border-radius:2px;position:relative"><div style="position:absolute;top:3px;left:3px;width:5px;height:1.5px;background:#64748b"></div></div>`).join('')}<div style="margin-left:6px">${led('#ef4444')}</div></div>`
      if(e.includes('organizador')||e.includes('passa'))
        return `<div style="flex:1;display:flex;align-items:center;gap:10px;padding:0 14px;justify-content:center">${Array.from({length:5}).map(()=>`<div style="width:10px;height:14px;border:2px solid #475569;border-radius:0 0 6px 6px;border-top:none"></div>`).join('')}</div>`
      // genérico
      return `<div style="flex:1;display:flex;align-items:center;justify-content:flex-end;padding:0 12px;gap:4px">${led('#22c55e')}${led('#3b82f6')}</div>`
    }
    const uHeight = (u)=>{ const m=(''+(u||'')).match(/U(\d+)\s*[-–]\s*U(\d+)/i); if(m) return (parseInt(m[2])-parseInt(m[1])+1); return 1 }

    const rackVisual = `
<div style="margin:14px 0 22px;max-width:520px">
  <div style="background:#0D1420;color:#38BDF8;font-size:11px;font-weight:700;padding:8px 14px;letter-spacing:1px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
    <span>RACK 12U — CPD (vista frontal)</span>
    <span style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:400">${totalPoe} disp. PoE · ${precisaSwitch?'+ Switch':'DM SE'}</span>
  </div>
  <div style="background:linear-gradient(180deg,#1e293b,#0f172a);padding:10px;border:3px solid #334155;border-top:none;border-radius:0 0 8px 8px;box-shadow:inset 0 2px 12px rgba(0,0,0,0.6)">
    ${rackItems.map((r,i)=>{const h=uHeight(r.u); return `
    <div style="display:flex;align-items:stretch;margin-bottom:5px;height:${22*h}px">
      <div style="width:20px;background:#0b1220;color:#475569;font-size:7px;font-family:monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:2px 0 0 2px;flex-shrink:0;letter-spacing:-1px">${esc((''+(r.u||'')).replace(/[^\dU\-–]/g,''))}</div>
      <div style="flex:1;background:linear-gradient(180deg,#27272a,#18181b);border:1px solid #3f3f46;border-left:none;border-radius:0 3px 3px 0;display:flex;align-items:center;position:relative;overflow:hidden">
        <div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#52525b,#27272a)"></div>
        <div style="position:absolute;left:6px;top:50%;transform:translateY(-50%);font-size:8.5px;font-weight:700;color:#e4e4e7;font-family:'DM Sans',sans-serif;text-shadow:0 1px 1px #000;max-width:38%;line-height:1.1;z-index:2">${esc(r.equip)}</div>
        <div style="position:absolute;right:0;top:0;bottom:0;left:42%;display:flex;align-items:center">${faceFor(r.equip)}</div>
        <div style="position:absolute;right:4px;top:3px;width:3px;height:3px;border-radius:50%;background:#52525b"></div>
        <div style="position:absolute;right:4px;bottom:3px;width:3px;height:3px;border-radius:50%;background:#52525b"></div>
        <div style="position:absolute;left:4px;top:3px;width:3px;height:3px;border-radius:50%;background:#52525b"></div>
        <div style="position:absolute;left:4px;bottom:3px;width:3px;height:3px;border-radius:50%;background:#52525b"></div>
      </div>
    </div>`}).join('')}
  </div>
  <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;padding:0 4px">
    <span style="font-size:10px;color:#374151"><b style="color:#16A34A">●</b> APs: <b>${aps}</b></span>
    <span style="font-size:10px;color:#374151"><b style="color:#DC2626">●</b> Câmeras: <b>${cams}</b></span>
    <span style="font-size:10px;color:#374151"><b style="color:#0EA5E9">●</b> PoE: <b>${totalPoe}/${rackCfg.dream_machine_portas||8}</b></span>
    ${precisaSwitch?`<span style="font-size:10px;color:#92400E;background:#FEF3C7;padding:2px 8px;border-radius:4px">⚠ Switch PoE+ ${rackCfg.switch_portas||16}p</span>`:`<span style="font-size:10px;color:#065F46;background:#D1FAE5;padding:2px 8px;border-radius:4px">✓ Dream Machine SE suficiente</span>`}
  </div>
</div>`

    // Tópico 4 — Módulos e caixas de teto por cômodo (formato tabela, igual ao resto)
    const modulosTeto = d.modulos_teto || []
    const modulosTetoHtml = modulosTeto.length
      ? modulosTeto.map(mt=>`<h3 class="ex-amb">${esc(mt.ambiente)}</h3>${T((mt.itens||[]).map(it=>`<tr><td>${esc(it)}</td></tr>`).join(''),['Itens de teto / forro'])}`).join('')
      : (d.modulos||[]).length ? T(d.modulos.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.funcao)}</td><td>${esc(r.ambiente)}</td><td>${esc(r.carga)}</td><td>${esc(r.posicao)}</td></tr>`).join(''),['ID','Função','Ambiente','Carga','Posição']) : ''

    // Tabela de portas/cabos do rack (item 3: ports, device names, uplinks, labels)
    const rackCableTableHtml = (d.rack_cable_table||[]).length
      ? T(d.rack_cable_table.map((r,i)=>`<tr><td><b style="font-family:monospace;background:#0D1420;color:#38BDF8;padding:2px 6px;border-radius:3px">${esc(r.porta_patch||'P'+(i+1))}</b></td><td>${esc(r.device_origem)}</td><td style="font-family:monospace;font-size:10px;color:#0369A1">${esc(r.porta_origem)}</td><td>${esc(r.destino)}</td><td style="font-family:monospace;font-size:10px;color:#059669">${esc(r.device_nome||'-')}</td><td>${esc(r.tipo)}</td><td>${esc(r.metros)}m</td><td style="font-family:monospace;font-weight:700;color:#0D1420;font-size:10px;background:#FFF7ED;padding:2px 6px;border-radius:3px">${esc(r.etiqueta)}</td><td><span style="background:${r.cor==='Azul'?'#0EA5E9':r.cor==='Cinza'?'#6B7280':r.cor==='Verde'?'#16A34A':r.cor==='Amarelo'?'#D97706':r.cor==='Vermelho'?'#DC2626':'#374151'};color:#fff;padding:1px 6px;border-radius:8px;font-size:9px">${esc(r.cor||'-')}</span></td></tr>`).join(''),['Porta PP','Device Origem','Porta Origem','Destino','Nome no Sistema','Tipo','m','Etiqueta','Cor'])
      : ''

    // Tópico 5 — Pontos de parede
    const pontosHtml=(d.pontos||[]).map(a=>`<h3 class="ex-amb">${esc(a.ambiente)}</h3>${T((a.linhas||[]).map(l=>`<tr><td><b>${esc(l.ponto)}</b></td><td>${esc(l.equip)}</td><td>${esc(l.parede)}</td><td>${esc(l.dist)}</td><td>${esc(l.alt)}</td><td>${esc(l.caixa)}</td><td>${esc(l.cabo)}</td></tr>`).join(''),['Ponto','Equip.','Parede ref.','Dist.','Alt.','Caixa','Cabo'])}`).join('')

    // Tópico 6 — Cabos de rede com patch panel e etiquetas
    const cabosRedeHtml = (d.cabos_rede||[]).length
      ? T(d.cabos_rede.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.bitola)}</td><td>${esc(r.metros)}m</td><td><span style="background:${r.cor_etiqueta==='Azul'?'#0EA5E9':r.cor_etiqueta==='Amarelo'?'#D97706':r.cor_etiqueta==='Verde'?'#16A34A':r.cor_etiqueta==='Vermelho'?'#DC2626':'#374151'};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${esc(r.cor_etiqueta||'Azul')}</span></td><td style="font-family:monospace;font-size:10px;background:#F0F9FF;color:#0369A1"><b>${esc(r.porta_patch||'-')}</b></td><td style="font-family:monospace;font-size:10px;font-weight:700;color:#0D1420">${esc(r.etiqueta||'-')}</td></tr>`).join(''),['ID','Origem','Destino','Tipo','Bitola','Metros','Cor Cabo','Porta PP','Etiqueta'])
      : ''

    // Tópico 8 — Cabos elétricos detalhados por cômodo
    const cabosEletHtml = (d.cabos_eletricos_por_comodo||[]).length
      ? d.cabos_eletricos_por_comodo.map(comodo=>`
<h3 class="ex-amb">${esc(comodo.comodo)}</h3>
${T((comodo.itens||[]).map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.equip)}</td><td>${esc(r.tipo)}</td><td style="font-family:monospace;font-size:10px">${esc(r.fios)}</td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.metros)}m</td><td style="color:#6B7280;font-size:10px">${esc(r.obs)}</td></tr>`).join(''),['ID','Equipamento','Tipo','Fios/Bitola','Origem','Destino','m','Obs'])}`).join('')
      : (d.cabos_eletricos||[]).length
        ? T(d.cabos_eletricos.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.bitola)}</td><td>${esc(r.metros)}m</td></tr>`).join(''),['ID','Origem','Destino','Tipo de cabo','Bitola','Metros'])
        : ''

    // Tópico 10 — Módulos e cargas
    const modulosCargas = (d.modulos||[]).length
      ? T(d.modulos.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.funcao)}</td><td>${esc(r.carga)}</td><td>${esc(r.ambiente)}</td></tr>`).join(''),['ID','Função','Carga','Ambiente'])
      : ''

    // Tópico 11 — Banheiros e sensores
    const banhHtml = (d.banheiros_sensores||[]).length
      ? T(d.banheiros_sensores.map(r=>`<tr><td><b>${esc(r.ambiente)}</b></td><td>${esc(r.ponto)}</td><td>${esc(r.obs)}</td></tr>`).join(''),['Ambiente','Ponto','Observação'])
      : ''

    // Tópico 19 — Itens por cômodo
    const byRoom={}; const geral={}
    markers.forEach(m=>{
      const r=m.room||'Geral'; const key=m.name||m.code||'Item'
      const inCat=catalog.some(c=>c.code===m.code || c.name===m.name)
      if(!byRoom[r]) byRoom[r]={}
      if(!byRoom[r][key]) byRoom[r][key]={qty:0,cat:inCat}
      byRoom[r][key].qty++
      if(!geral[key]) geral[key]={qty:0,cat:inCat}
      geral[key].qty++
    })
    // Categorias para item 7
    const CATS_MAP = {
      'Rede':    n=> /access point|ap |wi-fi|wifi|keystone|switch|patch|roteador|router/i.test(n),
      'Som':     n=> /caixa|amplif|subwoofer|receiver|áudio|audio|som/i.test(n),
      'Segurança': n=> /câmera|camera|dome|bullet|sensor mmwave|mmwave|sensor prese/i.test(n),
      'Automação': n=> /keypad|hub ir|módulo|modulo|cortina|dimmer|tomada|interruptor|gateway|zigbee/i.test(n),
    }
    const getCateg = nm=>{for(const[c,fn]of Object.entries(CATS_MAP))if(fn(nm))return c; return 'Outros'}

    let itensComodoHtml=''
    Object.entries(byRoom).forEach(([room,items])=>{
      const total=Object.values(items).reduce((s,i)=>s+i.qty,0)
      // Group by category
      const byCateg={}
      Object.entries(items).forEach(([nm,i])=>{const c=getCateg(nm); if(!byCateg[c])byCateg[c]=[]; byCateg[c].push({nm,i})})
      const catColors={'Rede':'#0EA5E9','Som':'#BE185D','Segurança':'#DC2626','Automação':'#059669','Outros':'#6B7280'}
      const catHtml=Object.entries(byCateg).map(([cat,rows])=>`
        <div style="margin-bottom:8px">
          <div style="font-size:10px;font-weight:700;color:${catColors[cat]||'#374151'};text-transform:uppercase;letter-spacing:0.5px;padding:3px 0;border-bottom:1px solid ${catColors[cat]||'#374151'}22;margin-bottom:3px">${cat}</div>
          ${T(rows.map(({nm,i})=>`<tr><td>${esc(nm)}</td><td><b>${i.qty}</b></td></tr>`).join(''),['Item','Qtd'])}
        </div>`).join('')
      itensComodoHtml+=`<h3 class="ex-amb">${esc(room)} — ${total} item(ns)</h3><div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;margin-bottom:12px">${catHtml}</div>`
    })
    const totalGeralHtml=Object.keys(geral).length?T(
      Object.entries(geral).sort((a,b)=>b[1].qty-a[1].qty).map(([nm,i])=>`<tr><td>${esc(nm)}</td><td style="color:${{'Rede':'#0EA5E9','Som':'#BE185D','Segurança':'#DC2626','Automação':'#059669','Outros':'#6B7280'}[getCateg(nm)]||'#374151'};font-size:10px;font-weight:600">${getCateg(nm)}</td><td><b>${i.qty}</b></td></tr>`).join('')
       +`<tr style="background:#060B1A"><td style="color:#fff;font-weight:700">TOTAL GERAL</td><td></td><td style="color:#fff;font-weight:700">${Object.values(geral).reduce((s,i)=>s+i.qty,0)}</td></tr>`,
      ['Item','Categoria','Qtd total'])
      :''

    // Tópico 20 — 4 gráficos + timeline
    const totalPontos=markers.length
    const roomCounts=Object.entries(byRoom).map(([r,items])=>({room:r,qty:Object.values(items).reduce((s,i)=>s+i.qty,0)})).sort((a,b)=>b.qty-a.qty)
    const maxRoom=Math.max(1,...roomCounts.map(r=>r.qty))
    const barColors=['#0EA5E9','#7C3AED','#16A34A','#D97706','#DC2626','#0891B2','#DB2777','#65A30D']

    // Gráfico 1 — Barras por ambiente
    const grafico1=`<div style="margin:8px 0 24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
      <div style="font-size:12px;font-weight:700;margin-bottom:12px;color:#0D1420">📊 Distribuição de Pontos por Ambiente (${totalPontos} total)</div>
      ${roomCounts.map((r,i)=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
        <div style="width:130px;font-size:11px;text-align:right;color:#456;flex-shrink:0">${esc(r.room)}</div>
        <div style="flex:1;background:#eef2f7;border-radius:4px;height:22px;position:relative">
          <div style="width:${Math.round(r.qty/maxRoom*100)}%;background:${barColors[i%barColors.length]};height:100%;border-radius:4px;min-width:24px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px;color:#fff;font-size:10px;font-weight:700">${r.qty}</div>
        </div></div>`).join('')}
    </div>`

    // Gráfico 2 — Pizza de tipos de equipamento
    const tiposCounts={}
    markers.forEach(m=>{const t=equipType(m.name); tiposCounts[t]=(tiposCounts[t]||0)+1})
    const tiposEntries=Object.entries(tiposCounts).sort((a,b)=>b[1]-a[1])
    const tiposColors={'Gateway':'#0EA5E9','NVR':'#7C3AED','Câmera':'#DC2626','Keypad':'#059669','Hub IR':'#D97706','Módulo':'#6366F1','Som':'#BE185D','Wi-Fi':'#0E7490','Sensor':'#16A34A','Tomada':'#475569','Outro':'#374151'}
    const grafico2=`<div style="margin:8px 0 24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
      <div style="font-size:12px;font-weight:700;margin-bottom:12px;color:#0D1420">🔌 Tipos de Equipamento</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${tiposEntries.map(([tipo,qty])=>`<div style="display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:8px 14px;min-width:140px">
          <div style="width:32px;height:32px;border-radius:50%;background:${tiposColors[tipo]||'#374151'};color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center">${qty}</div>
          <span style="font-size:12px;color:#374151;font-weight:500">${tipo}</span>
        </div>`).join('')}
      </div>
    </div>`

    // Gráfico 3 — Distribuição de cabeamento
    const resumoCabos = d.resumo_cabos || []
    const maxMetros = Math.max(1,...resumoCabos.map(r=>parseInt(r.metros_total)||0))
    const cabosColors=['#0EA5E9','#16A34A','#D97706','#DC2626','#7C3AED','#0E7490']
    const grafico3 = resumoCabos.length ? `<div style="margin:8px 0 24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
      <div style="font-size:12px;font-weight:700;margin-bottom:12px;color:#0D1420">📏 Metragem de Cabeamento por Tipo</div>
      ${resumoCabos.map((r,i)=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:7px">
        <div style="width:160px;font-size:10px;text-align:right;color:#456;flex-shrink:0">${esc(r.tipo)}</div>
        <div style="flex:1;background:#eef2f7;border-radius:4px;height:22px">
          <div style="width:${Math.round((parseInt(r.metros_total)||0)/maxMetros*100)}%;background:${cabosColors[i%cabosColors.length]};height:100%;border-radius:4px;min-width:30px;display:flex;align-items:center;justify-content:flex-end;padding-right:8px;color:#fff;font-size:10px;font-weight:700">${r.metros_total}m</div>
        </div></div>`).join('')}
    </div>` : ''

    // Gráfico 4 — Checklist de progresso visual
    const fases=['Infraestrutura / Eletroduto','Passagem de cabos','Instalação de equipamentos','Configuração e cenas','Testes e entrega']
    const fasesDesc=['Eletrodutos, caixas 4×4, tomadas dedicadas, nichos','CAT6, elétrico keypads, som, cabos câmeras/APs','Rack, equipamentos, keypads, câmeras, sensores','Gateway, parear dispositivos, cenas, app','Wi-Fi, som, câmeras, validação, treinamento']
    const faseDuration=['2 sem','1 sem','2 sem','1 sem','3 dias']
    const grafico4=`<div style="margin:8px 0 24px;padding:16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
      <div style="font-size:12px;font-weight:700;margin-bottom:14px;color:#0D1420">📅 Fases do Projeto</div>
      <div style="position:relative">
        ${fases.map((f,i)=>`<div style="display:flex;gap:14px;margin-bottom:0">
          <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
            <div style="width:32px;height:32px;border-radius:50%;background:${barColors[i%barColors.length]};color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center">${i+1}</div>
            ${i<fases.length-1?'<div style="width:2px;flex:1;background:#dde6f0;min-height:28px"></div>':''}
          </div>
          <div style="padding-bottom:22px;padding-top:4px;flex:1">
            <div style="font-size:12px;font-weight:700;color:#0D1420">${f}</div>
            <div style="font-size:10px;color:#64748b;margin-top:2px">${fasesDesc[i]}</div>
            <div style="display:inline-block;background:${barColors[i%barColors.length]}22;color:${barColors[i%barColors.length]};font-size:10px;font-weight:600;padding:1px 8px;border-radius:8px;margin-top:4px">${faseDuration[i]}</div>
          </div></div>`).join('')}
      </div>
    </div>`

    return `<style>${EXEC_CSS}</style>
<div class="ex-doc">
  <!-- CAPA -->
  <div class="ex-cover">
    <div class="ex-cover-top">DOCUMENTO TÉCNICO · PROJETO EXECUTIVO</div>
    <img src="${LOGO_EXEC}" alt="RARO HOME" style="width:160px;max-width:50%;margin:0 auto 8px;display:block"/>
    <div class="ex-cover-tag">CASA · TECNOLOGIA · LAZER</div>
    <div class="ex-cover-title">Projeto Executivo de Automação</div>
    <div class="ex-cover-sub">Posições exatas · Cabeamento · Pré-instalação<br>Guia técnico para obra e arquiteto</div>
    <div class="ex-cover-client"><div class="ex-cc-name">${esc(cliente)}</div><div class="ex-cc-meta">${hoje} · RARO Home</div></div>
    <div class="ex-cover-foot">RARO Home · contato@rarohome.com.br · (21) 98170-9009</div>
  </div>

  ${planta}
  ${(()=>{ let _n=0
    const secN=(title,inner)=> inner ? `<div class="ex-sec"><h2>${++_n}. ${title}</h2>${inner}</div>` : ''
    const fotosTxt=`
<p class="ex-p">O mestre de obra deve fotografar cada ponto pelo número antes de fechar a parede, registrando no app RARO Home. Assim cada foto fica atrelada ao ponto correspondente.</p>
<div style="display:flex;gap:16px;margin:20px 0;flex-wrap:wrap">

  <!-- Card 1: Foto da caixa elétrica com número -->
  <div style="flex:1;min-width:180px;max-width:220px;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1E293B;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:50%;background:#0EA5E9;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">K1</div>
      <span style="color:#94A3B8;font-size:10px;font-family:'DM Sans',sans-serif">Keypad Entrada</span>
    </div>
    <div style="background:#E2E8F0;height:110px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
      <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" width="160" height="110">
        <rect width="160" height="110" fill="#D1D5DB"/>
        <!-- parede com caixa 4x4 -->
        <rect x="55" y="25" width="50" height="60" rx="3" fill="#9CA3AF"/>
        <rect x="60" y="30" width="40" height="50" rx="2" fill="#6B7280" stroke="#4B5563" stroke-width="1"/>
        <!-- fios saindo -->
        <line x1="80" y1="80" x2="80" y2="100" stroke="#FBBF24" stroke-width="2"/>
        <line x1="85" y1="80" x2="85" y2="100" stroke="#1D4ED8" stroke-width="2"/>
        <!-- etiqueta K1 -->
        <rect x="62" y="40" width="36" height="18" rx="2" fill="#0EA5E9"/>
        <text x="80" y="53" font-size="12" fill="#fff" text-anchor="middle" font-weight="800" font-family="monospace">K1</text>
        <!-- câmera foto -->
        <circle cx="140" cy="15" r="8" fill="#1F2937" opacity="0.85"/>
        <circle cx="140" cy="15" r="4" fill="#374151"/>
        <circle cx="140" cy="15" r="2" fill="#60A5FA"/>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9px;font-weight:700;color:#0F172A;font-family:'DM Sans',sans-serif">Caixa 4×4 antes de fechar</div>
      <div style="font-size:8px;color:#64748B;margin-top:2px;font-family:'DM Sans',sans-serif">Neutro + fase identificados · H=1,10m</div>
    </div>
  </div>

  <!-- Card 2: Planta com pin marcado -->
  <div style="flex:1;min-width:180px;max-width:220px;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1E293B;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:50%;background:#059669;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">AP</div>
      <span style="color:#94A3B8;font-size:10px;font-family:'DM Sans',sans-serif">Access Point Sala</span>
    </div>
    <div style="background:#E2E8F0;height:110px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <svg viewBox="0 0 160 110" xmlns="http://www.w3.org/2000/svg" width="160" height="110">
        <rect width="160" height="110" fill="#F1F5F9"/>
        <!-- planta simplificada -->
        <rect x="10" y="10" width="140" height="90" rx="2" fill="none" stroke="#94A3B8" stroke-width="1.5"/>
        <line x1="80" y1="10" x2="80" y2="100" stroke="#94A3B8" stroke-width="1" stroke-dasharray="3,3"/>
        <line x1="10" y1="55" x2="150" y2="55" stroke="#94A3B8" stroke-width="1" stroke-dasharray="3,3"/>
        <!-- porta -->
        <line x1="10" y1="55" x2="10" y2="75" stroke="#475569" stroke-width="2"/>
        <!-- pin AP -->
        <circle cx="80" cy="32" r="10" fill="#059669" stroke="#fff" stroke-width="2"/>
        <text x="80" y="36" font-size="9" fill="#fff" text-anchor="middle" font-weight="800" font-family="monospace">AP</text>
        <line x1="80" y1="42" x2="80" y2="50" stroke="#059669" stroke-width="1.5" stroke-dasharray="2,2"/>
        <!-- sinal wifi -->
        <path d="M74 25 Q80 19 86 25" fill="none" stroke="#A7F3D0" stroke-width="1.5"/>
        <path d="M71 22 Q80 14 89 22" fill="none" stroke="#6EE7B7" stroke-width="1"/>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9px;font-weight:700;color:#0F172A;font-family:'DM Sans',sans-serif">Posição exata na planta</div>
      <div style="font-size:8px;color:#64748B;margin-top:2px;font-family:'DM Sans',sans-serif">Teto centro sala · CAT6 confirmado</div>
    </div>
  </div>

  <!-- Card 3: Relatório diário resumido -->
  <div style="flex:1;min-width:180px;max-width:220px;border:1px solid #CBD5E1;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08)">
    <div style="background:#1E293B;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#7C3AED;color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">📋</div>
      <span style="color:#94A3B8;font-size:10px;font-family:'DM Sans',sans-serif">Relatório do Dia</span>
    </div>
    <div style="background:#F8FAFC;padding:10px;height:110px;overflow:hidden">
      <div style="font-size:8px;color:#475569;font-family:'DM Sans',sans-serif;line-height:1.7">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #E2E8F0;padding-bottom:3px;margin-bottom:3px">
          <b style="color:#0F172A">Data:</b> <span>14/06/2026</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px">
          <span style="color:#16A34A;font-size:9px">✓</span><span>K1 — Keypad entrada (foto OK)</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px">
          <span style="color:#16A34A;font-size:9px">✓</span><span>AP1 — Teto sala (foto OK)</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:2px">
          <span style="color:#D97706;font-size:9px">⏳</span><span>CAM1 — Aguardando eletroduto</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <span style="color:#DC2626;font-size:9px">⚠</span><span>K3 — Neutro ausente (verificar)</span>
        </div>
      </div>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC;border-top:1px solid #E2E8F0">
      <div style="font-size:9px;font-weight:700;color:#0F172A;font-family:'DM Sans',sans-serif">Acompanhamento em tempo real</div>
      <div style="font-size:8px;color:#64748B;margin-top:2px;font-family:'DM Sans',sans-serif">Pendências sinalizadas · app RARO Home</div>
    </div>
  </div>

</div>
<p class="ex-p" style="font-size:10px;color:#64748B;font-style:italic">Cada foto é vinculada ao ponto pelo número (ex: K1, AP1, CAM2). O relatório diário mostra o status de cada ponto — concluído ✓, pendente ⏳ ou com problema ⚠.</p>
`
    return [
    secN(`Premissas Confirmadas`, list(d.premissas)),
    secN(`Detalhe do RACK / CPD`, (d.rack_detalhe||rackItems.length)?(list(d.rack_detalhe)+rackVisual+(rackCableTableHtml?`<h3 class="ex-amb" style="margin-top:20px">Tabela de Portas e Cabos do Rack</h3>${rackCableTableHtml}`:'')):''),
    secN(`Módulos e Caixas de Teto — por Cômodo`, modulosTetoHtml),
    secN(`Keypads, Câmeras e Pontos de Parede`, pontosHtml),
    secN(`Cabos de Rede — Patch Panel e Etiquetas`, cabosRedeHtml),
    secN(`Cabos de Som — Amplificador no RACK`, (d.cabos_som||[]).length?T(d.cabos_som.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.metros)}m</td><td style="font-family:monospace;font-size:10px">${esc(r.etiqueta||'-')}</td></tr>`).join(''),['ID','Origem','Destino','Tipo','Metros','Etiqueta']):''),
    secN(`Cabos Elétricos — por Cômodo`, cabosEletHtml),
    secN(`Alimentação dos Keypads (Fase + Neutro)`, (d.alim_keypads||[]).length?T(d.alim_keypads.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.cota)}</td><td>${esc(r.comodo)}</td><td>${esc(r.metros)}m</td><td style="font-size:10px;color:#6B7280">${esc(r.fios||'2x2,5mm²')}</td></tr>`).join(''),['ID','Origem','Destino (Keypad)','Cota/Altura','Cômodo','m','Fios']):''),
    secN(`Módulos e Cargas (iluminação + cortinas)`, modulosCargas),
    secN(`Banheiros, Circulação e Sensores`, banhHtml),
    secN(`Resumo Geral de Cabeamento`, (d.resumo_cabos||[]).length?T(d.resumo_cabos.map(r=>`<tr><td><b>${esc(r.tipo)}</b></td><td>${esc(r.metros_total)}m</td></tr>`).join(''),['Tipo de cabo','Metragem total']):''),
    secN(`Lista Completa de Peças`, (d.pecas||[]).length?T(d.pecas.map(r=>`<tr><td>${esc(r.item)}</td><td>${esc(r.qtd)}</td></tr>`).join(''),['Item','Qtd']):''),
    secN(`Checklist de Obra — para o Arquiteto / Eletricista`, list(d.checklist_obra)),
    secN(`Checklist de Instalação — Equipe RARO Home`, list(d.checklist_raro)),
    secN(`Pontos de Atenção e Riscos`, list(d.riscos)),
    secN(`Fotos no Diário de Obra`, fotosTxt),
    secN(`Itens por Cômodo e Total Geral`, itensComodoHtml ? (itensComodoHtml + '<h3 class="ex-amb">Total geral consolidado</h3>' + totalGeralHtml) : ''),
    secN(`Gráficos e Linha do Tempo do Projeto`, (grafico1 + grafico2 + grafico3 + grafico4)),
  ].join('\n') })()}
</div>`
  }

  async function exportPdf(){
    const w=window.open('','_blank')
    const cliNome=(projectInfo.client||fromProposal?.client_name||'Cliente').replace(/[\\/:*?"<>|]/g,'')
    const codigo=(fromProposal?.code||'').replace(/[\\/:*?"<>|]/g,'')
    const tituloPdf=`Projeto Executivo RARO Home — ${cliNome}${codigo?' — '+codigo:''}`
    w.document.write(`<html><head><title>${tituloPdf}</title><meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>body{margin:0}${EXEC_CSS}</style></head><body>
      ${execDoc}
      </body></html>`)
    w.document.close(); setTimeout(()=>w.print(),700)
  }

  async function exportPdfAndSave(){
    await saveToProposal()
    setTimeout(()=>exportPdf(), 200)
  }

  async function saveToProposal(docOverride){
    const docToSave = typeof docOverride==='string' ? docOverride : execDoc
    const roomMap={}
    markers.forEach(m=>{ const r=m.room||'Geral'; if(!roomMap[r])roomMap[r]=[]; roomMap[r].push(m) })
    const floors=[{name:'Pavimento único', rooms:Object.entries(roomMap).map(([name,items])=>({
      name, items:items.map(m=>({name:m.name,code:m.code,qty:'1',cost_price:m.cost,sale_price:m.sale,category:m.category})),
      price:String(items.reduce((s,m)=>s+(m.sale||0),0))
    }))}]

    if(fromProposal?.id){
      try{
        const { saveProposal } = await import('../db/supabase.js')
        const updated = { ...fromProposal, exec_doc:docToSave, planta_data:{image:bgImage,markers} }
        await saveProposal(updated)
        alert('✅ Projeto Executivo salvo no orçamento!')
        onClose && onClose()
        return
      }catch(e){ alert('Erro ao salvar: '+e.message); return }
    }
    if(onSaveToProposal) onSaveToProposal({ floors, planta_data:{image:bgImage,markers}, client_name:projectInfo.client||selClient, exec_doc:docToSave })
  }

  const catGroups={}
  Object.keys(TAXONOMY).forEach(cat=>{catGroups[cat]=[]})
  ;(catalog||[]).forEach(c=>{const g=c.category||inferCategory(c.name).cat||'Automação';(catGroups[g]=catGroups[g]||[]).push(c)})

  return (
    <div style={{position:'fixed',inset:0,background:'#0f172a',zIndex:1000,display:'flex',flexDirection:'column'}}>
      {loading && (
        <div style={{position:'fixed',inset:0,background:'rgba(6,11,26,0.82)',zIndex:2000,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:18,padding:24}}>
          <div style={{width:54,height:54,border:'4px solid rgba(124,58,237,0.25)',borderTopColor:'#A78BFA',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
          <div style={{color:'#fff',fontSize:15,fontWeight:600,textAlign:'center'}}>{execProgress||'Processando com IA...'}</div>
          <div style={{width:'min(300px,80vw)',height:6,background:'rgba(255,255,255,0.12)',borderRadius:3,overflow:'hidden'}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,#7C3AED,#38BDF8)',borderRadius:3,animation:'progslide 1.4s ease-in-out infinite',width:'40%'}}/>
          </div>
          <div style={{color:'rgba(255,255,255,0.4)',fontSize:11,textAlign:'center',maxWidth:280}}>Isso pode levar alguns segundos. Não feche a tela.</div>
        </div>
      )}
      {/* Toolbar */}
      <div style={{background:'#060B1A',padding:'10px 16px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <button onClick={onClose} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Sair</button>
        <div style={{color:'#38BDF8',fontWeight:600,fontSize:14}}>
          <i className="ti ti-brain" style={{marginRight:6}} aria-hidden/>Projeto Executivo com IA
        </div>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:6,fontSize:11,color:'rgba(255,255,255,0.5)'}}>
          {['upload','rooms','chat','editor','exec'].map((s,i)=>(
            <span key={s} style={{padding:'3px 10px',borderRadius:12,background:step===s?'#0EA5E9':'rgba(255,255,255,0.08)',color:step===s?'#fff':'rgba(255,255,255,0.4)',cursor:['chat','editor','exec'].includes(s)&&['chat','editor','exec'].includes(step)?'pointer':'default'}} onClick={()=>{ if(s==='rooms'&&['chat','editor','exec'].includes(step)) setStep('rooms') }}>
              {i+1}. {s==='upload'?'Planta':s==='rooms'?'Cômodos':s==='chat'?'Perguntas':s==='editor'?'Editor':'Projeto'}
            </span>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflow:'hidden',display:'flex'}}>
        {/* STEP UPLOAD */}
        {step==='upload' && (
          <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{textAlign:'center',color:'#fff',maxWidth:420}}>
              <i className="ti ti-upload" style={{fontSize:48,color:'#38BDF8',display:'block',marginBottom:16}} aria-hidden/>
              <div style={{fontSize:18,fontWeight:600,marginBottom:8}}>Carregue a planta do cliente</div>
              <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:20}}>JPG, PNG ou PDF</div>

              {preClient ? (
                <div style={{marginBottom:20,textAlign:'left',background:'rgba(14,165,233,0.1)',border:'1px solid rgba(14,165,233,0.3)',borderRadius:8,padding:'12px 14px'}}>
                  <div style={{fontSize:11,color:'#38BDF8',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Cliente</div>
                  <div style={{fontSize:15,color:'#fff',fontWeight:600}}>{preClient.name1}{preClient.name2?' & '+preClient.name2:''}</div>
                  {preClient.neighborhood && <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{preClient.neighborhood}</div>}
                </div>
              ) : (
              <div style={{marginBottom:20,textAlign:'left'}}>
                <label style={lbl}>Cliente</label>
                <input value={clientSearch} onChange={e=>{setClientSearch(e.target.value);setSelClient('')}}
                  placeholder="Digite o nome do cliente..." style={{...inputDark,marginBottom:6,fontSize:14,padding:'10px 12px'}}/>
                {clientSearch && !selClient && (
                  <div style={{maxHeight:180,overflowY:'auto',background:'rgba(255,255,255,0.06)',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)'}}>
                    {clients.filter(c=>{
                      const q=clientSearch.toLowerCase()
                      return (c.name1||'').toLowerCase().includes(q)||(c.name2||'').toLowerCase().includes(q)||(c.neighborhood||'').toLowerCase().includes(q)
                    }).slice(0,8).map(c=>(
                      <div key={c.id} onClick={()=>{
                          setSelClient(c.id)
                          setClientSearch(`${c.name1||''}${c.name2?' & '+c.name2:''}`)
                          setProjectInfo(p=>({...p,client:`${c.name1||''}${c.name2?' & '+c.name2:''}`}))
                        }}
                        style={{padding:'10px 12px',cursor:'pointer',color:'#fff',fontSize:13,borderBottom:'1px solid rgba(255,255,255,0.05)'}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(14,165,233,0.2)'}
                        onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        {c.name1}{c.name2?' & '+c.name2:''}{c.neighborhood?` · ${c.neighborhood}`:''}
                      </div>
                    ))}
                  </div>
                )}
                {selClient && <div style={{fontSize:12,color:'#38BDF8',marginTop:4}}><i className="ti ti-check" aria-hidden/> Cliente selecionado</div>}
              </div>
              )}

              {/* Planta do cliente disponível → mostra preview + pergunta */}
              {clientePlanta ? (
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:12,color:'#38BDF8',fontWeight:600,marginBottom:8,textTransform:'uppercase',letterSpacing:1}}>
                    <i className="ti ti-photo-check" style={{marginRight:6}} aria-hidden/>
                    {clientePlanta.label} encontrada no cadastro
                  </div>
                  <div style={{border:'2px solid #38BDF8',borderRadius:8,overflow:'hidden',marginBottom:12}}>
                    <img src={clientePlanta.url} style={{width:'100%',maxHeight:200,objectFit:'contain',display:'block',background:'#111'}} alt="planta do cliente"/>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={usarPlantaCliente} style={{...btnPrimary,flex:1,justifyContent:'center'}}>
                      <i className="ti ti-check" aria-hidden/> Usar essa planta
                    </button>
                    <button onClick={()=>fileRef.current?.click()} style={{...btnGhost,flex:1,justifyContent:'center'}}>
                      <i className="ti ti-upload" aria-hidden/> Escolher outra
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>fileRef.current?.click()} style={btnPrimary}>Selecionar planta e começar</button>
              )}
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleFile}/>
            </div>
          </div>
        )}

        {/* STEP ROOMS — planta + pins arrastáveis + lista editável */}
        {step==='rooms' && (
          <div style={{flex:1,display:'flex',minHeight:0}}>
            {/* Planta com pins arrastáveis */}
            <div ref={imgContainerRef} style={{flex:1,position:'relative',overflow:'hidden',background:'#111827',cursor:panning?'grabbing':'grab',userSelect:'none'}}
              onMouseDown={e=>{if(e.target===e.currentTarget||e.target.tagName==='IMG') onImgMouseDown(e)}}
              onMouseMove={onImgMouseMove} onMouseUp={onImgMouseUp} onMouseLeave={onImgMouseUp} onDoubleClick={onImgDblClick}>
              {bgImage && <img src={bgImage} draggable={false} alt="planta" id="rooms-planta-img"
                style={{position:'absolute',top:'50%',left:'50%',transform:`translate(calc(-50% + ${imgPan.x}px), calc(-50% + ${imgPan.y}px)) scale(${imgZoom})`,transformOrigin:'center center',maxWidth:'none',width:'90%',transition:panning?'none':'transform 0.1s ease',pointerEvents:'none'}}/>}
              {/* Pins numerados arrastáveis */}
              {rooms.map(r=>{
                // Calcula posição do pin usando a imagem real (não proporção hardcoded)
                const cont = imgContainerRef.current
                const rect = cont ? cont.getBoundingClientRect() : {width:800,height:600}
                // Usa a imagem DOM para pegar a proporção real
                const imgEl = cont ? cont.querySelector('#rooms-planta-img') : null
                const natRatio = (imgEl && imgEl.naturalWidth && imgEl.naturalHeight)
                  ? imgEl.naturalHeight / imgEl.naturalWidth
                  : 0.75
                const imgW = rect.width * 0.9 * imgZoom
                const imgH = imgW * natRatio
                const originX = rect.width/2 + imgPan.x
                const originY = rect.height/2 + imgPan.y
                const px = originX + (r.x/100 - 0.5)*imgW
                const py = originY + (r.y/100 - 0.5)*imgH
                return (
                  <div key={r.id} style={{position:'absolute',left:px,top:py,transform:'translate(-50%,-100%)',zIndex:10,cursor:'grab',userSelect:'none'}}
                    onMouseDown={e=>{
                      e.stopPropagation()
                      const startX=e.clientX, startY=e.clientY, ox=r.x, oy=r.y
                      const cont2=imgContainerRef.current; if(!cont2) return
                      const onMove=ev=>{
                        const rc2=cont2.getBoundingClientRect()
                        const imgEl2=cont2.querySelector('#rooms-planta-img')
                        const natR=(imgEl2&&imgEl2.naturalWidth&&imgEl2.naturalHeight)?imgEl2.naturalHeight/imgEl2.naturalWidth:0.75
                        const iW=rc2.width*0.9*imgZoom, iH=iW*natR
                        const dx=ev.clientX-startX, dy=ev.clientY-startY
                        const nx=ox+(dx/iW)*100, ny=oy+(dy/iH)*100
                        // sem clamp — o usuário move livremente, pode colocar no canto
                        setRooms(rs=>rs.map(x=>x.id===r.id?{...x,x:nx,y:ny}:x))
                      }
                      const onUp=()=>{ window.removeEventListener('mousemove',onMove); window.removeEventListener('mouseup',onUp) }
                      window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp)
                    }}>
                    {/* Pin: número + nome */}
                    <div style={{background:'#0EA5E9',color:'#fff',borderRadius:'50% 50% 50% 0',width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:12,border:'2px solid #fff',boxShadow:'0 2px 6px rgba(0,0,0,0.5)',transform:'rotate(-45deg)'}}>
                      <span style={{transform:'rotate(45deg)'}}>{r.id}</span>
                    </div>
                    <div style={{background:'rgba(0,0,0,0.75)',color:'#fff',fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:3,whiteSpace:'nowrap',marginTop:2,maxWidth:90,overflow:'hidden',textOverflow:'ellipsis',backdropFilter:'blur(4px)'}}>{r.name}</div>
                  </div>
                )
              })}
              {/* HUD */}
              <div style={{position:'absolute',bottom:10,left:10,right:10,display:'flex',justifyContent:'space-between',alignItems:'center',pointerEvents:'none'}}>
                <div style={{background:'rgba(0,0,0,0.65)',color:'#fff',fontSize:11,padding:'3px 8px',borderRadius:5}}>
                  🔍 {Math.round(imgZoom*100)}% · scroll=zoom · arrastar fundo=mover · arrastar pin=reposicionar
                </div>
                <div style={{display:'flex',gap:4,pointerEvents:'all'}}>
                  <button onClick={e=>{e.stopPropagation();setImgZoom(z=>Math.min(8,z*1.4))}} style={{background:'rgba(0,0,0,0.6)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,width:28,height:28,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  <button onClick={e=>{e.stopPropagation();setImgZoom(z=>Math.max(0.3,z/1.4))}} style={{background:'rgba(0,0,0,0.6)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,width:28,height:28,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                </div>
              </div>
              {loading && <div style={{position:'absolute',inset:0,background:'rgba(10,15,30,0.7)',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
                <i className="ti ti-loader-2" style={{fontSize:32,color:'#38BDF8',animation:'spin 1s linear infinite'}} aria-hidden/>
                <div style={{color:'#fff',fontSize:13}}>IA identificando os cômodos…</div>
              </div>}
            </div>
            {/* Painel direito: lista editável + botão confirmar */}
            <div style={{width:260,background:'#0f1729',borderLeft:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#38BDF8',textTransform:'uppercase',letterSpacing:1,marginBottom:2}}>
                  <i className="ti ti-map-pin" style={{marginRight:5}} aria-hidden/>Cômodos identificados
                </div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Edite os nomes, arraste os pins na planta, adicione ou remova.</div>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:'6px 0'}}>
                {rooms.map((r,idx)=>(
                  <div key={r.id} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 8px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                    {/* Número do pin */}
                    <div style={{width:22,height:22,borderRadius:'50% 50% 50% 0',background:'#0EA5E9',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0,transform:'rotate(-45deg)'}}>
                      <span style={{transform:'rotate(45deg)'}}>{r.id}</span>
                    </div>
                    {/* Nome editável */}
                    <div style={{flex:1,minWidth:0}}>
                      {editingRoom===r.id
                        ? <input autoFocus value={r.name} onChange={e=>setRooms(rs=>rs.map(x=>x.id===r.id?{...x,name:e.target.value}:x))}
                            onBlur={()=>setEditingRoom(null)} onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape')setEditingRoom(null)}}
                            style={{width:'100%',background:'rgba(255,255,255,0.1)',border:'1px solid #38BDF8',borderRadius:3,color:'#fff',fontSize:11,padding:'2px 5px',outline:'none'}}/>
                        : <div style={{fontSize:11,color:'#e2e8f0',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1.3}}
                            title={r.name}>{r.name}
                            {r.floor && <div style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>{r.floor}</div>}
                          </div>
                      }
                    </div>
                    {/* Botão editar */}
                    <button onClick={()=>setEditingRoom(editingRoom===r.id?null:r.id)} title="Editar nome"
                      style={{background:'none',border:'none',cursor:'pointer',padding:3,lineHeight:1,flexShrink:0,
                        color:editingRoom===r.id?'#38BDF8':'rgba(255,255,255,0.3)',borderRadius:3}}
                      onMouseEnter={e=>e.currentTarget.style.color='#38BDF8'}
                      onMouseLeave={e=>e.currentTarget.style.color=editingRoom===r.id?'#38BDF8':'rgba(255,255,255,0.3)'}>
                      <i className="ti ti-pencil" style={{fontSize:12}} aria-hidden/>
                    </button>
                    {/* Botão deletar — renumera sequencialmente após remover */}
                    <button onClick={()=>setRooms(rs=>{
                      const filtered = rs.filter(x=>x.id!==r.id)
                      // renumera: mantém x,y,name,floor mas reescreve id sequencialmente
                      return filtered.map((x,i)=>({...x, id:i+1}))
                    })} title="Remover cômodo"
                      style={{background:'none',border:'none',cursor:'pointer',padding:3,lineHeight:1,flexShrink:0,color:'rgba(255,255,255,0.25)',borderRadius:3}}
                      onMouseEnter={e=>e.currentTarget.style.color='#F87171'}
                      onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.25)'}>
                      <i className="ti ti-trash" style={{fontSize:12}} aria-hidden/>
                    </button>
                  </div>
                ))}
              </div>
              {/* Adicionar cômodo manualmente */}
              <div style={{padding:'8px 10px',borderTop:'1px solid rgba(255,255,255,0.08)',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <AddRoomInline onAdd={r=>setRooms(rs=>{const maxId=rs.reduce((m,x)=>Math.max(m,x.id||0),0); return [...rs,{...r,id:maxId+1,x:50,y:50}]})}/>
              </div>
              {/* Botão confirmar */}
              <div style={{padding:12}}>
                <button disabled={rooms.length===0||loading} onClick={()=>{ setStep('chat'); startChat(bgImage, rooms) }}
                  style={{...btnPrimary,width:'100%',justifyContent:'center',gap:8,opacity:rooms.length===0?0.4:1}}>
                  <i className="ti ti-message-2" aria-hidden/>
                  Confirmar e ir para as perguntas ({rooms.length} cômodo{rooms.length!==1?'s':''})
                </button>
                <button onClick={()=>startRooms(bgImage)} disabled={loading}
                  style={{...btnGhost,width:'100%',justifyContent:'center',marginTop:6,fontSize:11}}>
                  <i className="ti ti-refresh" aria-hidden/>Reanalisar planta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP CHAT */}
        {step==='chat' && (
          <div className="pe-chat-wrap" style={{flex:1,display:'flex',minHeight:0}}>
            {/* Painel da planta com zoom (scroll) + pan (arrastar) + reset (duplo clique) */}
            <div
              ref={imgContainerRef}
              className="pe-chat-img"
              style={{width:'48%',borderRight:'1px solid rgba(255,255,255,0.08)',overflow:'hidden',
                position:'relative',background:'#111827',cursor:panning?'grabbing':'grab',userSelect:'none'}}
              onMouseDown={onImgMouseDown}
              onMouseMove={onImgMouseMove}
              onMouseUp={onImgMouseUp}
              onMouseLeave={onImgMouseUp}
              onDoubleClick={onImgDblClick}
            >
              {bgImage && (
                <img
                  src={bgImage}
                  draggable={false}
                  style={{
                    position:'absolute', top:'50%', left:'50%',
                    transform:`translate(calc(-50% + ${imgPan.x}px), calc(-50% + ${imgPan.y}px)) scale(${imgZoom})`,
                    transformOrigin:'center center',
                    maxWidth:'none', width:'90%',
                    transition: panning ? 'none' : 'transform 0.1s ease',
                    pointerEvents:'none',
                  }}
                  alt="planta"
                />
              )}
              {/* HUD: zoom level + instrução */}
              <div style={{position:'absolute',bottom:10,left:10,right:10,display:'flex',justifyContent:'space-between',alignItems:'center',pointerEvents:'none'}}>
                <div style={{background:'rgba(0,0,0,0.65)',color:'#fff',fontSize:11,padding:'3px 8px',borderRadius:5,backdropFilter:'blur(4px)'}}>
                  🔍 {Math.round(imgZoom*100)}% · scroll = zoom · arrastar = mover · 2× clique = reset
                </div>
                <div style={{display:'flex',gap:4,pointerEvents:'all'}}>
                  <button onClick={e=>{e.stopPropagation();setImgZoom(z=>Math.min(8,z*1.4))}}
                    style={{background:'rgba(0,0,0,0.6)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,width:28,height:28,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
                  <button onClick={e=>{e.stopPropagation();setImgZoom(z=>Math.max(0.3,z/1.4))}}
                    style={{background:'rgba(0,0,0,0.6)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',borderRadius:5,width:28,height:28,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>−</button>
                </div>
              </div>
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column'}}>
              <div style={{padding:'6px 14px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>
                  <i className="ti ti-map-pin" style={{marginRight:4,color:'#38BDF8'}} aria-hidden/>{rooms.length} cômodo{rooms.length!==1?'s':''} confirmado{rooms.length!==1?'s':''}
                  {rooms.slice(0,4).map(r=><span key={r.id} style={{marginLeft:6,background:'rgba(56,189,248,0.12)',padding:'0 5px',borderRadius:3,color:'#38BDF8',fontSize:10}}>{r.name}</span>)}
                  {rooms.length>4&&<span style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginLeft:4}}>+{rooms.length-4}</span>}
                </div>
                <button onClick={()=>setStep('rooms')} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,0.4)',fontSize:11,display:'flex',alignItems:'center',gap:3}}>
                  <i className="ti ti-edit" aria-hidden/>Editar cômodos
                </button>
              </div>
              <div style={{flex:1,overflowY:'auto',padding:20}}>
                {chat.map((m,i)=>(
                  <div key={i} style={{marginBottom:14,display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start',flexDirection:'column',alignItems:m.role==='user'?'flex-end':'flex-start'}}>
                    <div style={{maxWidth:'88%',padding:'10px 14px',borderRadius:10,fontSize:13,lineHeight:1.6,whiteSpace:'pre-wrap',
                      background:m.role==='user'?'#0EA5E9':'rgba(255,255,255,0.08)',color:'#fff'}}>{m.text}</div>
                    {/* Quick-reply buttons apenas na última mensagem da IA */}
                    {m.role==='assistant' && i===chat.length-1 && !loading && (()=>{
                      // Detecta perguntas sim/não ou listas na mensagem
                      const isYesNo = /\b(tem|terá|haverá|existe|vai ter|deseja|quer)\b.*\?/i.test(m.text)
                      const hasAC = /ar.condiciona|AC\b|split/i.test(m.text)
                      const hasSom = /som.ambie|música|caixa/i.test(m.text)
                      const hasCam = /câmera|camera/i.test(m.text)
                      const hasRack = /rack|CPD|armário/i.test(m.text)
                      const quickReplies = []
                      if(hasAC) quickReplies.push('Sim, todos têm AC','Alguns ambientes têm AC','Não há AC')
                      if(hasSom) quickReplies.push('Sim, quero som ambiente','Só na sala','Não quero som')
                      if(hasCam) quickReplies.push('Sim, entrada e áreas externas','Entrada apenas','Não quero câmeras')
                      if(hasRack) quickReplies.push('Rack na sala de estar','Rack no corredor','Rack no home office')
                      if(!quickReplies.length && isYesNo) quickReplies.push('Sim','Não','Somente em alguns')
                      if(!quickReplies.length) return null
                      return <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:6,maxWidth:'88%'}}>
                        {quickReplies.map(qr=>(
                          <button key={qr} onClick={()=>sendChat(qr)}
                            style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:16,color:'rgba(255,255,255,0.8)',fontSize:11,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit'}}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(14,165,233,0.25)'}
                            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.07)'}>
                            {qr}
                          </button>
                        ))}
                      </div>
                    })()}
                  </div>
                ))}
                {loading && <div style={{color:'rgba(255,255,255,0.4)',fontSize:12}}><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} aria-hidden/> IA pensando...</div>}
                <div ref={chatEndRef}/>
              </div>
              <div style={{padding:16,borderTop:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <button onClick={generatePositions} disabled={loading} style={{...btnPrimary,flex:1,background:'#7C3AED',justifyContent:'center'}}>
                    <i className="ti ti-sparkles" aria-hidden/> {markers.length?'Refazer sugestão':'Gerar sugestão na planta'}
                  </button>
                  {markers.length>0 && (
                    <button onClick={()=>setStep('editor')} disabled={loading} style={{...btnPrimary,flex:1,justifyContent:'center'}}>
                      <i className="ti ti-edit" aria-hidden/> Ir para o editor
                    </button>
                  )}
                </div>
                <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                  <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendChat() } }}
                    placeholder="Responda à IA... (Enter envia, Shift+Enter quebra linha)" rows={2}
                    style={{...inputStyle,resize:'none',minHeight:44,maxHeight:120,lineHeight:1.4}}/>
                  <button onClick={()=>sendChat()} disabled={loading} style={{...btnPrimary,height:44}}><i className="ti ti-send" aria-hidden/></button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP EDITOR */}
        {step==='editor' && (
          <div className="pe-editor-wrap" style={{flex:1,display:'flex',minHeight:0}}>
            {/* ── Sidebar esquerda: filtros + catálogo ── */}
            <div className="pe-editor-cat" style={{width:230,background:'#0f172a',borderRight:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
              {/* Busca na planta */}
              <div style={{padding:'8px 10px 6px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#0a1020'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#38BDF8',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>🔍 Buscar na planta</div>
                <input value={editorSearch} onChange={e=>setEditorSearch(e.target.value)}
                  placeholder="Nome, código ou cômodo..."
                  style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(56,189,248,0.3)',borderRadius:5,padding:'6px 9px',color:'#fff',fontSize:11,fontFamily:'inherit',boxSizing:'border-box'}}/>
                {editorSearch&&<div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginTop:3}}>
                  {markers.filter(m=>m.name?.toLowerCase().includes(editorSearch.toLowerCase())||m.code?.toLowerCase().includes(editorSearch.toLowerCase())||m.room?.toLowerCase().includes(editorSearch.toLowerCase())).length} resultado(s)
                </div>}
              </div>
              {/* Filtro cômodos */}
              <div style={{padding:'7px 10px 6px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#0a1020'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#38BDF8',textTransform:'uppercase',letterSpacing:1,marginBottom:4,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>🏠 Cômodos</span>
                  {filterRooms.size>0&&<button onClick={()=>setFilterRooms(new Set())} style={{fontSize:8,color:'rgba(255,255,255,0.4)',background:'none',border:'none',cursor:'pointer',padding:0}}>limpar</button>}
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                  {[...new Set(markers.map(m=>m.room||'Sem cômodo'))].sort().map(r=>{
                    const sel=filterRooms.has(r)
                    return <button key={r} onClick={()=>setFilterRooms(prev=>{const s=new Set(prev);if(s.has(r))s.delete(r);else s.add(r);return s})}
                      style={{fontSize:9,padding:'2px 6px',borderRadius:8,border:'1px solid',cursor:'pointer',fontFamily:'inherit',
                        borderColor:sel?'#38BDF8':'rgba(255,255,255,0.15)',background:sel?'rgba(56,189,248,0.15)':'rgba(255,255,255,0.03)',
                        color:sel?'#38BDF8':'rgba(255,255,255,0.5)'}}>
                      {r}
                    </button>})}
                </div>
              </div>
              {/* Filtro categorias */}
              <div style={{padding:'7px 10px 6px',borderBottom:'1px solid rgba(255,255,255,0.06)',background:'#0a1020'}}>
                <div style={{fontSize:9,fontWeight:700,color:'#38BDF8',textTransform:'uppercase',letterSpacing:1,marginBottom:4,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span>🏷 Categorias</span>
                  {filterCateg.size>0&&<button onClick={()=>setFilterCateg(new Set())} style={{fontSize:8,color:'rgba(255,255,255,0.4)',background:'none',border:'none',cursor:'pointer',padding:0}}>limpar</button>}
                </div>
                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                  {[...new Set(markers.map(m=>equipType(m.name)))].sort().map(t=>{
                    const st=EQUIP_STYLE[t]||EQUIP_STYLE.Outro; const sel=filterCateg.has(t)
                    return <button key={t} onClick={()=>setFilterCateg(prev=>{const s=new Set(prev);if(s.has(t))s.delete(t);else s.add(t);return s})}
                      style={{fontSize:9,padding:'2px 6px',borderRadius:8,border:'1px solid',cursor:'pointer',fontFamily:'inherit',
                        borderColor:sel?st.c:'rgba(255,255,255,0.15)',background:sel?st.c+'30':'rgba(255,255,255,0.03)',
                        color:sel?st.c:'rgba(255,255,255,0.5)'}}>
                      {st.s} {t}
                    </button>})}
                </div>
              </div>
              {/* Catálogo */}
              <div style={{flex:1,overflowY:'auto'}}>
                <div style={{padding:'7px 10px 2px',fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:1}}>Adicionar do catálogo</div>
                {addMode&&addItem&&<div style={{padding:'6px 12px',background:'rgba(14,165,233,0.15)',fontSize:11,color:'#38BDF8'}}>Clique na planta: {addItem.name}<br/><span onClick={()=>{setAddMode(false);setAddItem(null)}} style={{cursor:'pointer',textDecoration:'underline'}}>cancelar</span></div>}
                <div style={{padding:'6px 10px',position:'sticky',top:0,background:'#0f172a',zIndex:2,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                  <input value={catSearch} onChange={e=>setCatSearch(e.target.value)} placeholder="Buscar item..."
                    style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'7px 10px',color:'#fff',fontSize:12,fontFamily:'inherit',boxSizing:'border-box',marginBottom:5}}/>
                  <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
                    style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'7px 10px',color:'#fff',fontSize:12,fontFamily:'inherit',boxSizing:'border-box'}}>
                    <option value="">Todas as categorias</option>
                    {Object.keys(catGroups).map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {Object.entries(catGroups).filter(([g])=>!catFilter||g===catFilter).map(([g,items])=>{
                  const fil=items.filter(it=>!catSearch||(it.name||'').toLowerCase().includes(catSearch.toLowerCase())||(it.code||'').toLowerCase().includes(catSearch.toLowerCase()))
                  if(!fil.length) return null
                  return <div key={g}>
                    <div style={{padding:'5px 12px 2px',fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{g}</div>
                    {fil.map((it,i)=>{const st=EQUIP_STYLE[equipType(it.name)]||EQUIP_STYLE.Outro
                      return <div key={i} onClick={()=>{setAddItem(it);setAddMode(true)}} style={{padding:'9px 12px',cursor:'pointer',display:'flex',gap:8,alignItems:'center',minHeight:38}}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                        <span style={{width:20,height:20,borderRadius:'50%',background:st.c,color:'#fff',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{st.s}</span>
                        <span style={{fontSize:11,color:'rgba(255,255,255,0.85)',lineHeight:1.3}}>{it.name}{isRackItem(it.name,it.code)?<span style={{color:'#A78BFA',fontSize:9}}> · rack</span>:''}</span>
                      </div>})}
                  </div>})}
              </div>
            </div>
            {/* ── Canvas ── */}
            <div className="pe-editor-canvas" style={{flex:1,overflow:'auto',background:'#1a1a2e',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,position:'relative'}}>
              <div style={{position:'sticky',top:0,right:0,zIndex:30,display:'flex',gap:6,alignSelf:'flex-start',marginLeft:'auto',background:'rgba(0,0,0,0.5)',borderRadius:8,padding:4,height:'fit-content'}}>
                <button onClick={()=>setShowRackModal(true)} style={{height:32,borderRadius:6,border:'1px solid #7C3AED',background:'rgba(124,58,237,0.2)',color:'#C4B5FD',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}}>
                  <i className="ti ti-server" aria-hidden/>Rack CPD
                </button>
                <button onClick={e=>{e.stopPropagation();bgOnlyRef.current?.click()}} style={{height:32,borderRadius:6,border:'none',background:'#0EA5E9',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}}><i className="ti ti-upload" aria-hidden/>{bgImage?'Trocar planta':'Carregar planta'}</button>
                <input ref={bgOnlyRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleBgOnly}/>
                <button onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>−</button>
                <span style={{color:'#fff',fontSize:11,display:'flex',alignItems:'center',padding:'0 4px'}}>{Math.round(zoom*100)}%</span>
                <button onClick={()=>setZoom(z=>Math.min(3,z+0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>+</button>
              </div>
              <div ref={containerRef} style={{position:'relative',display:'inline-block',cursor:addMode?'crosshair':'default',width:bgImage?`${zoom*100}%`:`${Math.min(640*zoom,window.innerWidth*0.82)}px`,transformOrigin:'top center'}} onClick={onCanvasClick}>
                {bgImage ? <img src={bgImage} style={{display:'block',width:'100%',pointerEvents:'none'}} draggable={false}/>
                  : <div style={{width:'100%',aspectRatio:'4/3',background:'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px)',backgroundColor:'rgba(255,255,255,0.02)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:10,position:'relative'}}>
                      <div style={{position:'absolute',top:10,left:0,right:0,textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.45)',pointerEvents:'none'}}>Pontos posicionados — arraste para ajustar, ou carregue a planta.</div>
                    </div>}
                {markers.map(m=>{
                  const srch=editorSearch.toLowerCase()
                  const matchS=!editorSearch||m.name?.toLowerCase().includes(srch)||m.code?.toLowerCase().includes(srch)||m.room?.toLowerCase().includes(srch)
                  const matchR=filterRooms.size===0||filterRooms.has(m.room||'Sem cômodo')
                  const matchC=filterCateg.size===0||filterCateg.has(equipType(m.name))
                  const visible=matchS&&matchR&&matchC
                  const isRack = isRackItem(m.name||'', m.code||'')
                  const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
                  const sel=selected===m.uid
                  return <div key={m.uid} style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%,-50%)',zIndex:sel?20:5,cursor:'grab',opacity:visible?1:0.07,pointerEvents:visible?'auto':'none',transition:'opacity 0.15s'}} onMouseDown={e=>onDown(e,m.uid)}>
                    {isRack
                      ? <div style={{width:sel?36:30,height:sel?36:30,borderRadius:6,background:'#4C1D95',color:'#C4B5FD',fontSize:14,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #7C3AED',boxShadow:sel?`0 0 0 3px #7C3AED`:'0 2px 6px rgba(0,0,0,0.6)'}}><i className="ti ti-server" aria-hidden style={{fontSize:16}}/></div>
                      : <div style={{width:sel?28:24,height:sel?28:24,borderRadius:'50%',background:st.c,color:'#fff',fontSize:12,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff',boxShadow:sel?`0 0 0 3px ${st.c}`:'0 1px 4px rgba(0,0,0,0.5)'}}>{m.n}</div>}
                    <div style={{position:'absolute',left:'50%',top:-9,transform:'translateX(-50%)',background:isRack?'#4C1D95':st.c,color:'#fff',borderRadius:'50%',width:13,height:13,fontSize:7,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #fff',pointerEvents:'none'}}>{isRack?'R':st.s}</div>
                    <div style={{position:'absolute',left:'50%',top:sel?34:30,transform:'translateX(-50%)',background:'rgba(0,0,0,0.75)',color:isRack?'#C4B5FD':'#fff',borderRadius:3,padding:'1px 4px',fontSize:7.5,whiteSpace:'nowrap',fontFamily:'monospace',fontWeight:600,pointerEvents:'none'}}>{isRack?'RACK CPD':m.code}</div>
                  </div>})}
              </div>
            </div>
            {/* ── Painel direito ── */}
            <div className="pe-editor-side" style={{width:220,background:'#0f172a',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto'}}>
              {selected ? (()=>{const m=markers.find(x=>x.uid===selected); if(!m)return null
                const rNames=rooms.map(r=>r.name)
                return <div style={{padding:14}}>
                  <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Item {m.id}</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{m.name}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:'monospace',marginBottom:10}}>{m.code}</div>
                  {/* If this is a rack item, show rack config button */}
                  {isRackItem(m.name,m.code) && <button onClick={()=>{setRackEquip(m.rackEquip||[]); setShowRackModal(true)}}
                    style={{width:'100%',background:'rgba(124,58,237,0.2)',border:'1px solid #7C3AED',borderRadius:5,color:'#C4B5FD',cursor:'pointer',padding:'7px',fontSize:11,marginBottom:10,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
                    <i className="ti ti-server" aria-hidden/>{(m.rackEquip||[]).length} equipamentos no rack — editar
                  </button>}
                  <label style={lbl}>Ambiente</label>
                  <select value={rNames.includes(m.room)?m.room:(m.room?'__custom__':'')} onChange={e=>{
                    const val=e.target.value
                    if(val==='__new__'){
                      const nome=window.prompt('Nome do novo cômodo:')
                      if(!nome?.trim())return
                      if(!window.confirm(`Confirmar: adicionar "${nome.trim()}" à lista de cômodos?`))return
                      const maxId=rooms.reduce((mx,r)=>Math.max(mx,r.id||0),0)
                      setRooms(rs=>[...rs,{id:maxId+1,name:nome.trim(),floor:'',x:50,y:50}])
                      const newId = genItemId(nome.trim(), m.subcategory||inferCategory(m.name).sub||'', markers)
                      setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,room:nome.trim(),id:newId}:x))
                    } else {
                      const newId = genItemId(val, m.subcategory||inferCategory(m.name).sub||'', markers.filter(x=>x.uid!==m.uid))
                      setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,room:val,id:newId}:x))
                    }
                  }} style={{...inputDark,marginBottom:8}}>
                    <option value="">— selecionar —</option>
                    {rNames.map(r=><option key={r} value={r}>{r}</option>)}
                    {m.room&&!rNames.includes(m.room)&&<option value="__custom__">{m.room}</option>}
                    <option value="__new__">+ Novo cômodo…</option>
                  </select>
                  <label style={lbl}>ID único</label>
                  <input value={m.id} onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,id:e.target.value}:x))} style={inputDark}/>
                  <label style={lbl}>Nota (posição/altura)</label>
                  <textarea value={m.note} onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,note:e.target.value}:x))} rows={3} style={{...inputDark,resize:'vertical'}}/>
                  <button onClick={()=>{setMarkers(ms=>ms.filter(x=>x.uid!==m.uid).map((x,i)=>({...x,n:i+1})));setSelected(null)}} style={{...btnGhost,width:'100%',marginTop:10,color:'#FCA5A5',borderColor:'rgba(220,38,38,0.4)'}}><i className="ti ti-trash" aria-hidden/> Remover</button>
                </div>})() : (
                <div style={{padding:14}}>
                  <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Resumo</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.8}}>{markers.length} equipamentos posicionados</div>
                  {(filterRooms.size>0||filterCateg.size>0||editorSearch)&&<div style={{marginTop:8,fontSize:11,color:'#38BDF8',background:'rgba(56,189,248,0.1)',padding:'6px 8px',borderRadius:5}}>
                    Visíveis: {markers.filter(m=>{const s=editorSearch.toLowerCase();return(!editorSearch||m.name?.toLowerCase().includes(s)||m.code?.toLowerCase().includes(s)||m.room?.toLowerCase().includes(s))&&(filterRooms.size===0||filterRooms.has(m.room||'Sem cômodo'))&&(filterCateg.size===0||filterCateg.has(equipType(m.name)))}).length} / {markers.length}
                  </div>}
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:10,lineHeight:1.6}}>Clique num marcador para editar.<br/>Arraste para mover.<br/>Use o painel esquerdo para adicionar.</div>
              </div>
            )}
            </div>
          </div>
        )}

        {step==='exec' && (
          <div style={{flex:1,overflowY:'auto',background:'#e8eaed',padding:'20px 0'}}>
            <style>{EXEC_CSS}</style>
            <div style={{maxWidth:820,margin:'0 auto',background:'#fff',boxShadow:'0 2px 16px rgba(0,0,0,0.12)'}} dangerouslySetInnerHTML={{__html:execDoc||''}}/>
          </div>
        )}
      </div>

      {/* ── RACK MODAL ── */}
      {showRackModal && <RackModal
        catalog={catalog}
        rackEquip={rackEquip}
        onChange={setRackEquip}
        markers={markers}
        onClose={()=>setShowRackModal(false)}
        onApply={(equip)=>{
          // Verifica se já existe um marcador de rack
          const existingRack = markers.find(m=>isRackItem(m.name,m.code))
          if(existingRack){
            // Atualiza o marcador existente com os itens do rack
            setMarkers(ms=>ms.map(x=>x.uid===existingRack.uid ? {...x, rackEquip:equip, name:'Rack CPD', note:`${equip.length} equipamentos`} : x))
          } else {
            // Adiciona um marcador de rack no centro
            setMarkers(ms=>[...ms,{uid:Date.now(),n:ms.length+1,id:'RACK-CPD',code:'RACK',name:'Rack CPD',room:'',x:50,y:50,note:`${equip.length} equipamentos`,cost:0,sale:0,category:'Redes / WiFi',subcategory:'Rack / Enclosure',rackEquip:equip}])
          }
          setRackEquip(equip)
          setShowRackModal(false)
        }}
      />}

      {/* Footer actions */}
      {step==='editor' && (
        <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={()=>setStep('chat')} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Voltar à análise</button>
          <button onClick={generateExec} disabled={loading} style={{...btnPrimary,background:'#7C3AED'}}>
            <i className="ti ti-file-text" aria-hidden/> {loading?(execProgress||'Gerando...'):'Gerar Projeto Executivo'}
          </button>
        </div>
      )}
      {step==='exec' && (
        <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={()=>setStep('editor')} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Editor</button>
          <button onClick={exportPdfAndSave} style={btnPrimary}><i className="ti ti-file-download" aria-hidden/> Gerar PDF e salvar em Orçamento</button>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes progslide{0%{margin-left:-40%}100%{margin-left:100%}}`}</style>
    </div>
  )
}

const EXEC_CSS=`
.ex-doc{font-family:'DM Sans',system-ui,sans-serif;color:#1a1a1a;font-size:12px;line-height:1.5}
.ex-doc *{box-sizing:border-box}
.ex-cover{background:linear-gradient(160deg,#F5FAFF 0%,#E8F2FC 100%);color:#0D1420;padding:60px 40px;text-align:center;position:relative;border-bottom:3px solid #0EA5E9;page-break-after:always}
.ex-cover-top{font-size:10px;letter-spacing:3px;color:#6B8CAE;text-transform:uppercase;margin-bottom:30px}
.ex-cover-tag{font-size:10px;letter-spacing:4px;color:#0EA5E9;margin:6px 0 40px}
.ex-cover-title{font-family:'DM Serif Display',Georgia,serif;font-size:34px;line-height:1.15;margin-bottom:16px;color:#0D1420}
.ex-cover-sub{font-size:13px;color:#456;line-height:1.7;margin-bottom:40px}
.ex-cover-client{background:#fff;border:1px solid #cfe3f5;border-radius:10px;padding:20px;margin:0 auto;max-width:380px;box-shadow:0 2px 10px rgba(14,165,233,0.08)}
.ex-cc-name{font-size:20px;font-weight:700;color:#0D1420}
.ex-cc-meta{font-size:11px;color:#6B8CAE;margin-top:4px}
.ex-cover-foot{margin-top:40px;font-size:9px;color:#8fa3b8}
.ex-sec{padding:24px 40px;border-bottom:1px solid #eef;page-break-inside:avoid}
.ex-sec h2{font-family:'DM Serif Display',Georgia,serif;font-size:18px;color:#060B1A;margin-bottom:14px;padding-bottom:7px;border-bottom:2px solid #0EA5E9}
.ex-amb{font-size:13px;color:#0369A1;font-weight:700;margin:16px 0 6px;background:#EFF6FF;padding:6px 10px;border-radius:5px;page-break-after:avoid}
.ex-tbl{width:100%;border-collapse:collapse;margin:8px 0 16px;font-size:11px}
.ex-tbl th{background:#060B1A;color:#fff;padding:7px 9px;text-align:left;font-size:10px;font-weight:600}
.ex-tbl td{padding:6px 9px;border-bottom:1px solid #eef2f7;vertical-align:top}
.ex-tbl tr:nth-child(even) td{background:#f7fafc}
.ex-ul{margin:6px 0 6px 18px}
.ex-ul li{margin-bottom:5px}
.ex-p{font-size:12px;line-height:1.6;color:#374151}
`

const btnPrimary={background:'#0EA5E9',color:'#fff',border:'none',padding:'8px 16px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}
const btnGhost={background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',padding:'7px 14px',borderRadius:6,cursor:'pointer',fontSize:12,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}
const inputStyle={flex:1,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'8px 12px',color:'#fff',fontSize:13,fontFamily:'inherit'}
const inputDark={width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,padding:'5px 8px',color:'#fff',fontSize:12,fontFamily:'inherit',boxSizing:'border-box',marginBottom:8}
const lbl={fontSize:10,color:'rgba(255,255,255,0.4)',display:'block',marginBottom:3}

export default function ProjetoExecutivo(props){
  return (
    <ExecErrorBoundary onReset={()=>{}}>
      <ProjetoExecutivoInner {...props}/>
    </ExecErrorBoundary>
  )
}
