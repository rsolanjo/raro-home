import { LOGO_MONO } from '../logos.js'
// v238 — (1) SUBWOOFER com cabo duplo em todo o app: pin ganha dois selos (S de som/RCA de sinal + E de elétrica), a tabela de Som marca o item com selo S+E e a coluna Cabo mostra 'RCA de sinal + elétrica', legenda explica o caso. Caixa de som de teto comum segue só com S. (2) MODO DEMO white label: em /demo a interface mostra 'Sua Empresa' e um logo neutro (placeholder 'Seu Logo'), via src/brand.js. (3) Relatórios/PDFs gerados no demo (executivo, contrato, apresentação, proposta) saem com marca d'água gigante 'DEMONSTRAÇÃO'. O parceiro cria o próprio projeto no demo (o Marina e Thiago fica de exemplo). Mantém v207-v237.
// v237 — MODO DEMONSTRAÇÃO para parceiros na rota /demo. Isolado por design: em /demo o app entra sem login (usuário 'Parceiro'), carrega um dataset 100% fictício (cliente Marina e Thiago Andrade, casa demo com ambientes/pontos, proposta, contrato, financeiro fake) e TODA leitura/escrita fica em localStorage isolada (raro_demo_*). Nenhuma gravação chega ao Supabase real (guard window.__RARO_DEMO__ em upsert/del/saveProposal/deleteProposal/addAuditLog e no finance_ledger do CaixaRaro), então nada do real (clientes, catálogo, valores) é carregado nem exposto. O parceiro pode editar tudo; botão 'Reiniciar demo' zera. Banner âmbar fixo no topo. Rewrite do Vercel já cobre /demo. Mantém v207-v236.

export default function Sidebar({ active, onNav, counts, user, onLogout, onAreaClientes }) {
  const item = (id, icon, label, badge, badgeCls='warn') => (
    <div className={`sb-item${active===id?' active':''}`} onClick={()=>onNav(id)}>
      <i className={`ti ti-${icon}`} aria-hidden />
      <span className="sb-label">{label}</span>
      {badge>0 && <span className={`sb-badge ${badgeCls}`}>{badge}</span>}
    </div>
  )
  return (
    <div className="sidebar">
      {/* Logo — hidden on mobile */}
      <div className="sb-logo">
        <img src={brandLogoMono()} alt={brandName()} style={{height:46,width:46,borderRadius:8,objectFit:'contain'}} />
        <div>
          <div className="sb-brand">{brandName()}</div>
          <div className="sb-sub">{brandSub()}</div>
        </div>
      </div>

      <div className="sb-section">Menu</div>
      {item('dashboard','layout-dashboard','Dashboard')}
      {item('financial','coin','Financeiro')}
      {item('reports','chart-bar','Relatórios')}
      {item('proposals','file-invoice','Orçamentos',counts.proposals)}
      {item('projects','layout-kanban','Projetos',counts.projects,'ok')}
      {item('diarios','notebook','Diários')}
      {item('schedule','calendar-event','Cronograma')}

      <div className="sb-item" onClick={onAreaClientes} style={{color:'#E8CFA0'}}>
        <i className="ti ti-presentation-analytics" aria-hidden />
        <span className="sb-label">Área de Clientes</span>
      </div>

      <div className="sb-section">Sistema</div>
      {item('backup','database-export','Backup & Restore')}
      <div className="sb-section">Cadastros</div>
      {item('clients','users','Clientes')}
      {item('catalog','list-details','Catálogo')}
      {item('stock','box','Estoque',counts.stock_critical)}
      {item('suppliers','truck','Fornecedores')}
      {item('tools','tools','Ferramentas')}
      {item('admins','shield','Admins')}

      {/* Footer — hidden on mobile */}
      <div className="sb-footer" style={{padding:'12px 16px'}}>
        <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',display:'flex',alignItems:'center',gap:6,paddingBottom:10,borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
          <i className="ti ti-user" style={{fontSize:13,flexShrink:0}} aria-hidden />{user?.name}
        </div>
        <button onClick={onLogout} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.28)',cursor:'pointer',fontSize:11,padding:'10px 0 0 0',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6,marginLeft:0,width:'100%'}}>
          <i className="ti ti-logout" style={{fontSize:13}} aria-hidden />Sair
        </button>
        <div style={{fontSize:9,color:'rgba(255,255,255,0.2)',marginTop:8,fontFamily:'monospace'}}>
          v238 · build 2026-07
        </div>
      </div>
    </div>
  )
}
