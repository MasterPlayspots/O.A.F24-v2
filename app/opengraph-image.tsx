import { ImageResponse } from 'next/og'

// Route segment config — Next.js serves this as /opengraph-image
export const alt = 'fund24 — Fördermittel verlässlich finden'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/*
 * Sovereign OG — institutional weight.
 *
 * Satori can't resolve CSS variables, so hex values are inlined. Keep
 * these in sync with the anchors declared in app/globals.css:
 *
 *   #0A1528  ink (background)
 *   #F5F1E6  bone (headline)
 *   #B8935A  brass (accent, rule, verifiziert mark)
 *   #9FA8B8  slate-light (subtitle)
 */
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0A1528',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          position: 'relative',
          fontFamily: 'serif',
        }}
      >
        {/* Corner mark — monospace for precision */}
        <div
          style={{
            fontSize: 16,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#B8935A',
            display: 'flex',
            fontFamily: 'monospace',
            fontWeight: 500,
          }}
        >
          fund24.io — Trusted AI für deutsche Fördermittel
        </div>

        {/* Brass rule */}
        <div
          style={{
            marginTop: 16,
            width: 56,
            height: 2,
            background: '#B8935A',
            display: 'flex',
          }}
        />

        {/* Spacer */}
        <div style={{ flex: 1, display: 'flex' }} />

        {/* Hero — serif display */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontSize: 108,
              fontWeight: 400,
              color: '#F5F1E6',
              lineHeight: 1.04,
              letterSpacing: -3,
              display: 'flex',
              fontFamily: 'serif',
            }}
          >
            Fördermittel
          </div>
          <div
            style={{
              fontSize: 108,
              fontWeight: 400,
              color: '#F5F1E6',
              lineHeight: 1.04,
              letterSpacing: -3,
              display: 'flex',
              fontFamily: 'serif',
              fontStyle: 'italic',
            }}
          >
            verlässlich finden.
          </div>

          {/* Subtitle band — sans for clarity */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              marginTop: 12,
              fontFamily: 'sans-serif',
            }}
          >
            <div
              style={{
                fontSize: 22,
                color: '#9FA8B8',
                display: 'flex',
                fontWeight: 400,
                letterSpacing: 0.2,
              }}
            >
              3.400+ geprüfte Programme · BAFA-zertifiziert · Rechtssicher
            </div>
          </div>
        </div>

        {/* Brass foot-stripe — the "seal" */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 6,
            background: '#B8935A',
            display: 'flex',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}
