import PINModal from './PINModal.jsx'
import { useState } from 'react'
import { saveAdmin, deleteAdmin , checkPINSession, setPINSession, verifyPIN } from '../db/supabase.js'

export default function Admins({ admins, clients=[], currentUser, onRefresh }) {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({name:'',gmail:'',role:'admin',client_id:''})
  const [showPIN, setShowPIN] = useState(false)
  const [pinAction, setPinAction] = useState(null)
  const f = (k,v) => setForm(p=>({...p,[k]:v}))

  function requirePIN(action) {
    if (checkPINSession()) { action(); return }
    setPinAction(()=>action); setShowPIN(true)
  }

  async function handleSave(){ await saveAdmin({...form}); setShowModal(false); onRefresh() }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-shield" aria-hidden/>Administradores</div>
        <div className="topbar-acts">
          <button className="btn primary" onClick={()=>requirePIN(()=>{setForm({name:'',gmail:'',role:'admin',client_id:''});setShowModal(true)})}>
            <i className="ti ti-plus" aria-hidden/>Novo admin
          </button>
        </div>
      </div>
      <div className="content">
        <div style={{background:'var(--amber-lt)',border:'1px solid var(--amber)',borderRadius:8,padding:'10px 14px',marginBottom:14,fontSize:12,color:'var(--amber)'}}>
          <i className="ti ti-alert-circle" style={{marginRight:6}} aria-hidden/>
          Somente os e-mails cadastrados aqui podem acessar o sistema. Não remova seu próprio e-mail.
        </div>
        <div className="section">
          <div className="sec-hdr"><div className="sec-title">{admins.length} administrador(es)</div></div>
          <table className="tbl">
            <thead><tr><th>Nome</th><th>Gmail</th><th>Papel</th><th></th></tr></thead>
            <tbody>
              {admins.map(a=>(
                <tr key={a.id}>
                  <td style={{fontWeight:500}}>
                    {a.name}
                    {a.gmail===currentUser?.gmail && <span className="badge b-blue" style={{fontSize:9,marginLeft:6}}>você</span>}
                  </td>
                  <td className="mono">{a.gmail}</td>
                  <td><span className="badge b-gray" style={{fontSize:10}}>{a.role}</span></td>
                  <td>
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
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">Novo administrador</div><button className="modal-close" onClick={()=>setShowModal(false)}>×</button></div>
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
                  <option value="viewer">Visualizador</option>
                  <option value="mestre">Mestre de obra (só diário)</option>
                </select>
              </div>
            </div>
            {form.role==='mestre' && (
              <div className="form-row full" style={{marginBottom:16}}>
                <div className="fg"><div className="flabel">Cliente / obra atribuída</div>
                  <select value={form.client_id||''} onChange={e=>f('client_id',e.target.value)}>
                    <option value="">— Selecione a obra —</option>
                    {(clients||[]).map(c=>(<option key={c.id} value={c.id}>{c.name1}{c.name2?' & '+c.name2:''}{c.neighborhood?' · '+c.neighborhood:''}</option>))}
                  </select>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:5}}>O mestre verá apenas o diário desta obra. Não acessa mais nada.</div>
                </div>
              </div>
            )}
            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>setShowModal(false)}>Cancelar</button>
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