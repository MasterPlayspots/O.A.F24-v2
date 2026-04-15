// Branchen Routes - List all 10 industries with KV cache
import { Hono } from 'hono'
import type { Bindings, Variables } from '../types'

const branchen = new Hono<{ Bindings: Bindings; Variables: Variables }>()

const BRANCHEN = [
  { id: 'handwerk', name: 'Handwerk', icon: 'Wrench', herausforderungen: ['Fachkräftemangel','Digitalisierung','Materialkosten','Nachfolgeplanung','Preiskalkulation','Auftragsakquise','Baustellenorganisation'], beratungsfelder: ['Betriebsorganisation','Digitalisierung','Fachkräftegewinnung','Nachfolgeplanung','Kostenkalkulation','Marketing'], kpis: [{ label: 'Produktivstunden/MA', wert: '1.400-1.600 h/Jahr' },{ label: 'Materialquote', wert: '30-45%' }] },
  { id: 'handel', name: 'Handel', icon: 'ShoppingCart', unterbranchen: [{ id: 'einzelhandel', label: 'Einzelhandel' },{ id: 'grosshandel', label: 'Großhandel' },{ id: 'ecommerce', label: 'E-Commerce' },{ id: 'hybrid', label: 'Hybrid' }], herausforderungen: ['Online-Wettbewerb','Kundenfrequenz','Lagerhaltung','Omnichannel','Sortiment','Lieferanten','CRM'], beratungsfelder: ['Omnichannel','Warenwirtschaft','Einkauf','CRM','Standort','E-Commerce','Sortiment'], kpis: [{ label: 'Lagerumschlag', wert: '4-8x/Jahr' },{ label: 'Rohertragsmarge', wert: '25-45%' }] },
  { id: 'gastronomie', name: 'Gastronomie', icon: 'UtensilsCrossed', unterbranchen: [{ id: 'restaurant', label: 'Restaurant' },{ id: 'hotel', label: 'Hotel' },{ id: 'cafe', label: 'Café' },{ id: 'catering', label: 'Catering' },{ id: 'system', label: 'Systemgastronomie' }], herausforderungen: ['Personalfluktuation','Saisonale Schwankungen','Energiekosten','Digitalisierung','Online-Bewertungen','Hygiene','Konzeptentwicklung'], beratungsfelder: ['Ablaufoptimierung','Personalplanung','Digitalisierung','Marketing','Kostenstruktur','HACCP','Konzeptentwicklung'], kpis: [{ label: 'Wareneinsatz Food', wert: '25-35%' },{ label: 'Personalkosten', wert: '30-40%' }] },
  { id: 'it-software', name: 'IT & Software', icon: 'Monitor', unterbranchen: [{ id: 'agentur', label: 'Digitalagentur' },{ id: 'software', label: 'Softwareentwicklung' },{ id: 'systemhaus', label: 'Systemhaus' },{ id: 'saas', label: 'SaaS' },{ id: 'consulting', label: 'IT-Beratung' }], herausforderungen: ['Recruiting','Skalierung','Produkt vs Projekt','Vertrieb','Preismodelle','Projektmanagement','Technologie'], beratungsfelder: ['Geschäftsmodell','Vertrieb','Skalierung','Projektmanagement','Preisgestaltung','Teamstruktur','Partnerschaften'], kpis: [{ label: 'Umsatz/MA', wert: '€80k-150k' },{ label: 'Auslastung', wert: '70-85%' }] },
  { id: 'produktion', name: 'Produktion & Fertigung', icon: 'Factory', unterbranchen: [{ id: 'einzel', label: 'Einzelfertigung' },{ id: 'serie', label: 'Serienfertigung' },{ id: 'masse', label: 'Massenfertigung' },{ id: 'lohn', label: 'Lohnfertigung' }], herausforderungen: ['Lean Management','Lieferkette','Energiekosten','Industrie 4.0','QM','Fachkräfte','Maschinenpark'], beratungsfelder: ['Lean Management','QM','Produktionsplanung','Lieferkette','Energieeffizienz','Automatisierung','Arbeitsorganisation'], kpis: [{ label: 'OEE', wert: '>65% (Ziel >85%)' },{ label: 'Ausschuss', wert: '<3%' }] },
  { id: 'dienstleistung', name: 'Dienstleistung', icon: 'Briefcase', unterbranchen: [{ id: 'beratung', label: 'Beratung' },{ id: 'immobilien', label: 'Immobilien' },{ id: 'versicherung', label: 'Finanzen' },{ id: 'reinigung', label: 'Facility Management' }], herausforderungen: ['Kundenakquise','Preisgestaltung','Mitarbeiterbindung','Digitalisierung','Qualitätssicherung','Skalierung'], beratungsfelder: ['Vertrieb','Personal','Prozesse','Digitalisierung','QM','Finanzen'], kpis: [{ label: 'Kundenzufriedenheit', wert: '>85%' },{ label: 'Auslastung', wert: '70-85%' }] },
  { id: 'gesundheit', name: 'Gesundheit & Pflege', icon: 'Heart', unterbranchen: [{ id: 'arztpraxis', label: 'Arztpraxis' },{ id: 'pflege', label: 'Pflegedienst' },{ id: 'therapie', label: 'Therapie' },{ id: 'apotheke', label: 'Apotheke' }], herausforderungen: ['Fachkräftemangel','Regulatorik','Digitalisierung','Abrechnung','Patientenzufriedenheit','Work-Life-Balance'], beratungsfelder: ['Praxisorganisation','Digitalisierung','Personal','Abrechnung','Marketing','QM'], kpis: [{ label: 'Patientenzufriedenheit', wert: '>90%' },{ label: 'Terminauslastung', wert: '>85%' }] },
  { id: 'bildung', name: 'Bildung & Coaching', icon: 'GraduationCap', unterbranchen: [{ id: 'nachhilfe', label: 'Nachhilfe' },{ id: 'weiterbildung', label: 'Weiterbildung' },{ id: 'coaching', label: 'Coaching' },{ id: 'sprachschule', label: 'Sprachschule' }], herausforderungen: ['Digitale Lehre','Kundenakquise','Qualitätssicherung','Zertifizierungen','Skalierung','Dozenten'], beratungsfelder: ['Digitale Transformation','Marketing','QM','Geschäftsmodell','Personal','Fördermittel'], kpis: [{ label: 'Zufriedenheit', wert: '>85%' },{ label: 'Abschlussquote', wert: '>75%' }] },
  { id: 'bau', name: 'Bau & Immobilien', icon: 'Building', unterbranchen: [{ id: 'hochbau', label: 'Hochbau' },{ id: 'tiefbau', label: 'Tiefbau' },{ id: 'ausbau', label: 'Innenausbau' },{ id: 'planung', label: 'Planung' }], herausforderungen: ['Baukostensteigerung','Fachkräftemangel','BIM','Nachhaltiges Bauen','Lieferkette','Regulatorik'], beratungsfelder: ['Projektmanagement','BIM','Kosten','Nachhaltigkeit','Personal','Prozesse'], kpis: [{ label: 'Terminabweichung', wert: '<10%' },{ label: 'Kostenabweichung', wert: '<5%' }] },
  { id: 'sonstige', name: 'Sonstige Branche', icon: 'MoreHorizontal', herausforderungen: ['Prozessoptimierung','Digitalisierung','Personal','Kostenstruktur','Marketing','Organisation'], beratungsfelder: ['Strategie','Prozesse','Digitalisierung','Personal','Marketing','Finanzen'], kpis: [] },
]

branchen.get('/', async (c) => {
  try {
    const cached = await c.env.CACHE.get('branchen:all', 'json')
    if (cached) return c.json({ success: true, branchen: cached, cached: true })
  } catch { /* ignore */ }
  try { await c.env.CACHE.put('branchen:all', JSON.stringify(BRANCHEN), { expirationTtl: 3600 }) } catch { /* ignore */ }
  return c.json({ success: true, branchen: BRANCHEN })
})

branchen.get('/:id', (c) => {
  const b = BRANCHEN.find(x => x.id === c.req.param('id'))
  if (!b) return c.json({ success: false, error: 'Branche nicht gefunden' }, 404)
  return c.json({ success: true, branche: b })
})

export { branchen }
