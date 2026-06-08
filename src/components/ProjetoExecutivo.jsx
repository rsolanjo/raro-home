import { useState, useRef, useEffect, useCallback } from 'react'

const EQUIP_STYLE = {
  'Gateway':{c:'#0EA5E9',s:'G'},'NVR':{c:'#7C3AED',s:'N'},'Câmera':{c:'#DC2626',s:'C'},
  'Keypad':{c:'#059669',s:'K'},'Hub IR':{c:'#D97706',s:'I'},'Módulo':{c:'#6366F1',s:'M'},
  'Som':{c:'#BE185D',s:'S'},'Wi-Fi':{c:'#0E7490',s:'W'},'Sensor':{c:'#16A34A',s:'P'},
  'Tomada':{c:'#475569',s:'T'},'Outro':{c:'#374151',s:'?'},
}

// Itens que ficam DENTRO do rack (não vão soltos na planta — entram na tabela do rack)
function isRackItem(name='', code='') {
  const n=(name+' '+code).toLowerCase()
  return /\b(hd|nvr|dvr|switch|patch|nobreak|no-break|path ?cord|dream machine|udm|controladora|servidor|fonte|r[aá]ck rack|mini rack|rack)\b/.test(n)
    && !/gateway/.test(n)  // gateway fica na planta
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

export default function ProjetoExecutivo({ catalog=[], clients=[], preClient, onSaveToProposal, onClose, currentUser }) {
  const [step, setStep] = useState('upload') // upload | chat | editor | exec
  const [bgImage, setBgImage] = useState(null)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [markers, setMarkers] = useState([])
  const [projectInfo, setProjectInfo] = useState({client: preClient?`${preClient.name1||''}${preClient.name2?' & '+preClient.name2:''}`:'', notes:''})
  const [selClient, setSelClient] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [catSearch, setCatSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [execDoc, setExecDoc] = useState(null)
  const [execProgress, setExecProgress] = useState('')
  const [zoom, setZoom] = useState(1)
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

Faça uma análise inicial da planta com ATENÇÃO: observe as paredes, portas (aberturas em arco), janelas, e o texto/legendas escritos na planta para identificar cada ambiente pelo nome. Liste os ambientes que você identificou com confiança. Se algum trecho estiver ilegível ou ambíguo, diga que não tem certeza e pergunte — NÃO invente ambientes. Depois faça PERGUNTAS objetivas, UMA DE CADA VEZ, sempre relacionadas a posicionar BEM os equipamentos do catálogo acima. Exemplos de perguntas úteis:
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
    const prompt = `Você é um projetista de automação. Olhe a planta com ATENÇÃO e identifique cada cômodo e suas paredes/portas/janelas. Posicione os equipamentos RARO Home de forma ORGANIZADA e na MELHOR posição técnica de cada um.

CONVERSA (premissas, onde fica o rack, etc.):
${conversation}

CATÁLOGO (use só estes códigos):
${catSummary}

REGRAS DE POSICIONAMENTO (siga rigorosamente):
- Identifique visualmente cada AMBIENTE na planta antes de posicionar. Cada item deve cair DENTRO do cômodo certo, não embolado no centro.
- Keypad/interruptor: ao lado da porta, do lado da maçaneta (encostado na parede).
- Keypad de cabeceira: na parede da cabeceira da cama.
- Câmera: num canto alto do ambiente, apontada para a área útil.
- Hub IR: só em ambiente com ar-condicionado, em parede com visão do aparelho.
- Caixa de som: distribuída no teto do ambiente (afastada das paredes).
- Sensor de presença: perto de portas/circulação.
- Gateway/Rack: no ponto definido na conversa (ex: móvel da TV).
- NÃO empilhe itens no mesmo ponto. Espalhe conforme a função real. Itens do mesmo cômodo devem ficar espaçados dentro dos limites daquele cômodo.
- NÃO posicione itens de RACK (HD, switch, patch panel, nobreak, NVR, path cord) na planta — eles ficam dentro do rack. Posicione apenas o RACK em si.

Para cada equipamento: posição (x,y em % da imagem, 0-100), código do catálogo, ambiente e nota com altura.
Responda APENAS JSON válido (sem texto antes/depois, sem markdown):
{"itens":[{"id":"K1","code":"QAT42Z2B","room":"Sala","x":20,"y":40,"nota":"ao lado da porta, H=110cm"}]}`
    try{
      const reply=await askClaude(
        [{role:'user',text:prompt}],
        bgImage.split(',')[1],'image/jpeg',8000
      )
      let j=reply.trim()
      if(j.includes('```')) j=j.replace(/```json?\n?/g,'').replace(/```/g,'')
      const s=j.indexOf('{')
      if(s>=0) j=j.slice(s)
      let parsed
      try{ parsed=JSON.parse(j) }
      catch(pe){
        // tenta reparar JSON cortado: pega todos os objetos {..} completos do array
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
    setExecProgress('Iniciando...')
    const itemsList=markers.map(m=>`#${m.n} ${m.name} (${m.code}) — ${m.room} — ${m.note}`).join('\n')
    const conversation=chat.map(m=>`${m.role==='user'?'Cliente':'Projetista'}: ${m.text}`).join('\n')
    const rackList=catalog.filter(c=>isRackItem(c.name,c.code)).map(c=>c.name).join(', ')
    const ctx=`Premissas da conversa:\n${conversation}\n\nPontos posicionados:\n${itemsList}`

    try{
      // PARTE 1 — legenda + rack + premissas
      setExecProgress('Gerando legenda e premissas... (1/3)')
      const p1=await askClaude([{role:'user',text:
`Gere SÓ estas seções em HTML (sem <html>/<head>), conciso:
<h2>1. Legenda dos Pontos</h2><table> Nº | Equipamento | Ambiente | Altura | Observação </table>
<h2>2. Rack / CPD</h2><table> U | Equipamento | Função </table> (itens de rack: ${rackList||'NVR, switch, nobreak, patch'})
<h2>3. Premissas</h2> onde fica o CPD, fibra, e que TODOS os keypads precisam de NEUTRO.
${ctx}
Responda só o HTML.`}],null,'image/jpeg',3000)

      // PARTE 2 — pontos por ambiente + cabeamento
      setExecProgress('Gerando pontos e cabeamento... (2/3)')
      const p2=await askClaude([{role:'user',text:
`Gere SÓ estas seções em HTML (sem <html>/<head>), conciso:
<h2>4. Pontos por Ambiente</h2><table> Nº | Ambiente | Posição na parede | Altura | Tipo de cabo | Metragem aprox. até CPD </table>
<h2>5. Material Necessário</h2><table> Item | Quantidade </table> (cabos em metros por tipo, caixas, eletrodutos)
${ctx}
Alturas padrão: quadro H=1,50m; tomada baixa H=0,30m; interruptor H=1,10m; cabeceira H=0,90m; ar H=2,40m; dados H=0,30m.
Responda só o HTML.`}],null,'image/jpeg',3500)

      // PARTE 3 — checklist + fotos + riscos
      setExecProgress('Gerando checklist e riscos... (3/3)')
      const p3=await askClaude([{role:'user',text:
`Gere SÓ estas seções em HTML (sem <html>/<head>), conciso:
<h2>6. Checklist de Obra</h2> o que preparar antes do revestimento.
<h2>7. Fotos no Diário</h2> instrua o mestre a fotografar cada ponto pelo número (#) antes de fechar a parede.
<h2>8. Pontos de Atenção e Riscos</h2>
${ctx}
Responda só o HTML.`}],null,'image/jpeg',2500)

      const clean=t=>{let h=t;if(h.includes('```'))h=h.replace(/```html?\n?/g,'').replace(/```/g,'');return h}
      const full=`<h1>Projeto Executivo de Automação</h1><p><b>Cliente:</b> ${projectInfo.client||'—'} · ${new Date().toLocaleDateString('pt-BR')}</p>`
        +clean(p1)+clean(p2)+clean(p3)
      setExecDoc(full)
      setStep('exec')
      setExecProgress('')
      // SALVA TUDO EM ORÇAMENTO automaticamente
      setTimeout(()=>{ if(window.confirm('Projeto Executivo gerado! Salvar tudo em Orçamento agora?')) saveToProposal(full) }, 400)
    }catch(err){ alert('Erro ao gerar projeto: '+err.message); setExecProgress('') }
    setLoading(false)
  }

  // ── Tabela de cabeamento elétrico (texto/tabela, sem desenho — evita timeout) ──
  async function generateElectrical(){
    setLoading(true)
    const itemsList=markers.map(m=>`#${m.n} ${m.name} (${m.code}) — ${m.room} — ${m.note}`).join('\n')
    const rackItems=catalog.filter(c=>isRackItem(c.name,c.code)).map(c=>c.name).join(', ')
    const prompt=`Gere a TABELA DE CABEAMENTO da automação RARO Home (sem desenho, só tabelas HTML). Seja DIRETO e CONCISO.

PONTOS (origem dos cabos = RACK/CPD):
${itemsList}

Gere HTML (sem <html>/<head>), conciso, com:
<h2>Cabeamento — Origem → Destino</h2>
<table> com colunas: Nº | Equipamento | Ambiente | Tipo de cabo | Bitola | Origem | Destino | Metragem aprox. | Por onde passa (forro/parede/piso)
<h2>Circuitos no quadro (com NEUTRO)</h2>
<table>: Circuito | Disjuntor | Precisa neutro? | Atende
<h2>Observações</h2> bitolas e eletrodutos.

Tipos: câmera/AP=CAT6 PoE; keypad=fase+neutro 2,5mm²; som=cabo 2x1,5mm². Use metragens realistas. Responda só o HTML.`
    try{
      const reply=await askClaude([{role:'user',text:prompt}],null,'image/jpeg',4000)
      let html=reply; if(html.includes('```')) html=html.replace(/```html?\n?/g,'').replace(/```/g,'')
      setExecDoc((execDoc||'')+'<hr style="margin:30px 0"><h1>Planta de Cabeamento Elétrico</h1>'+html)
      setStep('exec')
    }catch(err){ alert('Erro ao gerar cabeamento: '+err.message+'\n\nSe foi timeout (504), tente de novo — agora a resposta é mais curta.') }
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

  function saveToProposal(docOverride){
    if(!onSaveToProposal) return
    const docToSave = typeof docOverride==='string' ? docOverride : execDoc
    const roomMap={}
    markers.forEach(m=>{ const r=m.room||'Geral'; if(!roomMap[r])roomMap[r]=[]; roomMap[r].push(m) })
    const floors=[{name:'Pavimento único', rooms:Object.entries(roomMap).map(([name,items])=>({
      name, items:items.map(m=>({name:m.name,code:m.code,qty:'1',cost_price:m.cost,sale_price:m.sale,category:m.category})),
      price:String(items.reduce((s,m)=>s+(m.sale||0),0))
    }))}]
    onSaveToProposal({ floors, planta_data:{image:bgImage,markers}, client_name:projectInfo.client||selClient, exec_doc:docToSave })
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

              {preClient ? (
                <div style={{marginBottom:20,textAlign:'left',background:'rgba(14,165,233,0.1)',border:'1px solid rgba(14,165,233,0.3)',borderRadius:8,padding:'12px 14px'}}>
                  <div style={{fontSize:11,color:'#38BDF8',textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>Cliente</div>
                  <div style={{fontSize:15,color:'#fff',fontWeight:600}}>{preClient.name1}{preClient.name2?' & '+preClient.name2:''}</div>
                  {preClient.neighborhood && <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{preClient.neighborhood}</div>}
                  {(preClient.planta_medidas?.data||preClient.planta_eletrica?.data) &&
                    <div style={{fontSize:11,color:'#16A34A',marginTop:6}}><i className="ti ti-file-check" aria-hidden/> Planta salva no cadastro disponível</div>}
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
                    {clients.filter(c=>(c.name1||'').toLowerCase().includes(clientSearch.toLowerCase())).length===0 &&
                      <div style={{padding:'10px 12px',color:'rgba(255,255,255,0.4)',fontSize:12}}>Nenhum cliente encontrado. Pode seguir manual.</div>}
                  </div>
                )}
                {selClient && <div style={{fontSize:12,color:'#38BDF8',marginTop:4}}><i className="ti ti-check" aria-hidden/> Cliente selecionado</div>}
                <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:6}}>Ou deixe em branco para preencher manualmente.</div>
              </div>
              )}

              <button onClick={()=>fileRef.current?.click()} style={btnPrimary}>Selecionar planta e começar</button>
              <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleFile}/>
            </div>
          </div>
        )}

        {/* STEP CHAT */}
        {step==='chat' && (
          <div className="pe-chat-wrap" style={{flex:1,display:'flex',minHeight:0}}>
            <div className="pe-chat-img" style={{width:'42%',borderRight:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'#1a1a2e'}}>
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
                <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
                  <textarea value={chatInput} onChange={e=>setChatInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendChat() } }}
                    placeholder="Responda à IA... (Enter envia, Shift+Enter quebra linha)" rows={2}
                    style={{...inputStyle,resize:'none',minHeight:44,maxHeight:120,lineHeight:1.4}}/>
                  <button onClick={sendChat} disabled={loading} style={{...btnPrimary,height:44}}><i className="ti ti-send" aria-hidden/></button>
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
          <div className="pe-editor-wrap" style={{flex:1,display:'flex',minHeight:0}}>
            <div className="pe-editor-cat" style={{width:230,background:'#0f172a',borderRight:'1px solid rgba(255,255,255,0.08)',overflowY:'auto'}}>
              <div style={{padding:12,borderBottom:'1px solid rgba(255,255,255,0.08)',fontSize:11,color:'#38BDF8',fontWeight:600,textTransform:'uppercase'}}>Adicionar do catálogo</div>
              {addMode&&addItem&&<div style={{padding:'6px 12px',background:'rgba(14,165,233,0.15)',fontSize:11,color:'#38BDF8'}}>Clique na planta: {addItem.name}<br/><span onClick={()=>{setAddMode(false);setAddItem(null)}} style={{cursor:'pointer',textDecoration:'underline'}}>cancelar</span></div>}
              <div style={{padding:'10px 12px',position:'sticky',top:0,background:'#0f172a',zIndex:2,borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <input value={catSearch} onChange={e=>setCatSearch(e.target.value)} placeholder="Buscar item..."
                  style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'8px 10px',color:'#fff',fontSize:13,fontFamily:'inherit',boxSizing:'border-box',marginBottom:6}}/>
                <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
                  style={{width:'100%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:6,padding:'8px 10px',color:'#fff',fontSize:13,fontFamily:'inherit',boxSizing:'border-box'}}>
                  <option value="">Todas as categorias</option>
                  {Object.keys(catGroups).map(g=><option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              {Object.entries(catGroups).filter(([g])=>!catFilter||g===catFilter).map(([g,items])=>{
                const fil=items.filter(it=>!catSearch||(it.name||'').toLowerCase().includes(catSearch.toLowerCase())||(it.code||'').toLowerCase().includes(catSearch.toLowerCase()))
                if(!fil.length) return null
                return <div key={g}>
                  <div style={{padding:'6px 12px 2px',fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{g}</div>
                  {fil.map((it,i)=>{const st=EQUIP_STYLE[equipType(it.name)]||EQUIP_STYLE.Outro
                    return <div key={i} onClick={()=>{setAddItem(it);setAddMode(true)}} style={{padding:'9px 12px',cursor:'pointer',display:'flex',gap:8,alignItems:'center',minHeight:38}}
                      onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{width:20,height:20,borderRadius:'50%',background:st.c,color:'#fff',fontSize:9,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{st.s}</span>
                      <span style={{fontSize:11,color:'rgba(255,255,255,0.85)',lineHeight:1.3}}>{it.name}{isRackItem(it.name,it.code)?<span style={{color:'#A78BFA',fontSize:9}}> · rack</span>:''}</span>
                    </div>})}
                </div>})}
            </div>
            <div className="pe-editor-canvas" style={{flex:1,overflow:'auto',background:'#1a1a2e',display:'flex',alignItems:'flex-start',justifyContent:'center',padding:20,position:'relative'}}>
              <div style={{position:'sticky',top:0,right:0,zIndex:30,display:'flex',gap:6,alignSelf:'flex-start',marginLeft:'auto',background:'rgba(0,0,0,0.5)',borderRadius:8,padding:4,height:'fit-content'}}>
                <button onClick={()=>setZoom(z=>Math.max(0.5,z-0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>−</button>
                <span style={{color:'#fff',fontSize:11,display:'flex',alignItems:'center',padding:'0 4px'}}>{Math.round(zoom*100)}%</span>
                <button onClick={()=>setZoom(z=>Math.min(3,z+0.25))} style={{width:32,height:32,borderRadius:6,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',cursor:'pointer',fontSize:16}}>+</button>
              </div>
              <div ref={containerRef} style={{position:'relative',display:'inline-block',cursor:addMode?'crosshair':'default',width:`${zoom*100}%`,transformOrigin:'top center'}} onClick={onCanvasClick}>
                <img src={bgImage} style={{display:'block',width:'100%',pointerEvents:'none'}} draggable={false}/>
                {markers.map(m=>{const st=EQUIP_STYLE[equipType(m.name)]||EQUIP_STYLE.Outro; const sel=selected===m.uid
                  return <div key={m.uid} style={{position:'absolute',left:`${m.x}%`,top:`${m.y}%`,transform:'translate(-50%,-50%)',zIndex:sel?20:5,cursor:'grab'}} onMouseDown={e=>onDown(e,m.uid)}>
                    <div style={{width:sel?28:24,height:sel?28:24,borderRadius:'50%',background:st.c,color:'#fff',fontSize:12,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'2px solid #fff',boxShadow:sel?`0 0 0 3px ${st.c}`:'0 1px 4px rgba(0,0,0,0.5)'}}>{m.n}</div>
                    <div style={{position:'absolute',left:'50%',top:-9,transform:'translateX(-50%)',background:st.c,color:'#fff',borderRadius:'50%',width:13,height:13,fontSize:7,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',border:'1px solid #fff',pointerEvents:'none'}}>{st.s}</div>
                    <div style={{position:'absolute',left:'50%',top:sel?30:26,transform:'translateX(-50%)',background:'rgba(0,0,0,0.75)',color:'#fff',borderRadius:3,padding:'1px 4px',fontSize:7.5,whiteSpace:'nowrap',fontFamily:'monospace',fontWeight:600,pointerEvents:'none'}}>{m.code}</div>
                  </div>})}
              </div>
            </div>
            <div className="pe-editor-side" style={{width:220,background:'#0f172a',borderLeft:'1px solid rgba(255,255,255,0.08)',overflowY:'auto'}}>
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
            <i className="ti ti-file-text" aria-hidden/> {loading?(execProgress||'Gerando...'):'Gerar Projeto Executivo'}
          </button>
          <button onClick={generateElectrical} disabled={loading} style={{...btnPrimary,background:'#D97706'}}>
            <i className="ti ti-bolt" aria-hidden/> Gerar Planta Elétrica
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
