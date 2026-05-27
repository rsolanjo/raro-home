import { getCatalog } from '../db/supabase.js'
// ── RARO Home — PDF Builder ────────────────────────────────
// Shared between ProposalBuilder and Proposals

const LOGO_COVER = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMjYwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2MCI+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyNjAiIGZpbGw9IiNGNUZBRkYiLz4KICA8bGluZSB4MT0iMjAwIiB5MT0iMjIiIHgyPSIyMDAiIHkyPSIxMzAiIHN0cm9rZT0iIzhDNzA0MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik0yMDAgMjIgUTIwMCAyMiAxODAgMjIgUTE1NiAyMiAxNTYgNTAgUTE1NiA3OCAxODAgNzggTDIwMCA3OCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOEM3MDQwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CiAgPGxpbmUgeDE9IjE4MCIgeTE9Ijc4IiB4Mj0iMTU4IiB5Mj0iMTMwIiBzdHJva2U9IiM4QzcwNDAiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNMjAwIDIyIFEyMDAgMjIgMjIwIDIyIFEyNDQgMjIgMjQ0IDUwIFEyNDQgNzggMjIwIDc4IEwyMDAgNzgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzhDNzA0MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDxsaW5lIHgxPSIyMjAiIHkxPSI3OCIgeDI9IjI0MiIgeTI9IjEzMCIgc3Ryb2tlPSIjOEM3MDQwIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGxpbmUgeDE9IjE0OCIgeTE9IjE1IiB4Mj0iMjUyIiB5Mj0iMTUiIHN0cm9rZT0iIzBFQTVFOSIgc3Ryb2tlLXdpZHRoPSIxLjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iR2VvcmdpYSxzZXJpZiIgZm9udC1zaXplPSI1MCIgZm9udC13ZWlnaHQ9IjQwMCIgZmlsbD0iIzBEMTQyMCIgbGV0dGVyLXNwYWNpbmc9IjE0Ij5SQVJPPC90ZXh0PgogIDxsaW5lIHgxPSIxNTAiIHkxPSIxOTMiIHgyPSIxOTMiIHkyPSIxOTMiIHN0cm9rZT0iIzBFQTVFOSIgc3Ryb2tlLXdpZHRoPSIwLjYiIG9wYWNpdHk9IjAuNDUiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIxOTMiIHI9IjIuMiIgZmlsbD0iIzBFQTVFOSIgb3BhY2l0eT0iMC42Ii8+CiAgPGxpbmUgeDE9IjIwNyIgeTE9IjE5MyIgeDI9IjI1MCIgeTI9IjE5MyIgc3Ryb2tlPSIjMEVBNUU5IiBzdHJva2Utd2lkdGg9IjAuNiIgb3BhY2l0eT0iMC40NSIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMyIgZm9udC13ZWlnaHQ9IjMwMCIgZmlsbD0iIzBFQTVFOSIgbGV0dGVyLXNwYWNpbmc9IjgiIG9wYWNpdHk9IjAuNTUiPkhPTUU8L3RleHQ+Cjwvc3ZnPg=="

const LOGO_DARK  = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDAgMjYwIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI2MCI+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyNjAiIGZpbGw9IiMwNjBCMUEiLz4KICA8bGluZSB4MT0iMjAwIiB5MT0iMjIiIHgyPSIyMDAiIHkyPSIxMzAiIHN0cm9rZT0iI0I4OTU2QSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxwYXRoIGQ9Ik0yMDAgMjIgUTIwMCAyMiAxODAgMjIgUTE1NiAyMiAxNTYgNTAgUTE1NiA3OCAxODAgNzggTDIwMCA3OCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQjg5NTZBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CiAgPGxpbmUgeDE9IjE4MCIgeTE9Ijc4IiB4Mj0iMTU4IiB5Mj0iMTMwIiBzdHJva2U9IiNCODk1NkEiIHN0cm9rZS13aWR0aD0iMS41IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNMjAwIDIyIFEyMDAgMjIgMjIwIDIyIFEyNDQgMjIgMjQ0IDUwIFEyNDQgNzggMjIwIDc4IEwyMDAgNzgiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0I4OTU2QSIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgogIDxsaW5lIHgxPSIyMjAiIHkxPSI3OCIgeDI9IjI0MiIgeTI9IjEzMCIgc3Ryb2tlPSIjQjg5NTZBIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGxpbmUgeDE9IjE0OCIgeTE9IjE1IiB4Mj0iMjUyIiB5Mj0iMTUiIHN0cm9rZT0iIzM4QkRGOCIgc3Ryb2tlLXdpZHRoPSIxLjEiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTc4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iR2VvcmdpYSxzZXJpZiIgZm9udC1zaXplPSI1MCIgZm9udC13ZWlnaHQ9IjQwMCIgZmlsbD0iI0YwRjZGRiIgbGV0dGVyLXNwYWNpbmc9IjE0Ij5SQVJPPC90ZXh0PgogIDxsaW5lIHgxPSIxNTAiIHkxPSIxOTMiIHgyPSIxOTMiIHkyPSIxOTMiIHN0cm9rZT0iIzM4QkRGOCIgc3Ryb2tlLXdpZHRoPSIwLjYiIG9wYWNpdHk9IjAuNDUiLz4KICA8Y2lyY2xlIGN4PSIyMDAiIGN5PSIxOTMiIHI9IjIuMiIgZmlsbD0iIzM4QkRGOCIgb3BhY2l0eT0iMC42Ii8+CiAgPGxpbmUgeDE9IjIwNyIgeTE9IjE5MyIgeDI9IjI1MCIgeTI9IjE5MyIgc3Ryb2tlPSIjMzhCREY4IiBzdHJva2Utd2lkdGg9IjAuNiIgb3BhY2l0eT0iMC40NSIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMjE0IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMyIgZm9udC13ZWlnaHQ9IjMwMCIgZmlsbD0iIzM4QkRGOCIgbGV0dGVyLXNwYWNpbmc9IjgiIG9wYWNpdHk9IjAuNTUiPkhPTUU8L3RleHQ+Cjwvc3ZnPg=="


const PDF_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');
@page{size:A4;margin:0}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'DM Sans',sans-serif;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;background:#F5FAFF;margin:0 auto;display:flex;flex-direction:column;page-break-after:always}
.page-last{page-break-after:auto}
@media print{.no-print{display:none!important}}

/* ── PALETA AZUL ── */
/* --ink:     #060B1A  */
/* --ink2:    #1E3A5F  */
/* --mid:     #3D5A80  */
/* --accent:  #0EA5E9  */
/* --accentdk:#0369A1  */
/* --accentlt:#38BDF8  */
/* --bg:      #F5FAFF  */
/* --bg2:     #E8F4FF  */
/* --border:  #C8DEFF  */

/* ── TYPE ── */
.serif{font-family:'DM Serif Display',serif}
.sans{font-family:'DM Sans',sans-serif}

/* ══════════════════════
   COVER PAGE
   ══════════════════════ */
.cov-top{background:#060B1A;padding:10px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.cov-ey{font-size:6.5px;letter-spacing:3px;color:rgba(56,189,248,0.6);text-transform:uppercase;font-family:'DM Sans',sans-serif}
.cov-si{font-family:'DM Serif Display',serif;font-size:10px;font-style:italic;color:rgba(240,246,255,0.6)}
.cov-right{font-size:6px;color:rgba(56,189,248,0.3);text-align:right;line-height:1.9;font-family:'DM Sans',sans-serif}

.logo-zone{background:#F5FAFF;padding:20px 28px 14px;display:flex;flex-direction:column;align-items:center;flex-shrink:0;border-bottom:0.5px solid #C8DEFF}
.logo-zone img{height:140px;width:auto;display:block}
.logo-tagline{font-size:9px;letter-spacing:6px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;font-weight:300;margin-top:12px;margin-bottom:2px}
.logo-orn{display:flex;align-items:center;justify-content:center;gap:10px;margin-top:9px}
.lo-l{width:44px;height:0.5px;background:#0EA5E9}
.lo-l-r{width:44px;height:0.5px;background:linear-gradient(to left,transparent,#0EA5E9)}
.lo-d{width:4px;height:4px;background:#0EA5E9;transform:rotate(45deg)}

/* ── HERO ── */
.hero{padding:14px 28px 10px;text-align:center;flex-shrink:0;background:#F5FAFF;border-bottom:0.5px solid #C8DEFF}
.hero-ey{font-size:6.5px;letter-spacing:5px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:8px}
.hero-h{font-family:'DM Serif Display',serif;font-size:28px;color:#060B1A;line-height:1.2;margin-bottom:8px}
.hero-h em{font-style:italic;color:#0EA5E9}
.hero-lead{font-size:11px;color:#3D5A80;line-height:1.85;font-weight:300;font-style:italic;font-family:'DM Sans',sans-serif;max-width:440px;margin:0 auto}

/* ── CLIENT BANNER ── */
.client-banner{background:#060B1A;padding:11px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.cb-name{font-family:'DM Serif Display',serif;font-size:17px;color:#F0F6FF;letter-spacing:0.5px}
.cb-id{font-family:'DM Sans',sans-serif;font-size:8px;letter-spacing:2px;color:#38BDF8;text-transform:uppercase;margin-top:2px}
.cb-right{text-align:right}
.cb-bairro{font-family:'DM Serif Display',serif;font-size:11px;color:rgba(240,246,255,0.6);font-style:italic}
.cb-date{font-family:'DM Sans',sans-serif;font-size:7px;letter-spacing:1px;color:rgba(56,189,248,0.3);margin-top:3px}

/* ── QUEM SOMOS 2×2 ── */
.quem{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#C8DEFF;flex-shrink:0}
.qc{background:#F5FAFF;padding:10px 14px}
.qc.lft{border-left:2.5px solid #0EA5E9}
.qi{font-size:12px;color:#0EA5E9;margin-bottom:3px;display:block}
.qt{font-family:'DM Serif Display',serif;font-size:14px;color:#060B1A;margin-bottom:4px}
.qb{font-size:10px;color:#3D5A80;line-height:1.7;font-weight:300;font-family:'DM Sans',sans-serif}

/* ── TESTIMONIALS ── */
.testi-section{flex:1;display:flex;flex-direction:column;min-height:0}
.testi-lbl{font-size:8px;letter-spacing:4px;color:#0369A1;text-transform:uppercase;padding:14px 28px 8px;background:#E8F4FF;flex-shrink:0;font-family:'DM Sans',sans-serif;border-top:2px solid #0EA5E9;font-weight:500}
.testi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;flex:1;padding:8px 28px 14px;background:#F5FAFF}
.testi{background:#fff;border:0.5px solid #C8DEFF;border-radius:6px;padding:12px 13px;display:flex;flex-direction:column;border-top:2px solid #0EA5E9}
.tq{font-family:'DM Serif Display',serif;font-size:11px;color:#060B1A;font-style:italic;line-height:1.65;margin-bottom:9px;flex:1}
.tq-stars{display:flex;gap:2px;margin-bottom:6px}
.tq-star{width:7px;height:7px;background:#FBBF24;clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)}
.testi-author{display:flex;align-items:center;gap:7px;border-top:0.5px solid #C8DEFF;padding-top:7px;margin-top:auto}
.testi-av{width:20px;height:20px;border-radius:50%;background:#0EA5E9;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:600;color:#fff;flex-shrink:0;font-family:'DM Sans',sans-serif}
.tn{font-family:'DM Sans',sans-serif;font-size:8.5px;font-weight:600;color:#0369A1;letter-spacing:1px;text-transform:uppercase}
.tc{font-family:'DM Sans',sans-serif;font-size:8px;color:#6B8CAE;margin-top:2px;font-weight:300}

/* ── CONTACT STRIP (cover) ── */
.contact-strip{background:#060B1A;padding:10px 28px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;border-top:1px solid rgba(14,165,233,0.15)}
.cs-name{font-family:'DM Serif Display',serif;font-size:14px;color:#F0F6FF;letter-spacing:0.5px}
.cs-phone{font-family:'DM Sans',sans-serif;font-size:10px;font-weight:500;color:#38BDF8;margin-top:1px}
.cs-r{display:flex;flex-direction:column;align-items:flex-end;gap:3px}
.cs-item{display:flex;align-items:center;gap:5px}
.cs-ic{font-size:10px;color:#0EA5E9}
.cs-tx{font-family:'DM Sans',sans-serif;font-size:8.5px;color:#F0F6FF}
.cs-tx-s{font-family:'DM Sans',sans-serif;font-size:7.5px;color:#38BDF8}
.valid-strip{background:#030712;padding:4px 28px;text-align:center;font-size:5.5px;letter-spacing:1.5px;color:rgba(56,189,248,0.2);text-transform:uppercase;font-family:'DM Sans',sans-serif;flex-shrink:0}

/* ══════════════════════
   ROOM PAGES
   ══════════════════════ */
.phdr{background:#060B1A;padding:8px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0}
.phdr-brand{font-size:9px;letter-spacing:5px;color:#F0F6FF;font-weight:400;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.phdr-sub{font-size:5.5px;letter-spacing:2px;color:#38BDF8;text-transform:uppercase;margin-top:1px;font-family:'DM Sans',sans-serif}
.phdr-right{font-size:7px;letter-spacing:1px;color:#38BDF8;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.grule{height:2px;background:linear-gradient(to right,#0EA5E9 0%,#38BDF8 30%,transparent 65%);flex-shrink:0}

.page-client{background:#E8F4FF;padding:5px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:0.5px solid #C8DEFF;flex-shrink:0}
.pc-name{font-family:'DM Serif Display',serif;font-size:10px;color:#060B1A;letter-spacing:0.5px}
.pc-id{font-family:'DM Sans',sans-serif;font-size:7px;letter-spacing:2px;color:#0EA5E9;text-transform:uppercase}
.pc-bairro{font-family:'DM Sans',sans-serif;font-size:7px;color:#6B8CAE;font-style:italic}

/* ── ROOM CARDS ── */
.fl-section-hdr{grid-column:1/-1;padding:5px 4px 3px;margin-top:3px}
.fl-section-hdr-inner{display:flex;align-items:center;gap:8px;padding-bottom:4px;border-bottom:1px solid #C8DEFF}
.fl-section-label{font-size:6px;letter-spacing:4px;color:#0EA5E9;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.fl-section-name{font-family:'DM Serif Display',serif;font-size:15px;color:#060B1A;letter-spacing:0.5px}

.rooms-3col{flex:1;padding:4px 6px;display:flex;flex-direction:column;gap:0;overflow:hidden}
.fl-block{display:flex;flex-direction:column;margin-bottom:2px}
.fl-block-grid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-auto-rows:1fr;gap:5px 6px;flex:1}

.fl-block-grid .room,.rooms-3col .room{background:#fff;border:0.5px solid #C8DEFF;border-radius:4px;padding:8px 10px;display:flex;flex-direction:column;border-left:2.5px solid #C8DEFF;overflow:hidden;min-height:0}
.fl-block-grid .room.hl,.rooms-3col .room.hl{border-left-color:#0EA5E9}
.fl-block-grid .room.pad,.rooms-3col .room.pad{background:transparent;border-color:transparent}

.fl-block-grid .rh,.rooms-3col .rh{display:flex;align-items:flex-start;gap:5px;margin-bottom:4px}
.fl-block-grid .ri,.rooms-3col .ri{font-size:12px;color:#0EA5E9;flex-shrink:0;margin-top:1px}
.fl-block-grid .rn,.rooms-3col .rn{font-family:'DM Serif Display',serif;font-size:12px;font-weight:400;color:#060B1A;line-height:1.2}

.fl-block-grid .items-table,.rooms-3col .items-table{width:100%;border-collapse:collapse;margin-bottom:3px}
.fl-block-grid .it-name,.rooms-3col .it-name{font-size:7px;color:#3D5A80;font-weight:300;padding:1px 0;line-height:1.4;width:62%;font-family:'DM Sans',sans-serif}
.fl-block-grid .it-code,.rooms-3col .it-code{font-size:6.5px;color:#6B8CAE;text-align:center;width:26%;font-family:'DM Sans',sans-serif}
.fl-block-grid .it-qty,.rooms-3col .it-qty{font-size:7px;color:#0EA5E9;font-weight:600;text-align:right;width:12%;font-family:'DM Sans',sans-serif}

.fl-block-grid .rp,.rooms-3col .rp{font-family:'DM Serif Display',serif;font-style:italic;font-size:8.5px;color:#3D5A80;padding-top:3px;line-height:1.3;margin-top:auto}

.fl-block-grid .rv,.rooms-3col .rv{display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px;padding-top:4px;border-top:0.5px solid #C8DEFF;flex-shrink:0}
.fl-block-grid .rvl,.rooms-3col .rvl{font-size:6px;letter-spacing:2px;color:#6B8CAE;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.fl-block-grid .rvv,.rooms-3col .rvv{font-family:'DM Serif Display',serif;font-size:13px;color:#060B1A}

.subtotals-bar{background:#060B1A;padding:6px 24px;display:flex;justify-content:flex-end;align-items:center;gap:20px;flex-shrink:0}
.sub-item{font-size:7px;color:#6B8CAE;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:5px}
.sub-item strong{color:#F0F6FF;font-size:13px;font-family:'DM Serif Display',serif;font-weight:400}

/* ── PAGE FOOTER ── */
.pftr{border-top:0.5px solid #C8DEFF;padding:5px 24px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;background:#F5FAFF}
.pftr-brand{font-size:6px;letter-spacing:2px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.pftr-n{font-family:'DM Serif Display',serif;font-size:10px;color:#0EA5E9}

/* ══════════════════════
   TOTALS PAGE
   ══════════════════════ */
.tot-body{padding:16px 24px 0;flex-shrink:0}
.tot-ey{font-size:7px;letter-spacing:4px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:10px}

.pav-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#C8DEFF;margin-bottom:10px}
.pb{background:#E8F4FF;padding:10px 12px}
.pb-title{font-size:6.5px;letter-spacing:2px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:6px;padding-bottom:4px;border-bottom:0.5px solid #C8DEFF}
.pr{display:flex;justify-content:space-between;align-items:baseline;padding:2px 0}
.prn{font-size:8.5px;color:#3D5A80;font-weight:300;font-family:'DM Sans',sans-serif}
.prv{font-family:'DM Serif Display',serif;font-size:13px;color:#060B1A}
.psub{display:flex;justify-content:space-between;margin-top:5px;padding-top:5px;border-top:0.5px solid #0EA5E9}
.psl{font-size:6px;letter-spacing:1.5px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.psv{font-family:'DM Serif Display',serif;font-size:12px;color:#060B1A;font-weight:400}

.tr{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;background:#E8F4FF;border-left:2.5px solid #C8DEFF}
.tr+.tr{border-top:0.5px solid #C8DEFF}
.tr.main{background:#060B1A;border-left-color:#0EA5E9;margin-top:2px;padding:12px}
.tl{font-size:10px;color:#3D5A80;font-weight:300;font-family:'DM Sans',sans-serif}
.tl.main{color:#38BDF8;letter-spacing:2px;text-transform:uppercase;font-size:7px;font-weight:400;font-family:'DM Sans',sans-serif}
.tv{font-family:'DM Serif Display',serif;font-size:18px;color:#060B1A}
.tv.main{font-size:26px;color:#F0F6FF}

/* ── SIGNATURE ── */
.sig-section{padding:14px 24px 0;flex-shrink:0}
.sig-ey{font-size:6.5px;letter-spacing:3px;color:#0369A1;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:18px;padding-top:14px;border-top:0.5px solid #C8DEFF}
.sig-grid{display:grid;grid-template-columns:1fr 20px 1fr}
.sf{display:flex;flex-direction:column}
.sl{height:0.5px;background:#C8DEFF;margin-bottom:5px}
.slabel{font-size:6px;letter-spacing:2px;color:#6B8CAE;text-transform:uppercase;font-family:'DM Sans',sans-serif}
.sig-date-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px}

/* ── CLOSING ── */
.closing{padding:14px 24px 0;text-align:center;flex-shrink:0}
.cl-t{font-family:'DM Serif Display',serif;font-size:15px;color:#060B1A;margin-bottom:8px}
.cl-contacts{display:flex;justify-content:center;gap:14px;flex-wrap:wrap}
.cl-item{font-size:9px;font-weight:500;color:#0369A1;font-family:'DM Sans',sans-serif}

/* ── ADMIN INDICATOR ── */
.it-name .admin-cost{color:#7C3AED;font-size:4.5px}
`


function parse(s) {
  if (s === null || s === undefined || s === '') return 0
  if (typeof s === 'number') return isNaN(s) ? 0 : s
  const clean = String(s).replace(/[^0-9,]/g,'').replace(',','.')
  const n = parseFloat(clean); return isNaN(n) ? 0 : n
}


function buildPDF(data, adminMode=false){
  const{client_name,proposal_code,neighborhood,floors,labor,date_str,margin=1,client_phone1,client_phone2}=data
  const fmtN=v=>'R$\u202f'+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})

  const equipTotal=(floorsData||floors||[]).reduce((s,f)=>(f.rooms||[]).reduce((rs,r)=>rs+parse(r.price),s),0)
  const grandTotal=equipTotal+parse(labor)
  const laborVal=parse(labor)

  const contactStrip=()=>`<div class="contact-strip"><div><div class="cs-name">Rogério Silva</div><div class="cs-phone">+55 21 98170-9009</div></div><div class="cs-r"><div class="cs-item"><span class="cs-ic">@</span><span class="cs-tx">contato@rarohome.com.br</span></div><div class="cs-item"><span class="cs-ic">☆</span><span class="cs-tx-s">@rarohome</span></div><div class="cs-item"><span class="cs-ic">◉</span><span class="cs-tx-s">www.rarohome.com.br</span></div></div></div>`
  const pageHeader=()=>`<div class="phdr"><div><div class="phdr-brand">RARO HOME</div><div class="phdr-sub">Casa · Tecnologia · Lazer</div></div><div class="phdr-right">rarohome.com.br</div></div><div class="grule"></div>`
  const pageFooter=n=>`<div class="pftr"><div class="pftr-brand">RARO Home — Proposta Técnica${adminMode?' · VERSÃO ADMIN':''}</div><div class="pftr-n">${n}</div></div>`
  const clientMini=()=>`<div class="page-client"><div><div class="pc-name">${client_name}</div></div><div style="display:flex;gap:14px;align-items:center"><div class="pc-bairro">${neighborhood}</div><div class="pc-id">${proposal_code}</div></div></div>`

  const roomCard=r=>{
    const hl=r.highlight?' hl':''
    const rows=(r.items||[]).filter(i=>i.name).map(i=>{
      const qty=parseInt(i.qty)||1
      if(adminMode){
        const sale = ((i.sale_price||i.venda||i.price||0) * qty)
        const cost = ((i.cost_price||i.custo||0) * qty)
        const saleStr = sale>0 ? fmtN(sale) : '—'
        const costStr = cost>0 ? fmtN(cost) : '—'
        return '<tr style="border-bottom:0.5px solid #EDE9FE">' +
          '<td style="font-size:7px;color:#1E3A5F;padding:2px 4px;font-family:DM Sans,sans-serif">'+i.name+'</td>' +
          '<td style="font-size:7px;color:#7C3AED;text-align:right;padding:2px 4px;font-family:DM Sans,sans-serif;white-space:nowrap">'+saleStr+'</td>' +
          '<td style="font-size:6.5px;color:#E8956A;text-align:right;padding:2px 4px;font-family:DM Sans,sans-serif;white-space:nowrap">'+costStr+'</td>' +
          '<td style="font-size:7px;color:#0EA5E9;font-weight:600;text-align:right;padding:2px 4px;font-family:DM Sans,sans-serif">'+qty+'</td>' +
        '</tr>'
      }
      return `<tr><td class="it-name">${i.name}</td><td class="it-code">${i.code||''}</td><td class="it-qty">${i.qty||''}</td></tr>`
    }).join('')
    const thead=adminMode?`<tr style="background:#F3F0FF"><th style="font-size:5.5px;color:#7C3AED;padding:2px 3px;text-align:left;font-family:'DM Sans',sans-serif">Item</th><th style="font-size:5.5px;color:#7C3AED;text-align:right;padding:2px 3px;font-family:'DM Sans',sans-serif">Venda</th><th style="font-size:5.5px;color:#E8956A;text-align:right;padding:2px 3px;font-family:'DM Sans',sans-serif">Custo</th><th style="font-size:5.5px;color:#7C3AED;text-align:right;padding:2px 3px;font-family:'DM Sans',sans-serif">Qtd</th></tr>`:''
    const items=rows?`<table class="items-table" style="${adminMode?'border:0.5px solid #DDD6FE;border-radius:3px;overflow:hidden':''}">${thead}${rows}</table>`:''
    const pitch=r.pitch&&!adminMode?`<div class="rp">${r.pitch}</div>`:''
    const roomTotal=adminMode?(()=>{
      const cost=(r.items||[]).reduce((s,i)=>s+(i.cost_price||0)*(parseInt(i.qty)||1),0)
      const sale=parse(r.price)
      const mg=cost>0?Math.round((sale-cost)/cost*100):0
      return `<div style="display:flex;justify-content:space-between;margin-top:4px;padding-top:3px;border-top:1px solid #DDD6FE;flex-shrink:0"><div><div style="font-size:5px;letter-spacing:1.5px;color:#9CA3AF;text-transform:uppercase">Custo total</div><div style="font-size:9px;color:#E8956A;font-weight:600">${fmtN(cost)}</div></div><div style="text-align:center"><div style="font-size:5px;letter-spacing:1.5px;color:#9CA3AF;text-transform:uppercase">Margem</div><div style="font-size:9px;color:#7C3AED;font-weight:600">${mg}%</div></div><div style="text-align:right"><div style="font-size:5px;letter-spacing:1.5px;color:#9CA3AF;text-transform:uppercase">Venda</div><div style="font-size:9px;color:#060B1A;font-weight:600">${fmtN(sale)}</div></div></div>`
    })():`<div class="rv"><div class="rvl">Investimento</div><div class="rvv">${fmtN(parse(r.price))}</div></div>`
    return `<div class="room${hl}"><div class="rh"><span class="ri">${r.icon||'◈'}</span><div class="rn">${r.name}</div></div>${items}${pitch}${roomTotal}</div>`
  }

  const padRooms=rooms=>{ const r=[...rooms]; while(r.length%3!==0) r.push(null); return r }
  const floorBlock=(fl, flIdx)=>{ const padded=padRooms(fl.rooms||[]); const cards=padded.map(r=>r?roomCard(r):'<div class="room pad"></div>').join(''); return `<div class="fl-block"><div class="fl-section-hdr"><div class="fl-section-hdr-inner"><div class="fl-section-label">Pavimento</div><div class="fl-section-name">${fl.name.replace(' Pavimento','')}</div></div></div><div class="fl-block-grid">${cards}</div></div>` }

  const ROWS_PER_PAGE=6; const pages=[]; let pageNum=2; let curFloors=[]; let curRows=0
  const flushPage=()=>{ if(!curFloors.length) return; const blocksHtml=curFloors.map(floorBlock).join(''); const subHtml=curFloors.map(fl=>{ const sub=(fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0); return `<div class="sub-item">${fl.name.replace(' Pavimento','')}: <strong>${fmtN(sub)}</strong></div>` }).join(''); pages.push(`<div class="page">${pageHeader()}${clientMini()}<div class="rooms-3col">${blocksHtml}</div><div class="subtotals-bar">${subHtml}</div>${pageFooter(pageNum)}</div>`); pageNum++; curFloors=[]; curRows=0 }
  for(const fl of(floors||[])){ const rooms=fl.rooms||[]; if(!rooms.length) continue; const flRows=Math.ceil(rooms.length/3); if(curRows+0.4+flRows>ROWS_PER_PAGE&&curFloors.length) flushPage(); curFloors.push(fl); curRows+=0.4+flRows } flushPage()

  const testi=[['Antes eu esquecia a coifa ligada, o ar aceso, o portão aberto. Hoje a casa cuida de tudo. O WhatsApp me avisa de qualquer coisa.','Carlos M.','Barra da Tijuca, RJ'],['Receber visitas ficou outro nível. Acendo o telão, ligo o som do gourmet e ajusto a churrasqueira com uma mensagem.','Fernanda R.','Recreio, RJ'],['A segurança me deu paz de espírito. Acesso as câmeras 4K de onde estiver e recebo alertas em tempo real.','Ricardo & Ana L.','Itaipava, RJ'],['A internet chegou em todos os cômodos. O som do gourmet, sala e varanda funciona perfeitamente integrado.','Marcelo F.','Niterói, RJ']]
  const testiHtml=testi.map(([q,n,c])=>`<div class="testi"><div class="tq-stars"><div class="tq-star"></div><div class="tq-star"></div><div class="tq-star"></div><div class="tq-star"></div><div class="tq-star"></div></div><div class="tq">${q}</div><div class="testi-av">${n.split(' ').map(w=>w[0]).join('').slice(0,2)}</div><div><div class="tn">${n}</div><div class="tc">${c}</div></div></div>`).join('')

  const adminBanner=adminMode?`<div style="background:#7C3AED;padding:6px 24px;text-align:center;font-size:9px;letter-spacing:3px;color:#fff;text-transform:uppercase;font-family:'Jost',sans-serif">⚠ Versão Admin — Contém dados de custo — NÃO enviar ao cliente</div>`:'';

  const page1=`<div class="page">${adminBanner}

<div class="cov-top">
  <div><div class="cov-ey">RARO Home</div><div class="cov-si">Casa · Tecnologia · Lazer</div></div>
  <div class="cov-right">Documento exclusivo e confidencial<br>Válido por 30 dias · ${date_str||'2026'}</div>
</div>

<div class="logo-zone">
  <img src="${LOGO_COVER}" alt="RARO Home" style="height:160px;width:auto">
  <div class="logo-tagline">Casa · Tecnologia · Lazer</div>
  <div class="logo-orn"><div class="lo-l"></div><div class="lo-d"></div><div class="lo-l-r"></div></div>
</div>

<div class="hero">
  <div class="hero-ey">Proposta Técnica Exclusiva</div>
  <div class="hero-h serif">O espaço que você merece.<br>Criado com <em>exclusividade</em> para você.</div>
  <div class="hero-lead">Da automação ao gourmet de luxo — entregamos projetos completos com qualidade, exclusividade e atenção a cada detalhe da sua vida.</div>
</div>

<div class="client-banner">
  <div><div class="cb-name serif">${client_name}</div><div class="cb-id">${proposal_code}</div></div>
  <div class="cb-right"><div class="cb-bairro">${neighborhood}</div><div class="cb-date">Proposta técnica exclusiva</div></div>
</div>

<div class="quem">
  <div class="qc lft"><span class="qi">◈</span><div class="qt serif">Quem Somos</div><div class="qb">Criamos experiências únicas para quem vive com estilo. Cada projeto é exclusivo, desenvolvido com atenção obsessiva aos detalhes e ao que há de melhor no mercado.</div></div>
  <div class="qc"><span class="qi">◆</span><div class="qt serif">O que Entregamos</div><div class="qb">Áreas gourmet de luxo, churrasqueiras e coifas exclusivas, chopeiras, telão de LED externo, móveis externos premium, som ambiente, WiFi em toda a casa — e tudo automatizado por voz, toque ou WhatsApp.</div></div>
  <div class="qc" style="border-left:2.5px solid #C8DEFF"><span class="qi">◇</span><div class="qt serif">Tecnologia de Ponta</div><div class="qb">Zigbee · Matter · Tuya. Compatível com Alexa, Google Home e Apple HomeKit. Câmeras 4K com inteligência artificial.</div></div>
  <div class="qc"><span class="qi">◉</span><div class="qt serif">RARO Experience</div><div class="qb">Você tem um consultor dedicado do projeto à entrega. Instalação profissional, treinamento personalizado e suporte contínuo via WhatsApp — sem terceiros, sem surpresas.</div></div>
</div>

<div class="testi-section">
  <div class="testi-lbl">★ &nbsp;O que nossos clientes dizem</div>
  <div class="testi-grid">
    ${[['A casa cuida de tudo. Hoje o WhatsApp me avisa de qualquer coisa.','Carlos M.','Barra da Tijuca, RJ'],
       ['Receber visitas ficou outro nível. Ligo o som e o gourmet com uma mensagem.','Fernanda R.','Recreio, RJ'],
       ['A segurança me deu paz de espírito. Acesso as câmeras 4K de qualquer lugar.','Ricardo & Ana L.','Itaipava, RJ'],
       ['Internet em 100% dos cômodos. Som integrado na sala, gourmet e varanda.','Marcelo F.','Niterói, RJ']]
      .map(([q,n,c])=>`<div class="testi">
        <div class="tq-stars"><div class="tq-star"></div><div class="tq-star"></div><div class="tq-star"></div><div class="tq-star"></div><div class="tq-star"></div></div>
        <div class="tq serif">"${q}"</div>
        <div class="testi-author">
          <div class="testi-av">${n.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
          <div><div class="tn">${n}</div><div class="tc">${c}</div></div>
        </div>
      </div>`).join('')}
  </div>
</div>

<div class="contact-strip">
  <div><div class="cs-name serif">Rogério Silva</div><div class="cs-phone">+55 21 98170-9009</div></div>
  <div class="cs-r">
    <div class="cs-item"><span class="cs-ic">@</span><span class="cs-tx">contato@rarohome.com.br</span></div>
    <div class="cs-item"><span class="cs-ic">☆</span><span class="cs-tx-s">@rarohome</span></div>
    <div class="cs-item"><span class="cs-ic">◉</span><span class="cs-tx-s">www.rarohome.com.br</span></div>
  </div>
</div>
<div class="valid-strip">© RARO Home · ${client_name} · ${proposal_code} · Válido por 30 dias</div>
</div>`

  const adminSummary = adminMode ? `<div style="background:#3D1A6E;padding:10px 12px;border-radius:3px;margin-bottom:10px"><div style="font-size:7px;letter-spacing:2px;color:#C084FC;text-transform:uppercase;font-family:'DM Sans',sans-serif;margin-bottom:6px">Resumo Financeiro (Admin)</div><div style="display:flex;gap:16px;flex-wrap:wrap">${(floorsData||floors||[]).map(fl=>{ const costTotal=(fl.rooms||[]).flatMap(r=>r.items||[]).reduce((s,i)=>(s+(i.cost_price||0)*(parseInt(i.qty)||1)),0); const saleTotal=(fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0); const mg=costTotal>0?Math.round((saleTotal-costTotal)/costTotal*100):0; return `<div style="font-size:9px;color:#E9D5FF">${fl.name.replace(' Pavimento','')}: custo ${fmtN(costTotal)} · venda ${fmtN(saleTotal)} · margem ${mg}%</div>` }).join('')}</div></div>` : '';

  const pavBlocks = (floors||[]).map(fl=>{
    const rows = (fl.rooms||[]).map(r=>'<div class="pr"><span class="prn">'+r.name+'</span><span class="prv">'+fmtN(parse(r.price))+'</span></div>').join('')
    const sub  = (fl.rooms||[]).reduce((s,r)=>s+parse(r.price),0)
    return '<div class="pb"><div class="pb-title">'+fl.name+'</div>'+rows+'<div class="psub"><span class="psl">Subtotal</span><span class="psv">'+fmtN(sub)+'</span></div></div>'
  }).join('')

  const pageTotals=`<div class="page page-last">${pageHeader()}${clientMini()}<div class="tot-body"><div class="tot-ey">Resumo do Investimento</div>${adminSummary}<div class="pav-grid">${pavBlocks}</div><div class="tr"><span class="tl">Equipamentos — ${(floors||[]).length} Pavimento${(floors||[]).length>1?'s':''}</span><span class="tv">${fmtN(equipTotal)}</span></div><div class="tr"><span class="tl">Mão de Obra — Instalação e Programação</span><span class="tv">${fmtN(laborVal)}</span></div><div class="tr main"><span class="tl main">Investimento Total do Projeto</span><span class="tv main">${fmtN(grandTotal)}</span></div></div><div class="sig-section" style="margin-top:32px"><div class="sig-ey">Aprovação e Assinatura</div><div class="sig-grid"><div class="sf"><div class="sl"></div><div class="slabel">Cliente — Nome e Assinatura</div></div><div></div><div class="sf"><div class="sl"></div><div class="slabel">RARO Home</div></div></div><div class="sig-date-grid"><div class="sf"><div class="sl" style="max-width:120px"></div><div class="slabel">Data</div></div><div class="sf"><div class="sl" style="max-width:120px"></div><div class="slabel">Data</div></div></div></div><div class="closing"><div class="cl-t">Pronto para transformar sua residência?</div><div class="cl-contacts"><span class="cl-item">☎ +55 21 98170-9009</span><span class="cl-item">@ contato@rarohome.com.br</span><span class="cl-item">☆ @rarohome</span><span class="cl-item">◉ www.rarohome.com.br</span></div></div><div style="flex:1;min-height:16px"></div>${contactStrip()}<div class="valid-strip">© RARO Home · ${client_name} · ${proposal_code} · Válido por 30 dias</div></div>`

  const slogan=`<div style="text-align:center;padding:10px 0;font-family:'Jost',sans-serif;font-size:10px;letter-spacing:4px;color:rgba(140,109,70,0.7);text-transform:uppercase">Viva diferente. Viva RARO.</div>`

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>RARO Home — ${client_name} — ${proposal_code}</title><style>${PDF_CSS}.rooms-3col{flex:1;padding:4px 6px;display:flex;flex-direction:column;gap:0;overflow:hidden}.fl-block{display:flex;flex-direction:column;margin-bottom:2px}.fl-block-grid{display:grid;grid-template-columns:1fr 1fr 1fr;grid-auto-rows:1fr;gap:5px 6px;flex:1}.fl-block-grid .room,.rooms-3col .room{background:#fff;border:0.5px solid #E5DDD4;border-radius:3px;padding:8px 10px;display:flex;flex-direction:column;border-left:2.5px solid #E5DDD4;overflow:hidden;min-height:0}.fl-block-grid .room.hl,.rooms-3col .room.hl{border-left-color:#8C6D46}.fl-block-grid .room.pad,.rooms-3col .room.pad{background:transparent;border-color:transparent}.fl-block-grid .rh,.rooms-3col .rh{display:flex;align-items:flex-start;gap:5px;margin-bottom:4px}.fl-block-grid .ri,.rooms-3col .ri{font-size:12px;color:#8C6D46;flex-shrink:0;margin-top:1px}.fl-block-grid .rn,.rooms-3col .rn{font-family:'Playfair Display',serif;font-size:10px;font-weight:500;color:#1C1C1C;line-height:1.2}.fl-block-grid .items-table,.rooms-3col .items-table{width:100%;border-collapse:collapse;margin-bottom:3px}.fl-block-grid .it-name,.rooms-3col .it-name{font-size:5.5px;color:#6B635A;font-weight:300;padding:1px 0;line-height:1.3;width:62%;font-family:'Jost',sans-serif}.fl-block-grid .it-code,.rooms-3col .it-code{font-size:5px;color:#9E9690;text-align:center;width:26%;font-family:'Jost',sans-serif}.fl-block-grid .it-qty,.rooms-3col .it-qty{font-size:5.5px;color:#8C6D46;font-weight:600;text-align:right;width:12%;font-family:'Jost',sans-serif}.fl-block-grid .rp,.rooms-3col .rp{font-family:'Playfair Display',serif;font-style:italic;font-size:7px;color:#6A5234;padding-top:3px;line-height:1.25;margin-top:auto}.fl-block-grid .rv,.rooms-3col .rv{display:flex;justify-content:space-between;align-items:flex-end;margin-top:4px;padding-top:4px;border-top:0.5px solid #E5DDD4;flex-shrink:0}.fl-block-grid .rvl,.rooms-3col .rvl{font-size:5px;letter-spacing:2px;color:#9E9690;text-transform:uppercase;font-family:'Jost',sans-serif}.fl-block-grid .rvv,.rooms-3col .rvv{font-family:'Playfair Display',serif;font-size:11px;color:#1C1C1C}.fl-section-hdr{grid-column:1/-1;padding:5px 4px 3px;margin-top:3px}.fl-section-hdr-inner{display:flex;align-items:center;gap:8px;padding-bottom:4px;border-bottom:1px solid #C8BEB4}.fl-section-label{font-size:6px;letter-spacing:4px;color:#8C6D46;text-transform:uppercase;font-family:'Jost',sans-serif}.fl-section-name{font-family:'Playfair Display',serif;font-size:13px;color:#1E1A17;letter-spacing:1px}.subtotals-bar{background:#2C2520;padding:6px 24px;display:flex;justify-content:flex-end;align-items:center;gap:20px;flex-shrink:0}.sub-item{font-size:7px;color:#9E9690;font-family:'Jost',sans-serif;display:flex;align-items:center;gap:5px}.sub-item strong{color:#E8DDD0;font-size:12px;font-family:'Playfair Display',serif;font-weight:400}</style></head><body><div class="no-print" style="position:sticky;top:0;z-index:99;background:${adminMode?'#4C1D95':'#060B1A'};color:#F0F6FF;padding:9px 20px;display:flex;align-items:center;justify-content:space-between;font-family:'Jost',sans-serif;font-size:12px"><span><strong>RARO Home</strong>${adminMode?' — VERSÃO ADMIN':''} — ${client_name} · ${proposal_code}</span><button onclick="window.print()" style="background:#8C6D46;color:#fff;border:none;padding:7px 18px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;font-family:'Jost',sans-serif">⬇ Salvar como PDF</button></div>${page1}${pages.join('\n')}${pageTotals}</body></html>`
}


export async function openProposalPDF(proposal, adminMode=false) {
  try {
    const catalog = await getCatalog()
    const html = buildPDF({
      catalog,
      client_name:   proposal.client_name || proposal.clientName || '—',
      proposal_code: proposal.code || `#${proposal.id}`,
      neighborhood:  proposal.neighborhood || '',
      date_str:      new Date().toLocaleDateString('pt-BR', {month:'long',year:'numeric'}),
      floors:        proposal.floors || [],
      labor:         Number(proposal.labor) || 0,
      margin:        Number(proposal.margin) || 100,
      client_phone1: proposal.client_phone1 || '',
      client_phone2: proposal.client_phone2 || '',
    }, adminMode)

    // Try blob URL first
    try {
      const blob = new Blob([html], {type:'text/html;charset=utf-8'})
      const url  = URL.createObjectURL(blob)
      const w    = window.open(url, '_blank')
      if (w) { setTimeout(() => URL.revokeObjectURL(url), 10000); return }
      URL.revokeObjectURL(url)
    } catch(e) { /* fall through */ }

    // Fallback: write to new window directly
    const w = window.open('', '_blank')
    if (w) {
      w.document.open()
      w.document.write(html)
      w.document.close()
      return
    }

    // Last resort: download as file
    const blob = new Blob([html], {type:'text/html;charset=utf-8'})
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `proposta-${proposal.code || proposal.id}.html`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 5000)

  } catch(err) {
    console.error('openProposalPDF error:', err)
    alert('Erro ao gerar PDF: ' + err.message)
  }
}
