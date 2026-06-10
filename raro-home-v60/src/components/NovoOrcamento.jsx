import { useState } from 'react'

export default function NovoOrcamento({ clients=[], onClose, onChoose }) {
  const [step, setStep] = useState('client') // client | type
  const [search, setSearch] = useState('')
  const [client, setClient] = useState(null)
  const [tipo, setTipo] = useState(null)

  const filtered = clients.filter(c=>{
    const q=search.toLowerCase()
    return !q || (c.name1||'').toLowerCase().includes(q) || (c.name2||'').toLowerCase().includes(q) || (c.neighborhood||'').toLowerCase().includes(q)
  }).slice(0,10)

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(6,11,26,0.96)',zIndex:1200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'flex-start',padding:'24px 16px',overflowY:'auto'}}>
      <div style={{width:'100%',maxWidth:480}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:24}}>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.1)',border:'none',color:'#fff',width:36,height:36,borderRadius:8,cursor:'pointer'}}><i className="ti ti-x" aria-hidden/></button>
          <div style={{color:'#fff',fontSize:16,fontWeight:600}}>Novo</div>
        </div>

        {/* PASSO 1: CLIENTE */}
        {step==='client' && (
          <div>
            <div style={{color:'#38BDF8',fontSize:12,textTransform:'uppercase',letterSpacing:1,marginBottom:10}}>1. Cliente</div>
            <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente pelo nome..."
              style={{width:'100%',padding:'13px 14px',fontSize:16,borderRadius:10,border:'1px solid rgba(255,255,255,0.15)',background:'rgba(255,255,255,0.08)',color:'#fff',boxSizing:'border-box',marginBottom:10}}/>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {filtered.map(c=>(
                <button key={c.id} onClick={()=>{setClient(c);setStep('type')}}
                  style={{textAlign:'left',padding:'14px 16px',borderRadius:10,border:'1px solid rgba(255,255,255,0.12)',background:'rgba(255,255,255,0.05)',color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>
                  <div style={{fontSize:15,fontWeight:600}}>{c.name1}{c.name2?' & '+c.name2:''}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{c.neighborhood||''}{c.city?` · ${c.city}`:''}</div>
                </button>
              ))}
              {search && filtered.length===0 && <div style={{color:'rgba(255,255,255,0.5)',fontSize:13,padding:12,textAlign:'center'}}>Nenhum cliente. Cadastre em Clientes primeiro.</div>}
            </div>
            <button onClick={()=>{setClient(null);setStep('type')}}
              style={{marginTop:14,width:'100%',padding:'12px',borderRadius:10,border:'1px dashed rgba(255,255,255,0.25)',background:'transparent',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
              Seguir sem cliente (defino depois)
            </button>
          </div>
        )}

        {/* PASSO 2: TIPO */}
        {step==='type' && (
          <div>
            <div style={{color:'#38BDF8',fontSize:12,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>2. O que vamos criar?</div>
            {client && <div style={{color:'rgba(255,255,255,0.6)',fontSize:13,marginBottom:16}}>Cliente: <b style={{color:'#fff'}}>{client.name1}{client.name2?' & '+client.name2:''}</b></div>}

            <button onClick={()=>onChoose({type:'executivo', client})}
              style={{width:'100%',textAlign:'left',padding:'18px',borderRadius:12,border:'1px solid #7C3AED',background:'rgba(124,58,237,0.12)',color:'#fff',cursor:'pointer',fontFamily:'inherit',marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <i className="ti ti-brain" style={{fontSize:24,color:'#A78BFA'}} aria-hidden/>
                <span style={{fontSize:16,fontWeight:700}}>Projeto Executivo</span>
              </div>
              <div style={{fontSize:12.5,color:'rgba(255,255,255,0.7)',lineHeight:1.5}}>
                Dimensionamento completo: posições dos itens, planta de cabeamento (elétrica, dados e som), pré-instalação. Documento técnico para entregar a casa pronta para automação. Pode virar proposta depois.
              </div>
            </button>

            <button onClick={()=>onChoose({type:'proposta', client})}
              style={{width:'100%',textAlign:'left',padding:'18px',borderRadius:12,border:'1px solid #0EA5E9',background:'rgba(14,165,233,0.12)',color:'#fff',cursor:'pointer',fontFamily:'inherit'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                <i className="ti ti-file-invoice" style={{fontSize:24,color:'#38BDF8'}} aria-hidden/>
                <span style={{fontSize:16,fontWeight:700}}>Proposta de Equipamentos e Instalação</span>
              </div>
              <div style={{fontSize:12.5,color:'rgba(255,255,255,0.7)',lineHeight:1.5}}>
                Para fechar conosco: itens + mão de obra de instalação, configuração e suporte. O orçamento comercial com preços.
              </div>
            </button>

            <button onClick={()=>setStep('client')} style={{marginTop:16,background:'none',border:'none',color:'rgba(255,255,255,0.5)',cursor:'pointer',fontFamily:'inherit',fontSize:13}}>
              <i className="ti ti-arrow-left" aria-hidden/> Trocar cliente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
