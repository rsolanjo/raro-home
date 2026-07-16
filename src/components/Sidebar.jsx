import { LOGO_MONO } from '../logos.js'
import { brandName, brandSub, brandLogoMono, isDemo } from '../brand.js'
// v288 — PROJETO EXECUTIVO (ocultar): agora TODO tópico dos dois documentos tem chave própria (Premissas, Planta de pontos, Posição/altura, Resumo por item, Automação, Som, Segurança, Rack, Planta elétrica, Wi-Fi, Teto, Cabeamento/conduítes, Equipamentos/peças, Gráficos, Observações + Obra: elétrica, quantitativo, cabeamento, checklists). Seletor refeito por TÓPICO com 2 granularidades: "tópico" (tira título+planta+tabela) e "só tabela" (mantém a planta) nos tópicos que têm planta+tabela (Rack, Elétrica). Master "Ocultar tudo". VERIFICADO no render: ocultar Wi-Fi (tópico) some tudo; "só tabela" da Elétrica mantém a planta e tira as tabelas. Vale todos os modelos. Base: v287.
// v287 — PROJETO EXECUTIVO: novo MODELO "Opus" (selecionável ao gerar; novo/clássico/fable INTACTOS). Acabamento máximo + aproveitamento de folha: (1) tema navy profundo + dourado quente, tabelas com fio dourado; (2) CAPA com faixa de escopo (pontos·cômodos·sistemas·cabeamento) preenchendo o vazio; (3) planta de cabeamento/conduíte COMPACTA + tabela na MESMA folha (acabou o desperdício de ~75% da página, sem "visão completa" redundante); (4) colunas 100% vazias ("—"/"—m") somem das tabelas; (5) folha da parede numa página só. VERIFICADO renderizando o PDF (Chrome headless + poppler): doc do demo caiu de ~muitas pra 21 páginas, capa com 16 pontos·8 cômodos·3 sistemas, planta+tabela juntas. Base: v286.
// v286 — PROJETO EXECUTIVO: (1) seletor de ocultar tabelas UNIFICADO num painel só ("Ocultar tabelas do documento") — acabou a confusão "Seções do Plano de Obra" vs "Tabelas do documento"; 12 chips com rótulos claros + "Todas as tabelas". VERIFICADO no preview (toggle Automação 1→0). (2) QUEBRAS DE PÁGINA INTELIGENTES (só impressão): título nunca fica órfão (break-after:avoid em h2/h3/.ex-amb), planta/figura não parte no meio (break-inside:avoid em .ex-plant e nos divs de planta com padding-bottom), linha de tabela não corta, cabeçalho de tabela repete. Conferir no PDF (preview é rolagem, não pagina). Base: v285.
// v285 — PROJETO EXECUTIVO #5 (produção): DESDUPLICAÇÃO do documento Completo/Executivo. Era _full + _obra + _ele concatenados, repetindo tudo (Planta Elétrica saía 3×, Posição e Altura 2×). Agora: (1) _ele não entra no Completo (o corpo já tem a elétrica); (2) a obra entra como ANEXO ENXUTO (buildExecHtml ganhou flag embedded) — pula planta de pontos, posição/altura e a planta elétrica que o corpo já traz, mantendo só o que é exclusivo de obra (caixas/alimentação, quantitativo, cabeamento por família, checklists, notas). VERIFICADO no render: Planta Elétrica 1×, Posição e Altura 1×, Planta de Pontos 1×, folha da parede 1×. Plano de Obra avulso continua completo. Base: v284.
// v284 — PROJETO EXECUTIVO (produção): (a) OCULTAR TABELAS agora funciona de verdade — a cópia da "Posição e Altura" no _obra (obraPosAlt) não passava pelo gate; agora respeita secOff('pos_altura'). VERIFICADO no render: esconder → 2 caem pra 0. (b) Folha da parede (#4) some a duplicata: buildWallPage() único, montado por último (depois de _full+_obra+_ele), 1 folha sozinha. VERIFICADO: 1×. PENDENTE #5: Completo ainda repete "Posição e Altura" (_full + _obra) e força quebras — falta compactar/deduplicar pra ficar elegante. Base: v283.
// v283 — PROJETO EXECUTIVO (produção): (#4) ÚLTIMA FOLHA nova nos docs Executivo e Obra — "Planta Completa · Mapa de Pontos · para a obra": planta no maior tamanho (A4 paisagem, @page wallpage), só planta + legenda, pra pregar na parede. Ancoragem à prova: caixa com aspect-ratio da imagem + object-fit:fill → pinos em % ficam exatos sobre o desenho em qualquer tamanho. (#3) Seletor de tabelas ampliado: agora dá pra ocultar uma a uma (Automação, Som, Segurança, Rack/Portas, Teto, Posição e Altura, Resumo por item) ou "Todas as tabelas". Compila; conferir no PDF (preview ao vivo estava fora). PENDENTE: #5 (compactar plantas + juntar tabelas na mesma folha). Base: v282.
// v282 — DEMO/MARCA D'ÁGUA: conferido que os 6 documentos saem com "DEMONSTRAÇÃO" no demo — proposta/contrato/apresentação embutem demoWatermark() direto; projeto executivo/plano de obra/planta elétrica saem via buildFullHtml (marca fora do branch de modo, vale Completo/Obra/Elétrica) — verificado 5× no render do executivo. Fechado um vão latente: wrapExecDoc (abrir doc pela lista de Orçamentos) não injetava a marca; agora injeta demoWatermark() (só no demo; produção continua sem marca). Base: v281.
// v281 — PROJETO EXECUTIVO #6 (produção): causa dos "pontos fora" achada — markersFromProposal jogava itens de cômodos SEM posição numa grade que varria a folha inteira (x4-96/y6-94), caindo na moldura branca de plantas que não preenchem o quadro. Correção: (1) computeContentBox detecta a área DESENHADA (bbox não-branca) da planta no onLoad; (2) a grade de fallback e o clamp agora ficam DENTRO dessa área; (3) botão "Encaixar na planta" no editor reencaixa pontos já espalhados (remap proporcional, desfazível). Compila; remap não dá pra ver no demo (planta demo preenche o quadro todo — computeContentBox retorna null, caminho correto). Testar no projeto real. Base: v280.
// v280 — DEMO: 2 conduítes fictícios (C1 dados, C2 elétrica) na planta demo pra exibir/validar o #5. VERIFICADO no render: rótulo do conduíte cai longe dos pinos (C1 no ponto a ~11 de dist do pino mais próximo), 100% opaco. Seed demo v4→v5 (reseed limpo). Produção intacta. Base: v279.
// v279 — PROJETO EXECUTIVO: (#2) legenda COMPLETA de símbolos elétricos ABNT NBR 5444 na Planta Elétrica — todos os símbolos agrupados (Tomadas, Interruptores, Iluminação, Energia, Som, Rede, Infra) com significado (abntLegendaCompleta). VERIFICADO no render. (#5) rótulo do conduíte (C1/C2...) agora vai no ponto do trecho MAIS LONGE de qualquer pino (não carimba em cima de item) e 100% opaco com contorno branco, nas 3 plantas do documento. Compila; sem conduíte semeado no demo pra conferir no render (lógica direta). Vale produção e demo. Base: v278.
// v278 — PROJETO EXECUTIVO: "IDs nas tabelas" agora vale para TODAS as tabelas do documento (não só Posição e Altura) — o helper T() remove a coluna cujo cabeçalho é "ID" (cabeçalho + célula de cada linha), então automação/segurança/som/teto/elétrica/conduítes/plano de obra também respeitam o toggle. VERIFICADO no preview: 25 cabeçalhos ID → 0, colunas alinhadas. Vale produção e demo. Base: v277.
// v277 — PROJETO EXECUTIVO (tabelas): (1) nova tabela "Resumo por Item (tipos únicos)" — cada tipo de ponto aparece 1x com a quantidade (×N), serve de legenda; hideável. (2) Seletor de tabelas no painel "Opções do documento": grupo "Tabelas do documento" com chip "Todas as tabelas" (master) + chips individuais (Posição e Altura, Resumo por item), além das seções do Plano de Obra já existentes. (3) Toggle "IDs nas tabelas" (showIdsTbl) esconde a coluna de ID na tabela Posição e Altura. VERIFICADO no preview (build + render). Pendente: estender ocultar-ID às tabelas de IA (som/automação/etc.). Base: v276.
// v276 — SEGURANÇA: logout automático após 30 min de inatividade (mouse/teclado/toque/scroll zeram o cronômetro; checa a cada 30s). Vale para produção e demo. useEffect em App.jsx. Base para as próximas mudanças do Projeto Executivo (legenda, elétrica, ocultar tabelas, anti-sobreposição, retrato) que exigem seu ciclo de teste.
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
          v288 · build 2026-07
        </div>
      </div>
    </div>
  )
}
