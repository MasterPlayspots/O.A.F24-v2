'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/store/authStore'
import { getAdminNews, createAdminNews, updateAdminNews } from '@/lib/api/fund24'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Card } from '@/components/ui/card'
import { LadeSpinner } from '@/components/shared/LadeSpinner'
import { FehlerBox } from '@/components/shared/FehlerBox'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { Edit, Plus, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { NewsArtikel } from '@/lib/types'

export default function AdminAktuellesPage() {
  const router = useRouter()
  const { token, istAdmin } = useAuth()
  const [artikel, setArtikel] = useState<NewsArtikel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    titel: '',
    untertitel: '',
    zusammenfassung: '',
    kategorie: '',
    tags: '',
    inhaltMd: '',
  })
  const [preview, setPreview] = useState('')

  useEffect(() => {
    if (!istAdmin()) {
      router.push('/')
      return
    }

    const fetchNews = async () => {
      try {
        if (!token) throw new Error('Kein Token')
        const data = await getAdminNews()
        setArtikel(data.artikel)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setIsLoading(false)
      }
    }

    fetchNews()
  }, [token, istAdmin, router])

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Update preview
  useEffect(() => {
    const generatePreview = async () => {
      try {
        const html = await marked(formData.inhaltMd)
        const clean = sanitizeHtml(html, {
          allowedTags: ['h1', 'h2', 'h3', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a'],
          allowedAttributes: { a: ['href'] },
        })
        setPreview(clean)
      } catch {
        setPreview('')
      }
    }

    generatePreview()
  }, [formData.inhaltMd])

  const handleOpenDialog = (item?: NewsArtikel) => {
    if (item) {
      setEditingId(item.id)
      setFormData({
        titel: item.titel,
        untertitel: item.untertitel || '',
        zusammenfassung: item.zusammenfassung || '',
        kategorie: item.kategorie,
        tags: item.tags.join(', '),
        inhaltMd: item.inhaltMd,
      })
    } else {
      setEditingId(null)
      setFormData({
        titel: '',
        untertitel: '',
        zusammenfassung: '',
        kategorie: '',
        tags: '',
        inhaltMd: '',
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      const slug = generateSlug(formData.titel)
      const tags = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)

      if (editingId) {
        if (!token) throw new Error('Kein Token')
        await updateAdminNews(
          editingId,
          {
            titel: formData.titel,
            slug,
            untertitel: formData.untertitel || undefined,
            zusammenfassung: formData.zusammenfassung || undefined,
            kategorie: formData.kategorie,
            tags,
            inhaltMd: formData.inhaltMd,
          }
        )
        setArtikel(
          artikel.map((a) =>
            a.id === editingId
              ? {
                  ...a,
                  titel: formData.titel,
                  slug,
                  untertitel: formData.untertitel,
                  zusammenfassung: formData.zusammenfassung,
                  kategorie: formData.kategorie,
                  tags,
                  inhaltMd: formData.inhaltMd,
                }
              : a
          )
        )
      } else {
        if (!token) throw new Error('Kein Token')
        const result = await createAdminNews(
          {
            slug,
            titel: formData.titel,
            untertitel: formData.untertitel || undefined,
            zusammenfassung: formData.zusammenfassung || undefined,
            kategorie: formData.kategorie,
            tags,
            inhaltMd: formData.inhaltMd,
            autor: 'admin',
          }
        )
        setArtikel([
          ...artikel,
          {
            id: result.id,
            slug,
            titel: formData.titel,
            untertitel: formData.untertitel,
            zusammenfassung: formData.zusammenfassung,
            kategorie: formData.kategorie,
            tags,
            inhaltMd: formData.inhaltMd,
            autor: 'admin',
            veroeffentlichtAm: new Date().toISOString(),
          },
        ])
      }

      setIsDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    }
  }

  if (isLoading) {
    return <LadeSpinner text="Artikel werden geladen..." />
  }

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
    <div className="mx-auto max-w-7xl px-6 py-12 sm:px-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center text-sm text-white/60 hover:text-white mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Link>
          <h1 className="font-display text-4xl font-bold text-white">
            News & Aktuelles
          </h1>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger>
            <Button onClick={() => handleOpenDialog()} className="bg-architect-primary hover:bg-architect-primary-container text-white">
              <Plus className="h-4 w-4 mr-2" />
              Neuer Artikel
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? 'Artikel bearbeiten' : 'Neuer Artikel'}
              </DialogTitle>
              <DialogDescription>
                Erstellen oder bearbeiten Sie einen News-Artikel
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Form Fields */}
              <div>
                <Label htmlFor="titel">Titel *</Label>
                <Input
                  id="titel"
                  value={formData.titel}
                  onChange={(e) => setFormData({ ...formData, titel: e.target.value })}
                  placeholder="Artikel-Titel"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="untertitel">Untertitel</Label>
                <Input
                  id="untertitel"
                  value={formData.untertitel}
                  onChange={(e) => setFormData({ ...formData, untertitel: e.target.value })}
                  placeholder="Optional"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="zusammenfassung">Zusammenfassung</Label>
                <Textarea
                  id="zusammenfassung"
                  value={formData.zusammenfassung}
                  onChange={(e) => setFormData({ ...formData, zusammenfassung: e.target.value })}
                  placeholder="Kurze Zusammenfassung"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="kategorie">Kategorie *</Label>
                  <Input
                    id="kategorie"
                    value={formData.kategorie}
                    onChange={(e) => setFormData({ ...formData, kategorie: e.target.value })}
                    placeholder="z.B. Tipps"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Tag1, Tag2, Tag3"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Split View: Markdown + Preview */}
              <div className="grid grid-cols-2 gap-4 h-96">
                <div>
                  <Label htmlFor="inhaltMd">Inhalt (Markdown) *</Label>
                  <Textarea
                    id="inhaltMd"
                    value={formData.inhaltMd}
                    onChange={(e) => setFormData({ ...formData, inhaltMd: e.target.value })}
                    placeholder="# Überschrift&#10;Ihre Inhalte in Markdown..."
                    className="mt-1 h-80 font-mono text-sm"
                  />
                </div>

                <div>
                  <Label>Vorschau</Label>
                  <div className="mt-1 h-80 bg-architect-surface-low/30 rounded-lg p-4 overflow-auto">
                    <div
                      className="prose dark:prose-invert max-w-none text-sm"
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                className="w-full bg-architect-primary hover:bg-architect-primary-container text-white"
                disabled={!formData.titel || !formData.kategorie || !formData.inhaltMd}
              >
                {editingId ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Error */}
      {error && <FehlerBox fehler={error} onNeuLaden={() => setError(null)} />}

      {/* Articles List */}
      <div className="space-y-4">
        {artikel.length > 0 ? (
          artikel.map((item) => (
            <Card
              key={item.id}
              className="bg-architect-surface/60 border-0 text-white hover:bg-architect-surface/70 transition"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-white">
                      {item.titel}
                    </h3>
                    {item.untertitel && (
                      <p className="text-sm text-white/60 mt-1">
                        {item.untertitel}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-3 flex-wrap">
                      <span className="text-xs bg-architect-surface-low/40 text-white/80 px-2 py-1 rounded">
                        {item.kategorie}
                      </span>
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-xs bg-architect-primary/20 text-architect-primary-light px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(item)}
                      className="bg-architect-surface-low/40 border-0 text-white hover:bg-architect-surface-low/60 hover:text-white"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 text-white/50">
            Keine Artikel vorhanden. Erstellen Sie einen neuen!
          </div>
        )}
      </div>
    </div>
    </div>
  )
}
