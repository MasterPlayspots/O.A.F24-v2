'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import * as Sentry from '@sentry/nextjs'
import { getNews } from '@/lib/api/fund24'
import type { NewsArtikel } from '@/lib/types'

export default function NewsPage() {
  const [articles, setArticles] = useState<NewsArtikel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    async function fetchNews() {
      try {
        setLoading(true)
        const data = await getNews()
        setArticles(data.artikel)
        setError(null)
      } catch (err) {
        Sentry.captureException(err, { tags: { area: 'news', op: 'list' } })
        setError('Nachrichten konnten nicht geladen werden. Bitte später erneut versuchen.')
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  const categories = ['all', ...Array.from(new Set(articles.map(a => a.kategorie)))]

  const filteredArticles = selectedCategory === 'all'
    ? articles
    : articles.filter(a => a.kategorie === selectedCategory)

  const sortedArticles = [...filteredArticles].sort((a, b) =>
    new Date(b.veroeffentlichtAm).getTime() - new Date(a.veroeffentlichtAm).getTime()
  )

  return (
    <div className="min-h-screen bg-architect-surface font-body text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl font-bold text-white mb-4">Aktuelles</h1>
          <p className="text-xl text-white/70">Neuigkeiten, Updates und Informationen von fund24</p>
        </div>

        <div className="mb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                  selectedCategory === category
                    ? 'bg-architect-primary text-white'
                    : 'bg-architect-surface/60 text-white/80 hover:bg-architect-surface/40'
                }`}
              >
                {category === 'all' ? 'Alle' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-architect-error/20 rounded-lg p-6 mb-12">
            <p className="text-architect-error-container">{error}</p>
          </div>
        )}

        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-architect-surface/60 rounded-lg animate-pulse">
                <div className="h-48 bg-architect-surface-low/40 rounded-t-lg" />
                <div className="p-6">
                  <div className="h-4 bg-architect-surface-low/40 rounded mb-4 w-1/3" />
                  <div className="h-6 bg-architect-surface-low/40 rounded mb-4" />
                  <div className="h-4 bg-architect-surface-low/40 rounded w-5/6 mb-4" />
                  <div className="h-4 bg-architect-surface-low/40 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && sortedArticles.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedArticles.map(article => (
              <Link key={article.id} href={`/aktuelles/${article.slug}`}>
                <article className="bg-architect-surface/60 rounded-lg overflow-hidden hover:bg-architect-surface/40 transition-colors h-full flex flex-col cursor-pointer">
                  {article.titelbildUrl && (
                    <div className="h-48 overflow-hidden bg-architect-surface-low/40">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={article.titelbildUrl}
                        alt={article.titel}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-block bg-architect-primary/20 text-architect-primary-light px-3 py-1 rounded-full text-sm font-semibold">
                        {article.kategorie}
                      </span>
                      <time className="text-sm text-white/50">
                        {new Date(article.veroeffentlichtAm).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-2 line-clamp-2">
                      {article.titel}
                    </h3>
                    <p className="text-white/70 text-sm flex-grow line-clamp-3 mb-4">
                      {article.zusammenfassung}
                    </p>
                    <div className="text-architect-primary-light font-semibold hover:text-white">
                      Zum Artikel →
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {!loading && sortedArticles.length === 0 && (
          <div className="text-center py-12">
            <svg className="h-12 w-12 text-white/40 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v4m6-2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
            <p className="text-white/50 text-lg">
              Keine Artikel in dieser Kategorie vorhanden
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
