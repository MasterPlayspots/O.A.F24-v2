'use client'

// Fördercheck report PDF. Generated client-side on download click so the
// worker never has to stream binary PDFs. jspdf + autotable are dynamic-
// imported so they don't enter the initial JS bundle (~120 KB saved).

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

export async function generateFoerdercheckPDF(data: FoerdercheckPDFInput): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.setTextColor(30, 41, 59)
  doc.text('Fördercheck Ergebnisse', 20, 25)

  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  doc.text(`Unternehmen: ${data.unternehmen}`, 20, 35)
  doc.text(`Erstellt am: ${data.erstelltAm}`, 20, 42)
  doc.text(`Session: ${data.sessionId}`, 20, 49)

  doc.setDrawColor(226, 232, 240)
  doc.line(20, 54, 190, 54)

  doc.setFontSize(14)
  doc.setTextColor(30, 41, 59)
  doc.text(`${data.programme.length} passende Förderprogramme`, 20, 64)

  const tableData = data.programme.map((p, i) => [
    String(i + 1),
    p.name,
    p.foerderart || '—',
    p.foerderbetrag || '—',
    p.score != null ? `${p.score}%` : '—',
  ])

  const autoTable = (autoTableMod as unknown as { default: (d: jsPDF, o: Record<string, unknown>) => void }).default
  autoTable(doc, {
    startY: 70,
    head: [['#', 'Programm', 'Förderart', 'Betrag', 'Match']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 70 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 20 },
    },
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`fund24.io — Seite ${i} von ${pageCount}`, 20, 287)
    doc.text('Vertraulich', 170, 287)
  }

  doc.save(`foerdercheck-${data.sessionId}.pdf`)
}
