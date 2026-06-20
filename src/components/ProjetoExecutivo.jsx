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

// ─────────────────────────────────────────────────────────────────────────
// SÍMBOLOS ELÉTRICOS — padrão ABNT NBR 5444 (representação em planta baixa)
// Cada símbolo é um <g> SVG desenhado num espaço ~20×20 centrado em (0,0).
// ─────────────────────────────────────────────────────────────────────────
const ELE_SYMBOLS = {
  // Tomada baixa (até 0,30m) — círculo com meia-lua preenchida + 2 traços (NBR 5444)
  tomada_baixa: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#111"/><line x1="0" y1="-11" x2="0" y2="-7" stroke="#111" stroke-width="1.3"/>`,
  // Tomada média/alta (1,30m+) — igual com 3 traços de altura
  tomada_alta: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><path d="M-7 0 A7 7 0 0 1 7 0 Z" fill="#111"/><line x1="-2" y1="-11" x2="-2" y2="-7" stroke="#111" stroke-width="1.1"/><line x1="2" y1="-11" x2="2" y2="-7" stroke="#111" stroke-width="1.1"/>`,
  // Tomada de piso — círculo com X dentro
  tomada_piso: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><line x1="-4.5" y1="-4.5" x2="4.5" y2="4.5" stroke="#111" stroke-width="1.2"/><line x1="-4.5" y1="4.5" x2="4.5" y2="-4.5" stroke="#111" stroke-width="1.2"/>`,
  // Interruptor simples — letra S (representação usual em planta)
  interruptor_simples: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="0" y="3.5" font-size="9" text-anchor="middle" font-family="serif" font-weight="700" fill="#111">S</text>`,
  // Interruptor paralelo (three-way) — S com traço
  interruptor_paralelo: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="0" y="3.5" font-size="8" text-anchor="middle" font-family="serif" font-weight="700" fill="#111">S₃</text>`,
  // Interruptor intermediário (four-way)
  interruptor_intermediario: `<circle r="7" fill="#fff" stroke="#111" stroke-width="1.3"/><text x="0" y="3.5" font-size="8" text-anchor="middle" font-family="serif" font-weight="700" fill="#111">S₄</text>`,
  // Ponto de luz no teto — círculo com 4 traços (luminária)
  ponto_luz: `<circle r="6.5" fill="#fff" stroke="#111" stroke-width="1.3"/><line x1="-9" y1="0" x2="-6.5" y2="0" stroke="#111" stroke-width="1.1"/><line x1="6.5" y1="0" x2="9" y2="0" stroke="#111" stroke-width="1.1"/><line x1="0" y1="-9" x2="0" y2="-6.5" stroke="#111" stroke-width="1.1"/><line x1="0" y1="6.5" x2="0" y2="9" stroke="#111" stroke-width="1.1"/><circle r="2" fill="#111"/>`,
  // Arandela (luz de parede) — meio círculo
  arandela: `<path d="M-7 6 A7 7 0 0 1 7 6 Z" fill="#fff" stroke="#111" stroke-width="1.3"/><line x1="-9" y1="6" x2="9" y2="6" stroke="#111" stroke-width="1.3"/>`,
  // Quadro de distribuição (QDL)
  quadro: `<rect x="-10" y="-7" width="20" height="14" fill="#fff" stroke="#111" stroke-width="1.5"/><line x1="-10" y1="-2.5" x2="10" y2="-2.5" stroke="#111" stroke-width="1"/><line x1="-5" y1="-7" x2="-5" y2="-2.5" stroke="#111" stroke-width="1"/><line x1="0" y1="-7" x2="0" y2="-2.5" stroke="#111" stroke-width="1"/><line x1="5" y1="-7" x2="5" y2="-2.5" stroke="#111" stroke-width="1"/>`,
  // Genérico
  generico: `<circle r="6" fill="#fff" stroke="#111" stroke-width="1.2"/><circle r="1.6" fill="#111"/>`,
}
// classifica um marcador em símbolo elétrico NBR
const ELE_TYPE_INFO = {
  tomada_baixa:{label:'TUG', tipo:'Tomada baixa (0,30m)'},
  tomada_alta:{label:'TUG-A', tipo:'Tomada média/alta'},
  tomada_piso:{label:'TUG-P', tipo:'Tomada de piso'},
  interruptor_simples:{label:'S', tipo:'Interruptor / Keypad'},
  interruptor_paralelo:{label:'S₃', tipo:'Interruptor paralelo'},
  interruptor_intermediario:{label:'S₄', tipo:'Interruptor intermediário'},
  ponto_luz:{label:'L', tipo:'Ponto de luz'},
  arandela:{label:'L', tipo:'Arandela'},
  quadro:{label:'QDL', tipo:'Quadro de Distribuição'},
}
function classifyEle(m){
  // 1) tipo elétrico definido manualmente (dropdown no marcador) tem prioridade
  if(m.eleType && ELE_TYPE_INFO[m.eleType]) return { sym:m.eleType, ...ELE_TYPE_INFO[m.eleType] }
  if(m.eleType==='nenhum') return null  // marcado explicitamente como "não é elétrico"
  // 2) senão, infere pelo nome/nota
  const n=((m.name||'')+' '+(m.note||'')).toLowerCase()
  if(/quadro|qdl|qd |distribui/.test(n)) return {sym:'quadro', label:'QDL', tipo:'Quadro de Distribuição'}
  if(/interruptor.*(intermedi|four)/.test(n)) return {sym:'interruptor_intermediario', label:'S₄', tipo:'Interruptor intermediário'}
  if(/interruptor.*(paralel|three|hotel)|paralelo/.test(n)) return {sym:'interruptor_paralelo', label:'S₃', tipo:'Interruptor paralelo'}
  if(/interruptor|keypad|botão/.test(n)) return {sym:'interruptor_simples', label:'S', tipo:'Interruptor / Keypad'}
  if(/tomada.*piso|piso/.test(n)) return {sym:'tomada_piso', label:'TUG-P', tipo:'Tomada de piso'}
  if(/tomada.*(alta|1,30|bancada|0,90|média|media)/.test(n)) return {sym:'tomada_alta', label:'TUG-A', tipo:'Tomada média/alta'}
  if(/tomada/.test(n)) return {sym:'tomada_baixa', label:'TUG', tipo:'Tomada baixa (0,30m)'}
  if(/arandela/.test(n)) return {sym:'arandela', label:'L', tipo:'Arandela'}
  if(/luz|luminária|luminaria|spot|lustre|plafon|ponto de luz/.test(n)) return {sym:'ponto_luz', label:'L', tipo:'Ponto de luz'}
  return null  // não é elétrico → não entra na planta elétrica
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

async function askClaude(messages, imageB64=null, mime='image/jpeg', maxTokens=1500, onCost=null) {
  const content = []
  if(imageB64) content.push({type:'image',source:{type:'base64',media_type:mime,data:imageB64}})
  const apiMessages = messages.map(m=>({role:m.role, content: m.role==='user' && m===messages[messages.length-1] && imageB64
    ? [...content, {type:'text',text:m.text}]
    : m.text }))
  const payload = JSON.stringify({model:'claude-sonnet-4-5-20250929',max_tokens:maxTokens,clientStream:true,messages:apiMessages})
  // estimativa de tokens de entrada (≈4 chars/token; imagem ≈ 1300 tokens)
  const inChars = messages.reduce((s,m)=>s+(m.text?.length||0),0)
  const inTokens = Math.ceil(inChars/4) + (imageB64?1300:0)

  const res = await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:payload})
  if(!res.ok){
    const t = await res.text()
    throw new Error('API '+res.status+': '+t.slice(0,150))
  }
  const ct = res.headers.get('content-type')||''
  if(ct.includes('application/json')){
    const data = await res.json()
    const txt = data.content?.[0]?.text || ''
    reportCost(onCost, inTokens, data.usage?.output_tokens ?? Math.ceil(txt.length/4))
    return txt
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
  reportCost(onCost, inTokens, Math.ceil(full.length/4))
  return full
}
// Preço Sonnet (US$/milhão de tokens): input 3, output 15. Câmbio aproximado.
const USD_BRL = 5.40
function reportCost(onCost, inTokens, outTokens){
  if(!onCost) return
  const usd = (inTokens/1e6)*3 + (outTokens/1e6)*15
  onCost({ inTokens, outTokens, usd, brl: usd*USD_BRL })
}

// Seção colapsável para filtros na sidebar do editor
function FilterSection({ title, badge, onClear, defaultOpen=false, children }){
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:'100%',background:'rgba(255,255,255,0.02)',border:'none',cursor:'pointer',padding:'7px 10px',
          display:'flex',alignItems:'center',gap:6,color:'rgba(255,255,255,0.5)',fontFamily:'inherit',fontSize:10}}>
        <i className={`ti ${open?'ti-chevron-down':'ti-chevron-right'}`} style={{fontSize:10,flexShrink:0}} aria-hidden/>
        <span style={{flex:1,textAlign:'left',fontWeight:600,textTransform:'uppercase',letterSpacing:.5}}>{title}</span>
        {badge>0&&<span style={{background:'#38BDF8',color:'#000',borderRadius:8,padding:'0 5px',fontSize:8,fontWeight:700}}>{badge}</span>}
        {onClear&&badge>0&&<span onClick={e=>{e.stopPropagation();onClear()}} style={{fontSize:8,color:'rgba(255,255,255,0.35)',cursor:'pointer',padding:'1px 4px',borderRadius:3,background:'rgba(255,255,255,0.06)'}}>limpar</span>}
      </button>
      {open&&<div style={{padding:'6px 10px 8px',background:'#0a1020'}}>{children}</div>}
    </div>
  )
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
  // planta_data pode vir como objeto OU string JSON (do Supabase) — normaliza
  const initPlanta = (()=>{ let pd=fromProposal?.planta_data; if(typeof pd==='string'){try{pd=JSON.parse(pd)}catch{pd=null}} return pd||null })()
  const initPlantaCliente = (()=>{ let pd=fromProposal?.planta_cliente; if(typeof pd==='string'){try{pd=JSON.parse(pd)}catch{pd=null}} return pd||null })()
  const [step, setStep] = useState(()=> (initPlanta?.markers?.length || initPlanta?.image) ? 'editor' : 'upload')
  const [bgImage, setBgImage] = useState(()=> initPlanta?.image || null)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [markers, setMarkers] = useState(()=> initPlanta?.markers || [])
  const [history, setHistory] = useState([])   // pilha de estados anteriores de markers (undo)
  // ── Roteamento de cabos (planta elétrica) ──
  const [cableMode, setCableMode]   = useState(false)        // ativa o modo de traçar cabos
  const [hideCables, setHideCables] = useState(false)        // oculta os cabos (mostra só itens)
  const [cables, setCables]         = useState(()=> initPlanta?.cables || []) // [{id,fromUid,toUid,points:[{x,y}],color}]
  const [cableDraft, setCableDraft] = useState(null)         // {fromUid, points:[]} enquanto desenha
  const [selCable, setSelCable]     = useState(null)
  const [dragPoint, setDragPoint]   = useState(null)         // {cableId, idx}
  // snapshot para undo (chamar ANTES de alterar markers)
  const pushHistory = () => setHistory(h=>[...h.slice(-29), markers])
  // acumulador de custo da API Anthropic durante a geração do executivo
  const apiCostRef = useRef({ inTokens:0, outTokens:0, usd:0, brl:0, calls:0 })
  const accumulateCost = (c)=>{ const a=apiCostRef.current; a.inTokens+=c.inTokens; a.outTokens+=c.outTokens; a.usd+=c.usd; a.brl+=c.brl; a.calls++ }
  const [projectInfo, setProjectInfo] = useState({
    client: preClient?`${preClient.name1||''}${preClient.name2?' & '+preClient.name2:''}`
          : fromProposal?.client_name || '',
    notes:''
  })
  const [selClient, setSelClient] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [catSearch, setCatSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [subcatFilter, setSubcatFilter] = useState('')
  const [editorSearch, setEditorSearch] = useState('')         // busca nos markers na planta
  const [filterRooms, setFilterRooms] = useState(new Set())   // cômodos selecionados (vazio = todos)
  const [filterCateg, setFilterCateg] = useState(new Set())   // categorias selecionadas (vazio = todas)
  const [filterItem, setFilterItem] = useState('')            // filtra mapa por nome de item (resumo)
  const [showRackModal, setShowRackModal] = useState(false)
  const [rackEquip, setRackEquip] = useState([])   // [{code,name,qty,u}]
  const [execDoc, setExecDoc] = useState(()=> fromProposal?.exec_doc || null)         // versão Completa (HTML)
  const [execDocObra, setExecDocObra] = useState(()=> fromProposal?.exec_doc_obra || null) // versão Obra/Pedreiro (HTML)
  const [execDocEletrica, setExecDocEletrica] = useState(()=> fromProposal?.exec_doc_eletrica || null) // versão Elétrica (HTML)
  const [execMode, setExecMode] = useState('completo') // 'completo' | 'obra' | 'eletrica'
  const [showHeatmap, setShowHeatmap] = useState(true)  // mostrar mapa de calor de Wi-Fi na planta elétrica
  const [execData, setExecData] = useState(null)       // dados crus da IA (p/ re-render das 2 versões)
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
  const canvasRef = useRef()                 // wrapper rolável da planta no editor
  const [canvasPan, setCanvasPan] = useState(null)  // {sx,sy,sl,st} enquanto arrasta o fundo

  // Attach wheel with passive:false so preventDefault() works
  useEffect(()=>{
    const el = imgContainerRef.current
    if(!el) return
    el.addEventListener('wheel', onImgWheel, {passive:false})
    return ()=> el.removeEventListener('wheel', onImgWheel)
  }) // re-runs each render to always get latest handler; cheap since no real side-effect

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}) },[chat])

  // Gera markers a partir dos itens da proposta (distribuídos por cômodo na planta)
  function markersFromProposal(startN=1){
    const floors = typeof fromProposal?.floors==='string' ? (()=>{try{return JSON.parse(fromProposal.floors)}catch{return[]}})() : (fromProposal?.floors||[])
    const rooms=[]; let n=startN
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
    return mk
  }

  useEffect(()=>{
    if(fromProposal && !initPlanta?.markers?.length && !markers.length){
      const mk=markersFromProposal(1)
      if(mk.length){ setMarkers(mk); if(!initPlanta?.image) setStep('editor') }
    }
  },[])  // eslint-disable-line

  // Se há planta cadastrada no cliente, guarda para mostrar na tela de upload
  const [clientePlanta, setClientePlanta] = useState(null) // {url, label}

  useEffect(()=>{
    if(bgImage || initPlanta?.image) return
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
      const reply = await askClaude([{role:'user',text:prompt}], imgUrl.split(',')[1], 'image/jpeg', 2000, accumulateCost)
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
      const reply = await askClaude([{role:'user',text:sys+'\n\nFaça as perguntas sobre este projeto.'}], null, 'image/jpeg', 800, accumulateCost)
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
      const reply=await askClaude(newChat.map(m=>({role:m.role,text:m.text})), null, 'image/jpeg', 1200, accumulateCost)
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
    const cx=e.touches?e.touches[0].clientX:e.clientX, cy=e.touches?e.touches[0].clientY:e.clientY
    const dx=((cx-ox)/r.width)*100, dy=((cy-oy)/r.height)*100
    setMarkers(ms=>ms.map(m=>m.uid!==uid?m:{...m,x:Math.max(0,Math.min(98,m.x+dx)),y:Math.max(0,Math.min(96,m.y+dy))}))
    setDragging(d=>({...d,ox:cx,oy:cy})) },[dragging])
  const onUp=useCallback(()=>setDragging(null),[])
  useEffect(()=>{
    window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp)
    window.addEventListener('touchmove',onMove,{passive:false});window.addEventListener('touchend',onUp)
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)
      window.removeEventListener('touchmove',onMove);window.removeEventListener('touchend',onUp)}},[onMove,onUp])

  function onCanvasClick(e){
    if(!addMode||!addItem)return
    const r=containerRef.current.getBoundingClientRect()
    const x=((e.clientX-r.left)/r.width)*100, y=((e.clientY-r.top)/r.height)*100
    const {cat, sub} = inferCategory(addItem.name, addItem.category||'')
    pushHistory()
    setMarkers(ms=>{
      const newId = genItemId('', sub, ms)
      return [...ms,{uid:Date.now(),n:ms.length+1,id:newId,code:addItem.code,name:addItem.name,
        room:'',x,y,note:'',cost:addItem.cost_price||0,sale:addItem.sale_price||0,category:cat,subcategory:sub||''}]
    })
    setAddMode(false); setAddItem(null)
  }

  // ── Undo / Limpar / Recomeçar ──
  function undo(){
    setHistory(h=>{ if(!h.length) return h; const prev=h[h.length-1]; setMarkers(prev); return h.slice(0,-1) })
  }
  function limparItens(){
    if(!markers.length){ alert('Não há itens para limpar.'); return }
    if(!window.confirm(`Remover todos os ${markers.length} itens da planta?\n\nA planta (imagem) e os cômodos continuam. Você pode desfazer com Ctrl+Z ou o botão Desfazer.`)) return
    pushHistory(); setMarkers([]); setCables([])
  }
  function recomecar(){
    if(!window.confirm('Recomeçar o projeto do zero?\n\nIsto volta para a tela inicial e descarta a planta, os itens e os cabos NÃO salvos.')) return
    setMarkers([]); setCables([]); setHistory([]); setBgImage(null); setChat([]); setStep('upload')
  }
  // Apaga tudo do projeto (itens, cabos e planta) sem sair da tela
  function apagarProjeto(){
    if(!window.confirm('Apagar o projeto inteiro?\n\nRemove a planta, todos os itens e os cabos. Esta ação não pode ser desfeita depois de salvar.')) return
    pushHistory(); setMarkers([]); setCables([]); setBgImage(null)
  }
  // Importa os itens da proposta e adiciona aos cômodos da planta atual
  function importarDaProposta(){
    const novos = markersFromProposal((markers.length||0)+1)
    // tenta trazer a planta (imagem) da proposta, se ainda não houver uma carregada
    let plantaImg = null
    if(!bgImage){
      const pd = initPlanta || (()=>{ let x=fromProposal?.planta_data; if(typeof x==='string'){try{x=JSON.parse(x)}catch{x=null}} return x })()
      const pc = initPlantaCliente || (()=>{ let x=fromProposal?.planta_cliente; if(typeof x==='string'){try{x=JSON.parse(x)}catch{x=null}} return x })()
      plantaImg = pd?.image || pc?.image || null
    }
    if(!novos.length && !plantaImg){ alert('A proposta não tem itens nem planta para importar.'); return }
    if((markers.length||plantaImg) && !window.confirm(`Importar da proposta?\n\n${novos.length?`• ${novos.length} itens serão adicionados aos cômodos\n`:''}${plantaImg?'• a planta da proposta será carregada\n':''}`)) return
    pushHistory()
    if(plantaImg) setBgImage(plantaImg)
    if(novos.length) setMarkers(ms=>[...ms, ...novos])
    if(step!=='editor' && (bgImage||plantaImg||initPlanta?.image)) setStep('editor')
  }
  // voltar uma etapa do fluxo
  const STEP_ORDER = ['upload','rooms','chat','editor','exec']
  function voltarEtapa(){
    const i=STEP_ORDER.indexOf(step)
    if(i>0) setStep(STEP_ORDER[i-1])
  }
  function avancarEtapa(){
    const i=STEP_ORDER.indexOf(step)
    if(i>=0 && i<STEP_ORDER.length-1) setStep(STEP_ORDER[i+1])
  }
  useEffect(()=>{
    function onKey(e){ if((e.ctrlKey||e.metaKey)&&e.key==='z'&&step==='editor'){ e.preventDefault(); undo() } }
    window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey)
  }) // eslint-disable-line

  // Na montagem: se há uma planta da Área de Clientes pronta, pergunta se puxa dela
  const askedClienteRef = useRef(false)
  useEffect(()=>{
    if(askedClienteRef.current) return
    askedClienteRef.current = true
    const temCliente = initPlantaCliente && (initPlantaCliente.markers?.length || initPlantaCliente.image)
    if(!temCliente) return
    // só pergunta se a Área de Clientes tem conteúdo diferente/adicional
    const usar = window.confirm('Existe uma planta montada na Área de Clientes para esta proposta.\n\nOK = puxar a planta e os itens da Área de Clientes\nCancelar = continuar com o Projeto Executivo atual')
    if(usar){
      setBgImage(initPlantaCliente.image||null)
      setMarkers(initPlantaCliente.markers||[])
      if(initPlantaCliente.cables) setCables(initPlantaCliente.cables)
      setStep('editor')
    }
  }, []) // eslint-disable-line

  // ── Pan (arrastar o fundo) + zoom por scroll no canvas do editor ──
  function onCanvasPanDown(e){
    // só inicia pan se o clique foi no fundo (não num marker/cabo) e não está adicionando item
    if(addMode || cableMode) return
    if(e.target.closest('.mk-item') || e.target.closest('.cable-handle')) return
    const el=canvasRef.current; if(!el) return
    const t=e.touches?e.touches[0]:e
    setCanvasPan({sx:t.clientX, sy:t.clientY, sl:el.scrollLeft, st:el.scrollTop})
  }
  const onCanvasPanMove=useCallback((e)=>{
    if(!canvasPan||!canvasRef.current) return
    const t=e.touches?e.touches[0]:e
    canvasRef.current.scrollLeft = canvasPan.sl - (t.clientX - canvasPan.sx)
    canvasRef.current.scrollTop  = canvasPan.st - (t.clientY - canvasPan.sy)
  },[canvasPan])
  const onCanvasPanUp=useCallback(()=>setCanvasPan(null),[])
  useEffect(()=>{
    if(canvasPan){
      window.addEventListener('mousemove',onCanvasPanMove); window.addEventListener('mouseup',onCanvasPanUp)
      window.addEventListener('touchmove',onCanvasPanMove,{passive:false}); window.addEventListener('touchend',onCanvasPanUp)
      return ()=>{ window.removeEventListener('mousemove',onCanvasPanMove); window.removeEventListener('mouseup',onCanvasPanUp)
        window.removeEventListener('touchmove',onCanvasPanMove); window.removeEventListener('touchend',onCanvasPanUp) }
    }
  },[canvasPan,onCanvasPanMove,onCanvasPanUp])
  function onCanvasWheel(e){
    if(!bgImage) return
    e.preventDefault()
    const d = e.deltaY<0 ? 0.15 : -0.15
    setZoom(z=>Math.min(4, Math.max(0.4, +(z+d).toFixed(2))))
  }

  // ── Roteamento de cabos ──
  // Legenda de cores dos cabos (segue o padrão da planta)
  const CABLE_PALETTE = { dados:'#2563EB', ap:'#F59E0B', camera:'#92400E', uplink:'#DC2626', hdmi:'#7C3AED' }
  const CABLE_LABELS  = { dados:'Dados', ap:'AP / Access Point', camera:'Câmera', uplink:'Uplink', hdmi:'HDMI' }
  const mk = uid => markers.find(m=>m.uid===uid)
  // adivinha o tipo de cabo pela natureza dos itens conectados
  function guessCableType(from, to){
    const n=(from?.name+' '+to?.name).toLowerCase()
    if(/uplink|gateway|dream machine|provedor|ont|modem/.test(n)) return 'uplink'
    if(/c[âa]mera|dome|bullet|nvr/.test(n)) return 'camera'
    if(/access point|ap |wi-?fi|u6/.test(n)) return 'ap'
    return 'dados'
  }
  function onCableItemClick(uid){
    if(!cableMode) return false
    if(!cableDraft){ setCableDraft({fromUid:uid}); return true }
    if(cableDraft.fromUid===uid){ setCableDraft(null); return true }
    const from=mk(cableDraft.fromUid), to=mk(uid)
    if(from&&to){
      // cria 3 pontos intermediários distribuídos entre origem e destino (para moldar ao caminho)
      const pts=[1,2,3].map(i=>({
        x:+(from.x + (to.x-from.x)*(i/4)).toFixed(1),
        y:+(from.y + (to.y-from.y)*(i/4)).toFixed(1)
      }))
      const type=guessCableType(from,to)
      const newCable={ id:Date.now(), fromUid:cableDraft.fromUid, toUid:uid,
        points:pts, color:CABLE_PALETTE[type], type }
      setCables(cs=>[...cs,newCable]); setSelCable(newCable.id)
    }
    setCableDraft(null); return true
  }
  // insere um ponto (dobra) no meio de um segmento do cabo
  function addCablePoint(cableId, segIdx, x, y){
    setCables(cs=>cs.map(c=>{ if(c.id!==cableId) return c
      const pts=[...c.points]; pts.splice(segIdx,0,{x:+x.toFixed(1),y:+y.toFixed(1)}); return {...c,points:pts} }))
  }
  function removeCablePoint(cableId, idx){
    setCables(cs=>cs.map(c=>c.id!==cableId?c:{...c,points:c.points.filter((_,i)=>i!==idx)}))
  }
  function deleteCable(id){ setCables(cs=>cs.filter(c=>c.id!==id)); setSelCable(null) }
  function setCableColor(id,type){ setCables(cs=>cs.map(c=>c.id===id?{...c,type,color:CABLE_PALETTE[type]}:c)) }
  // pontos completos do cabo: origem + intermediários + destino (em %)
  function cablePolyPoints(c){
    const from=mk(c.fromUid), to=mk(c.toUid)
    if(!from||!to) return []
    return [{x:from.x,y:from.y}, ...(c.points||[]), {x:to.x,y:to.y}]
  }
  // arrastar um ponto intermediário do cabo
  const onPointMove = useCallback((e)=>{
    if(!dragPoint||!containerRef.current) return
    const cx=e.touches?e.touches[0].clientX:e.clientX, cy=e.touches?e.touches[0].clientY:e.clientY
    const r=containerRef.current.getBoundingClientRect()
    const x=Math.max(0,Math.min(100,((cx-r.left)/r.width)*100))
    const y=Math.max(0,Math.min(100,((cy-r.top)/r.height)*100))
    setCables(cs=>cs.map(c=>c.id!==dragPoint.cableId?c:{...c,points:c.points.map((p,i)=>i===dragPoint.idx?{x:+x.toFixed(1),y:+y.toFixed(1)}:p)}))
  },[dragPoint])
  const onPointUp = useCallback(()=>setDragPoint(null),[])
  useEffect(()=>{
    if(dragPoint){ window.addEventListener('mousemove',onPointMove); window.addEventListener('mouseup',onPointUp)
      window.addEventListener('touchmove',onPointMove,{passive:false}); window.addEventListener('touchend',onPointUp)
      return ()=>{ window.removeEventListener('mousemove',onPointMove); window.removeEventListener('mouseup',onPointUp)
        window.removeEventListener('touchmove',onPointMove); window.removeEventListener('touchend',onPointUp) } }
  },[dragPoint,onPointMove,onPointUp])

  async function askJSON(prompt, maxTokens){
    for(let attempt=0; attempt<2; attempt++){
      const reply=await askClaude([{role:'user',text:prompt}],null,'image/jpeg',maxTokens,accumulateCost)
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

  // ─────────────────────────────────────────────────────────────────────
  // GERAÇÃO SEM IA — monta o objeto `d` (mesma estrutura da IA) só a partir
  // dos marcadores posicionados + cabos + convenções RARO. Tudo determinístico.
  // ─────────────────────────────────────────────────────────────────────
  function buildExecDataFromMarkers(){
    const lc = s => (s||'').toLowerCase()
    const isKeypad = m => /keypad|interruptor|botão/.test(lc(m.name))
    const isCortina = m => /cortina|persiana/.test(lc(m.name))
    const isModulo  = m => /módulo|modulo|qarz/.test(lc(m.name))
    const isCam     = m => /câmera|camera|dome/.test(lc(m.name))
    const isAP      = m => /access point|\bap\b|wi-?fi/.test(lc(m.name))
    const isSom     = m => /som|caixa|amplificador|receiver/.test(lc(m.name))
    const isTomada  = m => /tomada/.test(lc(m.name))
    const isSensor  = m => /sensor|presença/.test(lc(m.name))
    const isHubIR   = m => /hub ir|qair/.test(lc(m.name))
    const alturaDe = m => isKeypad(m) ? '1,10m' : isTomada(m) ? '0,30m' : isCortina(m) ? '2,55m' : isModulo(m) ? 'forro' : isCam(m)||isAP(m) ? 'teto' : isSom(m) ? 'teto' : isSensor(m) ? '2,20m' : '—'
    const caixaDe  = m => isKeypad(m) ? '4×4 + NEUTRO' : isTomada(m) ? '4×2' : isModulo(m)||isCortina(m) ? 'forro' : '—'
    const caboDe   = m => isKeypad(m) ? '3×2,5mm² (F+N+T)' : isTomada(m) ? '3×2,5mm²' : isCam(m)||isAP(m) ? 'CAT6 PoE' : isSom(m) ? '2×1,5mm²' : isCortina(m)||isModulo(m) ? '2×2,5mm² (F+N)' : 'CAT6'

    const aps  = markers.filter(isAP).length
    const cams = markers.filter(isCam).length
    const totalPoe = aps+cams
    const precisaSwitch = totalPoe > 6

    // pontos por ambiente (parede/dist/alt/caixa/cabo/orientação)
    const byRoom = {}
    markers.forEach(m=>{ if(isRackItem(m.name,m.code)) return; const r=m.room||'Geral'; (byRoom[r]=byRoom[r]||[]).push(m) })
    const pontos = Object.entries(byRoom).map(([ambiente,ms])=>({
      ambiente,
      linhas: ms.map(m=>({ ponto:m.id||m.code||('#'+m.n), equip:m.name, parede:m.note||'—', dist:'—',
        alt:alturaDe(m), caixa:caixaDe(m), cabo:caboDe(m), virado:'frente p/ ambiente' }))
    }))

    // cabos elétricos por cômodo (keypads, tomadas, cortinas, módulos)
    const cabos_eletricos_por_comodo = Object.entries(byRoom).map(([comodo,ms])=>{
      const itens = ms.filter(m=>isKeypad(m)||isTomada(m)||isCortina(m)||isModulo(m)).map((m,i)=>({
        id:`ELT-${(m.id||m.code||m.n)}`, equip:m.name,
        tipo:isKeypad(m)?'fase+neutro+terra':'fase+neutro',
        fios:caboDe(m), origem:'Quadro QDL', destino:`${m.room||''} H=${alturaDe(m)}`,
        metros:'—', obs:isKeypad(m)?'NEUTRO obrigatório':'' }))
      return itens.length?{comodo,itens}:null
    }).filter(Boolean)

    // cabos de rede a partir dos cabos desenhados na planta (se houver)
    const rack_cable_table = (cables||[]).map((c,i)=>{
      const from=markers.find(m=>m.uid===c.fromUid), to=markers.find(m=>m.uid===c.toUid)
      return { porta_patch:`P${String(i+1).padStart(2,'0')}`, device_origem:from?.name||'Rack', porta_origem:'',
        destino:to?.name||'—', tipo:(c.type==='ap'||c.type==='camera'||c.type==='dados'||c.type==='uplink')?'CAT6':'CAT6',
        etiqueta:`${(to?.code||to?.name||'PT')}`.toUpperCase().slice(0,16), cor:'' }
    })

    // cabos de som
    const cabos_som = markers.filter(isSom).map((m,i)=>({ id:`SOM-${String(i+1).padStart(2,'0')}`,
      origem:'Amplificador no Rack', destino:`${m.name} (${m.room||''})`, tipo:'2×1,5mm²', metros:'—', etiqueta:`SOM-${i+1}` }))

    // alimentação keypads
    const alim_keypads = markers.filter(isKeypad).map((m,i)=>({ id:`KEY-${String(i+1).padStart(2,'0')}`,
      origem:'Quadro QDL — disj. dedicado', destino:`${m.name} ${m.room||''}`, cota:alturaDe(m),
      comodo:m.room||'—', metros:'—', fios:'3×2,5mm² (F+N+T)' }))

    // rack: só se houver marcador de rack
    const rackMarker = markers.find(m=>isRackItem(m.name||'', m.code||''))
    const rack_items = rackMarker ? ((rackMarker.rackEquip||[]).length
      ? rackMarker.rackEquip.map(e=>({u:e.u||'',equip:e.name||e.equip||'',funcao:e.funcao||'',watts:e.watts||'—'}))
      : []) : []

    // itens por cômodo (consolidado simples)
    const pecasMap = {}
    markers.forEach(m=>{ if(!m.name) return; pecasMap[m.name]=(pecasMap[m.name]||0)+1 })
    const pecas = Object.entries(pecasMap).map(([item,qtd])=>({item,qtd}))

    return {
      premissas:[
        'Documento montado manualmente a partir dos pontos posicionados na planta.',
        'Todo cabeamento estruturado CAT6 sai do rack/CPD até cada ponto.',
        'Keypads SEMPRE com fase + neutro + terra do quadro (neutro obrigatório).',
        precisaSwitch?`APs + Câmeras = ${totalPoe} → adicionar Switch PoE+ (Dream Machine SE tem 8 portas).`:`Dream Machine SE comporta os ${totalPoe} dispositivos PoE.`,
      ],
      rack_config:{ dream_machine_portas:8, aps, cameras:cams, precisa_switch:precisaSwitch, switch_portas:precisaSwitch?16:0 },
      rack_items,
      rack_detalhe: rackMarker ? ['Rack embutido em armário ventilado','Tomada 110V dedicada para a régua filtrada','Fibra do provedor direto na porta WAN do Dream Machine SE'] : [],
      rack_cable_table,
      pontos,
      cabos_eletricos_por_comodo,
      cabos_som,
      alim_keypads,
      pecas,
      checklist_obra:[
        'Passar eletroduto 3/4" em todas as paredes antes do revestimento',
        'Deixar caixa 4×4 em CADA keypad com NEUTRO chegando (obrigatório)',
        'Eletroduto seco 3/4" do rack até o forro para câmeras e APs',
        'Tomada 110V dedicada + aterramento no nicho do rack',
        'Deixar fio-guia em todos os eletrodutos',
        'Sangria no teto para cada caixa de som embutida',
        'Identificar todos os circuitos no quadro',
        'Marcar com fita todos os pontos antes de rebocar',
      ],
      checklist_raro:[
        'Conferir neutro chegando em 100% das caixas de keypad',
        'Testar continuidade de cada cabo CAT6 antes de terminar',
        'Crimpar patch panel com etiquetas conforme tabela',
        'Parear todos os keypads e módulos Zigbee',
      ],
      _manual:true,
    }
  }

  // Gera o documento SEM chamar a IA (na mão)
  function generateExecManual(){
    if(!markers.length){ alert('Posicione ao menos um item na planta antes de gerar.'); return }
    try {
      const data = buildExecDataFromMarkers()
      setExecData(data)
      const full = buildExecHtml(data,'completo')
      const obra = buildExecHtml(data,'obra')
      const eletrica = buildExecHtml(data,'eletrica')
      setExecDoc(full); setExecDocObra(obra); setExecDocEletrica(eletrica)
      setExecMode('completo')
      setStep('exec')
      if(fromProposal?.id){
        import('../db/supabase.js').then(({saveProposal})=>{
          saveProposal({ ...fromProposal, exec_doc:full, exec_doc_obra:obra, exec_doc_eletrica:eletrica, planta_data:{image:bgImage,markers,cables} }).catch(e=>console.warn('Auto-save manual falhou:',e.message))
        })
      }
    } catch(err){
      console.error('generateExecManual error:', err)
      alert('Não consegui gerar o documento sem IA: '+(err?.message||err)+'\n\nVerifique se os pontos têm cômodo definido e tente de novo.')
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
 "premissas":["FIBRA do provedor chega diretamente no RACK/CPD — sem roteador intermediário do provedor (Dream Machine SE É o roteador)","Rack centraliza TODOS os equipamentos ativos: DM SE, switch PoE+, amplificador de som, patch panel","Todo cabeamento estruturado CAT6 sai do rack até cada ponto","Keypads SEMPRE fase+neutro+terra do quadro (neutro obrigatório)","..."],
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
 "banheiros_sensores":[{"ambiente":"Banheiro Master","ponto":"Sensor mmWave teto","obs":"luz automática, umidade"}],
 "tabela_automacao":[{"num_planta":1,"id":"K1","equip":"Keypad 3 botões","ambiente":"Sala","funcao":"Liga/Desliga iluminação","protocolo":"Zigbee","posicao":"parede entrada H=1,10m","obs":"neutro obrigatório"}],
 "tabela_seguranca":[{"num_planta":2,"id":"CAM1","equip":"Câmera Dome 5MP","ambiente":"Entrada","resolucao":"5MP","tipo":"PoE CAT6","posicao":"teto H=2,80m","angulo":"120°","obs":""}],
 "_REGRA_CAMERAS":"TODAS as câmeras (mesmo Dome com Áudio) vão SEMPRE em tabela_seguranca, NUNCA em tabela_som. tabela_som contém apenas caixas, amplificador, receiver e subwoofer.",
 "tabela_som":[{"num_planta":3,"id":"S1","equip":"Caixa JBL 260","ambiente":"Sala","zona":"Zona 1","tipo":"embutida teto","saida_amplif":"Canal 1","cabo":"2×1,5mm² ~8m","obs":""}],
 "tabela_teto":[{"num_planta":4,"id":"AP1","equip":"Access Point U6+","ambiente":"Sala","tipo":"Wi-Fi 6","instalacao":"teto centro","origem":"Rack PP porta 1","cabo":"CAT6 PoE","metros":"12","obs":""}]
}`, 6000)

      // BLOCO 2 — cabos detalhados (por cômodo), alimentação, resumo, peças, checklists, riscos
      setExecProgress('Cabos detalhados e checklists... (2/2)')
      const d2=await askJSON(
`Projetista RARO Home. Responda APENAS JSON válido (sem markdown). ${conv}\n\n${ctx}\n\n{
 "rack_cable_table":[
  {"porta_patch":"P01","device_origem":"Dream Machine SE","porta_origem":"LAN1","destino":"Switch PoE+ (uplink)","device_nome":"switch-poe","tipo":"CAT6","metros":"0.5","etiqueta":"UPLINK-SW","cor":"Cinza"},
  {"porta_patch":"P02","device_origem":"Switch PoE+","porta_origem":"1","destino":"AP Sala de Estar #27","device_nome":"ap-sala-estar","tipo":"CAT6 PoE","metros":"15","etiqueta":"AP-SALA-ESTAR","cor":"Azul"},
  {"porta_patch":"P03","device_origem":"Switch PoE+","porta_origem":"2","destino":"AP Área Gourmet #28","device_nome":"ap-area-gourmet","tipo":"CAT6 PoE","metros":"18","etiqueta":"AP-GOURMET","cor":"Azul"},
  {"porta_patch":"P04","device_origem":"Switch PoE+","porta_origem":"3","destino":"AP Garagem #29","device_nome":"ap-garagem","tipo":"CAT6 PoE","metros":"22","etiqueta":"AP-GARAGEM","cor":"Azul"},
  {"porta_patch":"P05","device_origem":"Switch PoE+","porta_origem":"4","destino":"AP Suíte Master #30","device_nome":"ap-master","tipo":"CAT6 PoE","metros":"20","etiqueta":"AP-MASTER","cor":"Azul"},
  {"porta_patch":"P06","device_origem":"Switch PoE+","porta_origem":"5","destino":"AP Suíte 02 #31","device_nome":"ap-suite02","tipo":"CAT6 PoE","metros":"25","etiqueta":"AP-SUITE02","cor":"Azul"},
  {"porta_patch":"P07","device_origem":"Switch PoE+","porta_origem":"6","destino":"AP Suíte 03","device_nome":"ap-suite03","tipo":"CAT6 PoE","metros":"28","etiqueta":"AP-SUITE03","cor":"Azul"},
  {"porta_patch":"P08","device_origem":"Switch PoE+","porta_origem":"7","destino":"AP Quarto Escritório","device_nome":"ap-escritorio","tipo":"CAT6 PoE","metros":"12","etiqueta":"AP-ESCRIT","cor":"Azul"},
  {"porta_patch":"P09","device_origem":"Switch PoE+","porta_origem":"8","destino":"Câmera Entrada Social #14","device_nome":"cam-entrada","tipo":"CAT6 PoE","metros":"25","etiqueta":"CAM-ENTRADA","cor":"Verde"},
  {"porta_patch":"P10","device_origem":"Switch PoE+","porta_origem":"9","destino":"Câmera Garagem #16","device_nome":"cam-garagem","tipo":"CAT6 PoE","metros":"20","etiqueta":"CAM-GARAGEM","cor":"Verde"},
  {"porta_patch":"P11","device_origem":"Switch PoE+","porta_origem":"10","destino":"Câmera Sala Estar #19","device_nome":"cam-sala","tipo":"CAT6 PoE","metros":"14","etiqueta":"CAM-SALA","cor":"Verde"},
  {"porta_patch":"P12","device_origem":"Dream Machine SE","porta_origem":"LAN2","destino":"Keystone Sala TV1 #45","device_nome":"ks-sala-tv1","tipo":"CAT6","metros":"15","etiqueta":"KS-SALA-TV1","cor":"Amarelo"},
  {"porta_patch":"P13","device_origem":"Dream Machine SE","porta_origem":"LAN3","destino":"Keystone Suíte Master TV1 #47","device_nome":"ks-master-tv1","tipo":"CAT6","metros":"20","etiqueta":"KS-MASTER-TV1","cor":"Amarelo"}
],
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
      setExecData(data)
      const full=buildExecHtml(data,'completo')
      const obra=buildExecHtml(data,'obra')
      const eletrica=buildExecHtml(data,'eletrica')
      setExecDoc(full)
      setExecDocObra(obra)
      setExecDocEletrica(eletrica)
      setStep('exec')
      setExecProgress('')

      // AUTO-SAVE se veio de proposta
      if(fromProposal?.id){
        try{
          const { saveProposal } = await import('../db/supabase.js')
          const updated = { ...fromProposal, exec_doc:full, exec_doc_obra:obra, exec_doc_eletrica:eletrica, planta_data:{image:bgImage,markers,cables} }
          await saveProposal(updated)
        }catch(e){ console.warn('Auto-save falhou:', e.message) }
      }
    }catch(err){ alert('Erro ao gerar projeto: '+err.message); setExecProgress('') }
    setLoading(false)
  }

  function buildExecHtml(d, mode='completo'){
    const isObra = mode==='obra'

    // ── PLANTA ELÉTRICA (ABNT NBR 5444) — símbolos técnicos sobre a planta ──
    // Desenha tomadas, interruptores, pontos de luz e QDL com símbolos normalizados,
    // eletrodutos (linhas) ligando cada ponto ao quadro, legenda e quadro de cargas.
    function buildPlantaEletrica(numFn){
      const eleMarks = markers.map(m=>({m, cls:classifyEle(m)})).filter(x=>x.cls)
      if(!bgImage || !eleMarks.length) return ''
      const qdl = eleMarks.find(x=>x.cls.sym==='quadro')
      // símbolos posicionados
      const syms = eleMarks.map(({m,cls})=>`
        <g transform="translate(${m.x},${m.y}) scale(0.34)">
          ${ELE_SYMBOLS[cls.sym]||ELE_SYMBOLS.generico}
          <circle cx="11" cy="-9" r="6" fill="#0EA5E9" stroke="#fff" stroke-width="1"/>
          <text x="11" y="-6.5" font-size="7" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="800" fill="#fff">${m.n}</text>
          <text x="0" y="16" font-size="6.5" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="#0D1420">${esc(cls.label)}</text>
        </g>`).join('')
      // eletrodutos: liga cada ponto ao QDL (se houver) com curva pontilhada
      const dutos = qdl ? eleMarks.filter(x=>x!==qdl).map(({m})=>{
        const mx=(m.x+qdl.m.x)/2, my=Math.min(m.y,qdl.m.y)-6
        return `<path d="M${m.x} ${m.y} Q ${mx} ${my} ${qdl.m.x} ${qdl.m.y}" fill="none" stroke="#16A34A" stroke-width="0.5" stroke-dasharray="1.5,1.2" vector-effect="non-scaling-stroke" style="stroke-width:1.4px" opacity="0.7"/>`
      }).join('') : ''
      // legenda dos símbolos presentes
      const usados = [...new Map(eleMarks.map(x=>[x.cls.sym,x.cls])).values()]
      const legenda = `<div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;padding:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px">
        ${usados.map(c=>`<div style="display:flex;align-items:center;gap:7px;font-size:10.5px;color:#334155">
          <svg viewBox="-12 -14 24 32" width="22" height="29">${ELE_SYMBOLS[c.sym]||ELE_SYMBOLS.generico}</svg>
          <span><b>${esc(c.label)}</b> — ${esc(c.tipo)}</span></div>`).join('')}
        <div style="display:flex;align-items:center;gap:7px;font-size:10.5px;color:#334155"><span style="width:20px;height:0;border-top:2px dashed #16A34A;display:inline-block"></span> Eletroduto / circuito até o QDL</div>
      </div>`
      // quadro de cargas por cômodo (contagem de pontos por tipo)
      const byRoomCarga={}
      eleMarks.forEach(({m,cls})=>{ if(cls.sym==='quadro')return; const r=m.room||'Geral'; (byRoomCarga[r]=byRoomCarga[r]||{tug:0,tomA:0,piso:0,int:0,luz:0}); 
        if(cls.sym==='tomada_baixa')byRoomCarga[r].tug++; else if(cls.sym==='tomada_alta')byRoomCarga[r].tomA++; else if(cls.sym==='tomada_piso')byRoomCarga[r].piso++;
        else if(cls.sym.startsWith('interruptor'))byRoomCarga[r].int++; else if(cls.sym==='ponto_luz'||cls.sym==='arandela')byRoomCarga[r].luz++ })
      const VA_TUG=100, VA_LUZ=60
      const cargaRows = Object.entries(byRoomCarga).map(([r,c])=>{
        const totTom=c.tug+c.tomA+c.piso
        const va = totTom*VA_TUG + c.luz*VA_LUZ
        return `<tr><td><b>${esc(r)}</b></td><td style="text-align:center">${totTom||'—'}</td><td style="text-align:center">${c.int||'—'}</td><td style="text-align:center">${c.luz||'—'}</td><td style="text-align:right">${va} VA</td></tr>`
      }).join('')
      const totalVA = Object.values(byRoomCarga).reduce((s,c)=>s+((c.tug+c.tomA+c.piso)*VA_TUG+c.luz*VA_LUZ),0)
      const cargaTbl = cargaRows ? `<table class="ex-tbl"><thead><tr><th>Cômodo</th><th style="text-align:center">Tomadas</th><th style="text-align:center">Interrup.</th><th style="text-align:center">Pts Luz</th><th style="text-align:right">Carga estimada</th></tr></thead><tbody>${cargaRows}<tr style="background:#0D1420;color:#fff"><td colspan="4"><b>Demanda total estimada</b></td><td style="text-align:right"><b>${totalVA} VA</b></td></tr></tbody></table>
        <p class="ex-p" style="font-size:9.5px;color:#94A3B8;margin-top:4px">Estimativa simplificada (TUG ${VA_TUG}VA · ponto de luz ${VA_LUZ}VA). O dimensionamento final de circuitos, disjuntores e bitolas deve ser feito por engenheiro eletricista responsável (ART/NBR 5410).</p>` : ''

      const head = `<div style="background:#0D1420;color:#38BDF8;font-size:11px;font-weight:700;padding:8px 14px;letter-spacing:1px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
        <span>PLANTA ELÉTRICA — Símbolos ABNT NBR 5444</span><span style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:400">${eleMarks.length} pontos${qdl?' · QDL':''}</span></div>`
      const fig = `<div style="border:1px solid #CBD5E1;border-top:none;border-radius:0 0 8px 8px;overflow:hidden">
        <div style="position:relative;width:100%">
          <img src="${bgImage}" style="width:100%;display:block;filter:grayscale(0.35) contrast(0.92) brightness(1.05)"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">${dutos}${syms}</svg>
        </div></div>`
      const titulo = numFn ? `<h2><span class="ex-sec-num">${numFn()}</span>Planta Elétrica (ABNT NBR 5444)</h2>` : `<h2>Planta Elétrica (ABNT NBR 5444)</h2>`
      return `<div class="ex-sec ex-breakable">${titulo}
        <p class="ex-p" style="margin-bottom:10px">Representação técnica dos pontos elétricos com símbolos normalizados. Tomadas, interruptores, pontos de luz e quadro de distribuição posicionados conforme a planta. As linhas pontilhadas indicam o encaminhamento de eletrodutos até o QDL.</p>
        ${head}${fig}${legenda}
        <h3 class="ex-amb" style="margin-top:18px">Quadro de Cargas — estimativa por cômodo</h3>${cargaTbl}
      </div>`
    }

    // ── MAPA DE CALOR Wi-Fi — propagação aproximada dos APs (paredes de concreto) ──
    // Modelo simples: cada AP irradia um gradiente radial. Concreto atenua forte,
    // então o raio "bom" é curto. Gera mancha verde→amarelo→vermelho + aviso de zonas mortas.
    function buildHeatmap(numFn){
      const aps = markers.filter(m=>/access point|\bap\b|wi-?fi|u6|unifi ap/.test(((m.name||'')+' '+(m.code||'')).toLowerCase()))
      if(!bgImage) return ''
      // raios em % da largura da planta (aprox.). Concreto: cobertura útil menor.
      // forte ~ até 14%, médio ~ 22%, fraco ~ 30% do lado da imagem.
      const R_FORTE=14, R_MEDIO=22, R_FRACO=30
      const grads = aps.map((m,i)=>`
        <radialgradient id="ap${i}" cx="${m.x}%" cy="${m.y}%" r="${R_FRACO}%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#16A34A" stop-opacity="0.55"/>
          <stop offset="${(R_FORTE/R_FRACO*100).toFixed(0)}%" stop-color="#84CC16" stop-opacity="0.40"/>
          <stop offset="${(R_MEDIO/R_FRACO*100).toFixed(0)}%" stop-color="#FACC15" stop-opacity="0.30"/>
          <stop offset="100%" stop-color="#DC2626" stop-opacity="0.16"/>
        </radialgradient>`).join('')
      const manchas = aps.map((m,i)=>`<circle cx="${m.x}" cy="${m.y}" r="${R_FRACO}" fill="url(#ap${i})"/>`).join('')
      const pinos = aps.map((m,i)=>`<g transform="translate(${m.x},${m.y})">
        <circle r="2.2" fill="#0E7490" stroke="#fff" stroke-width="0.7"/>
        <text x="0" y="-3.2" font-size="3" text-anchor="middle" font-family="'DM Sans',sans-serif" font-weight="700" fill="#0E7490">AP${i+1}</text></g>`).join('')

      // detecção simples de "zona morta": cômodos cujo centro está fora do raio médio de todo AP
      const semCobertura = (rooms||[]).filter(r=>{
        const rx=r.x||50, ry=r.y||50
        return !aps.some(a=>{ const dx=a.x-rx, dy=a.y-ry; return Math.sqrt(dx*dx+dy*dy) <= R_MEDIO })
      }).map(r=>r.name)

      const aviso = aps.length===0
        ? `<div style="background:#FEF3C7;border:1px solid #F59E0B;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#92400E;margin-top:10px">⚠ Nenhum Access Point posicionado na planta. Adicione APs para ver a cobertura Wi-Fi.</div>`
        : semCobertura.length
        ? `<div style="background:#FEE2E2;border:1px solid #DC2626;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#991B1B;margin-top:10px"><b>⚠ Possíveis zonas sem cobertura adequada:</b> ${semCobertura.map(esc).join(', ')}. Considere reposicionar ou adicionar um AP.</div>`
        : `<div style="background:#DCFCE7;border:1px solid #16A34A;border-radius:8px;padding:10px 12px;font-size:11.5px;color:#065F46;margin-top:10px">✓ Todos os cômodos identificados estão dentro do alcance médio de pelo menos um AP.</div>`

      const head = `<div style="background:#0D1420;color:#38BDF8;font-size:11px;font-weight:700;padding:8px 14px;letter-spacing:1px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center">
        <span>COBERTURA Wi-Fi — Propagação aproximada</span><span style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:400">${aps.length} AP${aps.length!==1?'s':''} · paredes de concreto</span></div>`
      const fig = `<div style="border:1px solid #CBD5E1;border-top:none;border-radius:0 0 8px 8px;overflow:hidden">
        <div style="position:relative;width:100%">
          <img src="${bgImage}" style="width:100%;display:block;filter:grayscale(0.5) brightness(1.05)"/>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%"><defs>${grads}</defs>${manchas}${pinos}</svg>
        </div></div>`
      const legenda = `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:10.5px;color:#334155">
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#16A34A;opacity:.7"></span>Sinal forte</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#FACC15;opacity:.7"></span>Sinal médio</span>
        <span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:50%;background:#DC2626;opacity:.7"></span>Sinal fraco / borda</span>
      </div>`
      const titulo = numFn ? `<h2><span class="ex-sec-num">${numFn()}</span>Cobertura Wi-Fi (Mapa de Calor)</h2>` : `<h2>Cobertura Wi-Fi (Mapa de Calor)</h2>`
      return `<div class="ex-sec ex-breakable">${titulo}
        <p class="ex-p" style="margin-bottom:10px">Estimativa visual do alcance dos Access Points considerando <b>paredes de concreto</b> (alta atenuação). A mancha verde indica sinal forte; amarelo, médio; vermelho, sinal fraco na borda. É uma aproximação — a cobertura real depende de mobiliário, espelhos e interferências.</p>
        ${head}${fig}${legenda}${aviso}</div>`
    }

    const cliente=projectInfo.client||fromProposal?.client_name||'Cliente'
    const hoje=new Date().toLocaleDateString('pt-BR')
    const T=(rows,cols)=>`<table class="ex-tbl"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`
    const esc=s=>(s==null?'':String(s))
    // ── Número do pino na planta — para cruzar tabela ↔ planta ──
    const pin=(n,color='#0EA5E9')=>`<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:${color};color:#fff;font-size:9px;font-weight:800;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);vertical-align:middle">${n}</span>`
    const _normKey = s => String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')
    const pinNum = (...keys)=>{
      for(const k of keys){ if(k==null) continue; const kk=_normKey(k); if(!kk) continue
        const hit = markers.find(m=> _normKey(m.id)===kk || _normKey(m.code)===kk || _normKey(m.n)===kk || _normKey('#'+m.n)===kk )
        if(hit) return hit.n
        const byName = markers.find(m=> (m.code && kk.includes(_normKey(m.code))) || (m.name && _normKey(m.name).includes(kk) && kk.length>=3) )
        if(byName) return byName.n
      }
      return null
    }
    // célula <td> com o número do pino (ou — quando não casar)
    const pinCell = (...keys)=>{ const n=pinNum(...keys); return `<td style="text-align:center">${n!=null?pin(n):'<span style="color:#CBD5E1">—</span>'}</td>` }

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
    // REGRA: o RACK só aparece no documento se houver um marcador de rack na planta.
    // Sem rack posicionado, nada de rack "do nada".
    const rackMarker = markers.find(m=>isRackItem(m.name||'', m.code||''))
    const hasRack = !!rackMarker
    const rackCfg = d.rack_config || {}
    // itens do rack: prioriza o que VOCÊ configurou no rack da planta; só usa o da IA como apoio
    const rackItems = hasRack
      ? ((rackMarker.rackEquip||[]).length
          ? rackMarker.rackEquip.map(e=>({u:e.u||'',equip:e.name||e.equip||'',funcao:e.funcao||'',watts:e.watts||'—'}))
          : (d.rack_items || d.rack || []))
      : []
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

    // Tabela de portas/cabos do rack — completa (APs, câmeras, keystones, uplinks)
    const rackCableTableHtml = (d.rack_cable_table||[]).length ? (()=>{
      const rows = d.rack_cable_table
      // Color legend
      const COR_LABEL = {'Azul':'#0EA5E9','Verde':'#16A34A','Amarelo':'#D97706','Cinza':'#6B7280','Vermelho':'#DC2626','Roxo':'#7C3AED'}
      const corBadge = (cor) => {
        const c = COR_LABEL[cor]||'#374151'
        return `<span style="display:inline-block;background:${c};color:#fff;padding:1px 8px;border-radius:8px;font-size:9px;font-weight:600">${cor||'—'}</span>`
      }
      const renderRow = r => `<tr>
        <td><b style="font-family:monospace;background:#0D1420;color:#38BDF8;padding:2px 6px;border-radius:3px;font-size:10px">${esc(r.porta_patch)}</b></td>
        <td style="font-size:10px">${esc(r.device_origem)}</td>
        <td style="font-family:monospace;font-size:10px;color:#0369A1">${esc(r.porta_origem)}</td>
        <td>${esc(r.destino)}</td>
        <td style="font-family:monospace;font-size:10px;color:#059669">${esc(r.device_nome||'—')}</td>
        <td style="font-size:10px">${esc(r.tipo)}</td>
        <td style="font-size:10px">${esc(r.metros)}m</td>
        <td style="font-family:monospace;font-weight:700;color:#0D1420;font-size:10px;background:#FFF7ED;padding:2px 6px;border-radius:3px">${esc(r.etiqueta)}</td>
        <td>${corBadge(r.cor)}</td>
      </tr>`
      const headers = ['Porta PP','Device Origem','Porta Origem','Destino','Nome no Sistema','Tipo','m','Etiqueta','Cor']
      const cols = headers.map(h=>`<th>${h}</th>`).join('')
      // Group by color for visual separation
      const uplink = rows.filter(r=>r.cor==='Cinza'||r.etiqueta?.includes('UPLINK'))
      const aps = rows.filter(r=>r.cor==='Azul'&&!r.etiqueta?.includes('UPLINK'))
      const cams = rows.filter(r=>r.cor==='Verde')
      const ks = rows.filter(r=>r.cor==='Amarelo')
      const outros = rows.filter(r=>!['Cinza','Azul','Verde','Amarelo'].includes(r.cor)&&!r.etiqueta?.includes('UPLINK'))
      const makeBlock = (label, color, rowsArr) => rowsArr.length ? `
        <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;padding:6px 0 3px;border-bottom:2px solid ${color};margin:12px 0 6px">${label} — ${rowsArr.length} cabo${rowsArr.length!==1?'s':''}</div>
        <table class="ex-tbl"><thead><tr>${cols}</tr></thead><tbody>${rowsArr.map(renderRow).join('')}</tbody></table>` : ''
      return [
        makeBlock('Uplink / Infraestrutura', '#6B7280', uplink),
        makeBlock('Access Points (PoE)', '#0EA5E9', aps),
        makeBlock('Câmeras de Segurança (PoE)', '#16A34A', cams),
        makeBlock('Keystones / Pontos de Dados', '#D97706', ks),
        makeBlock('Outros', '#7C3AED', outros),
      ].join('')
    })() : ''

    // Tópico 5 — Pontos de parede
    const pontosHtml=(d.pontos||[]).map(a=>`<h3 class="ex-amb">${esc(a.ambiente)}</h3>${T((a.linhas||[]).map(l=>`<tr>${pinCell(l.ponto,l.equip)}<td><b>${esc(l.ponto)}</b></td><td>${esc(l.equip)}</td><td>${esc(l.parede)}</td><td>${esc(l.dist)}</td><td>${esc(l.alt)}</td><td>${esc(l.caixa)}</td><td>${esc(l.cabo)}</td></tr>`).join(''),['Nº','Ponto','Equip.','Parede ref.','Dist.','Alt.','Caixa','Cabo'])}`).join('')

    // Tópico 6 — Cabos de rede com patch panel e etiquetas
    const cabosRedeHtml = (d.cabos_rede||[]).length
      ? T(d.cabos_rede.map(r=>`<tr>${pinCell(r.destino,r.etiqueta,r.id)}<td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.bitola)}</td><td>${esc(r.metros)}m</td><td><span style="background:${r.cor_etiqueta==='Azul'?'#0EA5E9':r.cor_etiqueta==='Amarelo'?'#D97706':r.cor_etiqueta==='Verde'?'#16A34A':r.cor_etiqueta==='Vermelho'?'#DC2626':'#374151'};color:#fff;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600">${esc(r.cor_etiqueta||'Azul')}</span></td><td style="font-family:monospace;font-size:10px;background:#F0F9FF;color:#0369A1"><b>${esc(r.porta_patch||'-')}</b></td><td style="font-family:monospace;font-size:10px;font-weight:700;color:#0D1420">${esc(r.etiqueta||'-')}</td></tr>`).join(''),['Nº','ID','Origem','Destino','Tipo','Bitola','Metros','Cor Cabo','Porta PP','Etiqueta'])
      : ''

    // Tópico 8 — Cabos elétricos detalhados por cômodo
    const cabosEletHtml = (d.cabos_eletricos_por_comodo||[]).length
      ? d.cabos_eletricos_por_comodo.map(comodo=>`
<h3 class="ex-amb">${esc(comodo.comodo)}</h3>
${T((comodo.itens||[]).map(r=>`<tr>${pinCell(r.id,r.equip)}<td><b>${esc(r.id)}</b></td><td>${esc(r.equip)}</td><td>${esc(r.tipo)}</td><td style="font-family:monospace;font-size:10px">${esc(r.fios)}</td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.metros)}m</td><td style="color:#6B7280;font-size:10px">${esc(r.obs)}</td></tr>`).join(''),['Nº','ID','Equipamento','Tipo','Fios/Bitola','Origem','Destino','m','Obs'])}`).join('')
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
    // Categorias para item 7 — Segurança ANTES de Som (câmeras com "áudio" no nome são segurança)
    const CATS_MAP = {
      'Segurança': n=> /câmera|camera|dome|bullet|cftv|sensor mmwave|mmwave|sensor prese|alarme/i.test(n),
      'Rede':    n=> /access point|ap |wi-fi|wifi|keystone|switch|patch|roteador|router/i.test(n),
      'Som':     n=> /caixa|amplif|subwoofer|receiver|som ambiente|sonoriz/i.test(n),
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

    // ── Gráficos melhorados ─────────────────────────────────────────────────
    const totalPontos=markers.length
    const roomCounts=Object.entries(byRoom).map(([r,items])=>({room:r,qty:Object.values(items).reduce((s,i)=>s+i.qty,0)})).sort((a,b)=>b.qty-a.qty)
    const maxRoom=Math.max(1,...roomCounts.map(r=>r.qty))
    const CAT_COLORS={'Segurança':'#DC2626','Redes':'#0EA5E9','Sonorização':'#BE185D','Automação':'#059669','Gourmet':'#D97706','Outro':'#6B7280'}
    const catColors=['#0EA5E9','#059669','#DC2626','#BE185D','#D97706','#7C3AED','#0891B2','#65A30D']
    const barColors=['#1E3A5F','#0EA5E9','#059669','#DC2626','#7C3AED','#D97706','#0891B2','#BE185D']

    // Contagem por categoria
    const byCategCount={}
    markers.forEach(m=>{const c=m.category||'Outro'; byCategCount[c]=(byCategCount[c]||0)+1})
    const categEntries=Object.entries(byCategCount).sort((a,b)=>b[1]-a[1])
    const totalCateg=categEntries.reduce((s,[,v])=>s+v,0)

    // Gráfico 1 — Barras horizontais por ambiente (limpo, com % e qtd)
    const grafico1=`
<div style="background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:18px 20px;margin-bottom:16px;page-break-inside:avoid">
  <div style="font-size:13px;font-weight:700;color:#0D1420;margin-bottom:4px">Pontos por Ambiente</div>
  <div style="font-size:10px;color:#6B7280;margin-bottom:14px">${totalPontos} pontos · ${roomCounts.length} ambientes</div>
  ${roomCounts.map((r,i)=>`
  <div style="display:grid;grid-template-columns:140px 1fr 30px;gap:8px;align-items:center;margin-bottom:6px">
    <div style="font-size:10px;color:#374151;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(r.room)}">${esc(r.room)}</div>
    <div style="background:#EEF4FB;border-radius:3px;height:18px;overflow:hidden">
      <div style="width:${Math.max(4,Math.round(r.qty/maxRoom*100))}%;background:${catColors[i%catColors.length]};height:100%;display:flex;align-items:center;padding-left:6px">
        <span style="color:#fff;font-size:9px;font-weight:700;white-space:nowrap">${r.qty}</span>
      </div>
    </div>
    <div style="font-size:9px;color:#6B7280;text-align:right">${Math.round(r.qty/totalPontos*100)}%</div>
  </div>`).join('')}
</div>`

    // Gráfico 2 — Contagem por categoria (cards limpos)
    const grafico2=categEntries.length ? `
<div style="background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:18px 20px;margin-bottom:16px;page-break-inside:avoid">
  <div style="font-size:13px;font-weight:700;color:#0D1420;margin-bottom:4px">Equipamentos por Categoria</div>
  <div style="font-size:10px;color:#6B7280;margin-bottom:14px">${totalCateg} equipamentos · ${categEntries.length} categorias</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px">
    ${categEntries.map(([cat,qty])=>{const col=CAT_COLORS[cat]||'#6B7280'; const pct=Math.round(qty/totalCateg*100); return `
    <div style="border:1px solid ${col}40;border-radius:7px;padding:12px 14px;background:${col}08">
      <div style="font-size:22px;font-weight:800;color:${col};line-height:1">${qty}</div>
      <div style="font-size:11px;font-weight:600;color:#374151;margin-top:2px">${esc(cat)}</div>
      <div style="margin-top:6px;background:#E2E8F0;border-radius:2px;height:4px">
        <div style="width:${pct}%;background:${col};height:100%;border-radius:2px"></div>
      </div>
      <div style="font-size:9px;color:#6B7280;margin-top:3px">${pct}% do total</div>
    </div>`}).join('')}
  </div>
</div>` : ''

    // Gráfico 3 — Cabeamento (barras limpas)
    const resumoCabos = d.resumo_cabos || []
    const maxMetros = Math.max(1,...resumoCabos.map(r=>parseInt(r.metros_total)||0))
    const grafico3 = resumoCabos.length ? `
<div style="background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:18px 20px;margin-bottom:16px;page-break-inside:avoid">
  <div style="font-size:13px;font-weight:700;color:#0D1420;margin-bottom:4px">Metragem de Cabeamento</div>
  <div style="font-size:10px;color:#6B7280;margin-bottom:14px">${resumoCabos.reduce((s,r)=>s+(parseInt(r.metros_total)||0),0)}m total estimado</div>
  ${resumoCabos.map((r,i)=>`
  <div style="display:grid;grid-template-columns:180px 1fr 50px;gap:8px;align-items:center;margin-bottom:7px">
    <div style="font-size:10px;color:#374151;text-align:right">${esc(r.tipo)}</div>
    <div style="background:#EEF4FB;border-radius:3px;height:20px">
      <div style="width:${Math.max(4,Math.round((parseInt(r.metros_total)||0)/maxMetros*100))}%;background:${catColors[i%catColors.length]};height:100%;border-radius:3px;display:flex;align-items:center;justify-content:flex-end;padding-right:6px">
        <span style="color:#fff;font-size:9px;font-weight:700">${r.metros_total}m</span>
      </div>
    </div>
    <div style="font-size:10px;font-weight:700;color:#0369A1;text-align:right">${r.metros_total}m</div>
  </div>`).join('')}
</div>` : ''

    // Gráfico 4 — Fases do projeto (timeline limpa)
    const fases=['Infraestrutura','Cabeamento','Instalação','Configuração','Testes e Entrega']
    const fasesDesc=['Eletrodutos, caixas 4×4, nichos, tomadas dedicadas','CAT6, elétrico keypads, som, câmeras, APs','Rack, equipamentos, keypads, câmeras, sensores','Gateway Zigbee, parear dispositivos, cenas, app','Wi-Fi, som, câmeras, validação, treinamento cliente']
    const faseDuration=['2 sem','1 sem','2 sem','1 sem','3 dias']
    const faseColors=['#0EA5E9','#7C3AED','#059669','#D97706','#16A34A']
    const grafico4=`
<div style="background:#fff;border:1px solid #D1E6F8;border-radius:8px;padding:18px 20px;page-break-inside:avoid">
  <div style="font-size:13px;font-weight:700;color:#0D1420;margin-bottom:16px">Fases do Projeto</div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:0">
    ${fases.map((f,i)=>`
    <div style="position:relative;padding:0 4px">
      ${i<fases.length-1?`<div style="position:absolute;top:16px;left:50%;right:-50%;height:2px;background:linear-gradient(to right,${faseColors[i]},${faseColors[i+1]});z-index:0"></div>`:''}
      <div style="position:relative;z-index:1;text-align:center">
        <div style="width:32px;height:32px;border-radius:50%;background:${faseColors[i]};color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;margin:0 auto 6px;border:3px solid #fff;box-shadow:0 0 0 2px ${faseColors[i]}40">${i+1}</div>
        <div style="font-size:10px;font-weight:700;color:#0D1420;margin-bottom:3px">${f}</div>
        <div style="font-size:8.5px;color:#6B7280;line-height:1.4;margin-bottom:4px">${fasesDesc[i]}</div>
      </div>
    </div>`).join('')}
  </div>
</div>`

    const _eletr = mode==='eletrica'
    return `<style>${EXEC_CSS}</style>
<div class="ex-doc">
  <!-- CAPA -->
  <div class="ex-cover">
    <div class="ex-cover-top">${_eletr?'DOCUMENTO TÉCNICO · ELÉTRICA E Wi-Fi':isObra?'DOCUMENTO DE OBRA · INFRAESTRUTURA':'DOCUMENTO TÉCNICO · PROJETO EXECUTIVO'}</div>
    <img src="${LOGO_EXEC}" alt="RARO HOME" style="width:160px;max-width:50%;margin:0 auto 8px;display:block"/>
    <div class="ex-cover-tag">CASA · TECNOLOGIA · LAZER</div>
    <div class="ex-cover-title">${_eletr?'Planta Elétrica e Cobertura Wi-Fi':isObra?'Projeto de Obra — Cabos e Infraestrutura':'Projeto Executivo de Automação'}</div>
    <div class="ex-cover-sub">${_eletr?'Símbolos ABNT NBR 5444 · Quadro de cargas · Mapa de calor Wi-Fi<br>Pontos elétricos e cobertura aproximada':isObra?'Caminho dos cabos · Metragens · Alturas · Caixas 4×4<br>Guia direto para o eletricista e o pedreiro':'Posições exatas · Cabeamento · Pré-instalação<br>Guia técnico para obra e arquiteto'}</div>
    <div class="ex-cover-client"><div class="ex-cc-name">${esc(cliente)}</div><div class="ex-cc-meta">${hoje} · RARO Home</div></div>
    <div class="ex-cover-foot">RARO Home · contato@rarohome.com.br · (21) 98170-9009</div>
  </div>

  ${(()=>{ if(isObra||_eletr) return ''; let _n=0
    const secN2=(title,inner,breakable=false)=> inner ? `<div class="ex-sec${breakable?' ex-breakable':''}"><h2><span class="ex-sec-num">${++_n}</span>${title}</h2>${inner}</div>` : ''
    if(bgImage){
      const dots=markers.map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
        return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:${st.c};color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${m.n}</div>`}).join('')
      return secN2('Planta de Pontos', `<div style="position:relative;display:inline-block;max-width:100%"><img src="${bgImage}" style="max-width:100%;display:block;border:1px solid #D1E6F8;border-radius:6px"/>${dots}</div>`)
    }
    return ''
  })()}

  ${(()=>{ let _n=(bgImage && !isObra) ? 1 : 0
    const secN=(title,inner,breakable=false)=> inner ? `<div class="ex-sec${breakable?' ex-breakable':''}"><h2><span class="ex-sec-num">${++_n}</span>${title}</h2>${inner}</div>` : ''
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
    // ── Helper: pin badge com número da planta ──────────────────────────────
    // (pin/pinNum/pinCell já definidos no topo de buildExecHtml)
    const CATCOLOR={'Redes':'#0EA5E9','Segurança':'#DC2626','Sonorização':'#BE185D','Automação':'#059669','Gourmet':'#D97706'}
    const catColor=(cat)=>CATCOLOR[cat]||'#6B7280'

    // ── Tabela Automação (Interruptores, Tomadas, Sensores, Hub IR, Módulos) ──
    const tblAutomacao = (d.tabela_automacao||[]).length
      ? T((d.tabela_automacao||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Automação'))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(r.id)}</td><td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td>${esc(r.funcao)}</td><td style="font-size:10px">${esc(r.protocolo||'Zigbee')}</td><td style="font-size:10px">${esc(r.posicao)}</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Função','Protocolo','Posição/Altura','Obs'])
      : ''

    // ── Tabela Segurança (Câmeras, Sensores de Alarme) ────────────────────────
    const tblSeguranca = (d.tabela_seguranca||[]).length
      ? T((d.tabela_seguranca||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Segurança'))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(r.id)}</td><td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.resolucao||'—')}</td><td style="font-size:10px">${esc(r.tipo)}</td><td style="font-size:10px">${esc(r.posicao)}</td><td style="font-size:10px">${esc(r.angulo||'—')}</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Resolução','Tipo','Posição','Ângulo','Obs'])
      : ''

    // ── Tabela Som Ambiente ────────────────────────────────────────────────────
    const tblSom = (d.tabela_som||[]).length
      ? T((d.tabela_som||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor('Sonorização'))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(r.id)}</td><td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.zona)}</td><td style="font-size:10px">${esc(r.tipo)}</td><td style="font-family:monospace;font-size:10px">${esc(r.saida_amplif)}</td><td style="font-size:10px">${esc(r.cabo)}</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Zona','Tipo','Saída Amplif.','Cabo','Obs'])
      : ''

    // ── Tabela Devices no Teto (APs, Câmeras, Caixas de Som, Sensores) ────────
    const tblTeto = (d.tabela_teto||[]).length
      ? T((d.tabela_teto||[]).map(r=>`<tr>${(()=>{const n=pinNum(r.id,r.equip)??r.num_planta; return n!=null?`<td style="text-align:center">${pin(n,catColor(r.categoria||'Redes'))}</td>`:`<td style="text-align:center;color:#CBD5E1">—</td>`})()}<td style="font-family:monospace;font-size:10px;font-weight:700">${esc(r.id)}</td><td>${esc(r.equip)}</td><td>${esc(r.ambiente)}</td><td style="font-size:10px">${esc(r.instalacao)}</td><td style="font-family:monospace;font-size:10px">${esc(r.origem)}</td><td style="font-size:10px">${esc(r.cabo)}</td><td style="font-size:10px">${esc(r.metros)}m</td><td style="font-size:10px;color:#D97706">${esc(r.obs||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Posição Teto','Vem de / Origem','Cabo','m','Obs'])
      : (d.modulos_teto||[]).length
        ? (d.modulos_teto||[]).map(mt=>`<h3 class="ex-amb">${esc(mt.ambiente)}</h3>${T((mt.itens||[]).map(it=>`<tr><td>${esc(it)}</td></tr>`).join(''),['Itens de teto / forro'])}`).join('')
        : ''

    // ── Tópico Gestão e Controle ─────────────────────────────────────────────
    const gestaoTxt=`
<p class="ex-p">A RARO Home entrega uma solução completa de gestão inteligente. Abaixo, as principais interfaces de controle disponíveis após a instalação.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:16px 0">

  <div style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden">
    <div style="background:#0D1420;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#0EA5E9;display:flex;align-items:center;justify-content:center;font-size:12px">📶</div>
      <span style="color:#fff;font-size:11px;font-weight:700">Rede Wi-Fi e APs — App UniFi</span>
    </div>
    <div style="background:#EBF4FF;height:100px;display:flex;align-items:center;justify-content:center;overflow:hidden">
      <svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg" width="260" height="100">
        <rect width="260" height="100" fill="#EBF4FF"/>
        <rect x="6" y="6" width="76" height="88" rx="5" fill="#fff" stroke="#CBD5E1" stroke-width=".8"/>
        <rect x="6" y="6" width="76" height="16" rx="5" fill="#0D1420"/>
        <text x="44" y="17" font-size="6" fill="#94A3B8" text-anchor="middle" font-family="sans-serif">UniFi Network</text>
        <circle cx="30" cy="52" r="14" fill="#0EA5E920"/><circle cx="30" cy="52" r="7" fill="#0EA5E9"/><text x="30" y="74" font-size="5.5" fill="#0369A1" text-anchor="middle" font-family="sans-serif">AP-Sala</text>
        <circle cx="66" cy="52" r="14" fill="#16A34A20"/><circle cx="66" cy="52" r="7" fill="#16A34A"/><text x="66" y="74" font-size="5.5" fill="#166534" text-anchor="middle" font-family="sans-serif">AP-Quarto</text>
        <rect x="90" y="6" width="164" height="88" rx="5" fill="#fff" stroke="#CBD5E1" stroke-width=".8"/>
        <rect x="90" y="6" width="164" height="16" rx="5" fill="#0D1420"/>
        <text x="172" y="17" font-size="6" fill="#94A3B8" text-anchor="middle" font-family="sans-serif">Velocidade · Clientes · Status</text>
        <rect x="98" y="28" width="148" height="9" rx="2" fill="#EEF2F7"/><rect x="98" y="28" width="110" height="9" rx="2" fill="#0EA5E9"/><text x="250" y="35.5" font-size="5" fill="#0369A1" font-family="sans-serif">AP-Sala</text>
        <rect x="98" y="42" width="148" height="9" rx="2" fill="#EEF2F7"/><rect x="98" y="42" width="95" height="9" rx="2" fill="#16A34A"/><text x="197" y="49.5" font-size="5" fill="#166534" font-family="sans-serif">AP-Quarto</text>
        <rect x="98" y="56" width="148" height="9" rx="2" fill="#EEF2F7"/><rect x="98" y="56" width="130" height="9" rx="2" fill="#7C3AED"/><text x="232" y="63.5" font-size="5" fill="#4C1D95" font-family="sans-serif">AP-Ext</text>
        <rect x="98" y="72" width="148" height="14" rx="3" fill="#F1F5F9"/>
        <text x="172" y="82" font-size="6" fill="#374151" text-anchor="middle" font-family="sans-serif">3 APs · 28 clientes conectados · 500Mbps</text>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9.5px;font-weight:700;color:#0F172A">Gestão completa da rede</div>
      <div style="font-size:8.5px;color:#64748B;margin-top:1px">Status APs · Cobertura por cômodo · Velocidade · App iOS e Android</div>
    </div>
  </div>

  <div style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden">
    <div style="background:#0D1420;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#7C3AED;display:flex;align-items:center;justify-content:center;font-size:12px">📱</div>
      <span style="color:#fff;font-size:11px;font-weight:700">Automação — App RARO Home</span>
    </div>
    <div style="background:#F5F0FF;height:100px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg" width="260" height="100">
        <rect width="260" height="100" fill="#F5F0FF"/>
        <rect x="6" y="6" width="58" height="88" rx="8" fill="#0D1420" stroke="#1E293B" stroke-width=".8"/>
        <rect x="9" y="16" width="52" height="70" rx="2" fill="#1E293B"/>
        <rect x="9" y="16" width="52" height="11" fill="#2D1B69"/>
        <text x="35" y="24.5" font-size="5.5" fill="#C4B5FD" text-anchor="middle" font-family="sans-serif">RARO Home</text>
        <rect x="12" y="30" width="21" height="15" rx="2" fill="#05966950"/><text x="22.5" y="40.5" font-size="5" fill="#A7F3D0" text-anchor="middle" font-family="sans-serif">Sala ON</text>
        <rect x="37" y="30" width="21" height="15" rx="2" fill="#37415150"/><text x="47.5" y="40.5" font-size="5" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Qt OFF</text>
        <rect x="12" y="49" width="46" height="10" rx="2" fill="#1D4ED850"/><text x="35" y="57" font-size="5" fill="#BFDBFE" text-anchor="middle" font-family="sans-serif">▶ Modo Cinema</text>
        <rect x="12" y="63" width="21" height="16" rx="2" fill="#D9780650"/><text x="22.5" y="73.5" font-size="5" fill="#FDE68A" text-anchor="middle" font-family="sans-serif">Cort 75%</text>
        <rect x="37" y="63" width="21" height="16" rx="2" fill="#0891B250"/><text x="47.5" y="73.5" font-size="5" fill="#BAE6FD" text-anchor="middle" font-family="sans-serif">AC 22°</text>
        <rect x="76" y="6" width="178" height="88" rx="5" fill="#fff" stroke="#DDD6FE" stroke-width=".8"/>
        <rect x="76" y="6" width="178" height="14" rx="5" fill="#4C1D95"/>
        <text x="165" y="16" font-size="6" fill="#C4B5FD" text-anchor="middle" font-family="sans-serif">Cenas · Horários · Automações</text>
        <rect x="84" y="24" width="40" height="18" rx="3" fill="#FEF3C7" stroke="#E2E8F0" stroke-width=".5"/><text x="104" y="35.5" font-size="6.5" fill="#92400E" text-anchor="middle" font-family="sans-serif">Bom dia ☀</text>
        <rect x="130" y="24" width="40" height="18" rx="3" fill="#1E1B4B" stroke="#E2E8F0" stroke-width=".5"/><text x="150" y="35.5" font-size="6.5" fill="#C4B5FD" text-anchor="middle" font-family="sans-serif">Cinema 🎬</text>
        <rect x="176" y="24" width="40" height="18" rx="3" fill="#FFF7ED" stroke="#E2E8F0" stroke-width=".5"/><text x="196" y="35.5" font-size="6.5" fill="#9A3412" text-anchor="middle" font-family="sans-serif">Jantar 🍷</text>
        <rect x="84" y="48" width="132" height="18" rx="3" fill="#F0FDF4" stroke="#BBF7D0" stroke-width=".5"/>
        <text x="150" y="57" font-size="5.5" fill="#374151" text-anchor="middle" font-family="sans-serif">Automação ativa: presença detectada → luz liga</text>
        <text x="150" y="64" font-size="5" fill="#64748B" text-anchor="middle" font-family="sans-serif">Sensor mmWave · Banheiro Master · Online</text>
        <rect x="84" y="72" width="132" height="14" rx="3" fill="#EFF6FF" stroke="#BFDBFE" stroke-width=".5"/>
        <text x="150" y="81" font-size="5.5" fill="#1D4ED8" text-anchor="middle" font-family="sans-serif">⚡ 24 dispositivos pareados · Todos online</text>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9.5px;font-weight:700;color:#0F172A">Controle total no smartphone</div>
      <div style="font-size:8.5px;color:#64748B;margin-top:1px">Cenas · Automações · Cortinas · AC · Keypads · iOS e Android</div>
    </div>
  </div>

  <div style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden">
    <div style="background:#0D1420;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#DC2626;display:flex;align-items:center;justify-content:center;font-size:12px">📷</div>
      <span style="color:#fff;font-size:11px;font-weight:700">Câmeras — UniFi Protect</span>
    </div>
    <div style="background:#1C1917;height:100px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg" width="260" height="100">
        <rect width="260" height="100" fill="#1C1917"/>
        <rect x="6" y="6" width="56" height="42" rx="3" fill="#292524"/><rect x="8" y="8" width="52" height="30" fill="#111"/><text x="34" y="26" font-size="6" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Entrada</text><rect x="8" y="8" width="16" height="6" rx="1" fill="#DC2626"/><text x="16" y="12.5" font-size="4" fill="#fff" text-anchor="middle" font-family="sans-serif">AO VIVO</text>
        <rect x="6" y="52" width="56" height="42" rx="3" fill="#292524"/><text x="34" y="76" font-size="6" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Garagem</text>
        <rect x="68" y="6" width="56" height="42" rx="3" fill="#292524"/><rect x="70" y="8" width="52" height="30" fill="#0A0A0A"/><circle cx="96" cy="23" r="7" fill="#37415130"/><text x="96" y="26.5" font-size="6.5" fill="#9CA3AF" text-anchor="middle" font-family="sans-serif">🌙</text><text x="96" y="40" font-size="6" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Gourmet</text>
        <rect x="68" y="52" width="56" height="42" rx="3" fill="#292524"/><text x="96" y="76" font-size="6" fill="#6B7280" text-anchor="middle" font-family="sans-serif">Piscina</text>
        <rect x="134" y="6" width="120" height="88" rx="4" fill="#0D1117"/>
        <text x="194" y="18" font-size="6" fill="#94A3B8" text-anchor="middle" font-family="sans-serif">Linha do Tempo</text>
        <rect x="140" y="22" width="108" height="10" rx="2" fill="#1E293B"/><rect x="140" y="22" width="55" height="10" rx="2" fill="#DC262630"/><text x="144" y="30" font-size="5.5" fill="#94A3B8" font-family="sans-serif">Entrada 07:14</text>
        <rect x="140" y="36" width="108" height="10" rx="2" fill="#1E293B"/><rect x="140" y="36" width="82" height="10" rx="2" fill="#DC262630"/><text x="144" y="44" font-size="5.5" fill="#94A3B8" font-family="sans-serif">Garagem 07:32</text>
        <rect x="140" y="50" width="108" height="10" rx="2" fill="#1E293B"/><rect x="140" y="50" width="38" height="10" rx="2" fill="#DC262630"/><text x="144" y="58" font-size="5.5" fill="#94A3B8" font-family="sans-serif">Gourmet 18:45</text>
        <rect x="140" y="64" width="108" height="10" rx="2" fill="#1E293B"/><rect x="140" y="64" width="70" height="10" rx="2" fill="#DC262630"/><text x="144" y="72" font-size="5.5" fill="#94A3B8" font-family="sans-serif">Entrada 23:02</text>
        <rect x="140" y="78" width="108" height="10" rx="2" fill="#0D1117" stroke="#374151" stroke-width=".5"/>
        <text x="194" y="86" font-size="5.5" fill="#64748B" text-anchor="middle" font-family="sans-serif">Gravação contínua 24h · 30 dias</text>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9.5px;font-weight:700;color:#0F172A">Monitoramento via Dream Machine SE</div>
      <div style="font-size:8.5px;color:#64748B;margin-top:1px">Ao vivo · Gravação 24h · Linha do tempo · UniFi Protect</div>
    </div>
  </div>

  <div style="border:1px solid #CBD5E1;border-radius:10px;overflow:hidden">
    <div style="background:#0D1420;padding:8px 12px;display:flex;align-items:center;gap:8px">
      <div style="width:22px;height:22px;border-radius:4px;background:#059669;display:flex;align-items:center;justify-content:center;font-size:12px">⚡</div>
      <span style="color:#fff;font-size:11px;font-weight:700">Automação Zigbee — Ecossistema</span>
    </div>
    <div style="background:#F0FDF4;height:100px;display:flex;align-items:center;justify-content:center">
      <svg viewBox="0 0 260 100" xmlns="http://www.w3.org/2000/svg" width="260" height="100">
        <rect width="260" height="100" fill="#F0FDF4"/>
        <rect x="100" y="36" width="60" height="28" rx="5" fill="#059669"/>
        <text x="130" y="48" font-size="6.5" fill="#fff" text-anchor="middle" font-family="sans-serif" font-weight="bold">Gateway</text>
        <text x="130" y="57" font-size="5.5" fill="#A7F3D0" text-anchor="middle" font-family="sans-serif">Zigbee 3.0</text>
        <line x1="22" y1="22" x2="100" y2="50" stroke="#0EA5E9" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="6" y="14" width="36" height="16" rx="3" fill="#0EA5E920" stroke="#0EA5E9" stroke-width=".8"/><text x="24" y="24.5" font-size="5.5" fill="#0EA5E9" text-anchor="middle" font-family="sans-serif">Keypad</text>
        <line x1="218" y1="22" x2="160" y2="50" stroke="#0EA5E9" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="218" y="14" width="36" height="16" rx="3" fill="#0EA5E920" stroke="#0EA5E9" stroke-width=".8"/><text x="236" y="24.5" font-size="5.5" fill="#0EA5E9" text-anchor="middle" font-family="sans-serif">Keypad</text>
        <line x1="14" y1="72" x2="100" y2="60" stroke="#16A34A" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="6" y="68" width="36" height="16" rx="3" fill="#16A34A20" stroke="#16A34A" stroke-width=".8"/><text x="24" y="78.5" font-size="5.5" fill="#16A34A" text-anchor="middle" font-family="sans-serif">Sensor</text>
        <line x1="240" y1="72" x2="160" y2="60" stroke="#7C3AED" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="218" y="68" width="36" height="16" rx="3" fill="#7C3AED20" stroke="#7C3AED" stroke-width=".8"/><text x="236" y="78.5" font-size="5.5" fill="#7C3AED" text-anchor="middle" font-family="sans-serif">Módulo</text>
        <line x1="95" y1="88" x2="115" y2="64" stroke="#D97706" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="76" y="82" width="36" height="14" rx="3" fill="#D9780620" stroke="#D97706" stroke-width=".8"/><text x="94" y="91.5" font-size="5.5" fill="#D97706" text-anchor="middle" font-family="sans-serif">Hub IR</text>
        <line x1="168" y1="88" x2="148" y2="64" stroke="#0891B2" stroke-width="1" stroke-dasharray="3,2" opacity=".5"/><rect x="150" y="82" width="36" height="14" rx="3" fill="#0891B220" stroke="#0891B2" stroke-width=".8"/><text x="168" y="91.5" font-size="5.5" fill="#0891B2" text-anchor="middle" font-family="sans-serif">Tomada</text>
        <rect x="6" y="4" width="248" height="8" rx="2" fill="#DCFCE7"/>
        <text x="130" y="10.5" font-size="5.5" fill="#166534" text-anchor="middle" font-family="sans-serif">Todos os dispositivos online · Latência &lt;20ms · Matter-ready</text>
      </svg>
    </div>
    <div style="padding:8px 10px;background:#F8FAFC">
      <div style="font-size:9.5px;font-weight:700;color:#0F172A">Ecossistema Zigbee centralizado</div>
      <div style="font-size:8.5px;color:#64748B;margin-top:1px">Keypads · Sensores · Módulos · Hub IR · Tomadas · Matter-ready</div>
    </div>
  </div>

</div>
<p class="ex-p" style="font-size:9px;color:#64748B;font-style:italic">Todos os sistemas são gerenciados remotamente pelo smartphone. A RARO Home realiza configuração completa e treinamento na entrega.</p>
`

    // ── Cabos elétricos consolidado por marcador ──────────────────────────────
    const allEletMarkers = markers.filter(m=>{
      const n=(m.name||'').toLowerCase()
      return n.includes('keypad')||n.includes('interruptor')||n.includes('módulo')||n.includes('tomada')||n.includes('cortina')||n.includes('hub ir')
    })
    const cabosEletConsolidado = allEletMarkers.length
      ? T(allEletMarkers.map(m=>`<tr><td>${pin(m.n)}</td><td style="font-family:monospace;font-size:10px;font-weight:700">${esc(m.id||m.code||'—')}</td><td>${esc(m.name)}</td><td>${esc(m.room||'—')}</td><td style="font-size:10px">${(m.name||'').toLowerCase().includes('keypad')||(m.name||'').toLowerCase().includes('interruptor')?'Fase + Neutro + Terra':'Fase + Neutro'}</td><td style="font-family:monospace;font-size:10px">2,5mm²</td><td style="font-size:10px">${(m.name||'').toLowerCase().includes('keypad')||(m.name||'').toLowerCase().includes('interruptor')?'QDL — disj. dedicado':'Ponto mais próximo'}</td><td style="font-size:9.5px;color:#D97706">${esc(m.note||'')}</td></tr>`).join(''),
        ['#','ID','Equipamento','Ambiente','Alimentação','Bitola','Origem','Obs'])
      : ''

    // ══════════════════════════════════════════════════════════════════
    // VERSÃO OBRA / PEDREIRO — só infraestrutura para quem executa:
    // planta com caminho dos cabos · tabela origem→destino/metros/tipo ·
    // altura e orientação de cada ponto · eletrodutos e caixas 4×4 por parede.
    // ══════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════
    // VERSÃO ELÉTRICA — documento separado: planta elétrica (NBR 5444),
    // cobertura Wi-Fi (mapa de calor, opcional) e quadro de cargas.
    // ══════════════════════════════════════════════════════════════════
    if (mode==='eletrica') {
      let _ne=0
      const eleSecs = [
        `<div class="ex-sec"><h2 style="border:none;margin-bottom:4px">Planta Elétrica e Cobertura Wi-Fi</h2>
          <p class="ex-p" style="color:#6B7280">Documento técnico de pontos elétricos (símbolos ABNT NBR 5444) e estimativa de cobertura Wi-Fi. As paredes são consideradas de concreto para o cálculo de propagação.</p></div>`,
        buildPlantaEletrica(()=>++_ne),
        showHeatmap ? buildHeatmap(()=>++_ne) : '',
      ].filter(Boolean)
      const eleBody = eleSecs.join('\n')
      const semNada = !bgImage || (!markers.some(m=>classifyEle(m)) && !markers.some(m=>/access point|\bap\b|wi-?fi/.test(((m.name||'')+' '+(m.code||'')).toLowerCase())))
      return eleBody + (semNada?`<div class="ex-sec"><p class="ex-p" style="color:#B45309">Adicione pontos elétricos (tomadas, interruptores, luz, QDL) e/ou Access Points na planta para gerar este documento.</p></div>`:'') + '</div>'
    }

    if (isObra) {
      // 1) Planta com o CAMINHO DOS CABOS desenhado por cima
      let plantaCabos = ''
      if (bgImage) {
        const dots = markers.map(m=>{
          const isR = isRackItem(m.name||'', m.code||'')
          const st = EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
          const col = isR ? '#4C1D95' : st.c
          return `<div style="position:absolute;left:${m.x}%;top:${m.y}%;transform:translate(-50%,-50%);z-index:3">
            <div style="width:18px;height:18px;border-radius:50%;background:${col};color:#fff;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.4)">${isR?'R':m.n}</div>
            <div style="position:absolute;left:50%;top:20px;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;border-radius:3px;padding:1px 4px;font-size:7.5px;white-space:nowrap;font-family:monospace;font-weight:600">${esc(m.id||m.code||m.name||'')}</div>
          </div>`
        }).join('')
        const cableSvg = (cables||[]).map(c=>{
          const pts = cablePolyPoints(c)
          if (pts.length<2) return ''
          const poly = pts.map(p=>`${p.x},${p.y}`).join(' ')
          const col = c.color || '#2563EB'
          return `<polyline points="${poly}" fill="none" stroke="${col}" stroke-linecap="round" stroke-linejoin="round" style="stroke-width:2.2px" vector-effect="non-scaling-stroke"/>`
        }).join('')
        const legenda = Object.entries(CABLE_PALETTE).map(([k,v])=>`<span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#374151;margin-right:14px"><span style="width:16px;height:3px;border-radius:2px;background:${v};display:inline-block"></span>${CABLE_LABELS[k]||k}</span>`).join('')
        plantaCabos = `<div class="ex-sec ex-breakable"><h2><span class="ex-sec-num">${++_n}</span>Planta — Caminho dos Cabos</h2>
          <p class="ex-p" style="margin-bottom:8px">Cada linha colorida é um cabo: parte da origem (rack/quadro) até o destino. Siga o caminho desenhado e use a tabela abaixo para metragem e tipo.</p>
          <div style="position:relative;display:inline-block;max-width:100%;width:100%">
            <img src="${bgImage}" style="width:100%;display:block;border:1px solid #ddd;border-radius:6px"/>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">${cableSvg}</svg>
            ${dots}
          </div>
          <div style="margin-top:10px;display:flex;flex-wrap:wrap;align-items:center">${legenda}</div>
          ${(cables||[]).length===0?'<p class="ex-p" style="color:#B45309;margin-top:8px">⚠ Nenhum cabo foi desenhado na planta. Volte ao editor e use o modo "Cabos" para traçar os caminhos.</p>':''}
        </div>`
      }
      const tblRedeObra = (d.rack_cable_table||[]).length
        ? T(d.rack_cable_table.map(r=>`<tr>
            ${pinCell(r.destino,r.etiqueta)}
            <td style="font-family:monospace;font-size:10px"><b>${esc(r.etiqueta||r.porta_patch||'—')}</b></td>
            <td>${esc(r.device_origem||'Rack')} ${r.porta_origem?`<span style="color:#6B7280">(${esc(r.porta_origem)})</span>`:''}</td>
            <td>${esc(r.destino||'—')}</td>
            <td style="font-size:10px">${esc(r.tipo||'CAT6')}</td>
            <td style="text-align:right">${esc(r.metros||'—')}m</td>
          </tr>`).join(''), ['Nº','Etiqueta','Origem','Destino','Tipo','Metros'])
        : ''
      const tblSomObra = (d.cabos_som||[]).length
        ? T(d.cabos_som.map(r=>`<tr>${pinCell(r.destino,r.etiqueta,r.id)}<td style="font-family:monospace;font-size:10px"><b>${esc(r.etiqueta||r.id||'—')}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td style="font-size:10px">${esc(r.tipo||'2×1,5mm²')}</td><td style="text-align:right">${esc(r.metros||'—')}m</td></tr>`).join(''), ['Nº','Etiqueta','Origem','Destino','Tipo','Metros'])
        : ''
      const tblEletObra = (d.cabos_eletricos_por_comodo||[]).length
        ? d.cabos_eletricos_por_comodo.map(c=>`<h3 class="ex-amb">${esc(c.comodo)}</h3>${T((c.itens||[]).map(it=>`<tr>${pinCell(it.id,it.equip)}<td style="font-family:monospace;font-size:10px"><b>${esc(it.id)}</b></td><td>${esc(it.equip)}</td><td>${esc(it.origem)}</td><td>${esc(it.destino)}</td><td style="font-size:10px">${esc(it.fios||it.tipo||'')}</td><td style="text-align:right">${esc(it.metros||'—')}m</td><td style="font-size:9.5px;color:#B45309">${esc(it.obs||'')}</td></tr>`).join(''),['Nº','ID','Equip.','Origem (quadro)','Destino','Fios','Metros','Obs'])}`).join('')
        : (cabosEletConsolidado || '')
      const tblPontosObra = (d.pontos||[]).length
        ? (d.pontos||[]).map(a=>`<h3 class="ex-amb">${esc(a.ambiente)}</h3>${T((a.linhas||[]).map(l=>`<tr>${pinCell(l.ponto,l.equip)}<td><b>${esc(l.ponto)}</b></td><td>${esc(l.equip)}</td><td>${esc(l.parede)}</td><td>${esc(l.dist)}</td><td style="font-weight:700;color:#0F172A">${esc(l.alt)}</td><td>${esc(l.caixa)}</td><td style="font-size:10px">${esc(l.virado||l.orientacao||'frente p/ ambiente')}</td></tr>`).join(''),['Nº','Ponto','Equip.','Parede ref.','Distância','Altura','Caixa','Virado p/'])}`).join('')
        : ''
      const caixasPorComodo = (d.pontos||[]).map(a=>{
        const linhas=(a.linhas||[]).filter(l=>(l.caixa||'').trim())
        if(!linhas.length) return ''
        return `<h3 class="ex-amb">${esc(a.ambiente)}</h3>${T(linhas.map(l=>`<tr>${pinCell(l.ponto,l.equip)}<td><b>${esc(l.ponto)}</b></td><td>${esc(l.parede)}</td><td>${esc(l.caixa)}</td><td style="font-weight:700">${esc(l.alt)}</td><td style="font-size:10px">${esc(l.cabo||'')}</td></tr>`).join(''),['Nº','Ponto','Parede','Caixa','Altura','Eletroduto/Cabo'])}`
      }).filter(Boolean).join('')
      const eletrodutoNotas = (d.checklist_obra||[]).filter(x=>/eletroduto|caixa 4|4×4|4x4|sangria|passagem|fio-guia/i.test(x))
      const obraSections = [
        `<div class="ex-sec"><h2 style="border:none;margin-bottom:4px">Projeto de Obra — Guia do Eletricista / Pedreiro</h2>
          <p class="ex-p" style="color:#6B7280">Documento simplificado: só infraestrutura. Caminho dos cabos, metragem, alturas, orientação dos pontos e caixas 4×4 por parede. Sem listas comerciais.</p></div>`,
        plantaCabos,
        secN(`Cabos de Rede — Origem → Destino`, tblRedeObra, true),
        secN(`Cabos de Som — Origem → Destino`, tblSomObra, true),
        secN(`Cabos Elétricos — por Cômodo`, tblEletObra, true),
        secN(`Pontos — Altura, Parede e Orientação`, tblPontosObra, true),
        secN(`Caixas 4×4 e Eletrodutos — por Cômodo`, caixasPorComodo, true),
        secN(`Notas de Infraestrutura (Eletrodutos · Sangrias · Caixas)`, list(eletrodutoNotas.length?eletrodutoNotas:d.checklist_obra), true),
      ].filter(Boolean)
      return obraSections.join('\n') + '</div>'
    }

    return [
    secN(`Premissas Confirmadas`, list(d.premissas)),
    secN(`Detalhe do RACK / CPD`, hasRack && (d.rack_detalhe||rackItems.length)?(list(d.rack_detalhe)+rackVisual+(rackCableTableHtml?`<h3 class="ex-amb" style="margin-top:20px">Tabela de Portas — Todos os Cabos de Rede (APs · Câmeras · Keystones · Uplinks)</h3>${rackCableTableHtml}`:'')):'', true),
    secN(`Cabos de Rede — Patch Panel e Etiquetas`, cabosRedeHtml, true),
    secN(`Segurança — Câmeras e Sensores de Alarme`, tblSeguranca, true),
    secN(`Som Ambiente — Caixas, Amplificador e Zonas`, tblSom, true),
    secN(`Devices no Teto — Posição, Origem e Cabeamento`, tblTeto, true),
    secN(`Cabos de Som — Amplificador no RACK`, (d.cabos_som||[]).length?T(d.cabos_som.map(r=>`<tr>${pinCell(r.destino,r.etiqueta,r.id)}<td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.metros)}m</td><td style="font-family:monospace;font-size:10px">${esc(r.etiqueta||'-')}</td></tr>`).join(''),['Nº','ID','Origem','Destino','Tipo','Metros','Etiqueta']):'', true),
    secN(`Automação — Interruptores, Tomadas, Sensores, Hub IR, Módulos`, tblAutomacao||pontosHtml, true),
    secN(`Alimentação dos Keypads (Fase + Neutro)`, (d.alim_keypads||[]).length?T(d.alim_keypads.map(r=>`<tr>${pinCell(r.destino,r.id)}<td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.cota)}</td><td>${esc(r.comodo)}</td><td>${esc(r.metros)}m</td><td style="font-size:10px;color:#6B7280">${esc(r.fios||'2x2,5mm²')}</td></tr>`).join(''),['Nº','ID','Origem','Destino (Keypad)','Cota/Altura','Cômodo','m','Fios']):'', true),
    secN(`Cabos Elétricos — por Cômodo`, cabosEletHtml, true),
    secN(`Cabos Elétricos — Todos os Pontos (consolidado)`, cabosEletConsolidado, true),
    secN(`Itens por Cômodo e Total Geral`, itensComodoHtml ? (itensComodoHtml + '<h3 class="ex-amb">Total geral consolidado</h3>' + totalGeralHtml) : '', true),
    secN(`Lista Completa de Peças`, (d.pecas||[]).length?T(d.pecas.map(r=>`<tr><td>${esc(r.item)}</td><td style="text-align:center"><b>${esc(r.qtd)}</b></td></tr>`).join(''),['Item','Qtd']):'', true),
    secN(`Fotos no Diário de Obra`, fotosTxt),
    secN(`Checklist de Obra — para o Arquiteto / Eletricista`, list(d.checklist_obra)),
    secN(`Checklist de Instalação — Equipe RARO Home`, list(d.checklist_raro)),
    secN(`Gestão e Controle do Projeto`, gestaoTxt),
    secN(`Gráficos e Linha do Tempo do Projeto`, (grafico1 + grafico2 + grafico3 + grafico4)),
  ].join('\n') })()}
</div>`
  }

  async function exportPdf(){
    const w=window.open('','_blank')
    const cliNome=(projectInfo.client||fromProposal?.client_name||'Cliente').replace(/[\\/:*?"<>|]/g,'')
    const codigo=(fromProposal?.code||'').replace(/[\\/:*?"<>|]/g,'')
    const sufixo = execMode==='obra' ? ' — OBRA' : execMode==='eletrica' ? ' — ELETRICA' : ''
    const tituloPdf=`Projeto Executivo RARO Home — ${cliNome}${codigo?' — '+codigo:''}${sufixo}`
    const docHtml = (execMode==='obra'?execDocObra:execMode==='eletrica'?execDocEletrica:execDoc)||''
    w.document.write(`<html><head><title>${tituloPdf}</title><meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
      <style>body{margin:0}${EXEC_CSS}</style></head><body>
      ${docHtml}
      </body></html>`)
    w.document.close(); setTimeout(()=>w.print(),700)
  }

  async function exportPdfAndSave(){
    await saveToProposal()
    setTimeout(()=>exportPdf(), 200)
  }

  async function saveToProposal(docOverride){
    const docToSave = typeof docOverride==='string' ? docOverride : execDoc
    const obraToSave = execDocObra
    const eletrToSave = execDocEletrica
    const roomMap={}
    markers.forEach(m=>{ const r=m.room||'Geral'; if(!roomMap[r])roomMap[r]=[]; roomMap[r].push(m) })
    const floors=[{name:'Pavimento único', rooms:Object.entries(roomMap).map(([name,items])=>({
      name, items:items.map(m=>({name:m.name,code:m.code,qty:'1',cost_price:m.cost,sale_price:m.sale,category:m.category})),
      price:String(items.reduce((s,m)=>s+(m.sale||0),0))
    }))}]

    const apiCost = { ...apiCostRef.current, model:'claude-sonnet-4-5', at:new Date().toISOString() }
    if(fromProposal?.id){
      try{
        const { saveProposal } = await import('../db/supabase.js')
        const updated = { ...fromProposal, exec_doc:docToSave, exec_doc_obra:obraToSave, exec_doc_eletrica:eletrToSave, planta_data:{image:bgImage,markers,cables}, exec_api_cost:apiCost }
        await saveProposal(updated)
        alert(`✅ Projeto Executivo salvo no orçamento!\n\n💸 Custo de IA na geração: R$ ${apiCost.brl.toFixed(2)} (${apiCost.calls} chamadas)`)
        onClose && onClose()
        return
      }catch(e){ alert('Erro ao salvar: '+e.message); return }
    }
    if(onSaveToProposal) onSaveToProposal({ floors, planta_data:{image:bgImage,markers,cables}, client_name:projectInfo.client||selClient, exec_doc:docToSave, exec_doc_obra:obraToSave, exec_doc_eletrica:eletrToSave, exec_api_cost:apiCost })
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
          {['upload','rooms','chat','editor','exec'].map((s,i)=>{
            // pode ir para qualquer etapa; as que dependem de planta exigem bgImage
            const needsPlanta=['rooms','chat','editor','exec'].includes(s)
            const allowed = s==='upload' || (needsPlanta && bgImage)
            return <span key={s} onClick={()=>{ if(allowed) setStep(s) }}
              style={{padding:'3px 10px',borderRadius:12,background:step===s?'#0EA5E9':'rgba(255,255,255,0.08)',color:step===s?'#fff':allowed?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.3)',cursor:allowed?'pointer':'not-allowed',userSelect:'none'}}
              title={allowed?`Ir para ${s}`:'Carregue a planta primeiro'}>
              {i+1}. {s==='upload'?'Planta':s==='rooms'?'Cômodos':s==='chat'?'Perguntas':s==='editor'?'Editor':'Projeto'}
            </span>
          })}
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
                {[...rooms].sort((a,b)=>{
                  const fA=(a.floor||'').localeCompare(b.floor||'','pt-BR')
                  return fA!==0 ? fA : (a.name||'').localeCompare(b.name||'','pt-BR')
                }).map((r,idx)=>(
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
                <button onClick={()=>setStep('editor')} disabled={loading}
                  style={{...btnGhost,width:'100%',justifyContent:'center',marginTop:6,gap:6,borderColor:'rgba(148,163,184,0.5)',color:'#CBD5E1'}}>
                  <i className="ti ti-hand-finger" aria-hidden/>Pular IA — editar na mão
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
            {/* ── Sidebar esquerda: catálogo principal + filtros colapsáveis ── */}
            <div className="pe-editor-cat" style={{width:260,background:'#0f172a',borderRight:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',overflow:'hidden'}}>

              {/* ── CATÁLOGO (sempre visível, rolável) ── */}
              <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                {/* Busca + filtros de categoria — sticky */}
                <div style={{padding:'8px 10px',background:'#0a1020',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
                  <input value={catSearch} onChange={e=>setCatSearch(e.target.value)} placeholder="Buscar no catálogo..."
                    style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'7px 10px',color:'#fff',fontSize:12,fontFamily:'inherit',boxSizing:'border-box',marginBottom:6}}/>
                  <div style={{display:'flex',gap:4,marginBottom: catFilter ? 5 : 0}}>
                    <select value={catFilter} onChange={e=>{setCatFilter(e.target.value);setSubcatFilter('')}}
                      style={{flex:1,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:5,padding:'5px 8px',color:'#fff',fontSize:11,fontFamily:'inherit'}}>
                      <option value="">Todas as categorias</option>
                      {Object.keys(catGroups).map(g=><option key={g} value={g}>{g}</option>)}
                    </select>
                    {catFilter&&<button onClick={()=>{setCatFilter('');setSubcatFilter('')}} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:5,color:'rgba(255,255,255,0.5)',cursor:'pointer',padding:'0 8px',fontSize:12,flexShrink:0}}>×</button>}
                  </div>
                  {catFilter && TAXONOMY[catFilter]?.length>0 && (
                    <select value={subcatFilter} onChange={e=>setSubcatFilter(e.target.value)}
                      style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:5,padding:'5px 8px',color:'rgba(255,255,255,0.6)',fontSize:11,fontFamily:'inherit',boxSizing:'border-box'}}>
                      <option value="">Todas as subcategorias</option>
                      {TAXONOMY[catFilter].map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>
                {addMode&&addItem&&<div style={{padding:'6px 12px',background:'rgba(14,165,233,0.15)',fontSize:11,color:'#38BDF8',flexShrink:0}}>
                  📍 Clique na planta: <b>{addItem.name}</b><br/>
                  <span onClick={()=>{setAddMode(false);setAddItem(null)}} style={{cursor:'pointer',textDecoration:'underline',fontSize:10}}>cancelar</span>
                </div>}
                {/* Lista do catálogo — rolável */}
                <div style={{flex:1,overflowY:'auto'}}>
                  {Object.entries(catGroups).filter(([g])=>!catFilter||g===catFilter).map(([g,items])=>{
                    const subGroups={}
                    items.forEach(it=>{const sub=it.subcategory||inferCategory(it.name,g).sub||g;(subGroups[sub]=subGroups[sub]||[]).push(it)})
                    const allFil=items.filter(it=>{
                      const mS=!catSearch||(it.name||'').toLowerCase().includes(catSearch.toLowerCase())||(it.code||'').toLowerCase().includes(catSearch.toLowerCase())
                      const mSub=!subcatFilter||(it.subcategory||inferCategory(it.name,g).sub||g)===subcatFilter
                      return mS&&mSub
                    })
                    if(!allFil.length) return null
                    return <div key={g}>
                      <div style={{padding:'6px 10px 3px',fontSize:9,color:'rgba(255,255,255,0.55)',textTransform:'uppercase',letterSpacing:.5,fontWeight:700,background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{g}</div>
                      {Object.entries(subGroups).map(([sub,sitems])=>{
                        const sfil=sitems.filter(it=>{
                          const mS=!catSearch||(it.name||'').toLowerCase().includes(catSearch.toLowerCase())||(it.code||'').toLowerCase().includes(catSearch.toLowerCase())
                          return mS&&(!subcatFilter||sub===subcatFilter)
                        })
                        if(!sfil.length) return null
                        return <div key={sub}>
                          <div style={{padding:'3px 12px 2px',fontSize:8,color:'rgba(255,255,255,0.28)',letterSpacing:.3}}>↳ {sub}</div>
                          {sfil.map((it,i)=>{const st=EQUIP_STYLE[equipType(it.name)]||EQUIP_STYLE.Outro
                            return <div key={i} onClick={()=>{setAddItem(it);setAddMode(true)}}
                              style={{padding:'7px 12px 7px 18px',cursor:'pointer',display:'flex',gap:8,alignItems:'center',minHeight:32}}
                              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.06)'}
                              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                              <span style={{width:16,height:16,borderRadius:'50%',background:st.c,color:'#fff',fontSize:7,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{st.s}</span>
                              <span style={{fontSize:11,color:'rgba(255,255,255,0.85)',lineHeight:1.3,flex:1}}>{it.name}</span>
                            </div>})}
                        </div>})}
                    </div>})}
                </div>
              </div>

              {/* ── FILTROS COLAPSÁVEIS (fundo da sidebar) ── */}
              <FilterSection title="📋 Resumo de itens" badge={filterItem?'•':null} onClear={filterItem?()=>setFilterItem(''):null} defaultOpen={false}>
                {(()=>{
                  const g={}
                  markers.forEach(m=>{ const nm=m.name; if(!nm)return; const q=parseInt(m.qty)||1
                    if(!g[nm]) g[nm]={name:nm,qty:0,rooms:{},type:equipType(nm)}
                    g[nm].qty+=q; const r=m.room||'Sem cômodo'; g[nm].rooms[r]=(g[nm].rooms[r]||0)+q })
                  const list=Object.values(g).sort((a,b)=>b.qty-a.qty)
                  if(!list.length) return <div style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>Sem itens.</div>
                  return <div>
                    {filterItem&&<button onClick={()=>setFilterItem('')} style={{width:'100%',marginBottom:6,fontSize:10,padding:'5px',borderRadius:5,border:'1px solid #38BDF8',background:'rgba(56,189,248,0.15)',color:'#38BDF8',cursor:'pointer',fontFamily:'inherit'}}>✕ Mostrar todos</button>}
                    {list.map(it=>{
                      const st=EQUIP_STYLE[it.type]||EQUIP_STYLE.Outro; const sel=filterItem===it.name
                      const roomsTxt=Object.entries(it.rooms).map(([r,q])=>q>1?`${r} (${q})`:r).join(', ')
                      return <button key={it.name} onClick={()=>setFilterItem(sel?'':it.name)} title="Clique para ver só este item no mapa"
                        style={{display:'block',width:'100%',textAlign:'left',background:sel?'rgba(56,189,248,0.12)':'transparent',border:`1px solid ${sel?'#38BDF8':'transparent'}`,borderRadius:5,padding:'5px 6px',cursor:'pointer',marginBottom:2,fontFamily:'inherit'}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,color:'#fff',fontSize:11}}>
                          <span style={{width:7,height:7,borderRadius:'50%',background:st.c,flexShrink:0}}/>
                          <b style={{color:'#38BDF8',minWidth:18}}>{it.qty}</b>
                          <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</span>
                        </div>
                        <div style={{fontSize:8.5,color:'rgba(255,255,255,0.4)',marginLeft:13,marginTop:1}}>{roomsTxt}</div>
                      </button>
                    })}
                  </div>
                })()}
              </FilterSection>

              <FilterSection title="🔍 Buscar na planta" defaultOpen={false}>
                <input value={editorSearch} onChange={e=>setEditorSearch(e.target.value)}
                  placeholder="Nome, código ou cômodo..."
                  style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(56,189,248,0.3)',borderRadius:5,padding:'5px 8px',color:'#fff',fontSize:11,fontFamily:'inherit',boxSizing:'border-box'}}/>
                {editorSearch&&<div style={{fontSize:9,color:'rgba(255,255,255,0.35)',marginTop:3}}>
                  {markers.filter(m=>m.name?.toLowerCase().includes(editorSearch.toLowerCase())||m.code?.toLowerCase().includes(editorSearch.toLowerCase())||m.room?.toLowerCase().includes(editorSearch.toLowerCase())).length} resultado(s)
                </div>}
              </FilterSection>

              <FilterSection title="🏠 Filtrar cômodos" badge={filterRooms.size||null} onClear={filterRooms.size?()=>setFilterRooms(new Set()):null} defaultOpen={false}>
                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                  {[...new Set(markers.map(m=>m.room||'Sem cômodo'))].sort().map(r=>{
                    const sel=filterRooms.has(r)
                    return <button key={r} onClick={()=>setFilterRooms(prev=>{const s=new Set(prev);if(s.has(r))s.delete(r);else s.add(r);return s})}
                      style={{fontSize:9,padding:'2px 6px',borderRadius:6,border:'1px solid',cursor:'pointer',fontFamily:'inherit',
                        borderColor:sel?'#38BDF8':'rgba(255,255,255,0.15)',background:sel?'rgba(56,189,248,0.18)':'rgba(255,255,255,0.03)',
                        color:sel?'#38BDF8':'rgba(255,255,255,0.5)'}}>
                      {r}
                    </button>})}
                </div>
              </FilterSection>

              <FilterSection title="🏷 Filtrar categorias" badge={filterCateg.size||null} onClear={filterCateg.size?()=>setFilterCateg(new Set()):null} defaultOpen={false}>
                <div style={{display:'flex',flexWrap:'wrap',gap:3}}>
                  {[...new Set(markers.map(m=>inferCategory(m.name||'').cat||'Outros'))].sort().map(t=>{
                    const cc={'Segurança':'#DC2626','Sonorização':'#BE185D','Redes':'#0EA5E9','Automação':'#059669','Gourmet':'#D97706','Elétrica':'#F59E0B','CPD':'#7C3AED','Outros':'#6B7280'}[t]||'#6B7280'
                    const sel=filterCateg.has(t)
                    return <button key={t} onClick={()=>setFilterCateg(prev=>{const s=new Set(prev);if(s.has(t))s.delete(t);else s.add(t);return s})}
                      style={{fontSize:9,padding:'2px 8px',borderRadius:6,border:'1px solid',cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:4,
                        borderColor:sel?cc:'rgba(255,255,255,0.15)',background:sel?cc+'28':'rgba(255,255,255,0.03)',
                        color:sel?cc:'rgba(255,255,255,0.5)'}}>
                      <span style={{width:7,height:7,borderRadius:'50%',background:cc}}/>{t}
                    </button>})}
                </div>
              </FilterSection>

            </div>
            {/* ── Canvas ── */}
            <div ref={canvasRef} className="pe-editor-canvas" onMouseDown={onCanvasPanDown} onTouchStart={onCanvasPanDown} onWheel={onCanvasWheel}
              style={{flex:1,overflow:'auto',background:'#1a1a2e',display:'block',padding:20,position:'relative',cursor:canvasPan?'grabbing':(addMode||cableMode?'default':'grab'),touchAction:'none'}}>
              <div style={{position:'sticky',top:0,right:0,zIndex:30,display:'flex',gap:6,alignSelf:'flex-start',marginLeft:'auto',background:'rgba(0,0,0,0.5)',borderRadius:8,padding:4,height:'fit-content',flexWrap:'wrap',justifyContent:'flex-end',maxWidth:'70%'}}>
                <button onClick={()=>setCableMode(m=>!m)} style={{height:32,borderRadius:6,border:`1px solid ${cableMode?'#F59E0B':'#F59E0B88'}`,background:cableMode?'#F59E0B':'rgba(245,158,11,0.15)',color:cableMode?'#1a1a2e':'#FBBf24',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Traçar cabos da planta elétrica">
                  <i className="ti ti-route" aria-hidden/>{cableMode?'Cabos: ON':'Cabos'}
                </button>
                {cables.length>0 && <button onClick={()=>setHideCables(h=>!h)} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:hideCables?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title={hideCables?'Mostrar cabos':'Ocultar cabos (só itens)'}>
                  <i className={hideCables?'ti ti-eye-off':'ti ti-eye'} aria-hidden/>{hideCables?'Cabos ocultos':'Ocultar cabos'}
                </button>}
                <button onClick={undo} disabled={!history.length} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:history.length?'#fff':'rgba(255,255,255,0.3)',cursor:history.length?'pointer':'default',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Desfazer (Ctrl+Z)">
                  <i className="ti ti-arrow-back-up" aria-hidden/>Desfazer
                </button>
                <button onClick={limparItens} style={{height:32,borderRadius:6,border:'1px solid #DC262688',background:'rgba(220,38,38,0.12)',color:'#FCA5A5',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Remover todos os itens">
                  <i className="ti ti-eraser" aria-hidden/>Limpar
                </button>
                <button onClick={voltarEtapa} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Voltar uma etapa">
                  <i className="ti ti-chevron-left" aria-hidden/>Voltar
                </button>
                <button onClick={avancarEtapa} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Avançar uma etapa">
                  Avançar<i className="ti ti-chevron-right" aria-hidden/>
                </button>
                <button onClick={recomecar} style={{height:32,borderRadius:6,border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:12,padding:'0 10px',display:'flex',alignItems:'center',gap:5,fontFamily:'inherit'}} title="Recomeçar do zero">
                  <i className="ti ti-refresh" aria-hidden/>Recomeçar
                </button>
                {fromProposal && <button onClick={importarDaProposta} style={{height:32,borderRadius:6,border:'1px solid #059669',background:'rgba(5,150,105,0.18)',color:'#6EE7B7',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Adicionar os itens da proposta aos cômodos">
                  <i className="ti ti-download" aria-hidden/>Importar da proposta
                </button>}
                <button onClick={apagarProjeto} style={{height:32,borderRadius:6,border:'1px solid #DC2626',background:'rgba(220,38,38,0.18)',color:'#FCA5A5',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}} title="Apagar planta, itens e cabos">
                  <i className="ti ti-trash" aria-hidden/>Apagar projeto
                </button>
                <button onClick={()=>setShowRackModal(true)} style={{height:32,borderRadius:6,border:'1px solid #7C3AED',background:'rgba(124,58,237,0.2)',color:'#C4B5FD',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}}>
                  <i className="ti ti-server" aria-hidden/>Rack CPD
                </button>
                <button onClick={e=>{e.stopPropagation();bgOnlyRef.current?.click()}} style={{height:32,borderRadius:6,border:'none',background:'#0EA5E9',color:'#fff',cursor:'pointer',fontSize:12,padding:'0 12px',display:'flex',alignItems:'center',gap:6,fontFamily:'inherit',fontWeight:600}}><i className="ti ti-upload" aria-hidden/>{bgImage?'Trocar planta':'Carregar planta'}</button>
                <input ref={bgOnlyRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleBgOnly}/>
                <button onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>−</button>
                <span style={{color:'#fff',fontSize:11,display:'flex',alignItems:'center',padding:'0 4px'}}>{Math.round(zoom*100)}%</span>
                <button onClick={()=>setZoom(z=>Math.min(3,z+0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>+</button>
              </div>
              {cableMode && <div style={{position:'sticky',top:44,marginLeft:'auto',alignSelf:'flex-start',zIndex:29,background:'rgba(20,20,40,0.95)',border:'1px solid #F59E0B',borderRadius:8,padding:'8px 12px',maxWidth:340,fontSize:11,color:'#fff'}}>
                <div style={{color:'#FBBf24',fontWeight:600,marginBottom:4}}><i className="ti ti-route" aria-hidden/> Modo cabos</div>
                {!cableDraft
                  ? <div style={{color:'rgba(255,255,255,0.7)'}}>Clique no item de <b>origem</b>, depois no item de <b>destino</b>. Eu traço o cabo. Depois arraste os pontos para curvar/fazer 90°.</div>
                  : <div style={{color:'#FBBf24'}}>Origem: <b>{mk(cableDraft.fromUid)?.name}</b> — agora clique no destino. <span onClick={()=>setCableDraft(null)} style={{textDecoration:'underline',cursor:'pointer'}}>cancelar</span></div>}
                {selCable && (()=>{ const c=cables.find(x=>x.id===selCable); if(!c) return null
                  return <div style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.15)'}}>
                    <div style={{marginBottom:5}}>Cabo: <b>{mk(c.fromUid)?.name}</b> → <b>{mk(c.toUid)?.name}</b></div>
                    <div style={{display:'flex',gap:5,alignItems:'center',flexWrap:'wrap'}}>
                      {[['dados','Dados','#2563EB'],['ap','AP / Access Point','#F59E0B'],['camera','Câmera','#92400E'],['uplink','Uplink','#DC2626'],['hdmi','HDMI','#7C3AED']].map(([t,lb,col])=>(
                        <button key={t} onClick={()=>setCableColor(c.id,t)} style={{fontSize:10,padding:'3px 8px',borderRadius:10,border:`1px solid ${c.type===t?col:'rgba(255,255,255,0.2)'}`,background:c.type===t?col+'33':'transparent',color:c.type===t?'#fff':'rgba(255,255,255,0.6)',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:4}}><span style={{width:8,height:8,borderRadius:'50%',background:col}}/>{lb}</button>
                      ))}
                      <button onClick={()=>deleteCable(c.id)} style={{fontSize:10,padding:'3px 8px',borderRadius:10,border:'1px solid #DC2626',background:'transparent',color:'#FCA5A5',cursor:'pointer',marginLeft:'auto'}}><i className="ti ti-trash" aria-hidden/> Remover</button>
                    </div>
                    <div style={{fontSize:9.5,color:'rgba(255,255,255,0.45)',marginTop:5}}>Arraste os pontos brancos para curvar. Clique no quadradinho do meio de um trecho para criar uma dobra (90°). Duplo-clique num ponto remove.</div>
                  </div>
                })()}
              </div>}
              <div ref={containerRef} style={{position:'relative',display:'block',margin:'0 auto',cursor:addMode?'crosshair':'default',width:bgImage?`${zoom*100}%`:`${Math.min(640*zoom,window.innerWidth*0.82)}px`,transformOrigin:'top center'}} onClick={onCanvasClick}>
                {bgImage ? <img src={bgImage} style={{display:'block',width:'100%',pointerEvents:'none'}} draggable={false}/>
                  : <div style={{width:'100%',aspectRatio:'4/3',background:'repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,rgba(255,255,255,0.03) 1px,transparent 1px,transparent 40px)',backgroundColor:'rgba(255,255,255,0.02)',border:'2px dashed rgba(255,255,255,0.15)',borderRadius:10,position:'relative'}}>
                      <div style={{position:'absolute',top:10,left:0,right:0,textAlign:'center',fontSize:11,color:'rgba(255,255,255,0.45)',pointerEvents:'none'}}>Pontos posicionados — arraste para ajustar, ou carregue a planta.</div>
                    </div>}
                {/* ── Camada de CABOS (planta elétrica) ── */}
                {!hideCables && <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:4,overflow:'visible'}} preserveAspectRatio="none" viewBox="0 0 100 100">
                  {cables.map(c=>{
                    const pts=cablePolyPoints(c); if(pts.length<2) return null
                    const d=pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ')
                    const sel=selCable===c.id
                    return <path key={c.id} d={d} fill="none" stroke={c.color}
                      strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
                      style={{pointerEvents:cableMode?'stroke':'none',cursor:'pointer',filter:sel?'drop-shadow(0 0 2px '+c.color+')':'none',strokeWidth:sel?3:2}}
                      onClick={e=>{e.stopPropagation(); setSelCable(c.id)}}/>
                  })}
                </svg>}
                {/* pontos arrastáveis do cabo selecionado + dobra ao clicar no segmento */}
                {!hideCables && cableMode && cables.filter(c=>c.id===selCable).map(c=>{
                  const pts=cablePolyPoints(c)
                  return <div key={'pts'+c.id}>
                    {(c.points||[]).map((p,idx)=>(
                      <div key={idx} className="cable-handle"
                        onMouseDown={e=>{e.stopPropagation(); setDragPoint({cableId:c.id,idx})}}
                        onTouchStart={e=>{e.stopPropagation(); setDragPoint({cableId:c.id,idx})}}
                        onDoubleClick={e=>{e.stopPropagation(); removeCablePoint(c.id,idx)}}
                        title="Arraste para dobrar · duplo-clique remove"
                        style={{position:'absolute',left:`${p.x}%`,top:`${p.y}%`,transform:'translate(-50%,-50%)',zIndex:15,touchAction:'none',
                          width:18,height:18,borderRadius:'50%',background:'#fff',border:`3px solid ${c.color}`,cursor:'move',boxShadow:'0 1px 4px rgba(0,0,0,0.6)'}}/>
                    ))}
                    {pts.slice(0,-1).map((p,i)=>{ const n=pts[i+1]; const mx=(p.x+n.x)/2, my=(p.y+n.y)/2
                      return <div key={'mid'+i} className="cable-handle"
                        onClick={e=>{e.stopPropagation(); addCablePoint(c.id,i,mx,my)}}
                        title="Toque para criar uma dobra aqui"
                        style={{position:'absolute',left:`${mx}%`,top:`${my}%`,transform:'translate(-50%,-50%)',zIndex:14,
                          width:15,height:15,borderRadius:3,background:c.color+'cc',border:'2px solid #fff',cursor:'copy'}}/>
                    })}
                  </div>
                })}
                {markers.map(m=>{
                  const srch=editorSearch.toLowerCase()
                  const matchS=!editorSearch||m.name?.toLowerCase().includes(srch)||m.code?.toLowerCase().includes(srch)||m.room?.toLowerCase().includes(srch)
                  const matchR=filterRooms.size===0||filterRooms.has(m.room||'Sem cômodo')
                  const matchC=filterCateg.size===0||filterCateg.has(inferCategory(m.name||'').cat||'Outros')
                  const matchI=!filterItem||m.name===filterItem
                  const visible=matchS&&matchR&&matchC&&matchI
                  const isRack = isRackItem(m.name||'', m.code||'')
                  const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro
                  const sel=selected===m.uid
                  const isCableOrigin = cableDraft?.fromUid===m.uid
                  return <div key={m.uid} className="mk-item" style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%,-50%)',zIndex:sel?20:5,cursor:cableMode?'pointer':'grab',opacity:visible?1:0.07,pointerEvents:visible?'auto':'none',transition:'opacity 0.15s',touchAction:'none'}}
                    onMouseDown={e=>{ if(!cableMode) onDown(e,m.uid) }}
                    onTouchStart={e=>{ if(!cableMode){ const t=e.touches[0]; onDown({preventDefault:()=>{},stopPropagation:()=>e.stopPropagation(),clientX:t.clientX,clientY:t.clientY},m.uid) } }}
                    onClick={e=>{ if(cableMode){ e.stopPropagation(); onCableItemClick(m.uid) } }}>
                    {isCableOrigin && <div style={{position:'absolute',inset:-7,borderRadius:'50%',border:'3px dashed #F59E0B',pointerEvents:'none'}}/>}
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
                  <label style={lbl}>Tipo elétrico (planta elétrica)</label>
                  <select value={m.eleType||'auto'} onChange={e=>{const v=e.target.value; setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,eleType:v==='auto'?undefined:v}:x))}} style={inputDark}>
                    <option value="auto">Automático (pelo nome)</option>
                    <option value="tomada_baixa">🔌 Tomada baixa (perto do chão)</option>
                    <option value="tomada_alta">🔌 Tomada alta (bancada/mesa)</option>
                    <option value="tomada_piso">🔌 Tomada de piso</option>
                    <option value="interruptor_simples">💡 Interruptor simples</option>
                    <option value="interruptor_paralelo">💡 Interruptor paralelo (2 lugares)</option>
                    <option value="interruptor_intermediario">💡 Interruptor 3+ lugares</option>
                    <option value="ponto_luz">⭘ Ponto de luz (teto)</option>
                    <option value="arandela">⭘ Arandela (luz de parede)</option>
                    <option value="quadro">▦ Quadro de luz (QDL)</option>
                    <option value="nenhum">— Não é elétrico</option>
                  </select>
                  <label style={lbl}>Nota (posição/altura)</label>
                  <textarea value={m.note} onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,note:e.target.value}:x))} rows={3} style={{...inputDark,resize:'vertical'}}/>
                  <button onClick={()=>{setMarkers(ms=>ms.filter(x=>x.uid!==m.uid).map((x,i)=>({...x,n:i+1})));setSelected(null)}} style={{...btnGhost,width:'100%',marginTop:10,color:'#FCA5A5',borderColor:'rgba(220,38,38,0.4)'}}><i className="ti ti-trash" aria-hidden/> Remover</button>
                </div>})() : (
                <div style={{padding:14}}>
                  <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Resumo</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.8}}>{markers.length} equipamentos posicionados</div>
                  {(filterRooms.size>0||filterCateg.size>0||editorSearch||filterItem)&&<div style={{marginTop:8,fontSize:11,color:'#38BDF8',background:'rgba(56,189,248,0.1)',padding:'6px 8px',borderRadius:5}}>
                    Visíveis: {markers.filter(m=>{const s=editorSearch.toLowerCase();return(!editorSearch||m.name?.toLowerCase().includes(s)||m.code?.toLowerCase().includes(s)||m.room?.toLowerCase().includes(s))&&(filterRooms.size===0||filterRooms.has(m.room||'Sem cômodo'))&&(filterCateg.size===0||filterCateg.has(inferCategory(m.name||'').cat||'Outros'))&&(!filterItem||m.name===filterItem)}).length} / {markers.length}
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
            {/* Seletor de versão do documento (Completo · Obra · Elétrica) */}
            <div style={{maxWidth:820,margin:'0 auto 14px',display:'flex',gap:8,alignItems:'center',padding:'0 4px',flexWrap:'wrap'}}>
              <span style={{fontSize:12,color:'#475569',fontWeight:600,marginRight:4}}>Versão do documento:</span>
              {[['completo','Completo','ti-file-text'],['obra','Obra / Pedreiro','ti-tools'],['eletrica','Elétrica','ti-bolt']].map(([m,label,icon])=>{
                const doc = m==='obra'?execDocObra:m==='eletrica'?execDocEletrica:execDoc
                return (
                <button key={m} onClick={()=>setExecMode(m)}
                  style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:8,fontSize:12.5,fontWeight:execMode===m?700:500,cursor:'pointer',opacity:doc?1:0.55,
                    border:`1.5px solid ${execMode===m?'#7C3AED':'#CBD5E1'}`,background:execMode===m?'#7C3AED':'#fff',color:execMode===m?'#fff':'#475569'}}>
                  <i className={`ti ${icon}`} aria-hidden/>{label}
                </button>
              )})}
              <div style={{flex:1}}/>
              {/* Toggle do mapa de calor — só na versão elétrica */}
              {execMode==='eletrica' && <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#475569',cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={showHeatmap} onChange={e=>{
                  const v=e.target.checked; setShowHeatmap(v)
                  // regera a elétrica com/sem o mapa de calor (sem IA)
                  const data = execData || buildExecDataFromMarkers()
                  setTimeout(()=>{ const eletrica=buildExecHtml(data,'eletrica'); setExecDocEletrica(eletrica) },0)
                }}/>
                Mostrar mapa de calor Wi-Fi
              </label>}
            </div>
            <div style={{maxWidth:820,margin:'0 auto',background:'#fff',boxShadow:'0 2px 16px rgba(0,0,0,0.12)'}}>
              {(()=>{ const cur = execMode==='obra'?execDocObra:execMode==='eletrica'?execDocEletrica:execDoc
                const nome = execMode==='obra'?'Obra / Pedreiro':execMode==='eletrica'?'Elétrica':'Completa'
                return cur
                ? <div dangerouslySetInnerHTML={{__html:cur}}/>
                : <div style={{padding:'48px 32px',textAlign:'center',color:'#64748B'}}>
                    <i className="ti ti-file-off" style={{fontSize:32,color:'#CBD5E1'}} aria-hidden/>
                    <p style={{margin:'12px 0 4px',fontSize:14,fontWeight:600,color:'#475569'}}>Versão {nome} ainda não gerada</p>
                    <p style={{margin:0,fontSize:12.5}}>Este projeto foi salvo antes desta versão existir. Clique em <b>Gerar sem IA</b> ou <b>Regerar com IA</b> no editor para criar as três versões.</p>
                  </div>
              })()}
            </div>
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
        <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0,alignItems:'center'}}>
          <button onClick={()=>setStep('chat')} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Voltar à análise</button>
          <div style={{flex:1}}/>
          {/* Item 3: Salvar Projeto — salva posição dos marcadores sem gerar documento */}
          <button onClick={async ()=>{
            if(!fromProposal?.id){ alert('Abra o executivo a partir de um orçamento para poder salvar.'); return }
            try{
              const { saveProposal, addAuditLog } = await import('../db/supabase.js')
              const updated = { ...fromProposal, planta_data:{image:bgImage, markers, cables} }
              await saveProposal(updated)
              await addAuditLog({ type:'exec_save_markers', user_name:currentUser?.name||'—',
                after:JSON.stringify({markers:markers.length, rooms:rooms.length, proposal_id:fromProposal.id}) })
              alert(`✅ Projeto salvo! ${markers.length} marcadores gravados.`)
            } catch(e){ alert('Erro ao salvar: '+e.message) }
          }} disabled={loading} style={{...btnGhost,borderColor:'rgba(56,189,248,0.4)',color:'#38BDF8',gap:6}}>
            <i className="ti ti-device-floppy" aria-hidden/> Salvar projeto
          </button>
          {execDoc && <button onClick={()=>{ setExecMode('completo'); setStep('exec') }} disabled={loading} style={{...btnGhost,borderColor:'rgba(110,231,183,0.5)',color:'#6EE7B7',gap:6}} title="Abrir o documento já gerado, sem chamar a IA de novo">
            <i className="ti ti-eye" aria-hidden/> Ver documento salvo
          </button>}
          <button onClick={generateExecManual} disabled={loading} style={{...btnGhost,borderColor:'rgba(148,163,184,0.5)',color:'#CBD5E1',gap:6}} title="Monta o documento a partir dos pontos posicionados, sem usar IA">
            <i className="ti ti-file-pencil" aria-hidden/> Gerar sem IA
          </button>
          <button onClick={generateExec} disabled={loading} style={{...btnPrimary,background:'#7C3AED'}}>
            <i className="ti ti-sparkles" aria-hidden/> {loading?(execProgress||'Gerando...'):(execDoc?'Regerar com IA':'Gerar com IA')}
          </button>
        </div>
      )}
      {step==='exec' && (
        <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0,alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={()=>setStep('editor')} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Editor</button>
          <div style={{flex:1}}/>
          <button onClick={generateExecManual} disabled={loading} style={{...btnGhost,borderColor:'rgba(148,163,184,0.5)',color:'#CBD5E1',gap:6}} title="Regera os 3 documentos a partir dos pontos, sem IA">
            <i className="ti ti-refresh" aria-hidden/> Regerar sem IA
          </button>
          <button onClick={exportPdfAndSave} style={btnPrimary}><i className="ti ti-file-download" aria-hidden/> Baixar PDF ({execMode==='obra'?'Obra':execMode==='eletrica'?'Elétrica':'Completo'}) e salvar</button>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}@keyframes progslide{0%{margin-left:-40%}100%{margin-left:100%}}`}</style>
    </div>
  )
}

const EXEC_CSS=`
/* ── Base ──────────────────────────────────────────────────────────────── */
.ex-doc{font-family:'DM Sans',system-ui,sans-serif;color:#1a1a1a;font-size:11.5px;line-height:1.55;background:#F5FAFF}
.ex-doc *{box-sizing:border-box}

/* ── Capa ───────────────────────────────────────────────────────────────── */
.ex-cover{background:#F5FAFF;color:#0D1420;padding:60px 40px;text-align:center;border-bottom:3px solid #0EA5E9;page-break-after:always;break-after:page}
.ex-cover-top{font-size:10px;letter-spacing:3px;color:#6B8CAE;text-transform:uppercase;margin-bottom:30px}
.ex-cover-tag{font-size:10px;letter-spacing:4px;color:#0EA5E9;margin:6px 0 40px}
.ex-cover-title{font-family:'DM Serif Display',Georgia,serif;font-size:34px;line-height:1.15;margin-bottom:16px;color:#0D1420}
.ex-cover-sub{font-size:13px;color:#456;line-height:1.7;margin-bottom:40px}
.ex-cover-client{background:#fff;border:1px solid #cfe3f5;border-radius:10px;padding:20px;margin:0 auto;max-width:380px}
.ex-cc-name{font-size:20px;font-weight:700;color:#0D1420}
.ex-cc-meta{font-size:11px;color:#6B8CAE;margin-top:4px}
.ex-cover-foot{margin-top:40px;font-size:9px;color:#8fa3b8}

/* ── Seções ─────────────────────────────────────────────────────────────── */
.ex-sec{padding:20px 36px 24px;border-bottom:2px solid #E8F0F8;background:#fff;margin-bottom:0}
.ex-sec h2{font-family:'DM Serif Display',Georgia,serif;font-size:17px;color:#060B1A;margin:0 0 12px;padding-bottom:6px;
  border-bottom:2px solid #0EA5E9;display:flex;align-items:center;gap:8px;page-break-after:avoid;break-after:avoid}
.ex-sec-num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;min-width:24px;
  border-radius:50%;background:#0EA5E9;color:#fff;font-size:11px;font-weight:800;font-family:'DM Sans',sans-serif}

/* Ambiente sub-header dentro de seção */
.ex-amb{font-size:12px;color:#0369A1;font-weight:700;margin:14px 0 5px;background:#EFF6FF;padding:5px 10px;
  border-left:3px solid #0EA5E9;border-radius:0 4px 4px 0;page-break-after:avoid;break-after:avoid}

/* ── Tabelas ─────────────────────────────────────────────────────────────── */
.ex-tbl{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:10.5px;
  page-break-inside:auto;break-inside:auto}
.ex-tbl thead{display:table-header-group} /* repete cabeçalho em página nova */
.ex-tbl th{background:#0D1A30;color:#fff;padding:6px 8px;text-align:left;font-size:9.5px;font-weight:700;letter-spacing:.2px;white-space:nowrap}
.ex-tbl td{padding:5px 8px;border-bottom:1px solid #ECF2F8;vertical-align:top}
.ex-tbl tr:nth-child(even) td{background:#F7FAFE}
.ex-tbl tr:hover td{background:#EEF6FF}
/* Linha de continuação quando tabela quebra de página */
.ex-tbl tbody tr{page-break-inside:avoid;break-inside:avoid}

/* Grupos de linhas que NÃO devem quebrar — use ex-tbl-group */
.ex-tbl-group td{border-top:2px solid #D1E6F8}

/* ── Listas ──────────────────────────────────────────────────────────────── */
.ex-ul{margin:5px 0 8px 20px}
.ex-ul li{margin-bottom:4px;line-height:1.5}
.ex-p{font-size:11.5px;line-height:1.65;color:#374151;margin:0 0 8px}

/* ── Print ───────────────────────────────────────────────────────────────── */
@media print{
  @page{size:A4;margin:16mm 18mm 18mm}
  .no-print{display:none!important}
  .ex-cover{page-break-after:always;break-after:page}
  .ex-sec{page-break-inside:avoid;break-inside:avoid;padding:16px 28px 20px}
  /* Seções longas PODEM quebrar — desativa avoid nelas */
  .ex-sec.ex-breakable{page-break-inside:auto;break-inside:auto}
  .ex-tbl thead{display:table-header-group}
  .ex-tbl{font-size:9.5px}
  .ex-tbl th{padding:4px 6px;font-size:8.5px}
  .ex-tbl td{padding:4px 6px}
  h2{font-size:15px}
  .ex-amb{font-size:11px}
}
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
