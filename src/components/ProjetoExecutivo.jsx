import { useState, useRef, useEffect, useCallback } from 'react'
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

export default function ProjetoExecutivo({ catalog=[], clients=[], preClient, fromProposal, onSaveToProposal, onClose, currentUser }) {
  const [step, setStep] = useState(()=> fromProposal?.planta_data?.markers?.length ? 'editor' : 'upload')
  const [bgImage, setBgImage] = useState(()=> fromProposal?.planta_data?.image || null)
  const [chat, setChat] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [markers, setMarkers] = useState(()=> fromProposal?.planta_data?.markers || [])
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

  useEffect(()=>{
    if(fromProposal && !fromProposal?.planta_data?.markers?.length && !markers.length){
      const floors = typeof fromProposal.floors==='string' ? (()=>{try{return JSON.parse(fromProposal.floors)}catch{return[]}})() : (fromProposal.floors||[])
      const mk=[]; let n=1
      floors.forEach(fl=>(fl.rooms||[]).forEach(r=>(r.items||[]).forEach(it=>{
        if(!it.name && !it.code) return
        const cat=catalog.find(c=>c.code===it.code)
        const qty=parseInt(it.qty)||1
        for(let i=0;i<qty;i++){
          if(isRackItem(it.name||cat?.name||'', it.code||'')) continue
          mk.push({uid:Date.now()+Math.random(), n:n++, id:'', code:it.code||cat?.code||'', name:it.name||cat?.name||'Item',
            room:r.name||'', x:48+(Math.random()*8-4), y:48+(Math.random()*8-4), note:'',
            cost:it.cost_price||cat?.cost_price||0, sale:it.sale_price||cat?.sale_price||0, category:it.category||cat?.category||''})
        }
      })))
      if(mk.length){ setMarkers(mk); if(!fromProposal?.planta_data?.image) setStep('editor') }
    }
  },[])  // eslint-disable-line

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

Estes são os EQUIPAMENTOS que a RARO Home tem no catálogo:
${catList}

REGRAS IMPORTANTES DO PROJETO (sempre aplique):
1. Em TODA cabeceira de cama (quartos/suítes) → combo padrão: 1 keypad 1 botão + 1 tomada USB (meio) + 1 tomada embaixo, em cada lado da cama.
2. Sempre pergunte sobre ar-condicionado em cada ambiente. Ambientes com AC E com TV precisam de Hub IR.
3. Sugira sensor de presença (mmWave) na entrada principal e em todos os banheiros.
4. Sempre sugira rede Wi-Fi robusta com Access Points distribuídos — verifique cobertura por andar/área.
5. Sempre pergunte o que vai no rack (gateway, switch, amplificador, etc.) e sugira configuração.

REGRAS DO RACK:
- Base: sempre tem Dream Machine SE como roteador/gateway principal
- Dream Machine SE tem 8 portas — conte APs + câmeras; se passar de 6 ativos, adicione switch PoE+
- NÃO usar NVR separado — o Dream Machine SE gravação integrada funciona
- NÃO usar DIO/filtro de fibra — conexão direta ao rack

Analise a planta com atenção, identifique os ambientes, e faça PERGUNTAS OBJETIVAS sobre:
- Onde ficará o rack/CPD?
- Quais ambientes têm ar-condicionado? (para Hub IR)
- Qual lado da cama é a cabeceira em cada quarto?
- Quais ambientes terão som ambiente?
- Quais ambientes terão câmera?
- Cortinas motorizadas onde?
- Perfil do cliente?

Seja breve, uma pergunta por vez.`
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
    setLoading(true); setExecProgress('Analisando a planta e posicionando os equipamentos...')
    const catSummary = catalog.slice(0,80).map(c=>`${c.code}: ${c.name} (${c.category})`).join('\n')
    const conversation = chat.map(m=>`${m.role==='user'?'Cliente':'Projetista'}: ${m.text}`).join('\n')
    const prompt = `Você é um projetista de automação RARO Home. Posicione os equipamentos na planta.

CONVERSA (premissas):
${conversation}

CATÁLOGO (use só estes códigos):
${catSummary}

REGRAS DE POSICIONAMENTO:
- Identifique visualmente cada AMBIENTE na planta.
- Keypad entrada: ao lado da porta, lado maçaneta, H=1,10m.
- CABECEIRA DE CAMA (OBRIGATÓRIO em todo quarto/suíte): posicione combo em CADA lado da cama: 1x keypad 1 botão (H=0,70m) + 1x tomada USB + 1x tomada comum. Isso vale para suíte master, suíte 2, quarto, etc.
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
    const typeCount=markers.filter(m=>equipType(m.name)===equipType(addItem.name)).length+1
    const sym=EQUIP_STYLE[equipType(addItem.name)]?.s||'?'
    setMarkers(ms=>[...ms,{uid:Date.now(),n:ms.length+1,id:sym+typeCount,code:addItem.code,name:addItem.name,
      room:'',x,y,note:'',cost:addItem.cost_price||0,sale:addItem.sale_price||0,category:addItem.category||''}])
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
 "rack_items":[{"u":"U1","equip":"Dream Machine SE","funcao":"Roteador principal / gateway Zigbee / 8 portas PoE","watts":"25W"},{"u":"U2","equip":"Switch PoE+ 16p","funcao":"só se precisa_switch=true","watts":"..."}],
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
 "cabos_rede":[{"id":"CAT-01","origem":"DM SE porta 1","destino":"AP #1 Sala","tipo":"CAT6 U/UTP","bitola":"24AWG","metros":"12","cor_etiqueta":"Azul","porta_patch":"P01","etiqueta":"AP-SALA"}],
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

    // Tópico 3 — Rack com visual gráfico
    const rackCfg = d.rack_config || {}
    const rackItems = d.rack_items || d.rack || []
    const aps = rackCfg.aps||0, cams = rackCfg.cameras||0
    const totalPoe = aps+cams
    const precisaSwitch = rackCfg.precisa_switch || totalPoe > 6
    const RACK_COLORS = ['#0EA5E9','#16A34A','#7C3AED','#D97706','#DC2626','#0891B2','#DB2777','#374151','#059669','#475569','#0E7490','#BE185D']

    const rackVisual = `
<div style="margin:12px 0 20px;border:2px solid #1e293b;border-radius:8px;overflow:hidden;max-width:560px">
  <div style="background:#0D1420;color:#38BDF8;font-size:11px;font-weight:700;padding:8px 14px;letter-spacing:1px;display:flex;justify-content:space-between;align-items:center">
    <span>🖥 RACK 12U — CPD</span>
    <span style="color:rgba(255,255,255,0.5);font-size:9px;font-weight:400">${rackCfg.dream_machine_portas||8} portas DM SE · ${totalPoe} dispositivos PoE · ${precisaSwitch?'Switch adicional necessário':'DM SE comporta tudo'}</span>
  </div>
  ${rackItems.map((r,i)=>`
  <div style="display:flex;align-items:stretch;border-bottom:1px solid #e2e8f0;min-height:32px">
    <div style="background:${RACK_COLORS[i%RACK_COLORS.length]};color:#fff;font-size:10px;font-weight:700;width:46px;display:flex;align-items:center;justify-content:center;flex-shrink:0;writing-mode:horizontal-tb;padding:4px">${esc(r.u)}</div>
    <div style="flex:1;background:${i%2===0?'#f8fafc':'#fff'};padding:6px 12px;display:flex;align-items:center;gap:12px">
      <div style="font-size:11px;font-weight:600;color:#0D1420;min-width:180px">${esc(r.equip)}</div>
      <div style="font-size:10px;color:#64748b;flex:1">${esc(r.funcao)}</div>
      ${r.watts?`<div style="font-size:9px;color:#94a3b8;background:#f1f5f9;padding:2px 6px;border-radius:4px;white-space:nowrap">${esc(r.watts)}</div>`:''}
    </div>
  </div>`).join('')}
  <div style="background:#f1f5f9;padding:8px 14px;display:flex;gap:20px;flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:50%;background:#16A34A"></div><span style="font-size:10px;color:#374151">APs: <b>${aps}</b></span></div>
    <div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:50%;background:#DC2626"></div><span style="font-size:10px;color:#374151">Câmeras: <b>${cams}</b></span></div>
    <div style="display:flex;align-items:center;gap:6px"><div style="width:10px;height:10px;border-radius:50%;background:#0EA5E9"></div><span style="font-size:10px;color:#374151">Total PoE: <b>${totalPoe}/${rackCfg.dream_machine_portas||8}</b></span></div>
    ${precisaSwitch?`<div style="display:flex;align-items:center;gap:6px;background:#FEF3C7;padding:3px 8px;border-radius:4px"><span style="font-size:10px;color:#92400E">⚠ Switch PoE+ ${rackCfg.switch_portas||16}p adicionado</span></div>`:'<div style="display:flex;align-items:center;gap:6px;background:#D1FAE5;padding:3px 8px;border-radius:4px"><span style="font-size:10px;color:#065F46">✓ Dream Machine SE suficiente</span></div>'}
  </div>
</div>`

    // Tópico 4 — Módulos e caixas de teto por cômodo
    const modulosTeto = d.modulos_teto || []
    const modulosTetoHtml = modulosTeto.length
      ? modulosTeto.map(mt=>`
<div style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden">
  <div style="background:#0369A1;color:#fff;padding:6px 12px;font-size:12px;font-weight:700">${esc(mt.ambiente)}</div>
  <div style="padding:8px 12px;background:#fff">
    ${(mt.itens||[]).map(it=>`<div style="display:flex;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:11px;color:#374151"><span style="color:#0EA5E9">▸</span>${esc(it)}</div>`).join('')}
  </div>
</div>`).join('')
      : (d.modulos||[]).length ? T(d.modulos.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.funcao)}</td><td>${esc(r.ambiente)}</td><td>${esc(r.carga)}</td><td>${esc(r.posicao)}</td></tr>`).join(''),['ID','Função','Ambiente','Carga','Posição']) : ''

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
    let itensComodoHtml=''
    Object.entries(byRoom).forEach(([room,items])=>{
      const total=Object.values(items).reduce((s,i)=>s+i.qty,0)
      itensComodoHtml+=`<h3 class="ex-amb">${esc(room)} — ${total} item(ns)</h3>`+T(
        Object.entries(items).map(([nm,i])=>`<tr><td>${esc(nm)}</td><td>${i.cat?'<span style="color:#16A34A;font-weight:600">Catálogo</span>':'<span style="color:#D97706">Avulso</span>'}</td><td><b>${i.qty}</b></td></tr>`).join(''),
        ['Item','Origem','Qtd'])
    })
    const totalGeralHtml=Object.keys(geral).length?T(
      Object.entries(geral).sort((a,b)=>b[1].qty-a[1].qty).map(([nm,i])=>`<tr><td>${esc(nm)}</td><td>${i.cat?'Catálogo':'Avulso'}</td><td><b>${i.qty}</b></td></tr>`).join('')
       +`<tr style="background:#060B1A"><td style="color:#fff;font-weight:700">TOTAL GERAL</td><td></td><td style="color:#fff;font-weight:700">${Object.values(geral).reduce((s,i)=>s+i.qty,0)}</td></tr>`,
      ['Item','Origem','Qtd total'])
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
    <img src="${LOGO_EXEC}" alt="RARO HOME" style="width:160px;max-width:50%;margin:0 auto 8px;display:block;border-radius:8px;background:#101828;padding:8px"/>
    <div class="ex-cover-tag">CASA · TECNOLOGIA · LAZER</div>
    <div class="ex-cover-title">Projeto Executivo de Automação</div>
    <div class="ex-cover-sub">Posições exatas · Cabeamento · Pré-instalação<br>Guia técnico para obra e arquiteto</div>
    <div class="ex-cover-client"><div class="ex-cc-name">${esc(cliente)}</div><div class="ex-cc-meta">${hoje} · RARO Home</div></div>
    <div class="ex-cover-foot">RARO Home · contato@rarohome.com.br · (21) 98170-9009</div>
  </div>

  ${planta}
  ${sec('1. Premissas Confirmadas', list(d.premissas))}
  ${sec('3. Detalhe do RACK / CPD', list(d.rack_detalhe)+rackVisual)}
  ${sec('4. Módulos e Caixas de Teto — por Cômodo', modulosTetoHtml)}
  ${sec('5. Keypads, Câmeras e Pontos de Parede', pontosHtml)}
  ${sec('6. Cabos de Rede — Patch Panel e Etiquetas', cabosRedeHtml)}
  ${sec('7. Cabos de Som — Amplificador no RACK', (d.cabos_som||[]).length?T(d.cabos_som.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.tipo)}</td><td>${esc(r.metros)}m</td><td style="font-family:monospace;font-size:10px">${esc(r.etiqueta||'-')}</td></tr>`).join(''),['ID','Origem','Destino','Tipo','Metros','Etiqueta']):'')}}
  ${sec('8. Cabos Elétricos — por Cômodo', cabosEletHtml)}
  ${sec('9. Alimentação dos Keypads (Fase + Neutro)', (d.alim_keypads||[]).length?T(d.alim_keypads.map(r=>`<tr><td><b>${esc(r.id)}</b></td><td>${esc(r.origem)}</td><td>${esc(r.destino)}</td><td>${esc(r.cota)}</td><td>${esc(r.comodo)}</td><td>${esc(r.metros)}m</td><td style="font-size:10px;color:#6B7280">${esc(r.fios||'2x2,5mm²')}</td></tr>`).join(''),['ID','Origem','Destino (Keypad)','Cota/Altura','Cômodo','m','Fios']):'')}}
  ${sec('10. Módulos e Cargas (iluminação + cortinas)', modulosCargas)}
  ${sec('11. Banheiros, Circulação e Sensores', banhHtml)}
  ${sec('12. Resumo Geral de Cabeamento', (d.resumo_cabos||[]).length?T(d.resumo_cabos.map(r=>`<tr><td><b>${esc(r.tipo)}</b></td><td>${esc(r.metros_total)}m</td></tr>`).join(''),['Tipo de cabo','Metragem total']):'')}}
  ${sec('14. Lista Completa de Peças', (d.pecas||[]).length?T(d.pecas.map(r=>`<tr><td>${esc(r.item)}</td><td>${esc(r.qtd)}</td></tr>`).join(''),['Item','Qtd']):'')}}
  ${sec('15. Checklist de Obra — para o Arquiteto / Eletricista', list(d.checklist_obra))}
  ${sec('16. Checklist de Instalação — Equipe RARO Home', list(d.checklist_raro))}
  ${sec('17. Pontos de Atenção e Riscos', list(d.riscos))}
  ${sec('18. Fotos no Diário de Obra', '<p class="ex-p">O mestre de obra deve fotografar cada ponto pelo número antes de fechar a parede, registrando no app RARO Home. Assim cada foto fica atrelada ao ponto correspondente.</p>')}
  ${sec('19. Itens por Cômodo e Total Geral', itensComodoHtml + '<h3 class="ex-amb">Total geral consolidado</h3>' + totalGeralHtml)}
  ${sec('20. Gráficos e Linha do Tempo do Projeto', grafico1 + grafico2 + grafico3 + grafico4)}
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

  const catGroups={}; (catalog||[]).forEach(c=>{const g=c.category||'Outro';(catGroups[g]=catGroups[g]||[]).push(c)})

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
                {bgImage ? <img src={bgImage} style={{display:'block',width:'100%',pointerEvents:'none'}} draggable={false}/>
                  : <div style={{width:600,maxWidth:'80vw',aspectRatio:'4/3',background:'rgba(255,255,255,0.04)',border:'2px dashed rgba(255,255,255,0.2)',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12,color:'rgba(255,255,255,0.5)'}}>
                      <i className="ti ti-photo-plus" style={{fontSize:40}} aria-hidden/>
                      <div style={{fontSize:14,textAlign:'center',padding:'0 20px'}}>Sem planta carregada.</div>
                      <button onClick={e=>{e.stopPropagation();fileRef.current?.click()}} style={{...btnPrimary,background:'#0EA5E9'}}><i className="ti ti-upload" aria-hidden/> Carregar planta</button>
                    </div>}
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
          <div style={{flex:1,overflowY:'auto',background:'#e8eaed',padding:'20px 0'}}>
            <style>{EXEC_CSS}</style>
            <div style={{maxWidth:820,margin:'0 auto',background:'#fff',boxShadow:'0 2px 16px rgba(0,0,0,0.12)'}} dangerouslySetInnerHTML={{__html:execDoc||''}}/>
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
