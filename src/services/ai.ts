// AI Generation Service - Cloudflare AI

const SYSTEM_PROMPT = `Du bist ein erfahrener BAFA-Beratungsexperte, der professionelle Beratungsberichte
für das Bundesamt für Wirtschaft und Ausfuhrkontrolle (BAFA) erstellt.
Schreibe ausschließlich in professionellem, sachlichem Deutsch. Verwende BAFA-konforme Terminologie.
Verwende "Herausforderungen" statt "Probleme". Keine Emoji oder informelle Sprache.`

interface GenerateOpts {
  branche: string
  unterbranche?: string
  companyName: string
  stichpunkte?: string[]
  herausforderungen?: string[]
  module?: string[]
  massnahmen?: Array<{ name: string; methode: string; ergebnis: string }>
  phase: 'ausgangslage' | 'beratungsinhalte' | 'massnahmen' | 'ergebnisse' | 'nachhaltigkeit'
}

export async function generateReportSection(ai: Ai, opts: GenerateOpts): Promise<{ success: boolean; text?: string; structured?: Record<string, string>; error?: string }> {
  const prompt = buildPrompt(opts)

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await ai.run('@cf/meta/llama-3.1-8b-instruct' as any, {
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
        max_tokens: 1200,
        temperature: 0.7,
      }) as any

      if (!res?.response) continue

      if (opts.phase === 'ergebnisse' || opts.phase === 'nachhaltigkeit') {
        try {
          const match = res.response.match(/\{[\s\S]*\}/)
          if (match) return { success: true, structured: JSON.parse(match[0]), text: res.response }
        } catch { /* fall through */ }
      }
      return { success: true, text: res.response }
    } catch { /* retry next attempt */ }
  }

  return { success: false, error: 'KI-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.' }
}

function buildPrompt(o: GenerateOpts): string {
  const br = o.unterbranche ? `${o.branche} (${o.unterbranche})` : o.branche
  switch (o.phase) {
    case 'ausgangslage':
      return `Erstelle den Abschnitt "Ausgangslage" für einen BAFA-Beratungsbericht.\nUnternehmen: ${o.companyName}\nBranche: ${br}\nStichpunkte: ${o.stichpunkte?.join(', ') || 'Keine'}\nHerausforderungen: ${o.herausforderungen?.join(', ') || 'Keine'}\n\nSchreibe 2-3 Absätze.`
    case 'beratungsinhalte':
      return `Erstelle "Beratungsinhalte" für ${o.companyName} (${br}).\nModule: ${o.module?.join(', ') || 'Keine'}\nMaßnahmen: ${JSON.stringify(o.massnahmen || [])}\n\nBeschreibe die durchgeführten Beratungsleistungen.`
    case 'massnahmen':
      return `Erstelle "Maßnahmenplan und Handlungsempfehlungen" für ${o.companyName} (${br}).\nModule: ${o.module?.join(', ') || 'Keine'}\nMaßnahmen: ${JSON.stringify(o.massnahmen || [])}\n\nErstelle einen konkreten Maßnahmenplan.`
    case 'ergebnisse':
      return `Generiere Ergebnisse für ${o.companyName} (${br}).\nMaßnahmen: ${JSON.stringify(o.massnahmen || [])}\n\nFormat als JSON: { "kurzfristig": "...", "mittelfristig": "...", "langfristig": "..." }`
    case 'nachhaltigkeit':
      return `Generiere Nachhaltigkeitsaspekte für ${o.companyName} (${br}).\nMaßnahmen: ${JSON.stringify(o.massnahmen || [])}\n\nFormat als JSON: { "oekonomisch": "...", "oekologisch": "...", "sozial": "..." }`
  }
}
