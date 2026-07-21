import { useState, useCallback, useEffect } from 'react'
import Login from './components/Login.jsx'
import MestreView from './components/MestreView.jsx'
import NovoOrcamento from './components/NovoOrcamento.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import Proposals from './components/Proposals.jsx'
import ProposalBuilder from './components/ProposalBuilder.jsx'
import ProjetoExecutivo from './components/ProjetoExecutivo.jsx'
import Projects from './components/Projects.jsx'
import DiariosConsulta from './components/DiariosConsulta.jsx'
import Schedule from './components/Schedule.jsx'
import Stock from './components/Stock.jsx'
import Clients from './components/Clients.jsx'
import Catalog from './components/Catalog.jsx'
import Suppliers from './components/Suppliers.jsx'
import Tools from './components/Tools.jsx'
import Admins from './components/Admins.jsx'
import Reports from './components/Reports.jsx'
import AreaClientes from './components/AreaClientes.jsx'
import Financial from './components/Financial.jsx'
import Backup    from './components/Backup.jsx'
import { isDemoMode, loadDemoState, saveDemoState, resetDemo, DEMO_USER_OBJ } from './demo/demoMode.js'
import {
  getClients, getProposals, getProjects, getStock, getCatalog,
  getAdmins, getSuppliers, getTools, exportBackup, importBackup,
  auditedSave, addAuditLog, getIncompleteClients, signOutSeguro
} from './db/supabase.js'

const EMPTY = { clients:[], proposals:[], projects:[], stock:[], catalog:[], admins:[], suppliers:[], tools:[] }

// Modo demo: marca a flag global ANTES de qualquer chamada ao banco.
const DEMO = isDemoMode()
if (DEMO) { try { window.__RARO_DEMO__ = true } catch {} }

async function loadAll() {
  const [clients, proposals, projects, stock, catalog, admins, suppliers, tools] = await Promise.all([
    getClients(), getProposals(), getProjects(), getStock(),
    getCatalog(), getAdmins(), getSuppliers(), getTools()
  ])
  return { clients, proposals, projects, stock, catalog, admins, suppliers, tools }
}

function getSession() {
  try {
    const s = localStorage.getItem('raro_session')
    if (!s) return null
    const parsed = JSON.parse(s)
    if (Date.now() - parsed.at > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('raro_session')
      return null
    }
    return parsed
  } catch { return null }
}

// ── Gate do modo demo ─────────────────────────────────────────────────────────
// Exige usuário/senha simples para entrar em /demo. ATENÇÃO: é uma trava LEVE
// (client-side), só pra evitar acesso casual à demo pública. A senha fica no
// bundle; NÃO é autenticação real. Uma vez aprovado, fica marcado no localStorage
// (raro_demo_auth) pra não pedir de novo a cada reload.
const DEMO_GATE_USER = 'raro'
const DEMO_GATE_PASS = '@raro2026'
function demoGateOpen() { try { return localStorage.getItem('raro_demo_auth') === '1' } catch { return false } }

function DemoGate({ onOk }) {
  const [u, setU]     = useState('')
  const [p, setP]     = useState('')
  const [err, setErr] = useState('')
  function submit(e) {
    e.preventDefault()
    if (u.trim().toLowerCase() === DEMO_GATE_USER && p === DEMO_GATE_PASS) {
      try { localStorage.setItem('raro_demo_auth', '1') } catch {}
      onOk()
    } else {
      setErr('Usuário ou senha inválidos.')
    }
  }
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#060B1A',padding:20}}>
      <form onSubmit={submit} style={{width:'100%',maxWidth:360,background:'var(--surface,#0E1526)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:14,padding:'28px 26px',boxShadow:'0 12px 40px rgba(0,0,0,0.5)'}}>
        <div style={{textAlign:'center',marginBottom:18}}>
          <div style={{fontSize:11,letterSpacing:2,textTransform:'uppercase',color:'#7C8AA5',marginBottom:6}}>Demonstração</div>
          <div style={{fontSize:19,fontWeight:800,color:'#F0F6FF'}}>Acesso restrito</div>
          <div style={{fontSize:12,color:'#7C8AA5',marginTop:6}}>Informe usuário e senha para abrir a demonstração.</div>
        </div>
        <label style={{fontSize:11,color:'#9FB0C9',display:'block',marginBottom:4}}>Usuário</label>
        <input autoFocus value={u} onChange={e=>{setU(e.target.value); setErr('')}} placeholder="usuário"
          style={{width:'100%',padding:'10px 12px',marginBottom:12,borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',background:'#0A1120',color:'#F0F6FF',fontSize:14}}/>
        <label style={{fontSize:11,color:'#9FB0C9',display:'block',marginBottom:4}}>Senha</label>
        <input type="password" value={p} onChange={e=>{setP(e.target.value); setErr('')}} placeholder="senha"
          style={{width:'100%',padding:'10px 12px',marginBottom:err?8:16,borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',background:'#0A1120',color:'#F0F6FF',fontSize:14}}/>
        {err && <div style={{fontSize:12,color:'#F87171',marginBottom:14}}>{err}</div>}
        <button type="submit" className="btn primary" style={{width:'100%',justifyContent:'center',fontSize:14,padding:'11px'}}>
          Entrar na demonstração
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const [user, setUser]   = useState(DEMO ? (demoGateOpen() ? DEMO_USER_OBJ : null) : getSession)
  const [page, setPage]   = useState('dashboard')
  const [showAreaClientes, setShowAreaClientes] = useState(false)
  const [data, setData]   = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [editingProposal, setEditingProposal] = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      if (DEMO) { setData(loadDemoState().data) }
      else { setData(await loadAll()) }
    } finally { setLoading(false) }
  }, [])

  // Em modo demo, persiste as edições (só na localStorage demo) quando data muda.
  useEffect(() => {
    if (DEMO && data && data !== EMPTY) {
      const st = loadDemoState(); saveDemoState({ ...st, data })
    }
  }, [data])

  // Load data whenever user logs in
  useEffect(() => {
    if (user) refresh()
  }, [user])

  const [execSeed, setExecSeed] = useState(null)
  const [showNovo, setShowNovo] = useState(false)
  const [novoCtx, setNovoCtx] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [execFromProposal, setExecFromProposal] = useState(null)
  function generateExecFromProposal(p){ setExecFromProposal(p); setExecSeed(null); setNovoCtx(null); setPage('exec') }
  function nav(p) { setPage(p); if (p !== 'builder') setEditingProposal(null) }
  function newExec() { setPage('exec') }
  const [editIntent, setEditIntent] = useState(null)
  function editProposal(p, intent=null) { setEditingProposal(p); setEditIntent(intent); setPage('builder') }
  function newProposal()   { setEditingProposal(null); setPage('builder') }

  async function logout() {
    await addAuditLog({ module:'sistema', action:'logout', entity_name:user?.name, user_name:user?.name })
    await signOutSeguro()
    localStorage.removeItem('raro_session')
    try { localStorage.removeItem('raro_demo_auth') } catch {}  // demo: exige o gate de novo ao voltar
    setUser(null)
    setData(EMPTY)
  }

  // ── Logout automático por inatividade (30 min sem movimento) ──────────────────
  // Qualquer atividade (mouse, teclado, toque, scroll) zera o cronômetro. A cada
  // 30s conferimos; passou de 30 min sem interação → desloga.
  useEffect(() => {
    if (!user) return
    let last = Date.now()
    const bump = () => { last = Date.now() }
    const eventos = ['mousemove','mousedown','keydown','touchstart','scroll','click','wheel']
    eventos.forEach(e => window.addEventListener(e, bump, { passive:true }))
    const iv = setInterval(() => {
      if (Date.now() - last > 30 * 60 * 1000) { logout() }
    }, 30 * 1000)
    return () => { clearInterval(iv); eventos.forEach(e => window.removeEventListener(e, bump)) }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async ev => {
        await importBackup(ev.target.result)
        await refresh()
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const counts = {
    proposals:      data.proposals.filter(p=>p.status==='sent').length,
    projects:       data.projects.filter(p=>p.phase!=='done').length,
    stock_critical: data.stock.filter(s=>s.qty<=s.min_qty).length,
  }

  if (!user) {
    // Em /demo, gate leve de usuário/senha (não é auth real) antes de entrar.
    if (DEMO) return <DemoGate onOk={() => setUser(DEMO_USER_OBJ)} />
    return <Login onLogin={async u => {
      await addAuditLog({ module:'sistema', action:'login', entity_name:u.name, user_name:u.name })
      setUser(u)
    }} />
  }

  // Mestre de obra: vê apenas o diário da obra atribuída
  if (user.role === 'mestre') return <MestreView user={user} onLogout={logout} />

  // Área de Clientes — tela cheia, oculta todos os menus do app
  if (showAreaClientes) return <AreaClientes
    clients={data.clients} proposals={data.proposals} catalog={data.catalog}
    onRefresh={refresh} onClose={()=>setShowAreaClientes(false)} />


  return (
    <div className="app">
      {DEMO && (
        <div style={{position:'fixed',top:8,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:'linear-gradient(90deg,#B45309,#D97706)',color:'#fff',padding:'4px 12px',borderRadius:20,display:'flex',alignItems:'center',gap:8,fontSize:11,boxShadow:'0 2px 10px rgba(0,0,0,0.35)',maxWidth:'92vw',whiteSpace:'nowrap'}}>
          <i className="ti ti-eye" aria-hidden/>
          <b>Modo demonstração</b>
          <span style={{opacity:0.85,fontSize:10.5}}>dados fictícios</span>
          <button onClick={async()=>{ if(confirm('Reiniciar a demonstração? Todas as alterações de teste serão descartadas.')){
            try{ resetDemo() }catch{}
            // limpa service worker e caches: sem isso o reload pode servir o bundle antigo (sem as correções da demo)
            try{ if('serviceWorker' in navigator){ const rs=await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r=>r.unregister())) } }catch{}
            try{ if(window.caches){ const ks=await caches.keys(); await Promise.all(ks.map(k=>caches.delete(k))) } }catch{}
            window.location.reload(true)
          } }}
            style={{marginLeft:4,background:'rgba(255,255,255,0.2)',border:'1px solid rgba(255,255,255,0.5)',color:'#fff',borderRadius:12,padding:'2px 9px',fontSize:10.5,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
            <i className="ti ti-refresh" aria-hidden/> Reiniciar demo
          </button>
        </div>
      )}
      <Sidebar active={page} onNav={nav} counts={counts} user={user} onLogout={logout} onAreaClientes={()=>setShowAreaClientes(true)} />

      <div className="main">
        {/* Backup bar */}
        <div style={{background:'var(--surf)',borderBottom:'1px solid var(--border)',padding:'4px 16px',display:'flex',justifyContent:'flex-end',gap:8,flexShrink:0}}>
          <span style={{marginRight:'auto',fontSize:11,color:'var(--text3)',alignSelf:'center'}}>
            <i className="ti ti-database" style={{marginRight:4}} aria-hidden/>
            {loading ? '⟳ Carregando...' : (DEMO ? '🎭 Demonstração · dados fictícios (não salvos no sistema real)' : '☁ Dados salvos no Supabase')}
          </span>
          {!DEMO && <button className="btn" style={{fontSize:11,padding:'3px 9px'}} onClick={exportBackup}>
            <i className="ti ti-download" aria-hidden/>Exportar backup
          </button>}
          {!DEMO && <button className="btn" style={{fontSize:11,padding:'3px 9px'}} onClick={handleImport}>
            <i className="ti ti-upload" aria-hidden/>Importar backup
          </button>}
          <button className="btn" style={{fontSize:11,padding:'3px 9px'}} onClick={refresh} disabled={loading}>
            <i className="ti ti-refresh" aria-hidden/>Atualizar
          </button>
        </div>

        {loading && <div style={{padding:'40px',textAlign:'center',color:'var(--text3)',fontSize:13}}>
          <i className="ti ti-loader" style={{fontSize:20,animation:'spin 1s linear infinite',display:'block',margin:'0 auto 8px'}} aria-hidden/>
          Carregando dados...
        </div>}

        {!loading && <>
          {page==='dashboard'  && <Dashboard proposals={data.proposals} projects={data.projects} stock={data.stock} clients={data.clients} onNav={nav} />}
          {page==='proposals'  && <Proposals proposals={data.proposals} onRefresh={refresh} onEdit={editProposal} onNew={()=>setShowNovo(true)} onGenerateExec={generateExecFromProposal} onNewExec={newExec} currentUser={user} clients={data.clients} catalog={data.catalog} />}
          {page==='builder'    && <ProposalBuilder key={editingProposal?.id||'novo'} clients={data.clients} onRefresh={refresh} onSaved={(p)=>setEditingProposal(p)} editProposal={editingProposal} editIntent={editIntent} execSeed={execSeed} onGenerateExec={generateExecFromProposal} isAdmin={true} currentUser={user} />}
          {page==='exec'       && <ProjetoExecutivo catalog={data.catalog} clients={data.clients} currentUser={user}
            preClient={novoCtx?.client}
            fromProposal={execFromProposal}
            onClose={()=>{setExecFromProposal(null);setPage('proposals')}}
            onSaveToProposal={(seed)=>{ setExecSeed(seed); setEditingProposal(null); setPage('builder') }} />}
          {page==='projects'   && <Projects projects={data.projects} clients={data.clients} proposals={data.proposals} catalog={data.catalog} suppliers={data.suppliers} onRefresh={refresh} currentUser={user} />}
          {page==='diarios'    && <DiariosConsulta projects={data.projects} clients={data.clients} />}
          {page==='schedule'   && <Schedule projects={data.projects} />}
          {page==='stock'      && <Stock stock={data.stock} catalog={data.catalog} suppliers={data.suppliers} onRefresh={refresh} currentUser={user} />}
          {page==='clients'    && <Clients clients={data.clients} proposals={data.proposals} projects={data.projects} onRefresh={refresh} onEditProposal={p=>{editProposal(p)}} currentUser={user} />}
          {page==='catalog'    && <Catalog catalog={data.catalog} suppliers={data.suppliers} onRefresh={refresh} isAdmin={true} currentUser={user} />}
          {page==='suppliers'  && <Suppliers suppliers={data.suppliers} onRefresh={refresh} />}
          {page==='tools'      && <Tools tools={data.tools} onRefresh={refresh} />}
          {page==='admins'     && <Admins admins={data.admins} clients={data.clients} currentUser={user} onRefresh={refresh} />}
          {page==='financial'  && <Financial proposals={data.proposals} projects={data.projects} suppliers={data.suppliers} />}
          {page==='backup'     && <Backup />}
          {page==='reports'    && <Reports projects={data.projects} proposals={data.proposals} stock={data.stock} clients={data.clients} currentUser={user} />}
        </>}
      </div>

      {showNovo && <NovoOrcamento clients={data.clients}
        onClose={()=>setShowNovo(false)}
        onChoose={({type,client})=>{
          setShowNovo(false)
          setNovoCtx({client})
          if(type==='executivo'){ setExecSeed(null); setPage('exec') }
          else { setEditingProposal(client?{client_name:`${client.name1}${client.name2?' & '+client.name2:''}`, client_id:client.id}:null); setExecSeed(null); setPage('builder') }
        }} />}

      {/* Bottom tab bar — só no celular */}
      <nav className="mobile-tabbar">
        <button className={page==='dashboard'?'active':''} onClick={()=>nav('dashboard')}>
          <i className="ti ti-layout-dashboard" aria-hidden/><span>Início</span>
        </button>
        <button className={page==='proposals'||page==='builder'||page==='exec'?'active':''} onClick={()=>nav('proposals')}>
          <i className="ti ti-file-invoice" aria-hidden/><span>Orçamentos</span>
        </button>
        <button className={page==='projects'?'active':''} onClick={()=>nav('projects')}>
          <i className="ti ti-briefcase" aria-hidden/><span>Projetos</span>
        </button>
        <button className={page==='clients'?'active':''} onClick={()=>nav('clients')}>
          <i className="ti ti-users" aria-hidden/><span>Clientes</span>
        </button>
        <button className={mobileMenu?'active':''} onClick={()=>setMobileMenu(true)}>
          <i className="ti ti-menu-2" aria-hidden/><span>Menu</span>
        </button>
      </nav>

      {mobileMenu && (
        <div className="mobile-menu-sheet" onClick={()=>setMobileMenu(false)}>
          <div className="mobile-menu-card" onClick={e=>e.stopPropagation()}>
            <div className="mmenu-handle"/>
            <div className="mmenu-user">
              <div className="mmenu-avatar">{(user.name||'U')[0].toUpperCase()}</div>
              <div><div style={{fontWeight:600,fontSize:14}}>{user.name}</div><div style={{fontSize:11,color:'var(--text3)'}}>{user.role==='admin'?'Administrador':user.role}</div></div>
            </div>
            <div className="mmenu-grid">
              {[['dashboard','ti-layout-dashboard','Dashboard'],['proposals','ti-file-invoice','Orçamentos'],['projects','ti-briefcase','Projetos'],['diarios','ti-notebook','Diários'],['clients','ti-users','Clientes'],['catalog','ti-package','Catálogo'],['stock','ti-box','Estoque'],['financial','ti-coin','Financeiro'],['schedule','ti-calendar','Cronograma'],['suppliers','ti-truck','Fornecedores'],['admins','ti-user-shield','Usuários']].map(([k,ic,lb])=>(
                <button key={k} onClick={()=>{nav(k);setMobileMenu(false)}} className="mmenu-item">
                  <i className={`ti ${ic}`} aria-hidden/><span>{lb}</span>
                </button>
              ))}
              <button onClick={()=>{setShowAreaClientes(true);setMobileMenu(false)}} className="mmenu-item" style={{color:'#C9A268'}}>
                <i className="ti ti-presentation-analytics" aria-hidden/><span>Área de Clientes</span>
              </button>
            </div>
            <button className="mmenu-logout" onClick={logout}>
              <i className="ti ti-logout" aria-hidden/> Sair
            </button>
            <div style={{textAlign:'center',fontSize:10,color:'var(--text3)',marginTop:10,fontFamily:'monospace'}}>v363 · build 2026-07</div>
          </div>
        </div>
      )}
    </div>
  )
}

