import type { Metadata } from 'next'

const BASE_URL = 'https://fund24.io'
const SITE_NAME = 'fund24'

interface CreateMetadataArgs {
  title: string
  description: string
  path: string
  noIndex?: boolean
}

// Factory for page-level Metadata. Pages that export {createMetadata({...})}
// get a resolved title (`<title> | fund24`), OG + Twitter cards, canonical URL,
// and robots:noindex when flagged. The root layout already sets a default OG
// image, so we don't override it here unless a page has a truly page-specific
// OG image available (the handful that do, like /programme/[id], already
// handle their own via opengraph-image.tsx).
export function createMetadata({
  title,
  description,
  path,
  noIndex = false,
}: CreateMetadataArgs): Metadata {
  // Raw title for the <title> element — the root layout's
  // title.template ("%s | fund24") appends the suffix. The full
  // composition is retained for OG/Twitter below, which have no
  // template layer and need a self-contained social-preview title.
  const fullTitle = `${title} | ${SITE_NAME}`
  const url = `${BASE_URL}${path}`
  return {
    title,
    description,
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'de_DE',
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
  }
}
