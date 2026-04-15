import { ImageResponse } from 'next/og'

export const alt = 'Förderprogramm auf fund24'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const API = 'https://api.fund24.io'

interface Props {
  params: { id: string }
}

async function fetchProgramm(id: string) {
  try {
    const res = await fetch(`${API}/api/foerdermittel/katalog/${id}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      titel?: string
      foerderart?: string
      foerdergebiet?: string
    }
    return data
  } catch {
    return null
  }
}

export default async function Image({ params }: Props) {
  const p = await fetchProgramm(params.id)
  const titel = p?.titel ?? 'Förderprogramm'
  const meta = [p?.foerderart, p?.foerdergebiet].filter(Boolean).join(' · ') || 'fund24.io'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #737688 0%, #637c74 100%)',
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
          fund24 · Förderprogramm
        </div>

        <div style={{ flex: 1, display: 'flex' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.15,
              letterSpacing: -1,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              maxHeight: 250,
            }}
          >
            {titel}
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#c9d1ff',
              display: 'flex',
            }}
          >
            {meta}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
