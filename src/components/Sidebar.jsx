import { LOGO_MONO } from '../logos.js'
// v265 — LOGIN SEGURO (profissional, verificacao no servidor). Substitui o login antigo que so pedia e-mail (qualquer um que soubesse um e-mail cadastrado entrava, sem senha, verificacao no navegador = furado). Agora via Supabase Auth: (1) senha com bcrypt verificada NO SERVIDOR, (2) botao Entrar com Google (OAuth), (3) primeiro acesso pra pessoa criar a propria senha. TRAVA DA LISTA: mesmo com Google/senha valida, so entra quem esta na tabela admins (findAdminByEmail; se nao esta, signOut). Mantidos os 3 papeis existentes (admin/viewer/mestre). RLS no banco (SUPABASE_LOGIN_SEGURO.sql): liga row level security em todas as tabelas, politica base 'so authenticated acessa' (tranca a porta sem prender por dentro, nao quebra telas; apertar por papel numa 2a rodada). Logout agora chama signOutSeguro (encerra sessao no servidor de verdade, antes so limpava localStorage). Tela Admins ganha aviso de como a pessoa entra. Funcoes novas no supabase.js: signInEmailSenha, signInGoogle, resolveSessao, signOutSeguro, criarAcessoComSenha, findAdminByEmail. Guia COMO-ATIVAR-LOGIN-SEGURO.md (ativar Email provider, Google OAuth no Google Cloud, rodar o SQL). Fontes: supabase.com/docs/guides/auth (bcrypt/JWT), .../row-level-security, .../social-login/auth-google, developers.google.com/identity. Base: v264.

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
          v265 · build 2026-07
        </div>
      </div>
    </div>
  )
}
