// Report HTML Generation - Preview + Download with Schwarz-Rot-Gold branding
// Uses AntragRow + AntragBausteinRow[] from bafa_antraege schema
import type { AntragRow, AntragBausteinRow } from '../types'

/** Get baustein content by type */
function getBaustein(bausteine: AntragBausteinRow[], typ: string): AntragBausteinRow | undefined {
  return bausteine.find(b => b.baustein_typ === typ)
}

/** Get structured JSON from a baustein */
function getStructured(baustein: AntragBausteinRow | undefined): Record<string, string> | null {
  if (!baustein?.inhalt_json) return null
  try { return JSON.parse(baustein.inhalt_json) } catch { return null }
}

export function generateReportPreview(antrag: AntragRow, bausteine: AntragBausteinRow[], unlocked: boolean): string {
  const ausgangslage = getBaustein(bausteine, 'ausgangslage')
  const beratungsinhalte = getBaustein(bausteine, 'beratungsinhalte')
  const massnahmen = getBaustein(bausteine, 'massnahmen')
  const ergebnisse = getBaustein(bausteine, 'ergebnisse')
  const nachhaltigkeit = getBaustein(bausteine, 'nachhaltigkeit')
  const ergebnisseData = getStructured(ergebnisse)
  const nachhaltigkeitData = getStructured(nachhaltigkeit)

  return `<!DOCTYPE html>
<html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BAFA-Beratungsbericht – ${esc(antrag.unternehmen_name || 'Entwurf')}</title>
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
<p><strong>Unternehmen:</strong> ${esc(antrag.unternehmen_name || '–')}</p>
<p><strong>Branche:</strong> ${esc(antrag.branche_id || '–')}</p>
${antrag.unternehmen_typ ? `<p><strong>Typ:</strong> ${esc(antrag.unternehmen_typ)}</p>` : ''}
${antrag.beratungsthema ? `<p><strong>Beratungsthema:</strong> ${esc(antrag.beratungsthema)}</p>` : ''}
${antrag.beratungsschwerpunkte ? `<p><strong>Schwerpunkte:</strong> ${esc(antrag.beratungsschwerpunkte)}</p>` : ''}
<p><strong>Erstellt:</strong> ${fmtDate(antrag.erstellt_am || '')}</p>
</div></header>
${ausgangslage?.inhalt ? sec('1. Ausgangslage', ausgangslage.inhalt, unlocked) : ''}
${beratungsinhalte?.inhalt ? sec('2. Beratungsinhalte', beratungsinhalte.inhalt, unlocked) : ''}
${massnahmen?.inhalt ? sec('3. Maßnahmenplan', massnahmen.inhalt, unlocked) : ''}
${ergebnisseData ? `<section><h2>4. Erwartete Ergebnisse</h2><div class="content${unlocked ? '' : ' blurred'}">
${ergebnisseData.kurzfristig ? `<h3>Kurzfristig</h3><p>${esc(ergebnisseData.kurzfristig)}</p>` : ''}
${ergebnisseData.mittelfristig ? `<h3>Mittelfristig</h3><p>${esc(ergebnisseData.mittelfristig)}</p>` : ''}
${ergebnisseData.langfristig ? `<h3>Langfristig</h3><p>${esc(ergebnisseData.langfristig)}</p>` : ''}
</div></section>` : (ergebnisse?.inhalt ? sec('4. Erwartete Ergebnisse', ergebnisse.inhalt, unlocked) : '')}
${nachhaltigkeitData ? `<section><h2>5. Nachhaltigkeit</h2><div class="content${unlocked ? '' : ' blurred'}">
<h3>Ökonomisch</h3><p>${esc(nachhaltigkeitData.oekonomisch || '')}</p>
${nachhaltigkeitData.oekologisch ? `<h3>Ökologisch</h3><p>${esc(nachhaltigkeitData.oekologisch)}</p>` : ''}
${nachhaltigkeitData.sozial ? `<h3>Sozial</h3><p>${esc(nachhaltigkeitData.sozial)}</p>` : ''}
</div></section>` : (nachhaltigkeit?.inhalt ? sec('5. Nachhaltigkeit', nachhaltigkeit.inhalt, unlocked) : '')}
${antrag.qualitaetsscore > 0 ? `<section><h2>Qualitätsbewertung</h2><div class="qa-grid">
<div class="qa-item total"><span>Gesamtbewertung</span><span>${antrag.qualitaetsscore}%</span></div>
</div></section>` : ''}
${!unlocked ? '<div class="locked"><h3>Bericht gesperrt</h3><p>Schalten Sie diesen Bericht frei.</p><a href="https://zfbf.info/dashboard/pakete">Jetzt freischalten – 49€</a></div>' : ''}
<footer><p>Erstellt mit BAFA Creator AI – zfbf.info</p></footer>
</div></body></html>`
}

export function generateDownloadHtml(antrag: AntragRow, bausteine: AntragBausteinRow[]): string {
  return generateReportPreview(antrag, bausteine, true)
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
