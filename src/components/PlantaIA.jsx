import { useState, useRef } from 'react'

// Automation rules per room type — maps Portuguese room names to equipment suggestions
const AUTOMATION_RULES = `
REGRAS DE AUTOMAÇÃO POR AMBIENTE (RARO Home):

CPD / Central de Automação (sempre incluir):
- Gateway Zigbee Matter Wi-Fi PoE (QAGPM2) — 1 unidade — obrigatório, é o hub central
- Gravador NVR 8CH 4K PoE (QASG8) — 1 unidade — se há câmeras
- Câmera Dome 5MP PoE (QACD5) — por área de câmera identificada

Sala de Estar / Living:
- Keypad Premium Zigbee 4x4 6 Botões (QAT44Z6B) — 1 por sala grande
- Hub IR Zigbee Matter (QAIRZM2) — 1, se tem TV/ar-condicionado
- Módulo Zigbee 2CH Long Range (QARZ2LR) — 1, se tem pontos de iluminação extras

Sala de Jantar:
- Keypad Premium Zigbee 3 Botões (QAT42Z3B) — 1 unidade

Cozinha:
- Keypad Premium Zigbee 2 Botões (QAT42Z2B) — 1 unidade

Gourmet / Área Gourmet / Churrasqueira:
- Keypad Premium Zigbee 3 Botões Preto (QAT42Z3B-PT) — 2 unidades
- Módulo Zigbee 2CH Long Range (QARZ2LR) — 1
- Hub IR Zigbee Matter (QAIRZM2) — 1

Suíte / Quarto Principal / Master:
- Keypad Premium Zigbee 3 Botões (QAT42Z3B) — 2 (cabeceira + entrada)
- Módulo Zigbee 2CH Long Range (QARZ2LR) — 2
- Hub IR Zigbee Matter (QAIRZM2) — 1

Suíte 2, 3, 4 / Quarto:
- Keypad Premium Zigbee 2 Botões (QAT42Z2B) — 1
- Módulo Zigbee 2CH Long Range (QARZ2LR) — 1
- Hub IR Zigbee Matter (QAIRZM2) — 1

WC / Banheiro:
- Keypad Premium Zigbee 2 Botões Preto (QAT42Z2B-PT) — 1

Corredor / Hall / Circulação:
- Keypad Premium Zigbee 1 Botão Preto (QAT42Z1B-PT) — 1

Garagem / Área de Serviço:
- Keypad Premium Zigbee 1 Botão (QAT42Z1B) — 1

Escritório / Home Office:
- Keypad Premium Zigbee 3 Botões (QAT42Z3B) — 1
- Hub IR Zigbee Matter (QAIRZM2) — 1

Área Externa / Varanda / Terraço:
- Keypad Premium Zigbee 2 Botões Preto (QAT42Z2B-PT) — 1
- Módulo Zigbee 2CH Long Range (QARZ2LR) — 1
`

const ICONS = {
  'CPD':'◉','Central':'◉','Sala':'◈','Living':'◈','Jantar':'◇','Cozinha':'◆',
  'Gourmet':'◆','Churrasqueira':'◆','Suíte':'◉','Quarto':'◉','Master':'◉',
  'WC':'○','Banheiro':'○','Lavabo':'○','Hall':'▷','Corredor':'▷','Circulação':'▷',
  'Garagem':'◈','Serviço':'◈','Escritório':'◈','Varanda':'◈','Terraço':'◈','Externo':'◈',
}

function getIcon(name) {
  for(const [k,v] of Object.entries(ICONS)) {
    if(name.toLowerCase().includes(k.toLowerCase())) return v
  }
  return '◈'
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

export default function PlantaIA({ catalog=[], onImport, onClose }) {
  const [step, setStep]         = useState('upload') // upload | analyzing | review
  const [imgData, setImgData]   = useState(null)
  const [imgMime, setImgMime]   = useState('image/jpeg')
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [editFloors, setEditFloors] = useState(null)
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if(!file) return
    setImgMime(file.type||'image/jpeg')
    const reader = new FileReader()
    reader.onload = ev => {
      setImgData(ev.target.result.split(',')[1]) // base64
      setStep('ready')
      setError('')
    }
    reader.readAsDataURL(file)
  }

  async function loadPdfPage(dataUrl) {
    // Load pdf.js from CDN and render first page to canvas
    return new Promise((resolve, reject) => {
      if (!window.pdfjsLib) {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
          renderPdf(dataUrl, resolve, reject)
        }
        script.onerror = () => reject(new Error('Falha ao carregar pdf.js'))
        document.head.appendChild(script)
      } else {
        renderPdf(dataUrl, resolve, reject)
      }
    })
  }

  function renderPdf(dataUrl, resolve, reject) {
    const base64 = dataUrl.split(',')[1]
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i)
    window.pdfjsLib.getDocument({data: bytes}).promise.then(pdf => {
      pdf.getPage(1).then(page => {
        const viewport = page.getViewport({scale: 2.0})
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        page.render({canvasContext: canvas.getContext('2d'), viewport}).promise.then(() => {
          resolve(canvas.toDataURL('image/jpeg', 0.92))
        }).catch(reject)
      }).catch(reject)
    }).catch(reject)
  }

  async function analyze() {
    if(!imgData) return
    setLoading(true); setError(''); setStep('analyzing')

    // Build catalog summary for context
    const catSummary = catalog.slice(0,60).map(c=>
      `${c.code}: ${c.name} — R$${c.sale_price} (${c.category})`
    ).join('\n')

    const systemPrompt = `Você é um especialista em automação residencial da RARO Home, empresa brasileira sediada no Rio de Janeiro que instala sistemas Zigbee/Matter/Tuya.

Seu trabalho: analisar plantas arquitetônicas e montar projetos de automação completos.

CATÁLOGO DISPONÍVEL (use APENAS estes códigos):
${catSummary}

${AUTOMATION_RULES}

ÍCONES POR TIPO DE AMBIENTE:
◉ = CPD, suíte, sala principal | ◈ = sala, gourmet, área | ◇ = jantar | ◆ = cozinha, área molhada | ○ = WC | ▷ = corredor

RESPONDA APENAS COM JSON VÁLIDO (sem markdown, sem texto fora do JSON):`

    const userPrompt = `Analise esta planta arquitetônica e crie o projeto de automação RARO Home.

Identifique:
1. Número de pavimentos
2. Todos os ambientes por pavimento
3. Tipo e quantidade de cada ambiente

Para cada ambiente sugira os equipamentos corretos do catálogo.

Retorne APENAS este JSON (sem comentários, sem markdown):
{
  "pavimentos": [
    {
      "nome": "Primeiro Pavimento",
      "comodos": [
        {
          "nome": "CPD / Central de Automação",
          "icone": "◉",
          "destaque": true,
          "pitch": "O cérebro que conecta e protege cada detalhe da sua casa.",
          "itens": [
            {"code": "QAGPM2", "qty": 1},
            {"code": "QASG8", "qty": 1}
          ]
        }
      ]
    }
  ],
  "observacoes": "Breve descrição do projeto"
}`

    try {
      // Use Vercel serverless proxy to avoid CORS
      // If PDF, render to image first
      let finalImgData = imgData
      let finalMime = imgMime
      if (imgMime === 'application/pdf') {
        try {
          const rendered = await loadPdfPage(`data:application/pdf;base64,${imgData}`)
          finalImgData = rendered.split(',')[1]
          finalMime = 'image/jpeg'
        } catch(e) {
          throw new Error('Erro ao renderizar PDF: ' + e.message)
        }
      }

      const payload = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: finalMime, data: finalImgData } },
            { type: 'text', text: userPrompt }
          ]
        }],
        system: systemPrompt
      }

      // Try Vercel proxy first; fall back to direct API (dev mode)
      let response = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      // If proxy not found (local dev or not deployed), show config instructions
      if(response.status === 404 || response.status === 405) {
        throw new Error('Proxy /api/claude não encontrado. Configure no Vercel: Settings → Environment Variables → ANTHROPIC_API_KEY')
      }

      let data
      try { data = await response.json() } catch(e) { throw new Error('Resposta inválida da API (status '+response.status+')') }

      if(!response.ok) {
        const errMsg = data?.error?.message || data?.error || JSON.stringify(data)
        throw new Error('API error ' + response.status + ': ' + errMsg)
      }
      if(data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error))

      const text = data.content?.[0]?.text || ''
      // Parse JSON from response
      let jsonStr = text.trim()
      if(jsonStr.includes('```')) jsonStr = jsonStr.replace(/```json?\n?/g,'').replace(/```/g,'')
      const parsed = JSON.parse(jsonStr)

      // Convert to ProposalBuilder floor/room format
      const floors = (parsed.pavimentos||[]).map((pav, fi) => {
        const ordinals = ['Primeiro','Segundo','Terceiro','Quarto','Quinto']
        const floorName = pav.nome || `${ordinals[fi]||fi+1+'º'} Pavimento`
        return {
          id: Date.now() + fi,
          name: floorName,
          rooms: (pav.comodos||[]).map((com, ri) => {
            const items = (com.itens||[]).map(it => {
              const catItem = catalog.find(c => c.code === it.code)
              if(!catItem) return null
              return {
                name: catItem.name,
                code: catItem.code,
                qty: String(it.qty||1),
                cost_price: catItem.cost_price||0,
                sale_price: catItem.sale_price||0,
                category: catItem.category||'',
                pitch: catItem.pitch||'',
              }
            }).filter(Boolean)
            const totalPrice = items.reduce((s,i) => s+(i.sale_price||0)*(parseInt(i.qty)||1), 0)
            return {
              id: Date.now() + fi*100 + ri,
              name: com.nome,
              icon: com.icone || getIcon(com.nome),
              highlight: com.destaque||false,
              pitch: com.pitch||'',
              items,
              price: String(totalPrice),
            }
          })
        }
      })

      setResult({ floors, observacoes: parsed.observacoes||'' })
      setEditFloors(floors)
      setStep('review')
    } catch(err) {
      console.error(err)
      setError('Erro ao analisar: ' + err.message)
      setStep('ready')
    }
    setLoading(false)
  }

  function toggleRoom(fi, ri) {
    setEditFloors(prev => prev.map((f,fIdx) => fIdx!==fi ? f : {
      ...f,
      rooms: f.rooms.filter((_,rIdx) => rIdx!==ri)
    }))
  }

  const totalItems = (editFloors||[]).reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(r.items||[]).length,s),0)
  const totalValue = (editFloors||[]).reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+parseFloat(r.price||0),s),0)

  return (
    <div className="modal-overlay">
      <div className="modal" style={{width:'min(98vw,700px)',maxHeight:'90vh',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>
        
        {/* Header */}
        <div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
          <div>
            <div style={{fontSize:15,fontWeight:600,display:'flex',alignItems:'center',gap:8}}>
              <div style={{background:'var(--accent)',borderRadius:6,width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-brain" style={{color:'#fff',fontSize:14}} aria-hidden/>
              </div>
              Análise de Planta com IA
            </div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:2,marginLeft:36}}>
              Faça upload da planta e a IA monta o projeto de automação
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'20px'}}>

          {/* Step: Upload */}
          {(step==='upload'||step==='ready') && (
            <div>
              <div
                onClick={()=>fileRef.current?.click()}
                style={{border:'2px dashed var(--border)',borderRadius:10,padding:'32px 20px',textAlign:'center',cursor:'pointer',
                  background:imgData?'rgba(14,165,233,0.04)':'var(--surf)',transition:'all .2s',marginBottom:16}}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f){const dt=new DataTransfer();dt.items.add(f);fileRef.current.files=dt.files;handleFile({target:{files:[f]}})}}}>
                <input ref={fileRef} type="file" accept="image/*,application/pdf,.pdf" style={{display:'none'}} onChange={handleFile}/>
                {imgData
                  ? <><i className="ti ti-check" style={{fontSize:28,color:'var(--green)',display:'block',marginBottom:8}} aria-hidden/>
                      <div style={{fontWeight:500,color:'var(--green)'}}>Planta carregada!</div>
                      <div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>Clique para trocar</div></>
                  : <><i className="ti ti-upload" style={{fontSize:32,color:'var(--accent)',display:'block',marginBottom:10,opacity:0.6}} aria-hidden/>
                      <div style={{fontWeight:500,fontSize:14,marginBottom:4}}>Clique ou arraste a planta aqui</div>
                      <div style={{fontSize:11,color:'var(--text3)'}}>Aceita JPG, PNG, PDF (renderiza automaticamente)</div></>}
              </div>

              {imgData && (
                <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                  <button className="btn" onClick={()=>{setImgData(null);setStep('upload')}}>
                    <i className="ti ti-x" aria-hidden/>Remover
                  </button>
                  <button className="btn primary" style={{gap:8}} onClick={analyze}>
                    <i className="ti ti-brain" aria-hidden/>Analisar planta com IA
                  </button>
                </div>
              )}

              {error && (
                <div style={{marginTop:12,padding:'10px 14px',background:'rgba(220,38,38,0.08)',border:'1px solid var(--red)',borderRadius:6,fontSize:12,color:'var(--red)'}}>
                  <i className="ti ti-alert-circle" style={{marginRight:4}} aria-hidden/>
                  <b>Erro:</b> {error}
                  {error.includes('ANTHROPIC_API_KEY') && (
                    <div style={{marginTop:8,fontSize:11,lineHeight:1.8,color:'var(--red)'}}>
                      <b>Como configurar no Vercel:</b><br/>
                      1. vercel.com → projeto raro-home → Settings → Environment Variables<br/>
                      2. Adicione: <code style={{background:'rgba(220,38,38,0.15)',padding:'1px 5px',borderRadius:2,fontFamily:'monospace'}}>ANTHROPIC_API_KEY</code> = sk-ant-...<br/>
                      3. Redeploy (Deployments → ⋯ → Redeploy)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step: Analyzing */}
          {step==='analyzing' && (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:36,marginBottom:16,animation:'spin 2s linear infinite',display:'inline-block'}}>
                <i className="ti ti-brain" style={{color:'var(--accent)'}} aria-hidden/>
              </div>
              <div style={{fontSize:15,fontWeight:500,marginBottom:8}}>Analisando a planta...</div>
              <div style={{fontSize:12,color:'var(--text3)',maxWidth:320,margin:'0 auto',lineHeight:1.6}}>
                A IA está identificando os ambientes, dimensionando a automação e selecionando os equipamentos do catálogo RARO Home.
              </div>
              <div style={{marginTop:20,display:'flex',gap:6,justifyContent:'center'}}>
                {['Identificando ambientes','Dimensionando equipamentos','Calculando valores'].map((t,i)=>(
                  <div key={i} style={{fontSize:10,color:'var(--text3)',background:'var(--surf)',padding:'4px 10px',borderRadius:12,border:'1px solid var(--border)'}}>{t}</div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step==='review' && editFloors && (
            <div>
              {result?.observacoes && (
                <div style={{background:'rgba(14,165,233,0.06)',border:'1px solid rgba(14,165,233,0.2)',borderRadius:6,padding:'10px 14px',marginBottom:16,fontSize:12,color:'var(--text2)'}}>
                  <i className="ti ti-info-circle" style={{marginRight:4,color:'var(--accent)'}} aria-hidden/>
                  <b>Observações da IA:</b> {result.observacoes}
                </div>
              )}

              <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,alignItems:'center'}}>
                <div style={{fontSize:12,color:'var(--text3)'}}>
                  {editFloors.length} pavimento{editFloors.length>1?'s':''} · {editFloors.reduce((s,f)=>s+(f.rooms||[]).length,0)} cômodos · {totalItems} equipamentos
                </div>
                <div style={{fontSize:14,fontWeight:700,color:'var(--accent)'}}>
                  R$ {Math.round(totalValue).toLocaleString('pt-BR')}
                </div>
              </div>

              {editFloors.map((floor, fi) => (
                <div key={fi} style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:1,marginBottom:8,
                    borderBottom:'2px solid var(--accent)',paddingBottom:5,display:'flex',alignItems:'center',gap:8}}>
                    <div style={{background:'var(--accent)',borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:11,fontWeight:800}}>
                      {fi+1}º
                    </div>
                    {floor.name}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {(floor.rooms||[]).map((room, ri) => (
                      <div key={ri} style={{background:'var(--surf)',borderRadius:6,padding:'10px 12px',border:'1px solid var(--border)',borderLeft:`3px solid ${room.highlight?'var(--amber)':'var(--accent)'}`}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                          <div style={{fontWeight:500,fontSize:12}}>{room.icon} {room.name}</div>
                          <button onClick={()=>toggleRoom(fi,ri)}
                            style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',fontSize:14,padding:'0 0 0 6px',lineHeight:1}}
                            title="Remover cômodo">×</button>
                        </div>
                        <div style={{fontSize:10,color:'var(--text3)',marginBottom:4}}>
                          {(room.items||[]).map(it=>`${it.qty}× ${it.code}`).join(' · ')||'Sem itens'}
                        </div>
                        <div style={{fontSize:11,fontWeight:600,color:'var(--accent)'}}>
                          R$ {Math.round(parseFloat(room.price||0)).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{background:'var(--surf)',borderRadius:6,padding:'10px 14px',marginTop:8,fontSize:11,color:'var(--text3)'}}>
                <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden/>
                Você pode editar, adicionar ou remover itens depois de importar para o orçamento.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step==='review' && (
          <div style={{padding:'12px 20px',borderTop:'1px solid var(--border)',display:'flex',gap:10,justifyContent:'flex-end',flexShrink:0,background:'var(--bg)'}}>
            <button className="btn" onClick={()=>{setStep('ready');setResult(null);setEditFloors(null)}}>
              <i className="ti ti-arrow-left" aria-hidden/>Reanalisar
            </button>
            <button className="btn primary" style={{gap:8}}
              onClick={()=>{ onImport(editFloors); onClose() }}>
              <i className="ti ti-check" aria-hidden/>
              Importar para o orçamento ({editFloors.reduce((s,f)=>s+(f.rooms||[]).length,0)} cômodos)
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
