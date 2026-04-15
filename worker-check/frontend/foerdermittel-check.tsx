'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Bot, User, Send, Upload, CheckCircle2, Clock, FileText, AlertTriangle,
  Building2, MapPin, Users, Euro, Calendar, Rocket, Cpu, Lightbulb,
  Recycle, Plane, GraduationCap, Landmark, BrainCircuit, HeartHandshake,
  Download, ChevronRight, ExternalLink, X, Loader2, Sparkles, FileUp, Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ============================================================
// CONFIG
// ============================================================
const API_BASE = process.env.NEXT_PUBLIC_CHECK_API_URL || 'https://foerdermittel-check-api.YOUR_DOMAIN.workers.dev'
const PRIMARY = '#1B4F72'
const GREEN = '#27AE60'
const ORANGE = '#E67E22'
const RED = '#E74C3C'

// ============================================================
// KONSTANTEN
// ============================================================
const BUNDESLAENDER = [
  'Baden-Württemberg','Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen',
  'Mecklenburg-Vorpommern','Niedersachsen','Nordrhein-Westfalen','Rheinland-Pfalz',
  'Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Thüringen'
]
const BRANCHEN = [
  'IT & Software','Verarbeitendes Gewerbe','Handel & E-Commerce','Handwerk',
  'Dienstleistungen','Gesundheitswesen','Landwirtschaft','Energie','Tourismus & Gastro',
  'Bildung & Forschung','Logistik & Transport','Baugewerbe','Sonstiges'
]
const RECHTSFORMEN = ['GmbH','UG (haftungsbeschränkt)','AG','eG','GbR','Einzelunternehmen','KG','OHG','Freiberufler']
const VORHABEN = [
  { id:'digitalisierung', label:'Digitalisierung', icon: Cpu },
  { id:'energie', label:'Energie & Nachhaltigkeit', icon: Recycle },
  { id:'gruendung', label:'Gründung', icon: Rocket },
  { id:'innovation', label:'Innovation', icon: Lightbulb },
  { id:'export', label:'Export & Internationalisierung', icon: Plane },
  { id:'personal', label:'Personal & Weiterbildung', icon: Users },
  { id:'umwelt', label:'Umweltschutz', icon: Recycle },
  { id:'investition', label:'Investition', icon: Landmark },
  { id:'forschung', label:'Forschung & Entwicklung', icon: BrainCircuit },
  { id:'beratung', label:'Beratung', icon: GraduationCap },
]
const DOC_TYPES = [
  { key:'handelsregister', label:'Handelsregisterauszug', desc:'Nicht älter als 3 Monate' },
  { key:'jahresabschluss', label:'Jahresabschluss / BWA', desc:'Letztes Geschäftsjahr' },
  { key:'businessplan', label:'Businessplan', desc:'Inkl. Finanzplanung' },
  { key:'steuerbescheid', label:'Steuerbescheid', desc:'Letzter Veranlagungszeitraum' },
  { key:'gesellschaftervertrag', label:'Gesellschaftervertrag', desc:'Aktuelle Fassung' },
  { key:'sonstiges', label:'Sonstiges Dokument', desc:'Weitere relevante Unterlagen' },
]

// ============================================================
// TYPEN
// ============================================================
type FormData = {
  firmenname:string; rechtsform:string; branche:string; bundesland:string; plz:string;
  mitarbeiter:number; jahresumsatz:number; gruendungsjahr:number;
  vorhaben:string; vorhaben_details:string; investitionsvolumen:number; email:string;
}
type ChatMsg = { id:number; sender:'bot'|'user'; text:string }
type DocState = { status:'ausstehend'|'hochgeladen'|'analysiert'; file?:File; extrakt?:Record<string,any>; docId?:string }
type Ergebnis = {
  programm:{id:number;titel:string;foerderart:string;foerdergebiet:string;url?:string;kurztext?:string};
  relevanz_score:number; begruendung:string; max_foerdersumme?:number;
  rechtliche_pruefung?:any; voraussetzungen_erfuellt?:Record<string,any>;
  kombinierbar_mit?:number[]; risiken?:string[];
}
type PlanItem = {
  schritt:number; aktion:string; beschreibung?:string; dokument_typ?:string;
  status:string; frist?:string; link?:string; bereits_hochgeladen?:boolean;
}
type ProgrammPlan = { programm:any; relevanz_score:number; max_foerdersumme?:number; schritte:PlanItem[] }

const STEPS = [
  { nr:1, label:'Unternehmen', icon: Building2 },
  { nr:2, label:'KI-Berater', icon: Bot },
  { nr:3, label:'Dokumente', icon: FileText },
  { nr:4, label:'Ergebnisse', icon: Sparkles },
  { nr:5, label:'Aktionsplan', icon: Rocket },
]

// ============================================================
// MOCK DATEN (für Demo ohne Backend)
// ============================================================
const MOCK_ERGEBNISSE: Ergebnis[] = [
  {
    programm:{id:1,titel:'Digital Jetzt',foerderart:'Zuschuss',foerdergebiet:'bundesweit',kurztext:'Investitionszuschuss für KMU zur Digitalisierung'},
    relevanz_score:92,begruendung:'Perfekte Passung: KMU im Bereich Digitalisierung mit passendem Investitionsvolumen',
    max_foerdersumme:50000,kombinierbar_mit:[2],risiken:['Fördertopf ggf. ausgeschöpft'],
    voraussetzungen_erfuellt:{'KMU-Status':{'erfuellt':true,'begruendung':'< 250 MA'},'Sitz in DE':{'erfuellt':true,'begruendung':'Bestätigt'},'Min. 3 MA':{'erfuellt':true,'begruendung':'45 MA'},'Digitalisierungsvorhaben':{'erfuellt':true,'begruendung':'ERP-Einführung qualifiziert'}}
  },
  {
    programm:{id:2,titel:'go-digital',foerderart:'Zuschuss',foerdergebiet:'bundesweit',kurztext:'Beratungsförderung für kleine Unternehmen'},
    relevanz_score:78,begruendung:'Gute Passung für begleitende Beratung zum Digitalisierungsvorhaben',
    max_foerdersumme:16500,kombinierbar_mit:[1],risiken:['Nur Beratungsleistungen, keine Hardware'],
    voraussetzungen_erfuellt:{'< 100 MA':{'erfuellt':true,'begruendung':'45 MA'},'Umsatz < 20 Mio':{'erfuellt':true,'begruendung':'5 Mio €'},'Autorisierter Berater':{'erfuellt':false,'begruendung':'Noch kein Berater ausgewählt'}}
  },
  {
    programm:{id:3,titel:'KfW-Digitalisierungskredit',foerderart:'Darlehen',foerdergebiet:'bundesweit',kurztext:'Zinsgünstiges Darlehen für Digitalisierungsinvestitionen'},
    relevanz_score:71,begruendung:'Ergänzende Finanzierung über den Zuschuss hinaus möglich',
    max_foerdersumme:25000000,kombinierbar_mit:[],risiken:['Bonitätsprüfung durch Hausbank','Haftung für Darlehen'],
    voraussetzungen_erfuellt:{'Unternehmen in DE':{'erfuellt':true,'begruendung':'Bestätigt'},'Digitales Investitionsvorhaben':{'erfuellt':true,'begruendung':'ERP-System qualifiziert'},'Nicht in Schwierigkeiten':{'erfuellt':true,'begruendung':'Laut Angaben solide'}}
  },
  {
    programm:{id:4,titel:'NRW.BANK Innovationskredit',foerderart:'Darlehen',foerdergebiet:'Nordrhein-Westfalen',kurztext:'Landesförderung für innovative Projekte in NRW'},
    relevanz_score:45,begruendung:'Nur relevant wenn Sitz in NRW',
    max_foerdersumme:10000000,kombinierbar_mit:[],risiken:['Standort muss in NRW sein'],
    voraussetzungen_erfuellt:{'Sitz in NRW':{'erfuellt':false,'begruendung':'Bundesland prüfen'},'Innovationsvorhaben':{'erfuellt':true,'begruendung':'Digitalisierung zählt'}}
  }
]
const MOCK_PLAN: ProgrammPlan[] = [
  {
    programm:{id:1,titel:'Digital Jetzt',foerderart:'Zuschuss'},relevanz_score:92,max_foerdersumme:50000,
    schritte:[
      {schritt:1,aktion:'De-minimis-Erklärung ausfüllen',beschreibung:'Erklärung über erhaltene Beihilfen der letzten 3 Jahre',dokument_typ:'deminimis',status:'offen',link:'https://www.bmwk.de'},
      {schritt:2,aktion:'Digitalplan erstellen',beschreibung:'Detaillierter Plan des Digitalisierungsvorhabens mit Kostenaufstellung',dokument_typ:'businessplan',status:'offen',bereits_hochgeladen:true},
      {schritt:3,aktion:'IT-Dienstleister-Angebot einholen',beschreibung:'Min. 2 vergleichbare Angebote für ERP-System',status:'offen'},
      {schritt:4,aktion:'Antrag online stellen',beschreibung:'Über Förderportal des BMWK',status:'offen',frist:'2026-06-30',link:'https://www.bmwk.de/digital-jetzt'},
    ]
  },
  {
    programm:{id:2,titel:'go-digital',foerderart:'Zuschuss'},relevanz_score:78,max_foerdersumme:16500,
    schritte:[
      {schritt:1,aktion:'Autorisierten Berater finden',beschreibung:'Berater aus der go-digital-Beraterbasis wählen',status:'offen',link:'https://www.bmwk.de/go-digital'},
      {schritt:2,aktion:'Beratungsvertrag abschließen',beschreibung:'Vertrag mit autorisiertem Beratungsunternehmen',status:'offen'},
      {schritt:3,aktion:'Antrag durch Berater stellen',beschreibung:'Der Berater stellt den Antrag für Sie',status:'offen'},
    ]
  }
]

// ============================================================
// HAUPTKOMPONENTE
// ============================================================
export default function FoerdermittelCheck() {
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)
  const [useMock, setUseMock] = useState(true) // Toggle für Demo/Live
  const [form, setForm] = useState<FormData>({
    firmenname:'',rechtsform:'',branche:'',bundesland:'',plz:'',
    mitarbeiter:0,jahresumsatz:0,gruendungsjahr:2020,
    vorhaben:'',vorhaben_details:'',investitionsvolumen:0,email:''
  })
  const [vorfilterCount, setVorfilterCount] = useState(0)
  // Chat
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [extractedData, setExtractedData] = useState<Record<string,any>>({})
  const [chatReady, setChatReady] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)
  // Dokumente
  const [docs, setDocs] = useState<Record<string,DocState>>(
    Object.fromEntries(DOC_TYPES.map(d => [d.key, {status:'ausstehend' as const}]))
  )
  const [analyzing, setAnalyzing] = useState(false)
  // Ergebnisse
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([])
  const [kombinationen, setKombinationen] = useState<any>(null)
  const [zusammenfassung, setZusammenfassung] = useState('')
  // Aktionsplan
  const [plan, setPlan] = useState<ProgrammPlan[]>([])
  const [planChecked, setPlanChecked] = useState<Record<string,boolean>>({})

  useEffect(() => { chatEnd.current?.scrollIntoView({behavior:'smooth'}) }, [messages, typing])

  // ── API-Calls ──────────────────────────────────────────

  async function apiCall(path:string, opts:RequestInit={}) {
    const res = await fetch(`${API_BASE}${path}`, {
      headers:{'Content-Type':'application/json',...(opts.headers||{})},
      ...opts
    })
    return res.json()
  }

  // ── Step 1: Formular absenden ──────────────────────────

  async function submitForm() {
    setLoading(true)
    if (useMock) {
      await new Promise(r => setTimeout(r, 1500))
      setSessionId('mock-session-123')
      setVorfilterCount(47)
      setMessages([{
        id:1, sender:'bot',
        text:`Willkommen zum Fördermittel-Check für **${form.firmenname}**! Basierend auf Ihren Angaben kommen ca. **47 Förderprogramme** in Frage.\n\nUm die passenden Programme zu finden, habe ich ein paar Fragen:\n\n1. Haben Sie in den letzten 3 Jahren bereits Fördermittel erhalten?\n2. Wann planen Sie mit der Umsetzung zu beginnen?\n3. Befindet sich Ihr Unternehmen in wirtschaftlichen Schwierigkeiten?`
      }])
      setStep(2)
      setLoading(false)
      return
    }
    try {
      const data = await apiCall('/api/checks', { method:'POST', body:JSON.stringify(form) })
      if (data.success) {
        setSessionId(data.session_id)
        setVorfilterCount(data.vorfilter_treffer)
        setMessages([{id:1,sender:'bot',text:data.begruessung}])
        setStep(2)
      }
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  // ── Step 2: Chat ────────────────────────────────────────

  async function sendChat() {
    if (!chatInput.trim()) return
    const userMsg:ChatMsg = {id:Date.now(),sender:'user',text:chatInput}
    setMessages(p => [...p, userMsg])
    setChatInput('')
    setTyping(true)

    if (useMock) {
      await new Promise(r => setTimeout(r, 2000))
      const mockReplies = [
        {text:'Sehr gut, dass Sie noch keine Fördermittel erhalten haben. Das bedeutet Ihr De-minimis-Rahmen von 300.000 € ist voll verfügbar.\n\nPlanen Sie das Vorhaben allein oder mit Partnern umzusetzen?', data:{de_minimis_erhalten:false,de_minimis_verfuegbar:300000}},
        {text:'Verstanden. Für Ihr ERP-Projekt als Einzelvorhaben gibt es besonders viele Möglichkeiten.\n\nWie viele Mitarbeiter werden direkt von der Digitalisierung profitieren? Und haben Sie bereits Angebote von IT-Dienstleistern eingeholt?', data:{einzelvorhaben:true}},
        {text:'30 Mitarbeiter und bereits ein Angebot – sehr gut vorbereitet!\n\nEine letzte wichtige Frage: Haben Sie bereits mit dem Vorhaben begonnen? Bei vielen Programmen muss der Antrag VOR Projektbeginn gestellt werden.', data:{betroffene_ma:30,angebote_vorhanden:true}},
        {text:'Perfekt – da Sie noch nicht begonnen haben, stehen alle Türen offen! Ich habe jetzt genug Informationen für eine detaillierte Analyse.\n\n**Empfehlung:** Laden Sie jetzt relevante Dokumente hoch (z.B. Jahresabschluss, Handelsregisterauszug), damit ich die Förderfähigkeit noch genauer prüfen kann.', data:{projekt_begonnen:false,antrag_vor_beginn:true}},
      ]
      const idx = Math.min(messages.filter(m=>m.sender==='user').length, mockReplies.length-1)
      const reply = mockReplies[idx]
      setExtractedData(p => ({...p,...reply.data}))
      setMessages(p => [...p, {id:Date.now()+1,sender:'bot',text:reply.text}])
      if (idx >= 2) setChatReady(true)
      setTyping(false)
      return
    }

    try {
      const data = await apiCall(`/api/checks/${sessionId}/chat`, {
        method:'POST', body:JSON.stringify({nachricht:chatInput})
      })
      if (data.success) {
        setMessages(p => [...p, {id:Date.now()+1,sender:'bot',text:data.nachricht}])
        if (data.extracted_data) setExtractedData(p => ({...p,...data.extracted_data}))
        if (data.status === 'dokumente') setChatReady(true)
      }
    } catch(e) { console.error(e) }
    setTyping(false)
  }

  // ── Step 3: Upload ──────────────────────────────────────

  async function uploadDoc(key:string, file:File) {
    setDocs(p => ({...p,[key]:{status:'hochgeladen',file}}))
    if (useMock) {
      await new Promise(r => setTimeout(r, 1500))
      const mockExtrakte:Record<string,any> = {
        handelsregister:{rechtsform:'GmbH',gruendung:'2015-03-12',stammkapital:'25.000 €',geschaeftsfuehrer:'Max Mustermann'},
        jahresabschluss:{umsatz:'5.200.000 €',bilanzsumme:'3.100.000 €',eigenkapital:'890.000 €',mitarbeiter:45},
        businessplan:{investitionssumme:'150.000 €',roi_prognose:'18 Monate',zielmarkt:'DACH'},
      }
      setDocs(p => ({...p,[key]:{status:'analysiert',file,extrakt:mockExtrakte[key]||{hinweis:'Dokument erfolgreich analysiert'}}}))
      return
    }
    try {
      const fd = new FormData()
      fd.append('datei',file)
      fd.append('typ',key)
      const res = await fetch(`${API_BASE}/api/checks/${sessionId}/docs`, {method:'POST',body:fd})
      const data = await res.json()
      if (data.success) {
        setDocs(p => ({...p,[key]:{status:'analysiert',file,extrakt:data.ki_extrakt,docId:data.dokument_id}}))
      }
    } catch(e) { console.error(e) }
  }

  // ── Step 4: Analyse starten ─────────────────────────────

  async function startAnalysis() {
    setAnalyzing(true)
    setStep(4)
    if (useMock) {
      await new Promise(r => setTimeout(r, 3000))
      setErgebnisse(MOCK_ERGEBNISSE)
      setZusammenfassung(`Für ${form.firmenname} wurden 4 relevante Förderprogramme identifiziert. Davon haben 3 eine hohe Passung (Score ≥ 70). Die geschätzte maximale Gesamtfördersumme liegt bei ca. 91.500 EUR an Zuschüssen plus zinsgünstige Darlehen.`)
      setAnalyzing(false)
      return
    }
    try {
      const data = await apiCall(`/api/checks/${sessionId}/analyze`, {method:'POST'})
      if (data.success) {
        setErgebnisse(data.ergebnisse)
        setKombinationen(data.kombinationen)
        setZusammenfassung(data.zusammenfassung)
      }
    } catch(e) { console.error(e) }
    setAnalyzing(false)
  }

  // ── Step 5: Aktionsplan laden ───────────────────────────

  async function loadPlan() {
    setStep(5)
    if (useMock) { setPlan(MOCK_PLAN); return }
    try {
      const data = await apiCall(`/api/checks/${sessionId}/plan`)
      if (data.success) setPlan(data.aktionsplan)
    } catch(e) { console.error(e) }
  }

  // ── Formatierung ────────────────────────────────────────

  function fmtEuro(n:number) { return new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n) }
  function scoreColor(s:number) { return s >= 70 ? GREEN : s >= 50 ? ORANGE : RED }
  function artColor(a:string) { return a==='Zuschuss'?GREEN:a==='Darlehen'?PRIMARY:ORANGE }
  function renderMd(text:string) { return text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br/>') }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background:PRIMARY}}>
                <Sparkles className="w-5 h-5 text-white"/>
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{color:PRIMARY}}>Fördermittel-Check</h1>
                <p className="text-xs text-gray-500">KI-gestützte Fördermittelanalyse für Ihr Unternehmen</p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs">
              {useMock ? '🎮 Demo-Modus' : '🔴 Live'}
            </Badge>
          </div>
          {/* Stepper */}
          <div className="flex items-center gap-1">
            {STEPS.map((s,i) => (
              <div key={s.nr} className="flex items-center flex-1">
                <button
                  onClick={() => s.nr < step && setStep(s.nr)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all w-full
                    ${step===s.nr ? 'text-white shadow-md' : step>s.nr ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400'}`}
                  style={step===s.nr ? {background:PRIMARY} : {}}
                  disabled={s.nr > step}
                >
                  <s.icon className="w-4 h-4 shrink-0"/>
                  <span className="hidden sm:inline">{s.label}</span>
                  {step > s.nr && <CheckCircle2 className="w-3 h-3 text-green-600 ml-auto"/>}
                </button>
                {i < STEPS.length-1 && <ChevronRight className="w-4 h-4 text-gray-300 mx-1 shrink-0"/>}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

      {/* ═══════════════════════════════════════════
          STEP 1: UNTERNEHMEN
         ═══════════════════════════════════════════ */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" style={{color:PRIMARY}}/> Ihr Unternehmen</CardTitle>
              <CardDescription>Geben Sie die Basisdaten Ihres Unternehmens ein. Je genauer, desto besser die Ergebnisse.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Zeile 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Firmenname *</Label>
                  <Input placeholder="Muster GmbH" value={form.firmenname} onChange={e=>setForm(p=>({...p,firmenname:e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <Label>Rechtsform *</Label>
                  <Select value={form.rechtsform} onValueChange={v=>setForm(p=>({...p,rechtsform:v}))}>
                    <SelectTrigger><SelectValue placeholder="Bitte wählen"/></SelectTrigger>
                    <SelectContent>{RECHTSFORMEN.map(r=><SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {/* Zeile 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Branche *</Label>
                  <Select value={form.branche} onValueChange={v=>setForm(p=>({...p,branche:v}))}>
                    <SelectTrigger><SelectValue placeholder="Bitte wählen"/></SelectTrigger>
                    <SelectContent>{BRANCHEN.map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bundesland *</Label>
                  <Select value={form.bundesland} onValueChange={v=>setForm(p=>({...p,bundesland:v}))}>
                    <SelectTrigger><SelectValue placeholder="Bitte wählen"/></SelectTrigger>
                    <SelectContent>{BUNDESLAENDER.map(b=><SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>PLZ</Label>
                  <Input placeholder="80331" maxLength={5} value={form.plz} onChange={e=>setForm(p=>({...p,plz:e.target.value}))}/>
                </div>
              </div>
              {/* Zeile 3 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Mitarbeiter</Label>
                  <Input type="number" placeholder="45" value={form.mitarbeiter||''} onChange={e=>setForm(p=>({...p,mitarbeiter:+e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <Label>Jahresumsatz (EUR)</Label>
                  <Input type="number" placeholder="5000000" value={form.jahresumsatz||''} onChange={e=>setForm(p=>({...p,jahresumsatz:+e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <Label>Gründungsjahr</Label>
                  <Input type="number" placeholder="2015" value={form.gruendungsjahr||''} onChange={e=>setForm(p=>({...p,gruendungsjahr:+e.target.value}))}/>
                </div>
              </div>
              {/* Vorhaben Cards */}
              <div className="space-y-2">
                <Label>Was möchten Sie fördern lassen? *</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {VORHABEN.map(v => (
                    <button key={v.id} onClick={()=>setForm(p=>({...p,vorhaben:v.id}))}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-medium hover:shadow-md
                        ${form.vorhaben===v.id ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 bg-white'}`}
                    >
                      <v.icon className="w-6 h-6" style={{color: form.vorhaben===v.id ? PRIMARY : '#9CA3AF'}}/>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Details */}
              <div className="space-y-2">
                <Label>Beschreiben Sie Ihr Vorhaben</Label>
                <Textarea placeholder="z.B. Einführung eines ERP-Systems zur Digitalisierung der Produktion und Lagerverwaltung..."
                  value={form.vorhaben_details} onChange={e=>setForm(p=>({...p,vorhaben_details:e.target.value}))} rows={3}/>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Geplantes Investitionsvolumen (EUR)</Label>
                  <Input type="number" placeholder="150000" value={form.investitionsvolumen||''} onChange={e=>setForm(p=>({...p,investitionsvolumen:+e.target.value}))}/>
                </div>
                <div className="space-y-2">
                  <Label>E-Mail (für Ergebnisse)</Label>
                  <Input type="email" placeholder="info@muster-gmbh.de" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))}/>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full h-12 text-base font-semibold" style={{background:PRIMARY}} onClick={submitForm}
                disabled={loading || !form.firmenname || !form.branche || !form.bundesland || !form.vorhaben}>
                {loading ? <><Loader2 className="w-5 h-5 animate-spin mr-2"/> Wird analysiert...</> : <><Sparkles className="w-5 h-5 mr-2"/> Fördermittel-Check starten</>}
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STEP 2: CHAT
         ═══════════════════════════════════════════ */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Chat-Bereich */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{background:PRIMARY}}>
                    <Bot className="w-5 h-5 text-white"/>
                  </div>
                  <div>
                    <CardTitle className="text-base">Förder-Assistent</CardTitle>
                    <p className="text-xs text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Online</p>
                  </div>
                  <Badge variant="outline" className="ml-auto text-xs">{vorfilterCount} Programme vorausgewählt</Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto py-4 space-y-4">
                {messages.map(m => (
                  <div key={m.id} className={`flex gap-3 ${m.sender==='user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.sender==='bot' ? 'bg-blue-100' : 'bg-gray-200'}`}>
                      {m.sender==='bot' ? <Bot className="w-4 h-4" style={{color:PRIMARY}}/> : <User className="w-4 h-4 text-gray-600"/>}
                    </div>
                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed
                      ${m.sender==='bot' ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'text-white rounded-tr-sm'}`}
                      style={m.sender==='user' ? {background:PRIMARY} : {}}
                      dangerouslySetInnerHTML={{__html:renderMd(m.text)}}
                    />
                  </div>
                ))}
                {typing && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center"><Bot className="w-4 h-4" style={{color:PRIMARY}}/></div>
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                      <div className="flex gap-1.5"><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"/><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}/><span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}/></div>
                    </div>
                  </div>
                )}
                <div ref={chatEnd}/>
              </CardContent>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input placeholder="Ihre Antwort eingeben..." value={chatInput}
                    onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} className="flex-1"/>
                  <Button onClick={sendChat} disabled={!chatInput.trim()||typing} style={{background:PRIMARY}}>
                    <Send className="w-4 h-4"/>
                  </Button>
                </div>
                {chatReady && (
                  <Button className="w-full mt-3" variant="outline" onClick={()=>setStep(3)}>
                    <FileText className="w-4 h-4 mr-2"/> Weiter zu Dokumenten <ChevronRight className="w-4 h-4 ml-1"/>
                  </Button>
                )}
              </div>
            </Card>
          </div>
          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Info className="w-4 h-4"/> Erkannte Daten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(extractedData).length === 0
                  ? <p className="text-xs text-gray-400">Daten werden während des Chats extrahiert...</p>
                  : Object.entries(extractedData).map(([k,v]) => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 capitalize">{k.replace(/_/g,' ')}</span>
                      <Badge variant={v===true||v===false ? (v ? 'default' : 'destructive') : 'secondary'} className="text-[10px]">
                        {typeof v==='boolean' ? (v ? '✓ Ja' : '✗ Nein') : String(v)}
                      </Badge>
                    </div>
                  ))
                }
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Ihr Unternehmen</CardTitle></CardHeader>
              <CardContent className="text-xs space-y-1 text-gray-600">
                <p><strong>{form.firmenname}</strong></p>
                <p>{form.branche} • {form.bundesland}</p>
                <p>{form.mitarbeiter} MA • {fmtEuro(form.jahresumsatz)} Umsatz</p>
                <p>Vorhaben: {VORHABEN.find(v=>v.id===form.vorhaben)?.label}</p>
                {form.investitionsvolumen>0 && <p>Invest: {fmtEuro(form.investitionsvolumen)}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STEP 3: DOKUMENTE
         ═══════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" style={{color:PRIMARY}}/> Dokumente hochladen</CardTitle>
              <CardDescription>Laden Sie relevante Unterlagen hoch – unsere KI analysiert sie automatisch und extrahiert die wichtigsten Kennzahlen.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DOC_TYPES.map(dt => {
                  const d = docs[dt.key]
                  return (
                    <Card key={dt.key} className={`border-2 transition-all ${d.status==='analysiert'?'border-green-300 bg-green-50':d.status==='hochgeladen'?'border-blue-300 bg-blue-50':'border-dashed border-gray-300 hover:border-blue-400'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {d.status==='analysiert' ? <CheckCircle2 className="w-5 h-5 text-green-600"/>
                              : d.status==='hochgeladen' ? <Loader2 className="w-5 h-5 text-blue-600 animate-spin"/>
                              : <Clock className="w-5 h-5 text-gray-400"/>}
                            <span className="text-sm font-medium">{dt.label}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{dt.desc}</p>
                        {d.status==='ausstehend' && (
                          <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                            <FileUp className="w-6 h-6 text-gray-400"/>
                            <span className="text-xs text-gray-500">Datei auswählen (PDF, JPG, PNG)</span>
                            <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg"
                              onChange={e=>{ const f=e.target.files?.[0]; if(f) uploadDoc(dt.key,f) }}/>
                          </label>
                        )}
                        {d.file && <p className="text-xs text-gray-600 mt-2">📎 {d.file.name} ({(d.file.size/1024).toFixed(0)} KB)</p>}
                        {d.status==='analysiert' && d.extrakt && (
                          <div className="mt-3 p-2 bg-white rounded-lg border border-green-200">
                            <p className="text-[10px] font-semibold text-green-700 uppercase mb-1">KI-Erkennung</p>
                            {Object.entries(d.extrakt).map(([k,v]) => (
                              <p key={k} className="text-xs text-gray-700"><span className="text-gray-500">{k}:</span> <strong>{String(v)}</strong></p>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full h-12 text-base font-semibold" style={{background:PRIMARY}} onClick={startAnalysis}
                disabled={analyzing}>
                {analyzing ? <><Loader2 className="w-5 h-5 animate-spin mr-2"/> Analyse läuft...</> : <><BrainCircuit className="w-5 h-5 mr-2"/> Analyse starten</>}
              </Button>
              <button className="text-xs text-gray-400 hover:text-gray-600 underline" onClick={startAnalysis}>
                Ohne Dokumente fortfahren
              </button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STEP 4: ERGEBNISSE
         ═══════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-6">
          {analyzing ? (
            <Card className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{color:PRIMARY}}/>
              <h3 className="text-lg font-semibold mb-2">Juristische Analyse läuft...</h3>
              <p className="text-sm text-gray-500">Die KI prüft {vorfilterCount} Programme auf Förderfähigkeit,<br/>Kombinierbarkeit und rechtliche Voraussetzungen.</p>
              <Progress value={65} className="mt-6 max-w-sm mx-auto"/>
            </Card>
          ) : (
            <>
              {/* Summary */}
              <Card className="border-l-4" style={{borderLeftColor:PRIMARY}}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{background:`${PRIMARY}15`}}>
                      <Sparkles className="w-6 h-6" style={{color:PRIMARY}}/>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold mb-1">Ihre Fördermöglichkeiten</h2>
                      <p className="text-sm text-gray-600">{zusammenfassung}</p>
                      <div className="flex gap-4 mt-3">
                        <Badge className="text-sm px-3 py-1" style={{background:PRIMARY}}>{ergebnisse.length} Programme</Badge>
                        <Badge className="text-sm px-3 py-1" style={{background:GREEN}}>{ergebnisse.filter(e=>e.relevanz_score>=70).length} Top-Treffer</Badge>
                        <Badge className="text-sm px-3 py-1 bg-gray-600">{fmtEuro(ergebnisse.reduce((s,e)=>s+(e.max_foerdersumme||0),0))} max.</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Programm-Cards */}
              {ergebnisse.sort((a,b)=>b.relevanz_score-a.relevanz_score).map((erg,i) => (
                <Card key={i} className={`transition-all hover:shadow-lg ${erg.relevanz_score>=70?'border-l-4':'opacity-80'}`}
                  style={erg.relevanz_score>=70?{borderLeftColor:scoreColor(erg.relevanz_score)}:{}}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-bold">{erg.programm.titel}</h3>
                          <Badge style={{background:artColor(erg.programm.foerderart)}} className="text-[10px]">{erg.programm.foerderart}</Badge>
                          <Badge variant="outline" className="text-[10px]"><MapPin className="w-3 h-3 mr-1"/>{erg.programm.foerdergebiet}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{erg.begruendung}</p>
                      </div>
                      {/* Score Ring */}
                      <div className="flex flex-col items-center ml-4 shrink-0">
                        <div className="relative w-14 h-14">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="#eee" strokeWidth="3"/>
                            <circle cx="22" cy="22" r="18" fill="none" stroke={scoreColor(erg.relevanz_score)} strokeWidth="3"
                              strokeDasharray={`${(erg.relevanz_score/100)*113} 113`} strokeLinecap="round"/>
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{erg.relevanz_score}</span>
                        </div>
                        {erg.max_foerdersumme && <p className="text-xs font-semibold mt-1" style={{color:GREEN}}>bis {fmtEuro(erg.max_foerdersumme)}</p>}
                      </div>
                    </div>
                    {/* Voraussetzungen */}
                    {erg.voraussetzungen_erfuellt && Object.keys(erg.voraussetzungen_erfuellt).length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {Object.entries(erg.voraussetzungen_erfuellt).map(([k,v]:any) => (
                          <Tooltip key={k}>
                            <TooltipTrigger>
                              <Badge variant={v.erfuellt ? 'default' : 'destructive'} className="text-[10px] cursor-help">
                                {v.erfuellt ? '✓' : '✗'} {k}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent><p className="text-xs">{v.begruendung}</p></TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    )}
                    {/* Kombinierbarkeit */}
                    {erg.kombinierbar_mit && erg.kombinierbar_mit.length > 0 && (
                      <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 shrink-0"/>
                        Kombinierbar mit: {erg.kombinierbar_mit.map(id => ergebnisse.find(e=>e.programm.id===id)?.programm.titel || `#${id}`).join(', ')}
                      </div>
                    )}
                    {/* Risiken */}
                    {erg.risiken && erg.risiken.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {erg.risiken.map((r,j) => (
                          <Badge key={j} variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                            <AlertTriangle className="w-3 h-3 mr-1"/>{r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button className="w-full h-12 text-base font-semibold" style={{background:PRIMARY}} onClick={loadPlan}>
                <Rocket className="w-5 h-5 mr-2"/> Aktionsplan anzeigen
              </Button>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════
          STEP 5: AKTIONSPLAN
         ═══════════════════════════════════════════ */}
      {step === 5 && (
        <div className="space-y-6">
          <Card className="border-l-4" style={{borderLeftColor:GREEN}}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2"><Rocket className="w-5 h-5" style={{color:GREEN}}/> Ihr Fahrplan</h2>
                  <p className="text-sm text-gray-600 mt-1">Schritt für Schritt zu Ihren Fördermitteln</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold" style={{color:GREEN}}>
                    {Object.values(planChecked).filter(Boolean).length} / {plan.reduce((s,p)=>s+p.schritte.length,0)}
                  </p>
                  <p className="text-xs text-gray-500">Schritte erledigt</p>
                </div>
              </div>
              <Progress value={plan.reduce((s,p)=>s+p.schritte.length,0)>0 ? (Object.values(planChecked).filter(Boolean).length / plan.reduce((s,p)=>s+p.schritte.length,0))*100 : 0}
                className="mt-3"/>
            </CardContent>
          </Card>

          {plan.map((prog,pi) => (
            <Card key={pi}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Badge style={{background:artColor(prog.programm.foerderart)}} className="text-[10px]">{prog.programm.foerderart}</Badge>
                    {prog.programm.titel}
                  </CardTitle>
                  <div className="text-right">
                    <span className="text-sm font-bold" style={{color:scoreColor(prog.relevanz_score)}}>Score {prog.relevanz_score}</span>
                    {prog.max_foerdersumme && <p className="text-xs text-gray-500">bis {fmtEuro(prog.max_foerdersumme)}</p>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-0">
                {prog.schritte.map((s,si) => {
                  const key = `${pi}-${si}`
                  const done = planChecked[key]
                  return (
                    <div key={si} className="flex gap-4 relative py-3 border-t first:border-t-0">
                      {/* Timeline line */}
                      {si < prog.schritte.length-1 && <div className="absolute left-[15px] top-[44px] w-0.5 h-[calc(100%-20px)] bg-gray-200"/>}
                      <button onClick={()=>setPlanChecked(p=>({...p,[key]:!done}))}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-all z-10
                          ${done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 bg-white hover:border-blue-400'}`}>
                        {done ? <CheckCircle2 className="w-4 h-4"/> : <span className="text-xs font-bold text-gray-400">{s.schritt}</span>}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${done?'line-through text-gray-400':'text-gray-800'}`}>{s.aktion}</p>
                        {s.beschreibung && <p className="text-xs text-gray-500 mt-0.5">{s.beschreibung}</p>}
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {s.dokument_typ && (
                            <Badge variant="outline" className={`text-[10px] ${s.bereits_hochgeladen ? 'text-green-700 border-green-300 bg-green-50' : 'text-gray-600'}`}>
                              <FileText className="w-3 h-3 mr-1"/>{s.dokument_typ} {s.bereits_hochgeladen && '✓'}
                            </Badge>
                          )}
                          {s.frist && <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300"><Calendar className="w-3 h-3 mr-1"/>Frist: {s.frist}</Badge>}
                          {s.link && (
                            <a href={s.link} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                              <ExternalLink className="w-3 h-3"/>Link
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" className="w-full" onClick={()=>window.print()}>
            <Download className="w-4 h-4 mr-2"/> Als PDF exportieren
          </Button>
        </div>
      )}

      </div>
    </div>
    </TooltipProvider>
  )
}
