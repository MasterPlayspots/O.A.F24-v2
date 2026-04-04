'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getNews } from '@/lib/api/check'
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
        console.error('Error fetching news:', err)
        setError('Nachrichten konnten nicht geladen werden. Bitte später erneut versuchen.')
      } finally {
        setLoading(false)
      }
    }

    fetchNews()
  }, [])

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(articles.map(a => a.kategorie)))]

  // Filter articles
  const filteredArticles = selectedCategory === 'all'
    ? articles
    : articles.filter(a => a.kategorie === selectedCategory)

  // Sort by date
  const sortedArticles = [...filteredArticles].sort((a, b) =>
    new Date(b.veroeffentlichtAm).getTime() - new Date(a.veroeffentlichtAm).getTime()
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Aktuelles</h1>
          <p className="text-xl text-gray-600">Neuigkeiten, Updates und Informationen von fund24</p>
        </div>

        {/* Category Filter */}
        <div className="mb-12">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full font-semibold transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-600'
                }`}
              >
                {category === 'all' ? 'Alle' : category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-12">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-md animate-pulse">
                <div className="h-48 bg-gray-200 rounded-t-lg" />
                <div className="p-6">
                  <div className="h-4 bg-gray-200 rounded mb-4 w-1/3" />
                  <div className="h-6 bg-gray-200 rounded mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-5/6 mb-4" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Articles Grid */}
        {!loading && sortedArticles.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedArticles.map(article => (
              <Link key={article.id} href={`/aktuelles/${article.slug}`}>
                <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col cursor-pointer">
                  {article.titelbildUrl && (
                    <div className="h-48 overflow-hidden bg-gray-200">
                      <img
                        src={article.titelbildUrl}
                        alt={article.titel}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-block bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {article.kategorie}
                      </span>
                      <time className="text-sm text-gray-500">
                        {new Date(article.veroeffentlichtAm).toLocaleDateString('de-DE', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </time>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {article.titel}
                    </h3>
                    <p className="text-gray-600 text-sm flex-grow line-clamp-3 mb-4">
                      {article.zusammenfassung}
                    </p>
                    <div className="text-blue-600 font-semibold hover:text-blue-700">
                      Zum Artikel →
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && sortedArticles.length === 0 && (
          <div className="text-center py-12">
            <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v4m6-2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
            <p className="text-gray-500 text-lg">
              Keine Artikel in dieser Kategorie vorhanden
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
