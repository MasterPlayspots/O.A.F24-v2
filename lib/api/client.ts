// lib/api/client.ts

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiCall<T = unknown>(
  baseUrl: string,
  path: string,
  options?: RequestInit,
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Content-Type für FormData NICHT setzen (Browser setzt automatisch mit Boundary):
  if (options?.body instanceof FormData) {
    delete headers['Content-Type']
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...(options?.headers ?? {}) },
    })
  } catch {
    throw new ApiError(0, 'Netzwerkfehler — bitte Verbindung prüfen.')
  }

  // Sicher JSON parsen — auch bei 4xx/5xx/HTML-Fehlerseiten:
  let data: unknown
  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    try { data = await response.json() } catch { data = {} }
  } else {
    const text = await response.text()
    data = { error: text || `HTTP ${response.status}` }
  }

  if (!response.ok) {
    const msg = (data as Record<string, unknown>)?.error
    throw new ApiError(response.status, typeof msg === 'string' ? msg : `HTTP ${response.status}`)
  }
  return data as T
}
