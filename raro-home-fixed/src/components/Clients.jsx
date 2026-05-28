import PINModal from './PINModal.jsx'
import { useState } from 'react'
import { saveClient, deleteClient, auditedSave, checkPINSession, setPINSession, verifyPIN } from '../db/database.js'

const RAPHAEL = '+5521996278553'
const ROGERIO  = '+5521981709009'

function waGroupLink(name1, name2, neighborhood, phones, withClients = true) {
  const groupName = withClients
    ? `${name1} e ${name2} - ${neighborhood} - [ RaRo Home ]`
    : `Obra ${name1} e ${name2} - ${neighborhood} - [ RaRo Home ]`
  const nums = withClients
    ? [phones[0], phones[1], RAPHAEL, ROGERIO].filter(Boolean)
    : [RAPHAEL, ROGERIO]
  const text = encodeURIComponent(`Olá! Bem-vindos ao grupo *${groupName}* 🏠`)
  return `https://wa.me/${nums[0]}?text=${text}`
}

function cleanPhone(p) {
  return p ? p.replace(/\D/g, '') : ''
}

const empty = () => ({
  name1:'', name2:'', full_name1:'', full_name2:'',
  phone1:'', phone2:'', email:'', neighborhood:'', city:'',
  housing_type:'Casa', total_rooms:'', area_m2:'', notes:'',
  wa_group_clients:'', wa_group_obra:'', plant_file:null,
})

export default function Clients({ clients, proposals, projects, onRefresh, onEditProposal, currentUser }) {
  const [showModal, setShowModal] = useState(false)
  const [showPIN, setShowPIN] = useState(false)
  const [pinAction, setPinAction] = useState(null)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState(empty())

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const filtered = clients.filter(c =>
    !search ||
    `${c.name1} ${c.name2} ${c.neighborhood} ${c.full_name1} ${c.full_name2}`
      .toLowerCase().includes(search.toLowerCase())
  )

  function requirePIN(action) {
    if (checkPINSession()) { action(); return }
    setPinAction(()=>action); setShowPIN(true)
  }
  function openNew()   { requirePIN(()=>{ setEditing(null); setForm(empty()); setShowModal(true) }) }
  function openEdit(c) { requirePIN(()=>{ setEditing(c); setForm({...c}); setShowModal(true) }) }

  function handleSave() {
    const item = { ...form, total_rooms: Number(form.total_rooms)||0, area_m2: Number(form.area_m2)||0 }
    const before = editing ? clients.find(c=>c.id===editing.id) : null
    saveClient(item)
    auditedSave('clientes', editing?'update':'create', item, currentUser?.name||'Sistema', before)
    setShowModal(false); onRefresh()
  }

  function handlePlant(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => f('plant_file', { name: file.name, data: ev.target.result, type: file.type })
    reader.readAsDataURL(file)
  }

  function clientTotal(id) {
    return proposals.filter(p => p.client_id === id && p.status === 'approved')
      .reduce((s, p) => {
        const eq = (p.floors||[]).flatMap(f=>f.rooms||[]).reduce((rs,r)=>rs+(r.price||0),0)
        return s + eq + (p.labor||0)
      }, 0)
  }

  function openWA(phone, msg='') {
    const n = cleanPhone(phone)
    window.open(`https://wa.me/${n.startsWith('55')?n:'55'+n}${msg?'?text='+encodeURIComponent(msg):''}`, '_blank')
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title"><i className="ti ti-users" aria-hidden/>Clientes</div>
        <div className="topbar-acts">
          <button className="btn primary" onClick={openNew}><i className="ti ti-plus" aria-hidden/>Novo cliente</button>
        </div>
      </div>
      <div className="content">
        <div className="section">
          <div className="sec-hdr">
            <div className="sec-title">Todos os clientes</div>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Buscar nome, bairro..." style={{width:220,padding:'5px 9px',fontSize:12}}/>
          </div>
          <table className="tbl">
            <thead><tr>
              <th>Casal</th><th>Contato</th><th>Moradia</th>
              <th>Projetos</th><th>Orçamentos</th><th>Valor</th><th>WhatsApp</th><th>Ações</th>
            </tr></thead>
            <tbody>
              {filtered.length===0 && <tr><td colSpan={7} style={{textAlign:'center',padding:20,color:'var(--text3)'}}>Nenhum cliente</td></tr>}
              {filtered.map(c => {
                const total = clientTotal(c.id)
                const activeProj = projects.find(p=>p.client_id===c.id&&p.phase!=='done')
                return <tr key={c.id}>
                  <td>
                    <div style={{fontWeight:600}}>{c.name1} & {c.name2}</div>
                    <div className="sub">{c.full_name1} · {c.full_name2}</div>
                    <div className="sub">{c.neighborhood}{c.city?', '+c.city:''}</div>
                  </td>
                  <td>
                    <div style={{fontSize:12}}>{c.phone1}</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{c.phone2}</div>
                    <div className="sub">{c.email}</div>
                  </td>
                  <td>
                    <span className="badge b-gray" style={{fontSize:10}}>{c.housing_type}</span>
                    <div className="sub">{c.total_rooms} cômodos{c.area_m2?` · ${c.area_m2}m²`:''}</div>
                  </td>
                  <td>
                    {activeProj
                      ? <span className="badge b-blue" style={{fontSize:10}}>1 ativo</span>
                      : <span className="badge b-gray" style={{fontSize:10}}>—</span>}
                  </td>
                  <td style={{color:total>0?'var(--accent)':'var(--text3)',fontWeight:total>0?500:400}}>
                    {total>0?`R$ ${Math.round(total).toLocaleString('pt-BR')}`:'—'}
                  </td>
                  <td>
                    <div style={{display:'flex',flexDirection:'column',gap:4}}>
                      {/* WhatsApp direto */}
                      <button className="btn" style={{fontSize:10,padding:'3px 7px',color:'#16A34A',borderColor:'#16A34A'}}
                        onClick={()=>openWA(c.phone1)}>
                        <i className="ti ti-brand-whatsapp" aria-hidden/>WA {c.name1}
                      </button>
                      {c.phone2 && (
                        <a href={`https://wa.me/${(c.phone2||'').replace(/\D/g,'').replace(/^(?!55)/,'55')}`} target="_blank" rel="noreferrer">
                          <button className="btn" style={{fontSize:10,padding:'3px 7px',color:'#16A34A',borderColor:'#16A34A'}}>
                            <i className="ti ti-brand-whatsapp" aria-hidden/>WA {c.name2}
                          </button>
                        </a>
                      )}
                      {/* Link grupo clientes */}
                      {c.wa_group_clients
                        ? <button className="btn" style={{fontSize:10,padding:'3px 7px',color:'#16A34A',borderColor:'#16A34A'}}
                            onClick={()=>window.open(c.wa_group_clients,'_blank')}>
                            <i className="ti ti-users" aria-hidden/>Grupo clientes
                          </button>
                        : <button className="btn" style={{fontSize:10,padding:'3px 7px'}}
                            onClick={()=>openEdit(c)} title="Salvar link do grupo nos dados do cliente">
                            <i className="ti ti-plus" aria-hidden/>Criar grupo
                          </button>}
                      {/* Link grupo obra */}
                      {c.wa_group_obra
                        ? <button className="btn" style={{fontSize:10,padding:'3px 7px'}}
                            onClick={()=>window.open(c.wa_group_obra,'_blank')}>
                            <i className="ti ti-tool" aria-hidden/>Grupo obra
                          </button>
                        : null}
                    </div>
                  </td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      <button className="btn" style={{fontSize:11,padding:'3px 8px'}} onClick={()=>openEdit(c)}><i className="ti ti-edit" aria-hidden/></button>
                      <button className="btn danger" style={{fontSize:11,padding:'3px 8px'}}
                        onClick={()=>{if(confirm('Excluir cliente?')){deleteClient(c.id);onRefresh()}}}>
                        <i className="ti ti-trash" aria-hidden/>
                      </button>
                    </div>
                  </td>
                </tr>
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal" style={{width:580,maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><div className="modal-title">{editing?'Editar cliente':'Novo cliente'}</div><button className="modal-close" onClick={()=>setShowModal(false)}>×</button></div>

            {/* Nomes do casal */}
            <div style={{background:'var(--surf)',borderRadius:8,padding:'12px 14px',marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--accent)',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>
                Dados do casal
              </div>
              <div className="form-row">
                <div className="fg"><div className="flabel">Primeiro nome (cônjuge 1)</div>
                  <input value={form.name1} onChange={e=>f('name1',e.target.value)} placeholder="ex: Teo" autoFocus/>
                </div>
                <div className="fg"><div className="flabel">Primeiro nome (cônjuge 2)</div>
                  <input value={form.name2} onChange={e=>f('name2',e.target.value)} placeholder="ex: Lina"/>
                </div>
              </div>
              <div className="form-row">
                <div className="fg"><div className="flabel">Nome completo (cônjuge 1)</div>
                  <input value={form.full_name1} onChange={e=>f('full_name1',e.target.value)} placeholder="Nome completo"/>
                </div>
                <div className="fg"><div className="flabel">Nome completo (cônjuge 2)</div>
                  <input value={form.full_name2} onChange={e=>f('full_name2',e.target.value)} placeholder="Nome completo"/>
                </div>
              </div>
              <div className="form-row">
                <div className="fg"><div className="flabel">WhatsApp cônjuge 1</div>
                  <input value={form.phone1} onChange={e=>f('phone1',e.target.value)} placeholder="(21) 99999-0000"/>
                </div>
                <div className="fg"><div className="flabel">WhatsApp cônjuge 2</div>
                  <input value={form.phone2} onChange={e=>f('phone2',e.target.value)} placeholder="(21) 99999-0001"/>
                </div>
              </div>
            </div>

            {/* Localização */}
            <div className="form-row">
              <div className="fg"><div className="flabel">Bairro</div>
                <input value={form.neighborhood} onChange={e=>f('neighborhood',e.target.value)} placeholder="ex: Recreio"/>
              </div>
              <div className="fg"><div className="flabel">Cidade</div>
                <input value={form.city} onChange={e=>f('city',e.target.value)} placeholder="ex: Rio de Janeiro"/>
              </div>
            </div>

            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">E-mail</div>
                <input type="email" value={form.email} onChange={e=>f('email',e.target.value)} placeholder="email@exemplo.com"/>
              </div>
            </div>

            {/* Moradia */}
            <div className="form-row">
              <div className="fg"><div className="flabel">Tipo de moradia</div>
                <select value={form.housing_type} onChange={e=>f('housing_type',e.target.value)}>
                  <option>Casa</option><option>Apartamento</option><option>Cobertura</option>
                  <option>Sítio / Chácara</option><option>Comercial</option>
                </select>
              </div>
              <div className="fg"><div className="flabel">Total de cômodos</div>
                <input type="number" min="1" value={form.total_rooms} onChange={e=>f('total_rooms',e.target.value)} placeholder="ex: 12"/>
              </div>
            </div>
            <div className="form-row full" style={{marginBottom:12}}>
              <div className="fg"><div className="flabel">Área total (m²)</div>
                <input type="number" value={form.area_m2} onChange={e=>f('area_m2',e.target.value)} placeholder="ex: 280"/>
              </div>
            </div>

            {/* Planta */}
            <div style={{marginBottom:12}}>
              <div className="flabel" style={{marginBottom:5}}>Upload da planta</div>
              <input type="file" accept=".pdf,image/*" onChange={handlePlant}
                style={{fontSize:12,color:'var(--text2)'}}/>
              {form.plant_file && (
                <div style={{marginTop:6,fontSize:11,color:'var(--green)',display:'flex',alignItems:'center',gap:6}}>
                  <i className="ti ti-file" aria-hidden/>{form.plant_file.name}
                  {form.plant_file.type?.startsWith('image') && (
                    <img src={form.plant_file.data} alt="planta" style={{height:40,borderRadius:4,marginLeft:8}}/>
                  )}
                </div>
              )}
            </div>

            {/* WhatsApp groups */}
            <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'12px 14px',marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:'#15803D',letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>
                <i className="ti ti-brand-whatsapp" aria-hidden style={{marginRight:4}}/>Grupos WhatsApp
              </div>
              {/* Preview do nome dos grupos */}
              {(form.name1||form.name2) && (
                <div style={{marginBottom:10,fontSize:11,background:'#fff',borderRadius:6,padding:'8px 10px'}}>
                  <div style={{color:'#15803D',fontWeight:500}}>Grupo clientes:</div>
                  <div style={{color:'var(--text2)',fontFamily:'monospace',fontSize:11}}>
                    {form.name1||'Nome1'} e {form.name2||'Nome2'} - {form.neighborhood||'Bairro'} - [ RaRo Home ]
                  </div>
                  <div style={{color:'#15803D',fontWeight:500,marginTop:6}}>Grupo obra:</div>
                  <div style={{color:'var(--text2)',fontFamily:'monospace',fontSize:11}}>
                    Obra {form.name1||'Nome1'} e {form.name2||'Nome2'} - {form.neighborhood||'Bairro'} - [ RaRo Home ]
                  </div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>
                    Membros clientes: {form.name1} ({form.phone1||'—'}), {form.name2} ({form.phone2||'—'}), Raphael, Rogério
                  </div>
                </div>
              )}
              <div className="fg" style={{marginBottom:8}}>
                <div className="flabel">Link do grupo de clientes (wa.me)</div>
                <div style={{display:'flex',gap:6}}>
                  <input value={form.wa_group_clients||''} onChange={e=>f('wa_group_clients',e.target.value)}
                    placeholder="Cole o link do grupo após criar no WhatsApp..." style={{flex:1}}/>
                  {form.wa_group_clients && (
                    <a href={form.wa_group_clients} target="_blank" rel="noreferrer">
                      <button className="btn" style={{fontSize:11}}><i className="ti ti-external-link" aria-hidden/></button>
                    </a>
                  )}
                </div>
              </div>
              <div className="fg">
                <div className="flabel">Link do grupo de obra (wa.me)</div>
                <div style={{display:'flex',gap:6}}>
                  <input value={form.wa_group_obra||''} onChange={e=>f('wa_group_obra',e.target.value)}
                    placeholder="Cole o link do grupo de obra..." style={{flex:1}}/>
                  {form.wa_group_obra && (
                    <a href={form.wa_group_obra} target="_blank" rel="noreferrer">
                      <button className="btn" style={{fontSize:11}}><i className="ti ti-external-link" aria-hidden/></button>
                    </a>
                  )}
                </div>
              </div>
              <div style={{fontSize:10,color:'#6B7280',marginTop:8,lineHeight:1.6}}>
                💡 Para criar: abra o WhatsApp no celular → Nova conversa → Novo grupo → adicione os números → use o nome acima. Depois copie o link de convite e cole aqui.
              </div>
            </div>

            <div className="form-row full" style={{marginBottom:16}}>
              <div className="fg"><div className="flabel">Notas</div>
                <textarea value={form.notes} onChange={e=>f('notes',e.target.value)}
                  placeholder="Observações..." rows={3}/>
              </div>
            </div>

            <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
              <button className="btn" onClick={()=>setShowModal(false)}>Cancelar</button>
              <button className="btn primary" onClick={handleSave}>Salvar</button>
            </div>
          </div>
        </div>
      )}
      {showPIN && <PINModal message="Digite o PIN para editar clientes."
        onSuccess={()=>{ setShowPIN(false); if(pinAction){ pinAction(); setPinAction(null) } }}
        onCancel={()=>{ setShowPIN(false); setPinAction(null) }} />}
    </>
  )
}
