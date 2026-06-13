import { useState, useRef, useEffect, useCallback } from 'react'
import { inferCategory } from '../taxonomy.js'
import { saveProposal } from '../db/supabase.js'

// Cor por categoria (mesma paleta do app)
const CAT_STYLE = {
  'Segurança':   { color:'#DC2626', symbol:'S' },
  'Sonorização': { color:'#BE185D', symbol:'♪' },
  'Som':         { color:'#BE185D', symbol:'♪' },
  'Redes':       { color:'#0EA5E9', symbol:'W' },
  'Rede':        { color:'#0EA5E9', symbol:'W' },
  'Automação':   { color:'#059669', symbol:'A' },
  'Gourmet':     { color:'#D97706', symbol:'G' },
  'Elétrica':    { color:'#F59E0B', symbol:'E' },
  'CPD':         { color:'#7C3AED', symbol:'C' },
  'Outros':      { color:'#6B7280', symbol:'?' },
}
function catOf(it){
  if(it.category) return it.category
  const r=inferCategory(it.itemName||it.name||'')
  return r?.cat || 'Outros'
}
function styleOf(cat){ return CAT_STYLE[cat] || CAT_STYLE['Outros'] }
const fmt = v => 'R$\u202f' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

export default function AreaClientes({ clients=[], proposals=[], catalog=[], onRefresh, onClose }) {
  const [selProposal, setSelProposal] = useState(null)   // proposta escolhida
  const [markers, setMarkers]   = useState([])
  const [bgImage, setBgImage]   = useState(null)
  const [zoom, setZoom]         = useState(1)
  const [pan, setPan]           = useState({x:0,y:0})
  const [showValues, setShowValues] = useState(false)    // valor de venda começa OCULTO
  const [hiddenCats, setHiddenCats] = useState(new Set())
  const [selMarker, setSelMarker]   = useState(null)
  const [dirty, setDirty]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [dragMarker, setDragMarker] = useState(null)
  const [panning, setPanning]   = useState(null)
  const stageRef = useRef(null)

  // Propostas que têm planta com markers (executivo montado)
  const withPlanta = proposals.filter(p=>{
    const pd = typeof p.planta_data==='string' ? (()=>{try{return JSON.parse(p.planta_data)}catch{return null}})() : p.planta_data
    return pd && Array.isArray(pd.markers) && pd.markers.length>0
  })

  function openProposal(p){
    // prioriza a planta salva na Área de Clientes; senão usa a do Projeto Executivo
    const pc = typeof p.planta_cliente==='string' ? (()=>{try{return JSON.parse(p.planta_cliente)}catch{return null}})() : p.planta_cliente
    const pdExec = typeof p.planta_data==='string' ? JSON.parse(p.planta_data) : p.planta_data
    const pd = (pc && Array.isArray(pc.markers) && pc.markers.length) ? pc : pdExec
    // monta markers enriquecidos com categoria e preço de venda (do catálogo)
    const enriched = (pd.markers||[]).map(m=>{
      const cat = m.category || inferCategory(m.itemName||'').cat || 'Outros'
      const cat0 = catalog.find(c=>c.code===m.itemCode)
      const sale = m.sale_price ?? cat0?.sale_price ?? 0
      return { ...m, category:cat, sale_price:sale }
    })
    setSelProposal(p); setBgImage(pd.image||null); setMarkers(enriched)
    setZoom(1); setPan({x:0,y:0}); setShowValues(false); setHiddenCats(new Set()); setSelMarker(null); setDirty(false)
  }

  // ── Zoom com a roda do mouse ──
  function onWheel(e){
    if(!bgImage) return
    e.preventDefault()
    const delta = e.deltaY<0 ? 0.12 : -0.12
    setZoom(z=>Math.min(4, Math.max(0.4, +(z+delta).toFixed(2))))
  }

  // ── Pan (arrastar a planta) ──
  function onStageMouseDown(e){
    if(e.target.closest('.mk')) return // clicou num marker
    setPanning({sx:e.clientX, sy:e.clientY, ox:pan.x, oy:pan.y})
  }
  const onMouseMove = useCallback((e)=>{
    if(dragMarker){
      const rect = stageRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left - pan.x)/(rect.width*zoom))*100
      const y = ((e.clientY - rect.top - pan.y)/(rect.height*zoom))*100
      setMarkers(ms=>ms.map(m=>m.id===dragMarker?{...m,x:Math.max(0,Math.min(100,x)),y:Math.max(0,Math.min(100,y))}:m))
      setDirty(true)
    } else if(panning){
      setPan({x:panning.ox+(e.clientX-panning.sx), y:panning.oy+(e.clientY-panning.sy)})
    }
  },[dragMarker, panning, pan, zoom])
  const onMouseUp = useCallback(()=>{ setDragMarker(null); setPanning(null) },[])
  useEffect(()=>{
    if(dragMarker||panning){
      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      return ()=>{ window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
    }
  },[dragMarker, panning, onMouseMove, onMouseUp])

  // categorias presentes
  const cats = [...new Set(markers.map(m=>catOf(m)))].sort()
  const visMarkers = markers.filter(m=>!hiddenCats.has(catOf(m)))
  const toggleCat = c => setHiddenCats(s=>{ const n=new Set(s); n.has(c)?n.delete(c):n.add(c); return n })

  // total de venda (só visíveis)
  const totalVenda = visMarkers.reduce((s,m)=>s+(m.sale_price||0)*(parseInt(m.qty)||1),0)

  // ── Salvar: grava planta_data nova SEM tocar no exec_doc ──
  async function salvar(){
    if(!selProposal) return
    setSaving(true)
    try {
      // grava numa cópia SEPARADA (planta_cliente) — não altera a planta_data do Projeto Executivo
      const updated = { ...selProposal, planta_cliente:{ image:bgImage, markers, updatedAt:new Date().toISOString() } }
      const saved = await saveProposal(updated)
      setSelProposal(saved||updated); setDirty(false)
      alert('✓ Alterações salvas na Área de Clientes.\nO Projeto Executivo NÃO foi alterado.')
      onRefresh && onRefresh()
    } catch(e){ alert('Erro ao salvar: '+e.message) }
    finally{ setSaving(false) }
  }

  // ── Importar para o Projeto Executivo: substitui o vigente ──
  async function importarParaExec(){
    if(!selProposal) return
    if(!window.confirm('Isto vai SUBSTITUIR a planta do Projeto Executivo vigente desta proposta pelos itens posicionados aqui. Continuar?')) return
    setSaving(true)
    try {
      const pd = typeof selProposal.planta_data==='string' ? JSON.parse(selProposal.planta_data) : (selProposal.planta_data||{})
      // substitui a planta do executivo (image + markers viram a planta oficial)
      const updated = { ...selProposal, planta_data:{ ...pd, image:bgImage, markers, importedFromClientArea:new Date().toISOString() } }
      const saved = await saveProposal(updated)
      setSelProposal(saved||updated); setDirty(false)
      alert('✓ Planta importada para o Projeto Executivo. O executivo agora reflete o que você posicionou aqui.')
      onRefresh && onRefresh()
    } catch(e){ alert('Erro ao importar: '+e.message) }
    finally{ setSaving(false) }
  }

  const clientName = (p)=>{
    if(p.client_name) return p.client_name
    const c=clients.find(x=>x.id===Number(p.client_id))
    return c?`${c.name1}${c.name2?' & '+c.name2:''}`:'Cliente'
  }

  // ─────────────────────────────────────────────────────────────
  // TELA DE SELEÇÃO (quando nenhuma proposta aberta)
  // ─────────────────────────────────────────────────────────────
  if(!selProposal){
    return (
      <div style={{position:'fixed',inset:0,zIndex:9999,background:'#0A0F16',color:'#E2E8F0',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid rgba(148,163,184,0.15)'}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:20,letterSpacing:2}}>Área de Clientes</div>
          <button onClick={onClose} style={{background:'none',border:'1px solid rgba(148,163,184,0.3)',color:'#94A3B8',borderRadius:8,padding:'8px 16px',cursor:'pointer',fontSize:13}}>✕ Sair</button>
        </div>
        <div style={{flex:1,overflowY:'auto',padding:'28px 24px',maxWidth:760,margin:'0 auto',width:'100%'}}>
          <div style={{fontSize:13,color:'#94A3B8',marginBottom:20}}>Selecione um cliente para abrir a planta do projeto e apresentar na tela. Mostra apenas projetos que já têm a planta montada.</div>
          {withPlanta.length===0
            ? <div style={{textAlign:'center',color:'#64748B',padding:'60px 20px',fontSize:14}}>Nenhum projeto com planta montada ainda.<br/>Monte a planta no Projeto Executivo de uma proposta primeiro.</div>
            : <div style={{display:'grid',gap:12}}>
              {withPlanta.map(p=>{
                const pd=typeof p.planta_data==='string'?JSON.parse(p.planta_data):p.planta_data
                const nMarkers=(pd.markers||[]).length
                return <button key={p.id} onClick={()=>openProposal(p)}
                  style={{display:'flex',alignItems:'center',gap:16,background:'#131A26',border:'1px solid rgba(148,163,184,0.15)',borderRadius:12,padding:'16px 20px',cursor:'pointer',textAlign:'left',color:'#E2E8F0',transition:'border-color .2s'}}
                  onMouseEnter={e=>e.currentTarget.style.borderColor='#C9A268'}
                  onMouseLeave={e=>e.currentTarget.style.borderColor='rgba(148,163,184,0.15)'}>
                  <div style={{width:44,height:44,borderRadius:10,background:'rgba(201,162,104,0.12)',border:'1px solid rgba(201,162,104,0.3)',display:'flex',alignItems:'center',justifyContent:'center',color:'#E8CFA0',fontSize:18,flexShrink:0}}>
                    <i className="ti ti-map-2" aria-hidden/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:16,fontWeight:600}}>{clientName(p)}</div>
                    <div style={{fontSize:12,color:'#94A3B8'}}>{p.code||'—'} · {p.neighborhood||''} · {nMarkers} itens na planta</div>
                  </div>
                  <i className="ti ti-chevron-right" style={{color:'#64748B'}} aria-hidden/>
                </button>
              })}
            </div>}
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // MODO APRESENTAÇÃO (planta aberta)
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'#0A0F16',color:'#E2E8F0',display:'flex',flexDirection:'column',userSelect:'none'}}>
      {/* Topo */}
      <div style={{display:'flex',alignItems:'center',gap:14,padding:'12px 20px',borderBottom:'1px solid rgba(148,163,184,0.15)',flexShrink:0}}>
        <button onClick={()=>{ if(dirty&&!window.confirm('Há alterações não salvas. Sair mesmo assim?'))return; setSelProposal(null) }}
          style={{background:'none',border:'1px solid rgba(148,163,184,0.3)',color:'#94A3B8',borderRadius:8,padding:'7px 12px',cursor:'pointer',fontSize:12}}>‹ Clientes</button>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:18}}>{clientName(selProposal)}</div>
          <div style={{fontSize:11,color:'#94A3B8'}}>{selProposal.code||''} · {visMarkers.length} itens visíveis</div>
        </div>
        {/* valor de venda — começa oculto */}
        <button onClick={()=>setShowValues(v=>!v)} title={showValues?'Ocultar valor':'Revelar valor de venda'}
          style={{display:'flex',alignItems:'center',gap:8,background:showValues?'rgba(201,162,104,0.15)':'none',border:'1px solid rgba(201,162,104,0.4)',color:'#E8CFA0',borderRadius:8,padding:'7px 14px',cursor:'pointer',fontSize:13}}>
          <i className={showValues?'ti ti-eye':'ti ti-eye-off'} aria-hidden/>
          {showValues ? fmt(totalVenda) : 'Ver valor'}
        </button>
        <button onClick={onClose} style={{background:'none',border:'1px solid rgba(148,163,184,0.3)',color:'#94A3B8',borderRadius:8,padding:'7px 12px',cursor:'pointer',fontSize:12}}>✕ Sair</button>
      </div>

      <div style={{flex:1,display:'flex',minHeight:0}}>
        {/* Sidebar de categorias */}
        <div style={{width:210,borderRight:'1px solid rgba(148,163,184,0.15)',padding:'16px 14px',overflowY:'auto',flexShrink:0}}>
          <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#64748B',marginBottom:10}}>Categorias</div>
          {cats.map(c=>{
            const st=styleOf(c); const n=markers.filter(m=>catOf(m)===c).length; const off=hiddenCats.has(c)
            return <button key={c} onClick={()=>toggleCat(c)}
              style={{display:'flex',alignItems:'center',gap:9,width:'100%',background:'none',border:'none',padding:'7px 6px',cursor:'pointer',borderRadius:6,opacity:off?0.4:1,color:'#E2E8F0',textAlign:'left'}}>
              <span style={{width:18,height:18,borderRadius:'50%',background:st.color,color:'#fff',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{st.symbol}</span>
              <span style={{flex:1,fontSize:12.5}}>{c}</span>
              <span style={{fontSize:11,color:'#64748B'}}>{n}</span>
              <i className={off?'ti ti-eye-off':'ti ti-eye'} style={{fontSize:13,color:'#64748B'}} aria-hidden/>
            </button>
          })}
          {showValues && <div style={{marginTop:16,paddingTop:14,borderTop:'1px solid rgba(148,163,184,0.15)'}}>
            <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#64748B',marginBottom:8}}>Valor por categoria</div>
            {cats.filter(c=>!hiddenCats.has(c)).map(c=>{
              const v=markers.filter(m=>catOf(m)===c).reduce((s,m)=>s+(m.sale_price||0)*(parseInt(m.qty)||1),0)
              return <div key={c} style={{display:'flex',justifyContent:'space-between',fontSize:11.5,padding:'2px 0',color:'#CBD5E1'}}><span>{c}</span><span>{fmt(v)}</span></div>
            })}
          </div>}
        </div>

        {/* Palco da planta */}
        <div ref={stageRef} onWheel={onWheel} onMouseDown={onStageMouseDown}
          style={{flex:1,overflow:'hidden',position:'relative',background:'#0E1622',cursor:panning?'grabbing':'grab'}}>
          {!bgImage
            ? <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',color:'#64748B',fontSize:14}}>Esta proposta não tem imagem de planta.</div>
            : <div style={{position:'absolute',left:'50%',top:'50%',transform:`translate(-50%,-50%) translate(${pan.x}px,${pan.y}px) scale(${zoom})`,transformOrigin:'center center',transition:panning||dragMarker?'none':'transform .12s'}}>
              <div style={{position:'relative',display:'inline-block'}}>
                <img src={bgImage} draggable={false} style={{display:'block',maxWidth:'min(86vw,1200px)',maxHeight:'82vh',pointerEvents:'none'}}/>
                {visMarkers.map(m=>{
                  const st=styleOf(catOf(m)); const sel=selMarker===m.id
                  return <div key={m.id} className="mk"
                    onMouseDown={e=>{ e.stopPropagation(); setSelMarker(m.id); setDragMarker(m.id) }}
                    style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%,-50%)',zIndex:sel?20:10,cursor:'move'}}>
                    <div style={{width:24,height:24,borderRadius:'50%',background:st.color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,border:`2px solid ${sel?'#E8CFA0':'#fff'}`,boxShadow:'0 1px 5px rgba(0,0,0,0.5)'}}>{st.symbol}</div>
                    {sel && <div style={{position:'absolute',left:28,top:-4,background:'rgba(10,15,22,0.95)',border:`1px solid ${st.color}`,borderRadius:5,padding:'4px 8px',whiteSpace:'nowrap',fontSize:11,color:'#E2E8F0',boxShadow:'0 2px 8px rgba(0,0,0,0.5)'}}>
                      {m.qty>1?m.qty+'× ':''}{m.itemName}
                      {showValues && <span style={{color:'#E8CFA0',marginLeft:6}}>{fmt((m.sale_price||0)*(parseInt(m.qty)||1))}</span>}
                      {m.room && <div style={{fontSize:9,color:'#94A3B8'}}>{m.room}</div>}
                    </div>}
                  </div>
                })}
              </div>
            </div>}

          {/* controles de zoom */}
          <div style={{position:'absolute',right:16,bottom:16,display:'flex',flexDirection:'column',gap:6}}>
            <button onClick={()=>setZoom(z=>Math.min(4,+(z+0.2).toFixed(2)))} style={zbtn}>+</button>
            <div style={{textAlign:'center',fontSize:10,color:'#94A3B8'}}>{Math.round(zoom*100)}%</div>
            <button onClick={()=>setZoom(z=>Math.max(0.4,+(z-0.2).toFixed(2)))} style={zbtn}>−</button>
            <button onClick={()=>{setZoom(1);setPan({x:0,y:0})}} title="Resetar" style={{...zbtn,fontSize:13}}><i className="ti ti-focus-2" aria-hidden/></button>
          </div>
          <div style={{position:'absolute',left:16,bottom:16,fontSize:11,color:'#64748B'}}>Arraste a planta para mover · role para zoom · arraste os pontos para reposicionar</div>
        </div>
      </div>

      {/* Rodapé com ações */}
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderTop:'1px solid rgba(148,163,184,0.15)',flexShrink:0}}>
        <div style={{flex:1,fontSize:12,color:'#94A3B8'}}>{dirty?'● Alterações não salvas':'Sem alterações pendentes'}</div>
        <button onClick={salvar} disabled={saving||!dirty}
          style={{background:'none',border:'1px solid rgba(148,163,184,0.4)',color:dirty?'#E2E8F0':'#64748B',borderRadius:8,padding:'9px 18px',cursor:dirty?'pointer':'default',fontSize:13,display:'flex',alignItems:'center',gap:7}}>
          <i className="ti ti-device-floppy" aria-hidden/>Salvar
        </button>
        <button onClick={importarParaExec} disabled={saving}
          style={{background:'#C9A268',border:'none',color:'#0A0F16',borderRadius:8,padding:'9px 20px',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:7}}>
          <i className="ti ti-file-import" aria-hidden/>Importar para Projeto Executivo
        </button>
      </div>
    </div>
  )
}

const zbtn = { width:36,height:36,borderRadius:8,background:'rgba(19,26,38,0.9)',border:'1px solid rgba(148,163,184,0.3)',color:'#E2E8F0',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center' }
