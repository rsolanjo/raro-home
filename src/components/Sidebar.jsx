import { LOGO_MONO } from '../logos.js'
// v264 — PWA: RARO Home vira app instalavel no iPhone e Android (sem loja). vite-plugin-pwa instalado e configurado no vite.config.js: manifest (name RARO Home, short_name RARO, theme #0B1830, bg #F7F6F3, display standalone, portrait, pt-BR), service worker autoUpdate via workbox, runtimeCaching de fontes Google e CDN jsdelivr (CacheFirst), API/Supabase ficam sempre na rede (navigateFallbackDenylist /api). Icones gerados do LOGO_DARK oficial (simbolo RR + RARO HOME, sem o slogan que borrava em 192px): icon-192, icon-512, icon-maskable-512 (margem de seguranca pro recorte Android), apple-touch-icon-180 em public/icons/. index.html com apple-mobile-web-app-capable/status-bar/title e apple-touch-icon (iOS ignora o manifest, precisa dessas tags). vercel.json: rewrite exclui sw.js/manifest/registerSW/workbox pra servirem como arquivo real, header no-cache no sw.js. Build EXIT:0, gera dist/sw.js + manifest.webmanifest. Instalar: deploy Vercel normal, iPhone Safari > compartilhar > adicionar a tela inicial; Android Chrome > instalar app. Fonte capacidade offline/instalacao: vite-pwa-org.netlify.app e docs Apple Safari web apps. Mantem v207-v263.

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
          v264 · build 2026-07
        </div>
      </div>
    </div>
  )
}
