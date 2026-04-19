'use client'

// Fördercheck report PDF — Sovereign Trust palette.
//
// PATCH: Only color calls changed. jspdf takes RGB tuples [r,g,b].
// Values match the anchors in app/globals.css:
//
//   Ink           #0A1528 → [10, 21, 40]     headers, body text
//   Slate         #4A5568 → [74, 85, 104]    metadata, subtitles
//   Platinum      #D4CFC0 → [212, 207, 192]  rules, table grids
//   Oxford Navy   #0F1E3D → [15, 30, 61]     table head fill
//   Brass         #B8935A → [184, 147, 90]   verified-mark, rule accent
//   Bone          #F5F1E6 → [245, 241, 230]  table head text, page bg
//   Ivory         #FDFBF5 → [253, 251, 245]  alt row fill
//   Footer Muted  #6B7280 → [107, 114, 128]  page numbers

export interface FoerdercheckPDFProgramm {
  name: string
  foerderart?: string
  foerderbetrag?: string
  beschreibung?: string
  score?: number
}

export interface FoerdercheckPDFInput {
  sessionId: string
  unternehmen: string
  programme: FoerdercheckPDFProgramm[]
  erstelltAm: string
}

// Palette constants — single source of truth in this file.
const INK: [number, number, number]          = [10, 21, 40]
const SLATE: [number, number, number]        = [74, 85, 104]
const PLATINUM: [number, number, number]     = [212, 207, 192]
const NAVY: [number, number, number]         = [15, 30, 61]
const BRASS: [number, number, number]        = [184, 147, 90]
const BONE: [number, number, number]         = [245, 241, 230]
const IVORY: [number, number, number]        = [253, 251, 245]
const FOOTER_MUTED: [number, number, number] = [107, 114, 128]

export async function generateFoerdercheckPDF(data: FoerdercheckPDFInput): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF()

  // Brass rule at top of page — institutional marker
  doc.setFillColor(...BRASS)
  doc.rect(20, 15, 24, 1.5, 'F')

  // Wordmark (mono-ish via helvetica small-caps)
  doc.setFontSize(9)
  doc.setTextColor(...BRASS)
  doc.setFont('helvetica', 'bold')
  doc.text('FUND24', 20, 23)

  // Header — serif-weight effect via larger jspdf default
  doc.setFont('times', 'normal')
  doc.setFontSize(22)
  doc.setTextColor(...INK)
  doc.text('Fördercheck — Ergebnisbericht', 20, 42)

  // Metadata block
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...SLATE)
  doc.text(`Unternehmen:   ${data.unternehmen}`, 20, 54)
  doc.text(`Erstellt am:   ${data.erstelltAm}`, 20, 61)
  doc.text(`Session-ID:    ${data.sessionId}`, 20, 68)

  // Platinum rule separator
  doc.setDrawColor(...PLATINUM)
  doc.setLineWidth(0.3)
  doc.line(20, 75, 190, 75)

  // Section heading — serif weight
  doc.setFont('times', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(...INK)
  doc.text(`${data.programme.length} geprüfte Förderprogramme`, 20, 86)

  const tableData = data.programme.map((p, i) => [
    String(i + 1).padStart(2, '0'),
    p.name,
    p.foerderart || '—',
    p.foerderbetrag || '—',
    p.score != null ? `${p.score}%` : '—',
  ])

  const autoTable = (autoTableMod as unknown as {
    default: (d: InstanceType<typeof jsPDF>, o: Record<string, unknown>) => void
  }).default
  autoTable(doc, {
    startY: 92,
    head: [['Nr.', 'Programm', 'Förderart', 'Betrag', 'Match']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: NAVY,
      textColor: BONE,
      fontStyle: 'bold',
      halign: 'left',
      cellPadding: 5,
      lineWidth: 0,
    },
    bodyStyles: {
      textColor: INK,
      lineColor: PLATINUM,
      lineWidth: 0.1,
      cellPadding: 4.5,
    },
    alternateRowStyles: {
      fillColor: IVORY,
    },
    styles: {
      fontSize: 9.5,
      font: 'helvetica',
    },
    columnStyles: {
      0: { cellWidth: 14, textColor: BRASS, fontStyle: 'bold' },
      1: { cellWidth: 68 },
      2: { cellWidth: 35, textColor: SLATE },
      3: { cellWidth: 33 },
      4: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },
    },
  })

  // Footer loop — page numbers + legal line
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...FOOTER_MUTED)

    // Thin footer rule
    doc.setDrawColor(...PLATINUM)
    doc.setLineWidth(0.2)
    doc.line(20, 282, 190, 282)

    // Legal line (left)
    doc.text('fund24.io · Fröba Sales Solutions UG (haftungsbeschränkt)', 20, 288)
    // Page number (right)
    doc.text(`Seite ${i} / ${pageCount}`, 190, 288, { align: 'right' })
  }

  doc.save(`foerdercheck-${data.sessionId}.pdf`)
}
