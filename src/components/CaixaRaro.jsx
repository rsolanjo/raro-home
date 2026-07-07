import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../db/supabase.js'

const _isDemo = () => { try { if (typeof window === 'undefined') return false; if (window.__RARO_DEMO__ === true) return true; const p = window.location?.pathname || '', h = window.location?.hash || ''; return p === '/demo' || p.startsWith('/demo/') || h === '#/demo' || h.startsWith('#demo') } catch { return false } }

// ═══════════════════════════════════════════════════════════════════════════
// CAIXA RARO — controle de recebíveis, custos, rateio e fundo de reserva.
// Modelo (fechado com a Ful):
//   pagamento do cliente entra → desconta custos do projeto → do LUCRO:
//   40% Rogério, 40% Raphael, 20% empresa RARO (fundo de reserva).
//   Sociedade 50/50: cada sócio pega 40% direto + metade do fundo = 50% econômico.
//   Despesas da empresa (Uber, almoço, software, ferramenta) SAEM DO FUNDO.
// Persistência: tabela `finance_ledger` (uma linha por projeto, coluna `data` jsonb).
//   Fallback local se a tabela ainda não existir no Supabase.
// ═══════════════════════════════════════════════════════════════════════════

const SPLIT = { rogerio: 0.40, raphael: 0.40, fundo: 0.20 }
const fmt = v => 'R$\u202f' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const uid = () => Math.random().toString(36).slice(2, 9)
const hoje = () => new Date().toISOString().slice(0, 10)
const diasAte = d => { if (!d) return null; return Math.ceil((new Date(d + 'T00:00:00') - new Date(hoje() + 'T00:00:00')) / 86400000) }
const PIX_OPTS = ['RARO', 'Raphael', 'Rogério']

// ── Persistência ────────────────────────────────────────────────────────────
async function loadLedger() {
  if (_isDemo()) { try { return JSON.parse(localStorage.getItem('raro_demo_ledger') || '{}') } catch { return {} } }
  try {
    const { data, error } = await supabase.from('finance_ledger').select('*')
    if (error) throw error
    const map = {}
    for (const row of data || []) map[row.project_key] = row.data
    return map
  } catch (e) {
    try { return JSON.parse(localStorage.getItem('raro_ledger') || '{}') } catch { return {} }
  }
}
async function saveLedgerRow(project_key, data) {
  if (_isDemo()) { const all=(()=>{try{return JSON.parse(localStorage.getItem('raro_demo_ledger')||'{}')}catch{return {}}})(); all[project_key]=data; localStorage.setItem('raro_demo_ledger', JSON.stringify(all)); return }
  try {
    const { error } = await supabase.from('finance_ledger').upsert({ project_key, data, updated_at: new Date().toISOString() }, { onConflict: 'project_key' })
    if (error) throw error
  } catch (e) {
    const all = (() => { try { return JSON.parse(localStorage.getItem('raro_ledger') || '{}') } catch { return {} } })()
    all[project_key] = data
    localStorage.setItem('raro_ledger', JSON.stringify(all))
  }
}
async function loadExtras() {
  if (_isDemo()) { try { return JSON.parse(localStorage.getItem('raro_demo_empresa') || '{"despesas":[]}') } catch { return { despesas: [] } } }
  try {
    const { data, error } = await supabase.from('finance_ledger').select('*').eq('project_key', '__empresa__').maybeSingle()
    if (error) throw error
    return data?.data || { despesas: [] }
  } catch (e) {
    try { return JSON.parse(localStorage.getItem('raro_empresa') || '{"despesas":[]}') } catch { return { despesas: [] } }
  }
}
async function saveExtras(data) {
  if (_isDemo()) { localStorage.setItem('raro_demo_empresa', JSON.stringify(data)); return }
  try {
    const { error } = await supabase.from('finance_ledger').upsert({ project_key: '__empresa__', data, updated_at: new Date().toISOString() }, { onConflict: 'project_key' })
    if (error) throw error
  } catch (e) { localStorage.setItem('raro_empresa', JSON.stringify(data)) }
}

// ── Cálculo por projeto ─────────────────────────────────────────────────────
// L = { valor_total, forma, parcelas:[{valor,venc,pago,data_pago,pix}], custos:[{desc,valor,tipo,pago,pix,cobrado}] }
//   parcela.pix = quem recebeu (RARO/Raphael/Rogério). tipo custo: 'cobrar'|'adiantamento'
function calcProjeto(L) {
  const parcelas = L.parcelas || []
  const custos = L.custos || []
  const recebido = parcelas.filter(p => p.pago).reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const totalContratado = Number(L.valor_total) || parcelas.reduce((s, p) => s + (Number(p.valor) || 0), 0)
  const aReceber = totalContratado - recebido
  const custoTotal = custos.reduce((s, c) => s + (Number(c.valor) || 0), 0)
  const adiantRARO = custos.filter(c => c.tipo === 'adiantamento' && !c.cobrado).reduce((s, c) => s + (Number(c.valor) || 0), 0)
  const aCobrar = custos.filter(c => c.tipo === 'cobrar' && !c.cobrado).reduce((s, c) => s + (Number(c.valor) || 0), 0)
  // lucro realizado = recebido - custos (só sobre o que já entrou; conservador)
  const baseRateio = Math.max(0, recebido - custoTotal)
  const rateio = {
    rogerio: baseRateio * SPLIT.rogerio,
    raphael: baseRateio * SPLIT.raphael,
    fundo: baseRateio * SPLIT.fundo,
  }
  // por qual PIX cada valor recebido entrou
  const porPix = { RARO: 0, Raphael: 0, 'Rogério': 0 }
  parcelas.filter(p => p.pago).forEach(p => { porPix[p.pix || 'RARO'] = (porPix[p.pix || 'RARO'] || 0) + (Number(p.valor) || 0) })
  return { recebido, totalContratado, aReceber, custoTotal, adiantRARO, aCobrar, baseRateio, rateio, porPix }
}

export default function CaixaRaro({ proposals = [], projects = [] }) {
  const [ledger, setLedger] = useState({})
  const [extras, setExtras] = useState({ despesas: [] })
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('painel')
  const [selKey, setSelKey] = useState('')

  useEffect(() => { (async () => { setLedger(await loadLedger()); setExtras(await loadExtras()); setLoading(false) })() }, [])

  // clientes = propostas aprovadas (cada uma vira uma ficha de caixa)
  const clientes = useMemo(() => proposals.filter(p => p.status === 'approved' || p.status === 'sent').map(p => ({
    key: String(p.id), nome: p.client_name || p.title || `Proposta ${p.id}`, prop: p,
  })), [proposals])

  const L = k => ledger[k] || { valor_total: '', forma: '', parcelas: [], custos: [] }
  function updL(k, patch) {
    const next = { ...L(k), ...patch }
    setLedger(prev => ({ ...prev, [k]: next })); saveLedgerRow(k, next)
  }

  // agregados globais
  const agg = useMemo(() => {
    let recebido = 0, aReceber = 0, aCobrar = 0, adiant = 0, fundoIn = 0, rog = 0, raph = 0
    const porPix = { RARO: 0, Raphael: 0, 'Rogério': 0 }
    const fundoTrack = []
    clientes.forEach(c => {
      const r = calcProjeto(L(c.key))
      recebido += r.recebido; aReceber += r.aReceber; aCobrar += r.aCobrar; adiant += r.adiantRARO
      fundoIn += r.rateio.fundo; rog += r.rateio.rogerio; raph += r.rateio.raphael
      Object.keys(porPix).forEach(p => porPix[p] += r.porPix[p] || 0)
      if (r.rateio.fundo > 0) fundoTrack.push({ cliente: c.nome, valor: r.rateio.fundo })
    })
    const despesas = (extras.despesas || []).reduce((s, d) => s + (Number(d.valor) || 0), 0)
    const fundoSaldo = fundoIn - despesas
    // acerto de PIX: quem recebeu na conta vs. quanto é de cada um.
    // direito de cada sócio = 40% do lucro + metade do fundo (o fundo é 50/50).
    const direito = { Rogério: rog + fundoIn * 0.5, Raphael: raph + fundoIn * 0.5, RARO: 0 }
    // o que a empresa "reteve" já está no fundo; o acerto é sobre o que caiu em conta pessoal.
    return { recebido, aReceber, aCobrar, adiant, fundoIn, fundoSaldo, despesas, rog, raph, porPix, fundoTrack, direito }
  }, [clientes, ledger, extras])

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Carregando caixa…</div>

  const card = (label, val, cor, sub) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', flex: '1 1 180px' }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor || 'var(--text)' }}>{fmt(val)}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )

  const TABS = [
    { k: 'painel', l: 'Painel', i: 'ti-layout-dashboard' },
    { k: 'clientes', l: 'Clientes & Pagamentos', i: 'ti-users' },
    { k: 'fundo', l: 'Fundo de Reserva', i: 'ti-pig-money' },
    // Acerto entre sócios expõe a divisão Rogério/Raphael: escondido no demo.
    ...(_isDemo() ? [] : [{ k: 'acerto', l: 'Acerto entre sócios', i: 'ti-arrows-exchange' }]),
    { k: 'despesas', l: 'Despesas da empresa', i: 'ti-receipt' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} className={tab === t.k ? 'btn primary' : 'btn'} style={{ fontSize: 12.5 }}>
            <i className={`ti ${t.i}`} aria-hidden /> {t.l}
          </button>
        ))}
      </div>

      {/* ── PAINEL ── */}
      {tab === 'painel' && <>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          {card('Recebido', agg.recebido, '#16A34A')}
          {card('A receber', agg.aReceber, '#D97706')}
          {card('Fundo de reserva', agg.fundoSaldo, '#0EA5E9', `entrou ${fmt(agg.fundoIn)} · saiu ${fmt(agg.despesas)}`)}
          {card('Rogério (40%)', agg.rog, 'var(--text)')}
          {card('Raphael (40%)', agg.raph, 'var(--text)')}
        </div>
        {(agg.aCobrar > 0 || agg.adiant > 0) && (
          <div style={{ background: 'rgba(217,119,6,0.1)', border: '1px solid rgba(217,119,6,0.4)', borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, color: '#D97706', marginBottom: 4 }}><i className="ti ti-alert-triangle" /> Pendências de cobrança</div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>
              {agg.aCobrar > 0 && <div>A cobrar do cliente (material que deve entrar na conta dele): <b>{fmt(agg.aCobrar)}</b></div>}
              {agg.adiant > 0 && <div>Adiantado pela RARO (empresa bancou, precisa reembolso): <b>{fmt(agg.adiant)}</b></div>}
            </div>
          </div>
        )}
        <VencimentosProximos clientes={clientes} L={L} />
      </>}

      {/* ── CLIENTES & PAGAMENTOS ── */}
      {tab === 'clientes' && (
        selKey
          ? <FichaCliente cliente={clientes.find(c => c.key === selKey)} L={L(selKey)} onBack={() => setSelKey('')} onChange={patch => updL(selKey, patch)} />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
            {clientes.length === 0 && <div style={{ color: 'var(--text2)' }}>Nenhuma proposta aprovada ainda. As fichas de caixa nascem das propostas aprovadas.</div>}
            {clientes.map(c => {
              const r = calcProjeto(L(c.key))
              const prox = (L(c.key).parcelas || []).filter(p => !p.pago && p.venc).sort((a, b) => a.venc.localeCompare(b.venc))[0]
              const dias = prox ? diasAte(prox.venc) : null
              return (
                <button key={c.key} onClick={() => setSelKey(c.key)} style={{ textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{c.nome}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text2)' }}><span>Recebido</span><b style={{ color: '#16A34A' }}>{fmt(r.recebido)}</b></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--text2)' }}><span>Falta</span><b style={{ color: r.aReceber > 0 ? '#D97706' : 'var(--text3)' }}>{fmt(r.aReceber)}</b></div>
                  {prox && <div style={{ marginTop: 8, fontSize: 11.5, color: dias < 0 ? '#DC2626' : dias <= 5 ? '#D97706' : 'var(--text3)' }}>
                    <i className="ti ti-calendar" /> Próx. parcela {new Date(prox.venc + 'T00:00:00').toLocaleDateString('pt-BR')} {dias < 0 ? `(venceu há ${-dias}d)` : `(em ${dias}d)`}
                  </div>}
                </button>
              )
            })}
          </div>
      )}

      {/* ── FUNDO ── */}
      {tab === 'fundo' && <>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          {card('Saldo do fundo', agg.fundoSaldo, '#0EA5E9')}
          {card('Total que entrou (20%)', agg.fundoIn, '#16A34A')}
          {card('Total que saiu', agg.despesas, '#DC2626')}
        </div>
        <h3 style={{ fontSize: 14, margin: '18px 0 8px' }}>Como o fundo foi composto (20% do lucro de cada projeto)</h3>
        <Tabela cols={['Cliente / Projeto', 'Contribuição pro fundo']} rows={agg.fundoTrack.map(f => [f.cliente, fmt(f.valor)])} vazio="Nenhuma contribuição ainda." />
        <h3 style={{ fontSize: 14, margin: '22px 0 8px' }}>Saídas do fundo (despesas da empresa)</h3>
        <Tabela cols={['Data', 'Descrição', 'Categoria', 'Valor']} rows={(extras.despesas || []).map(d => [new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR'), d.desc, d.cat || '—', fmt(d.valor)])} vazio="Nenhuma despesa lançada." />
        <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 10, lineHeight: 1.5 }}>O fundo é 50/50 dos sócios. Se secar, é sinal de que a operação está gastando mais do que retém.</div>
      </>}

      {/* ── ACERTO ── */}
      {tab === 'acerto' && <>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Como o dinheiro caiu em cada PIX vs. quanto é de cada um. O saldo mostra quem recebeu além (ou aquém) do seu direito e precisa acertar.</p>
        <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Entrou em cada PIX</h3>
        <Tabela cols={['PIX / Conta', 'Total recebido nessa conta']} rows={PIX_OPTS.map(p => [p, fmt(agg.porPix[p] || 0)])} />
        <h3 style={{ fontSize: 14, margin: '22px 0 8px' }}>Direito de cada um (40% do lucro + metade do fundo)</h3>
        <Tabela cols={['Sócio', 'Direito acumulado']} rows={[['Rogério', fmt(agg.direito['Rogério'])], ['Raphael', fmt(agg.direito['Raphael'])]]} />
        <div style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.35)', borderRadius: 10, padding: 14, marginTop: 18, fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>
          <b style={{ color: '#0EA5E9' }}>Exemplo do seu caso:</b> se caiu dinheiro de 2 clientes no PIX do Rogério, o valor aparece em "Entrou no PIX do Rogério". Se parte disso é do Raphael ou da RARO, o "direito de cada um" mostra o quanto, e a diferença é o que o Rogério repassa no acerto.
        </div>
      </>}

      {/* ── DESPESAS ── */}
      {tab === 'despesas' && <Despesas extras={extras} onChange={next => { setExtras(next); saveExtras(next) }} saldo={agg.fundoSaldo} />}
    </div>
  )
}

// ── Ficha de um cliente ─────────────────────────────────────────────────────
function FichaCliente({ cliente, L, onBack, onChange }) {
  const r = calcProjeto(L)
  const setParc = (i, patch) => { const parcelas = [...(L.parcelas || [])]; parcelas[i] = { ...parcelas[i], ...patch }; onChange({ parcelas }) }
  const addParc = () => onChange({ parcelas: [...(L.parcelas || []), { id: uid(), valor: '', venc: '', pago: false, pix: 'RARO' }] })
  const delParc = i => { const parcelas = [...(L.parcelas || [])]; parcelas.splice(i, 1); onChange({ parcelas }) }
  const setCusto = (i, patch) => { const custos = [...(L.custos || [])]; custos[i] = { ...custos[i], ...patch }; onChange({ custos }) }
  const addCusto = () => onChange({ custos: [...(L.custos || []), { id: uid(), desc: '', valor: '', tipo: 'cobrar', pago: false, pix: 'RARO', cobrado: false }] })
  const delCusto = i => { const custos = [...(L.custos || [])]; custos.splice(i, 1); onChange({ custos }) }
  const inp = { padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13 }

  return (
    <div>
      <button className="btn" onClick={onBack} style={{ marginBottom: 14, fontSize: 12 }}><i className="ti ti-arrow-left" /> Voltar</button>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>{cliente?.nome}</h2>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '14px 0' }}>
        <div style={{ flex: '1 1 200px' }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Valor total fechado</label>
          <input style={{ ...inp, width: '100%', marginTop: 4 }} value={L.valor_total || ''} onChange={e => onChange({ valor_total: e.target.value.replace(/[^\d.,]/g, '') })} placeholder="0,00" />
        </div>
        <div style={{ flex: '2 1 300px' }}>
          <label style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase' }}>Como o cliente fechou (forma de pagamento)</label>
          <input style={{ ...inp, width: '100%', marginTop: 4 }} value={L.forma || ''} onChange={e => onChange({ forma: e.target.value })} placeholder="Ex: entrada 30% + 4x no PIX" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '10px 0 22px' }}>
        <Mini label="Recebido" val={fmt(r.recebido)} cor="#16A34A" />
        <Mini label="Falta receber" val={fmt(r.aReceber)} cor="#D97706" />
        <Mini label="Custos do projeto" val={fmt(r.custoTotal)} cor="#DC2626" />
        <Mini label="Lucro (base do rateio)" val={fmt(r.baseRateio)} cor="var(--text)" />
      </div>

      {r.baseRateio > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginBottom: 22, fontSize: 13 }}>
          <b>Rateio deste projeto</b> (sobre o lucro já realizado)
          <div style={{ display: 'flex', gap: 18, marginTop: 8, flexWrap: 'wrap' }}>
            <span>Rogério 40%: <b>{fmt(r.rateio.rogerio)}</b></span>
            <span>Raphael 40%: <b>{fmt(r.rateio.raphael)}</b></span>
            <span>Fundo RARO 20%: <b style={{ color: '#0EA5E9' }}>{fmt(r.rateio.fundo)}</b></span>
          </div>
        </div>
      )}

      {/* Parcelas */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ fontSize: 14 }}>Pagamentos / parcelas</h3>
        <button className="btn" onClick={addParc} style={{ fontSize: 12 }}><i className="ti ti-plus" /> Parcela</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left', padding: 6 }}>Valor</th><th style={{ textAlign: 'left', padding: 6 }}>Vencimento</th><th style={{ padding: 6 }}>Pago?</th><th style={{ padding: 6 }}>Caiu no PIX</th><th></th>
          </tr></thead>
          <tbody>{(L.parcelas || []).map((p, i) => {
            const dias = !p.pago && p.venc ? diasAte(p.venc) : null
            return <tr key={p.id || i} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: 6 }}><input style={{ ...inp, width: 110 }} value={p.valor} onChange={e => setParc(i, { valor: e.target.value.replace(/[^\d.,]/g, '') })} placeholder="0,00" /></td>
              <td style={{ padding: 6 }}>
                <input type="date" style={{ ...inp }} value={p.venc || ''} onChange={e => setParc(i, { venc: e.target.value })} />
                {dias != null && <span style={{ marginLeft: 8, fontSize: 11, color: dias < 0 ? '#DC2626' : dias <= 5 ? '#D97706' : 'var(--text3)' }}>{dias < 0 ? `venceu há ${-dias}d` : `em ${dias}d`}</span>}
              </td>
              <td style={{ padding: 6, textAlign: 'center' }}><input type="checkbox" checked={!!p.pago} onChange={e => setParc(i, { pago: e.target.checked, data_pago: e.target.checked ? hoje() : '' })} /></td>
              <td style={{ padding: 6, textAlign: 'center' }}><select style={inp} value={p.pix || 'RARO'} onChange={e => setParc(i, { pix: e.target.value })}>{PIX_OPTS.map(o => <option key={o}>{o}</option>)}</select></td>
              <td style={{ padding: 6 }}><button onClick={() => delParc(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}><i className="ti ti-trash" /></button></td>
            </tr>
          })}</tbody>
        </table>
      </div>

      {/* Custos */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 8px' }}>
        <h3 style={{ fontSize: 14 }}>Gastos do projeto (material, etc.)</h3>
        <button className="btn" onClick={addCusto} style={{ fontSize: 12 }}><i className="ti ti-plus" /> Gasto</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase' }}>
            <th style={{ textAlign: 'left', padding: 6 }}>Descrição</th><th style={{ textAlign: 'left', padding: 6 }}>Valor</th><th style={{ padding: 6 }}>Tipo</th><th style={{ padding: 6 }}>Pago pelo PIX</th><th style={{ padding: 6 }}>Resolvido?</th><th></th>
          </tr></thead>
          <tbody>{(L.custos || []).map((c, i) => (
            <tr key={c.id || i} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: 6 }}><input style={{ ...inp, width: 180 }} value={c.desc} onChange={e => setCusto(i, { desc: e.target.value })} placeholder="Ex: cabo CAT6, caixa 4x4" /></td>
              <td style={{ padding: 6 }}><input style={{ ...inp, width: 100 }} value={c.valor} onChange={e => setCusto(i, { valor: e.target.value.replace(/[^\d.,]/g, '') })} placeholder="0,00" /></td>
              <td style={{ padding: 6 }}><select style={inp} value={c.tipo} onChange={e => setCusto(i, { tipo: e.target.value })}>
                <option value="cobrar">Cobrar do cliente</option>
                <option value="adiantamento">Adiantamento RARO</option>
              </select></td>
              <td style={{ padding: 6, textAlign: 'center' }}><select style={inp} value={c.pix || 'RARO'} onChange={e => setCusto(i, { pix: e.target.value })}>{PIX_OPTS.map(o => <option key={o}>{o}</option>)}</select></td>
              <td style={{ padding: 6, textAlign: 'center' }}><input type="checkbox" checked={!!c.cobrado} onChange={e => setCusto(i, { cobrado: e.target.checked })} title="Cobrado do cliente / reembolsado" /></td>
              <td style={{ padding: 6 }}><button onClick={() => delCusto(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}><i className="ti ti-trash" /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {(r.aCobrar > 0 || r.adiantRARO > 0) && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text2)' }}>
          {r.aCobrar > 0 && <div style={{ color: '#D97706' }}><i className="ti ti-alert-circle" /> A cobrar do cliente: <b>{fmt(r.aCobrar)}</b> (marque "resolvido" quando entrar na conta dele).</div>}
          {r.adiantRARO > 0 && <div style={{ color: '#0EA5E9' }}><i className="ti ti-info-circle" /> Adiantamento RARO em aberto: <b>{fmt(r.adiantRARO)}</b> (empresa bancou, aguarda reembolso).</div>}
        </div>
      )}
    </div>
  )
}

function Despesas({ extras, onChange, saldo }) {
  const inp = { padding: '7px 9px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13 }
  const list = extras.despesas || []
  const add = () => onChange({ ...extras, despesas: [...list, { id: uid(), data: hoje(), desc: '', cat: 'Geral', valor: '' }] })
  const upd = (i, patch) => { const d = [...list]; d[i] = { ...d[i], ...patch }; onChange({ ...extras, despesas: d }) }
  const del = i => { const d = [...list]; d.splice(i, 1); onChange({ ...extras, despesas: d }) }
  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <div><h3 style={{ fontSize: 15 }}>Despesas da empresa</h3><div style={{ fontSize: 12, color: 'var(--text3)' }}>Saem do fundo de reserva. Saldo do fundo hoje: <b style={{ color: saldo < 0 ? '#DC2626' : '#0EA5E9' }}>{fmt(saldo)}</b></div></div>
      <button className="btn primary" onClick={add} style={{ fontSize: 12 }}><i className="ti ti-plus" /> Despesa</button>
    </div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase' }}>
          <th style={{ textAlign: 'left', padding: 6 }}>Data</th><th style={{ textAlign: 'left', padding: 6 }}>Descrição</th><th style={{ padding: 6 }}>Categoria</th><th style={{ textAlign: 'left', padding: 6 }}>Valor</th><th></th>
        </tr></thead>
        <tbody>{list.map((d, i) => (
          <tr key={d.id || i} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: 6 }}><input type="date" style={inp} value={d.data} onChange={e => upd(i, { data: e.target.value })} /></td>
            <td style={{ padding: 6 }}><input style={{ ...inp, width: 200 }} value={d.desc} onChange={e => upd(i, { desc: e.target.value })} placeholder="Ex: Uber obra Barra, almoço equipe" /></td>
            <td style={{ padding: 6 }}><select style={inp} value={d.cat} onChange={e => upd(i, { cat: e.target.value })}>{['Geral', 'TI / Software', 'Ferramenta', 'Transporte', 'Alimentação', 'Escritório'].map(o => <option key={o}>{o}</option>)}</select></td>
            <td style={{ padding: 6 }}><input style={{ ...inp, width: 110 }} value={d.valor} onChange={e => upd(i, { valor: e.target.value.replace(/[^\d.,]/g, '') })} placeholder="0,00" /></td>
            <td style={{ padding: 6 }}><button onClick={() => del(i)} style={{ background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer' }}><i className="ti ti-trash" /></button></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  </>
}

function VencimentosProximos({ clientes, L }) {
  const itens = []
  clientes.forEach(c => (L(c.key).parcelas || []).filter(p => !p.pago && p.venc).forEach(p => itens.push({ nome: c.nome, venc: p.venc, valor: p.valor, dias: diasAte(p.venc) })))
  itens.sort((a, b) => a.venc.localeCompare(b.venc))
  const prox = itens.filter(i => i.dias <= 15)
  if (prox.length === 0) return null
  return <div style={{ marginTop: 8 }}>
    <h3 style={{ fontSize: 14, marginBottom: 8 }}><i className="ti ti-bell" /> Vencimentos próximos (15 dias)</h3>
    <Tabela cols={['Cliente', 'Vencimento', 'Valor', 'Quando']} rows={prox.map(i => [i.nome, new Date(i.venc + 'T00:00:00').toLocaleDateString('pt-BR'), fmt(i.valor), i.dias < 0 ? `venceu há ${-i.dias}d` : `em ${i.dias}d`])} />
  </div>
}

function Tabela({ cols, rows, vazio }) {
  if (!rows || rows.length === 0) return <div style={{ fontSize: 13, color: 'var(--text3)', padding: '10px 0' }}>{vazio || 'Sem registros.'}</div>
  return <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
    <thead><tr style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase' }}>{cols.map((c, i) => <th key={i} style={{ textAlign: i === cols.length - 1 ? 'right' : 'left', padding: 8 }}>{c}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>{r.map((cell, j) => <td key={j} style={{ padding: 8, textAlign: j === r.length - 1 ? 'right' : 'left', fontWeight: j === r.length - 1 ? 700 : 400 }}>{cell}</td>)}</tr>)}</tbody>
  </table></div>
}

function Mini({ label, val, cor }) {
  return <div style={{ flex: '1 1 150px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
    <div style={{ fontSize: 10.5, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color: cor || 'var(--text)', marginTop: 3 }}>{val}</div>
  </div>
}
