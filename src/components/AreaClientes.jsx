import { useState, useRef, useEffect, useCallback } from 'react'
import { inferCategory } from '../taxonomy.js'
import { saveProposal } from '../db/supabase.js'

// ── Identidade visual idêntica ao Projeto Executivo ──
// cor + símbolo por TIPO de equipamento (derivado do nome do item)
const EQUIP_STYLE = {
  'Gateway':{c:'#0EA5E9',s:'G'},'NVR':{c:'#7C3AED',s:'N'},'Câmera':{c:'#DC2626',s:'C'},
  'Keypad':{c:'#059669',s:'K'},'Hub IR':{c:'#D97706',s:'I'},'Módulo':{c:'#6366F1',s:'M'},
  'Som':{c:'#BE185D',s:'S'},'Wi-Fi':{c:'#0E7490',s:'W'},'Sensor':{c:'#16A34A',s:'P'},
  'Tomada':{c:'#475569',s:'T'},'Outro':{c:'#374151',s:'?'},
}
function equipType(name=''){
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
function isRackItemAC(name='', code=''){
  const n=(name+' '+code).toLowerCase()
  return /\b(hd|nvr|dvr|switch|patch|nobreak|no-break|patch ?cord|dream machine|udm|controladora|servidor|fonte|mini rack|rack)\b/.test(n) && !/gateway/.test(n)
}
// categorias canônicas (nomes corretos)
const CANON = new Set(['Segurança','Sonorização','Redes','Automação','Gourmet','Elétrica','CPD','Outros'])
// categoria (para filtro/valores) — sempre normaliza para os nomes corretos
function catOf(it){
  // normaliza nomes conhecidos com variações
  const raw=(it.category||'').trim()
  const map={'Som':'Sonorização','Rede':'Redes','Redes / WiFi':'Redes','Redes/WiFi':'Redes','Segurança / CFTV':'Segurança','CPD / Rack':'CPD','CPD/Rack':'CPD'}
  if(map[raw]) return map[raw]
  if(CANON.has(raw)) return raw
  // se a categoria não for canônica (ex: "Interruptor"), infere pelo nome
  const r=inferCategory(it.itemName||it.name||'')
  return (r && CANON.has(r.cat)) ? r.cat : (raw||'Outros')
}
// nome / código normalizados (suporta markers do PlantaEditor e do ProjetoExecutivo)
const nameOf = m => m.itemName || m.name || ''
const codeOf = m => m.itemCode || m.code || ''
const styleOf = m => EQUIP_STYLE[equipType(nameOf(m))] || EQUIP_STYLE.Outro
const fmt = v => 'R$\u202f' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

// cor por CATEGORIA (para a sidebar de categorias)
const CAT_COLOR = {
  'Segurança':'#DC2626','Sonorização':'#BE185D','Som':'#BE185D','Redes':'#0EA5E9','Rede':'#0EA5E9',
  'Automação':'#059669','Gourmet':'#D97706','Elétrica':'#F59E0B','CPD':'#7C3AED','Outros':'#6B7280',
}

// PDF → imagem (planta carregada)
async function pdfToImage(base64Pdf){
  return new Promise((resolve,reject)=>{
    function render(){
      const lib=window.pdfjsLib
      lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      const bytes=Uint8Array.from(atob(base64Pdf),c=>c.charCodeAt(0))
      lib.getDocument({data:bytes}).promise.then(pdf=>pdf.getPage(1)).then(page=>{
        const vp=page.getViewport({scale:2})
        const cv=document.createElement('canvas'); cv.width=vp.width; cv.height=vp.height
        page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise.then(()=>resolve(cv.toDataURL('image/jpeg',0.92))).catch(reject)
      }).catch(reject)
    }
    if(window.pdfjsLib){render()}else{
      const s=document.createElement('script')
      s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      s.onload=render; s.onerror=()=>reject(new Error('pdf.js load failed'))
      document.head.appendChild(s)
    }
  })
}

let MID = 1
export default function AreaClientes({ clients=[], proposals=[], catalog=[], onRefresh, onClose }) {
  const [selProposal, setSelProposal] = useState(null)
  const [markers, setMarkers]   = useState([])
  const [bgImage, setBgImage]   = useState(null)
  const [zoom, setZoom]         = useState(1)
  const [pan, setPan]           = useState({x:0,y:0})
  const [showValues, setShowValues] = useState(false)
  const [hiddenCats, setHiddenCats] = useState(new Set())
  const [selMarker, setSelMarker]   = useState(null)
  const [dirty, setDirty]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [dragMarker, setDragMarker] = useState(null)
  const [panning, setPanning]   = useState(null)
  const [showEditor, setShowEditor] = useState(false)  // painel de adicionar itens (item 7)
  const [catSearch, setCatSearch]   = useState('')
  const [catFilter, setCatFilter]   = useState('')      // dropdown "Todas as categorias"
  const [plantaSearch, setPlantaSearch] = useState('')  // buscar na planta
  const [filterRooms, setFilterRooms]   = useState(new Set())
  const [openSec, setOpenSec]       = useState({resumo:false,busca:false,comodos:false,cats:false})
  const [itemFilter, setItemFilter] = useState('')      // filtra o mapa por nome de item
  const [tapCount, setTapCount]     = useState(0)      // gesto discreto p/ revelar valor (item 4)
  const stageRef = useRef(null)
  const fileRef  = useRef(null)

  const withPlanta = proposals.filter(p=>{
    const pc = parseJSON(p.planta_cliente); const pd = parseJSON(p.planta_data)
    return (pc && pc.markers?.length) || (pd && pd.markers?.length)
  })
  function parseJSON(v){ if(!v) return null; if(typeof v==='object') return v; try{return JSON.parse(v)}catch{return null} }

  function enrich(mk){
    return (mk||[]).map(m=>{
      const cat = m.category || inferCategory(nameOf(m)).cat || 'Outros'
      const code = codeOf(m)
      const cat0 = catalog.find(c=>c.code===code) || catalog.find(c=>(c.name||'').toLowerCase()===nameOf(m).toLowerCase())
      // preço de venda: marker (sale_price OU sale do executivo) → catálogo → 0
      const sale = (m.sale_price ?? m.sale ?? cat0?.sale_price ?? 0)
      return { ...m, id:m.id??MID++, category:cat, sale_price:Number(sale)||0 }
    })
  }
  function openProposal(p){
    const pc = parseJSON(p.planta_cliente), pdExec = parseJSON(p.planta_data)
    const pd = (pc && pc.markers?.length) ? pc : (pdExec||{})
    setSelProposal(p); setBgImage(pd.image||null); setMarkers(enrich(pd.markers))
    setZoom(1); setPan({x:0,y:0}); setShowValues(false); setHiddenCats(new Set())
    setSelMarker(null); setDirty(false); setShowEditor(false); setTapCount(0)
  }

  function onWheel(e){ if(!bgImage) return; e.preventDefault(); const d=e.deltaY<0?0.12:-0.12; setZoom(z=>Math.min(4,Math.max(0.4,+(z+d).toFixed(2)))) }
  function onStageMouseDown(e){ if(e.target.closest('.mk')) return; setPanning({sx:e.clientX,sy:e.clientY,ox:pan.x,oy:pan.y}) }
  const onMouseMove = useCallback((e)=>{
    if(dragMarker){
      const rect=stageRef.current.getBoundingClientRect()
      const x=((e.clientX-rect.left-pan.x)/(rect.width*zoom))*100
      const y=((e.clientY-rect.top-pan.y)/(rect.height*zoom))*100
      setMarkers(ms=>ms.map(m=>m.id===dragMarker?{...m,x:Math.max(0,Math.min(100,x)),y:Math.max(0,Math.min(100,y))}:m)); setDirty(true)
    } else if(panning){ setPan({x:panning.ox+(e.clientX-panning.sx),y:panning.oy+(e.clientY-panning.sy)}) }
  },[dragMarker,panning,pan,zoom])
  const onMouseUp = useCallback(()=>{ setDragMarker(null); setPanning(null) },[])
  useEffect(()=>{
    if(dragMarker||panning){
      window.addEventListener('mousemove',onMouseMove); window.addEventListener('mouseup',onMouseUp)
      return ()=>{ window.removeEventListener('mousemove',onMouseMove); window.removeEventListener('mouseup',onMouseUp) }
    }
  },[dragMarker,panning,onMouseMove,onMouseUp])

  const cats = [...new Set(markers.map(m=>catOf(m)))].sort()
  const rooms = [...new Set(markers.map(m=>m.room).filter(Boolean))].sort()
  const visMarkers = markers.filter(m=>{
    if(hiddenCats.has(catOf(m))) return false
    if(filterRooms.size>0 && !filterRooms.has(m.room||'Sem cômodo')) return false
    if(itemFilter && nameOf(m)!==itemFilter) return false
    if(plantaSearch){ const q=plantaSearch.toLowerCase(); if(!(nameOf(m).toLowerCase().includes(q)||codeOf(m).toLowerCase().includes(q)||(m.room||'').toLowerCase().includes(q))) return false }
    return true
  })
  // Resumo de itens: agrupa por NOME → quantidade total + lista de cômodos
  const itemResumo = (()=>{
    const g={}
    markers.forEach(m=>{
      const nm=nameOf(m); if(!nm) return
      const q=parseInt(m.qty)||1
      if(!g[nm]) g[nm]={ name:nm, qty:0, rooms:{}, cat:catOf(m) }
      g[nm].qty+=q
      const r=m.room||'Sem cômodo'; g[nm].rooms[r]=(g[nm].rooms[r]||0)+q
    })
    return Object.values(g).sort((a,b)=>b.qty-a.qty)
  })()
  const toggleCat = c => setHiddenCats(s=>{ const n=new Set(s); n.has(c)?n.delete(c):n.add(c); return n })
  const totalVenda = visMarkers.reduce((s,m)=>s+(m.sale_price||0)*(parseInt(m.qty)||1),0)

  // ── Gesto discreto p/ revelar valor (item 4): 3 toques rápidos no canto inferior direito ──
  function discreteTap(){
    setTapCount(c=>{
      const n=c+1
      if(n>=3){ setShowValues(v=>!v); return 0 }
      setTimeout(()=>setTapCount(0),1200)
      return n
    })
  }

  // ── Carregar planta: upload de arquivo (item 5) ──
  function triggerUpload(){ fileRef.current?.click() }
  function handleFile(e){
    const file=e.target.files[0]; if(!file) return
    const reader=new FileReader()
    reader.onload=async ev=>{
      const dataUrl=ev.target.result
      if(file.type==='application/pdf'){
        try{ setBgImage(await pdfToImage(dataUrl.split(',')[1])) }catch(err){ alert('Erro ao ler PDF: '+err.message); return }
      } else setBgImage(dataUrl)
      setDirty(true)
    }
    reader.readAsDataURL(file)
  }
  // ── Puxar planta do cadastro do cliente (item 5) ──
  function plantaDoCliente(){
    const c=clients.find(x=>x.id===Number(selProposal?.client_id))
    const med=c?.planta_medidas?.data, ele=c?.planta_eletrica?.data
    if(!med && !ele){ alert('Este cliente não tem plantas salvas no cadastro.'); return }
    let escolha=null
    if(med && ele) escolha = window.confirm('Cliente tem 2 plantas.\n\nOK = MEDIDAS\nCancelar = ELÉTRICA') ? c.planta_medidas : c.planta_eletrica
    else escolha = med ? c.planta_medidas : c.planta_eletrica
    if(!escolha?.data) return
    ;(async()=>{
      if(escolha.type==='application/pdf' || /pdf/i.test(escolha.type||'')){
        try{ setBgImage(await pdfToImage(escolha.data.split(',')[1])); setDirty(true) }catch(err){ alert('Erro ao ler PDF: '+err.message) }
      } else { setBgImage(escolha.data); setDirty(true) }
    })()
  }

  // ── Adicionar item do catálogo na planta (item 7) ──
  function addItem(cat0){
    const inf=inferCategory(cat0.name||'')
    const maxN=markers.reduce((mx,m)=>Math.max(mx, parseInt(m.n)||0),0)
    setMarkers(ms=>[...ms,{ id:MID++, n:maxN+1, x:50, y:50, itemCode:cat0.code, itemName:cat0.name,
      room:'', qty:1, note:'', category:inf?.cat||'Outros', sale_price:cat0.sale_price||0 }])
    setDirty(true)
  }
  function removeMarker(id){ setMarkers(ms=>ms.filter(m=>m.id!==id)); setSelMarker(null); setDirty(true) }

  // ── Salvar (não mexe no executivo) ──
  async function salvar(){
    if(!selProposal) return; setSaving(true)
    try{
      const updated={...selProposal, planta_cliente:{image:bgImage,markers,updatedAt:new Date().toISOString()}}
      const saved=await saveProposal(updated); setSelProposal(saved||updated); setDirty(false)
      alert('✓ Salvo na Área de Clientes.\nO Projeto Executivo NÃO foi alterado.'); onRefresh&&onRefresh()
    }catch(e){ alert('Erro ao salvar: '+e.message) } finally{ setSaving(false) }
  }
  // ── Importar para o Projeto Executivo (substitui) ──
  async function importarParaExec(){
    if(!selProposal) return
    if(!window.confirm('Isto vai SUBSTITUIR a planta do Projeto Executivo vigente pelos itens posicionados aqui. Continuar?')) return
    setSaving(true)
    try{
      const pd=parseJSON(selProposal.planta_data)||{}
      const updated={...selProposal, planta_data:{...pd,image:bgImage,markers,importedFromClientArea:new Date().toISOString()}}
      const saved=await saveProposal(updated); setSelProposal(saved||updated); setDirty(false)
      alert('✓ Planta importada para o Projeto Executivo.'); onRefresh&&onRefresh()
    }catch(e){ alert('Erro ao importar: '+e.message) } finally{ setSaving(false) }
  }

  const clientName = (p)=>{ if(p.client_name) return p.client_name; const c=clients.find(x=>x.id===Number(p.client_id)); return c?`${c.name1}${c.name2?' & '+c.name2:''}`:'Cliente' }

  // catálogo agrupado por categoria (para o painel de adicionar)
  const catalogGroups = (()=>{
    const q=catSearch.trim().toLowerCase()
    const g={}
    catalog.filter(c=>!q||c.name?.toLowerCase().includes(q)).forEach(c=>{
      const cat=inferCategory(c.name||'').cat||'Outros'
      if(catFilter && cat!==catFilter) return
      ;(g[cat]=g[cat]||[]).push(c)
    })
    return g
  })()
  const allCatNames = [...new Set(catalog.map(c=>inferCategory(c.name||'').cat||'Outros'))].sort()

  // ───────── TELA DE SELEÇÃO ─────────
  if(!selProposal){
    return (
      <div style={SC.full}>
        <div style={SC.topbar}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,letterSpacing:2}}>Área de Clientes</div>
          <button onClick={onClose} style={SC.ghost}>✕ Sair</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'28px 24px',maxWidth:760,margin:'0 auto',width:'100%'}}>
          <div style={{fontSize:13,color:'#94A3B8',marginBottom:20}}>Selecione um cliente para abrir a planta e apresentar na tela.</div>
          {withPlanta.length===0
            ? <div style={{textAlign:'center',color:'#64748B',padding:'60px 20px',fontSize:14}}>Nenhum projeto com planta montada ainda.</div>
            : <div style={{display:'grid',gap:12}}>
              {withPlanta.map(p=>{
                const pc=parseJSON(p.planta_cliente),pd=parseJSON(p.planta_data)
                const nM=((pc&&pc.markers?.length)?pc.markers:(pd?.markers||[])).length
                return <button key={p.id} onClick={()=>openProposal(p)} style={SC.card}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A268'} onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(148,163,184,0.15)'}>
                  <div style={SC.cardIcon}><i className="ti ti-map-2" aria-hidden/></div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:600}}>{clientName(p)}</div>
                    <div style={{fontSize:12,color:'#94A3B8'}}>{p.code||'—'} · {p.neighborhood||''} · {nM} itens</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{color:'#64748B'}} aria-hidden/>
                </button>
              })}
            </div>}
        </div>
      </div>
    )
  }

  // ───────── MODO APRESENTAÇÃO ─────────
  return (
    <div style={{...SC.full,userSelect:'none'}}>
      <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleFile}/>
      {/* Topo */}
      <div style={{...SC.topbar,gap:14}}>
        <button onClick={()=>{ if(dirty&&!window.confirm('Há alterações não salvas. Sair mesmo assim?'))return; setSelProposal(null) }} style={SC.ghost}>‹ Clientes</button>
        <div style={{flex:1}}>
          <div onClick={discreteTap} title="" style={{fontFamily:"'DM Serif Display',serif",fontSize:18,cursor:'default'}}>{clientName(selProposal)}</div>
          <div style={{fontSize:11,color:'#94A3B8'}}>{selProposal.code||''} · {visMarkers.length} itens visíveis{showValues&&<span style={{color:'#E8CFA0'}}> · {fmt(totalVenda)}</span>}</div>
        </div>
        <button onClick={()=>setShowEditor(s=>!s)} title="Adicionar itens" style={{...SC.ghost,color:showEditor?'#E8CFA0':'#94A3B8',borderColor:showEditor?'rgba(201,162,104,0.5)':'rgba(148,163,184,0.3)'}}>
          <i className="ti ti-plus" aria-hidden/> Itens
        </button>
        <button onClick={triggerUpload} title="Carregar planta" style={SC.ghost}><i className="ti ti-upload" aria-hidden/> Planta</button>
        <button onClick={plantaDoCliente} title="Puxar planta do cadastro" style={SC.ghost}><i className="ti ti-folder" aria-hidden/> Cadastro</button>
        <button onClick={onClose} style={SC.ghost}>✕ Sair</button>
      </div>

      <div style={{flex:1,display:'flex',minHeight:0}}>
        {/* Sidebar categorias */}
        <div style={{width:210,borderRight:'1px solid rgba(148,163,184,0.15)',padding:'16px 14px',overflowY:'auto',flexShrink:0}}>
          <div style={SC.sectLabel}>Categorias</div>
          {cats.map(c=>{
            const color=CAT_COLOR[c]||'#6B7280'; const n=markers.filter(m=>catOf(m)===c).length; const off=hiddenCats.has(c)
            return <button key={c} onClick={()=>toggleCat(c)} style={{display:'flex',alignItems:'center',gap:9,width:'100%',background:'none',border:'none',padding:'7px 6px',cursor:'pointer',borderRadius:6,opacity:off?0.4:1,color:'#E2E8F0',textAlign:'left'}}>
              <span style={{width:14,height:14,borderRadius:'50%',background:color,flexShrink:0}}/>
              <span style={{flex:1,fontSize:12.5}}>{c}</span>
              <span style={{fontSize:11,color:'#64748B'}}>{n}</span>
              <i className={off?'ti ti-eye-off':'ti ti-eye'} style={{fontSize:13,color:'#64748B'}} aria-hidden/>
            </button>
          })}
          {showValues && <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid rgba(148,163,184,0.15)'}}>
            <div style={SC.sectLabel}>Valor por categoria</div>
            {cats.filter(c=>!hiddenCats.has(c)).map(c=>{
              const v=markers.filter(m=>catOf(m)===c).reduce((s,m)=>s+(m.sale_price||0)*(parseInt(m.qty)||1),0)
              return <div key={c} style={{display:'flex',justifyContent:'space-between',fontSize:11.5,padding:'2px 0',color:'#CBD5E1'}}><span>{c}</span><span>{fmt(v)}</span></div>
            })}
          </div>}
        </div>

        {/* Palco */}
        <div ref={stageRef} onWheel={onWheel} onMouseDown={onStageMouseDown} style={{flex:1,overflow:'hidden',position:'relative',background:'#0E1622',cursor:panning?'grabbing':'grab'}}>
          {!bgImage
            ? <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',gap:14,alignItems:'center',justifyContent:'center',color:'#64748B',fontSize:14}}>
                <i className="ti ti-map-off" style={{fontSize:32}} aria-hidden/>
                Sem planta carregada.
                <div style={{display:'flex',gap:10}}>
                  <button onClick={triggerUpload} style={SC.gold}><i className="ti ti-upload" aria-hidden/> Carregar planta</button>
                  <button onClick={plantaDoCliente} style={SC.ghost}><i className="ti ti-folder" aria-hidden/> Puxar do cadastro</button>
                </div>
              </div>
            : <div style={{position:'absolute',left:'50%',top:'50%',transform:`translate(-50%,-50%) translate(${pan.x}px,${pan.y}px) scale(${zoom})`,transformOrigin:'center center',transition:panning||dragMarker?'none':'transform .12s'}}>
              <div style={{position:'relative',display:'inline-block'}}>
                <img src={bgImage} draggable={false} style={{display:'block',maxWidth:'min(86vw,1200px)',maxHeight:'82vh',pointerEvents:'none'}}/>
                {visMarkers.map(m=>{
                  const st=styleOf(m); const sel=selMarker===m.id; const rack=isRackItemAC(nameOf(m),codeOf(m))
                  const label=m.n||st.s
                  return <div key={m.id} className="mk" onMouseDown={e=>{ e.stopPropagation(); setSelMarker(m.id); setDragMarker(m.id) }}
                    style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%,-50%)',zIndex:sel?20:10,cursor:'move'}}>
                    {rack
                      ? <div style={{width:sel?32:28,height:sel?32:28,borderRadius:6,background:'#4C1D95',color:'#C4B5FD',fontSize:13,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:`2px solid ${sel?'#E8CFA0':'#7C3AED'}`,boxShadow:'0 2px 6px rgba(0,0,0,0.6)'}}><i className="ti ti-server" aria-hidden style={{fontSize:15}}/></div>
                      : <div style={{width:sel?28:26,height:sel?28:26,borderRadius:'50%',background:st.c,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,border:`2px solid ${sel?'#E8CFA0':'#fff'}`,boxShadow:'0 1px 5px rgba(0,0,0,0.5)'}}>{label}</div>}
                    <div style={{position:'absolute',left:'50%',top:-8,transform:'translateX(-50%)',background:rack?'#4C1D95':st.c,color:'#fff',borderRadius:'50%',width:13,height:13,fontSize:7,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #fff',pointerEvents:'none'}}>{rack?'R':st.s}</div>
                    {sel && <div style={{position:'absolute',left:32,top:-4,background:'rgba(10,15,22,0.96)',border:`1px solid ${rack?'#7C3AED':st.c}`,borderRadius:5,padding:'6px 10px',whiteSpace:'nowrap',fontSize:11.5,color:'#E2E8F0',boxShadow:'0 2px 8px rgba(0,0,0,0.5)'}}>
                      <div style={{fontWeight:600}}>{m.qty>1?m.qty+'× ':''}{nameOf(m)}</div>
                      {codeOf(m) && <div style={{fontSize:9,color:'#94A3B8',fontFamily:'monospace'}}>{codeOf(m)}</div>}
                      {m.room && <div style={{fontSize:9.5,color:'#94A3B8'}}>{m.room}</div>}
                      {showValues && <div style={{color:'#E8CFA0',marginTop:2}}>{fmt((m.sale_price||0)*(parseInt(m.qty)||1))}</div>}
                      <button onClick={()=>removeMarker(m.id)} title="Remover" style={{marginTop:5,background:'none',border:'1px solid #DC2626',color:'#F87171',borderRadius:4,fontSize:9,padding:'1px 6px',cursor:'pointer'}}>remover</button>
                    </div>}
                  </div>
                })}
              </div>
            </div>}

          {/* zoom */}
          <div style={{position:'absolute',right:16,bottom:16,display:'flex',flexDirection:'column',gap:6}}>
            <button onClick={()=>setZoom(z=>Math.min(4,+(z+0.2).toFixed(2)))} style={SC.zbtn}>+</button>
            <div style={{textAlign:'center',fontSize:10,color:'#94A3B8'}}>{Math.round(zoom*100)}%</div>
            <button onClick={()=>setZoom(z=>Math.max(0.4,+(z-0.2).toFixed(2)))} style={SC.zbtn}>−</button>
            <button onClick={()=>{setZoom(1);setPan({x:0,y:0})}} title="Resetar" style={{...SC.zbtn,fontSize:13}}><i className="ti ti-focus-2" aria-hidden/></button>
          </div>
          <div style={{position:'absolute',left:16,bottom:16,fontSize:11,color:'#64748B'}}>Arraste a planta · role para zoom · arraste os pontos · toque num ponto para ver o que é</div>
        </div>

        {/* Painel ADICIONAR ITENS (item 7) */}
        {showEditor && <div style={{width:280,borderLeft:'1px solid rgba(148,163,184,0.15)',display:'flex',flexDirection:'column',flexShrink:0}}>
          <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(148,163,184,0.15)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:13,fontWeight:600}}>Adicionar itens</span>
            <button onClick={()=>setShowEditor(false)} style={{background:'none',border:'none',color:'#64748B',cursor:'pointer',fontSize:16}}>×</button>
          </div>
          <div style={{padding:'10px 12px',display:'flex',flexDirection:'column',gap:8}}>
            <input value={catSearch} onChange={e=>setCatSearch(e.target.value)} placeholder="Buscar no catálogo..."
              style={{width:'100%',background:'#0E1622',border:'1px solid rgba(148,163,184,0.25)',borderRadius:8,padding:'8px 10px',color:'#E2E8F0',fontSize:12.5}}/>
            <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
              style={{width:'100%',background:'#0E1622',border:'1px solid rgba(148,163,184,0.25)',borderRadius:8,padding:'8px 10px',color:'#E2E8F0',fontSize:12.5}}>
              <option value="">Todas as categorias</option>
              {allCatNames.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'0 8px 12px'}}>
            {Object.keys(catalogGroups).length===0 && <div style={{color:'#64748B',fontSize:12,padding:'12px',textAlign:'center'}}>Nada encontrado.</div>}
            {Object.entries(catalogGroups).map(([grp,items])=>{
              const color=CAT_COLOR[grp]||'#6B7280'
              return <div key={grp} style={{marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:7,padding:'7px 8px',fontSize:10,letterSpacing:1,textTransform:'uppercase',color:'#94A3B8'}}>
                  <span style={{width:11,height:11,borderRadius:'50%',background:color}}/>{grp}
                </div>
                {items.slice(0,40).map((it,i)=>(
                  <button key={i} onClick={()=>addItem(it)} title="Adicionar no centro da planta"
                    style={{display:'flex',alignItems:'center',gap:8,width:'100%',background:'none',border:'none',padding:'6px 8px',cursor:'pointer',borderRadius:6,color:'#E2E8F0',textAlign:'left',fontSize:12}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(148,163,184,0.08)'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                    <i className="ti ti-plus" style={{fontSize:13,color:'#64748B'}} aria-hidden/>
                    <span style={{flex:1}}>{it.name}</span>
                  </button>
                ))}
              </div>
            })}
          </div>
          {/* Seções de filtro — igual ao executivo */}
          <div style={{borderTop:'1px solid rgba(148,163,184,0.15)'}}>
            {/* Resumo de itens */}
            <button onClick={()=>setOpenSec(s=>({...s,resumo:!s.resumo}))} style={SC.secBtn}>
              <i className={`ti ti-chevron-${openSec.resumo?'down':'right'}`} aria-hidden/><i className="ti ti-list-numbers" aria-hidden style={{color:'#E8CFA0'}}/> Resumo de itens {itemFilter&&<span style={{color:'#E8CFA0'}}>(filtrando)</span>}
            </button>
            {openSec.resumo && <div style={{padding:'4px 10px 12px'}}>
              {itemFilter && <button onClick={()=>setItemFilter('')} style={{width:'100%',marginBottom:8,fontSize:11,padding:'6px',borderRadius:6,border:'1px solid #C9A268',background:'rgba(201,162,104,0.15)',color:'#E8CFA0',cursor:'pointer'}}>✕ Mostrar todos os itens</button>}
              {itemResumo.length===0 && <div style={{fontSize:11,color:'#64748B'}}>Sem itens.</div>}
              {itemResumo.map(it=>{
                const color=CAT_COLOR[it.cat]||'#6B7280'; const sel=itemFilter===it.name
                const roomsTxt=Object.entries(it.rooms).map(([r,q])=>q>1?`${r} (${q})`:r).join(', ')
                return <button key={it.name} onClick={()=>setItemFilter(sel?'':it.name)} title="Clique para ver só este item no mapa"
                  style={{display:'block',width:'100%',textAlign:'left',background:sel?'rgba(201,162,104,0.12)':'none',border:`1px solid ${sel?'#C9A268':'transparent'}`,borderRadius:6,padding:'7px 8px',cursor:'pointer',marginBottom:3}}
                  onMouseEnter={e=>{if(!sel)e.currentTarget.style.background='rgba(148,163,184,0.08)'}} onMouseLeave={e=>{if(!sel)e.currentTarget.style.background='none'}}>
                  <div style={{display:'flex',alignItems:'center',gap:7,color:'#E2E8F0',fontSize:12}}>
                    <span style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/>
                    <b style={{color:'#E8CFA0',minWidth:22}}>{it.qty}</b>
                    <span style={{flex:1}}>{it.name}</span>
                  </div>
                  <div style={{fontSize:10,color:'#64748B',marginLeft:15,marginTop:1}}>{roomsTxt}</div>
                </button>
              })}
            </div>}
            {/* Buscar na planta */}
            <button onClick={()=>setOpenSec(s=>({...s,busca:!s.busca}))} style={SC.secBtn}>
              <i className={`ti ti-chevron-${openSec.busca?'down':'right'}`} aria-hidden/><i className="ti ti-search" aria-hidden style={{color:'#0EA5E9'}}/> Buscar na planta
            </button>
            {openSec.busca && <div style={{padding:'4px 12px 12px'}}>
              <input value={plantaSearch} onChange={e=>setPlantaSearch(e.target.value)} placeholder="Nome, código ou cômodo..."
                style={{width:'100%',background:'#0E1622',border:'1px solid rgba(148,163,184,0.25)',borderRadius:8,padding:'7px 10px',color:'#E2E8F0',fontSize:12}}/>
            </div>}
            {/* Filtrar cômodos */}
            <button onClick={()=>setOpenSec(s=>({...s,comodos:!s.comodos}))} style={SC.secBtn}>
              <i className={`ti ti-chevron-${openSec.comodos?'down':'right'}`} aria-hidden/><i className="ti ti-home" aria-hidden style={{color:'#C9A268'}}/> Filtrar cômodos {filterRooms.size>0&&<span style={{color:'#E8CFA0'}}>({filterRooms.size})</span>}
            </button>
            {openSec.comodos && <div style={{padding:'4px 12px 12px',display:'flex',flexWrap:'wrap',gap:6}}>
              {rooms.length===0 && <span style={{fontSize:11,color:'#64748B'}}>Sem cômodos definidos.</span>}
              {rooms.map(r=>{ const on=filterRooms.has(r); return <button key={r} onClick={()=>setFilterRooms(s=>{const n=new Set(s);n.has(r)?n.delete(r):n.add(r);return n})}
                style={{fontSize:11,padding:'4px 9px',borderRadius:12,border:`1px solid ${on?'#C9A268':'rgba(148,163,184,0.25)'}`,background:on?'rgba(201,162,104,0.15)':'none',color:on?'#E8CFA0':'#CBD5E1',cursor:'pointer'}}>{r}</button> })}
            </div>}
            {/* Filtrar categorias */}
            <button onClick={()=>setOpenSec(s=>({...s,cats:!s.cats}))} style={SC.secBtn}>
              <i className={`ti ti-chevron-${openSec.cats?'down':'right'}`} aria-hidden/><i className="ti ti-category" aria-hidden style={{color:'#059669'}}/> Filtrar categorias {hiddenCats.size>0&&<span style={{color:'#E8CFA0'}}>({cats.length-hiddenCats.size}/{cats.length})</span>}
            </button>
            {openSec.cats && <div style={{padding:'4px 12px 12px',display:'flex',flexWrap:'wrap',gap:6}}>
              {cats.map(c=>{ const on=!hiddenCats.has(c); const color=CAT_COLOR[c]||'#6B7280'; return <button key={c} onClick={()=>toggleCat(c)}
                style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,padding:'4px 9px',borderRadius:12,border:`1px solid ${on?color:'rgba(148,163,184,0.25)'}`,background:on?color+'22':'none',color:on?'#E2E8F0':'#64748B',cursor:'pointer',opacity:on?1:0.6}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:color}}/>{c}</button> })}
            </div>}
          </div>
        </div>}
      </div>

      {/* Rodapé */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderTop:'1px solid rgba(148,163,184,0.15)',flexShrink:0}}>
        <div style={{flex:1,fontSize:12,color:'#94A3B8'}}>{dirty?'● Alterações não salvas':'Sem alterações pendentes'}</div>
        <button onClick={salvar} disabled={saving||!dirty} style={{...SC.ghost,color:dirty?'#E2E8F0':'#64748B',cursor:dirty?'pointer':'default'}}><i className="ti ti-device-floppy" aria-hidden/> Salvar</button>
        <button onClick={importarParaExec} disabled={saving} style={SC.gold}><i className="ti ti-file-import" aria-hidden/> Importar para Projeto Executivo</button>
      </div>
    </div>
  )
}

const SC = {
  full:{position:'fixed',inset:0,zIndex:9999,background:'#0A0F16',color:'#E2E8F0',display:'flex',flexDirection:'column'},
  topbar:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:'1px solid rgba(148,163,184,0.15)',flexShrink:0},
  ghost:{background:'none',border:'1px solid rgba(148,163,184,0.3)',color:'#94A3B8',borderRadius:8,padding:'7px 12px',cursor:'pointer',fontSize:12,display:'inline-flex',alignItems:'center',gap:6},
  gold:{background:'#C9A268',border:'none',color:'#0A0F16',borderRadius:8,padding:'9px 18px',cursor:'pointer',fontSize:13,fontWeight:600,display:'inline-flex',alignItems:'center',gap:7},
  card:{display:'flex',alignItems:'center',gap:16,background:'#131A26',border:'1px solid rgba(148,163,184,0.15)',borderRadius:12,padding:'16px 20px',cursor:'pointer',textAlign:'left',color:'#E2E8F0',transition:'border-color .2s'},
  cardIcon:{width:44,height:44,borderRadius:10,background:'rgba(201,162,104,0.12)',border:'1px solid rgba(201,162,104,0.3)',display:'flex',alignItems:'center',justifyContent:'center',color:'#E8CFA0',fontSize:18,flexShrink:0},
  sectLabel:{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#64748B',marginBottom:10},
  zbtn:{width:36,height:36,borderRadius:8,background:'rgba(19,26,38,0.9)',border:'1px solid rgba(148,163,184,0.3)',color:'#E2E8F0',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'},
  secBtn:{display:'flex',alignItems:'center',gap:8,width:'100%',background:'none',border:'none',borderTop:'1px solid rgba(148,163,184,0.1)',padding:'10px 12px',cursor:'pointer',color:'#CBD5E1',textAlign:'left',fontSize:12,fontWeight:500},
}
