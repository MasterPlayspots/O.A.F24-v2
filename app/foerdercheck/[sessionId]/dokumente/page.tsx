'use client'

import { useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { useVerifiedGuard } from '@/lib/hooks/useVerifiedGuard'
import { dokumenteHochladen, schwarmStarten } from '@/lib/api/check'
import { SchrittAnzeige } from '@/components/shared/SchrittAnzeige'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { CheckCircle2, Upload, FileIcon, Lock } from 'lucide-react'

const SCHRITTE = ['Angaben', 'Chat', 'Dokumente', 'Analyse', 'Ergebnisse']

const RECOMMENDED_DOCS = [
  'Jahresabschluss / Bilanz',
  'Gewinn- und Verlustrechnung',
  'Steuererklärungen',
  'Businessplan',
  'Investitionsplan',
  'Kosten-Nutzen-Analyse',
]

export default function DokumentePage() {
  const { loading } = useVerifiedGuard()
  const { token } = useAuth()
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (loading) {
    return <LadeSpinner text="Authentifizierung läuft..." />
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const validateAndProcessFiles = (files: FileList | null) => {
    if (!files) return

    const validFiles: File[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      // Check file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png']
      if (!validTypes.includes(file.type)) {
        errors.push(`${file.name}: Nur PDF, JPG und PNG erlaubt`)
        return
      }

      // Check file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        errors.push(`${file.name}: Datei ist zu groß (max. 10MB)`)
        return
      }

      validFiles.push(file)
    })

    if (errors.length > 0) {
      setError(errors.join('\n'))
      return
    }

    setUploadedFiles((prev) => [...prev, ...validFiles])
    setError(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    validateAndProcessFiles(e.dataTransfer.files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndProcessFiles(e.target.files)
  }

  const handleUploadAndAnalyze = async () => {
    if (!token || !sessionId) return

    try {
      setIsUploading(true)
      setError(null)

      // Upload files if any
      if (uploadedFiles.length > 0) {
        const formData = new FormData()
        uploadedFiles.forEach((file) => {
          formData.append('dokumente', file)
        })

        await dokumenteHochladen(sessionId, formData, token)
      }

      // Start analysis
      setIsAnalyzing(true)
      await schwarmStarten(sessionId, token)

      // Redirect to analysis
      router.push(`/foerdercheck/${sessionId}/analyse`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Fehler beim Upload'
      setError(message)
    } finally {
      setIsUploading(false)
      setIsAnalyzing(false)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4">
      <div className="mx-auto max-w-2xl">
        <SchrittAnzeige schritte={SCHRITTE} aktuell={2} />

        <Card className="mb-6 p-6">
          <h1 className="text-2xl font-bold">Dokumente hochladen</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Laden Sie relevante Geschäftsdokumente hoch, um die Analysen zu verbessern
          </p>
        </Card>

        {error && (
          <div className="mb-6">
            <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />
          </div>
        )}

        {/* Upload Area */}
        <Card
          className={`mb-6 p-8 transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-dashed border-2'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-lg bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Dateien hier ablegen oder</p>
              <Button
                variant="link"
                onClick={() => fileInputRef.current?.click()}
                className="p-0"
              >
                durchsuchen
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-muted-foreground">
              PDF, JPG oder PNG. Max. 10MB pro Datei.
            </p>
          </div>
        </Card>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Card className="mb-6 p-6">
            <h3 className="mb-4 font-medium">Hochgeladene Dateien ({uploadedFiles.length})</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg bg-muted p-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-chart-5" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(idx)}
                  >
                    Entfernen
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Recommended Documents */}
        <Card className="mb-6 p-6">
          <h3 className="mb-4 font-medium">Empfohlene Dokumente</h3>
          <div className="space-y-2">
            {RECOMMENDED_DOCS.map((doc) => (
              <div key={doc} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <FileIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{doc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* DSGVO Notice */}
        <Card className="mb-6 border-primary/20 bg-primary/10 p-4">
          <div className="flex gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-primary flex-shrink-0" />
            <div className="text-sm text-primary">
              <p className="font-medium mb-1">Datenschutz</p>
              <p>
                Ihre Dokumente werden verschlüsselt und auf Servern in der EU gespeichert. Alle Daten
                werden nach Abschluss der Analyse automatisch gelöscht.
              </p>
            </div>
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={() => router.push(`/foerdercheck`)}
            disabled={isUploading || isAnalyzing}
            className="flex-1"
          >
            ← Zurück
          </Button>
          <Button
            onClick={handleUploadAndAnalyze}
            disabled={isUploading || isAnalyzing}
            className="flex-1"
          >
            {isUploading ? 'Wird hochgeladen...' : isAnalyzing ? 'Wird analysiert...' : 'Analyse starten →'}
          </Button>
        </div>
      </div>
    </div>
  )
}
