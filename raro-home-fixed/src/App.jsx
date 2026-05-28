import { useState, useCallback, useEffect } from 'react'
import Login from './components/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import Dashboard from './components/Dashboard.jsx'
import Proposals from './components/Proposals.jsx'
import ProposalBuilder from './components/ProposalBuilder.jsx'
import Projects from './components/Projects.jsx'
import Schedule from './components/Schedule.jsx'
import Stock from './components/Stock.jsx'
import Clients from './components/Clients.jsx'
import Catalog from './components/Catalog.jsx'
import Suppliers from './components/Suppliers.jsx'
import Tools from './components/Tools.jsx'
import Admins from './components/Admins.jsx'
import Reports from './components/Reports.jsx'
import {
  getClients, getProposals, getProjects, getStock, getCatalog,
  getAdmins, getSuppliers, getTools, exportBackup, importBackup, auditedSave, addAuditLog, getIncompleteClients
} from './db/database.js'

function loadAll() {
  return {
    clients:   getClients(),
    proposals: getProposals(),
    projects:  getProjects(),
    stock:     getStock(),
    catalog:   getCatalog(),
    admins:    getAdmins(),
    suppliers: getSuppliers(),
    tools:     getTools(),
  }
}

function getSession() {
  try {
    const s = localStorage.getItem('raro_session')
    if (!s) return null
    const parsed = JSON.parse(s)
    // Session valid for 30 days
    if (Date.now() - parsed.at > 30 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem('raro_session')
      return null
    }
    return parsed
  } catch { return null }
}

export default function App() {
  const [user, setUser]   = useState(getSession)
  const [page, setPage]   = useState('dashboard')
  const [data, setData]   = useState(loadAll)
  const [editingProposal, setEditingProposal] = useState(null)

  const refresh = useCallback(() => setData(loadAll()), [])

  function nav(p) { setPage(p); if (p !== 'builder') setEditingProposal(null) }
  function editProposal(p) { setEditingProposal(p); setPage('builder') }
  function newProposal()   { setEditingProposal(null); setPage('builder') }

  function logout() {
    addAuditLog({ module:'sistema', action:'logout', entity_name: user?.name, user: user?.name })
    localStorage.removeItem('raro_session')
    setUser(null)
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        const ok = importBackup(ev.target.result)
        if (ok) { refresh(); alert('Backup restaurado com sucesso!') }
        else alert('Arquivo inválido.')
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

  if (!user) return <Login onLogin={u => { addAuditLog({ module:'sistema', action:'login', entity_name:u.name, user:u.name }); setUser(u) }} />

  return (
    <div className="app">
      <Sidebar active={page} onNav={nav} counts={counts} user={user} onLogout={logout} />

      <div className="main">
        {/* Backup bar */}
        <div style={{background:'var(--surf)',borderBottom:'1px solid var(--border)',padding:'4px 16px',display:'flex',justifyContent:'flex-end',gap:8,flexShrink:0}}>
          <span style={{marginRight:'auto',fontSize:11,color:'var(--text3)',alignSelf:'center'}}>
            <i className="ti ti-database" style={{marginRight:4}} aria-hidden/>Dados salvos localmente no navegador
          </span>
          <button className="btn" style={{fontSize:11,padding:'3px 9px'}} onClick={exportBackup}>
            <i className="ti ti-download" aria-hidden/>Exportar backup
          </button>
          <button className="btn" style={{fontSize:11,padding:'3px 9px'}} onClick={handleImport}>
            <i className="ti ti-upload" aria-hidden/>Importar backup
          </button>
        </div>

        {page==='dashboard'  && <Dashboard proposals={data.proposals} projects={data.projects} stock={data.stock} clients={data.clients} onNav={nav} />}
        {page==='proposals'  && <Proposals proposals={data.proposals} onRefresh={refresh} onEdit={editProposal} onNew={newProposal} currentUser={user} />}
        {page==='builder'    && <ProposalBuilder clients={data.clients} onRefresh={refresh} editProposal={editingProposal} isAdmin={true} currentUser={user} />}
        {page==='projects'   && <Projects projects={data.projects} clients={data.clients} onRefresh={refresh} currentUser={user} />}
        {page==='schedule'   && <Schedule projects={data.projects} />}
        {page==='stock'      && <Stock stock={data.stock} suppliers={data.suppliers} onRefresh={refresh} currentUser={user} />}
        {page==='clients'    && <Clients clients={data.clients} proposals={data.proposals} projects={data.projects} onRefresh={refresh} onEditProposal={p=>{editProposal(p);}} currentUser={user} />}
        {page==='catalog'    && <Catalog catalog={data.catalog} suppliers={data.suppliers} onRefresh={refresh} isAdmin={true} />}
        {page==='suppliers'  && <Suppliers suppliers={data.suppliers} onRefresh={refresh} />}
        {page==='tools'      && <Tools tools={data.tools} onRefresh={refresh} />}
        {page==='admins'     && <Admins admins={data.admins} currentUser={user} onRefresh={refresh} />}
        {page==='reports'    && <Reports projects={data.projects} proposals={data.proposals} stock={data.stock} clients={data.clients} currentUser={user} />}
      </div>
    </div>
  )
}
