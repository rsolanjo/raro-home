import { LOGO_MONO } from '../logos.js'
import { brandName, brandSub, brandLogoMono } from '../brand.js'
// v267 — Base v266 (reset de senha, Fable, etc.) + tudo que foi feito hoje, agora na linha certa: (1) MODO DEMO /demo isolado (white label 'Sua Empresa', dataset fake Marina e Thiago, escrita só em localStorage demo, banner e reset, marca d'água DEMONSTRAÇÃO em todos os relatórios). (2) Filtros de SEÇÃO do Plano de Obra (ocultar Lista Geral, Quadro de Cargas, Caixas de Embutir, Pontos: caixas e alturas, Alimentação dos Keypads). (3) Formatação: seções de tabela fluem, só plantas forçam página nova (menos espaço em branco, plantas preservadas). (4) Trava 'Editar' on/off no mobile do editor (começa travado no celular). (5) SUBWOOFER com cabo duplo S+E no pin, tabela e legenda. NOTA: as v235-v238 foram feitas por engano numa base antiga (v234); esta v267 consolida tudo em cima da v266 real.
// v266 — RESET DE SENHA (so admin dispara). Na tela Usuarios, cada linha ganha botao de chave (ti-key) visivel SO se currentUser.role==='admin', entre editar e excluir, protegido por PIN. Admin clica, confirma, e o Supabase envia e-mail de recuperacao pra pessoa (dispararResetSenha -> resetPasswordForEmail). SEGURANCA: admin NAO ve nem define a senha alheia (Supabase nao permite, bcrypt); ele so destrava, a pessoa cria a nova. CICLO COMPLETO: quando a pessoa clica no link do e-mail e volta ao RARO, o Login detecta (evento PASSWORD_RECOVERY do onAuthStateChange, ou hash type=recovery na URL) e mostra tela 'Crie sua nova senha' (definirNovaSenha -> updateUser); apos salvar, resolve sessao e entra. Funcoes novas no supabase.js: dispararResetSenha, definirNovaSenha. Fontes: supabase.com/docs/reference/javascript/auth-resetpasswordforemail, .../auth-onauthstatechange, .../auth-updateuser. Base: v265.

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
          v267 · build 2026-07
        </div>
      </div>
    </div>
  )
}
