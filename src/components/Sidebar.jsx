import { LOGO_MONO } from '../logos.js'
// v202 — Projeto Executivo, 2 correções pós-v201: (1) Planta Geral do cap.2 vinha SEM a imagem da planta no PDF — havia um <svg> vazio sobreposto à imagem (position:absolute, 100%x100%) que sumia com ela na impressão; removido, e markup alinhado com a Planta de Pontos (que funciona). (2) Pinos das plantas de 'todos os itens' (Planta Geral cap.2, plantas por família, Visão Completa) agora usam a COR DA CATEGORIA via EQUIP_STYLE[equipType(name)] — keypad verde, câmera vermelha, AP/Wi-Fi teal, som magenta, etc. — em vez do navy único que o v199 tinha posto (o 'preto e branco' que a Ful apontou). Rack (roxo), caixa (azul) e prumada (roxo) seguem com suas cores. Mantém v201 (PDF contínuo como na tela) e anteriores.

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
        <img src={LOGO_MONO} alt="RARO Home" style={{height:46,width:46,borderRadius:8,objectFit:'contain'}} />
        <div>
          <div className="sb-brand">RARO Home</div>
          <div className="sb-sub">Automação Residencial</div>
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
          v202 · build 2026-06
        </div>
      </div>
    </div>
  )
}
