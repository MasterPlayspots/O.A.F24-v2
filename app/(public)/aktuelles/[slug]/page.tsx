import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { getNewsArtikel } from '@/lib/api/check'

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
  } catch (error) {
    notFound()
  }

  // Parse and sanitize markdown content
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/aktuelles" className="text-blue-600 hover:text-blue-700 font-semibold">
            ← Zurück zu Aktuelles
          </Link>
        </div>
      </div>

      {/* Article Header */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article>
          {/* Metadata */}
          <div className="flex items-center gap-4 mb-6">
            <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
              {article.kategorie}
            </span>
            <time className="text-gray-500">
              {publishedDate}
            </time>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            {article.titel}
          </h1>

          {/* Featured Image */}
          {article.titelbildUrl && (
            <div className="mb-8 rounded-lg overflow-hidden h-96 bg-gray-200">
              <img
                src={article.titelbildUrl}
                alt={article.titel}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Excerpt */}
          <p className="text-xl text-gray-700 mb-8 italic border-l-4 border-blue-600 pl-6">
            {article.zusammenfassung}
          </p>

          {/* Main Content */}
          <div className="prose prose-neutral max-w-none mb-12" dangerouslySetInnerHTML={{ __html: safeHtml }} />

          {/* Article Footer */}
          <div className="border-t border-gray-200 pt-8 pb-12">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-sm text-gray-500">Veröffentlicht am</p>
                <p className="font-semibold text-gray-900">{publishedDate}</p>
              </div>
              {article.autor && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Verfasser</p>
                  <p className="font-semibold text-gray-900">{article.autor}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-3">Tags:</p>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">Interessiert an diesem Thema?</h2>
            <p className="mb-6 text-blue-100">
              Starten Sie jetzt Ihren kostenlosen Fördercheck und erfahren Sie, welche Unterstützung Ihnen zur Verfügung steht.
            </p>
            <Link href="/foerdercheck" className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              Fördercheck starten
            </Link>
          </div>
        </article>
      </div>

      {/* Related Articles Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">Weitere Artikel</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Link href="/aktuelles" className="group">
              <div className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow">
                <p className="text-sm text-gray-500 mb-2">Alle Artikel</p>
                <p className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  Zurück zur Übersicht →
                </p>
              </div>
            </Link>
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-gray-500 mb-2">Newsletter</p>
              <p className="text-lg font-semibold text-gray-900 mb-3">
                Keine Updates verpassen
              </p>
              <p className="text-sm text-gray-600">
                Melden Sie sich an, um Neuigkeiten direkt in Ihren Posteingang zu erhalten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
