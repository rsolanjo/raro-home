import { useState, useRef, useEffect, useCallback } from 'react'

// Equipment type → color and icon for markers
const EQUIP_STYLE = {
  'Gateway':    { color:'#0EA5E9', bg:'#E0F2FE', symbol:'G', label:'Gateway' },
  'NVR':        { color:'#7C3AED', bg:'#F3E8FF', symbol:'N', label:'NVR' },
  'Câmera':     { color:'#DC2626', bg:'#FEE2E2', symbol:'C', label:'Câmera' },
  'Keypad':     { color:'#059669', bg:'#D1FAE5', symbol:'K', label:'Keypad' },
  'Hub IR':     { color:'#D97706', bg:'#FEF3C7', symbol:'I', label:'Hub IR' },
  'Módulo':     { color:'#6366F1', bg:'#EEF2FF', symbol:'M', label:'Módulo' },
  'Tomada':     { color:'#64748B', bg:'#F1F5F9', symbol:'T', label:'Tomada' },
  'Outro':      { color:'#374151', bg:'#F9FAFB', symbol:'?', label:'Outro' },
}

function getEquipType(name='') {
  const n = name.toLowerCase()
  if(n.includes('gateway')) return 'Gateway'
  if(n.includes('nvr') || n.includes('gravador')) return 'NVR'
  if(n.includes('câmera') || n.includes('camera') || n.includes('dome')) return 'Câmera'
  if(n.includes('keypad') || n.includes('hub ir') || n.includes('botão')) {
    if(n.includes('hub ir') || n.includes('qair')) return 'Hub IR'
    return 'Keypad'
  }
  if(n.includes('módulo') || n.includes('modulo') || n.includes('qarz')) return 'Módulo'
  if(n.includes('tomada')) return 'Tomada'
  return 'Outro'
}

// Render first page of PDF to base64 image
async function pdfToImage(base64Pdf) {
  return new Promise((resolve, reject) => {
    function render() {
      const lib = window.pdfjsLib
      lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
      const bytes = Uint8Array.from(atob(base64Pdf),c=>c.charCodeAt(0))
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


// Reduz imagem grande para caber no limite do proxy (max ~1600px, JPEG)
async function downscaleImage(dataUrl, maxDim=1600, quality=0.85) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width:w, height:h } = img
      if (w <= maxDim && h <= maxDim) { resolve(dataUrl); return }
      const scale = maxDim / Math.max(w, h)
      const cv = document.createElement('canvas')
      cv.width = Math.round(w*scale); cv.height = Math.round(h*scale)
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height)
      resolve(cv.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

export default function PlantaEditor({ floors=[], catalog=[], onUpdateFloors, onSavePlan, savedPlan, onClose }) {
  const [suggesting, setSuggesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [bgImage, setBgImage]         = useState(null)
  const [markers, setMarkers]         = useState([]) // {id, x%, y%, itemCode, itemName, room, qty, note}
  const [dragging, setDragging]       = useState(null) // {markerId, startX, startY}
  const [selected, setSelected]       = useState(null)
  const [addMode, setAddMode]         = useState(false)
  const [addItem, setAddItem]         = useState(null)
  const [showAI, setShowAI]           = useState(false)
  const [aiMsg, setAiMsg]             = useState('')
  const [aiLoading, setAiLoading]     = useState(false)
  const [pendingAction, setPendingAction] = useState(null)
  const [step, setStep]               = useState('upload') // upload | edit
  const [showLegend, setShowLegend]   = useState(true)
  const containerRef  = useRef()
  const fileRef       = useRef()
  let markerIdCounter = useRef(1000)

  // Convert floors/rooms/items to initial markers (auto-placed in a grid)
  useEffect(() => {
    if(!floors.length || markers.length > 0) return
    const allItems = []
    floors.forEach(f => {
      ;(f.rooms||[]).forEach(r => {
        ;(r.items||[]).forEach(it => {
          if(it.name) allItems.push({
            id: markerIdCounter.current++,
            x: 10 + (allItems.length % 8) * 11,
            y: 10 + Math.floor(allItems.length / 8) * 12,
            itemCode: it.code,
            itemName: it.name,
            room: r.name,
            qty: parseInt(it.qty)||1,
            note: '',
          })
        })
      })
    })
    setMarkers(allItems)
  }, [floors])


  // Restaurar planta salva ao abrir
  useEffect(() => {
    if(savedPlan?.image && !bgImage) {
      setBgImage(savedPlan.image)
      if(savedPlan.markers?.length) setMarkers(savedPlan.markers)
      setStep('edit')
    }
  }, [savedPlan])

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const dataUrl = ev.target.result
      if(file.type==='application/pdf') {
        try {
          const rendered = await pdfToImage(dataUrl.split(',')[1])
          setBgImage(rendered)
        } catch(e) { alert('Erro ao renderizar PDF: '+e.message); return }
      } else {
        setBgImage(dataUrl)
      }
      setStep('edit')
    }
    reader.readAsDataURL(file)
  }

  // Mouse drag handlers
  function onMouseDown(e, markerId) {
    e.preventDefault(); e.stopPropagation()
    setSelected(markerId)
    const rect = containerRef.current.getBoundingClientRect()
    setDragging({ markerId, ox: e.clientX, oy: e.clientY, rect })
  }

  const onMouseMove = useCallback((e) => {
    if(!dragging) return
    const { markerId, ox, oy, rect } = dragging
    const dx = ((e.clientX - ox) / rect.width) * 100
    const dy = ((e.clientY - oy) / rect.height) * 100
    setMarkers(ms => ms.map(m => m.id !== markerId ? m : {
      ...m,
      x: Math.max(0, Math.min(98, m.x + dx)),
      y: Math.max(0, Math.min(96, m.y + dy)),
    }))
    setDragging(d => ({ ...d, ox: e.clientX, oy: e.clientY }))
  }, [dragging])

  const onMouseUp = useCallback(() => { setDragging(null) }, [])

  useEffect(() => {
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => { window.removeEventListener('mousemove', onMouseMove); window.removeEventListener('mouseup', onMouseUp) }
  }, [onMouseMove, onMouseUp])

  // Click on canvas to add marker
  function onCanvasClick(e) {
    if(!addMode || !addItem) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMarkers(ms => [...ms, {
      id: markerIdCounter.current++,
      x, y,
      itemCode: addItem.code,
      itemName: addItem.name,
      room: '',
      qty: 1,
      note: '',
    }])
    setAddMode(false)
    setAddItem(null)
  }

  // AI risk analysis
  async function analyzeWithAI(action, item, context='') {
    setAiLoading(true); setAiMsg('')
    const roomsSummary = floors.flatMap(f=>(f.rooms||[]).map(r=>`${r.name}: ${(r.items||[]).map(i=>i.name).join(', ')}`)).join('\n')
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514', max_tokens: 600,
          messages: [{role:'user', content:
            `Você é um especialista em automação residencial Zigbee/Matter da RARO Home.
Analise esta ação e dê um parecer técnico objetivo em português, máximo 3 parágrafos curtos.

AÇÃO: ${action === 'add' ? 'ADICIONAR' : 'REMOVER'} equipamento
EQUIPAMENTO: ${item?.itemName || item?.name} (${item?.itemCode || item?.code})
AMBIENTE: ${item?.room || context}

PROJETO ATUAL:
${roomsSummary}

${action === 'remove'
  ? 'Quais são os riscos ou impactos de remover este equipamento? A automação do ambiente ainda funcionará? O que fica comprometido?'
  : 'Faz sentido adicionar este equipamento? Justifique tecnicamente. Há algo que falta junto a ele para funcionar corretamente?'}

Seja direto. Use ✅ para recomendação positiva, ⚠️ para ressalva, ❌ para contra-indicação.`
          }]
        })
      })
      const data = await res.json()
      setAiMsg(data.content?.[0]?.text || 'Sem resposta')
    } catch(e) { setAiMsg('❌ Erro ao consultar IA: ' + e.message) }
    setAiLoading(false)
  }

  // ── IA sugere posições de TODOS os equipamentos sobre a planta ──
  async function suggestPositions() {
    if(!bgImage) { alert('Carregue a planta primeiro.'); return }
    setSuggesting(true)
    // Lista de itens a posicionar (dos marcadores atuais OU dos itens do orçamento)
    const itemList = markers.length
      ? markers.map(m=>`${m.itemCode}: ${m.itemName} (${m.room||'sem ambiente'})`)
      : floors.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[]).map(i=>`${i.code}: ${i.name} (${r.name})`)))
    try {
      const small = await downscaleImage(bgImage)
      const finalImg = small.split(',')[1]
      const mime = small.substring(5, small.indexOf(';'))
      const res = await fetch('/api/claude', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:4000,
          messages:[{role:'user', content:[
            { type:'image', source:{ type:'base64', media_type:mime, data:finalImg } },
            { type:'text', text:
`Você é um especialista em automação residencial Zigbee/Matter da RARO Home.
Esta é a planta baixa de um apartamento. Preciso posicionar os equipamentos abaixo no MELHOR lugar de cada cômodo, seguindo boas práticas:
- Keypad: ao lado da porta de cada ambiente (lado da maçaneta)
- Câmera: canto superior cobrindo o ambiente
- Hub IR: só em ambientes com ar-condicionado, com visão do aparelho
- Caixa de som: no teto, distribuída
- Sensor presença: entrada/corredor
- Gateway/NVR/rack: ponto central discreto (sala)
- Módulo: forro (luz) ou janela (cortina)

EQUIPAMENTOS A POSICIONAR:
${itemList.join('\n')}

Responda APENAS com JSON (sem markdown):
{"posicoes":[{"code":"QAT42Z2B","room":"Cozinha","x":42,"y":30,"nota":"ao lado da porta"}]}
onde x e y são porcentagens (0-100) da imagem da planta (x=esquerda→direita, y=topo→baixo).` }
          ]}]
        })
      })
      const data = await res.json()
      let txt = data.content?.[0]?.text || ''
      if(txt.includes('```')) txt = txt.replace(/```json?\n?/g,'').replace(/```/g,'')
      const parsed = JSON.parse(txt.trim())
      let cid = Date.now()
      const newMarkers = (parsed.posicoes||[]).map(p=>{
        const cat = catalog.find(c=>c.code===p.code)
        return {
          id: cid++,
          x: Math.max(2, Math.min(98, p.x)),
          y: Math.max(2, Math.min(96, p.y)),
          itemCode: p.code,
          itemName: cat?.name || p.code,
          room: p.room || '',
          qty: 1,
          note: p.nota || '',
        }
      })
      if(newMarkers.length) {
        setMarkers(newMarkers)
        setAiMsg('✅ ' + newMarkers.length + ' equipamentos posicionados pela IA. Ajuste arrastando cada um.')
        setShowAI(true); setPendingAction(null)
      } else {
        setAiMsg('A IA não retornou posições. Tente novamente.')
        setShowAI(true)
      }
    } catch(e) {
      setAiMsg('❌ Erro ao sugerir posições: ' + e.message)
      setShowAI(true)
    }
    setSuggesting(false)
  }

  // ── Salvar planta marcada no projeto (Supabase via onSavePlan) ──
  async function savePlan() {
    if(!onSavePlan) return
    setSaving(true)
    try {
      await onSavePlan({ image: bgImage, markers })
      setSaved(true)
      setTimeout(()=>setSaved(false), 2500)
    } catch(e) { alert('Erro ao salvar: '+e.message) }
    setSaving(false)
  }

  function removeMarker(id) {
    const m = markers.find(x=>x.id===id)
    setPendingAction({type:'remove', marker:m})
    setShowAI(true)
    analyzeWithAI('remove', m)
  }

  function confirmRemove() {
    if(pendingAction?.marker) {
      setMarkers(ms => ms.filter(m => m.id !== pendingAction.marker.id))
    }
    setShowAI(false); setPendingAction(null); setSelected(null)
  }

  // Print
  function doPrint() {
    if(!bgImage) return
    const markerHtml = markers.map(m => {
      const style = EQUIP_STYLE[getEquipType(m.itemName)] || EQUIP_STYLE['Outro']
      return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:10">
        <div style="width:22px;height:22px;border-radius:50%;background:${style.color};color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.4);font-family:sans-serif">${style.symbol}</div>
        <div style="position:absolute;left:24px;top:-2px;background:rgba(255,255,255,0.95);border:1px solid ${style.color};border-radius:3px;padding:2px 5px;font-size:9px;white-space:nowrap;font-family:sans-serif;font-weight:600;color:${style.color};box-shadow:0 1px 3px rgba(0,0,0,0.2)">${m.qty>1?m.qty+'× ':''}${m.itemCode}</div>
      </div>`
    }).join('')
    const legendItems = Object.entries(EQUIP_STYLE).filter(([k])=>markers.some(m=>getEquipType(m.itemName)===k))
    const legendHtml = legendItems.map(([k,v])=>`<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
      <div style="width:16px;height:16px;border-radius:50%;background:${v.color};color:#fff;font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center">${v.symbol}</div>
      <span style="font-size:10px;font-family:sans-serif">${v.label}</span>
    </div>`).join('')
    const w = window.open('','_blank')
    w.document.write(`<html><head><title>Planta de Automação RARO Home</title>
    <style>@page{size:A2 landscape;margin:15mm}body{margin:0;padding:0}@media print{.no-print{display:none}}</style>
    </head><body>
    <div style="position:relative;width:100%">
      <img src="${bgImage}" style="width:100%;display:block"/>
      ${markerHtml}
    </div>
    <div style="position:fixed;bottom:15mm;right:15mm;background:#fff;border:1px solid #ccc;padding:10px;border-radius:4px">
      <div style="font-size:11px;font-weight:700;font-family:sans-serif;margin-bottom:6px;color:#0369A1">RARO Home — Legenda</div>
      ${legendHtml}
      <div style="font-size:8px;color:#999;margin-top:6px;font-family:sans-serif">rarohome.com.br · (21) 98170-9009</div>
    </div>
    <div class="no-print" style="text-align:center;padding:20px">
      <button onclick="window.print()" style="padding:10px 24px;background:#0EA5E9;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer">Imprimir / Salvar PDF</button>
    </div>
    </body></html>`)
    w.document.close()
  }

  const selMarker = markers.find(m=>m.id===selected)
  const typeCounts = {}
  markers.forEach(m=>{ const t=getEquipType(m.itemName); typeCounts[t]=(typeCounts[t]||0)+1 })

  // Group catalog items for add panel
  const catalogGroups = {}
  ;(catalog||[]).forEach(c => {
    const g = c.category||'Outro'
    if(!catalogGroups[g]) catalogGroups[g]=[]
    catalogGroups[g].push(c)
  })

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:1000,display:'flex',flexDirection:'column'}}>
      
      {/* Toolbar */}
      <div style={{background:'#060B1A',padding:'8px 16px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
        <button onClick={onClose} style={{background:'none',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',padding:'5px 10px',borderRadius:5,cursor:'pointer',fontSize:12,display:'flex',alignItems:'center',gap:4}}>
          <i className="ti ti-arrow-left" aria-hidden/>Sair
        </button>
        <div style={{color:'#38BDF8',fontWeight:600,fontSize:13}}>
          <i className="ti ti-map-pin" style={{marginRight:6}} aria-hidden/>Editor de Planta — Automação
        </div>
        <div style={{flex:1}}/>
        {step==='edit' && <>
          <button
            onClick={()=>fileRef.current?.click()}
            style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',padding:'5px 12px',borderRadius:5,cursor:'pointer',fontSize:11}}>
            <i className="ti ti-upload" style={{marginRight:4}} aria-hidden/>Trocar planta
          </button>
          <button
            onClick={()=>setShowLegend(l=>!l)}
            style={{background:showLegend?'rgba(14,165,233,0.3)':'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',padding:'5px 12px',borderRadius:5,cursor:'pointer',fontSize:11}}>
            <i className="ti ti-list" style={{marginRight:4}} aria-hidden/>Legenda
          </button>
          <button onClick={suggestPositions} disabled={suggesting}
            style={{background:suggesting?'rgba(124,58,237,0.4)':'#7C3AED',border:'none',color:'#fff',padding:'6px 14px',borderRadius:5,cursor:suggesting?'wait':'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-sparkles" aria-hidden/>{suggesting?'Analisando...':'IA sugere posições'}
          </button>
          {onSavePlan && <button onClick={savePlan} disabled={saving}
            style={{background:saved?'#059669':'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',padding:'6px 14px',borderRadius:5,cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
            <i className={`ti ${saved?'ti-check':'ti-device-floppy'}`} aria-hidden/>{saved?'Salvo!':saving?'Salvando...':'Salvar'}
          </button>}
          <button onClick={doPrint}
            style={{background:'#0EA5E9',border:'none',color:'#fff',padding:'6px 14px',borderRadius:5,cursor:'pointer',fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:5}}>
            <i className="ti ti-printer" aria-hidden/>Exportar PDF
          </button>
        </>}
        <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleFileUpload}/>
      </div>

      {/* Main area */}
      {step==='upload' ? (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{textAlign:'center',color:'#fff'}}>
            <i className="ti ti-upload" style={{fontSize:48,display:'block',marginBottom:16,color:'#38BDF8'}} aria-hidden/>
            <div style={{fontSize:18,fontWeight:600,marginBottom:8}}>Carregue a planta do apartamento</div>
            <div style={{fontSize:13,color:'rgba(255,255,255,0.5)',marginBottom:24}}>JPG ou PNG — converta o PDF para imagem primeiro</div>
            <button onClick={()=>fileRef.current?.click()}
              style={{background:'#0EA5E9',border:'none',color:'#fff',padding:'12px 28px',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:600}}>
              Selecionar imagem da planta
            </button>
            <div style={{marginTop:16,fontSize:11,color:'rgba(255,255,255,0.3)'}}>
              Aceita imagens e PDF — converte automaticamente
            </div>
          </div>
        </div>
      ) : (
        <div style={{flex:1,display:'flex',overflow:'hidden'}}>

          {/* Left panel — catalog / add */}
          <div style={{width:240,background:'#0f172a',borderRight:'1px solid rgba(255,255,255,0.08)',overflowY:'auto',flexShrink:0}}>
            <div style={{padding:'12px',borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>
                Adicionar equipamento
              </div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:8}}>
                Selecione e clique na planta para posicionar
              </div>
              {addMode && addItem && (
                <div style={{background:'rgba(14,165,233,0.15)',border:'1px solid #0EA5E9',borderRadius:5,padding:'6px 8px',marginBottom:8,fontSize:11,color:'#38BDF8'}}>
                  <i className="ti ti-crosshair" style={{marginRight:4}} aria-hidden/>
                  Clique na planta para posicionar<br/><b>{addItem.name}</b>
                  <button onClick={()=>{setAddMode(false);setAddItem(null)}} style={{display:'block',marginTop:4,background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontSize:10}}>cancelar</button>
                </div>
              )}
            </div>
            {Object.entries(catalogGroups).map(([group, items]) => (
              <div key={group}>
                <div style={{padding:'8px 12px 4px',fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:1}}>{group}</div>
                {items.map((item,i)=>{
                  const st = EQUIP_STYLE[getEquipType(item.name)]||EQUIP_STYLE['Outro']
                  return <div key={i}
                    onClick={()=>{ setAddItem(item); setAddMode(true) }}
                    style={{padding:'7px 12px',cursor:'pointer',display:'flex',alignItems:'center',gap:8,
                      background:addItem?.code===item.code?'rgba(14,165,233,0.15)':'transparent',
                      transition:'background .1s'}}
                    onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'}
                    onMouseLeave={e=>e.currentTarget.style.background=addItem?.code===item.code?'rgba(14,165,233,0.15)':'transparent'}>
                    <div style={{width:20,height:20,borderRadius:'50%',background:st.color,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:9,fontWeight:800,flexShrink:0}}>{st.symbol}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.8)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.name}</div>
                      <div style={{fontSize:9,color:'rgba(255,255,255,0.3)'}}>{item.code}</div>
                    </div>
                  </div>
                })}
              </div>
            ))}
          </div>

          {/* Floor plan canvas */}
          <div style={{flex:1,overflow:'auto',background:'#1a1a2e',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20}}>
            <div
              ref={containerRef}
              style={{position:'relative',display:'inline-block',cursor:addMode?'crosshair':'default'}}
              onClick={onCanvasClick}>
              <img src={bgImage} style={{display:'block',maxWidth:'100%',userSelect:'none',pointerEvents:'none'}} draggable={false}/>
              
              {/* Markers */}
              {markers.map(m => {
                const st = EQUIP_STYLE[getEquipType(m.itemName)]||EQUIP_STYLE['Outro']
                const isSel = selected===m.id
                return (
                  <div key={m.id}
                    style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%,-50%)',zIndex:isSel?20:10,cursor:'grab'}}
                    onMouseDown={e=>onMouseDown(e,m.id)}>
                    {/* Circle marker */}
                    <div style={{
                      width:isSel?26:22,height:isSel?26:22,borderRadius:'50%',
                      background:st.color,color:'#fff',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:isSel?12:10,fontWeight:800,
                      border:isSel?`3px solid #fff`:`2px solid rgba(255,255,255,0.8)`,
                      boxShadow:isSel?`0 0 0 3px ${st.color},0 2px 8px rgba(0,0,0,0.5)`:'0 1px 4px rgba(0,0,0,0.4)',
                      transition:'all .1s',userSelect:'none',
                    }}>{st.symbol}</div>
                    {/* Label */}
                    <div style={{
                      position:'absolute',left:isSel?28:24,top:-2,
                      background:isSel?st.color:'rgba(0,0,0,0.75)',
                      color:'#fff',borderRadius:3,padding:'2px 5px',
                      fontSize:isSel?10:9,whiteSpace:'nowrap',pointerEvents:'none',
                      fontFamily:'monospace',fontWeight:600,
                      border:isSel?'none':'1px solid rgba(255,255,255,0.15)',
                    }}>{m.qty>1?`${m.qty}× `:''}{m.itemCode}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right panel — selected item or legend */}
          <div style={{width:220,background:'#0f172a',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto',flexShrink:0}}>
            {selMarker ? (
              <div style={{padding:14}}>
                <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>
                  Equipamento selecionado
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:4}}>{selMarker.itemName}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:'monospace'}}>{selMarker.itemCode}</div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:4}}>Ambiente</div>
                  <input value={selMarker.room||''} onChange={e=>setMarkers(ms=>ms.map(m=>m.id===selMarker.id?{...m,room:e.target.value}:m))}
                    placeholder="Ex: Sala de Estar"
                    style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,padding:'5px 8px',color:'#fff',fontSize:12,boxSizing:'border-box'}}/>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:4}}>Quantidade</div>
                  <input type="number" min="1" value={selMarker.qty||1} onChange={e=>setMarkers(ms=>ms.map(m=>m.id===selMarker.id?{...m,qty:Number(e.target.value)}:m))}
                    style={{width:70,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,padding:'5px 8px',color:'#fff',fontSize:12}}/>
                </div>
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginBottom:4}}>Nota para arquiteto</div>
                  <textarea value={selMarker.note||''} onChange={e=>setMarkers(ms=>ms.map(m=>m.id===selMarker.id?{...m,note:e.target.value}:m))}
                    placeholder="Ex: instalar a 30cm do piso"
                    rows={3}
                    style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,padding:'5px 8px',color:'#fff',fontSize:11,boxSizing:'border-box',resize:'vertical'}}/>
                </div>
                <button onClick={()=>{ analyzeWithAI('remove', selMarker); setShowAI(true); setPendingAction({type:'remove',marker:selMarker}) }}
                  style={{width:'100%',background:'rgba(220,38,38,0.15)',border:'1px solid rgba(220,38,38,0.4)',color:'#FCA5A5',padding:'7px',borderRadius:5,cursor:'pointer',fontSize:11,marginBottom:8}}>
                  <i className="ti ti-trash" style={{marginRight:4}} aria-hidden/>Remover equipamento
                </button>
                <button onClick={()=>{ analyzeWithAI('review', selMarker); setShowAI(true); setPendingAction(null) }}
                  style={{width:'100%',background:'rgba(14,165,233,0.15)',border:'1px solid rgba(14,165,233,0.3)',color:'#38BDF8',padding:'7px',borderRadius:5,cursor:'pointer',fontSize:11}}>
                  <i className="ti ti-brain" style={{marginRight:4}} aria-hidden/>Análise da IA
                </button>
                <div style={{marginTop:12,fontSize:10,color:'rgba(255,255,255,0.2)',lineHeight:1.5}}>
                  Posição: {Math.round(selMarker.x)}%, {Math.round(selMarker.y)}%<br/>
                  Arraste para reposicionar
                </div>
              </div>
            ) : showLegend ? (
              <div style={{padding:14}}>
                <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,textTransform:'uppercase',letterSpacing:1,marginBottom:12}}>Legenda</div>
                {Object.entries(EQUIP_STYLE).filter(([k])=>typeCounts[k]).map(([k,v])=>(
                  <div key={k} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                    <div style={{width:22,height:22,borderRadius:'50%',background:v.color,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,flexShrink:0}}>{v.symbol}</div>
                    <div>
                      <div style={{fontSize:11,color:'rgba(255,255,255,0.8)'}}>{v.label}</div>
                      <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{typeCounts[k]} ponto{typeCounts[k]>1?'s':''}</div>
                    </div>
                  </div>
                ))}
                <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',marginTop:12,paddingTop:12,fontSize:11,color:'rgba(255,255,255,0.4)'}}>
                  <div style={{marginBottom:4}}><b style={{color:'rgba(255,255,255,0.7)'}}>Total: {markers.length} pontos</b></div>
                  {Object.entries(typeCounts).map(([k,v])=>(
                    <div key={k}>{k}: {v}</div>
                  ))}
                </div>
                <div style={{borderTop:'1px solid rgba(255,255,255,0.08)',marginTop:12,paddingTop:12,fontSize:10,color:'rgba(255,255,255,0.3)',lineHeight:1.6}}>
                  Clique em um marcador para editar.<br/>
                  Arraste para reposicionar.<br/>
                  Clique em equipamento no painel esquerdo e depois na planta para adicionar.
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* AI Analysis modal */}
      {showAI && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#1e293b',borderRadius:10,padding:24,maxWidth:480,width:'90%',border:'1px solid rgba(255,255,255,0.1)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{fontSize:14,fontWeight:600,color:'#38BDF8',display:'flex',alignItems:'center',gap:6}}>
                <i className="ti ti-brain" aria-hidden/>Análise da IA
              </div>
              <button onClick={()=>setShowAI(false)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:18}}>×</button>
            </div>
            {pendingAction && (
              <div style={{background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:6,padding:'8px 12px',marginBottom:12,fontSize:12,color:'#FCA5A5'}}>
                <i className="ti ti-alert-circle" style={{marginRight:4}} aria-hidden/>
                Ação pendente: remover <b>{pendingAction.marker?.itemName}</b>
              </div>
            )}
            <div style={{minHeight:80,fontSize:13,color:'rgba(255,255,255,0.85)',lineHeight:1.7,marginBottom:16}}>
              {aiLoading
                ? <div style={{display:'flex',alignItems:'center',gap:8,color:'rgba(255,255,255,0.4)'}}>
                    <i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} aria-hidden/>Consultando especialista...
                  </div>
                : aiMsg}
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button onClick={()=>{setShowAI(false);setPendingAction(null)}}
                style={{padding:'7px 14px',background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.15)',color:'#fff',borderRadius:5,cursor:'pointer',fontSize:12}}>
                Cancelar
              </button>
              {pendingAction?.type==='remove' && (
                <button onClick={confirmRemove}
                  style={{padding:'7px 14px',background:'#DC2626',border:'none',color:'#fff',borderRadius:5,cursor:'pointer',fontSize:12,fontWeight:600}}>
                  <i className="ti ti-trash" style={{marginRight:4}} aria-hidden/>Confirmar remoção
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
