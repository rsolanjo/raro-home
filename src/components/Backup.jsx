import { useState } from 'react'
import { exportBackup, importBackup, getCatalog } from '../db/supabase.js'

export default function Backup() {
  const [loading, setLoading] = useState('')
  const [log, setLog] = useState([])

  const addLog = (msg, ok=true) => setLog(l=>[{msg,ok,at:new Date().toLocaleTimeString('pt-BR')},...l.slice(0,19)])

  async function doExport() {
    setLoading('export')
    try {
      await exportBackup()
      addLog('✅ Backup exportado com sucesso (JSON completo)')
    } catch(e) { addLog('❌ Erro ao exportar: '+e.message, false) }
    setLoading('')
  }

  async function doExportCatalog() {
    setLoading('catalog')
    try {
      const catalog = await getCatalog()
      const rows = [['Código','Nome','Categoria','Custo (R$)','Venda (R$)','Margem%','Pitch','Link compra']]
      catalog.forEach(c => {
        const mg = c.cost_price>0?Math.round((c.sale_price-c.cost_price)/c.cost_price*100):0
        rows.push([c.code,c.name,c.category||'',c.cost_price||0,c.sale_price||0,`${mg}%`,c.pitch||'',c.buy_link||''])
      })
      const csv = rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
      const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=`catalogo-raro-${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(()=>URL.revokeObjectURL(url),2000)
      addLog(`✅ Catálogo exportado — ${catalog.length} produtos (CSV)`)
    } catch(e) { addLog('❌ Erro ao exportar catálogo: '+e.message, false) }
    setLoading('')
  }

  async function doImport(e) {
    const file = e.target.files[0]; if(!file) return
    setLoading('import')
    try {
      const text = await file.text()
      await importBackup(text)
      addLog(`✅ Backup importado com sucesso — ${file.name}`)
    } catch(err) { addLog('❌ Erro ao importar: '+err.message, false) }
    setLoading('')
    e.target.value = ''
  }

  const GOOGLE_DRIVE_URL = 'https://drive.google.com/drive/folders/'

  return (
    <div className="page-content">
      <div className="page-hdr">
        <div>
          <div className="page-title"><i className="ti ti-database-export" style={{marginRight:8}} aria-hidden/>Backup & Restore</div>
          <div className="page-sub">Exporte, importe e automatize backups dos seus dados</div>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* Export full */}
        <div className="section">
          <div className="sec-hdr"><div className="sec-title"><i className="ti ti-download" style={{marginRight:6}} aria-hidden/>Backup completo</div></div>
          <div style={{padding:'16px'}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:14,lineHeight:1.7}}>
              Exporta todos os dados: clientes, propostas, projetos, estoque, catálogo, fornecedores, admins, ferramentas.<br/>
              <span style={{color:'var(--text3)'}}>Formato JSON — salve no Google Drive ou HD externo.</span>
            </div>
            <button className="btn primary" style={{width:'100%',justifyContent:'center',marginBottom:8}} onClick={doExport} disabled={loading==='export'}>
              {loading==='export'?<><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} aria-hidden/>Exportando...</>
                :<><i className="ti ti-download" aria-hidden/>Exportar backup completo (JSON)</>}
            </button>
            <a href={GOOGLE_DRIVE_URL} target="_blank" rel="noreferrer">
              <button className="btn" style={{width:'100%',justifyContent:'center',fontSize:11}}>
                <i className="ti ti-brand-google-drive" style={{color:'#4285F4'}} aria-hidden/>Abrir Google Drive para salvar
              </button>
            </a>
          </div>
        </div>

        {/* Export catalog */}
        <div className="section">
          <div className="sec-hdr"><div className="sec-title"><i className="ti ti-list-details" style={{marginRight:6}} aria-hidden/>Exportar catálogo</div></div>
          <div style={{padding:'16px'}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:14,lineHeight:1.7}}>
              Exporta o catálogo completo com preços, margens e pitches.<br/>
              <span style={{color:'var(--text3)'}}>Formato CSV — abre no Excel ou Google Sheets.</span>
            </div>
            <button className="btn" style={{width:'100%',justifyContent:'center',borderColor:'var(--accent)',color:'var(--accent)'}} onClick={doExportCatalog} disabled={loading==='catalog'}>
              {loading==='catalog'?<><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} aria-hidden/>Exportando...</>
                :<><i className="ti ti-table-export" aria-hidden/>Exportar catálogo (CSV / Excel)</>}
            </button>
          </div>
        </div>

        {/* Import */}
        <div className="section">
          <div className="sec-hdr"><div className="sec-title"><i className="ti ti-upload" style={{marginRight:6}} aria-hidden/>Restaurar backup</div></div>
          <div style={{padding:'16px'}}>
            <div style={{background:'rgba(220,38,38,0.06)',border:'1px solid rgba(220,38,38,0.3)',borderRadius:6,padding:'8px 12px',marginBottom:14,fontSize:11,color:'var(--red)'}}>
              <i className="ti ti-alert-triangle" style={{marginRight:4}} aria-hidden/>
              <b>Atenção:</b> a importação adiciona registros. Duplicatas podem ocorrer se importar sobre dados existentes.
            </div>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:14}}>
              Selecione um arquivo <b>.json</b> de backup exportado anteriormente.
            </div>
            <label style={{display:'block'}}>
              <button className="btn" style={{width:'100%',justifyContent:'center'}} onClick={()=>document.getElementById('backup-file').click()} disabled={!!loading}>
                {loading==='import'?<><i className="ti ti-loader" style={{animation:'spin 1s linear infinite'}} aria-hidden/>Importando...</>
                  :<><i className="ti ti-upload" aria-hidden/>Selecionar arquivo de backup</>}
              </button>
              <input id="backup-file" type="file" accept=".json" style={{display:'none'}} onChange={doImport}/>
            </label>
          </div>
        </div>

        {/* Auto backup instructions */}
        <div className="section">
          <div className="sec-hdr"><div className="sec-title"><i className="ti ti-calendar-repeat" style={{marginRight:6}} aria-hidden/>Backup automático diário</div></div>
          <div style={{padding:'16px'}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:12,lineHeight:1.8}}>
              O Supabase faz backup automático do banco de dados diariamente (plano gratuito: 7 dias de histórico). Para backup no Google Drive, siga os passos:
            </div>
            <ol style={{fontSize:11,color:'var(--text2)',paddingLeft:16,lineHeight:2}}>
              <li>Abra o Google Drive e crie uma pasta "RARO Home Backups"</li>
              <li>Clique em "Exportar backup completo" toda segunda-feira</li>
              <li>Arraste o arquivo para a pasta do Drive</li>
              <li>Mantenha os últimos 4 backups (1 por semana)</li>
            </ol>
            <div style={{marginTop:12,background:'var(--surf)',borderRadius:6,padding:'8px 12px',fontSize:11,color:'var(--text3)'}}>
              <i className="ti ti-info-circle" style={{marginRight:4}} aria-hidden/>
              Para backup automático via script, acesse o Supabase Dashboard → Project Settings → Backups.
            </div>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" style={{display:'block',marginTop:8}}>
              <button className="btn" style={{width:'100%',justifyContent:'center',fontSize:11}}>
                <i className="ti ti-external-link" aria-hidden/>Supabase Dashboard → Backups
              </button>
            </a>
          </div>
        </div>
      </div>

      {/* Log */}
      {log.length>0 && <div className="section">
        <div className="sec-hdr"><div className="sec-title"><i className="ti ti-terminal" style={{marginRight:6}} aria-hidden/>Log de operações</div></div>
        <div style={{padding:'8px 14px',fontFamily:'monospace',fontSize:11}}>
          {log.map((l,i)=>(
            <div key={i} style={{padding:'4px 0',borderBottom:'1px solid var(--border)',color:l.ok?'var(--green)':'var(--red)',display:'flex',gap:10}}>
              <span style={{color:'var(--text3)',flexShrink:0}}>{l.at}</span>
              <span>{l.msg}</span>
            </div>
          ))}
        </div>
      </div>}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
