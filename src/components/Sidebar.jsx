import { LOGO_MONO } from '../logos.js'
// v252 — AUDITORIA DOS RELATORIOS EXECUTADA (6 decisoes aprovadas) + VERSAO FABLE em tudo. (1) PDF completo nao duplica mais o Plano de Obra: capitulo inline morto, referencia textual, anexos com capa propria. (2) Plano de Obra fecha o servico do mestre: legenda mestre + Posicao/Altura por ambiente + Pontos Eletricos (caixa/altura) + Quantitativo de material. (3) Legenda mestre unica (NBR + pino RARO lado a lado, tipos usados) em todos os docs. (4) Executivo reordenado pra narrativa do contratante: Premissas, Automacao, Som, Seguranca, Rack, Planta Eletrica/WiFi, Teto, Cabeamento(ref)/Conduites, Equipamentos, Graficos, Observacoes. (5) Checklists e Alimentacao Keypads migraram pro Plano de Obra. (6) Divergencia grafico vs tabela vai pro validador (fila). FABLE: terceira versao editorial (papel creme #FAF5EC, tinta #131A2C, dourado #B0854C, Fraunces) em: relatorios (EXEC_CSS_FABLE, toggle Estilo), contrato (mesmas clausulas, pele nova), proposta (fableizeDoc sobre o novo) e apresentacao (opcao no seletor). Cores de DADO preservadas. Mantem v207-v251.

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
          v252 · build 2026-07
        </div>
      </div>
    </div>
  )
}
