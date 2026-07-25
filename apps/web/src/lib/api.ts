const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('minado-auth')
    if (!raw) return null
    return JSON.parse(raw).state?.token || null
  } catch {
    return null
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api${path}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    throw new Error((data as any).error || `HTTP ${res.status}`)
  }

  return data as T
}
