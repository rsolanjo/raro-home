import Contract from './Contract.jsx'

function ContractSendModal({ proposal, clients, onClose }) {
  const [targets, setTargets] = useState({})
  const [custom, setCustom]   = useState('')
  const [email, setEmail]     = useState('')
  const cl = clients?.find(x=>x.id===Number(proposal?.client_id))
  const floors = (() => {
    const f = proposal?.floors
    if(!f) return []
    if(typeof f==='string'){try{return JSON.parse(f)}catch{return []}}
    return Array.isArray(f)?f:[]
  })()
  const total = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)+(Number(proposal?.labor)||0)
  const totalFmt = `R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`
  const norm = p => p.replace(/\D/g,'').replace(/^0055|^55/,'').replace(/^(?!55)/,'55')
  const msg = encodeURIComponent(`${cl?.name1||proposal?.client_name}, o contrato do seu projeto está pronto para assinatura. 📄\n\n📋 *${proposal?.code}* · 💰 *${totalFmt}*\n\nAssinatura e dúvidas: só chamar!\n— Rogério · RARO Home · (21) 98170-9009`)
  if(!proposal) return null

  // Build phone options from client — always show even if empty
  const phoneOptions = [
    cl?.phone1 && {key:'p1', label:`${cl.name1||'Cliente 1'}`, phone:cl.phone1, hint:'cadastrado'},
    cl?.phone2 && {key:'p2', label:`${cl.name2||'Cliente 2'}`, phone:cl.phone2, hint:'cadastrado'},
  ].filter(Boolean)

  return (
    <div className="modal-overlay">
      <div className="modal" style={{width:480}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="ti ti-file-contract" style={{marginRight:6,color:'#059669'}} aria-hidden/>
            Enviar Contrato
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Proposal info */}
        <div style={{marginBottom:14,padding:'10px 12px',background:'var(--surf)',borderRadius:6,fontSize:12,color:'var(--text2)',lineHeight:1.8}}>
          <div style={{display:'flex',justifyContent:'space-between'}}>
            <div>
              Contrato <b style={{color:'var(--accent)',fontFamily:'monospace'}}>{proposal.code}</b>
              {' · '}<b>{proposal.client_name}</b>
            </div>
            <b style={{color:'var(--accent)'}}>{totalFmt}</b>
          </div>
        </div>

        {/* Info */}
        <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--amber)'}}>
          <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden/>
          Baixe o contrato antes de enviar e anexe na conversa do WhatsApp.
        </div>

        {/* WhatsApp from client */}
        <div className="flabel" style={{marginBottom:8}}>
          <i className="ti ti-brand-whatsapp" style={{color:'#16A34A',marginRight:4}} aria-hidden/>
          WhatsApp — contatos do cliente:
        </div>
        {phoneOptions.length===0 && (
          <div style={{fontSize:12,color:'var(--text3)',marginBottom:10,padding:'8px 12px',background:'var(--surf)',borderRadius:6}}>
            <i className="ti ti-alert-circle" style={{marginRight:4,color:'var(--amber)'}} aria-hidden/>
            Nenhum telefone cadastrado para este cliente — use o campo abaixo.
          </div>
        )}
        {phoneOptions.map(({key,label,phone,hint})=>(
          <label key={key} style={{
            display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
            border:'1px solid',borderRadius:6,cursor:'pointer',marginBottom:8,
            background:targets[key]?'rgba(22,163,74,0.06)':'var(--bg)',
            borderColor:targets[key]?'#16A34A':'var(--border)'
          }}>
            <input type="checkbox" checked={!!targets[key]}
              onChange={e=>setTargets(t=>({...t,[key]:e.target.checked}))}
              style={{width:16,height:16,accentColor:'#16A34A',cursor:'pointer'}}/>
            <i className="ti ti-brand-whatsapp" style={{fontSize:18,color:'#16A34A',flexShrink:0}} aria-hidden/>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:13}}>{label}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>{phone}</div>
            </div>
            <span style={{fontSize:10,color:'var(--green)',background:'rgba(22,163,74,0.1)',padding:'2px 6px',borderRadius:10}}>{hint}</span>
          </label>
        ))}

        {/* Manual phone */}
        <div style={{marginBottom:12,padding:'10px 12px',border:'1px dashed var(--border)',borderRadius:6}}>
          <div className="flabel" style={{marginBottom:6}}>Adicionar outro número manualmente:</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input value={custom} onChange={e=>setCustom(e.target.value)}
              placeholder="(21) 99999-9999" style={{flex:1,fontSize:13}}
              onKeyDown={e=>{ if(e.key==='Enter'&&custom){ setTargets(t=>({...t,custom:true})) }}}/>
            <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0}}>
              <input type="checkbox"
                checked={!!targets.custom&&!!custom}
                onChange={e=>setTargets(t=>({...t,custom:e.target.checked}))}
                disabled={!custom}
                style={{accentColor:'#16A34A',width:15,height:15}}/>
              <span>Incluir</span>
            </label>
          </div>
        </div>

        {/* Email */}
        <div style={{marginBottom:14}}>
          <div className="flabel" style={{marginBottom:6}}>
            <i className="ti ti-mail" style={{marginRight:4}} aria-hidden/>E-mail:
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <input
              value={email||''}
              onChange={e=>setEmail(e.target.value)}
              placeholder={cl?.email||'email@exemplo.com'}
              type="email"
              style={{flex:1,fontSize:13}}/>
            {(email||cl?.email) && (
              <button className="btn" style={{fontSize:11,color:'var(--accent)',borderColor:'var(--accent)',flexShrink:0}}
                onClick={()=>{
                  const addr = email||cl?.email
                  const sub=encodeURIComponent(`Contrato RARO Home — ${proposal.code}`)
                  const body=encodeURIComponent(`Olá ${cl?.name1||proposal.client_name}!\n\nSegue o contrato do projeto RARO Home.\nO PDF está em anexo para assinatura.\nDúvidas: (21) 98170-9009\n— Rogério | RARO Home`)
                  window.open(`mailto:${addr}?subject=${sub}&body=${body}`)
                }}>
                <i className="ti ti-mail" aria-hidden/>Abrir e-mail
              </button>
            )}
          </div>
          {cl?.email&&!email&&<div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>E-mail cadastrado: {cl.email}</div>}
        </div>

        {/* Action buttons */}
        <div style={{borderTop:'1px solid var(--border)',paddingTop:12,display:'flex',flexDirection:'column',gap:8}}>
          <button className="btn primary"
            style={{background:'#16A34A',borderColor:'#16A34A',gap:8,justifyContent:'center'}}
            disabled={!Object.values(targets).some(Boolean)}
            title={Object.values(targets).some(Boolean)?'Enviar para os selecionados':'Selecione ao menos um número'}
            onClick={()=>{
              if(targets.p1&&cl?.phone1) window.open(`https://wa.me/${norm(cl.phone1)}?text=${msg}`,'_blank')
              if(targets.p2&&cl?.phone2) window.open(`https://wa.me/${norm(cl.phone2)}?text=${msg}`,'_blank')
              if(targets.custom&&custom) window.open(`https://wa.me/${norm(custom)}?text=${msg}`,'_blank')
              onClose()
            }}>
            <i className="ti ti-brand-whatsapp" aria-hidden/>
            Enviar contrato via WhatsApp {Object.values(targets).filter(Boolean).length>0&&`(${Object.values(targets).filter(Boolean).length})`}
          </button>
          <button className="btn" style={{gap:8,justifyContent:'center'}} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal unificado: enviar Proposta / Projeto Executivo / Contrato ──────────
function EnviarDocumentoModal({ proposal, clients, currentUser, onMarkSent, onClose }) {
  const [docType, setDocType] = useState('proposta')   // proposta | executivo | contrato
  const [custom, setCustom]   = useState('')
  const [useCustom, setUseCustom] = useState(false)
  const [email, setEmail]     = useState('')
  const cl = clients?.find(x=>x.id===Number(proposal?.client_id))
  if(!proposal) return null

  const floors = (() => {
    const f = proposal?.floors
    if(!f) return []
    if(typeof f==='string'){try{return JSON.parse(f)}catch{return []}}
    return Array.isArray(f)?f:[]
  })()
  const total = floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(Number(r.price)||0),s),0)+(Number(proposal?.labor)||0)
  const totalFmt = total>0?`R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'a confirmar'
  const norm = p => (p||'').replace(/\D/g,'').replace(/^0055|^55/,'').replace(/^(?!55)/,'55')
  const nome = cl?.name1 || proposal?.client_name || 'Cliente'

  const hasExec = !!proposal?.exec_doc
  const DOCS = [
    {key:'proposta',  label:'Proposta',          icon:'ti-file-invoice',  color:'var(--accent)', disabled:false },
    {key:'executivo', label:'Projeto Executivo', icon:'ti-file-text',     color:'#0369A1',       disabled:!hasExec, hint:hasExec?'':'Gere o executivo primeiro (ícone do cérebro)' },
    {key:'contrato',  label:'Termo de Contrato', icon:'ti-license',       color:'#059669',       disabled:false },
  ]

  // Mensagens de WhatsApp por tipo de documento
  const msgFor = {
    proposta:  `Ola ${nome}! Segue sua proposta RARO Home: ${proposal.code||'#'+proposal.id} - ${totalFmt}. O PDF foi enviado em anexo. Qualquer duvida estou a disposicao! - Rogerio | RARO Home (21) 98170-9009`,
    executivo: `Ola ${nome}! Segue o Projeto Executivo de Automacao RARO Home: ${proposal.code||'#'+proposal.id}. O documento tecnico (planta de pontos, cabeamento e lista de pecas) foi enviado em anexo. - Rogerio | RARO Home (21) 98170-9009`,
    contrato:  `Ola ${nome}! Segue o contrato do seu projeto RARO Home: ${proposal.code||'#'+proposal.id} - ${totalFmt}. O PDF esta em anexo para assinatura. Qualquer duvida estou a disposicao! - Rogerio | RARO Home (21) 98170-9009`,
  }
  const subjectFor = {
    proposta:  `Proposta RARO Home — ${proposal.code||''}`,
    executivo: `Projeto Executivo RARO Home — ${proposal.code||''}`,
    contrato:  `Contrato RARO Home — ${proposal.code||''}`,
  }

  // Baixa um HTML como arquivo
  function downloadHtml(html, filename){
    try{
      const blob=new Blob([html],{type:'text/html;charset=utf-8'})
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a')
      a.href=url; a.download=filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(()=>URL.revokeObjectURL(url),5000)
    }catch(e){ console.error('download:',e); alert('Erro ao baixar: '+e.message) }
  }

  const safe = s => (s||'').replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,'-')
  const baseName = `${safe(proposal.code||proposal.id)}-${safe(proposal.client_name||'cliente')}`

  // Gera/baixa o documento escolhido (baixa arquivo .html que vira PDF no navegador)
  function baixarDoc(typeOverride){
    const type = typeOverride || docType
    if(type==='proposta'){
      const pWithPhones = { ...proposal, client_name: cl?`${cl.name1}${cl.name2?' & '+cl.name2:''}`:proposal.client_name,
        client_phone1: cl?.phone1||'', client_phone2: cl?.phone2||'', itemFontSize:7,
        floors, _download:true }
      openProposalPDF(pWithPhones, false)
    } else if(type==='executivo'){
      if(!proposal.exec_doc){ alert('Este orçamento não tem Projeto Executivo gerado.'); return }
      openHtmlDoc(wrapExecDoc(proposal.exec_doc, proposal.client_name, proposal.code),
        `executivo-${baseName}.html`)
    } else {
      openHtmlDoc(buildContract(proposal, cl), `contrato-${baseName}.html`)
    }
  }

  function enviarWhatsApp(phone){
    const n=norm(phone); if(!n) return
    // abre o WhatsApp PRIMEIRO (dentro do gesto, não é bloqueado), depois gera o doc
    window.open(`https://wa.me/${n}?text=${encodeURIComponent(msgFor[docType])}`,'_blank')
    setTimeout(baixarDoc, 400)
  }

  const phoneOptions = [
    cl?.phone1 && {key:'p1', label:cl.name1||'Cliente 1', phone:cl.phone1},
    cl?.phone2 && {key:'p2', label:cl.name2||'Cliente 2', phone:cl.phone2},
  ].filter(Boolean)

  return (
    <div className="modal-overlay">
      <div className="modal" style={{width:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="ti ti-brand-whatsapp" style={{marginRight:6,color:'#16A34A'}} aria-hidden/>
            Enviar documento
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Info da proposta */}
        <div style={{marginBottom:14,padding:'10px 12px',background:'var(--surf)',borderRadius:6,fontSize:12,color:'var(--text2)',lineHeight:1.8}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div>Proposta <b style={{color:'var(--accent)',fontFamily:'monospace'}}>{proposal.code||'#'+proposal.id}</b>{' · '}<b>{proposal.client_name}</b></div>
            <b style={{color:'var(--accent)'}}>{totalFmt}</b>
          </div>
        </div>

        {/* Seletor de documento */}
        <div className="flabel" style={{marginBottom:8}}><i className="ti ti-files" style={{marginRight:4}} aria-hidden/>Qual documento enviar?</div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          {DOCS.map(d=>(
            <button key={d.key} disabled={d.disabled} title={d.hint||(docType===d.key?'Duplo clique para baixar':'')}
              onClick={()=>setDocType(d.key)}
              onDoubleClick={()=>{ if(!d.disabled){ setDocType(d.key); baixarDoc(d.key) } }}
              style={{flex:1,padding:'12px 8px',borderRadius:8,cursor:d.disabled?'not-allowed':'pointer',
                border:'2px solid', borderColor:docType===d.key?d.color:'var(--border)',
                background:docType===d.key?`color-mix(in srgb, ${d.color} 10%, transparent)`:'var(--bg)',
                opacity:d.disabled?0.4:1, display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                color:docType===d.key?d.color:'var(--text2)',fontFamily:'inherit',transition:'all .15s',
                position:'relative'}}>
              <i className={`ti ${d.icon}`} style={{fontSize:22}} aria-hidden/>
              <span style={{fontSize:11,fontWeight:600,textAlign:'center',lineHeight:1.2}}>{d.label}</span>
              {docType===d.key && !d.disabled && <span style={{fontSize:9,opacity:0.6,position:'absolute',bottom:5}}>2× clique = baixar</span>}
            </button>
          ))}
        </div>
        {docType==='executivo' && !hasExec && (
          <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--amber)'}}>
            <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden/>
            Este orçamento ainda não tem Projeto Executivo. Gere primeiro no ícone do cérebro.
          </div>
        )}

        <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:6,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--amber)'}}>
          <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden/>
          <b>Clique 2×</b> no documento para gerar o PDF. O browser abre o diálogo "Salvar como PDF" automaticamente.
        </div>

        {/* WhatsApp — contatos do cliente */}
        <div className="flabel" style={{marginBottom:8}}>
          <i className="ti ti-brand-whatsapp" style={{color:'#16A34A',marginRight:4}} aria-hidden/>
          WhatsApp — selecione para quem enviar:
        </div>
        {phoneOptions.length===0 && (
          <div style={{fontSize:12,color:'var(--text3)',marginBottom:10,padding:'8px 12px',background:'var(--surf)',borderRadius:6}}>
            <i className="ti ti-alert-circle" style={{marginRight:4,color:'var(--amber)'}} aria-hidden/>
            Nenhum telefone cadastrado para este cliente.
          </div>
        )}
        {phoneOptions.map(({key,label,phone})=>(
          <button key={key} onClick={()=>enviarWhatsApp(phone)}
            style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',
              border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',marginBottom:8,
              background:'var(--bg)',color:'var(--text)',fontFamily:'inherit',textAlign:'left'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(22,163,74,0.06)'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--bg)'}>
            <i className="ti ti-brand-whatsapp" style={{fontSize:18,color:'#16A34A',flexShrink:0}} aria-hidden/>
            <div style={{flex:1}}>
              <div style={{fontWeight:500,fontSize:13}}>{label}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>{phone}</div>
            </div>
            <i className="ti ti-send" style={{color:'#16A34A'}} aria-hidden/>
          </button>
        ))}

        {/* Outro número */}
        <div className="flabel" style={{margin:'4px 0 6px'}}>Outro número de WhatsApp:</div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:14}}>
          <input value={custom} onChange={e=>setCustom(e.target.value)} placeholder="(21) 99999-9999"
            style={{flex:1,fontSize:13}}/>
          <button className="btn" disabled={!custom} style={{fontSize:12,color:'#16A34A',borderColor:'#16A34A',flexShrink:0,opacity:custom?1:0.4}}
            onClick={()=>custom&&enviarWhatsApp(custom)}>
            <i className="ti ti-send" aria-hidden/>Enviar
          </button>
        </div>

        {/* E-mail */}
        <div className="flabel" style={{marginBottom:6}}><i className="ti ti-mail" style={{marginRight:4}} aria-hidden/>E-mail:</div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:16}}>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder={cl?.email||'email@exemplo.com'} type="email" style={{flex:1,fontSize:13}}/>
          <button className="btn" disabled={!(email||cl?.email)} style={{fontSize:12,color:'var(--accent)',borderColor:'var(--accent)',flexShrink:0,opacity:(email||cl?.email)?1:0.4}}
            onClick={()=>{
              baixarDoc()
              const addr=email||cl?.email
              const body=`Olá ${nome}!\n\nSegue o documento do seu projeto RARO Home (${proposal.code||''}).\nO PDF está em anexo.\nDúvidas: (21) 98170-9009\n— Rogério | RARO Home`
              window.open(`mailto:${addr}?subject=${encodeURIComponent(subjectFor[docType])}&body=${encodeURIComponent(body)}`)
            }}>
            <i className="ti ti-mail" aria-hidden/>Abrir e-mail
          </button>
        </div>

        {/* Ações finais */}
        <div style={{borderTop:'1px solid var(--border)',paddingTop:12,display:'flex',flexDirection:'column',gap:8}}>
          {onMarkSent && proposal.status!=='sent' && proposal.status!=='approved' && (
            <button className="btn" style={{justifyContent:'center',gap:8}}
              onClick={async ()=>{ await onMarkSent(proposal); onClose() }}>
              <i className="ti ti-check" aria-hidden/>Marcar como enviado (sem abrir WA)
            </button>
          )}
          <button className="btn" style={{justifyContent:'center'}} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: importar Proposta / Projeto Executivo a partir de um PDF ──────────
function ImportarPdfModal({ catalog, currentUser, onDone, onClose }) {
  const [stage, setStage] = useState('pick')  // pick | working | review | error
  const [fileName, setFileName] = useState('')
  const [progress, setProgress] = useState('')
  const [extracted, setExtracted] = useState(null)  // proposta montada
  const [errMsg, setErrMsg] = useState('')
  const fileRef = useRef()

  async function handleFile(e){
    const f=e.target.files?.[0]; if(!f) return
    if(f.type!=='application/pdf'){ setErrMsg('Envie um arquivo PDF.'); setStage('error'); return }
    setFileName(f.name); setStage('working'); setErrMsg('')
    try{
      setProgress('Lendo o PDF…')
      const b64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(',').pop()); r.onerror=rej; r.readAsDataURL(f) })
      const { text, firstImg, numPages } = await extractPdf(b64)
      setProgress(`Analisando ${numPages} página(s) com a IA…`)
      const data = await askClaudeJSON(text, firstImg)
      setProgress('Montando o orçamento…')
      const prop = buildProposalFromExtract(data, catalog)
      setExtracted(prop)
      setStage('review')
    }catch(err){
      console.error('import pdf:', err)
      setErrMsg(err.message||'Falha ao importar.'); setStage('error')
    }
  }

  async function confirmImport(){
    setStage('working'); setProgress('Salvando…')
    try{
      const saved = await saveProposal({ ...extracted })
      if(!saved) throw new Error('Supabase não retornou o registro salvo')
      try{ await auditedSave('orçamentos','pdf_import',saved,currentUser?.name,null) }catch(e){}
      onDone()
    }catch(err){ console.error(err); setErrMsg(err.message); setStage('error') }
  }

  const totalItems = extracted ? extracted.floors[0].rooms.reduce((s,r)=>s+r.items.length,0) : 0

  return (
    <div className="modal-overlay">
      <div className="modal" style={{width:520}} onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title"><i className="ti ti-file-import" style={{marginRight:6,color:'var(--accent)'}} aria-hidden/>Importar de PDF</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {stage==='pick' && <>
          <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:14}}>
            Envie um <b>Projeto Executivo</b> ou uma <b>Proposta</b> em PDF. A IA lê o documento, identifica o cliente e os equipamentos por cômodo, e cria um novo orçamento (como rascunho) que você pode editar depois.
          </div>
          <input ref={fileRef} type="file" accept="application/pdf" style={{display:'none'}} onChange={handleFile}/>
          <button className="btn primary" style={{width:'100%',justifyContent:'center',gap:8,padding:'14px'}} onClick={()=>fileRef.current?.click()}>
            <i className="ti ti-upload" aria-hidden/>Escolher PDF…
          </button>
          <div style={{fontSize:11,color:'var(--text3)',marginTop:10,textAlign:'center'}}>
            A extração usa IA e pode levar alguns segundos. Confira os dados antes de salvar.
          </div>
        </>}

        {stage==='working' && (
          <div style={{padding:'30px 10px',textAlign:'center'}}>
            <i className="ti ti-loader-2" style={{fontSize:32,color:'var(--accent)',animation:'spin 1s linear infinite'}} aria-hidden/>
            <div style={{marginTop:14,fontSize:13,color:'var(--text2)'}}>{progress}</div>
            {fileName && <div style={{marginTop:6,fontSize:11,color:'var(--text3)'}}>{fileName}</div>}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {stage==='review' && extracted && <>
          <div style={{background:'rgba(22,163,74,0.08)',border:'1px solid #16A34A',borderRadius:6,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#16A34A'}}>
            <i className="ti ti-circle-check" style={{marginRight:4}} aria-hidden/>Dados extraídos — confira abaixo.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            <Field label="Cliente"><input value={extracted.client_name} onChange={e=>setExtracted(x=>({...x,client_name:e.target.value}))} style={{width:'100%',fontSize:13}}/></Field>
            <Field label="Código"><input value={extracted.code} onChange={e=>setExtracted(x=>({...x,code:e.target.value}))} placeholder="opcional" style={{width:'100%',fontSize:13}}/></Field>
            <Field label="Bairro / Cidade"><input value={extracted.neighborhood} onChange={e=>setExtracted(x=>({...x,neighborhood:e.target.value}))} style={{width:'100%',fontSize:13}}/></Field>
            <Field label="Descrição"><input value={extracted.description} onChange={e=>setExtracted(x=>({...x,description:e.target.value}))} style={{width:'100%',fontSize:13}}/></Field>
          </div>
          <div style={{fontSize:12,color:'var(--text2)',marginBottom:8}}>
            <b>{extracted.floors[0].rooms.length}</b> cômodo(s) · <b>{totalItems}</b> item(ns) detectado(s):
          </div>
          <div style={{maxHeight:180,overflowY:'auto',border:'1px solid var(--border)',borderRadius:6,padding:'8px 10px',marginBottom:14}}>
            {extracted.floors[0].rooms.map((r,i)=>(
              <div key={i} style={{marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--accent)'}}>{r.name} <span style={{color:'var(--text3)',fontWeight:400}}>({r.items.length})</span></div>
                <div style={{fontSize:11,color:'var(--text2)',paddingLeft:8}}>{r.items.map(it=>`${it.name}${(parseInt(it.qty)||1)>1?' ×'+it.qty:''}`).join(' · ')}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn" style={{flex:1,justifyContent:'center'}} onClick={()=>setStage('pick')}>Trocar PDF</button>
            <button className="btn primary" style={{flex:2,justifyContent:'center',gap:8}} onClick={confirmImport}>
              <i className="ti ti-check" aria-hidden/>Criar orçamento
            </button>
          </div>
        </>}

        {stage==='error' && <>
          <div style={{background:'rgba(220,38,38,0.08)',border:'1px solid #DC2626',borderRadius:6,padding:'10px 12px',marginBottom:14,fontSize:12,color:'#DC2626'}}>
            <i className="ti ti-alert-circle" style={{marginRight:4}} aria-hidden/>{errMsg}
          </div>
          <button className="btn primary" style={{width:'100%',justifyContent:'center'}} onClick={()=>setStage('pick')}>Tentar outro PDF</button>
        </>}
      </div>
    </div>
  )
}
function Field({label, children}){ return <div><div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',marginBottom:3}}>{label}</div>{children}</div> }

import React, { useState, useRef, useEffect } from 'react'
import { saveProposal, deleteProposal, cancelProposal, getProposals, auditedSave, saveProject, getProjects, verifyPIN, syncProjectFromProposal } from '../db/supabase.js'
import { extractPdf, askClaudeJSON, buildProposalFromExtract } from './importPdf.js'
import { openProposalPDF } from './proposalPDF.js'
import { buildContract } from './Contract.jsx'
import { openHtmlDoc, downloadHtmlDoc, wrapExecDoc, safeFileName } from './openDoc.js'

const STATUS = {
  draft:    { label:'Rascunho',   cls:'b-gray' },
  sent:     { label:'Enviado',    cls:'b-blue' },
  approved: { label:'Aprovado',   cls:'b-green' },
  rejected: { label:'Recusado',   cls:'b-red' },
  cancelled:{ label:'Cancelado',  cls:'b-gray' },
}
const STATUS_NOTE = {
  sent:     '📦 Itens do estoque serão reservados',
  approved: '✅ Itens serão baixados definitivamente do estoque',
  rejected: '🔓 Reservas serão liberadas',
  draft:    '🔓 Reservas serão liberadas',
}

export default function Proposals({ proposals, onRefresh, onEdit, onNew, onNewExec, onGenerateExec, currentUser, onViewPDF, clients=[], catalog=[] }) {
  const [hideCancelled, setHideCancelled] = useState(true)

  const cancelledCount = proposals.filter(p=>p.status==='cancelled').length

  async function purgeCancelled(){
    const pwd = window.prompt('Para APAGAR definitivamente os orçamentos cancelados, digite a senha especial:')
    if(pwd===null) return
    if(pwd!=='456'){ alert('Senha incorreta.'); return }
    const cancelled = proposals.filter(p=>p.status==='cancelled')
    if(!cancelled.length){ alert('Não há orçamentos cancelados.'); return }
    if(!window.confirm(`Apagar definitivamente ${cancelled.length} orçamento(s) cancelado(s)? Esta ação não pode ser desfeita.`)) return
    try{
      const { deleteProposal } = await import('../db/supabase.js')
      for(const p of cancelled){ await deleteProposal(p.id) }
      alert('Orçamentos cancelados apagados.')
      onRefresh()
    }catch(e){ alert('Erro: '+e.message) }
  }
  const [filter,   setFilter]   = useState('all')
  const [search,   setSearch]   = useState('')
  const [changeReq, setChangeReq] = useState(null)
  const [apprType, setApprType]   = useState('proposta')   // 'proposta' | 'executivo'
  const [apprValue, setApprValue] = useState('')
  const [contractProposal, setContractProposal] = useState(null)
  const [sendContractProposal, setSendContractProposal] = useState(null)
  const [enviarDoc, setEnviarDoc] = useState(null)
  const [openMenu, setOpenMenu] = useState(null)  // {id, kind, rect, items} — dropdown de ações como overlay fixo
  const [isMobile, setIsMobile] = useState(()=> typeof window!=='undefined' && window.innerWidth < 760)
  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth < 760)
    window.addEventListener('resize', onResize)
    return ()=>window.removeEventListener('resize', onResize)
  }, [])
  useEffect(()=>{
    if(!openMenu) return
    const close=()=>setOpenMenu(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return ()=>{ window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [openMenu])
  const [contractsGenerated, setContractsGenerated] = useState(() => {
    try { return JSON.parse(localStorage.getItem('raro_contracts_generated')||'{}') } catch { return {} }
  })
  function markContractGenerated(proposalId) {
    const updated = {...contractsGenerated, [proposalId]: true}
    setContractsGenerated(updated)
    localStorage.setItem('raro_contracts_generated', JSON.stringify(updated))
  }
  const [sortCol,  setSortCol]  = useState('id')
  const [sortDir,  setSortDir]  = useState('desc')
  const [showComp, setShowComp] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // ── Sort ──────────────────────────────────────────────────
  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d==='asc'?'desc':'asc')
    else { setSortCol(col); setSortDir('asc') }
  }
  function SortIcon({ col }) {
    if (sortCol !== col) return <i className="ti ti-selector" style={{fontSize:11,opacity:.4}} aria-hidden/>
    return <i className={`ti ti-sort-${sortDir==='asc'?'ascending':'descending'}`} style={{fontSize:11,color:'var(--accent)'}} aria-hidden/>
  }

  function fmtTotal(p) {
    const eq = (p.floors||[]).flatMap(f=>f.rooms||[]).reduce((s,r)=>s+(r.price||0),0)
    return eq + (p.labor||0)
  }

  // Botões de ação (Editar · Docs · Criar · Enviar · Apagar) — reutilizado na tabela (desktop) e nos cards (mobile)
  function renderActions(p){
    const cl = clients.find(c=>c.id===Number(p.client_id))
    const pWithPhones = { ...p,
      client_phone1: cl?.phone1||'', client_phone2: cl?.phone2||'', itemFontSize: 7,
      floors: Array.isArray(p.floors) ? p.floors : (typeof p.floors==='string'?JSON.parse(p.floors||'[]'):p.floors||[])
    }
    const btn=(extra)=>({fontSize:11,padding:'4px 8px',...extra})
    const cancelled = p.status==='cancelled'
    const docItems = [
      { label:'Proposta', icon:'ti-file-invoice', color:'#1A56DB', onClick:()=>openProposalPDF(pWithPhones,false) },
      { label:'Proposta — visão admin', icon:'ti-shield', color:'#7C3AED', onClick:()=>openProposalPDF(pWithPhones,true) },
      { label:'Apresentação comercial', icon:'ti-presentation', color:'#DB2777', hint:'abre no editor para gerar/baixar', onClick:()=>onEdit(p,'apres') },
      ...(p.exec_doc?[{ label:'Projeto Executivo', icon:'ti-file-text', color:'#0369A1', onClick:()=>openHtmlDoc(wrapExecDoc(p.exec_doc, p.client_name, p.code), `executivo-${safeFileName(p.code||p.id)}.html`) }]:[]),
      ...(p.exec_doc_obra?[{ label:'Plano de Obra', icon:'ti-tools', color:'#B45309', onClick:()=>openHtmlDoc(wrapExecDoc(p.exec_doc_obra, p.client_name, p.code), `obra-${safeFileName(p.code||p.id)}.html`) }]:[]),
      ...(p.exec_doc_eletrica?[{ label:'Planta Elétrica', icon:'ti-bolt', color:'#16A34A', onClick:()=>openHtmlDoc(wrapExecDoc(p.exec_doc_eletrica, p.client_name, p.code), `eletrica-${safeFileName(p.code||p.id)}.html`) }]:[]),
      ...(!cancelled?[{ label:'Contrato (última proposta)', icon:'ti-license', color:'#059669', onClick:()=>setContractProposal(p) }]:[]),
    ]
    const criarItems = [
      { label:'Proposta para Clientes', icon:'ti-file-invoice', color:'#1A56DB', onClick:()=>onEdit(p) },
      { label:'Apresentação Comercial', icon:'ti-presentation', color:'#DB2777', hint:'gerada no editor da proposta', onClick:()=>onEdit(p,'apres') },
      ...(onGenerateExec&&!cancelled?[
        { gap:1 },
        { label:'Projeto Executivo', icon:'ti-brain', color:'#0369A1', onClick:()=>onGenerateExec(p) },
        { label:'Plano de Obra / Pedreiro', icon:'ti-tools', color:'#B45309', hint:'sai junto do executivo', onClick:()=>onGenerateExec(p) },
        { label:'Planta Elétrica (NBR 5444)', icon:'ti-bolt', color:'#16A34A', hint:'sai junto do executivo', onClick:()=>onGenerateExec(p) },
      ]:[]),
      ...(!cancelled?[{ gap:1 }, { label:'Contrato', icon:'ti-license', color:'#059669', onClick:()=>setContractProposal(p) }]:[]),
      { gap:2 },
      { label:'Proposta para Administradores', icon:'ti-shield', color:'#7C3AED', hint:'mesma proposta, com custos', onClick:()=>onEdit(p) },
    ]
    const toggle=(kind,items)=>(e)=>{
      if(openMenu?.id===p.id && openMenu?.kind===kind){ setOpenMenu(null); return }
      const r=e.currentTarget.getBoundingClientRect()
      setOpenMenu({ id:p.id, kind, items, rect:{ left:r.left, right:r.right, bottom:r.bottom, top:r.top } })
    }
    return <>
      <button className="btn" style={btn()} onClick={()=>onEdit(p)} title="Editar orçamento"><i className="ti ti-edit" aria-hidden/></button>
      <button className="btn" style={btn({borderColor:'#1A56DB',color:'#1A56DB'})} onClick={toggle('doc',docItems)} title="Ver documentos salvos">
        <i className="ti ti-folder" aria-hidden/> Docs <i className="ti ti-chevron-down" style={{fontSize:10}} aria-hidden/>
      </button>
      {!cancelled && <button className="btn" style={btn({borderColor:'#7C3AED',color:'#7C3AED'})} onClick={toggle('criar',criarItems)} title="Criar documentos">
        <i className="ti ti-plus" aria-hidden/> Criar <i className="ti ti-chevron-down" style={{fontSize:10}} aria-hidden/>
      </button>}
      {!cancelled && <button className="btn" style={btn({color:'#16A34A',borderColor:'#16A34A'})} title="Enviar proposta, projeto executivo ou contrato"
        onClick={()=>setEnviarDoc(p)}><i className="ti ti-send" aria-hidden/></button>}
      <button className="btn danger" style={btn()} onClick={()=>setChangeReq({proposal:p,newStatus:'__delete__'})} title="Cancelar/Excluir"><i className="ti ti-trash" aria-hidden/></button>
    </>
  }

  const sorted = [...proposals]
    .filter(p => hideCancelled ? p.status!=='cancelled' : true)
    .filter(p => filter==='all' || p.status===filter)
    .filter(p => !search ||
      p.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()) ||
      String(p.code||'').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a,b) => {
      let av, bv
      if (sortCol==='id')          { av=a.id;              bv=b.id }
      else if (sortCol==='client') { av=a.client_name||''; bv=b.client_name||'' }
      else if (sortCol==='value')  { av=fmtTotal(a);       bv=fmtTotal(b) }
      else if (sortCol==='date')   { av=a.created_at||'';  bv=b.created_at||'' }
      else if (sortCol==='status') { av=a.status||'';      bv=b.status||'' }
      else                         { av=a.id;              bv=b.id }
      const cmp = typeof av==='number' ? av-bv : String(av).localeCompare(String(bv))
      return sortDir==='asc' ? cmp : -cmp
    })

  // ── Comparative data ──────────────────────────────────────
  const roomAvgs = {}
  proposals.filter(p=>p.status==='approved'||p.status==='sent').forEach(p => {
    ;(p.floors||[]).forEach(fl => {
      ;(fl.rooms||[]).forEach(r => {
        if (!r.name || !r.price) return
        const key = r.name.toLowerCase().trim()
        if (!roomAvgs[key]) roomAvgs[key] = { total:0, count:0, name:r.name, vals:[] }
        roomAvgs[key].total += r.price
        roomAvgs[key].count += 1
        roomAvgs[key].vals.push(r.price)
      })
    })
  })
  const avgs = Object.values(roomAvgs)
    .map(r=>({...r, avg:Math.round(r.total/r.count), min:Math.min(...r.vals), max:Math.max(...r.vals)}))
    .sort((a,b)=>b.avg-a.avg)

  function requestStatusChange(p, status) {
    setChangeReq({ proposal:p, newStatus:status })
    if(status==='approved'){
      // valor da proposta = equipamentos + mão de obra
      const propostaVal = fmtTotal(p)
      // valor do executivo = se houver exec_doc com valor próprio, senão usa o da proposta
      const execVal = Number(p.exec_value)>0 ? Number(p.exec_value) : propostaVal
      const tipo = p.exec_doc ? 'executivo' : 'proposta'
      setApprType(tipo)
      setApprValue(String(tipo==='executivo'?execVal:propostaVal))
    }
  }
  async function confirmChange() {
    if (!changeReq) return
    try {
    const before = proposals.find(p=>p.id===changeReq.proposal.id)
    const updated = { ...changeReq.proposal, status:changeReq.newStatus }
    if(changeReq.newStatus==='approved'){
      updated.approved_type = apprType                  // 'proposta' | 'executivo'
      updated.approved_value = Number(String(apprValue).replace(/[^0-9.-]/g,''))||0
      updated.approved_at = new Date().toISOString()
    }
    const saved = await saveProposal(updated)
    if (!saved) throw new Error('Supabase não retornou o registro salvo')
    await auditedSave('orçamentos','status_change',saved,currentUser?.name,before)
    // Sincroniza Projetos/Cronograma com o status (aprovado cria, outros removem)
    try { await syncProjectFromProposal(saved) } catch(e){ console.error('sync projeto:', e) }
    setChangeReq(null); onRefresh()
    } catch(err) { console.error('Erro ao confirmar mudança:', err); alert('Erro: ' + err.message) }
  }
  async function handleDelete() {
    if (!changeReq) return
    const prop = changeReq.proposal
    // 1) confirmação explícita
    if (!window.confirm(`Cancelar o orçamento "${prop.code||prop.client_name||prop.id}"?\n\nIsto vai:\n• Marcar o orçamento como CANCELADO\n• Cancelar projeto e cronograma vinculados\n• Devolver os itens ao estoque\n\nOs dados não são apagados, ficam como cancelados.`)) return
    // 2) PIN
    const pin = window.prompt('Digite o PIN para confirmar o cancelamento:')
    if (pin===null) return
    const ok = await verifyPIN(pin)
    if (!ok) { alert('PIN incorreto. Cancelamento abortado.'); return }
    try {
      const res = await cancelProposal(prop)
      await auditedSave('orçamentos','cancel',prop,currentUser?.name)
      if (res.spent>0) {
        alert(`Orçamento cancelado.\n\n⚠️ ATENÇÃO: este projeto já tinha R$ ${res.spent.toLocaleString('pt-BR')} em custos lançados no financeiro. Esses lançamentos foram mantidos para seu controle — revise na aba Financeiro se precisa estorná-los.`)
      } else {
        alert('Orçamento cancelado e itens devolvidos ao estoque.')
      }
    } catch(err) { console.error(err); alert('Erro ao cancelar: '+err.message) }
    setChangeReq(null)
    onRefresh()
  }

  const counts = Object.fromEntries(Object.keys(STATUS).map(s=>[s,proposals.filter(p=>p.status===s).length]))

  const ThSort = ({ col, children }) => (
    <th onClick={()=>toggleSort(col)} style={{cursor:'pointer',userSelect:'none',whiteSpace:'nowrap'}}>
      <span style={{display:'flex',alignItems:'center',gap:4}}>{children}<SortIcon col={col}/></span>
    </th>
  )

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-file-invoice" aria-hidden/>Orçamentos</div>
        <div className="topbar-acts">
          {cancelledCount>0 && (
            <button className="btn" style={{fontSize:11}} onClick={()=>setHideCancelled(h=>!h)} title="Mostrar/ocultar cancelados">
              <i className={`ti ${hideCancelled?'ti-eye':'ti-eye-off'}`} aria-hidden/>{hideCancelled?`Ver cancelados (${cancelledCount})`:'Ocultar cancelados'}
            </button>
          )}
          {cancelledCount>0 && !hideCancelled && (
            <button className="btn danger" style={{fontSize:11}} onClick={purgeCancelled} title="Apagar cancelados (senha)">
              <i className="ti ti-trash" aria-hidden/>Limpar cancelados
            </button>
          )}
          <button className="btn" onClick={()=>setShowComp(true)}>
            <i className="ti ti-chart-bar" aria-hidden/>Comparativo
          </button>
          <button className="btn" onClick={()=>setShowImport(true)} title="Importar um projeto executivo ou proposta a partir de um PDF">
            <i className="ti ti-file-import" aria-hidden/>Importar
          </button>
          <button className="btn primary" onClick={onNew}>
            <i className="ti ti-plus" aria-hidden/>Novo
          </button>
        </div>
      </div>

      <div className="content">
        {/* Filter pills */}
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
          {[['all',`Todos (${proposals.length})`], ...Object.entries(STATUS).map(([k,s])=>[k,`${s.label} (${counts[k]||0})`])].map(([k,label])=>(
            <button key={k} onClick={()=>setFilter(k)}
              style={{padding:'5px 12px',borderRadius:20,border:'1px solid var(--border)',
                background:filter===k?'var(--accent)':'var(--bg)',
                color:filter===k?'#fff':'var(--text2)',cursor:'pointer',fontSize:12,fontFamily:'inherit'}}>
              {label}
            </button>
          ))}
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Buscar cliente, ID..." style={{marginLeft:'auto',width:200,padding:'5px 9px',fontSize:12}}/>
        </div>

        {!isMobile && <div className="section">
          <table className="tbl">
            <thead>
              <tr>
                <ThSort col="id">ID</ThSort>
                <ThSort col="client">Cliente</ThSort>
                <th>Descrição</th>
                <ThSort col="value">Valor total</ThSort>
                <ThSort col="date">Data</ThSort>
                <ThSort col="status">Status</ThSort>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:24,color:'var(--text3)'}}>Nenhum orçamento</td></tr>}
              {sorted.map(p=>{
                const s = STATUS[p.status]||STATUS.draft
                const total = fmtTotal(p)
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="mono" style={{fontWeight:600,fontSize:12}}>{p.code||`#${p.id}`}</div>
                      <div className="sub">#{p.id}</div>
                    </td>
                    <td>
                      <div style={{fontWeight:500}}>{p.client_name}</div>
                      <div className="sub">{(p.floors||[]).length} pav · {(p.floors||[]).flatMap(f=>f.rooms||[]).length} cômodos</div>
                    </td>
                    <td style={{color:'var(--text2)',fontSize:12}}>{p.description||'—'}</td>
                    <td style={{color:total>0?'var(--accent)':'var(--text3)',fontWeight:total>0?500:400}}>
                      {total>0 ? `R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}` : '—'}
                    </td>
                    <td className="mono" style={{fontSize:11}}>
                      {p.created_at ? new Date(p.created_at+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}
                    </td>
                    <td>
                      <select value={p.status} onChange={e=>requestStatusChange(p,e.target.value)}
                        style={{fontSize:11,padding:'3px 6px',border:'1px solid var(--border)',borderRadius:4,cursor:'pointer',fontFamily:'inherit'}}>
                        {Object.entries(STATUS).map(([v,{label}])=><option key={v} value={v}>{label}</option>)}
                      </select>
                    </td>
                    <td>
                      <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                        {renderActions(p)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>}

        {/* ── MOBILE: cards empilhados ── */}
        {isMobile && <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {sorted.length===0 && <div style={{textAlign:'center',padding:24,color:'var(--text3)',fontSize:13}}>Nenhum orçamento</div>}
          {sorted.map(p=>{
            const s = STATUS[p.status]||STATUS.draft
            const total = fmtTotal(p)
            const npav=(p.floors||[]).length, ncom=(p.floors||[]).flatMap(f=>f.rooms||[]).length
            return (
              <div key={p.id} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:12,padding:14,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                  <div style={{minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:15,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{p.client_name}</div>
                    <div className="mono" style={{fontSize:11,color:'var(--text3)',marginTop:1}}>{p.code||`#${p.id}`} · #{p.id}</div>
                  </div>
                  <div style={{textAlign:'right',flexShrink:0}}>
                    <div style={{color:total>0?'var(--accent)':'var(--text3)',fontWeight:700,fontSize:15}}>{total>0?`R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})}`:'—'}</div>
                    <div className="mono" style={{fontSize:10,color:'var(--text3)',marginTop:1}}>{p.created_at ? new Date(p.created_at+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}</div>
                  </div>
                </div>
                <div style={{fontSize:12,color:'var(--text3)',marginTop:6}}>{npav} pav · {ncom} cômodos{p.description?` · ${p.description}`:''}</div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10,flexWrap:'wrap'}}>
                  <select value={p.status} onChange={e=>requestStatusChange(p,e.target.value)}
                    style={{fontSize:12,padding:'6px 8px',border:'1px solid var(--border)',borderRadius:6,cursor:'pointer',fontFamily:'inherit',flex:'1 1 auto'}}>
                    {Object.entries(STATUS).map(([v,{label}])=><option key={v} value={v}>{label}</option>)}
                  </select>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10,paddingTop:10,borderTop:'1px solid var(--surf2,#eee)'}}>
                  {renderActions(p)}
                </div>
              </div>
            )
          })}
        </div>}

        {/* Stock legend */}
        <div style={{background:'var(--surf)',borderRadius:8,padding:'10px 14px',border:'1px solid var(--border)',fontSize:11,color:'var(--text2)'}}>
          <span>📝 <b>Rascunho:</b> sem reserva &nbsp;·&nbsp; </span>
          <span>📦 <b>Enviado:</b> itens reservados &nbsp;·&nbsp; </span>
          <span>✅ <b>Aprovado:</b> baixa do estoque &nbsp;·&nbsp; </span>
          <span>❌ <b>Recusado:</b> reserva liberada</span>
        </div>
      </div>

      {/* Confirm modal */}
      {changeReq && (
        <div className="modal-overlay">
          <div className="modal" style={{width:400}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{changeReq.newStatus==='__delete__'?'Excluir orçamento?':'Confirmar mudança'}</div>
              <button className="modal-close" onClick={()=>setChangeReq(null)}>×</button>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:500,marginBottom:8}}>{changeReq.proposal.client_name} · {changeReq.proposal.code||`#${changeReq.proposal.id}`}</div>
              {changeReq.newStatus==='__delete__'
                ? <div style={{background:'var(--red-lt)',border:'1px solid var(--red)',borderRadius:6,padding:'8px 12px',fontSize:12,color:'var(--red)'}}>
                    Esta ação não pode ser desfeita. Reservas de estoque serão liberadas.
                  </div>
                : <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                      <span className={`badge ${STATUS[changeReq.proposal.status]?.cls}`}>{STATUS[changeReq.proposal.status]?.label}</span>
                      <i className="ti ti-arrow-right" style={{fontSize:14,color:'var(--text3)'}} aria-hidden/>
                      <span className={`badge ${STATUS[changeReq.newStatus]?.cls}`}>{STATUS[changeReq.newStatus]?.label}</span>
                    </div>
                    {STATUS_NOTE[changeReq.newStatus] && (
                      <div style={{background:'var(--surf)',border:'1px solid var(--border)',borderRadius:6,padding:'8px 12px',fontSize:12,color:'var(--text2)'}}>
                        {STATUS_NOTE[changeReq.newStatus]}
                      </div>
                    )}
                    {changeReq.newStatus==='approved' && (
                      <div style={{marginTop:12}}>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:6,color:'var(--text2)'}}>O que foi aprovado?</div>
                        <div style={{display:'flex',gap:8,marginBottom:12}}>
                          {[['proposta','Proposta','ti-file-invoice'],['executivo','Projeto Executivo','ti-clipboard-check']].map(([v,lb,ic])=>{
                            const sel=apprType===v
                            const base = v==='executivo'
                              ? (Number(changeReq.proposal.exec_value)>0?Number(changeReq.proposal.exec_value):fmtTotal(changeReq.proposal))
                              : fmtTotal(changeReq.proposal)
                            return <button key={v} onClick={()=>{setApprType(v); setApprValue(String(base))}}
                              style={{flex:1,padding:'10px 8px',borderRadius:8,border:`1.5px solid ${sel?'var(--accent)':'var(--border)'}`,background:sel?'var(--accent-lt,rgba(14,165,233,0.08))':'var(--surf)',cursor:'pointer',textAlign:'center'}}>
                              <i className={`ti ${ic}`} style={{fontSize:18,color:sel?'var(--accent)':'var(--text3)'}} aria-hidden/>
                              <div style={{fontSize:11.5,fontWeight:sel?600:400,marginTop:4,color:sel?'var(--accent)':'var(--text2)'}}>{lb}</div>
                            </button>
                          })}
                        </div>
                        <div style={{fontSize:12,fontWeight:600,marginBottom:6,color:'var(--text2)'}}>Valor final aprovado (R$)</div>
                        <input type="number" value={apprValue} onChange={e=>setApprValue(e.target.value)}
                          style={{width:'100%',fontSize:18,fontWeight:700,textAlign:'center',padding:'8px',border:'1px solid var(--border)',borderRadius:8}}/>
                        <div style={{fontSize:10.5,color:'var(--text3)',marginTop:5,textAlign:'center'}}>Confira o valor a pedir e edite se necessário antes de confirmar.</div>
                      </div>
                    )}
                  </div>}
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>setChangeReq(null)}>Cancelar</button>
              {changeReq.newStatus==='__delete__'
                ? <button className="btn danger" onClick={handleDelete}>Excluir</button>
                : <button className="btn primary" onClick={confirmChange}>Confirmar</button>}
            </div>
          </div>
        </div>
      )}

      {/* Comparative modal */}
      {showComp && (
        <div className="modal-overlay">
          <div className="modal" style={{width:'min(96vw,1100px)',height:'90vh',display:'flex',flexDirection:'column',padding:0,overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
            
            {/* Fixed header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',borderBottom:'1px solid var(--border)',flexShrink:0}}>
              <div style={{fontSize:15,fontWeight:600,color:'var(--text1)',display:'flex',alignItems:'center',gap:8}}>
                <i className="ti ti-chart-bar" style={{color:'var(--accent)'}} aria-hidden/>
                Comparativo de Margens e Itens
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" style={{fontSize:11}} onClick={()=>{
                  const el=document.getElementById('comp-table-content')
                  if(!el) return
                  const html='<html><head><title>Comparativo RARO Home</title><style>body{font-family:sans-serif;font-size:11px;padding:20px;color:#111}h3{margin:18px 0 6px;font-size:13px;color:#0369A1}table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#f0f6ff;padding:7px 10px;text-align:left;font-size:11px;color:#0369A1;border-bottom:2px solid #C8DEFF}td{padding:6px 10px;border-bottom:1px solid #eee;font-size:11px}tr:hover td{background:#fafbff}</style></head><body>'+el.innerHTML+'</body></html>'
                  const blob=new Blob([html],{type:'text/html'})
                  const url=URL.createObjectURL(blob)
                  const w=window.open(url,'_blank')
                  if(w) setTimeout(()=>w.print(),500)
                }}>
                  <i className="ti ti-printer" aria-hidden/>Exportar
                </button>
                <button className="modal-close" onClick={()=>setShowComp(false)}>×</button>
              </div>
            </div>

            {/* Scrollable content */}
            <div id="comp-table-content" style={{flex:1,overflowY:'auto',padding:'20px 24px'}}>
              {(()=>{
                const approved = proposals.filter(p=>p.status==='approved'||p.status==='sent')
                if(!approved.length) return (
                  <div style={{textAlign:'center',padding:'48px 0',color:'var(--text3)'}}>
                    <i className="ti ti-chart-bar" style={{fontSize:32,display:'block',marginBottom:8,opacity:0.3}} aria-hidden/>
                    Nenhum orçamento enviado ainda.
                  </div>
                )

                const itemMap = {}
                approved.forEach(p=>{
                  const floors = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):[])
                  floors.forEach(fl=>{
                    ;(fl.rooms||[]).forEach(r=>{
                      ;(r.items||[]).forEach(it=>{
                        if(!it.code) return
                        if(!itemMap[it.code]) itemMap[it.code]={name:it.name,code:it.code,category:it.category||'Outro',count:0,totalQty:0,costs:[],margins:[]}
                        const qty=parseInt(it.qty)||1
                        itemMap[it.code].count++
                        itemMap[it.code].totalQty+=qty
                        if(it.cost_price>0&&it.sale_price>0){
                          itemMap[it.code].costs.push(it.cost_price)
                          itemMap[it.code].margins.push(Math.round((it.sale_price-it.cost_price)/it.cost_price*100))
                        }
                      })
                    })
                  })
                })

                const propMargins = approved.map(p=>{
                  const floors = Array.isArray(p.floors)?p.floors:(typeof p.floors==='string'?JSON.parse(p.floors||'[]'):[])
                  const allItems=floors.flatMap(f=>(f.rooms||[]).flatMap(r=>(r.items||[])))
                  const cost=allItems.reduce((s,it)=>s+(it.cost_price||0)*(parseInt(it.qty)||1),0)
                  const sale=floors.reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),s),0)
                  const pct=cost>0?Math.round((sale-cost)/cost*100):0
                  return {code:p.code||`#${p.id}`,client:p.client_name,sale,cost,pct,status:p.status}
                }).sort((a,b)=>b.pct-a.pct)

                const sortedItems = Object.values(itemMap).sort((a,b)=>b.count-a.count)
                const pC=p=>p>=50?'var(--green)':p>=20?'var(--amber)':'var(--red)'
                const fmt=v=>'R$\u202f'+Math.round(v).toLocaleString('pt-BR')

                return <>
                  {/* Section 1 — Margin per proposal */}
                  <div style={{marginBottom:24}}>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10}}>
                      Margem por proposta
                    </div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Código</th><th>Cliente</th>
                          <th style={{textAlign:'right'}}>Venda</th>
                          <th style={{textAlign:'right'}}>Custo</th>
                          <th style={{textAlign:'right'}}>Lucro</th>
                          <th style={{textAlign:'right'}}>Margem</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {propMargins.map((p,i)=>(
                          <tr key={i}>
                            <td className="mono" style={{fontWeight:600}}>{p.code}</td>
                            <td style={{fontWeight:500}}>{p.client}</td>
                            <td style={{textAlign:'right',color:'var(--accent)',fontWeight:500}}>{fmt(p.sale)}</td>
                            <td style={{textAlign:'right',color:'var(--text2)'}}>{fmt(p.cost)}</td>
                            <td style={{textAlign:'right',fontWeight:500,color:p.pct>=0?'var(--green)':'var(--red)'}}>{fmt(p.sale-p.cost)}</td>
                            <td style={{textAlign:'right'}}>
                              <b style={{color:pC(p.pct),fontSize:14}}>{p.pct}%</b>
                            </td>
                            <td><span className={`badge ${p.status==='approved'?'b-green':'b-blue'}`} style={{fontSize:10}}>{p.status==='approved'?'Aprovado':'Enviado'}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Section 2 — Items frequency + margin */}
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10}}>
                      Itens mais utilizados e margens
                    </div>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Produto</th><th>Código</th><th>Categoria</th>
                          <th style={{textAlign:'center'}}>Nº propostas</th>
                          <th style={{textAlign:'center'}}>Qtd total</th>
                          <th style={{textAlign:'right'}}>Margem média</th>
                          <th style={{textAlign:'right'}}>Custo médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedItems.map((it,i)=>{
                          const avgM=it.margins.length?Math.round(it.margins.reduce((s,m)=>s+m,0)/it.margins.length):null
                          const avgC=it.costs.length?Math.round(it.costs.reduce((s,c)=>s+c,0)/it.costs.length):null
                          return <tr key={i}>
                            <td style={{fontWeight:500}}>{it.name}</td>
                            <td className="mono" style={{fontSize:10,color:'var(--text3)'}}>{it.code}</td>
                            <td style={{fontSize:11,color:'var(--text3)'}}>{it.category}</td>
                            <td style={{textAlign:'center',fontWeight:700,color:'var(--accent)'}}>{it.count}</td>
                            <td style={{textAlign:'center',fontWeight:600}}>{it.totalQty}</td>
                            <td style={{textAlign:'right'}}>
                              {avgM!==null
                                ? <b style={{color:pC(avgM),fontSize:13}}>{avgM}%</b>
                                : <span style={{color:'var(--text3)'}}>—</span>}
                            </td>
                            <td style={{textAlign:'right',color:'var(--text2)'}}>
                              {avgC?`R$ ${avgC.toLocaleString('pt-BR')}`:'—'}
                            </td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              })()}
            </div>
          </div>
        </div>
      )}
      {showImport && <ImportarPdfModal
        catalog={catalog}
        currentUser={currentUser}
        onDone={()=>{ setShowImport(false); onRefresh() }}
        onClose={()=>setShowImport(false)}
      />}
      {/* ── Menu de ações flutuante (Docs / Criar) — overlay acima de tudo ── */}
      {openMenu && (()=>{
        const isMobile = typeof window!=='undefined' && window.innerWidth < 640
        const title = openMenu.kind==='doc' ? 'Documentos salvos' : 'Criar documento'
        const items = openMenu.items||[]
        const list = (
          <div style={{padding:isMobile?'4px 0 8px':4}}>
            <div style={{fontSize:isMobile?11:9,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:.5,padding:isMobile?'10px 16px 8px':'4px 10px'}}>{title}</div>
            {items.length===0 && <div style={{padding:'10px 14px',fontSize:12,color:'var(--text3)'}}>Nenhum documento disponível.</div>}
            {items.map((d,i)=> (d.divider || d.gap)
              ? <div key={i} style={d.gap===2
                  ? {height:1,background:'var(--border)',margin:'12px 8px'}
                  : {height:1,background:'var(--border)',margin:'6px 8px'}}/>
              : (
              <button key={i} onClick={()=>{ const fn=d.onClick; setOpenMenu(null); setTimeout(fn,0) }}
                style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:2,width:'100%',
                  padding:isMobile?'13px 16px':'9px 10px',border:'none',background:'transparent',cursor:'pointer',
                  fontSize:isMobile?14:12.5,color:'var(--text)',borderRadius:8,textAlign:'left',fontFamily:'inherit'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--surf)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                <span style={{display:'flex',alignItems:'center',gap:10}}><i className={`ti ${d.icon}`} style={{color:d.color,fontSize:isMobile?18:15}} aria-hidden/>{d.label}</span>
                {d.hint && <span style={{fontSize:isMobile?11:9.5,color:'var(--text3)',paddingLeft:isMobile?28:25}}>{d.hint}</span>}
              </button>
            ))}
          </div>
        )
        if(isMobile){
          // bottom sheet no celular
          return <div onClick={()=>setOpenMenu(null)} style={{position:'fixed',inset:0,zIndex:1000,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'flex-end'}}>
            <div onClick={e=>e.stopPropagation()} style={{width:'100%',background:'#fff',borderRadius:'16px 16px 0 0',padding:'8px 0 max(8px,env(safe-area-inset-bottom))',boxShadow:'0 -4px 24px rgba(0,0,0,0.2)',maxHeight:'70vh',overflowY:'auto'}}>
              <div style={{width:40,height:4,background:'var(--border2)',borderRadius:2,margin:'8px auto 4px'}}/>
              {list}
            </div>
          </div>
        }
        // desktop/tablet: ancorado ao botão, alinhado à direita, acima de tudo
        const r=openMenu.rect, W=250, vh=window.innerHeight
        const left=Math.max(8, Math.min(r.right-W, window.innerWidth-W-8))
        const espacoAbaixo = vh - r.bottom - 12
        const espacoAcima = r.top - 12
        const abrirCima = espacoAbaixo < 260 && espacoAcima > espacoAbaixo
        const maxH = Math.max(180, Math.min(440, abrirCima ? espacoAcima : espacoAbaixo))
        const style={ position:'fixed', zIndex:1000, width:W, left,
          ...(abrirCima ? {bottom: vh - r.top + 6} : {top: r.bottom+6}),
          background:'#fff', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 30px rgba(0,0,0,0.18)', maxHeight:maxH, overflowY:'auto', overscrollBehavior:'contain' }
        return <>
          <div onClick={()=>setOpenMenu(null)} style={{position:'fixed',inset:0,zIndex:999}}/>
          <div style={style}>{list}</div>
        </>
      })()}

      {enviarDoc && <EnviarDocumentoModal
        proposal={enviarDoc}
        clients={clients}
        currentUser={currentUser}
        onMarkSent={async (p)=>{
          try {
            const before = proposals.find(x=>x.id===p.id)
            const updated = { ...p, status:'sent' }
            const saved = await saveProposal(updated)
            if(saved){ try{ await auditedSave('orçamentos','status_change',saved,currentUser?.name,before) }catch(e){} try{ await syncProjectFromProposal(saved) }catch(e){} }
            onRefresh()
          } catch(err){ console.error('marcar enviado:', err); alert('Erro: '+err.message) }
        }}
        onClose={()=>setEnviarDoc(null)}
      />}
      {sendContractProposal && <ContractSendModal
        proposal={sendContractProposal}
        clients={clients}
        onClose={()=>setSendContractProposal(null)}
      />}
      {contractProposal && <Contract
        proposal={contractProposal}
        clients={clients}
        onClose={()=>setContractProposal(null)}
        onGenerated={(p)=>{ markContractGenerated(p.id) }}
        onSend={(p)=>{ setContractProposal(null); setSendContractProposal(p) }}
      />}
    </>
  )
}