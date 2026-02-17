// Report HTML Generation - Preview + Download with Schwarz-Rot-Gold branding
import type { ReportRow } from '../types'

export function generateReportPreview(report: ReportRow, unlocked: boolean): string {
  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BAFA-Beratungsbericht – ${esc(report.company_name || 'Entwurf')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;color:#1a1a1a;background:#f5f5f5;line-height:1.6}
.banderole{display:flex;height:8px;position:fixed;top:0;left:0;right:0;z-index:100}
.b-black{flex:1;background:#000}.b-red{flex:1;background:#DD0000}.b-gold{flex:1;background:#FFCC00}
.container{max-width:800px;margin:40px auto;padding:40px;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.1);border-radius:8px;position:relative}
h1{font-size:28px;color:#111;margin-bottom:16px}
.meta p{margin:4px 0;font-size:14px;color:#555}
section{margin-bottom:32px}
section h2{font-size:20px;color:#111;margin-bottom:12px;border-left:4px solid #DD0000;padding-left:12px}
section h3{font-size:16px;color:#333;margin:12px 0 8px}
.content{font-size:15px;color:#333}
.content p{margin-bottom:12px}
.blurred{filter:blur(4px);user-select:none;pointer-events:none}
.qa-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.qa-item{display:flex;justify-content:space-between;padding:8px 12px;background:#f9f9f9;border-radius:4px}
.qa-item.total{grid-column:span 2;background:#1a1a1a;color:#fff;font-weight:600}
.locked{text-align:center;padding:40px;background:linear-gradient(transparent,#fff 30%)}
.locked a{display:inline-block;margin-top:12px;padding:10px 24px;background:#DD0000;color:#fff;border-radius:6px;text-decoration:none;font-weight:600}
footer{margin-top:40px;padding-top:16px;border-top:1px solid #e5e5e5;font-size:12px;color:#999;text-align:center}
</style></head><body>
<div class="banderole"><div class="b-black"></div><div class="b-red"></div><div class="b-gold"></div></div>
<div class="container">
<header><h1>BAFA-Beratungsbericht</h1>
<div class="meta">
<p><strong>Unternehmen:</strong> ${esc(report.company_name || '–')}</p>
<p><strong>Branche:</strong> ${esc(report.branche || '–')}${report.unterbranche ? ` / ${esc(report.unterbranche)}` : ''}</p>
<p><strong>Rechtsform:</strong> ${esc(report.company_rechtsform || '–')}</p>
<p><strong>Standort:</strong> ${esc(report.company_plz || '')} ${esc(report.company_ort || '–')}</p>
<p><strong>Erstellt:</strong> ${fmtDate(report.created_at)}</p>
</div></header>
${report.ausgangslage_text ? sec('1. Ausgangslage', report.ausgangslage_text, unlocked) : ''}
${report.beratungsinhalte_text ? sec('2. Beratungsinhalte', report.beratungsinhalte_text, unlocked) : ''}
${report.massnahmenplan ? sec('3. Maßnahmenplan', report.massnahmenplan, unlocked) : ''}
${report.ergebnisse_kurzfristig ? `<section><h2>4. Erwartete Ergebnisse</h2><div class="content${unlocked ? '' : ' blurred'}">
${report.ergebnisse_kurzfristig ? `<h3>Kurzfristig</h3><p>${esc(report.ergebnisse_kurzfristig)}</p>` : ''}
${report.ergebnisse_mittelfristig ? `<h3>Mittelfristig</h3><p>${esc(report.ergebnisse_mittelfristig)}</p>` : ''}
${report.ergebnisse_langfristig ? `<h3>Langfristig</h3><p>${esc(report.ergebnisse_langfristig)}</p>` : ''}
</div></section>` : ''}
${report.nachhaltigkeit_oekonomisch ? `<section><h2>5. Nachhaltigkeit</h2><div class="content${unlocked ? '' : ' blurred'}">
<h3>Ökonomisch</h3><p>${esc(report.nachhaltigkeit_oekonomisch)}</p>
${report.nachhaltigkeit_oekologisch ? `<h3>Ökologisch</h3><p>${esc(report.nachhaltigkeit_oekologisch)}</p>` : ''}
${report.nachhaltigkeit_sozial ? `<h3>Sozial</h3><p>${esc(report.nachhaltigkeit_sozial)}</p>` : ''}
</div></section>` : ''}
${report.qa_gesamt > 0 ? `<section><h2>Qualitätsbewertung</h2><div class="qa-grid">
<div class="qa-item"><span>Vollständigkeit</span><span>${report.qa_vollstaendigkeit}%</span></div>
<div class="qa-item"><span>BAFA-Konformität</span><span>${report.qa_bafa_konformitaet}%</span></div>
<div class="qa-item"><span>Textqualität</span><span>${report.qa_textqualitaet}%</span></div>
<div class="qa-item"><span>Plausibilität</span><span>${report.qa_plausibilitaet}%</span></div>
<div class="qa-item total"><span>Gesamt</span><span>${report.qa_gesamt}%</span></div>
</div></section>` : ''}
${!unlocked ? '<div class="locked"><h3>Bericht gesperrt</h3><p>Schalten Sie diesen Bericht frei.</p><a href="https://zfbf.info/dashboard/pakete">Jetzt freischalten – 49€</a></div>' : ''}
<footer><p>Erstellt mit BAFA Creator AI – zfbf.info</p></footer>
</div></body></html>`
}

export function generateDownloadHtml(report: ReportRow): string {
  return generateReportPreview(report, true)
}

function sec(title: string, text: string, unlocked: boolean): string {
  return `<section><h2>${esc(title)}</h2><div class="content${unlocked ? '' : ' blurred'}">${fmtText(text)}</div></section>`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function fmtText(t: string): string {
  return t.split('\n\n').map(p => `<p>${esc(p.trim())}</p>`).join('\n')
}

function fmtDate(d: string): string {
  try { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return d }
}
