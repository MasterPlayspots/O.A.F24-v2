import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { getNewsArtikel } from '@/lib/api/fund24'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const article = await getNewsArtikel(slug)
    return {
      title: `${article.titel} | fund24`,
      description: article.zusammenfassung,
    }
  } catch {
    return {
      title: 'Artikel nicht gefunden | fund24',
    }
  }
}

export default async function NewsArticlePage({ params }: PageProps) {
  const { slug } = await params

  let article
  try {
    article = await getNewsArtikel(slug)
  } catch {
    notFound()
  }

  let safeHtml = ''
  if (article.inhaltMd) {
    try {
      const rawHtml = await marked(article.inhaltMd)
      safeHtml = sanitizeHtml(rawHtml as string, {
        allowedTags: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'b', 'em', 'i', 'a', 'img', 'blockquote', 'code', 'pre'],
        allowedAttributes: {
          'a': ['href', 'title'],
          'img': ['src', 'alt', 'title'],
        },
      })
    } catch (err) {
      console.error('Error parsing markdown:', err)
    }
  }

  const publishedDate = new Date(article.veroeffentlichtAm).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white">
      <div className="bg-architect-surface-low/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/aktuelles" className="text-architect-primary-light hover:text-white font-semibold">
            ← Zurück zu Aktuelles
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article>
          <div className="flex items-center gap-4 mb-6">
            <span className="inline-block bg-architect-primary/20 text-architect-primary-light px-3 py-1 rounded-full text-sm font-semibold">
              {article.kategorie}
            </span>
            <time className="text-white/50">
              {publishedDate}
            </time>
          </div>

          <h1 className="font-display text-4xl font-bold text-white mb-6">
            {article.titel}
          </h1>

          {article.titelbildUrl && (
            <div className="mb-8 rounded-lg overflow-hidden h-96 bg-architect-surface-low/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.titelbildUrl}
                alt={article.titel}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <p className="text-xl text-white/80 mb-8 italic pl-6 border-l-4 border-architect-primary">
            {article.zusammenfassung}
          </p>

          <div className="prose prose-invert max-w-none mb-12" dangerouslySetInnerHTML={{ __html: safeHtml }} />

          <div className="pt-8 pb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm text-white/50">Veröffentlicht am</p>
                <p className="font-semibold text-white">{publishedDate}</p>
              </div>
              {article.autor && (
                <div className="text-right">
                  <p className="text-sm text-white/50">Verfasser</p>
                  <p className="font-semibold text-white">{article.autor}</p>
                </div>
              )}
            </div>

            {article.tags && article.tags.length > 0 && (
              <div className="mb-8">
                <p className="text-sm text-white/50 mb-3">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map(tag => (
                    <span key={tag} className="bg-architect-surface-low/40 text-white/80 px-3 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-architect-primary rounded-lg p-8 text-white text-center">
            <h2 className="font-display text-2xl font-bold mb-4">Interessiert an diesem Thema?</h2>
            <p className="mb-6 text-architect-primary-light">
              Starten Sie jetzt Ihren kostenlosen Fördercheck und erfahren Sie, welche Unterstützung Ihnen zur Verfügung steht.
            </p>
            <Link href="/foerdercheck" className="inline-block bg-white text-architect-primary px-8 py-3 rounded-lg font-semibold hover:bg-white/90 transition-colors">
              Fördercheck starten
            </Link>
          </div>
        </article>
      </div>

      <div className="bg-architect-surface-low/40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="font-display text-2xl font-bold text-white mb-8">Weitere Artikel</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Link href="/aktuelles" className="group">
              <div className="bg-architect-surface/60 rounded-lg p-6 hover:bg-architect-surface/40 transition-colors">
                <p className="text-sm text-white/50 mb-2">Alle Artikel</p>
                <p className="font-display text-lg font-semibold text-white group-hover:text-architect-primary-light transition-colors">
                  Zurück zur Übersicht →
                </p>
              </div>
            </Link>
            <div className="bg-architect-surface/60 rounded-lg p-6">
              <p className="text-sm text-white/50 mb-2">Newsletter</p>
              <p className="font-display text-lg font-semibold text-white mb-3">
                Keine Updates verpassen
              </p>
              <p className="text-sm text-white/70">
                Melden Sie sich an, um Neuigkeiten direkt in Ihren Posteingang zu erhalten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
