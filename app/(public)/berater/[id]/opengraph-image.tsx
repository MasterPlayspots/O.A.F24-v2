import { ImageResponse } from 'next/og'

export const alt = 'Berater auf fund24'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API = 'https://api.fund24.io'

interface Props {
  params: { id: string }
}

async function fetchBerater(id: string) {
  try {
    const res = await fetch(`${API}/api/netzwerk/berater/${id}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return (await res.json()) as {
      display_name?: string
      region?: string
      bio?: string
      branchen?: string[]
    }
  } catch {
    return null
  }
}

export default async function Image({ params }: Props) {
  const b = await fetchBerater(params.id)
  const name = b?.display_name ?? 'Berater'
  const region = b?.region ?? ''
  const branchen = Array.isArray(b?.branchen) ? b.branchen.slice(0, 3).join(' · ') : ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #637c74 0%, #5a6e66 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.5)',
            display: 'flex',
          }}
        >
          fund24 · Fördermittelberater
        </div>

        <div style={{ flex: 1, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.05,
              letterSpacing: -2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {name}
          </div>
          {region && (
            <div
              style={{
                fontSize: 28,
                color: '#7fe8c8',
                display: 'flex',
              }}
            >
              {region}
            </div>
          )}
          {branchen && (
            <div
              style={{
                fontSize: 22,
                color: 'rgba(255,255,255,0.75)',
                display: 'flex',
                marginTop: 8,
              }}
            >
              {branchen}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  )
}
