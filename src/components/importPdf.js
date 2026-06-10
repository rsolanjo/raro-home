// Importa um PDF (proposta ou projeto executivo) e extrai dados estruturados via IA.
// Usa pdf.js (carregado sob demanda) para extrair texto e renderizar páginas como imagem.

function loadPdfJs(){
  return new Promise((resolve,reject)=>{
    if(window.pdfjsLib){ resolve(window.pdfjsLib); return }
    const s=document.createElement('script')
    s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    s.onload=()=>{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; resolve(window.pdfjsLib) }
    s.onerror=()=>reject(new Error('Falha ao carregar pdf.js'))
    document.head.appendChild(s)
  })
}

// Extrai texto de TODAS as páginas + renderiza a 1ª página como imagem (para a IA "ver" a planta)
export async function extractPdf(fileB64){
  const lib=await loadPdfJs()
  const bytes=Uint8Array.from(atob(fileB64),c=>c.charCodeAt(0))
  const pdf=await lib.getDocument({data:bytes}).promise
  let fullText=''
  const nPages=Math.min(pdf.numPages, 30)
  for(let i=1;i<=nPages;i++){
    const pg=await pdf.getPage(i)
    const tc=await pg.getTextContent()
    const txt=tc.items.map(it=>it.str).join(' ')
    fullText+=`\n--- Página ${i} ---\n${txt}`
  }
  // primeira página como imagem (caso seja uma planta visual)
  let firstImg=null
  try{
    const pg=await pdf.getPage(1)
    const vp=pg.getViewport({scale:1.6})
    const cv=document.createElement('canvas'); cv.width=vp.width; cv.height=vp.height
    await pg.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise
    firstImg=cv.toDataURL('image/jpeg',0.82)
  }catch(e){ /* sem imagem */ }
  return { text:fullText.trim(), firstImg, numPages:pdf.numPages }
}

// Chama a IA (proxy /api/claude) pedindo JSON estruturado
export async function askClaudeJSON(text, imageB64, maxTokens=4000){
  const prompt=`Você é um extrator de dados de documentos da RARO Home (automação residencial).
Recebe o TEXTO de um PDF que pode ser uma PROPOSTA comercial ou um PROJETO EXECUTIVO.
Extraia os dados e devolva APENAS um JSON válido (sem comentários, sem markdown, sem texto antes/depois) com este formato exato:

{
  "client_name": "nome do cliente (ex: Eduardo & Regina)",
  "neighborhood": "bairro, cidade se houver",
  "code": "código da proposta/projeto se houver (ex: ER-2026), senão string vazia",
  "description": "uma linha descrevendo o projeto",
  "rooms": [
    { "name": "nome do cômodo", "items": [ {"name":"nome do equipamento","qty":1} ] }
  ]
}

Regras:
- Agrupe os equipamentos/pontos por cômodo em "rooms".
- "qty" é número inteiro (quantidade do item naquele cômodo).
- Se não houver cômodos claros, crie um único cômodo "Geral" com todos os itens.
- Não invente itens que não estão no documento.
- Responda SOMENTE o JSON.

TEXTO DO PDF:
${text.slice(0, 14000)}`

  const content=[]
  if(imageB64) content.push({type:'image',source:{type:'base64',media_type:'image/jpeg',data:imageB64.split(',').pop()}})
  content.push({type:'text',text:prompt})
  const payload=JSON.stringify({model:'claude-sonnet-4-5-20250929',max_tokens:maxTokens,clientStream:true,
    messages:[{role:'user',content}]})

  const res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:payload})
  if(!res.ok){ const t=await res.text(); throw new Error('API '+res.status+': '+t.slice(0,150)) }
  const ct=res.headers.get('content-type')||''
  let full=''
  if(ct.includes('application/json')){
    const data=await res.json(); full=data.content?.[0]?.text||''
  } else {
    const reader=res.body.getReader(); const dec=new TextDecoder(); let buf=''
    while(true){ const {done,value}=await reader.read(); if(done)break
      buf+=dec.decode(value,{stream:true}); const lines=buf.split('\n'); buf=lines.pop()||''
      for(const line of lines){ if(!line.startsWith('data:'))continue; const d=line.slice(5).trim()
        if(!d||d==='[DONE]')continue
        try{ const evt=JSON.parse(d); if(evt.type==='content_block_delta'&&evt.delta?.text)full+=evt.delta.text }catch(e){}
      }
    }
  }
  // limpa cercas de markdown e parseia
  let clean=full.trim().replace(/^```(json)?/i,'').replace(/```$/,'').trim()
  const s=clean.indexOf('{'), e=clean.lastIndexOf('}')
  if(s>=0&&e>s) clean=clean.slice(s,e+1)
  return JSON.parse(clean)
}

// Converte o JSON extraído num objeto de proposta pronto para saveProposal,
// com markers espalhados em grade por cômodo (para o editor de planta).
export function buildProposalFromExtract(data, catalog=[]){
  const rooms=Array.isArray(data.rooms)?data.rooms:[]
  // monta floors
  const floors=[{name:'Pavimento único', rooms: rooms.map(r=>({
    name:r.name||'Geral',
    items:(r.items||[]).map(it=>{
      const cat=catalog.find(c=>(c.name||'').toLowerCase()===(it.name||'').toLowerCase())
      return { name:it.name||'Item', code:cat?.code||'', qty:String(it.qty||1),
        cost_price:cat?.cost_price||0, sale_price:cat?.sale_price||0, category:cat?.category||'' }
    })
  }))}]

  // markers espalhados por cômodo (grade)
  const markers=[]; let n=1
  const cols=Math.ceil(Math.sqrt(rooms.length))||1
  const rws=Math.ceil(rooms.length/cols)||1
  rooms.forEach((room,ri)=>{
    const cx=ri%cols, cy=Math.floor(ri/cols)
    const cellW=92/cols, cellH=88/rws
    const baseX=4+cellW*cx, baseY=6+cellH*cy
    const flat=[]
    ;(room.items||[]).forEach(it=>{ const q=parseInt(it.qty)||1; for(let k=0;k<q;k++) flat.push(it) })
    const per=flat.length, icols=Math.ceil(Math.sqrt(per))||1
    flat.forEach((it,ii)=>{
      const ix=ii%icols, iy=Math.floor(ii/icols)
      const stepX=(cellW-6)/Math.max(1,icols), stepY=(cellH-10)/Math.max(1,Math.ceil(per/icols))
      const cat=catalog.find(c=>(c.name||'').toLowerCase()===(it.name||'').toLowerCase())
      markers.push({ uid:Date.now()+Math.random(), n:n++, id:'', code:cat?.code||'',
        name:it.name||'Item', room:room.name||'Geral', note:'',
        x:Math.min(96,Math.max(3,baseX+3+ix*stepX)), y:Math.min(94,Math.max(5,baseY+6+iy*stepY)) })
    })
  })

  return {
    client_name: data.client_name||'Cliente importado',
    neighborhood: data.neighborhood||'',
    code: data.code||'',
    description: data.description||'Importado de PDF',
    status:'draft', labor:0, valid_days:30,
    floors,
    planta_data:{ image:null, markers },
    exec_doc:null,
  }
}
