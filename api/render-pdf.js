// api/render-pdf.js — Renderiza o HTML do contrato em PDF com TEXTO VETORIAL (não imagem),
// usando Chromium headless (puppeteer-core + @sparticuz/chromium no Vercel).
//
// Por que existe: gerar o PDF no navegador via html2canvas transforma o contrato numa FOTO,
// que fica serrilhada e ilegível por mais que se ajuste. Aqui o Chromium renderiza o HTML de
// verdade e exporta PDF com texto real, nítido em qualquer zoom, com a fonte e o layout exatos.
//
// Recebe: { html }  →  Retorna: { pdfBase64 }
// Requer no package.json: "puppeteer-core" e "@sparticuz/chromium".

const chromium = require('@sparticuz/chromium')
const puppeteer = require('puppeteer-core')

module.exports = async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(200).end(); return }
  if (req.method !== 'POST')   { res.status(405).json({ error:'Method not allowed' }); return }

  let browser
  try{
    let body = req.body
    if (typeof body === 'string') body = JSON.parse(body)
    const { html, emulateScreen, pageWidthPx, pageHeightPx, margin } = body || {}
    if (!html || typeof html !== 'string' || html.length < 50){
      res.status(400).json({ error:'Falta o html do contrato' }); return
    }

    // Modo "fiel à tela" (opcional): renderiza em media screen, na largura do preview,
    // em páginas com a proporção A4. Sem isso, mantém o A4 de impressão (usado pelo contrato).
    const screenMode = !!(emulateScreen && pageWidthPx)
    const vpW = screenMode ? Math.round(pageWidthPx) : 794

    browser = await puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: vpW, height: 1123, deviceScaleFactor: 2 },
      executablePath: await chromium.executablePath(),
      headless: true
    })
    const page = await browser.newPage()
    if (screenMode) { try { await page.emulateMediaType('screen') } catch(_){} }
    // carrega o HTML e espera tudo (inclusive a fonte do Google) terminar de chegar
    await page.setContent(html, { waitUntil: ['load','networkidle0'], timeout: 45000 })
    try{ await page.evaluateHandle('document.fonts.ready') }catch(_){}

    const pdfBuffer = screenMode
      ? await page.pdf({
          width: Math.round(pageWidthPx) + 'px',
          height: Math.round(pageHeightPx || pageWidthPx * 297 / 210) + 'px',
          printBackground: true,
          margin: { top:'0', right:'0', bottom:'0', left:'0' }
        })
      : await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: margin || { top:'18mm', right:'16mm', bottom:'15mm', left:'16mm' }
        })
    await browser.close(); browser = null

    res.status(200).json({ pdfBase64: Buffer.from(pdfBuffer).toString('base64') })
  }catch(e){
    if(browser){ try{ await browser.close() }catch(_){} }
    res.status(500).json({ error: String((e && e.message) || e) })
  }
}
