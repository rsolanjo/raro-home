import { LOGO_MONO } from '../logos.js'
import { brandName, brandSub, brandLogoMono, isDemo } from '../brand.js'
// v275 — DEMO: gate de acesso em /demo — pede usuário/senha (raro / @raro2026) antes de abrir a demonstração (trava LEVE client-side, não é auth real; senha fica no bundle). Aprovação fica em localStorage (raro_demo_auth); "Sair" limpa e exige o gate de novo. Componente DemoGate no App.jsx. PRODUÇÃO INTACTA.
// v274 — DEMO (só demo; produção intacta): (1) LEITURA demo isolada — all() em supabase.js agora lê do estado demo (localStorage), não do Supabase real; corrige catálogo e estoque que "sumiam" segundos após aparecer e o modal "Categoria faltando no catálogo". (2) Catálogo/planta demo alinhados à taxonomia oficial (Segurança/Redes/Sonorização/Automação) e catálogo demo com margem 10% (venda = custo × 1,10). (3) Aba "Acerto entre sócios" escondida no demo (CaixaRaro). (4) Log de auditoria escondido no demo: botão "Ver log" (Stock) e aba "Log de auditoria" (Reports); getStockLog/getAuditLog retornam [] no demo. (5) Dois diários de obra fictícios no projeto demo. Seed demo v3→v4 para forçar reseed limpo.
// v273 — DEMO: modelo/estilo do documento FIXO em Fable, sem escolha, nos 4 documentos: contrato, proposta, apresentação comercial e projeto executivo (seletores escondidos + default fable quando isDemo). PRODUÇÃO INTACTA: fora da demo, os seletores e defaults originais (novo/v2/nova) seguem iguais. Só o demo mudou.
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

      {!isDemo() && <div className="sb-section">Sistema</div>}
      {!isDemo() && item('backup','database-export','Backup & Restore')}
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
          v275 · build 2026-07
        </div>
      </div>
    </div>
  )
}
