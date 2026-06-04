import { useState, useRef, useEffect, useCallback } from 'react'

const EQUIP_STYLE = {
  'Gateway':{c:'#0EA5E9',s:'G'},'NVR':{c:'#7C3AED',s:'N'},'Câmera':{c:'#DC2626',s:'C'},
  'Keypad':{c:'#059669',s:'K'},'Hub IR':{c:'#D97706',s:'I'},'Módulo':{c:'#6366F1',s:'M'},
  'Som':{c:'#BE185D',s:'S'},'Wi-Fi':{c:'#0E7490',s:'W'},'Sensor':{c:'#16A34A',s:'P'},
  'Tomada':{c:'#475569',s:'T'},'Outro':{c:'#374151',s:'?'},
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

async function downscale(dataUrl, maxDim=1024, q=0.7) {
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
  // messages is array of {role, text}; we flatten last user text + history into one
  const apiMessages = messages.map(m=>({role:m.role, content: m.role==='user' && m===messages[messages.length-1] && imageB64
    ? [...content, {type:'text',text:m.text}]
    : m.text }))
  const res = await fetch('/api/claude',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({model:'claude-sonnet-4-5-20250929',max_tokens:maxTokens,messages:apiMessages})
  })
  const txt = await res.text()
  if(!res.ok) throw new Error('API '+res.status+': '+txt.slice(0,200))
  const data = JSON.parse(txt)
  return data.content?.[0]?.text || ''
}

export default function ProjetoExecutivo({ catalog=[], clients=[], onSaveToProposal, onClose, currentUser }) {
  const [step, setStep] = useState('upload') // upload | chat | editor | exec
  const [bgImage, setBgImage] = useState(null)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [markers, setMarkers] = useState([])
  const [projectInfo, setProjectInfo] = useState({client:'',notes:''})
  const [selClient, setSelClient] = useState('')
  const [execDoc, setExecDoc] = useState(null)
  const [selected, setSelected] = useState(null)
  const [dragging, setDragging] = useState(null)
  const [addItem, setAddItem] = useState(null)
  const [addMode, setAddMode] = useState(false)
  const fileRef = useRef()
  const containerRef = useRef()
  const chatEndRef = useRef()

  useEffect(()=>{ chatEndRef.current?.scrollIntoView({behavior:'smooth'}) },[chat])

  async function handleFile(e){
    const f=e.target.files[0]; if(!f) return
    const reader=new FileReader()
    reader.onload=async ev=>{
      let url=ev.target.result
      if(f.type==='application/pdf'){ try{ url=await pdfToImg(url.split(',')[1]) }catch(err){ alert('Erro PDF: '+err.message); return } }
      url=await downscale(url)
      setBgImage(url)
      setStep('chat')
      startChat(url)
    }
    reader.readAsDataURL(f)
  }

  async function startChat(imgUrl){
    setLoading(true)
    const catList = (catalog||[]).slice(0,100).map(c=>`- ${c.name} (${c.category||'geral'})`).join('\n')
    const sys = `Você é um projetista especialista da RARO Home (automação residencial Zigbee/Matter, Rio de Janeiro). Está analisando a planta baixa enviada para criar um projeto de automação.

Estes são os EQUIPAMENTOS que a RARO Home tem no catálogo e pode instalar:
${catList}

Faça uma análise inicial CURTA do que vê na planta (liste os ambientes que identificou). Depois faça PERGUNTAS objetivas, UMA DE CADA VEZ, sempre relacionadas a posicionar BEM os equipamentos do catálogo acima. Exemplos de perguntas úteis:
- Onde ficará o CPD/rack (onde concentrar gateway, NVR, amplificador)?
- Onde entra a fibra de internet e qual o destino?
- Em quais quartos e qual parede ficam as cabeceiras (para keypad de cabeceira)?
- Quais ambientes terão ar-condicionado (para Hub IR)?
- Quais ambientes terão som ambiente?
- Quais ambientes terão câmera?
- Cortinas motorizadas em quais ambientes?
- Perfil do cliente e prioridades?

Seja breve e conversacional, uma pergunta por vez. O usuário pode clicar em "Gerar sugestão" a qualquer momento, então não exija respostas para todas as perguntas — vá ajudando conforme ele responde.`
    try{
      const reply = await askClaude(
        [{role:'user',text:sys+'\n\nAnalise a planta e comece.'}],
        imgUrl.split(',')[1], 'image/jpeg', 1200
      )
      setChat([{role:'assistant',text:reply}])
    }catch(err){ setChat([{role:'assistant',text:'❌ Erro: '+err.message}]) }
    setLoading(false)
  }

  async function sendChat(){
    if(!chatInput.trim()||loading) return
    const userMsg={role:'user',text:chatInput}
    const newChat=[...chat,userMsg]
    setChat(newChat); setChatInput(''); setLoading(true)
    try{
      const reply=await askClaude(newChat.map(m=>({role:m.role,text:m.text})), null, 'image/jpeg', 1200)
      setChat([...newChat,{role:'assistant',text:reply}])
    }catch(err){ setChat([...newChat,{role:'assistant',text:'❌ Erro: '+err.message}]) }
    setLoading(false)
  }

  async function generatePositions(){
    setLoading(true)
    const catSummary = catalog.slice(0,80).map(c=>`${c.code}: ${c.name} (${c.category})`).join('\n')
    const conversation = chat.map(m=>`${m.role==='user'?'Cliente':'Projetista'}: ${m.text}`).join('\n')
    const prompt = `Com base na conversa abaixo e na planta, posicione os equipamentos de automação RARO Home.

CONVERSA:
${conversation}

CATÁLOGO (use só estes códigos):
${catSummary}

Para cada equipamento dê uma posição (x,y em % da imagem) e um ID único sequencial.
Responda APENAS JSON (sem markdown):
{"itens":[{"id":"K1","code":"QAT42Z2B","room":"Sala","x":20,"y":40,"nota":"ao lado da porta, H=110cm"}]}`
    try{
      const reply=await askClaude(
        [{role:'user',text:prompt}],
        bgImage.split(',')[1],'image/jpeg',4000
      )
      let j=reply.trim()
      if(j.includes('```')) j=j.replace(/```json?\n?/g,'').replace(/```/g,'')
      // extrai o primeiro bloco JSON, caso a IA escreva texto antes/depois
      const s=j.indexOf('{'), e=j.lastIndexOf('}')
      if(s>=0 && e>s) j=j.slice(s,e+1)
      let parsed
      try{ parsed=JSON.parse(j) }
      catch(pe){ throw new Error('A IA não retornou um JSON válido. Tente clicar em "Gerar sugestão" novamente. Resposta: '+reply.slice(0,150)) }
      let cid=Date.now()
      const mk=(parsed.itens||[]).map(it=>{
        const cat=catalog.find(c=>c.code===it.code) || catalog.find(c=>(c.name||'').toLowerCase()===(it.name||'').toLowerCase())
        return {uid:cid++, id:it.id||('?'+(cid%1000)), code:it.code||cat?.code||'', name:cat?.name||it.name||it.code||'Item',
          room:it.room||'', x:Math.max(2,Math.min(98,Number(it.x)||50)), y:Math.max(2,Math.min(96,Number(it.y)||50)),
          note:it.nota||it.note||'', cost:cat?.cost_price||0, sale:cat?.sale_price||0, category:cat?.category||''}
      })
      if(!mk.length) throw new Error('A IA não sugeriu itens. Verifique se há equipamentos no catálogo e tente novamente.')
      mk.forEach((m,i)=>{ m.n = i+1 })  // legenda numérica única
      setMarkers(mk)
      setStep('editor')
    }catch(err){ alert('Erro ao posicionar: '+err.message) }
    setLoading(false)
  }

  // Drag
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
    const typeCount=markers.filter(m=>equipType(m.name)===equipType(addItem.name)).length+1
    const sym=EQUIP_STYLE[equipType(addItem.name)]?.s||'?'
    setMarkers(ms=>[...ms,{uid:Date.now(),n:ms.length+1,id:sym+typeCount,code:addItem.code,name:addItem.name,
      room:'',x,y,note:'',cost:addItem.cost_price||0,sale:addItem.sale_price||0,category:addItem.category||''}])
    setAddMode(false); setAddItem(null)
  }

  async function generateExec(){
    setLoading(true)
    const itemsList=markers.map(m=>`#${m.n} · ${m.name} (${m.code}) — ${m.room} — ${m.note}`).join('\n')
    const conversation=chat.map(m=>`${m.role==='user'?'Cliente':'Projetista'}: ${m.text}`).join('\n')
    const prompt=`Gere um PROJETO EXECUTIVO de automação para o arquiteto preparar a infraestrutura (pré-instalação).

IMPORTANTE: NÃO inclua modelos comerciais nem preços. É um guia técnico de obra.

CONVERSA COM O CLIENTE:
${conversation}

EQUIPAMENTOS POSICIONADOS:
${itemsList}

Gere um documento técnico em HTML (só o conteúdo interno, sem <html> ou <head>) com estas seções:
1. LEGENDA NUMERADA — tabela com cada item (#número, equipamento, ambiente, nota) para localização rápida na planta
2. Premissas do projeto
3. Tabela de pontos por ambiente (use o #número, posição, altura, tipo de cabo, metragem aproximada)
4. Mapa de cabeamento (origem→destino, tipo de cabo)
5. Checklist de obra (o que o arquiteto/eletricista prepara antes do revestimento)
6. Riscos e cuidados
Use tabelas HTML simples. Linguagem técnica de obra. Tudo em português.`
    try{
      const reply=await askClaude([{role:'user',text:prompt}],null,'image/jpeg',4000)
      let html=reply; if(html.includes('```')) html=html.replace(/```html?\n?/g,'').replace(/```/g,'')
      setExecDoc(html)
      setStep('exec')
    }catch(err){ alert('Erro ao gerar projeto: '+err.message) }
    setLoading(false)
  }

  function exportPdf(){
    const w=window.open('','_blank')
    w.document.write(`<html><head><title>Projeto Executivo — RARO Home</title>
      <style>body{font-family:sans-serif;font-size:12px;padding:30px;color:#1a1a1a;max-width:900px;margin:0 auto}
      h1,h2,h3{color:#0369A1}table{width:100%;border-collapse:collapse;margin:12px 0}
      th{background:#060B1A;color:#fff;padding:6px 8px;text-align:left;font-size:11px}
      td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
      tr:nth-child(even) td{background:#f7fafc}</style></head><body>
      <h1>RARO Home — Projeto Executivo de Automação</h1>
      <p><b>Cliente:</b> ${projectInfo.client||selClient||'—'} · <b>Data:</b> ${new Date().toLocaleDateString('pt-BR')}</p>
      <hr>${execDoc}
      <p style="margin-top:30px;font-size:10px;color:#999">RARO Home · contato@rarohome.com.br · (21) 98170-9009</p>
      </body></html>`)
    w.document.close(); setTimeout(()=>w.print(),600)
  }

  function saveToProposal(){
    if(!onSaveToProposal) return
    const roomMap={}
    markers.forEach(m=>{ const r=m.room||'Geral'; if(!roomMap[r])roomMap[r]=[]; roomMap[r].push(m) })
    const floors=[{name:'Pavimento único', rooms:Object.entries(roomMap).map(([name,items])=>({
      name, items:items.map(m=>({name:m.name,code:m.code,qty:'1',cost_price:m.cost,sale_price:m.sale,category:m.category})),
      price:String(items.reduce((s,m)=>s+(m.sale||0),0))
    }))}]
    onSaveToProposal({ floors, planta_data:{image:bgImage,markers}, client_name:projectInfo.client||selClient, exec_doc:execDoc })
  }

  const catGroups={}; (catalog||[]).forEach(c=>{const g=c.category||'Outro';(catGroups[g]=catGroups[g]||[]).push(c)})

  return (
    <div style={{position:'fixed',inset:0,background:'#0f172a',zIndex:1000,display:'flex',flexDirection:'column'}}>
      {/* Toolbar */}
      <div style={{background:'#060B1A',padding:'10px 16px',display:'flex',alignItems:'center',gap:12,flexShrink:0}}>
        <button onClick={onClose} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Sair</button>
        <div style={{color:'#38BDF8',fontWeight:600,fontSize:14}}>
          <i className="ti ti-brain" style={{marginRight:6}} aria-hidden/>Projeto Executivo com IA
        </div>
        <div style={{flex:1}}/>
        <div style={{display:'flex',gap:6,fontSize:11,color:'rgba(255,255,255,0.5)'}}>
          {['upload','chat','editor','exec'].map((s,i)=>(
            <span key={s} style={{padding:'3px 10px',borderRadius:12,background:step===s?'#0EA5E9':'rgba(255,255,255,0.08)',color:step===s?'#fff':'rgba(255,255,255,0.4)'}}>
              {i+1}. {s==='upload'?'Planta':s==='chat'?'Análise':s==='editor'?'Editor':'Projeto'}
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

              <div style={{marginBottom:20,textAlign:'left'}}>
                <label style={lbl}>Cliente (opcional — puxa dados cadastrados)</label>
                <select value={selClient} onChange={e=>{
                    setSelClient(e.target.value)
                    const cl=clients.find(c=>String(c.id)===e.target.value)
                    if(cl) setProjectInfo(p=>({...p,client:`${cl.name1||''}${cl.name2?' & '+cl.name2:''}`}))
                  }} style={{...inputDark,marginBottom:0}}>
                  <option value="">— Selecionar cliente cadastrado —</option>
                  {clients.map(c=>(<option key={c.id} value={c.id}>{c.name1}{c.name2?' & '+c.name2:''}{c.neighborhood?' · '+c.neighborhood:''}</option>))}
                </select>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:6}}>Ou deixe em branco para preencher manualmente depois.</div>
              </div>

              <button onClick={()=>fileRef.current?.click()} style={btnPrimary}>Selecionar planta e começar</button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleFile}/>
            </div>
          </div>
        )}

        {/* STEP CHAT */}
        {step==='chat' && (
          <div style={{flex:1,display:'flex'}}>
            <div style={{width:'45%',borderRight:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'#1a1a2e'}}>
              {bgImage && <img src={bgImage} style={{maxWidth:'100%',maxHeight:'100%',borderRadius:6}}/>}
            </div>
            <div style={{flex:1,display:'flex',flexDirection:'column'}}>
              <div style={{flex:1,overflowY:'auto',padding:20}}>
                {chat.map((m,i)=>(
                  <div key={i} style={{marginBottom:14,display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
                    <div style={{maxWidth:'85%',padding:'10px 14px',borderRadius:10,fontSize:13,lineHeight:1.6,whiteSpace:'pre-wrap',
                      background:m.role==='user'?'#0EA5E9':'rgba(255,255,255,0.08)',color:'#fff'}}>{m.text}</div>
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
                <div style={{display:'flex',gap:8}}>
                  <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()}
                    placeholder="Responda à IA ou pergunte algo..." style={inputStyle}/>
                  <button onClick={sendChat} disabled={loading} style={btnPrimary}><i className="ti ti-send" aria-hidden/></button>
                </div>
                <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:8,textAlign:'center'}}>
                  Responda as perguntas da IA quando quiser, ou clique em "Gerar sugestão" a qualquer momento.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP EDITOR */}
        {step==='editor' && (
          <div style={{flex:1,display:'flex'}}>
            <div style={{width:230,background:'#0f172a',borderRight:'1px solid rgba(255,255,255,0.08)',overflowY:'auto'}}>
              <div style={{padding:12,borderBottom:'1px solid rgba(255,255,255,0.08)',fontSize:11,color:'#38BDF8',fontWeight:600,textTransform:'uppercase'}}>Adicionar do catálogo</div>
              {addMode&&addItem&&<div style={{padding:'6px 12px',background:'rgba(14,165,233,0.15)',fontSize:11,color:'#38BDF8'}}>Clique na planta: {addItem.name}<br/><span onClick={()=>{setAddMode(false);setAddItem(null)}} style={{cursor:'pointer',textDecoration:'underline'}}>cancelar</span></div>}
              {Object.entries(catGroups).map(([g,items])=>(
                <div key={g}>
                  <div style={{padding:'6px 12px 2px',fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{g}</div>
                  {items.map((it,i)=>{const st=EQUIP_STYLE[equipType(it.name)]||EQUIP_STYLE.Outro
                    return <div key={i} onClick={()=>{setAddItem(it);setAddMode(true)}} style={{padding:'6px 12px',cursor:'pointer',display:'flex',gap:8,alignItems:'center'}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{width:18,height:18,borderRadius:'50%',background:st.c,color:'#fff',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{st.s}</span>
                      <span style={{fontSize:10,color:'rgba(255,255,255,0.8)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.name}</span>
                    </div>})}
                </div>
              ))}
            </div>
            <div style={{flex:1,overflow:'auto',background:'#1a1a2e',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20}}>
              <div ref={containerRef} style={{position:'relative',display:'inline-block',cursor:addMode?'crosshair':'default'}} onClick={onCanvasClick}>
                <img src={bgImage} style={{display:'block',maxWidth:'100%',pointerEvents:'none'}} draggable={false}/>
                {markers.map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro; const sel=selected===m.uid
                  return <div key={m.uid} style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%,-50%)',zIndex:sel?20:5,cursor:'grab'}} onMouseDown={e=>onDown(e,m.uid)}>
                    <div style={{width:sel?28:24,height:sel?28:24,borderRadius:'50%',background:st.c,color:'#fff',fontSize:12,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff',boxShadow:sel?`0 0 0 3px ${st.c}`:'0 1px 4px rgba(0,0,0,0.5)'}}>{m.n}</div>
                    <div style={{position:'absolute',left:'50%',top:-9,transform:'translateX(-50%)',background:st.c,color:'#fff',borderRadius:'50%',width:13,height:13,fontSize:7,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #fff',pointerEvents:'none'}}>{st.s}</div>
                    <div style={{position:'absolute',left:'50%',top:sel?30:26,transform:'translateX(-50%)',background:'rgba(0,0,0,0.75)',color:'#fff',borderRadius:3,padding:'1px 4px',fontSize:7.5,whiteSpace:'nowrap',fontFamily:'monospace',fontWeight:600,pointerEvents:'none'}}>{m.code}</div>
                  </div>})}
              </div>
            </div>
            <div style={{width:220,background:'#0f172a',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto'}}>
              {selected ? (()=>{const m=markers.find(x=>x.uid===selected); if(!m)return null
                return <div style={{padding:14}}>
                  <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Item {m.id}</div>
                  <div style={{fontSize:13,fontWeight:600,color:'#fff'}}>{m.name}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontFamily:'monospace',marginBottom:10}}>{m.code}</div>
                  <label style={lbl}>Ambiente</label>
                  <input value={m.room} onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,room:e.target.value}:x))} style={inputDark}/>
                  <label style={lbl}>ID único</label>
                  <input value={m.id} onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,id:e.target.value}:x))} style={inputDark}/>
                  <label style={lbl}>Nota (posição/altura)</label>
                  <textarea value={m.note} onChange={e=>setMarkers(ms=>ms.map(x=>x.uid===m.uid?{...x,note:e.target.value}:x))} rows={3} style={{...inputDark,resize:'vertical'}}/>
                  <button onClick={()=>{setMarkers(ms=>ms.filter(x=>x.uid!==m.uid).map((x,i)=>({...x,n:i+1})));setSelected(null)}} style={{...btnGhost,width:'100%',marginTop:10,color:'#FCA5A5',borderColor:'rgba(220,38,38,0.4)'}}><i className="ti ti-trash" aria-hidden/> Remover</button>
                </div>})() : (
                <div style={{padding:14}}>
                  <div style={{fontSize:11,color:'#38BDF8',fontWeight:600,marginBottom:10,textTransform:'uppercase'}}>Resumo</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.7)',lineHeight:1.8}}>{markers.length} equipamentos posicionados</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:10,lineHeight:1.6}}>Clique num marcador para editar.<br/>Arraste para mover.<br/>Use o painel esquerdo para adicionar.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP EXEC */}
        {step==='exec' && (
          <div style={{flex:1,overflowY:'auto',background:'#fff',padding:30}}>
            <div style={{maxWidth:900,margin:'0 auto'}} dangerouslySetInnerHTML={{__html:execDoc||''}}/>
          </div>
        )}
      </div>

      {/* Footer actions */}
      {step==='editor' && (
        <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={()=>setStep('chat')} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Voltar à análise</button>
          <button onClick={generateExec} disabled={loading} style={{...btnPrimary,background:'#7C3AED'}}>
            <i className="ti ti-file-text" aria-hidden/> {loading?'Gerando...':'Gerar Projeto Executivo'}
          </button>
        </div>
      )}
      {step==='exec' && (
        <div style={{background:'#060B1A',padding:'12px 16px',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0}}>
          <button onClick={()=>setStep('editor')} style={btnGhost}><i className="ti ti-arrow-left" aria-hidden/> Editor</button>
          <button onClick={exportPdf} style={btnGhost}><i className="ti ti-printer" aria-hidden/> Extrair PDF</button>
          <button onClick={saveToProposal} style={btnPrimary}><i className="ti ti-device-floppy" aria-hidden/> Salvar em Orçamento</button>
        </div>
      )}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const btnPrimary={background:'#0EA5E9',color:'#fff',border:'none',padding:'8px 16px',borderRadius:6,cursor:'pointer',fontSize:13,fontWeight:600,fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}
const btnGhost={background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)',padding:'7px 14px',borderRadius:6,cursor:'pointer',fontSize:12,fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}
const inputStyle={flex:1,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,padding:'8px 12px',color:'#fff',fontSize:13,fontFamily:'inherit'}
const inputDark={width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,padding:'5px 8px',color:'#fff',fontSize:12,fontFamily:'inherit',boxSizing:'border-box',marginBottom:8}
const lbl={fontSize:10,color:'rgba(255,255,255,0.4)',display:'block',marginBottom:3}
