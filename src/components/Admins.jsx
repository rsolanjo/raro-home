import PINModal from './PINModal.jsx'
import { useState } from 'react'
import { saveAdmin, deleteAdmin, checkPINSession, setPINSession, verifyPIN, dispararResetSenha, gerarBackupCompleto, baixarArquivo } from '../db/supabase.js'

const ROLE_LABEL = { admin:'Admin (tudo)', viewer:'Visualizador', mestre:'Mestre de obra' }

export default function Admins({ admins, clients=[], currentUser, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState(null)
  // Modelos antigos de documento (Novo/Clássico/Fable). Padrão: ocultos — só o Opus vale.
  const [legadosOn, setLegadosOn] = useState(()=>{ try{ return localStorage.getItem('raro_modelos_legados')==='1' }catch{ return false } })
  const [form, setForm] = useState({name:'',gmail:'',role:'admin',obra_scope:'all',client_ids:[]})
  const [showPIN, setShowPIN] = useState(false)
  const [pinAction, setPinAction] = useState(null)
  const [bkpBusy, setBkpBusy] = useState(false)
  const [bkpMsg, setBkpMsg] = useState('')
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  async function baixarBackup(){
    if(bkpBusy) return
    setBkpBusy(true); setBkpMsg('Lendo o banco…')
    try{
      const dump = await gerarBackupCompleto((t,i,n)=>setBkpMsg(`Lendo ${t} (${i}/${n})…`))
      const total = Object.values(dump._meta.contagem||{}).reduce((s,n)=>s+n,0)
      const dia = new Date().toISOString().slice(0,10)
      baixarArquivo(JSON.stringify(dump,null,2), `raro-home-backup-${dia}.json`)
      setBkpMsg(`✓ Backup baixado — ${total} registros. Veja na pasta Downloads.`)
    }catch(e){ setBkpMsg('Erro: '+(e?.message||e)) }
    finally{ setBkpBusy(false) }
  }

  function openNew(){ setEditId(null); setForm({name:'',gmail:'',role:'admin',obra_scope:'all',client_ids:[]}); setShowModal(true) }
  function openEdit(a){
    setEditId(a.id)
    setForm({
      name:a.name||'', gmail:a.gmail||'', role:a.role||'admin',
      obra_scope:a.obra_scope || (a.client_id?'selected':'all'),
      client_ids: Array.isArray(a.client_ids)?a.client_ids : (a.client_id?[String(a.client_id)]:[]),
    })
    setShowModal(true)
  }
  function toggleObra(id){
    id=String(id)
    setForm(p=>{ const has=p.client_ids.includes(id); return {...p, client_ids: has?p.client_ids.filter(x=>x!==id):[...p.client_ids,id]} })
  }

  function requirePIN(action) {
    if (checkPINSession()) { action(); return }
    setPinAction(()=>action); setShowPIN(true)
  }

  async function handleSave(){
    if(!form.name?.trim()||!form.gmail?.trim()){ alert('Preencha nome e gmail.'); return }
    if(form.role!=='admin' && form.obra_scope==='selected' && !form.client_ids.length){ alert('Selecione ao menos uma obra, ou mude para "todas as obras".'); return }
    const payload = {
      name:form.name, gmail:form.gmail, role:form.role,
      obra_scope: form.role==='admin' ? 'all' : form.obra_scope,
      client_ids: form.role==='admin' ? [] : (form.obra_scope==='selected'?form.client_ids:[]),
      client_id: (form.role==='mestre'&&form.obra_scope==='selected'&&form.client_ids[0])||'',
    }
    if(editId) payload.id = editId
    try{
      await saveAdmin(payload)
      setShowModal(false); setEditId(null); onRefresh()
    }catch(e){ alert('Erro ao salvar usuário: '+e.message+'\n\nSe falar de "client_ids" ou "obra_scope", rode o SUPABASE_v44.sql.') }
  }

  function obraResumo(a){
    if(a.role==='admin') return 'Todas (admin)'
    const scope = a.obra_scope || (a.client_id?'selected':'all')
    if(scope==='all') return 'Todas as obras'
    const ids = Array.isArray(a.client_ids)?a.client_ids:(a.client_id?[a.client_id]:[])
    if(!ids.length) return '—'
    const names = ids.map(id=>{ const c=clients.find(x=>String(x.id)===String(id)); return c?c.name1:'?' })
    return names.length>2 ? `${names.slice(0,2).join(', ')} +${names.length-2}` : names.join(', ')
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-shield" aria-hidden/>Usuários</div>
        <div className="topbar-acts">
          <button className="btn primary" onClick={()=>requirePIN(openNew)}>
            <i className="ti ti-plus" aria-hidden/>Novo usuário
          </button>
        </div>
      </div>
      <div className="content">
        <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--amber)'}}>
          <i className="ti ti-alert-circle" style={{marginRight:6}} aria-hidden/>
          Somente os e-mails cadastrados aqui podem acessar o sistema. Não remova seu próprio e-mail.
        </div>
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">{admins.length} usuário(s)</div></div>
          <table className="tbl">
            <thead><tr><th>Nome</th><th>Gmail</th><th>Papel</th><th>Obras</th><th></th></tr></thead>
            <tbody>
              {admins.map(a=>(
                <tr key={a.id}>
                  <td style={{fontWeight:500}}>
                    {a.name}
                    {a.gmail===currentUser?.gmail && <span className="badge b-blue" style={{fontSize:9,marginLeft:6}}>você</span>}
                  </td>
                  <td className="mono">{a.gmail}</td>
                  <td><span className="badge b-gray" style={{fontSize:10}}>{ROLE_LABEL[a.role]||a.role}</span></td>
                  <td style={{fontSize:11,color:'var(--text2)'}}>{obraResumo(a)}</td>
                  <td style={{whiteSpace:'nowrap'}}>
                    <button className="btn" style={{fontSize:11,padding:'3px 8px',marginRight:4}} onClick={()=>requirePIN(()=>openEdit(a))} title="Editar">
                      <i className="ti ti-edit" aria-hidden/>
                    </button>
                    {currentUser?.role==='admin' && a.gmail && (
                      <button className="btn" style={{fontSize:11,padding:'3px 8px',marginRight:4}} title="Resetar senha"
                        onClick={()=>requirePIN(async ()=>{
                          if(!confirm(`Enviar link de redefinição de senha para ${a.name} (${a.gmail})?\n\nA pessoa vai receber um e-mail e cria a nova senha ela mesma. Você não define a senha dela.`)) return
                          try { await dispararResetSenha(a.gmail); alert(`Link enviado para ${a.gmail}. Peça pra pessoa checar o e-mail (inclusive spam).`) }
                          catch(e){ alert('Não consegui enviar o reset: '+(e?.message||e)) }
                        })}>
                        <i className="ti ti-key" aria-hidden/>
                      </button>
                    )}
                    {a.gmail!==currentUser?.gmail && (
                      <button className="btn danger" style={{fontSize:11,padding:'3px 8px'}}
                        onClick={()=>{if(confirm(`Remover ${a.name}?`)){deleteAdmin(a.id);onRefresh()}}}>
                        <i className="ti ti-trash" aria-hidden/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section" style={{marginTop:14}}>
          <div className="sec-hdr"><div className="sec-title">Modelos de documento</div></div>
          <div style={{padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontSize:13,fontWeight:600}}>Modelos antigos — Novo · Clássico · Fable</div>
              <div style={{fontSize:11.5,color:'var(--text3)',marginTop:3,lineHeight:1.5}}>
                O padrão dos documentos é o <b>Opus</b>, e os modelos antigos ficam ocultos. Ligue aqui só se precisar gerar algum documento no formato antigo — o seletor <b>Estilo</b> volta a aparecer no Projeto Executivo.
              </div>
            </div>
            <button className={legadosOn?'btn danger':'btn'} style={{flexShrink:0}} onClick={()=>requirePIN(()=>{
              const novo=!legadosOn
              try{ localStorage.setItem('raro_modelos_legados', novo?'1':'0') }catch{}
              setLegadosOn(novo)
              alert(novo
                ? 'Modelos antigos reabilitados. Abra o Projeto Executivo — o seletor "Estilo" vai aparecer.'
                : 'Modelos antigos ocultos. Só o Opus fica disponível.')
            })}>
              <i className={legadosOn?'ti ti-eye-off':'ti ti-eye'} aria-hidden/>{legadosOn?'Ocultar antigos':'Reabilitar antigos'}
            </button>
          </div>
        </div>

        <div className="section" style={{marginTop:14}}>
          <div className="sec-hdr"><div className="sec-title">Backup dos dados</div></div>
          <div style={{padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontSize:13,fontWeight:600}}>Baixar uma cópia de tudo</div>
              <div style={{fontSize:11.5,color:'var(--text3)',marginTop:3,lineHeight:1.5}}>
                Gera <b>um arquivo</b> com todos os clientes, orçamentos, projetos, catálogo e estoque, e baixa na sua pasta <b>Downloads</b>. Guarde num pen drive ou nuvem. <b style={{color:'var(--warn,#B45309)'}}>Contém dados de cliente e senhas</b> — guarde em lugar privado.
                {bkpMsg && <div style={{marginTop:6,fontWeight:600,color: bkpMsg.startsWith('Erro')?'#DC2626': bkpMsg.startsWith('✓')?'#059669':'var(--text2)'}}>{bkpMsg}</div>}
              </div>
            </div>
            <button className="btn primary" style={{flexShrink:0}} disabled={bkpBusy} onClick={baixarBackup}>
              <i className={bkpBusy?'ti ti-loader-2':'ti ti-download'} aria-hidden/>{bkpBusy?'Gerando…':'Baixar backup'}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editId?'Editar usuário':'Novo usuário'}</div><button className="modal-close" onClick={()=>{setShowModal(false);setEditId(null)}}>×</button></div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Nome</div><input value={form.name} onChange={e=>f('name',e.target.value)} autoFocus placeholder="Nome do usuário"/></div>
            </div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Gmail</div><input type="email" value={form.gmail} onChange={e=>f('gmail',e.target.value)} placeholder="usuario@gmail.com"/></div>
            </div>
            <div className="form-row full" style={{marginBottom:16}}>
              <div className="fg"><div className="flabel">Papel</div>
                <select value={form.role} onChange={e=>f('role',e.target.value)}>
                  <option value="admin">Admin (acesso total)</option>
                  <option value="viewer">Visualizador (somente leitura)</option>
                  <option value="mestre">Mestre de obra (só diário)</option>
                </select>
              </div>
            </div>

            <div style={{background:'#EEF4FF',border:'1px solid #C7D7FE',borderRadius:6,padding:'9px 12px',marginBottom:16,fontSize:11.5,color:'#1E40AF',lineHeight:1.5}}>
              <b><i className="ti ti-shield-lock" aria-hidden/> Como esta pessoa entra:</b> com este e-mail, pelo botão <b>Google</b> (se for conta Google) ou criando a própria <b>senha</b> no primeiro acesso. Só e-mails cadastrados aqui conseguem entrar.
            </div>

            {form.role!=='admin' && (
              <>
                <div className="form-row full" style={{marginBottom:10}}>
                  <div className="fg"><div className="flabel">Acesso às obras</div>
                    <select value={form.obra_scope} onChange={e=>f('obra_scope',e.target.value)}>
                      <option value="all">Todas as obras</option>
                      <option value="selected">Somente obras selecionadas</option>
                    </select>
                  </div>
                </div>
                {form.obra_scope==='selected' && (
                  <div style={{marginBottom:16,maxHeight:200,overflowY:'auto',border:'1px solid var(--border)',borderRadius:8,padding:8}}>
                    <div style={{fontSize:11,color:'var(--text3)',marginBottom:8}}>Marque as obras que este usuário pode ver ({form.client_ids.length} selecionada(s)):</div>
                    {clients.length===0 && <div style={{fontSize:12,color:'var(--text3)',padding:8}}>Nenhum cliente cadastrado.</div>}
                    {clients.map(c=>{
                      const id=String(c.id); const checked=form.client_ids.includes(id)
                      return (
                        <label key={c.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 6px',cursor:'pointer',borderRadius:6,background:checked?'var(--accent-lt)':'transparent'}}>
                          <input type="checkbox" checked={checked} onChange={()=>toggleObra(c.id)} style={{width:18,height:18}}/>
                          <span style={{fontSize:13}}>{c.name1}{c.name2?' & '+c.name2:''}{c.neighborhood?` · ${c.neighborhood}`:''}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
                {form.role==='mestre' && (
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:14,marginTop:-6}}>
                    <i className="ti ti-info-circle" aria-hidden/> O mestre vê apenas o diário das obras selecionadas e não edita dias anteriores.
                  </div>
                )}
              </>
            )}

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>{setShowModal(false);setEditId(null)}}>Cancelar</button>
              <button className="btn primary" onClick={()=>requirePIN(handleSave)}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {showPIN&&<PINModal
        onSuccess={()=>{setShowPIN(false);const a=pinAction;setPinAction(null);if(a){Promise.resolve(a()).catch(e=>{console.error(e);alert('Erro: '+e.message)})}}}
        onCancel={()=>{setShowPIN(false);setPinAction(null)}}/>}
    </>
  )
}
